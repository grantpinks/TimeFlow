export type OAuthFlow = 'signin' | 'gmail' | 'reconnect';

export type OAuthStatePayload = {
  returnTo?: string;
  linkUserId?: string;
  flow?: OAuthFlow;
};

/** Encode OAuth state for Google redirect (supports legacy plain return paths). */
export function encodeOAuthState(payload: OAuthStatePayload): string {
  if (!payload.linkUserId && !payload.flow && payload.returnTo) {
    const path = payload.returnTo;
    if (path.startsWith('/') && !path.startsWith('//')) {
      return path;
    }
  }
  return Buffer.from(JSON.stringify(payload), 'utf8').toString('base64url');
}

export function decodeOAuthState(state?: string | null): OAuthStatePayload {
  if (!state) {
    return { returnTo: '/tasks' };
  }

  if (state.startsWith('/') && !state.startsWith('//')) {
    return { returnTo: state, flow: 'signin' };
  }

  try {
    const parsed = JSON.parse(Buffer.from(state, 'base64url').toString('utf8')) as OAuthStatePayload;
    return {
      returnTo: parsed.returnTo ?? '/tasks',
      linkUserId: parsed.linkUserId,
      flow: parsed.flow ?? 'signin',
    };
  } catch {
    return { returnTo: '/tasks', flow: 'signin' };
  }
}
