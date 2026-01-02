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
    return reply.status(401).send({ error: 'Unauthorized' });
  }

  const rawData = request.body?.message?.data;
  if (!rawData) {
    return reply.status(400).send({ error: 'Missing Pub/Sub message data' });
  }

  let payload: { emailAddress?: string; historyId?: string };
  try {
    payload = JSON.parse(Buffer.from(rawData, 'base64').toString('utf8'));
  } catch {
    return reply.status(400).send({ error: 'Invalid Pub/Sub payload' });
  }

  if (!payload.emailAddress || !payload.historyId) {
    return reply.status(400).send({ error: 'Missing emailAddress or historyId' });
  }

  const user = await prisma.user.findUnique({ where: { email: payload.emailAddress } });
  if (!user) {
    return reply.status(204).send();
  }

  const syncState = await prisma.gmailLabelSyncState.findUnique({ where: { userId: user.id } });
  if (syncState?.lastHistoryId) {
    try {
      if (BigInt(payload.historyId) <= BigInt(syncState.lastHistoryId)) {
        return reply.status(204).send();
      }
    } catch {
      // If historyId isn't numeric, proceed with sync.
    }
  }

  try {
    await syncFromHistory(user.id, payload.historyId);
    return reply.status(204).send();
  } catch (error) {
    request.log.error({ error }, 'Failed to sync Gmail history');
    return reply.status(500).send({ error: 'Failed to process Gmail push' });
  }
}
