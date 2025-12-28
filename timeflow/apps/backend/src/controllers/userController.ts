/**
 * User Controller
 *
 * Handles user profile and preferences endpoints.
 */

import { FastifyRequest, FastifyReply } from 'fastify';
import { prisma } from '../config/prisma.js';
import { z } from 'zod';
import { formatZodError } from '../utils/errorFormatter.js';

const dayScheduleSchema = z.object({
  wakeTime: z.string().regex(/^\d{2}:\d{2}$/, 'wakeTime must be HH:mm'),
  sleepTime: z.string().regex(/^\d{2}:\d{2}$/, 'sleepTime must be HH:mm'),
});

const dailyScheduleSchema = z.object({
  monday: dayScheduleSchema.optional(),
  tuesday: dayScheduleSchema.optional(),
  wednesday: dayScheduleSchema.optional(),
  thursday: dayScheduleSchema.optional(),
  friday: dayScheduleSchema.optional(),
  saturday: dayScheduleSchema.optional(),
  sunday: dayScheduleSchema.optional(),
}).optional().nullable();

const preferencesSchema = z.object({
  wakeTime: z.string().regex(/^\d{2}:\d{2}$/, 'wakeTime must be HH:mm').optional(),
  sleepTime: z.string().regex(/^\d{2}:\d{2}$/, 'sleepTime must be HH:mm').optional(),
  dailySchedule: dailyScheduleSchema,
  dailyScheduleConstraints: dailyScheduleSchema,
  timeZone: z.string().min(1, 'timeZone is required').optional(),
  defaultTaskDurationMinutes: z.coerce.number().int().positive().max(24 * 60).optional(),
  defaultCalendarId: z.string().min(1).optional(),
});

/**
 * GET /api/user/me
 * Returns the authenticated user's profile and preferences.
 */
export async function getMe(request: FastifyRequest, reply: FastifyReply) {
  const user = request.user;

  if (!user) {
    return reply.status(401).send({ error: 'Not authenticated' });
  }

  const record = await prisma.user.findUnique({
    where: { id: user.id },
  });

  if (!record) {
    return reply.status(404).send({ error: 'User not found' });
  }

  return {
    id: record.id,
    email: record.email,
    name: record.name,
    timeZone: record.timeZone,
    wakeTime: record.wakeTime,
    sleepTime: record.sleepTime,
    dailySchedule: record.dailySchedule || null,
    dailyScheduleConstraints: record.dailyScheduleConstraints || null,
    defaultTaskDurationMinutes: record.defaultTaskDurationMinutes,
    defaultCalendarId: record.defaultCalendarId,
  };
}

interface DaySchedule {
  wakeTime: string;
  sleepTime: string;
}

interface DailyScheduleConfig {
  monday?: DaySchedule;
  tuesday?: DaySchedule;
  wednesday?: DaySchedule;
  thursday?: DaySchedule;
  friday?: DaySchedule;
  saturday?: DaySchedule;
  sunday?: DaySchedule;
}

interface UpdatePreferencesBody {
  wakeTime?: string;
  sleepTime?: string;
  dailySchedule?: DailyScheduleConfig | null;
  dailyScheduleConstraints?: DailyScheduleConfig | null;
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

  const parsed = preferencesSchema.safeParse(request.body);
  if (!parsed.success) {
    return reply.status(400).send({ error: formatZodError(parsed.error) });
  }

  const {
    wakeTime,
    sleepTime,
    dailySchedule,
    dailyScheduleConstraints,
    timeZone,
    defaultTaskDurationMinutes,
    defaultCalendarId,
  } =
    parsed.data;

  const scheduleProvided =
    dailySchedule !== undefined || dailyScheduleConstraints !== undefined;
  const mergedSchedule =
    dailyScheduleConstraints !== undefined ? dailyScheduleConstraints : dailySchedule;

  const updated = await prisma.user.update({
    where: { id: user.id },
    data: {
      wakeTime,
      sleepTime,
      dailySchedule: scheduleProvided ? mergedSchedule : undefined,
      dailyScheduleConstraints: scheduleProvided ? mergedSchedule : undefined,
      timeZone,
      defaultTaskDurationMinutes,
      defaultCalendarId,
    },
  });

  return {
    id: updated.id,
    email: updated.email,
    name: updated.name,
    timeZone: updated.timeZone,
    wakeTime: updated.wakeTime,
    sleepTime: updated.sleepTime,
    dailySchedule: updated.dailySchedule || null,
    dailyScheduleConstraints: updated.dailyScheduleConstraints || null,
    defaultTaskDurationMinutes: updated.defaultTaskDurationMinutes,
    defaultCalendarId: updated.defaultCalendarId,
  };
}

