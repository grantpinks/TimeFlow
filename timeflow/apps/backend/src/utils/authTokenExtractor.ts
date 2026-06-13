import { ACCESS_COOKIE_NAME, REFRESH_COOKIE_NAME } from './sessionCookies.js';

type TokenSource = {
  authorization?: string;
  cookies?: Record<string, string | undefined>;
};

export function extractAccessToken(source: TokenSource): string | null {
  const authHeader = source.authorization;
  if (authHeader?.startsWith('Bearer ')) {
    return authHeader.slice(7);
  }
  return source.cookies?.[ACCESS_COOKIE_NAME] ?? null;
}

export function extractRefreshToken(source: TokenSource): string | null {
  return source.cookies?.[REFRESH_COOKIE_NAME] ?? null;
}
