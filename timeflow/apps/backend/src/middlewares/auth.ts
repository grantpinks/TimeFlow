/**
 * Authentication Middleware
 *
 * Verifies JWT from Authorization header (mobile) or httpOnly cookie (web).
 */

import { FastifyRequest, FastifyReply } from 'fastify';
import { prisma } from '../config/prisma.js';
import type { AuthenticatedUser } from '../types/context.js';
import { extractAccessToken } from '../utils/authTokenExtractor.js';

async function loadAuthenticatedUser(userId: string): Promise<AuthenticatedUser | null> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
  });

  if (!user) {
    return null;
  }

  return {
    id: user.id,
    email: user.email,
    googleId: user.googleId,
    timeZone: user.timeZone,
    wakeTime: user.wakeTime,
    sleepTime: user.sleepTime,
    defaultTaskDurationMinutes: user.defaultTaskDurationMinutes,
    defaultCalendarId: user.defaultCalendarId,
  };
}

/**
 * Middleware to require authentication.
 */
export async function requireAuth(
  request: FastifyRequest,
  reply: FastifyReply
): Promise<void> {
  try {
    const token = extractAccessToken({
      authorization: request.headers.authorization,
      cookies: request.cookies as Record<string, string | undefined>,
    });

    if (!token) {
      return reply.status(401).send({ error: 'Unauthorized: Missing token' });
    }

    const payload = request.server.jwt.verify<{ sub: string; type?: string }>(token);

    if (payload.type && payload.type !== 'access') {
      return reply.status(401).send({ error: 'Unauthorized: Invalid token type' });
    }

    const authenticatedUser = await loadAuthenticatedUser(payload.sub);

    if (!authenticatedUser) {
      return reply.status(401).send({ error: 'Unauthorized: User not found' });
    }

    request.user = authenticatedUser;
  } catch (error) {
    const code = (error as { code?: string })?.code;
    if (code && (code.startsWith('FST_JWT') || code.startsWith('FAST_JWT'))) {
      return reply.status(401).send({ error: 'Unauthorized: Invalid or expired token' });
    }

    request.log.error(error, 'Auth middleware error');
    return reply.status(500).send({ error: 'Internal server error' });
  }
}

/**
 * Attach request.user when a valid JWT is present; otherwise continue without auth.
 */
export async function optionalAuth(
  request: FastifyRequest,
  _reply: FastifyReply
): Promise<void> {
  const token = extractAccessToken({
    authorization: request.headers.authorization,
    cookies: request.cookies as Record<string, string | undefined>,
  });

  if (!token) {
    return;
  }

  try {
    const payload = request.server.jwt.verify<{ sub: string; type?: string }>(token);

    if (payload.type && payload.type !== 'access') {
      return;
    }

    const authenticatedUser = await loadAuthenticatedUser(payload.sub);
    if (authenticatedUser) {
      request.user = authenticatedUser;
    }
  } catch {
    // Public route — invalid or missing JWT is not an error here.
  }
}
