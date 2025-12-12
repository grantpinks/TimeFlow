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
import { prisma } from '../config/prisma.js';
import * as calendarService from './googleCalendarService.js';

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

export async function getHabitSuggestionsForUser(
  userId: string,
  dateRangeStart: string,
  dateRangeEnd: string
): Promise<EnrichedHabitSuggestion[]> {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) {
    throw new Error('User not found');
  }

  // Only consider active habits
  const habits = await prisma.habit.findMany({
    where: { userId, isActive: true },
  });

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

  const scheduledTaskEvents: SchedulerEvent[] = scheduledTasks.map((st) => ({
    id: st.id,
    start: st.startDateTime.toISOString(),
    end: st.endDateTime.toISOString(),
  }));

  const schedulerEvents: SchedulerEvent[] = [
    ...existingEvents.map((e) => ({
      id: e.id,
      start: e.start,
      end: e.end,
    })),
    ...scheduledTaskEvents,
  ];

  const habitInputs: HabitInput[] = habits.map((habit) => ({
    id: habit.id,
    durationMinutes: habit.durationMinutes,
    frequency: habit.frequency as HabitInput['frequency'],
    daysOfWeek: habit.daysOfWeek,
    preferredTimeOfDay: (habit.preferredTimeOfDay as HabitInput['preferredTimeOfDay']) || undefined,
  }));

  const preferences: UserPreferences = {
    timeZone: user.timeZone || 'UTC',
    wakeTime: user.wakeTime || '08:00',
    sleepTime: user.sleepTime || '23:00',
    dailySchedule: (user as any).dailySchedule || null,
  };

  const suggestions = suggestHabitBlocks(habitInputs, schedulerEvents, preferences, dateRangeStart, dateRangeEnd);

  // Enrich suggestions with habit details
  const habitMap = new Map(habits.map((h) => [h.id, h]));

  return suggestions.map((suggestion) => {
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

  // Create Google Calendar event
  const calendarId = user.defaultCalendarId || 'primary';
  const event = await calendarService.createEvent(userId, calendarId, {
    summary: `[Habit] ${habit.title}`,
    description: habit.description || undefined,
    start,
    end,
  });

  // Save ScheduledHabit record
  const scheduledHabit = await prisma.scheduledHabit.create({
    data: {
      habitId: habit.id,
      userId,
      provider: 'google',
      calendarId,
      eventId: event.id,
      startDateTime: new Date(start),
      endDateTime: new Date(end),
      status: 'scheduled',
    },
  });

  return scheduledHabit;
}
