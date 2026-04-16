import type { CalendarEvent } from '@timeflow/shared';
import { isTimeflowEvent } from './timeflowEventPrefix.js';

/**
 * Classification result for a calendar event
 */
export interface EventClassification {
  isFixed: boolean;
  reason?: string;
}

/**
 * Separated events by fixed vs movable status
 */
export interface SeparatedEvents {
  fixed: CalendarEvent[];
  movable: CalendarEvent[];
}

/**
 * Classify a calendar event as fixed (immovable) or movable
 *
 * Uses heuristic-based rules to determine if an event can be rescheduled:
 * - TimeFlow-created events are movable (TimeFlow marker or prefix)
 * - Events with multiple attendees are fixed (meetings with others)
 * - Events with fixed keywords (class, lecture, appointment) are fixed
 * - Default: movable (conservative)
 *
 * Sprint 13.7: This enables the AI to respect fixed commitments and avoid suggesting
 * scheduling conflicts with immovable events like classes or appointments.
 *
 * @param event - Calendar event to classify
 * @returns Classification result with isFixed flag and optional reason
 */
export function classifyEvent(event: CalendarEvent): EventClassification {
  const summary = event.summary || '';
  const summaryLower = summary.toLowerCase();

  // If event already has isFixed metadata, use it
  if (event.isFixed !== undefined) {
    return {
      isFixed: event.isFixed,
      reason: event.isFixed ? 'Manually marked as fixed' : 'Manually marked as movable',
    };
  }

  // Rule 1: TimeFlow-created events are movable
  if (isTimeflowEvent(event)) {
    return {
      isFixed: false,
      reason: 'TimeFlow-managed event',
    };
  }

  // Rule 2: Events with multiple attendees are fixed (meetings with others)
  if (event.attendees && event.attendees.length > 1) {
    return {
      isFixed: true,
      reason: 'Meeting with attendees',
    };
  }

  // Rule 3: Keyword-based detection for fixed events
  const fixedKeywords = [
    'class',
    'lecture',
    'appointment',
    'interview',
    'flight',
    'meeting',
    'conference',
    'seminar',
    'workshop',
    'doctor',
    'dentist',
    'exam',
    'test',
  ];

  for (const keyword of fixedKeywords) {
    if (summaryLower.includes(keyword)) {
      return {
        isFixed: true,
        reason: `Contains keyword: "${keyword}"`,
      };
    }
  }

  // Default: movable (conservative - prefer marking as movable unless clear signs of fixed)
  return {
    isFixed: false,
    reason: 'Default classification',
  };
}

/**
 * Separate calendar events into fixed (immovable) and movable arrays
 *
 * This is used to:
 * 1. Show fixed events separately in AI context prompts
 * 2. Validate that scheduled blocks don't overlap with fixed events
 * 3. Help AI understand which events it can suggest rescheduling
 *
 * @param events - Array of calendar events to classify
 * @returns Separated arrays of fixed and movable events
 */
export function separateFixedAndMovable(events: CalendarEvent[]): SeparatedEvents {
  const fixed: CalendarEvent[] = [];
  const movable: CalendarEvent[] = [];

  for (const event of events) {
    const classification = classifyEvent(event);

    if (classification.isFixed) {
      // Optionally add the classification reason to the event for debugging
      fixed.push({
        ...event,
        isFixed: true,
      });
    } else {
      movable.push({
        ...event,
        isFixed: false,
      });
    }
  }

  return { fixed, movable };
}

/**
 * Format an event's time range for display
 * Helper function for building context prompts
 *
 * @param event - Calendar event
 * @param timezone - User's timezone (e.g., 'America/Chicago')
 * @returns Formatted string like "Dec 21, 2:00 PM - 3:00 PM"
 */
export function formatEventTimeRange(event: CalendarEvent, timezone: string = 'UTC'): string {
  const startDate = new Date(event.start);
  const endDate = new Date(event.end);

  const dateOptions: Intl.DateTimeFormatOptions = {
    timeZone: timezone,
    month: 'short',
    day: 'numeric',
  };

  const timeOptions: Intl.DateTimeFormatOptions = {
    timeZone: timezone,
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  };

  const dateStr = startDate.toLocaleDateString('en-US', dateOptions);
  const startTime = startDate.toLocaleTimeString('en-US', timeOptions);
  const endTime = endDate.toLocaleTimeString('en-US', timeOptions);

  return `${dateStr}, ${startTime} - ${endTime}`;
}

/**
 * Build a context string for fixed events to include in AI prompt
 *
 * This creates a clear section in the prompt showing which events are immovable.
 * The AI uses this to avoid scheduling conflicts.
 *
 * @param fixedEvents - Array of fixed calendar events
 * @param timezone - User's timezone
 * @returns Formatted string for prompt inclusion
 */
export function buildFixedEventsContext(
  fixedEvents: CalendarEvent[],
  timezone: string = 'UTC'
): string {
  if (fixedEvents.length === 0) {
    return '**FIXED Events (CANNOT move)**: None\n';
  }

  let context = '**FIXED Events (CANNOT move)**:\n';
  context += 'These are immovable commitments (classes, appointments, meetings). Work AROUND them.\n\n';

  for (const event of fixedEvents) {
    const timeRange = formatEventTimeRange(event, timezone);
    const classification = classifyEvent(event);
    context += `- ${timeRange}: ${event.summary} [FIXED: ${classification.reason}]\n`;
  }

  return context;
}

/**
 * Build a context string for movable events to include in AI prompt
 *
 * @param movableEvents - Array of movable calendar events
 * @param timezone - User's timezone
 * @returns Formatted string for prompt inclusion
 */
export function buildMovableEventsContext(
  movableEvents: CalendarEvent[],
  timezone: string = 'UTC'
): string {
  if (movableEvents.length === 0) {
    return '**MOVABLE Events**: None\n';
  }

  let context = '**MOVABLE Events** (can be rescheduled if needed):\n';

  for (const event of movableEvents) {
    const timeRange = formatEventTimeRange(event, timezone);
    context += `- ${timeRange}: ${event.summary}\n`;
  }

  return context;
}

/**
 * Build a context string that explicitly lists FREE scheduling windows for a given day.
 *
 * A3 fix: The LLM was returning 0 blocks when a fixed event existed later in the
 * day, even though ample free time preceded it. Explicitly surfacing the free
 * windows prevents this reasoning error.
 *
 * @param fixedEvents - All fixed events for the window
 * @param wakeTime - "HH:mm" user wake time
 * @param sleepTime - "HH:mm" user sleep time
 * @param timezone - IANA timezone string
 * @param windowStart - ISO string for start of the scheduling window (default: now)
 * @param windowEnd - ISO string for end of scheduling window (default: 7 days from now)
 * @returns Formatted context string showing free windows per day
 */
export function buildAvailableWindowsContext(
  fixedEvents: CalendarEvent[],
  wakeTime: string,
  sleepTime: string,
  timezone: string,
  windowStart?: string,
  windowEnd?: string
): string {
  const now = windowStart ? new Date(windowStart) : new Date();
  const end = windowEnd ? new Date(windowEnd) : new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

  // Parse HH:mm times
  const [wakeHour, wakeMin] = wakeTime.split(':').map(Number);
  const [sleepHour, sleepMin] = sleepTime.split(':').map(Number);

  // Collect unique days in the window (in user's timezone)
  const days: string[] = [];
  const dayMs = 24 * 60 * 60 * 1000;
  const nowLocal = new Date(now.toLocaleString('en-US', { timeZone: timezone }));
  const endLocal = new Date(end.toLocaleString('en-US', { timeZone: timezone }));

  // Walk day-by-day
  let cursor = new Date(nowLocal);
  cursor.setHours(0, 0, 0, 0);
  const endDay = new Date(endLocal);
  endDay.setHours(0, 0, 0, 0);

  while (cursor <= endDay) {
    days.push(cursor.toLocaleDateString('en-US', {
      timeZone: timezone,
      weekday: 'long',
      month: 'short',
      day: 'numeric',
    }));
    cursor = new Date(cursor.getTime() + dayMs);
  }

  // For each day, compute available windows around fixed events
  const lines: string[] = [];
  lines.push('**Available Scheduling Windows** (you MUST schedule tasks in these windows):');
  lines.push('A fixed event does NOT block the whole day — only its exact time slot.');
  lines.push('');

  // Group fixed events by local date
  const fixedByDate = new Map<string, { start: Date; end: Date; summary: string }[]>();
  for (const event of fixedEvents) {
    const localDate = new Date(event.start).toLocaleDateString('en-US', {
      timeZone: timezone,
      weekday: 'long',
      month: 'short',
      day: 'numeric',
    });
    if (!fixedByDate.has(localDate)) fixedByDate.set(localDate, []);
    fixedByDate.get(localDate)!.push({
      start: new Date(event.start),
      end: new Date(event.end),
      summary: event.summary || 'event',
    });
  }

  for (const day of days) {
    const fixed = (fixedByDate.get(day) || []).sort(
      (a, b) => a.start.getTime() - b.start.getTime()
    );

    // Build windows: wake → first fixed, gaps between fixed events, last fixed → sleep
    type Window = { from: string; to: string };
    const windows: Window[] = [];

    const fmtLocalTime = (d: Date): string =>
      d.toLocaleTimeString('en-US', { timeZone: timezone, hour: 'numeric', minute: '2-digit', hour12: true });

    // Determine today's actual wake start (use current time if it's today and after wake)
    const dayLabel = day;
    const isToday = days.indexOf(dayLabel) === 0;
    let dayWakeMs = wakeHour * 60 + wakeMin; // minutes since midnight

    let cursorMinutes = dayWakeMs;
    const sleepMinutes = sleepHour * 60 + sleepMin;

    for (const f of fixed) {
      const localFixed = new Date(f.start.toLocaleString('en-US', { timeZone: timezone }));
      const localFixedEnd = new Date(f.end.toLocaleString('en-US', { timeZone: timezone }));
      const fixedStartMin = localFixed.getHours() * 60 + localFixed.getMinutes();
      const fixedEndMin = localFixedEnd.getHours() * 60 + localFixedEnd.getMinutes();

      if (fixedStartMin > cursorMinutes) {
        // Free window from cursorMinutes to fixedStartMin
        const fromH = Math.floor(cursorMinutes / 60);
        const fromM = cursorMinutes % 60;
        const toH = Math.floor(fixedStartMin / 60);
        const toM = fixedStartMin % 60;
        const durationMin = fixedStartMin - cursorMinutes;
        if (durationMin >= 15) {
          windows.push({
            from: `${fromH > 12 ? fromH - 12 : fromH || 12}:${String(fromM).padStart(2, '0')} ${fromH >= 12 ? 'PM' : 'AM'}`,
            to: `${toH > 12 ? toH - 12 : toH || 12}:${String(toM).padStart(2, '0')} ${toH >= 12 ? 'PM' : 'AM'}`,
          });
        }
      }
      cursorMinutes = Math.max(cursorMinutes, fixedEndMin);
    }

    // Final window: last fixed end → sleep
    if (sleepMinutes > cursorMinutes) {
      const fromH = Math.floor(cursorMinutes / 60);
      const fromM = cursorMinutes % 60;
      const toH = Math.floor(sleepMinutes / 60);
      const toM = sleepMinutes % 60;
      const durationMin = sleepMinutes - cursorMinutes;
      if (durationMin >= 15) {
        windows.push({
          from: `${fromH > 12 ? fromH - 12 : fromH || 12}:${String(fromM).padStart(2, '0')} ${fromH >= 12 ? 'PM' : 'AM'}`,
          to: `${toH > 12 ? toH - 12 : toH || 12}:${String(toM).padStart(2, '0')} ${toH >= 12 ? 'PM' : 'AM'}`,
        });
      }
    }

    if (windows.length > 0) {
      lines.push(`**${day}**: FREE windows → ${windows.map(w => `${w.from}–${w.to}`).join(', ')}`);
    } else {
      lines.push(`**${day}**: No free windows (all time is blocked by fixed events or wake/sleep)`);
    }
  }

  lines.push('');
  lines.push('CRITICAL: If a task fits in ANY of the windows above, you MUST schedule it there. Do NOT return 0 blocks when free windows exist.');

  return lines.join('\n') + '\n';
}
