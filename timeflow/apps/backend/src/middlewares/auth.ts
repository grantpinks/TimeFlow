/**
 * Authentication Middleware
 *
 * Verifies JWT or session token and attaches user to request.
 * TODO: Implement full JWT verification with proper secret and expiry.
 */

import { FastifyRequest, FastifyReply } from 'fastify';
import { prisma } from '../config/prisma.js';
import type { AuthenticatedUser } from '../types/context.js';

/**
 * Middleware to require authentication.
 * Extracts user ID from Authorization header (Bearer token) and loads user.
 *
 * For MVP, we use a simple scheme where the token is the user ID.
 * TODO: Replace with proper JWT verification.
 */
export async function requireAuth(
  request: FastifyRequest,
  reply: FastifyReply
): Promise<void> {
  const authHeader = request.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return reply.status(401).send({ error: 'Unauthorized: Missing token' });
  }

  const token = authHeader.slice(7); // Remove "Bearer " prefix

  // TODO: Verify JWT signature and extract claims
  // For now, treat token as user ID (development only)
  const userId = token;

  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      return reply.status(401).send({ error: 'Unauthorized: User not found' });
    }

    const authenticatedUser: AuthenticatedUser = {
      id: user.id,
      email: user.email,
      googleId: user.googleId,
      timeZone: user.timeZone,
      wakeTime: user.wakeTime,
      sleepTime: user.sleepTime,
      defaultTaskDurationMinutes: user.defaultTaskDurationMinutes,
      defaultCalendarId: user.defaultCalendarId,
    };

    request.user = authenticatedUser;
  } catch (error) {
    request.log.error(error, 'Auth middleware error');
    return reply.status(500).send({ error: 'Internal server error' });
  }
}

