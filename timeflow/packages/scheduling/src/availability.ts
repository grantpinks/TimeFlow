import { DateTime } from 'luxon';
import type { CalendarEvent, DailyScheduleConfig, TimeInterval, UserPreferences } from './types.js';

/**
 * Convert existing calendar events to busy intervals.
 */
export function buildBusyIntervals(events: CalendarEvent[], timeZone: string): TimeInterval[] {
  return events
    .map((event) => {
      const start = DateTime.fromISO(event.start, { zone: timeZone });
      const end = DateTime.fromISO(event.end, { zone: timeZone });

      if (!start.isValid || !end.isValid) {
        return null;
      }

      return {
        start: start.toMillis(),
        end: end.toMillis(),
      };
    })
    .filter((interval): interval is TimeInterval => interval !== null)
    .sort((a, b) => a.start - b.start);
}

/**
 * Build free time slots for each day in the range.
 * Each day has a working window from wakeTime to sleepTime.
 * If dailySchedule is provided, uses day-specific times; otherwise uses default wake/sleepTime.
 */
export function buildFreeSlots(
  rangeStart: DateTime,
  rangeEnd: DateTime,
  preferences: UserPreferences
): TimeInterval[] {
  const slots: TimeInterval[] = [];
  const { wakeTime: defaultWakeTime, sleepTime: defaultSleepTime, dailySchedule } = preferences;

  // Day name mapping
  const dayNames: { [key: number]: keyof DailyScheduleConfig } = {
    1: 'monday',
    2: 'tuesday',
    3: 'wednesday',
    4: 'thursday',
    5: 'friday',
    6: 'saturday',
    7: 'sunday',
  };

  // Iterate through each day
  let currentDay = rangeStart.startOf('day');
  const endDay = rangeEnd.endOf('day');

  while (currentDay <= endDay) {
    // Get day-specific wake/sleep times if available
    const dayOfWeek = currentDay.weekday; // 1=Monday, 7=Sunday
    const dayName = dayNames[dayOfWeek];
    const daySchedule = dailySchedule?.[dayName];

    const wakeTime = daySchedule?.wakeTime || defaultWakeTime;
    const sleepTime = daySchedule?.sleepTime || defaultSleepTime;

    const [wakeHour, wakeMin] = wakeTime.split(':').map(Number);
    const [sleepHour, sleepMin] = sleepTime.split(':').map(Number);

    const dayStart = currentDay.set({ hour: wakeHour, minute: wakeMin, second: 0, millisecond: 0 });
    const dayEnd = currentDay.set({ hour: sleepHour, minute: sleepMin, second: 0, millisecond: 0 });

    // Handle case where sleep time is after midnight (not supported in MVP)
    // For now, assume wake < sleep on same day

    if (dayEnd > dayStart) {
      // Clip to range boundaries
      const slotStart = DateTime.max(dayStart, rangeStart);
      const slotEnd = DateTime.min(dayEnd, rangeEnd);

      if (slotEnd > slotStart) {
        slots.push({
          start: slotStart.toMillis(),
          end: slotEnd.toMillis(),
        });
      }
    }

    currentDay = currentDay.plus({ days: 1 });
  }

  return slots;
}

/**
 * Subtract busy intervals from free slots.
 * Returns a new array of free slots with busy times removed.
 */
export function subtractIntervals(freeSlots: TimeInterval[], busyIntervals: TimeInterval[]): TimeInterval[] {
  let result = [...freeSlots];

  for (const busy of busyIntervals) {
    const newResult: TimeInterval[] = [];

    for (const free of result) {
      // No overlap - busy is completely before or after free
      if (busy.end <= free.start || busy.start >= free.end) {
        newResult.push(free);
        continue;
      }

      // Busy overlaps with free - need to split/trim

      // Part before busy
      if (busy.start > free.start) {
        newResult.push({ start: free.start, end: busy.start });
      }

      // Part after busy
      if (busy.end < free.end) {
        newResult.push({ start: busy.end, end: free.end });
      }

      // If busy completely covers free, nothing is added
    }

    result = newResult;
  }

  // Sort by start time
  return result.sort((a, b) => a.start - b.start);
}
