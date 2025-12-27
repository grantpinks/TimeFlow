/**
 * Google Calendar Service
 *
 * Handles interaction with Google Calendar API for reading/writing events.
 * Includes retry logic, conflict detection, and comprehensive error handling.
 */

import { google, calendar_v3 } from 'googleapis';
import { prisma } from '../config/prisma.js';
import { getUserOAuth2Client } from '../config/google.js';
import { decrypt, encrypt } from '../utils/crypto.js';

const MAX_RETRIES = 3;
const INITIAL_RETRY_DELAY_MS = 1000; // 1 second

export interface CalendarEvent {
  id?: string;
  summary: string;
  start: string; // ISO datetime
  end: string; // ISO datetime
  description?: string;
  attendees?: { email: string }[];
}

/**
 * Build Google Calendar event request body
 */
export function buildGoogleEventRequest(event: {
  summary: string;
  description?: string;
  start: string;
  end: string;
  attendees?: { email: string }[];
  enableMeet?: boolean;
}): calendar_v3.Schema$Event {
  const requestBody: calendar_v3.Schema$Event = {
    summary: event.summary,
    description: event.description,
    start: { dateTime: event.start },
    end: { dateTime: event.end },
  };

  // Add attendees if provided
  if (event.attendees && event.attendees.length > 0) {
    requestBody.attendees = event.attendees.map((a) => ({ email: a.email }));
  }

  // Add Google Meet conference data if enabled
  if (event.enableMeet) {
    requestBody.conferenceData = {
      createRequest: {
        requestId: `meet-${Date.now()}`,
        conferenceSolutionKey: { type: 'hangoutsMeet' },
      },
    };
  }

  return requestBody;
}

/**
 * Retry wrapper with exponential backoff for Google Calendar API calls.
 * Handles transient errors (429, 500, 503) and retries up to MAX_RETRIES times.
 */
async function withRetry<T>(
  operation: () => Promise<T>,
  operationName: string,
  attempt = 1
): Promise<T> {
  try {
    return await operation();
  } catch (error: any) {
    const isRetryableError =
      error.code === 429 || // Rate limit
      error.code === 500 || // Internal server error
      error.code === 503 || // Service unavailable
      error.message?.includes('ECONNRESET') ||
      error.message?.includes('ETIMEDOUT');

    if (isRetryableError && attempt < MAX_RETRIES) {
      const delayMs = INITIAL_RETRY_DELAY_MS * Math.pow(2, attempt - 1);
      console.warn(
        `[GoogleCalendar] ${operationName} failed (attempt ${attempt}/${MAX_RETRIES}), retrying in ${delayMs}ms...`,
        { error: error.message, code: error.code }
      );
      await new Promise((resolve) => setTimeout(resolve, delayMs));
      return withRetry(operation, operationName, attempt + 1);
    }

    console.error(`[GoogleCalendar] ${operationName} failed after ${attempt} attempt(s)`, {
      error: error.message,
      code: error.code,
      stack: error.stack,
    });
    throw error;
  }
}

/**
 * Check if a time range conflicts with existing events.
 * Returns true if there's an overlap.
 */
function hasTimeConflict(
  newStart: string,
  newEnd: string,
  existingEvents: CalendarEvent[],
  excludeEventId?: string
): boolean {
  const newStartTime = new Date(newStart).getTime();
  const newEndTime = new Date(newEnd).getTime();

  return existingEvents.some((event) => {
    // Skip if checking against the same event (for updates)
    if (excludeEventId && event.id === excludeEventId) {
      return false;
    }

    const eventStartTime = new Date(event.start).getTime();
    const eventEndTime = new Date(event.end).getTime();

    // Check for overlap: (newStart < eventEnd) AND (newEnd > eventStart)
    return newStartTime < eventEndTime && newEndTime > eventStartTime;
  });
}

/**
 * Get an authenticated Google Calendar API client for a user.
 * Refreshes tokens if needed.
 */
async function getCalendarClient(userId: string): Promise<calendar_v3.Calendar> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
  });

  if (!user || !user.googleAccessToken) {
    throw new Error('User not authenticated with Google');
  }

  const oauth2Client = getUserOAuth2Client(
    user.googleAccessToken,
    decrypt(user.googleRefreshToken),
    user.googleAccessTokenExpiry?.getTime()
  );

  // Handle token refresh
  oauth2Client.on('tokens', async (tokens) => {
    await prisma.user.update({
      where: { id: userId },
      data: {
        googleAccessToken: tokens.access_token ?? user.googleAccessToken,
        googleRefreshToken: encrypt(tokens.refresh_token) ?? user.googleRefreshToken,
        googleAccessTokenExpiry: tokens.expiry_date
          ? new Date(tokens.expiry_date)
          : user.googleAccessTokenExpiry,
      },
    });
  });

  return google.calendar({ version: 'v3', auth: oauth2Client });
}

/**
 * Fetch events from the user's calendar within a date range.
 */
export async function getEvents(
  userId: string,
  calendarId: string,
  timeMin: string,
  timeMax: string
): Promise<CalendarEvent[]> {
  const calendar = await getCalendarClient(userId);

  const response = await withRetry(
    () =>
      calendar.events.list({
        calendarId: calendarId || 'primary',
        timeMin,
        timeMax,
        singleEvents: true,
        orderBy: 'startTime',
      }),
    `getEvents(${calendarId}, ${timeMin} - ${timeMax})`
  );

  const events = response.data.items || [];

  return events
    .filter((event) => event.start?.dateTime && event.end?.dateTime)
    .map((event) => ({
      id: event.id ?? undefined,
      summary: event.summary || '(No title)',
      start: event.start!.dateTime!,
      end: event.end!.dateTime!,
      description: event.description ?? undefined,
    }));
}

/**
 * Create a new event in the user's calendar.
 * Checks for conflicts before creating.
 */
export async function createEvent(
  userId: string,
  calendarId: string,
  event: {
    summary: string;
    description?: string;
    start: string;
    end: string;
    attendees?: { email: string }[];
  },
  enableMeet = false,
  skipConflictCheck = false
): Promise<string> {
  const calendar = await getCalendarClient(userId);

  // Conflict detection: Check for overlapping events
  if (!skipConflictCheck) {
    try {
      const existingEvents = await getEvents(
        userId,
        calendarId,
        event.start,
        event.end
      );

      if (hasTimeConflict(event.start, event.end, existingEvents)) {
        console.warn(
          `[GoogleCalendar] Conflict detected when creating event "${event.summary}" (${event.start} - ${event.end})`
        );
        // Note: We still create the event but log the warning
        // Production systems might want to throw an error or notify the user
      }
    } catch (err) {
      console.warn(
        '[GoogleCalendar] Failed to check for conflicts before creating event',
        err
      );
      // Continue with event creation even if conflict check fails
    }
  }

  const requestBody = buildGoogleEventRequest({
    summary: event.summary,
    description: event.description,
    start: event.start,
    end: event.end,
    attendees: event.attendees,
    enableMeet,
  });

  const response = await withRetry(
    () =>
      calendar.events.insert({
        calendarId: calendarId || 'primary',
        requestBody,
        conferenceDataVersion: enableMeet ? 1 : undefined,
      }),
    `createEvent("${event.summary}", ${event.start} - ${event.end})`
  );

  if (!response.data.id) {
    throw new Error('Failed to create calendar event');
  }

  console.log(
    `[GoogleCalendar] Created event "${event.summary}" with ID ${response.data.id}`
  );

  return response.data.id;
}

/**
 * Update an existing event in the user's calendar.
 * Checks for conflicts before updating if time changes.
 */
export async function updateEvent(
  userId: string,
  calendarId: string,
  eventId: string,
  event: {
    summary?: string;
    description?: string;
    start?: string;
    end?: string;
  },
  skipConflictCheck = false
): Promise<void> {
  const calendar = await getCalendarClient(userId);

  // Conflict detection: Check for overlapping events if time is being changed
  if (!skipConflictCheck && event.start && event.end) {
    try {
      const existingEvents = await getEvents(
        userId,
        calendarId,
        event.start,
        event.end
      );

      if (hasTimeConflict(event.start, event.end, existingEvents, eventId)) {
        console.warn(
          `[GoogleCalendar] Conflict detected when updating event ${eventId} to ${event.start} - ${event.end}`
        );
        // Note: We still update the event but log the warning
      }
    } catch (err) {
      console.warn(
        '[GoogleCalendar] Failed to check for conflicts before updating event',
        err
      );
      // Continue with event update even if conflict check fails
    }
  }

  await withRetry(
    () =>
      calendar.events.patch({
        calendarId: calendarId || 'primary',
        eventId,
        requestBody: {
          summary: event.summary,
          description: event.description,
          start: event.start ? { dateTime: event.start } : undefined,
          end: event.end ? { dateTime: event.end } : undefined,
        },
      }),
    `updateEvent(${eventId}, ${event.start || 'no time change'} - ${event.end || 'no time change'})`
  );

  console.log(`[GoogleCalendar] Updated event ${eventId}`);
}

/**
 * Delete an event from the user's calendar.
 */
export async function deleteEvent(
  userId: string,
  calendarId: string,
  eventId: string
): Promise<void> {
  const calendar = await getCalendarClient(userId);

  await withRetry(
    () =>
      calendar.events.delete({
        calendarId: calendarId || 'primary',
        eventId,
      }),
    `deleteEvent(${eventId})`
  );

  console.log(`[GoogleCalendar] Deleted event ${eventId}`);
}

/**
 * List the user's calendars.
 */
export async function listCalendars(userId: string) {
  const calendar = await getCalendarClient(userId);

  const response = await withRetry(
    () => calendar.calendarList.list(),
    'listCalendars'
  );

  return (response.data.items || []).map((cal) => ({
    id: cal.id,
    summary: cal.summary,
    primary: cal.primary || false,
  }));
}

