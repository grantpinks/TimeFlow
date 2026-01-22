/**
 * Gmail Pub/Sub Push Controller
 *
 * Handles Pub/Sub push notifications for Gmail watch updates.
 */

import { FastifyReply, FastifyRequest } from 'fastify';
import { prisma } from '../config/prisma.js';
import { getOAuth2Client } from '../config/google.js';
import { env } from '../config/env.js';
import { syncFromHistory } from '../services/gmailWatchService.js';

type PubSubPushBody = {
  message?: {
    data?: string;
  };
  subscription?: string;
};

const oidcClient = getOAuth2Client();
const syncInFlightByUser = new Map<string, boolean>();
const pendingHistoryByUser = new Map<string, string>();

function extractErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  if (typeof error === 'string') {
    return error;
  }
  try {
    return JSON.stringify(error);
  } catch {
    return 'Unknown error';
  }
}

async function isAuthorized(request: FastifyRequest): Promise<boolean> {
  const secret = env.GMAIL_PUBSUB_PUSH_SECRET;
  const headerToken = request.headers['x-pubsub-token'];
  if (secret && headerToken === secret) {
    return true;
  }

  const authHeader = request.headers.authorization;
  const audience = env.GMAIL_PUBSUB_OIDC_AUDIENCE;
  if (!authHeader || !audience) {
    return false;
  }

  const token = authHeader.startsWith('Bearer ') ? authHeader.slice('Bearer '.length) : authHeader;
  try {
    const ticket = await oidcClient.verifyIdToken({ idToken: token, audience });
    const payload = ticket.getPayload();
    const allowlist = (env.GMAIL_PUBSUB_OIDC_EMAIL_ALLOWLIST ?? '')
      .split(',')
      .map((value) => value.trim())
      .filter(Boolean);

    if (allowlist.length > 0 && payload?.email && !allowlist.includes(payload.email)) {
      return false;
    }

    return true;
  } catch {
    return false;
  }
}

export async function handleGmailPush(
  request: FastifyRequest<{ Body: PubSubPushBody }>,
  reply: FastifyReply
) {
  const authorized = await isAuthorized(request);
  if (!authorized) {
    request.log.warn(
      { headers: request.headers },
      'Gmail push rejected: unauthorized'
    );
    return reply.status(204).send();
  }

  const rawData = request.body?.message?.data;
  if (!rawData) {
    request.log.warn('Gmail push skipped: missing Pub/Sub message data');
    return reply.status(204).send();
  }

  let payload: { emailAddress?: string; historyId?: string };
  try {
    payload = JSON.parse(Buffer.from(rawData, 'base64').toString('utf8'));
  } catch {
    request.log.warn('Gmail push skipped: invalid Pub/Sub payload');
    return reply.status(204).send();
  }

  const normalizedHistoryId =
    typeof payload.historyId === 'string'
      ? payload.historyId
      : typeof payload.historyId === 'number'
        ? String(payload.historyId)
        : null;

  if (!payload.emailAddress || !normalizedHistoryId) {
    request.log.warn(
      { payload },
      'Gmail push skipped: missing emailAddress or historyId'
    );
    return reply.status(204).send();
  }

  const user = await prisma.user.findUnique({ where: { email: payload.emailAddress } });
  if (!user) {
    return reply.status(204).send();
  }

  if (syncInFlightByUser.get(user.id)) {
    pendingHistoryByUser.set(user.id, normalizedHistoryId);
    return reply.status(204).send();
  }

  const syncState = await prisma.gmailLabelSyncState.findUnique({ where: { userId: user.id } });
  if (syncState?.lastHistoryId) {
    try {
      if (BigInt(normalizedHistoryId) <= BigInt(syncState.lastHistoryId)) {
        return reply.status(204).send();
      }
    } catch {
      // If historyId isn't numeric, proceed with sync.
    }
  }

  try {
    syncInFlightByUser.set(user.id, true);
    let historyIdToProcess: string | undefined = normalizedHistoryId;

    while (historyIdToProcess) {
      pendingHistoryByUser.delete(user.id);
      await syncFromHistory(user.id, historyIdToProcess);
      historyIdToProcess = pendingHistoryByUser.get(user.id);
    }
    return reply.status(204).send();
  } catch (error) {
    request.log.error({ error }, 'Failed to sync Gmail history');
    if (env.NODE_ENV === 'development') {
      request.log.error(
        { details: extractErrorMessage(error) },
        'Gmail push error details'
      );
    }
    return reply.status(204).send();
  } finally {
    syncInFlightByUser.delete(user.id);
  }
}
