/**
 * Habit Reschedule Service
 *
 * Updates a scheduled habit instance time in both Google Calendar and DB.
 */

import { prisma } from '../config/prisma.js';
import * as calendarService from './googleCalendarService.js';

export async function rescheduleHabitInstance(
  userId: string,
  scheduledHabitId: string,
  startDateTime: string,
  endDateTime: string
): Promise<void> {
  const scheduledHabit = await prisma.scheduledHabit.findFirst({
    where: { id: scheduledHabitId, userId },
  });

  if (!scheduledHabit) {
    throw new Error('Scheduled habit not found');
  }

  await calendarService.updateEvent(
    userId,
    scheduledHabit.calendarId,
    scheduledHabit.eventId,
    {
      start: startDateTime,
      end: endDateTime,
    }
  );

  await prisma.scheduledHabit.update({
    where: { id: scheduledHabitId },
    data: {
      startDateTime: new Date(startDateTime),
      endDateTime: new Date(endDateTime),
      lastSyncedAt: new Date(),
    },
  });
}
