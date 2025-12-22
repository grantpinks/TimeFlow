/**
 * Calendar-related DTOs
 *
 * These types represent calendar data as exposed via the API.
 */

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

