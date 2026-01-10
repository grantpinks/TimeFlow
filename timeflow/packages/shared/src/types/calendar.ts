/**
 * Calendar-related DTOs
 *
 * These types represent calendar data as exposed via the API.
 */

/**
 * Source type for calendar events (task, habit, or external Google Calendar event)
 */
export type CalendarEventSource = 'task' | 'habit' | 'external';

/**
 * A calendar event as returned by the API.
 */
export interface CalendarEvent {
  id?: string;
  summary: string;
  description?: string;
  start: string; // ISO datetime
  end: string;   // ISO datetime
  attendees?: { email: string }[]; // For meeting detection (Sprint 13.7)
  isFixed?: boolean; // Optional metadata for fixed/movable classification (Sprint 13.7)
  transparency?: 'opaque' | 'transparent'; // For availability blocking (Sprint 15)
  // Completion tracking (Sprint 17)
  sourceType?: CalendarEventSource; // Identifies if this is a task, habit, or external event
  sourceId?: string; // Task ID or ScheduledHabit ID for completion tracking
  isCompleted?: boolean; // Completion status for tasks and habits
}

/**
 * A user's calendar (for listing available calendars).
 */
export interface Calendar {
  id: string;
  summary: string;
  primary: boolean;
}

/**
 * Request parameters for fetching calendar events.
 */
export interface GetEventsParams {
  from: string; // ISO datetime
  to: string;   // ISO datetime
}

