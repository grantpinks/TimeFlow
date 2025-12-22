import type { CalendarEvent } from '@timeflow/shared';

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
 * - TimeFlow-created events are movable (have `[TimeFlow]` prefix)
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
  if (summary.startsWith('[TimeFlow]')) {
    return {
      isFixed: false,
      reason: 'TimeFlow-created task',
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
