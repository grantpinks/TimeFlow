import { fromJSDate } from './luxonHelpers.js';

interface ICSEventData {
  summary: string;
  description?: string;
  location?: string;
  startDateTime: Date;
  endDateTime: Date;
  organizerEmail: string;
  organizerName?: string;
  attendeeEmail: string;
  attendeeName: string;
}

/**
 * Generate ICS (iCalendar) file content for a meeting
 * Compatible with Google Calendar, Apple Calendar, Outlook
 */
export function generateICS(event: ICSEventData): string {
  const formatDate = (date: Date): string => {
    // Format as YYYYMMDDTHHMMSSZ (UTC)
    return fromJSDate(date).toUTC().toFormat("yyyyMMdd'T'HHmmss'Z'");
  };

  const now = formatDate(new Date());
  const dtStart = formatDate(event.startDateTime);
  const dtEnd = formatDate(event.endDateTime);

  // Generate unique ID
  const uid = `${Date.now()}-${Math.random().toString(36).substring(7)}@timeflow.app`;

  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//TimeFlow//Meeting Scheduler//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:REQUEST',
    'BEGIN:VEVENT',
    `UID:${uid}`,
    `DTSTAMP:${now}`,
    `DTSTART:${dtStart}`,
    `DTEND:${dtEnd}`,
    `SUMMARY:${event.summary}`,
  ];

  if (event.description) {
    // Escape special characters and wrap long lines
    const desc = event.description.replace(/\n/g, '\\n').replace(/,/g, '\\,');
    lines.push(`DESCRIPTION:${desc}`);
  }

  if (event.location) {
    lines.push(`LOCATION:${event.location}`);
  }

  lines.push(
    `ORGANIZER;CN=${event.organizerName || event.organizerEmail}:mailto:${event.organizerEmail}`,
    `ATTENDEE;CN=${event.attendeeName};RSVP=TRUE:mailto:${event.attendeeEmail}`,
    'STATUS:CONFIRMED',
    'SEQUENCE:0',
    'END:VEVENT',
    'END:VCALENDAR'
  );

  return lines.join('\r\n');
}
