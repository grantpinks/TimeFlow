import { XMLParser } from 'fast-xml-parser';
import { prisma } from '../config/prisma.js';
import crypto from 'crypto';
import { DateTime } from 'luxon';
import { ConnectedAccountProvider } from '@prisma/client';

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

function readDisplayName(prop: Record<string, unknown> | undefined): string | null {
  const raw = prop?.displayname ?? prop?.displayName;
  if (typeof raw === 'string') {
    const trimmed = raw.trim();
    return trimmed.length > 0 ? trimmed : null;
  }
  if (raw && typeof raw === 'object' && '#text' in raw) {
    const trimmed = String((raw as { '#text': string })['#text']).trim();
    return trimmed.length > 0 ? trimmed : null;
  }
  return null;
}

function isCalendarResourceType(resourcetype: unknown): boolean {
  if (!resourcetype || typeof resourcetype !== 'object') return false;
  const rt = resourcetype as Record<string, unknown>;
  // iCloud often returns empty-string child elements for collection/calendar tags.
  return 'calendar' in rt || 'cal:calendar' in rt || 'C:calendar' in rt;
}

function getSuccessfulProp(response: Record<string, unknown>): Record<string, unknown> | undefined {
  const propstats = response.propstat;
  const propstatArray = Array.isArray(propstats) ? propstats : propstats ? [propstats] : [];

  for (const propstat of propstatArray) {
    const status = String((propstat as { status?: string })?.status ?? '');
    if (status.includes('200')) {
      return (propstat as { prop?: Record<string, unknown> }).prop;
    }
  }

  const first = propstatArray[0] as { prop?: Record<string, unknown> } | undefined;
  return first?.prop;
}

export function resolveCalDavUrl(href: string, baseUrl: string): string {
  const normalizedBase = baseUrl.endsWith('/') ? baseUrl : `${baseUrl}/`;
  const resolved = new URL(href, normalizedBase).toString();
  return resolved.endsWith('/') ? resolved : `${resolved}/`;
}

/** Stable key for deduping the same CalDAV calendar across URL variants (port, trailing slash). */
export function canonicalCalDavCalendarKey(url: string): string {
  try {
    const parsed = new URL(url);
    const port =
      parsed.port && !['80', '443'].includes(parsed.port) ? `:${parsed.port}` : '';
    const path = parsed.pathname.replace(/\/+$/, '') || '/';
    return `${parsed.protocol}//${parsed.hostname.toLowerCase()}${port}${path.toLowerCase()}`;
  } catch {
    return url.replace(/\/+$/, '').toLowerCase();
  }
}

function shouldSkipCalDavCalendar(displayName: string, href: string): boolean {
  const name = displayName.toLowerCase();
  const path = href.toLowerCase();
  if (name === 'reminders' || path.includes('/reminders')) return true;
  if (name.includes('notification center')) return true;
  return false;
}

function unfoldIcsLines(ics: string): string {
  const lines = ics.replace(/\r\n/g, '\n').split('\n');
  const unfolded: string[] = [];
  for (const line of lines) {
    if ((line.startsWith(' ') || line.startsWith('\t')) && unfolded.length > 0) {
      unfolded[unfolded.length - 1] += line.slice(1);
    } else {
      unfolded.push(line);
    }
  }
  return unfolded.join('\n');
}

function parseIcsProperty(line: string): { name: string; value: string; tzid?: string } {
  const colon = line.indexOf(':');
  if (colon === -1) {
    return { name: line, value: '' };
  }
  const head = line.slice(0, colon);
  const value = line.slice(colon + 1);
  const name = head.split(';')[0] ?? head;
  const tzMatch = head.match(/TZID=([^;:]+)/i);
  const tzid = tzMatch?.[1]?.replace(/^"|"$/g, '');
  return { name, value, tzid };
}

function parseIcalDateToIso(
  value: string,
  tzid?: string,
  defaultZone: string = 'utc'
): string | null {
  const trimmed = value.trim();
  if (!trimmed) return null;

  if (/^\d{8}$/.test(trimmed)) {
    const dt = DateTime.fromFormat(trimmed, 'yyyyMMdd', { zone: tzid ?? defaultZone });
    return dt.isValid ? (dt.toUTC().toISO() ?? null) : null;
  }

  const normalized = trimmed.endsWith('Z') ? trimmed.slice(0, -1) : trimmed;
  const format =
    normalized.includes('T') && normalized.length >= 15 ? "yyyyMMdd'T'HHmmss" : "yyyyMMdd'T'HHmm";
  const zone = trimmed.endsWith('Z') ? 'utc' : tzid ?? defaultZone;
  const dt = DateTime.fromFormat(normalized, format, { zone });
  return dt.isValid ? (dt.toUTC().toISO() ?? null) : null;
}

function displayNameFromHref(href: string): string {
  const trimmed = href.replace(/\/$/, '');
  const segment = trimmed.split('/').filter(Boolean).pop();
  return segment || 'Calendar';
}

/**
 * Parse calendars list from CalDAV PROPFIND response
 */
export function parseCalendarsList(
  xml: string,
  baseUrl: string = DEFAULT_BASE_URL,
  calendarHomeUrl?: string | null
): Array<{ displayName: string; url: string }> {
  const parser = new XMLParser({
    ignoreAttributes: false,
    removeNSPrefix: true,
  });

  const result = parser.parse(xml);
  const calendars: Array<{ displayName: string; url: string }> = [];
  const seen = new Set<string>();
  const homeKey = calendarHomeUrl ? canonicalCalDavCalendarKey(calendarHomeUrl) : null;

  try {
    const responses = result.multistatus?.response;
    const responseArray = Array.isArray(responses) ? responses : [responses];

    for (const response of responseArray) {
      if (!response) continue;

      const href = typeof response.href === 'string' ? response.href : null;
      if (!href) continue;

      const prop = getSuccessfulProp(response as Record<string, unknown>);
      if (!prop || !isCalendarResourceType(prop.resourcetype)) continue;

      const displayName = readDisplayName(prop) ?? displayNameFromHref(href);
      const url = resolveCalDavUrl(href, baseUrl);
      const key = canonicalCalDavCalendarKey(url);
      if (homeKey && key === homeKey) continue;
      if (shouldSkipCalDavCalendar(displayName, href)) continue;
      if (seen.has(key)) continue;
      seen.add(key);

      calendars.push({ displayName, url });
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

type AppleAccountContext = {
  email: string;
  appPasswordEncrypted: string;
  baseUrl: string;
  calendarHomeUrl: string | null;
};

async function propfindPrincipalAndHome(
  email: string,
  appPassword: string,
  baseUrl: string,
  targetUrl: string
): Promise<{ principalUrl: string | null; calendarHomeUrl: string | null }> {
  const authHeader = buildAuthHeader(email, appPassword);
  const propfindBody = `<?xml version="1.0" encoding="utf-8" ?>
  <d:propfind xmlns:d="DAV:" xmlns:cal="urn:ietf:params:xml:ns:caldav">
    <d:prop>
      <d:current-user-principal/>
      <cal:calendar-home-set/>
    </d:prop>
  </d:propfind>`;

  const response = await caldavRequest(targetUrl, {
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
    const principalHref = prop?.['current-user-principal']?.href;
    principalUrl =
      typeof principalHref === 'string'
        ? resolveCalDavUrl(principalHref, baseUrl)
        : null;
    if (calendarHomeUrl) {
      calendarHomeUrl = resolveCalDavUrl(calendarHomeUrl, baseUrl);
    }
  } catch (error) {
    principalUrl = null;
  }

  return { principalUrl, calendarHomeUrl };
}

async function discoverAccountMetadata(email: string, appPassword: string): Promise<{
  principalUrl: string | null;
  calendarHomeUrl: string | null;
  baseUrl: string;
}> {
  let baseUrl = DEFAULT_BASE_URL;
  const rootUrl = resolveCalDavUrl('/', baseUrl);

  let { principalUrl, calendarHomeUrl } = await propfindPrincipalAndHome(
    email,
    appPassword,
    baseUrl,
    rootUrl
  );

  // iCloud (and many servers) only expose calendar-home-set on the principal resource.
  if (!calendarHomeUrl && principalUrl) {
    const principalBase = new URL(principalUrl).origin;
    const onPrincipal = await propfindPrincipalAndHome(
      email,
      appPassword,
      principalBase,
      principalUrl
    );
    calendarHomeUrl = onPrincipal.calendarHomeUrl;
    if (!principalUrl && onPrincipal.principalUrl) {
      principalUrl = onPrincipal.principalUrl;
    }
  }

  if (calendarHomeUrl) {
    baseUrl = new URL(calendarHomeUrl).origin;
    calendarHomeUrl = resolveCalDavUrl(calendarHomeUrl, baseUrl);
  }

  return { principalUrl, calendarHomeUrl, baseUrl };
}

async function resolveAppleContext(
  userId: string,
  calendarUrl?: string,
  connectedAccountId?: string
): Promise<AppleAccountContext | null> {
  if (connectedAccountId) {
    const account = await prisma.connectedAccount.findFirst({
      where: {
        id: connectedAccountId,
        userId,
        provider: ConnectedAccountProvider.apple_caldav,
      },
    });
    if (account?.caldavAppPasswordEncrypted) {
      return {
        email: account.email,
        appPasswordEncrypted: account.caldavAppPasswordEncrypted,
        baseUrl: account.caldavBaseUrl || DEFAULT_BASE_URL,
        calendarHomeUrl: account.caldavCalendarHomeUrl ?? null,
      };
    }
  }

  if (calendarUrl) {
    const linkedCalendar = await prisma.connectedCalendar.findFirst({
      where: {
        externalCalendarId: calendarUrl,
        account: {
          userId,
          provider: ConnectedAccountProvider.apple_caldav,
        },
      },
      include: { account: true },
    });

    if (linkedCalendar?.account?.caldavAppPasswordEncrypted) {
      return {
        email: linkedCalendar.account.email,
        appPasswordEncrypted: linkedCalendar.account.caldavAppPasswordEncrypted,
        baseUrl: linkedCalendar.account.caldavBaseUrl || DEFAULT_BASE_URL,
        calendarHomeUrl: linkedCalendar.account.caldavCalendarHomeUrl ?? null,
      };
    }
  }

  const legacy = await prisma.appleCalendarAccount.findUnique({ where: { userId } });
  if (!legacy) return null;
  return {
    email: legacy.email,
    appPasswordEncrypted: legacy.appPasswordEncrypted,
    baseUrl: legacy.baseUrl || DEFAULT_BASE_URL,
    calendarHomeUrl: legacy.calendarHomeUrl ?? null,
  };
}

/**
 * Discover CalDAV account and store credentials
 */
export async function discoverAccount(
  userId: string,
  email: string,
  appPassword: string
): Promise<{ principalUrl: string | null; calendarHomeUrl: string | null }> {
  const { principalUrl, calendarHomeUrl, baseUrl } = await discoverAccountMetadata(email, appPassword);

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
      baseUrl,
      principalUrl,
      calendarHomeUrl,
    },
  });

  return {
    principalUrl,
    calendarHomeUrl,
  };
}

export async function discoverConnectedAccount(
  userId: string,
  email: string,
  appPassword: string
): Promise<{ principalUrl: string | null; calendarHomeUrl: string | null; encryptedPassword: string }> {
  const { principalUrl, calendarHomeUrl, baseUrl } = await discoverAccountMetadata(email, appPassword);
  const encryptedPassword = encryptPassword(appPassword);

  await prisma.connectedAccount.upsert({
    where: {
      userId_provider_providerAccountId: {
        userId,
        provider: ConnectedAccountProvider.apple_caldav,
        providerAccountId: email.toLowerCase(),
      },
    },
    update: {
      email,
      caldavBaseUrl: baseUrl,
      caldavPrincipalUrl: principalUrl,
      caldavCalendarHomeUrl: calendarHomeUrl,
      caldavAppPasswordEncrypted: encryptedPassword,
      lastSuccessAt: new Date(),
      lastErrorAt: null,
      lastErrorCode: null,
      lastErrorMessage: null,
    },
    create: {
      userId,
      provider: ConnectedAccountProvider.apple_caldav,
      providerAccountId: email.toLowerCase(),
      email,
      caldavBaseUrl: baseUrl,
      caldavPrincipalUrl: principalUrl,
      caldavCalendarHomeUrl: calendarHomeUrl,
      caldavAppPasswordEncrypted: encryptedPassword,
      lastSuccessAt: new Date(),
    },
  });

  return { principalUrl, calendarHomeUrl, encryptedPassword };
}

export async function refreshConnectedAccountDiscovery(
  userId: string,
  connectedAccountId: string
): Promise<{ principalUrl: string | null; calendarHomeUrl: string | null }> {
  const account = await prisma.connectedAccount.findFirst({
    where: {
      id: connectedAccountId,
      userId,
      provider: ConnectedAccountProvider.apple_caldav,
    },
  });
  if (!account?.caldavAppPasswordEncrypted) {
    throw new Error('Apple Calendar account not found');
  }

  const appPassword = decryptPassword(account.caldavAppPasswordEncrypted);
  const { principalUrl, calendarHomeUrl, baseUrl } = await discoverAccountMetadata(
    account.email,
    appPassword
  );

  await prisma.connectedAccount.update({
    where: { id: account.id },
    data: {
      caldavBaseUrl: baseUrl,
      caldavPrincipalUrl: principalUrl,
      caldavCalendarHomeUrl: calendarHomeUrl,
      lastSuccessAt: new Date(),
      lastErrorAt: null,
      lastErrorMessage: null,
    },
  });

  return { principalUrl, calendarHomeUrl };
}

/**
 * Get Apple CalDAV account for user
 */
export async function getAccount(userId: string) {
  return await prisma.appleCalendarAccount.findUnique({
    where: { userId },
  });
}

export type ParsedIcsEvent = {
  id?: string;
  start: string;
  end: string;
  summary?: string;
  transparency?: 'opaque' | 'transparent';
};

/**
 * Parse a single ICS event string (supports TZID, folded lines, all-day dates).
 */
export function parseIcsEvent(ics: string, defaultZone: string = 'utc'): ParsedIcsEvent {
  const lines = unfoldIcsLines(ics)
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean);

  let uid = '';
  let dtstartValue = '';
  let dtstartTzid: string | undefined;
  let dtendValue = '';
  let dtendTzid: string | undefined;
  let summary = '';
  let transp = 'OPAQUE';

  for (const line of lines) {
    if (line.startsWith('UID')) {
      const prop = parseIcsProperty(line);
      uid = prop.value;
      continue;
    }
    if (line.startsWith('DTSTART')) {
      const prop = parseIcsProperty(line);
      dtstartValue = prop.value;
      dtstartTzid = prop.tzid;
      continue;
    }
    if (line.startsWith('DTEND')) {
      const prop = parseIcsProperty(line);
      dtendValue = prop.value;
      dtendTzid = prop.tzid;
      continue;
    }
    if (line.startsWith('SUMMARY')) {
      summary = parseIcsProperty(line).value;
      continue;
    }
    if (line.startsWith('TRANSP')) {
      transp = parseIcsProperty(line).value;
      continue;
    }
    if (line.startsWith('STATUS:CANCELLED')) {
      return { start: '', end: '', summary, transparency: 'opaque' };
    }
  }

  const start = parseIcalDateToIso(dtstartValue, dtstartTzid, defaultZone) ?? '';
  const end = parseIcalDateToIso(dtendValue, dtendTzid ?? dtstartTzid, defaultZone) ?? '';

  return {
    id: uid || undefined,
    start,
    end,
    summary,
    transparency: transp === 'TRANSPARENT' ? 'transparent' : 'opaque',
  };
}

/**
 * Parse multiple ICS events from CalDAV response
 */
export function parseIcsEvents(icsData: string, defaultZone: string = 'utc'): ParsedIcsEvent[] {
  const events: ParsedIcsEvent[] = [];
  const eventBlocks = unfoldIcsLines(icsData).split('BEGIN:VEVENT');

  for (let i = 1; i < eventBlocks.length; i++) {
    const eventEnd = eventBlocks[i].indexOf('END:VEVENT');
    if (eventEnd !== -1) {
      const eventStr = 'BEGIN:VEVENT\n' + eventBlocks[i].substring(0, eventEnd + 'END:VEVENT'.length);
      try {
        const parsed = parseIcsEvent(eventStr, defaultZone);
        if (parsed.start && parsed.end) {
          events.push(parsed);
        }
      } catch {
        // Skip malformed events
      }
    }
  }

  return events;
}

/**
 * Extract ICS payloads from a CalDAV REPORT multistatus response.
 */
export function parseCalDavReportEvents(
  xmlOrIcs: string,
  defaultZone: string = 'utc'
): ParsedIcsEvent[] {
  if (xmlOrIcs.includes('BEGIN:VEVENT') && !xmlOrIcs.includes('<multistatus')) {
    return parseIcsEvents(xmlOrIcs, defaultZone);
  }

  if (!xmlOrIcs.includes('calendar-data') && !xmlOrIcs.includes('multistatus')) {
    return parseIcsEvents(xmlOrIcs, defaultZone);
  }

  const parser = new XMLParser({
    ignoreAttributes: false,
    removeNSPrefix: true,
  });

  const events: ParsedIcsEvent[] = [];

  const collectCalendarData = (node: unknown): void => {
    if (!node || typeof node !== 'object') return;

    if (Array.isArray(node)) {
      for (const item of node) collectCalendarData(item);
      return;
    }

    const record = node as Record<string, unknown>;
    for (const [key, value] of Object.entries(record)) {
      if (key === 'calendar-data' || key.endsWith(':calendar-data')) {
        const ics =
          typeof value === 'string'
            ? value
            : value && typeof value === 'object' && '#text' in value
              ? String((value as { '#text': string })['#text'])
              : null;
        if (ics) {
          for (const parsed of parseIcsEvents(ics, defaultZone)) {
            if (parsed.start && parsed.end) events.push(parsed);
          }
        }
        continue;
      }
      collectCalendarData(value);
    }
  };

  try {
    const parsed = parser.parse(xmlOrIcs);
    collectCalendarData(parsed);
  } catch {
    return parseIcsEvents(xmlOrIcs, defaultZone);
  }

  return events;
}

/**
 * List calendars for user
 */
export async function listCalendars(
  userId: string,
  connectedAccountId?: string
): Promise<Array<{ displayName: string; url: string }>> {
  const account = await resolveAppleContext(userId, undefined, connectedAccountId);
  if (!account) {
    return [];
  }

  let calendarHomeUrl = account.calendarHomeUrl;
  const baseUrl = account.baseUrl || DEFAULT_BASE_URL;

  if (!calendarHomeUrl && connectedAccountId) {
    const refreshed = await refreshConnectedAccountDiscovery(userId, connectedAccountId);
    calendarHomeUrl = refreshed.calendarHomeUrl;
  }

  if (!calendarHomeUrl) {
    return [];
  }

  const authHeader = buildAuthHeader(account.email, decryptPassword(account.appPasswordEncrypted));
  const targetUrl = resolveCalDavUrl(calendarHomeUrl, baseUrl);

  const response = await caldavRequest(targetUrl, {
    method: 'PROPFIND',
    headers: {
      Authorization: authHeader,
      Depth: '1',
      'Content-Type': 'application/xml',
    },
    body: `<?xml version="1.0" encoding="utf-8" ?>
    <d:propfind xmlns:d="DAV:" xmlns:cal="urn:ietf:params:xml:ns:caldav">
      <d:prop>
        <d:displayname/>
        <d:resourcetype/>
      </d:prop>
    </d:propfind>`,
  });

  const xml = await response.text();
  return parseCalendarsList(xml, new URL(targetUrl).origin, calendarHomeUrl);
}

/**
 * Get events from Apple Calendar via CalDAV
 */
export async function getEvents(
  userId: string,
  calendarUrl: string,
  timeMin: string,
  timeMax: string
): Promise<ParsedIcsEvent[]> {
  const account = await resolveAppleContext(userId, calendarUrl);
  if (!account) return [];

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { timeZone: true },
  });
  const defaultZone = user?.timeZone ?? 'America/Chicago';

  const authHeader = buildAuthHeader(account.email, decryptPassword(account.appPasswordEncrypted));

  const url = resolveCalDavUrl(calendarUrl, account.baseUrl || DEFAULT_BASE_URL);
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
  return parseCalDavReportEvents(data, defaultZone);
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
  const account = await resolveAppleContext(userId, calendarUrl);
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

  await caldavRequest(resolveCalDavUrl(eventUrl, account.baseUrl || DEFAULT_BASE_URL), {
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
  const account = await resolveAppleContext(userId, calendarUrl);
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

  await caldavRequest(resolveCalDavUrl(eventUrl, account.baseUrl || DEFAULT_BASE_URL), {
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
  const account = await resolveAppleContext(userId, calendarUrl);
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

  await caldavRequest(resolveCalDavUrl(eventUrl, account.baseUrl || DEFAULT_BASE_URL), {
    method: 'PUT',
    headers: {
      Authorization: authHeader,
      'Content-Type': 'text/calendar; charset=utf-8',
    },
    body: ics,
  });
}
