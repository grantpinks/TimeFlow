/**
 * Tracks and validates Google OAuth scopes (especially incremental Gmail auth).
 */

import type { FastifyReply } from 'fastify';
import { google } from 'googleapis';
import { prisma } from '../config/prisma.js';
import { GOOGLE_GMAIL_SCOPES, getOAuth2Client, getUserOAuth2Client } from '../config/google.js';
import { decrypt } from '../utils/crypto.js';

export type GmailAccessDenialCode = 'GMAIL_NOT_CONNECTED' | 'NO_GOOGLE_AUTH';

export function parseGoogleScopes(scopeString?: string | null): string[] {
  if (!scopeString?.trim()) return [];
  return scopeString.trim().split(/\s+/).filter(Boolean);
}

export function mergeGoogleScopes(
  existing?: string | null,
  incoming?: string | null
): string {
  const merged = new Set([...parseGoogleScopes(existing), ...parseGoogleScopes(incoming)]);
  return Array.from(merged).join(' ');
}

/** True when the user has at least Gmail read access. */
export function hasGmailReadScope(scopeString?: string | null): boolean {
  const scopes = parseGoogleScopes(scopeString);
  return scopes.some(
    (scope) =>
      scope === 'https://www.googleapis.com/auth/gmail.readonly' ||
      scope === 'https://mail.google.com/' ||
      scope.includes('gmail')
  );
}

export function hasFullGmailScopes(scopeString?: string | null): boolean {
  const scopes = new Set(parseGoogleScopes(scopeString));
  return GOOGLE_GMAIL_SCOPES.every((scope) => scopes.has(scope));
}

export function isGmailApiScopeError(error: unknown): boolean {
  if (!error || typeof error !== 'object') return false;
  const err = error as { code?: number; message?: string; response?: { status?: number; data?: { error?: { message?: string; errors?: Array<{ reason?: string }> } } } };
  const status = err.code ?? err.response?.status;
  if (status !== 403) return false;
  const message = `${err.message ?? ''} ${err.response?.data?.error?.message ?? ''}`.toLowerCase();
  if (message.includes('insufficient') && message.includes('scope')) return true;
  const reasons = err.response?.data?.error?.errors ?? [];
  return reasons.some((entry) => entry.reason === 'insufficientPermissions');
}

export function gmailAccessForbiddenReply(reply: FastifyReply, code: GmailAccessDenialCode): void {
  if (code === 'NO_GOOGLE_AUTH') {
    reply.status(403).send({
      error: 'Google account not connected. Please sign in with Google.',
      code: 'NO_GOOGLE_AUTH',
    });
    return;
  }

  reply.status(403).send({
    error: 'Gmail is not connected. Open Settings and click Connect Gmail to enable inbox features.',
    code: 'GMAIL_NOT_CONNECTED',
  });
}

async function probeGmailReadAccess(userId: string): Promise<boolean> {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user?.googleAccessToken) return false;

  try {
    const oauth2Client = getUserOAuth2Client(
      user.googleAccessToken,
      decrypt(user.googleRefreshToken),
      user.googleAccessTokenExpiry?.getTime()
    );
    const gmail = google.gmail({ version: 'v1', auth: oauth2Client });
    await gmail.users.getProfile({ userId: 'me' });
    return true;
  } catch {
    return false;
  }
}

/** Resolve granted scopes from token response + tokeninfo (Google may omit cumulative scopes in `tokens.scope`). */
export async function resolveGrantedScopeString(
  accessToken: string | null | undefined,
  tokenScope?: string | null,
  existing?: string | null
): Promise<string> {
  let incoming = tokenScope ?? '';
  if (accessToken) {
    try {
      const oauth2Client = getOAuth2Client();
      const tokenInfo = await oauth2Client.getTokenInfo(accessToken);
      if (tokenInfo.scopes?.length) {
        incoming = mergeGoogleScopes(incoming, tokenInfo.scopes.join(' '));
      }
    } catch {
      // Fall back to token response scope only.
    }
  }
  return mergeGoogleScopes(existing, incoming);
}

export async function persistGrantedScopes(userId: string, scopeString: string): Promise<void> {
  await prisma.user.update({
    where: { id: userId },
    data: { googleGrantedScopes: scopeString },
  });
}

export async function assertGmailAccess(
  userId: string
): Promise<{ ok: true } | { ok: false; code: GmailAccessDenialCode }> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      googleAccessToken: true,
      googleRefreshToken: true,
      googleGrantedScopes: true,
    },
  });

  if (!user?.googleAccessToken) {
    return { ok: false, code: 'NO_GOOGLE_AUTH' };
  }

  if (hasGmailReadScope(user.googleGrantedScopes)) {
    return { ok: true };
  }

  // Legacy rows: unknown scopes — probe once, then persist result to avoid repeat Gmail calls.
  if (!user.googleGrantedScopes) {
    const canReadGmail = await probeGmailReadAccess(userId);
    if (canReadGmail) {
      await persistGrantedScopes(userId, GOOGLE_GMAIL_SCOPES.join(' '));
      return { ok: true };
    }

    const knownScopes = await resolveGrantedScopeString(user.googleAccessToken, null, null);
    if (knownScopes) {
      await persistGrantedScopes(userId, knownScopes);
    }
  }

  return { ok: false, code: 'GMAIL_NOT_CONNECTED' };
}

/** Refresh stored access token scopes after token rotation (best-effort). */
export async function syncScopesFromAccessToken(userId: string, accessToken: string): Promise<void> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { googleGrantedScopes: true },
  });
  const merged = await resolveGrantedScopeString(accessToken, null, user?.googleGrantedScopes);
  if (merged) {
    await persistGrantedScopes(userId, merged);
  }
}

export async function getGoogleConnectionStatus(userId: string): Promise<{
  connected: boolean;
  expired: boolean;
  needsReauth: boolean;
  gmailConnected: boolean;
  gmailScopesComplete: boolean;
}> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      googleAccessToken: true,
      googleRefreshToken: true,
      googleAccessTokenExpiry: true,
      googleGrantedScopes: true,
    },
  });

  if (!user) {
    return {
      connected: false,
      expired: true,
      needsReauth: true,
      gmailConnected: false,
      gmailScopesComplete: false,
    };
  }

  const connected = !!(user.googleRefreshToken && user.googleAccessToken);
  const expired = user.googleAccessTokenExpiry
    ? user.googleAccessTokenExpiry < new Date()
    : true;

  let gmailConnected = hasGmailReadScope(user.googleGrantedScopes);
  if (connected && !gmailConnected && !user.googleGrantedScopes) {
    gmailConnected = await probeGmailReadAccess(userId);
    if (gmailConnected) {
      await persistGrantedScopes(userId, GOOGLE_GMAIL_SCOPES.join(' '));
    } else if (user.googleAccessToken) {
      const knownScopes = await resolveGrantedScopeString(user.googleAccessToken, null, null);
      if (knownScopes) {
        await persistGrantedScopes(userId, knownScopes);
      }
    }
  }

  return {
    connected,
    expired,
    needsReauth: connected && expired,
    gmailConnected,
    gmailScopesComplete: hasFullGmailScopes(user.googleGrantedScopes),
  };
}
