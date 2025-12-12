/**
 * Habit suggestion engine
 *
 * Generates non-committed habit time blocks based on user preferences,
 * frequency, and existing calendar events.
 */

import { DateTime } from 'luxon';
import { buildBusyIntervals, buildFreeSlots, subtractIntervals } from './availability.js';
import type {
  CalendarEvent,
  HabitInput,
  HabitSuggestionBlock,
  TimeInterval,
  TimeOfDayPreference,
  UserPreferences,
} from './types.js';

export function suggestHabitBlocks(
  habits: HabitInput[],
  existingEvents: CalendarEvent[],
  preferences: UserPreferences,
  dateRangeStart: string,
  dateRangeEnd: string
): HabitSuggestionBlock[] {
  const { timeZone } = preferences;

  const rangeStart = DateTime.fromISO(dateRangeStart, { zone: timeZone });
  const rangeEnd = DateTime.fromISO(dateRangeEnd, { zone: timeZone });

  if (!rangeStart.isValid || !rangeEnd.isValid) {
    throw new Error('Invalid date range');
  }

  const busyIntervals = buildBusyIntervals(existingEvents, timeZone);
  let freeSlots = buildFreeSlots(rangeStart, rangeEnd, preferences);
  freeSlots = subtractIntervals(freeSlots, busyIntervals);

  const suggestions: HabitSuggestionBlock[] = [];

  for (const habit of habits) {
    let currentDay = rangeStart.startOf('day');
    const endDay = rangeEnd.endOf('day');

    while (currentDay <= endDay) {
      if (!isHabitDay(habit, currentDay)) {
        currentDay = currentDay.plus({ days: 1 });
        continue;
      }

      const dayBounds = getDayBounds(currentDay, preferences);
      if (!dayBounds) {
        currentDay = currentDay.plus({ days: 1 });
        continue;
      }

      const slot = findSlotForHabit(habit, dayBounds.start, dayBounds.end, freeSlots, timeZone);

      if (slot) {
        const { start, end, slotIndex, reason } = slot;
        const startISO = start.toISO();
        const endISO = end.toISO();

        if (!startISO || !endISO) {
          currentDay = currentDay.plus({ days: 1 });
          continue;
        }

        suggestions.push({
          habitId: habit.id,
          start: startISO,
          end: endISO,
          status: 'proposed',
          reason,
        });

        // Consume the time from free slots to avoid overlapping suggestions
        freeSlots = consumeSlot(freeSlots, slotIndex, start.toMillis(), end.toMillis());
      }

      currentDay = currentDay.plus({ days: 1 });
    }
  }

  return suggestions;
}

/**
 * Determine if a given day should schedule the habit based on frequency.
 */
function isHabitDay(habit: HabitInput, day: DateTime): boolean {
  if (habit.frequency === 'daily' || habit.frequency === 'custom') {
    return true;
  }

  if (habit.frequency === 'weekly') {
    const dayCode = day.toFormat('ccc').toLowerCase(); // mon, tue, wed...
    return habit.daysOfWeek?.map((d) => d.toLowerCase()).includes(dayCode) ?? false;
  }

  return false;
}

/**
 * Get wake/sleep bounds for a specific day.
 */
function getDayBounds(
  day: DateTime,
  preferences: UserPreferences
): { start: DateTime; end: DateTime } | null {
  const dayNames: Record<number, 'monday' | 'tuesday' | 'wednesday' | 'thursday' | 'friday' | 'saturday' | 'sunday'> = {
    1: 'monday',
    2: 'tuesday',
    3: 'wednesday',
    4: 'thursday',
    5: 'friday',
    6: 'saturday',
    7: 'sunday',
  };

  const dailySchedule = preferences.dailySchedule || {};
  const dayName = dayNames[day.weekday];
  const dayPrefs = (dailySchedule && (dailySchedule as Record<string, any>)[dayName]) || null;

  const wake = dayPrefs?.wakeTime || preferences.wakeTime;
  const sleep = dayPrefs?.sleepTime || preferences.sleepTime;

  const [wakeHour, wakeMin] = wake.split(':').map(Number);
  const [sleepHour, sleepMin] = sleep.split(':').map(Number);

  const start = day.set({ hour: wakeHour, minute: wakeMin, second: 0, millisecond: 0 });
  const end = day.set({ hour: sleepHour, minute: sleepMin, second: 0, millisecond: 0 });

  if (end <= start) {
    return null;
  }

  return { start, end };
}

/**
 * Find the first slot within the day (respecting preferred time-of-day if provided).
 */
function findSlotForHabit(
  habit: HabitInput,
  dayStart: DateTime,
  dayEnd: DateTime,
  freeSlots: TimeInterval[],
  timeZone: string
): { start: DateTime; end: DateTime; slotIndex: number; reason?: string } | null {
  const durationMs = habit.durationMinutes * 60 * 1000;

  const preferredWindow = habit.preferredTimeOfDay
    ? getPreferredWindow(dayStart, habit.preferredTimeOfDay)
    : null;

  // First pass: try preferred window if provided
  if (preferredWindow) {
    const inWindow = findSlotInWindow(
      freeSlots,
      preferredWindow.start.toMillis(),
      preferredWindow.end.toMillis(),
      durationMs,
      timeZone
    );
    if (inWindow) {
      return { ...inWindow, reason: 'Preferred time' };
    }
  }

  // Second pass: any time within the day
  const fallback = findSlotInWindow(freeSlots, dayStart.toMillis(), dayEnd.toMillis(), durationMs, timeZone);
  if (fallback) {
    return { ...fallback, reason: preferredWindow ? 'Placed outside preferred window' : undefined };
  }

  return null;
}

function getPreferredWindow(dayStart: DateTime, preference: TimeOfDayPreference): { start: DateTime; end: DateTime } {
  const windowHours: Record<TimeOfDayPreference, { start: number; end: number }> = {
    morning: { start: 5, end: 12 },
    afternoon: { start: 12, end: 17 },
    evening: { start: 17, end: 22 },
  };

  const { start, end } = windowHours[preference];

  return {
    start: dayStart.set({ hour: start, minute: 0, second: 0, millisecond: 0 }),
    end: dayStart.set({ hour: end, minute: 0, second: 0, millisecond: 0 }),
  };
}

function findSlotInWindow(
  freeSlots: TimeInterval[],
  windowStartMs: number,
  windowEndMs: number,
  durationMs: number,
  timeZone: string
): { start: DateTime; end: DateTime; slotIndex: number } | null {
  for (let i = 0; i < freeSlots.length; i++) {
    const slot = freeSlots[i];
    const start = Math.max(slot.start, windowStartMs);
    const end = Math.min(slot.end, windowEndMs);

    if (end - start >= durationMs) {
      const blockStart = start;
      const blockEnd = start + durationMs;
      return {
        start: DateTime.fromMillis(blockStart, { zone: timeZone }),
        end: DateTime.fromMillis(blockEnd, { zone: timeZone }),
        slotIndex: i,
      };
    }
  }

  return null;
}

function consumeSlot(slots: TimeInterval[], slotIndex: number, blockStart: number, blockEnd: number): TimeInterval[] {
  const slot = slots[slotIndex];
  const updated: TimeInterval[] = [];

  if (blockStart > slot.start) {
    updated.push({ start: slot.start, end: blockStart });
  }

  if (blockEnd < slot.end) {
    updated.push({ start: blockEnd, end: slot.end });
  }

  return [...slots.slice(0, slotIndex), ...updated, ...slots.slice(slotIndex + 1)];
}
