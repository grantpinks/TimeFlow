/**
 * Scheduling Engine
 *
 * This module contains the core scheduling algorithm that places tasks
 * into available time slots while respecting user preferences and
 * existing calendar events.
 *
 * Algorithm overview:
 * 1. Normalize all times to user's timezone
 * 2. Build daily working windows (wake to sleep)
 * 3. Subtract busy intervals (existing events) to get free slots
 * 4. Sort tasks by due date ASC, then priority ASC (1=high first)
 * 5. For each task, find earliest slot that fits
 * 6. Mark overflowedDeadline if scheduled after due date
 */

import { DateTime, Interval } from 'luxon';
import type {
  TaskInput,
  CalendarEvent,
  UserPreferences,
  ScheduledBlock,
  TimeInterval,
} from './types.js';

/**
 * Main scheduling function.
 *
 * @param tasks - Array of tasks to schedule
 * @param existingEvents - Array of existing calendar events (busy time)
 * @param preferences - User's scheduling preferences
 * @param dateRangeStart - Start of scheduling window (ISO string)
 * @param dateRangeEnd - End of scheduling window (ISO string)
 * @returns Array of scheduled blocks
 */
export function scheduleTasks(
  tasks: TaskInput[],
  existingEvents: CalendarEvent[],
  preferences: UserPreferences,
  dateRangeStart: string,
  dateRangeEnd: string
): ScheduledBlock[] {
  const { timeZone, wakeTime, sleepTime } = preferences;

  // Parse date range boundaries
  const rangeStart = DateTime.fromISO(dateRangeStart, { zone: timeZone });
  const rangeEnd = DateTime.fromISO(dateRangeEnd, { zone: timeZone });

  if (!rangeStart.isValid || !rangeEnd.isValid) {
    throw new Error('Invalid date range');
  }

  // Build list of busy intervals from existing events
  const busyIntervals = buildBusyIntervals(existingEvents, timeZone);

  // Build free slots for each day in the range
  let freeSlots = buildFreeSlots(rangeStart, rangeEnd, wakeTime, sleepTime, timeZone);

  // Subtract busy intervals from free slots
  freeSlots = subtractIntervals(freeSlots, busyIntervals);

  // Sort tasks: due date ASC (nulls last), then priority ASC (1 first)
  const sortedTasks = [...tasks].sort((a, b) => {
    // Handle missing due dates
    if (!a.dueDate && !b.dueDate) return a.priority - b.priority;
    if (!a.dueDate) return 1; // a goes last
    if (!b.dueDate) return -1; // b goes last

    const dateA = DateTime.fromISO(a.dueDate, { zone: timeZone });
    const dateB = DateTime.fromISO(b.dueDate, { zone: timeZone });

    if (dateA < dateB) return -1;
    if (dateA > dateB) return 1;
    return a.priority - b.priority;
  });

  const scheduledBlocks: ScheduledBlock[] = [];

  for (const task of sortedTasks) {
    const durationMs = task.durationMinutes * 60 * 1000;
    const dueDateMs = task.dueDate
      ? DateTime.fromISO(task.dueDate, { zone: timeZone }).toMillis()
      : null;

    // Find the earliest slot that fits
    let scheduled = false;

    for (let i = 0; i < freeSlots.length; i++) {
      const slot = freeSlots[i];
      const slotDuration = slot.end - slot.start;

      if (slotDuration >= durationMs) {
        // Schedule at the start of this slot
        const blockStart = slot.start;
        const blockEnd = blockStart + durationMs;

        const block: ScheduledBlock = {
          taskId: task.id,
          start: DateTime.fromMillis(blockStart, { zone: timeZone }).toISO()!,
          end: DateTime.fromMillis(blockEnd, { zone: timeZone }).toISO()!,
        };

        // Check if we overflowed the deadline
        if (dueDateMs !== null && blockEnd > dueDateMs) {
          block.overflowedDeadline = true;
        }

        scheduledBlocks.push(block);

        // Update the free slot (consume the used portion)
        if (blockEnd < slot.end) {
          freeSlots[i] = { start: blockEnd, end: slot.end };
        } else {
          // Entire slot consumed
          freeSlots.splice(i, 1);
        }

        scheduled = true;
        break;
      }
    }

    if (!scheduled) {
      // No slot found within range - this shouldn't happen if range is large enough
      // For now, we skip the task (could add to a "could not schedule" list)
      console.warn(`Could not schedule task ${task.id} within the given range`);
    }
  }

  return scheduledBlocks;
}

/**
 * Convert existing calendar events to busy intervals.
 */
function buildBusyIntervals(
  events: CalendarEvent[],
  timeZone: string
): TimeInterval[] {
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
 */
function buildFreeSlots(
  rangeStart: DateTime,
  rangeEnd: DateTime,
  wakeTime: string,
  sleepTime: string,
  timeZone: string
): TimeInterval[] {
  const slots: TimeInterval[] = [];

  const [wakeHour, wakeMin] = wakeTime.split(':').map(Number);
  const [sleepHour, sleepMin] = sleepTime.split(':').map(Number);

  // Iterate through each day
  let currentDay = rangeStart.startOf('day');
  const endDay = rangeEnd.endOf('day');

  while (currentDay <= endDay) {
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
function subtractIntervals(
  freeSlots: TimeInterval[],
  busyIntervals: TimeInterval[]
): TimeInterval[] {
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

