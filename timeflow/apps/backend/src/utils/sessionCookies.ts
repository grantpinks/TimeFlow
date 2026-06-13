import type { CookieSerializeOptions } from '@fastify/cookie';

export const ACCESS_COOKIE_NAME = 'tf_access';
export const REFRESH_COOKIE_NAME = 'tf_refresh';

const PROD_DOMAIN = '.time-flow.app';
const ACCESS_MAX_AGE = 15 * 60;
const REFRESH_MAX_AGE = 7 * 24 * 60 * 60;

function baseOptions(nodeEnv: string): CookieSerializeOptions {
  const isProd = nodeEnv === 'production';
  return {
    path: '/',
    httpOnly: true,
    sameSite: 'lax',
    secure: isProd,
    ...(isProd ? { domain: PROD_DOMAIN } : {}),
  };
}

export function buildAccessCookieOptions(nodeEnv: string): CookieSerializeOptions {
  return { ...baseOptions(nodeEnv), maxAge: ACCESS_MAX_AGE };
}

export function buildRefreshCookieOptions(nodeEnv: string): CookieSerializeOptions {
  return { ...baseOptions(nodeEnv), maxAge: REFRESH_MAX_AGE };
}

export function buildClearCookieOptions(nodeEnv: string): CookieSerializeOptions {
  return { ...baseOptions(nodeEnv), maxAge: 0 };
}
