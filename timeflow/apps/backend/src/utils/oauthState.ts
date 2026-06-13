import crypto from 'crypto';
import { env } from '../config/env.js';

export type OAuthFlow = 'signin' | 'gmail' | 'reconnect';

export type OAuthStatePayload = {
  returnTo?: string;
  linkUserId?: string;
  flow?: OAuthFlow;
  nonce?: string;
};

function sign(encodedPayload: string): string {
  return crypto.createHmac('sha256', env.SESSION_SECRET).update(encodedPayload).digest('base64url');
}

function verifySignature(encodedPayload: string, signature: string): boolean {
  const expected = sign(encodedPayload);
  if (expected.length !== signature.length) {
    return false;
  }
  return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(signature));
}

/** Only allow same-origin relative paths in OAuth returnTo. */
export function sanitizeOAuthReturnTo(returnTo?: string | null): string {
  if (!returnTo) return '/tasks';
  if (returnTo.startsWith('/') && !returnTo.startsWith('//')) {
    return returnTo;
  }
  return '/tasks';
}

/** Encode OAuth state for Google redirect (supports legacy plain return paths). */
export function encodeOAuthState(payload: OAuthStatePayload): string {
  if (!payload.linkUserId && !payload.flow && payload.returnTo) {
    return sanitizeOAuthReturnTo(payload.returnTo);
  }

  const withNonce: OAuthStatePayload = {
    ...payload,
    nonce: payload.nonce ?? crypto.randomBytes(16).toString('hex'),
  };
  const encoded = Buffer.from(JSON.stringify(withNonce), 'utf8').toString('base64url');
  return `${encoded}.${sign(encoded)}`;
}

export function decodeOAuthState(state?: string | null): OAuthStatePayload {
  if (!state) {
    return { returnTo: '/tasks' };
  }

  if (state.startsWith('/') && !state.startsWith('//')) {
    return { returnTo: sanitizeOAuthReturnTo(state), flow: 'signin' };
  }

  const dotIndex = state.lastIndexOf('.');
  if (dotIndex <= 0) {
    throw new Error('Invalid OAuth state');
  }

  const encoded = state.slice(0, dotIndex);
  const signature = state.slice(dotIndex + 1);

  if (!verifySignature(encoded, signature)) {
    throw new Error('Invalid OAuth state');
  }

  try {
    const parsed = JSON.parse(Buffer.from(encoded, 'base64url').toString('utf8')) as OAuthStatePayload;
    return {
      returnTo: sanitizeOAuthReturnTo(parsed.returnTo),
      linkUserId: parsed.linkUserId,
      flow: parsed.flow ?? 'signin',
      nonce: parsed.nonce,
    };
  } catch {
    throw new Error('Invalid OAuth state');
  }
}
