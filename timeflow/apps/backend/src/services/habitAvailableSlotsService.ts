/**
 * Habit Available Slots Service
 *
 * Finds available time slots for a single habit based on calendar analysis
 */

import { DateTime } from 'luxon';
import {
  suggestHabitBlocks,
  type CalendarEvent as SchedulerEvent,
  type HabitInput,
  type HabitSuggestionBlock,
  type UserPreferences,
} from '@timeflow/scheduling';
import type { DailyScheduleConfig } from '@timeflow/shared';
import { prisma } from '../config/prisma.js';
import * as calendarService from './googleCalendarService.js';

export interface AvailableSlot {
  startDateTime: string; // ISO string
  endDateTime: string; // ISO string
  dayOfWeek: string; // "Monday", "Tuesday", etc.
  timeOfDay: 'morning' | 'afternoon' | 'evening';
  displayTime: string; // "9:00 AM - 9:30 AM"
}

export interface AvailableSlotsRequest {
  userId: string;
  habitId: string;
  date?: string; // ISO date (YYYY-MM-DD) - for single day
  dateRangeStart?: string; // ISO date - for range
  dateRangeEnd?: string; // ISO date - for range
  maxSlotsPerDay?: number; // Default: 5
}

export interface AvailableSlotsResponse {
  slots: AvailableSlot[];
  habitTitle: string;
  habitDuration: number;
  dateRange: {
    start: string;
    end: string;
  };
}

/**
 * Get time of day category from hour
 */
function getTimeOfDay(hour: number): 'morning' | 'afternoon' | 'evening' {
  if (hour < 12) return 'morning';
  if (hour < 17) return 'afternoon';
  return 'evening';
}

/**
 * Format time slot for display
 */
function formatTimeSlot(start: DateTime, end: DateTime): string {
  return `${start.toFormat('h:mm a')} - ${end.toFormat('h:mm a')}`;
}

/**
 * Find available time slots for a habit
 */
export async function getAvailableSlots(
  request: AvailableSlotsRequest
): Promise<AvailableSlotsResponse> {
  const { userId, habitId, date, dateRangeStart, dateRangeEnd, maxSlotsPerDay = 5 } = request;

  // Validate inputs
  if (!date && (!dateRangeStart || !dateRangeEnd)) {
    throw new Error('Either date or dateRangeStart/dateRangeEnd must be provided');
  }

  // Determine date range
  let rangeStart: string;
  let rangeEnd: string;

  if (date) {
    rangeStart = date;
    rangeEnd = date;
  } else {
    rangeStart = dateRangeStart!;
    rangeEnd = dateRangeEnd!;
  }

  // Validate date range
  const start = DateTime.fromISO(rangeStart);
  const end = DateTime.fromISO(rangeEnd);
  const daysDiff = end.diff(start, 'days').days;

  if (daysDiff > 14) {
    throw new Error('Date range cannot exceed 14 days');
  }

  if (daysDiff < 0) {
    throw new Error('End date must be after start date');
  }

  // Get user and habit
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

  // Gather existing calendar events to avoid conflicts
  const calendarId = user.defaultCalendarId || 'primary';
  const existingEvents = await calendarService.getEvents(
    userId,
    calendarId,
    start.toISO()!,
    end.endOf('day').toISO()!
  );

  // Get already scheduled tasks to avoid conflicts
  const scheduledTasks = await prisma.scheduledTask.findMany({
    where: {
      task: { userId },
      startDateTime: {
        gte: start.toJSDate(),
        lte: end.endOf('day').toJSDate(),
      },
    },
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

  // Create habit input for scheduler
  const habitInput: HabitInput = {
    id: habit.id,
    durationMinutes: habit.durationMinutes,
    frequency: habit.frequency as HabitInput['frequency'],
    daysOfWeek: habit.daysOfWeek,
    preferredTimeOfDay: (habit.preferredTimeOfDay as HabitInput['preferredTimeOfDay']) || undefined,
  };

  const preferences: UserPreferences = {
    timeZone: user.timeZone || 'UTC',
    wakeTime: user.wakeTime || '08:00',
    sleepTime: user.sleepTime || '23:00',
    dailySchedule: (user.dailyScheduleConstraints as DailyScheduleConfig | null) || (user.dailySchedule as DailyScheduleConfig | null) || null,
  };

  // Use the scheduling algorithm to find available slots
  // For single habit, we want to find ALL possible slots, not just one per day
  // We'll call the scheduler multiple times per day to find different options

  const allSuggestions: HabitSuggestionBlock[] = [];

  // For each day in the range, find multiple slots
  let currentDate = start;
  while (currentDate <= end) {
    const dayStart = currentDate.toISO()!;
    const dayEnd = currentDate.toISO()!;

    // First, try to find slots with the preferred time of day
    console.log(`[AvailableSlots] Searching for slots on ${dayStart}`);
    console.log(`[AvailableSlots] Habit:`, habit.title, `Preferred:`, habitInput.preferredTimeOfDay);
    console.log(`[AvailableSlots] Existing events count:`, schedulerEvents.length);

    let daySuggestions = suggestHabitBlocks(
      [habitInput],
      schedulerEvents,
      preferences,
      dayStart,
      dayEnd
    );

    console.log(`[AvailableSlots] Initial suggestions found:`, daySuggestions.length);
    let habitSuggestions = daySuggestions.filter(s => s.habitId === habitId);

    // If no slots found with preferred time, try again WITHOUT the preference
    // This allows finding slots at any time of day when preferred time is fully booked
    if (habitSuggestions.length === 0 && habitInput.preferredTimeOfDay) {
      const habitInputNoPreference = { ...habitInput, preferredTimeOfDay: undefined };
      daySuggestions = suggestHabitBlocks(
        [habitInputNoPreference],
        schedulerEvents,
        preferences,
        dayStart,
        dayEnd
      );
      habitSuggestions = daySuggestions.filter(s => s.habitId === habitId);
    }

    // If we got at least one suggestion, try to find more slots by temporarily blocking it
    if (habitSuggestions.length > 0) {
      const slotsForDay: HabitSuggestionBlock[] = [];
      const blockedSlots: SchedulerEvent[] = [...schedulerEvents];

      // Try with preference first, then without
      const habitInputToUse = habitInput.preferredTimeOfDay ? habitInput : { ...habitInput, preferredTimeOfDay: undefined };

      for (let i = 0; i < maxSlotsPerDay; i++) {
        // Try with preference first
        let suggestions = suggestHabitBlocks(
          [habitInput],
          blockedSlots,
          preferences,
          dayStart,
          dayEnd
        );

        let habitSlot = suggestions.find(s => s.habitId === habitId);

        // If no slot with preference, try without preference
        if (!habitSlot && habitInput.preferredTimeOfDay) {
          suggestions = suggestHabitBlocks(
            [{ ...habitInput, preferredTimeOfDay: undefined }],
            blockedSlots,
            preferences,
            dayStart,
            dayEnd
          );
          habitSlot = suggestions.find(s => s.habitId === habitId);
        }

        if (!habitSlot) break; // No more available slots

        slotsForDay.push(habitSlot);

        // Block this slot for next iteration to find different time
        blockedSlots.push({
          id: `temp-${i}`,
          start: habitSlot.start || habitSlot.startDateTime!,
          end: habitSlot.end || habitSlot.endDateTime!,
        });
      }

      allSuggestions.push(...slotsForDay);
    }

    currentDate = currentDate.plus({ days: 1 });
  }

  // Transform suggestions to available slots
  const slots: AvailableSlot[] = allSuggestions.map((suggestion) => {
    const startValue = suggestion.start ?? suggestion.startDateTime;
    const endValue = suggestion.end ?? suggestion.endDateTime;

    if (!startValue || !endValue) {
      throw new Error('Missing start or end time for habit suggestion');
    }

    const startDT = DateTime.fromISO(startValue, { zone: preferences.timeZone });
    const endDT = DateTime.fromISO(endValue, { zone: preferences.timeZone });

    return {
      startDateTime: startValue,
      endDateTime: endValue,
      dayOfWeek: startDT.toFormat('EEEE'),
      timeOfDay: getTimeOfDay(startDT.hour),
      displayTime: formatTimeSlot(startDT, endDT),
    };
  });

  return {
    slots,
    habitTitle: habit.title,
    habitDuration: habit.durationMinutes,
    dateRange: {
      start: rangeStart,
      end: rangeEnd,
    },
  };
}
