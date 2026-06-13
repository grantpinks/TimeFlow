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

  const allowedOrigin = env.APP_BASE_URL.replace(/\/$/, '');
  const origin = request.headers.origin;
  const referer = request.headers.referer;

  if (origin) {
    if (origin !== allowedOrigin) {
      return reply.status(403).send({ error: 'Forbidden' });
    }
    return;
  }

  if (referer && !referer.startsWith(`${allowedOrigin}/`) && referer !== allowedOrigin) {
    return reply.status(403).send({ error: 'Forbidden' });
  }

  const hasCookie = Boolean(request.cookies?.[ACCESS_COOKIE_NAME]);
  const hasBearer = request.headers.authorization?.startsWith('Bearer ');
  if (hasCookie && !hasBearer && !referer) {
    return reply.status(403).send({ error: 'Forbidden' });
  }
}
