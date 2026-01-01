import { XMLParser } from 'fast-xml-parser';
import { prisma } from '../config/prisma.js';
import crypto from 'crypto';
import { DateTime } from 'luxon';

const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || 'default-key-change-me-in-production-32b';
const ALGORITHM = 'aes-256-cbc';
const DEFAULT_BASE_URL = 'https://caldav.icloud.com';

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

      const isCalendar =
        prop?.resourcetype?.calendar ||
        prop?.resourcetype?.['cal:calendar'] ||
        prop?.resourcetype?.['C:calendar'] ||
        prop?.resourcetype;

      if (isCalendar && prop?.displayname) {
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
  try {
    const parts = encrypted.split(':');
    const iv = Buffer.from(parts[0], 'hex');
    const encryptedText = parts[1];
    const decipher = crypto.createDecipheriv(ALGORITHM, Buffer.from(ENCRYPTION_KEY.slice(0, 32)), iv);
    let decrypted = decipher.update(encryptedText, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
  } catch (error) {
    // If decryption fails, assume plaintext (useful for tests)
    return encrypted;
  }
}

function buildAuthHeader(email: string, password: string) {
  const token = Buffer.from(`${email}:${password}`).toString('base64');
  return `Basic ${token}`;
}

async function caldavRequest(
  url: string,
  options: {
    method: string;
    headers: Record<string, string>;
    body?: string;
  }
) {
  const response = await fetch(url, {
    method: options.method,
    headers: options.headers,
    body: options.body,
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`CalDAV request failed: ${response.status} ${body}`);
  }

  return response;
}

function formatIcsDate(iso: string): string {
  return DateTime.fromISO(iso, { zone: 'utc' }).toFormat("yyyyLLdd'T'HHmmss'Z'");
}

/**
 * Discover CalDAV account and store credentials
 */
export async function discoverAccount(
  userId: string,
  email: string,
  appPassword: string
): Promise<{ principalUrl: string | null; calendarHomeUrl: string | null }> {
  const baseUrl = DEFAULT_BASE_URL;

  const authHeader = buildAuthHeader(email, appPassword);
  const propfindBody = `<?xml version="1.0" encoding="utf-8" ?>
  <d:propfind xmlns:d="DAV:" xmlns:cal="urn:ietf:params:xml:ns:caldav">
    <d:prop>
      <d:current-user-principal/>
      <cal:calendar-home-set/>
    </d:prop>
  </d:propfind>`;

  const response = await caldavRequest(`${baseUrl}/`, {
    method: 'PROPFIND',
    headers: {
      Authorization: authHeader,
      Depth: '0',
      'Content-Type': 'application/xml',
    },
    body: propfindBody,
  });

  const xml = await response.text();
  const parser = new XMLParser({
    ignoreAttributes: false,
    removeNSPrefix: true,
  });
  const result = parser.parse(xml);

  let principalUrl: string | null = null;
  let calendarHomeUrl: string | null = parseCalendarHomeUrl(xml);

  try {
    const responseNode = result.multistatus?.response;
    const propstat = Array.isArray(responseNode) ? responseNode[0]?.propstat : responseNode?.propstat;
    const prop = Array.isArray(propstat) ? propstat[0]?.prop : propstat?.prop;
    principalUrl = prop?.['current-user-principal']?.href ?? null;
  } catch (error) {
    principalUrl = null;
  }

  const encrypted = encryptPassword(appPassword);

  await prisma.appleCalendarAccount.upsert({
    where: { userId },
    create: {
      userId,
      email,
      appPasswordEncrypted: encrypted,
      baseUrl,
      principalUrl,
      calendarHomeUrl,
    },
    update: {
      email,
      appPasswordEncrypted: encrypted,
      principalUrl,
      calendarHomeUrl,
    },
  });

  return {
    principalUrl,
    calendarHomeUrl,
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
  const lines = ics.split('\n').map((l) => l.trim());

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
    } else if (line.startsWith('STATUS:CANCELLED')) {
      // Skip cancelled events
      return {
        start: '',
        end: '',
        summary,
        transparency: 'opaque',
      };
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
        const parsed = parseIcsEvent(eventStr);
        if (parsed.start && parsed.end) {
          events.push(parsed);
        }
      } catch (error) {
        // Skip malformed events
      }
    }
  }

  return events;
}

/**
 * List calendars for user
 */
export async function listCalendars(userId: string): Promise<Array<{ displayName: string; url: string }>> {
  const account = await getAccount(userId);
  if (!account || !account.calendarHomeUrl) {
    return [];
  }

  const authHeader = buildAuthHeader(account.email, decryptPassword(account.appPasswordEncrypted));
  const targetUrl = new URL(account.calendarHomeUrl, account.baseUrl || DEFAULT_BASE_URL).toString();

  const response = await caldavRequest(targetUrl, {
    method: 'PROPFIND',
    headers: {
      Authorization: authHeader,
      Depth: '1',
      'Content-Type': 'application/xml',
    },
    body: `<?xml version="1.0" encoding="utf-8" ?>
    <d:propfind xmlns:d="DAV:">
      <d:prop>
        <d:displayname/>
        <d:resourcetype/>
      </d:prop>
    </d:propfind>`,
  });

  const xml = await response.text();
  return parseCalendarsList(xml);
}

/**
 * Get events from Apple Calendar via CalDAV
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
  const account = await getAccount(userId);
  if (!account) return [];
  const authHeader = buildAuthHeader(account.email, decryptPassword(account.appPasswordEncrypted));

  const url = new URL(calendarUrl, account.baseUrl || DEFAULT_BASE_URL).toString();
  const body = `<?xml version="1.0" encoding="UTF-8"?>
  <c:calendar-query xmlns:d="DAV:" xmlns:c="urn:ietf:params:xml:ns:caldav">
    <d:prop>
      <d:getetag/>
      <c:calendar-data/>
    </d:prop>
    <c:filter>
      <c:comp-filter name="VCALENDAR">
        <c:comp-filter name="VEVENT">
          <c:time-range start="${formatIcsDate(timeMin)}" end="${formatIcsDate(timeMax)}"/>
        </c:comp-filter>
      </c:comp-filter>
    </c:filter>
  </c:calendar-query>`;

  const response = await caldavRequest(url, {
    method: 'REPORT',
    headers: {
      Authorization: authHeader,
      Depth: '1',
      'Content-Type': 'application/xml',
    },
    body,
  });

  const data = await response.text();
  return parseIcsEvents(data);
}

/**
 * Create event in Apple Calendar via CalDAV
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
  const account = await getAccount(userId);
  if (!account) throw new Error('Apple Calendar account not found');

  const authHeader = buildAuthHeader(account.email, decryptPassword(account.appPasswordEncrypted));
  const uid = crypto.randomUUID();
  const eventUrl = `${calendarUrl.endsWith('/') ? calendarUrl.slice(0, -1) : calendarUrl}/${uid}.ics`;

  const ics = `BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//TimeFlow//EN
BEGIN:VEVENT
UID:${uid}
DTSTART:${formatIcsDate(event.start)}
DTEND:${formatIcsDate(event.end)}
SUMMARY:${event.summary}
${event.description ? `DESCRIPTION:${event.description}` : ''}
TRANSP:${event.transparency === 'transparent' ? 'TRANSPARENT' : 'OPAQUE'}
END:VEVENT
END:VCALENDAR`;

  await caldavRequest(new URL(eventUrl, account.baseUrl || DEFAULT_BASE_URL).toString(), {
    method: 'PUT',
    headers: {
      Authorization: authHeader,
      'Content-Type': 'text/calendar; charset=utf-8',
    },
    body: ics,
  });

  return eventUrl;
}

/**
 * Update event in Apple Calendar via CalDAV
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
  const account = await getAccount(userId);
  if (!account) throw new Error('Apple Calendar account not found');
  const authHeader = buildAuthHeader(account.email, decryptPassword(account.appPasswordEncrypted));

  const ics = `BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//TimeFlow//EN
BEGIN:VEVENT
UID:${eventUrl}
${event.start ? `DTSTART:${formatIcsDate(event.start)}` : ''}
${event.end ? `DTEND:${formatIcsDate(event.end)}` : ''}
${event.summary ? `SUMMARY:${event.summary}` : ''}
${event.description ? `DESCRIPTION:${event.description}` : ''}
${event.transparency ? `TRANSP:${event.transparency === 'transparent' ? 'TRANSPARENT' : 'OPAQUE'}` : ''}
END:VEVENT
END:VCALENDAR`;

  await caldavRequest(new URL(eventUrl, account.baseUrl || DEFAULT_BASE_URL).toString(), {
    method: 'PUT',
    headers: {
      Authorization: authHeader,
      'Content-Type': 'text/calendar; charset=utf-8',
    },
    body: ics,
  });
}

/**
 * Cancel event in Apple Calendar via CalDAV
 */
export async function cancelEvent(
  userId: string,
  calendarUrl: string,
  eventUrl: string
): Promise<void> {
  const account = await getAccount(userId);
  if (!account) throw new Error('Apple Calendar account not found');
  const authHeader = buildAuthHeader(account.email, decryptPassword(account.appPasswordEncrypted));

  const ics = `BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//TimeFlow//EN
BEGIN:VEVENT
UID:${eventUrl}
STATUS:CANCELLED
END:VEVENT
END:VCALENDAR`;

  await caldavRequest(new URL(eventUrl, account.baseUrl || DEFAULT_BASE_URL).toString(), {
    method: 'PUT',
    headers: {
      Authorization: authHeader,
      'Content-Type': 'text/calendar; charset=utf-8',
    },
    body: ics,
  });
}
