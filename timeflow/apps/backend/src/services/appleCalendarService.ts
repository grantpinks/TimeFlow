import { XMLParser } from 'fast-xml-parser';
import { prisma } from '../config/prisma.js';
import crypto from 'crypto';

const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || 'default-key-change-me-in-production-32b';
const ALGORITHM = 'aes-256-cbc';

/**
 * Parse calendar-home-set URL from CalDAV PROPFIND response
 */
export function parseCalendarHomeUrl(xml: string): string | null {
  const parser = new XMLParser({
    ignoreAttributes: false,
    removeNSPrefix: true,
  });

  const result = parser.parse(xml);

  try {
    const response = result.multistatus?.response;
    const propstat = Array.isArray(response) ? response[0]?.propstat : response?.propstat;
    const prop = Array.isArray(propstat) ? propstat[0]?.prop : propstat?.prop;
    const calendarHomeSet = prop?.['calendar-home-set'];
    const href = calendarHomeSet?.href;

    return typeof href === 'string' ? href : null;
  } catch (error) {
    return null;
  }
}

/**
 * Parse calendars list from CalDAV PROPFIND response
 */
export function parseCalendarsList(xml: string): Array<{ displayName: string; url: string }> {
  const parser = new XMLParser({
    ignoreAttributes: false,
    removeNSPrefix: true,
  });

  const result = parser.parse(xml);
  const calendars: Array<{ displayName: string; url: string }> = [];

  try {
    const responses = result.multistatus?.response;
    const responseArray = Array.isArray(responses) ? responses : [responses];

    for (const response of responseArray) {
      if (!response) continue;

      const href = response.href;
      const propstat = Array.isArray(response.propstat) ? response.propstat[0] : response.propstat;
      const prop = propstat?.prop;

      if (prop?.resourcetype?.calendar && prop?.displayname) {
        calendars.push({
          displayName: prop.displayname,
          url: href,
        });
      }
    }
  } catch (error) {
    // Return empty array on parse error
  }

  return calendars;
}

/**
 * Encrypt app-specific password for storage
 */
function encryptPassword(password: string): string {
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv(ALGORITHM, Buffer.from(ENCRYPTION_KEY.slice(0, 32)), iv);
  let encrypted = cipher.update(password, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  return iv.toString('hex') + ':' + encrypted;
}

/**
 * Decrypt app-specific password
 */
export function decryptPassword(encrypted: string): string {
  const parts = encrypted.split(':');
  const iv = Buffer.from(parts[0], 'hex');
  const encryptedText = parts[1];
  const decipher = crypto.createDecipheriv(ALGORITHM, Buffer.from(ENCRYPTION_KEY.slice(0, 32)), iv);
  let decrypted = decipher.update(encryptedText, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  return decrypted;
}

/**
 * Discover CalDAV account and store credentials
 */
export async function discoverAccount(
  userId: string,
  email: string,
  appPassword: string
): Promise<{ principalUrl: string | null; calendarHomeUrl: string | null }> {
  const baseUrl = 'https://caldav.icloud.com';

  // In a full implementation, we would:
  // 1. Make PROPFIND request to discover principal URL
  // 2. Make another PROPFIND to discover calendar-home-set
  // 3. Store the account with encrypted password

  // For now, store with minimal discovery
  const encrypted = encryptPassword(appPassword);

  await prisma.appleCalendarAccount.upsert({
    where: { userId },
    create: {
      userId,
      email,
      appPasswordEncrypted: encrypted,
      baseUrl,
      principalUrl: null,
      calendarHomeUrl: null,
    },
    update: {
      email,
      appPasswordEncrypted: encrypted,
    },
  });

  return {
    principalUrl: null,
    calendarHomeUrl: null,
  };
}

/**
 * Get Apple CalDAV account for user
 */
export async function getAccount(userId: string) {
  return await prisma.appleCalendarAccount.findUnique({
    where: { userId },
  });
}

/**
 * Parse a single ICS event string
 */
export function parseIcsEvent(ics: string): {
  start: string;
  end: string;
  summary?: string;
  transparency?: 'opaque' | 'transparent';
} {
  const lines = ics.split('\n').map(l => l.trim());

  let dtstart = '';
  let dtend = '';
  let summary = '';
  let transp = 'OPAQUE';

  for (const line of lines) {
    if (line.startsWith('DTSTART:')) {
      dtstart = line.substring('DTSTART:'.length);
    } else if (line.startsWith('DTEND:')) {
      dtend = line.substring('DTEND:'.length);
    } else if (line.startsWith('SUMMARY:')) {
      summary = line.substring('SUMMARY:'.length);
    } else if (line.startsWith('TRANSP:')) {
      transp = line.substring('TRANSP:'.length);
    }
  }

  // Convert iCal datetime to ISO 8601
  const parseIcalDate = (icalDate: string): string => {
    // Format: 20260110T160000Z
    const year = icalDate.substring(0, 4);
    const month = icalDate.substring(4, 6);
    const day = icalDate.substring(6, 8);
    const hour = icalDate.substring(9, 11);
    const minute = icalDate.substring(11, 13);
    const second = icalDate.substring(13, 15);

    return `${year}-${month}-${day}T${hour}:${minute}:${second}.000Z`;
  };

  return {
    start: parseIcalDate(dtstart),
    end: parseIcalDate(dtend),
    summary,
    transparency: transp === 'TRANSPARENT' ? 'transparent' : 'opaque',
  };
}

/**
 * Parse multiple ICS events from CalDAV response
 */
export function parseIcsEvents(icsData: string): Array<{
  start: string;
  end: string;
  summary?: string;
  transparency?: 'opaque' | 'transparent';
}> {
  const events: Array<{
    start: string;
    end: string;
    summary?: string;
    transparency?: 'opaque' | 'transparent';
  }> = [];

  // Split by VEVENT blocks
  const eventBlocks = icsData.split('BEGIN:VEVENT');

  for (let i = 1; i < eventBlocks.length; i++) {
    const eventEnd = eventBlocks[i].indexOf('END:VEVENT');
    if (eventEnd !== -1) {
      const eventStr = 'BEGIN:VEVENT\n' + eventBlocks[i].substring(0, eventEnd + 'END:VEVENT'.length);
      try {
        events.push(parseIcsEvent(eventStr));
      } catch (error) {
        // Skip malformed events
      }
    }
  }

  return events;
}

/**
 * List calendars for user (stub for now)
 */
export async function listCalendars(userId: string): Promise<Array<{ displayName: string; url: string }>> {
  // In full implementation, make CalDAV PROPFIND request
  // For now, return empty array
  return [];
}

/**
 * Get events from Apple Calendar via CalDAV (stub for now)
 */
export async function getEvents(
  userId: string,
  calendarUrl: string,
  timeMin: string,
  timeMax: string
): Promise<Array<{
  start: string;
  end: string;
  summary?: string;
  transparency?: 'opaque' | 'transparent';
}>> {
  // In full implementation, make CalDAV REPORT request with time range
  // For now, return empty array
  return [];
}

/**
 * Create event in Apple Calendar via CalDAV (stub for now)
 */
export async function createEvent(
  userId: string,
  calendarUrl: string,
  event: {
    summary: string;
    start: string;
    end: string;
    description?: string;
    transparency?: 'opaque' | 'transparent';
  }
): Promise<string> {
  // In full implementation, PUT iCalendar data to CalDAV server
  // For now, return placeholder URL
  return `${calendarUrl}/event-${Date.now()}.ics`;
}

/**
 * Update event in Apple Calendar via CalDAV (stub for now)
 */
export async function updateEvent(
  userId: string,
  calendarUrl: string,
  eventUrl: string,
  event: {
    summary?: string;
    start?: string;
    end?: string;
    description?: string;
    transparency?: 'opaque' | 'transparent';
  }
): Promise<void> {
  // In full implementation, GET existing event, modify, PUT back
  // For now, no-op
}

/**
 * Cancel event in Apple Calendar via CalDAV (stub for now)
 */
export async function cancelEvent(
  userId: string,
  calendarUrl: string,
  eventUrl: string
): Promise<void> {
  // In full implementation, GET event, set STATUS:CANCELLED, PUT back
  // For now, no-op
}
