/**
 * User Controller
 *
 * Handles user profile and preferences endpoints.
 */

import { FastifyRequest, FastifyReply } from 'fastify';
import { prisma } from '../config/prisma.js';

/**
 * GET /api/user/me
 * Returns the authenticated user's profile and preferences.
 */
export async function getMe(request: FastifyRequest, reply: FastifyReply) {
  const user = request.user;

  if (!user) {
    return reply.status(401).send({ error: 'Not authenticated' });
  }

  return {
    id: user.id,
    email: user.email,
    timeZone: user.timeZone,
    wakeTime: user.wakeTime,
    sleepTime: user.sleepTime,
    defaultTaskDurationMinutes: user.defaultTaskDurationMinutes,
    defaultCalendarId: user.defaultCalendarId,
  };
}

interface UpdatePreferencesBody {
  wakeTime?: string;
  sleepTime?: string;
  timeZone?: string;
  defaultTaskDurationMinutes?: number;
  defaultCalendarId?: string;
}

/**
 * PATCH /api/user/preferences
 * Updates the user's preferences.
 */
export async function updatePreferences(
  request: FastifyRequest<{ Body: UpdatePreferencesBody }>,
  reply: FastifyReply
) {
  const user = request.user;

  if (!user) {
    return reply.status(401).send({ error: 'Not authenticated' });
  }

  const { wakeTime, sleepTime, timeZone, defaultTaskDurationMinutes, defaultCalendarId } =
    request.body;

  const updated = await prisma.user.update({
    where: { id: user.id },
    data: {
      wakeTime,
      sleepTime,
      timeZone,
      defaultTaskDurationMinutes,
      defaultCalendarId,
    },
  });

  return {
    id: updated.id,
    email: updated.email,
    timeZone: updated.timeZone,
    wakeTime: updated.wakeTime,
    sleepTime: updated.sleepTime,
    defaultTaskDurationMinutes: updated.defaultTaskDurationMinutes,
    defaultCalendarId: updated.defaultCalendarId,
  };
}

