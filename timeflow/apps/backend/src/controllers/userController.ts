/**
 * User Controller
 *
 * Handles user profile and preferences endpoints.
 */

import { FastifyRequest, FastifyReply } from 'fastify';
import { prisma } from '../config/prisma.js';
import { z } from 'zod';
import { formatZodError } from '../utils/errorFormatter.js';
import type { DailyMeetingConfig } from '@timeflow/shared';

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

const meetingDayConfigSchema = z.object({
  isAvailable: z.boolean(),
  startTime: z.string().regex(/^\d{2}:\d{2}$/, 'startTime must be HH:mm').optional(),
  endTime: z.string().regex(/^\d{2}:\d{2}$/, 'endTime must be HH:mm').optional(),
  maxMeetings: z.number().int().positive().max(20).optional(),
});

const dailyMeetingScheduleSchema = z
  .object({
    monday: meetingDayConfigSchema.optional(),
    tuesday: meetingDayConfigSchema.optional(),
    wednesday: meetingDayConfigSchema.optional(),
    thursday: meetingDayConfigSchema.optional(),
    friday: meetingDayConfigSchema.optional(),
    saturday: meetingDayConfigSchema.optional(),
    sunday: meetingDayConfigSchema.optional(),
  })
  .optional()
  .nullable();

const preferencesSchema = z.object({
  wakeTime: z.string().regex(/^\d{2}:\d{2}$/, 'wakeTime must be HH:mm').optional(),
  sleepTime: z.string().regex(/^\d{2}:\d{2}$/, 'sleepTime must be HH:mm').optional(),
  dailySchedule: dailyScheduleSchema,
  dailyScheduleConstraints: dailyScheduleSchema,
  timeZone: z.string().min(1, 'timeZone is required').optional(),
  defaultTaskDurationMinutes: z.coerce.number().int().positive().max(24 * 60).optional(),
  defaultCalendarId: z.string().min(1).optional(),

  // Meeting-specific preferences
  meetingStartTime: z.string().regex(/^\d{2}:\d{2}$/, 'meetingStartTime must be HH:mm').optional().nullable(),
  meetingEndTime: z.string().regex(/^\d{2}:\d{2}$/, 'meetingEndTime must be HH:mm').optional().nullable(),
  blockedDaysOfWeek: z.array(z.enum(['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'])).optional(),
  dailyMeetingSchedule: dailyMeetingScheduleSchema,
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
    meetingStartTime: record.meetingStartTime,
    meetingEndTime: record.meetingEndTime,
    blockedDaysOfWeek: record.blockedDaysOfWeek || [],
    dailyMeetingSchedule: record.dailyMeetingSchedule || null,
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

interface MeetingDayConfig {
  isAvailable: boolean;
  startTime?: string;
  endTime?: string;
  maxMeetings?: number;
}

interface DailyMeetingScheduleConfig {
  monday?: MeetingDayConfig;
  tuesday?: MeetingDayConfig;
  wednesday?: MeetingDayConfig;
  thursday?: MeetingDayConfig;
  friday?: MeetingDayConfig;
  saturday?: MeetingDayConfig;
  sunday?: MeetingDayConfig;
}

interface UpdatePreferencesBody {
  wakeTime?: string;
  sleepTime?: string;
  dailySchedule?: DailyScheduleConfig | null;
  dailyScheduleConstraints?: DailyScheduleConfig | null;
  timeZone?: string;
  defaultTaskDurationMinutes?: number;
  defaultCalendarId?: string;
  meetingStartTime?: string | null;
  meetingEndTime?: string | null;
  blockedDaysOfWeek?: string[];
  dailyMeetingSchedule?: DailyMeetingScheduleConfig | null;
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
    meetingStartTime,
    meetingEndTime,
    blockedDaysOfWeek,
    dailyMeetingSchedule,
  } =
    parsed.data;

  const scheduleProvided =
    dailySchedule !== undefined || dailyScheduleConstraints !== undefined;
  const mergedSchedule =
    dailyScheduleConstraints !== undefined ? dailyScheduleConstraints : dailySchedule;

  const updated = await prisma.user.update({
    where: { id: user.id },
    data: {
      ...(wakeTime && { wakeTime }),
      ...(sleepTime && { sleepTime }),
      ...(scheduleProvided && { dailySchedule: mergedSchedule }),
      ...(scheduleProvided && { dailyScheduleConstraints: mergedSchedule }),
      ...(timeZone && { timeZone }),
      ...(defaultTaskDurationMinutes && { defaultTaskDurationMinutes }),
      ...(defaultCalendarId && { defaultCalendarId }),

      // Meeting preferences
      ...(meetingStartTime !== undefined && { meetingStartTime }),
      ...(meetingEndTime !== undefined && { meetingEndTime }),
      ...(blockedDaysOfWeek && { blockedDaysOfWeek }),
      ...(dailyMeetingSchedule !== undefined && { dailyMeetingSchedule }),
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
    meetingStartTime: updated.meetingStartTime,
    meetingEndTime: updated.meetingEndTime,
    blockedDaysOfWeek: updated.blockedDaysOfWeek || [],
    dailyMeetingSchedule: updated.dailyMeetingSchedule || null,
  };
}

