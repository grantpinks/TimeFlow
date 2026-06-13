/**
 * Origin validation for cookie-authenticated mutating requests (CSRF mitigation).
 */

import { FastifyRequest, FastifyReply } from 'fastify';
import { env } from '../config/env.js';
import { ACCESS_COOKIE_NAME } from '../utils/sessionCookies.js';

const MUTATING_METHODS = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);

/** Paths that accept cross-origin or server-to-server requests without browser Origin. */
function isOriginExempt(url: string): boolean {
  return (
    url.startsWith('/api/integrations/') ||
    url.startsWith('/api/internal/') ||
    url.startsWith('/api/book/') ||
    url.startsWith('/api/availability/') ||
    url.startsWith('/api/billing/webhook') ||
    url === '/api/auth/refresh' ||
    url === '/api/auth/logout'
  );
}

function allowedAppOrigin(): string {
  return env.APP_BASE_URL.replace(/\/$/, '');
}

function refererMatchesApp(referer: string, allowed: string): boolean {
  return referer === allowed || referer.startsWith(`${allowed}/`);
}

export async function validateOrigin(
  request: FastifyRequest,
  reply: FastifyReply
): Promise<void> {
  if (!MUTATING_METHODS.has(request.method)) {
    return;
  }

  const url = request.url.split('?')[0] ?? request.url;
  if (isOriginExempt(url)) {
    return;
  }

  const allowed = allowedAppOrigin();
  const origin = request.headers.origin;
  const referer = request.headers.referer;
  const secFetchSite = request.headers['sec-fetch-site'];
  const hasBearer = request.headers.authorization?.startsWith('Bearer ');

  // Mobile / API clients use Bearer tokens, not cookies.
  if (hasBearer) {
    return;
  }

  // Modern browsers send Sec-Fetch-Site on navigations and fetch().
  // Same-origin/same-site POSTs from our web app are safe; CSRF is cross-site.
  if (secFetchSite === 'same-origin' || secFetchSite === 'same-site') {
    return;
  }

  if (origin) {
    if (origin === allowed) {
      return;
    }
    return reply.status(403).send({ error: 'Forbidden' });
  }

  if (referer && refererMatchesApp(referer, allowed)) {
    return;
  }

  if (referer) {
    return reply.status(403).send({ error: 'Forbidden' });
  }

  // Cross-site cookie POST (classic CSRF) — block when browser signals cross-site.
  if (secFetchSite === 'cross-site') {
    const hasCookie = Boolean(request.cookies?.[ACCESS_COOKIE_NAME]);
    if (hasCookie) {
      return reply.status(403).send({ error: 'Forbidden' });
    }
  }

  // Same-origin fetch via Next.js rewrite often omits Origin/Referer/Sec-Fetch-Site
  // when proxied server-side. Allow cookie requests without cross-site signal.
}
