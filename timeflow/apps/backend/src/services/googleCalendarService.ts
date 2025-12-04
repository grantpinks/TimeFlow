/**
 * Google Calendar Service
 *
 * Handles interaction with Google Calendar API for reading/writing events.
 */

import { google, calendar_v3 } from 'googleapis';
import { prisma } from '../config/prisma.js';
import { getUserOAuth2Client } from '../config/google.js';
import { decrypt, encrypt } from '../utils/crypto.js';

export interface CalendarEvent {
  id?: string;
  summary: string;
  start: string; // ISO datetime
  end: string; // ISO datetime
  description?: string;
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

  const response = await calendar.events.list({
    calendarId: calendarId || 'primary',
    timeMin,
    timeMax,
    singleEvents: true,
    orderBy: 'startTime',
  });

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
 */
export async function createEvent(
  userId: string,
  calendarId: string,
  event: {
    summary: string;
    description?: string;
    start: string;
    end: string;
  }
): Promise<string> {
  const calendar = await getCalendarClient(userId);

  const response = await calendar.events.insert({
    calendarId: calendarId || 'primary',
    requestBody: {
      summary: event.summary,
      description: event.description,
      start: { dateTime: event.start },
      end: { dateTime: event.end },
    },
  });

  if (!response.data.id) {
    throw new Error('Failed to create calendar event');
  }

  return response.data.id;
}

/**
 * Update an existing event in the user's calendar.
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
  }
): Promise<void> {
  const calendar = await getCalendarClient(userId);

  await calendar.events.patch({
    calendarId: calendarId || 'primary',
    eventId,
    requestBody: {
      summary: event.summary,
      description: event.description,
      start: event.start ? { dateTime: event.start } : undefined,
      end: event.end ? { dateTime: event.end } : undefined,
    },
  });
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

  await calendar.events.delete({
    calendarId: calendarId || 'primary',
    eventId,
  });
}

/**
 * List the user's calendars.
 */
export async function listCalendars(userId: string) {
  const calendar = await getCalendarClient(userId);

  const response = await calendar.calendarList.list();

  return (response.data.items || []).map((cal) => ({
    id: cal.id,
    summary: cal.summary,
    primary: cal.primary || false,
  }));
}

