/**
 * Habit Suggestion Service
 *
 * Generates non-committed schedule suggestions for habits.
 */

import {
  suggestHabitBlocks,
  type CalendarEvent as SchedulerEvent,
  type HabitInput,
  type HabitSuggestionBlock,
  type UserPreferences,
} from '@timeflow/scheduling';
import { isHabitDueOnDate, type DailyScheduleConfig } from '@timeflow/shared';
import { DateTime } from 'luxon';
import { prisma } from '../config/prisma.js';
import * as calendarService from './googleCalendarService.js';
import { buildTimeflowEventDetails } from '../utils/timeflowEventPrefix.js';

/**
 * Extended habit suggestion with habit details
 */
export interface EnrichedHabitSuggestion extends HabitSuggestionBlock {
  habit: {
    id: string;
    title: string;
    description: string | null;
    durationMinutes: number;
  };
}

function localDayKey(value: string | Date, timeZone: string): string {
  const dateTime =
    value instanceof Date
      ? DateTime.fromJSDate(value, { zone: timeZone })
      : DateTime.fromISO(value, { setZone: true }).setZone(timeZone);

  if (!dateTime.isValid) {
    throw new Error('Invalid date');
  }

  return dateTime.toISODate()!;
}

function localDayRange(value: string, timeZone: string): { start: Date; end: Date } {
  const dateTime = DateTime.fromISO(value, { setZone: true }).setZone(timeZone);
  if (!dateTime.isValid) {
    throw new Error('Invalid date');
  }

  return {
    start: dateTime.startOf('day').toJSDate(),
    end: dateTime.plus({ days: 1 }).startOf('day').toJSDate(),
  };
}

function parseSuggestionWindow(start: string, end: string, timeZone: string): { start: DateTime; end: DateTime } {
  const parsedStart = DateTime.fromISO(start, { setZone: true }).setZone(timeZone);
  const parsedEnd = DateTime.fromISO(end, { setZone: true }).setZone(timeZone);

  if (!parsedStart.isValid || !parsedEnd.isValid) {
    throw new Error('Invalid date');
  }

  if (parsedEnd <= parsedStart) {
    throw new Error('Suggestion end must be after start');
  }

  return { start: parsedStart, end: parsedEnd };
}

function localDaySpan(start: string, end: string, timeZone: string): { start: Date; end: Date } {
  const window = parseSuggestionWindow(start, end, timeZone);
  return {
    start: window.start.startOf('day').toJSDate(),
    end: window.end.startOf('day').plus({ days: 1 }).toJSDate(),
  };
}

export async function getHabitSuggestionsForUser(
  userId: string,
  dateRangeStart: string,
  dateRangeEnd: string,
  habitIds?: string[]
): Promise<EnrichedHabitSuggestion[]> {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) {
    throw new Error('User not found');
  }

  // Only consider active habits (optionally filtered by habitIds)
  const where: any = { userId, isActive: true };
  if (habitIds && habitIds.length > 0) {
    where.id = { in: habitIds };
  }

  const habits = await prisma.habit.findMany({ where });

  if (habits.length === 0) {
    return [];
  }

  // Gather existing calendar events (Google) and already scheduled tasks to avoid conflicts
  const calendarId = user.defaultCalendarId || 'primary';
  const existingEvents = await calendarService.getEvents(
    userId,
    calendarId,
    dateRangeStart,
    dateRangeEnd
  );

  const scheduledTasks = await prisma.scheduledTask.findMany({
    where: { task: { userId } },
    include: { task: true },
  });

  const preferences: UserPreferences = {
    timeZone: user.timeZone || 'UTC',
    wakeTime: user.wakeTime || '08:00',
    sleepTime: user.sleepTime || '23:00',
    dailySchedule: (user.dailyScheduleConstraints as DailyScheduleConfig | null) || (user.dailySchedule as DailyScheduleConfig | null) || null,
  };

  const unavailableRange = localDaySpan(dateRangeStart, dateRangeEnd, preferences.timeZone);

  const scheduledHabits = await prisma.scheduledHabit.findMany({
    where: {
      userId,
      startDateTime: { lt: new Date(dateRangeEnd) },
      endDateTime: { gt: new Date(dateRangeStart) },
    },
    select: { habitId: true, startDateTime: true, endDateTime: true },
  });

  const scheduledHabitDays = await prisma.scheduledHabit.findMany({
    where: {
      userId,
      startDateTime: { gte: unavailableRange.start, lt: unavailableRange.end },
    },
    select: { habitId: true, startDateTime: true, endDateTime: true },
  });

  const habitCompletions = await prisma.habitCompletion.findMany({
    where: {
      userId,
      status: 'completed',
      completedAt: { gte: unavailableRange.start, lt: unavailableRange.end },
    },
    select: { habitId: true, completedAt: true },
  });

  const scheduledTaskEvents: SchedulerEvent[] = scheduledTasks.map((st) => ({
    id: st.id,
    start: st.startDateTime.toISOString(),
    end: st.endDateTime.toISOString(),
  }));
  const scheduledHabitEvents: SchedulerEvent[] = scheduledHabits.map((scheduledHabit) => ({
    id: `${scheduledHabit.habitId}-${scheduledHabit.startDateTime.toISOString()}`,
    start: scheduledHabit.startDateTime.toISOString(),
    end: scheduledHabit.endDateTime.toISOString(),
  }));

  const schedulerEvents: SchedulerEvent[] = [
    ...existingEvents.map((e) => ({
      id: e.id,
      start: e.start,
      end: e.end,
    })),
    ...scheduledTaskEvents,
    ...scheduledHabitEvents,
  ];

  const habitInputs: HabitInput[] = habits.map((habit) => ({
    id: habit.id,
    durationMinutes: habit.durationMinutes,
    frequency: habit.frequency as HabitInput['frequency'],
    daysOfWeek: habit.daysOfWeek,
    preferredTimeOfDay: (habit.preferredTimeOfDay as HabitInput['preferredTimeOfDay']) || undefined,
  }));

  const suggestions = suggestHabitBlocks(habitInputs, schedulerEvents, preferences, dateRangeStart, dateRangeEnd);
  const unavailableHabitDays = new Set<string>();
  for (const scheduledHabit of scheduledHabitDays) {
    unavailableHabitDays.add(
      `${scheduledHabit.habitId}:${localDayKey(scheduledHabit.startDateTime, preferences.timeZone)}`
    );
  }
  for (const completion of habitCompletions) {
    unavailableHabitDays.add(
      `${completion.habitId}:${localDayKey(completion.completedAt, preferences.timeZone)}`
    );
  }

  // Enrich suggestions with habit details
  const habitMap = new Map(habits.map((h) => [h.id, h]));

  return suggestions.filter((suggestion) => {
    const dayKey = localDayKey(suggestion.start, preferences.timeZone);
    return !unavailableHabitDays.has(`${suggestion.habitId}:${dayKey}`);
  }).map((suggestion) => {
    const habit = habitMap.get(suggestion.habitId);
    if (!habit) {
      throw new Error(`Habit ${suggestion.habitId} not found in habit map`);
    }

    return {
      ...suggestion,
      habit: {
        id: habit.id,
        title: habit.title,
        description: habit.description,
        durationMinutes: habit.durationMinutes,
      },
    };
  });
}

/**
 * Accept a habit suggestion and create a calendar event + ScheduledHabit record
 */
export async function acceptSuggestion(
  userId: string,
  habitId: string,
  start: string,
  end: string
) {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) {
    throw new Error('User not found');
  }

  const habit = await prisma.habit.findFirst({
    where: { id: habitId, userId },
  });
  if (!habit) {
    throw new Error('Habit not found');
  }

  const timeZone = user.timeZone || 'UTC';
  const selectedWindow = parseSuggestionWindow(start, end, timeZone);
  const selectedRange = localDayRange(start, timeZone);

  if (!isHabitDueOnDate(habit, selectedWindow.start.toJSDate(), timeZone)) {
    throw new Error('Habit is not due on the selected date');
  }

  const calendarId = user.defaultCalendarId || 'primary';
  const reservation = await prisma.$transaction(async (tx: any) => {
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${`habit-suggestion:${userId}`}))`;

    const selectedStart = selectedWindow.start.toJSDate();
    const selectedEnd = selectedWindow.end.toJSDate();

    const [existingScheduled, completedToday, overlappingTask, overlappingHabit] = await Promise.all([
      tx.scheduledHabit.findFirst({
        where: {
          userId,
          habitId: habit.id,
          startDateTime: { gte: selectedRange.start, lt: selectedRange.end },
        },
        select: { id: true },
      }),
      tx.habitCompletion.findFirst({
        where: {
          userId,
          habitId: habit.id,
          status: 'completed',
          completedAt: { gte: selectedRange.start, lt: selectedRange.end },
        },
        select: { id: true },
      }),
      tx.scheduledTask.findFirst({
        where: {
          task: { userId },
          startDateTime: { lt: selectedEnd },
          endDateTime: { gt: selectedStart },
        },
        select: { id: true },
      }),
      tx.scheduledHabit.findFirst({
        where: {
          userId,
          startDateTime: { lt: selectedEnd },
          endDateTime: { gt: selectedStart },
        },
        select: { id: true },
      }),
    ]);

    if (existingScheduled) {
      throw new Error('Habit is already scheduled for the selected date');
    }

    if (completedToday) {
      throw new Error('Habit is already completed for the selected date');
    }

    if (overlappingTask) {
      throw new Error('Habit suggestion overlaps a scheduled task');
    }

    if (overlappingHabit) {
      throw new Error('Habit suggestion overlaps another scheduled habit');
    }

    return tx.scheduledHabit.create({
      data: {
        habitId: habit.id,
        userId,
        provider: 'google',
        calendarId,
        eventId: `pending:${habit.id}:${selectedWindow.start.toISO()}`,
        startDateTime: new Date(start),
        endDateTime: new Date(end),
        status: 'pending',
      },
    });
  });

  const habitEvent = buildTimeflowEventDetails({
    title: habit.title,
    kind: 'habit',
    prefixEnabled: user.eventPrefixEnabled,
    prefix: user.eventPrefix,
    description: habit.description,
  });

  let eventId: string | null = null;
  try {
    const createdEvent = await calendarService.createEvent(userId, calendarId, {
      summary: habitEvent.summary,
      description: habitEvent.description || undefined,
      start,
      end,
    });
    eventId = createdEvent.eventId;

    return await prisma.scheduledHabit.update({
      where: { id: reservation.id },
      data: { eventId, status: 'scheduled' },
    });
  } catch (error) {
    let shouldDeleteReservation = true;

    if (eventId) {
      try {
        await calendarService.deleteEvent(userId, calendarId, eventId);
      } catch (cleanupError) {
        console.error('[HabitSuggestionService] Failed to delete orphaned habit event', cleanupError);
        shouldDeleteReservation = false;
      }
    }

    if (shouldDeleteReservation) {
      try {
        await prisma.scheduledHabit.delete({ where: { id: reservation.id } });
      } catch (cleanupError) {
        console.error('[HabitSuggestionService] Failed to delete failed habit reservation', cleanupError);
      }
    }

    throw error;
  }
}
