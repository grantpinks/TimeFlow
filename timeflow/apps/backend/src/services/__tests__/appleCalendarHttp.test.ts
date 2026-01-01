import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  discoverAccount,
  listCalendars,
  getEvents,
  createEvent,
  cancelEvent,
} from '../appleCalendarService.js';
import { prisma } from '../../config/prisma.js';

vi.mock('../../config/prisma.js', () => ({
  prisma: {
    appleCalendarAccount: {
      upsert: vi.fn(),
      findUnique: vi.fn(),
    },
  },
}));

const fetchMock = vi.fn();

beforeEach(() => {
  fetchMock.mockReset();
  vi.stubGlobal('fetch', fetchMock);
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('appleCalendarService HTTP', () => {
  it('discovers account and stores principal + calendar home', async () => {
    const discoveryXml = `<?xml version="1.0"?>
    <d:multistatus xmlns:d="DAV:" xmlns:cal="urn:ietf:params:xml:ns:caldav">
      <d:response>
        <d:propstat>
          <d:prop>
            <d:current-user-principal>
              <d:href>/principal/user/</d:href>
            </d:current-user-principal>
            <cal:calendar-home-set>
              <d:href>/calendars/user/</d:href>
            </cal:calendar-home-set>
          </d:prop>
        </d:propstat>
      </d:response>
    </d:multistatus>`;

    fetchMock.mockResolvedValueOnce({
      ok: true,
      text: async () => discoveryXml,
    });

    const result = await discoverAccount('user1', 'user@example.com', 'app-pass');

    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining('caldav.icloud.com'),
      expect.objectContaining({ method: 'PROPFIND' })
    );
    expect(prisma.appleCalendarAccount.upsert).toHaveBeenCalled();
    expect(result.principalUrl).toBe('/principal/user/');
    expect(result.calendarHomeUrl).toBe('/calendars/user/');
  });

  it('lists calendars via PROPFIND', async () => {
    (prisma.appleCalendarAccount.findUnique as any).mockResolvedValue({
      userId: 'user1',
      email: 'user@example.com',
      appPasswordEncrypted: 'app-pass',
      calendarHomeUrl: '/calendars/user/',
      baseUrl: 'https://caldav.icloud.com',
    });

    const calendarsXml = `<?xml version="1.0"?>
    <d:multistatus xmlns:d="DAV:" xmlns:cal="urn:ietf:params:xml:ns:caldav">
      <d:response>
        <d:href>/calendars/user/personal/</d:href>
        <d:propstat>
          <d:prop>
            <d:displayname>Personal</d:displayname>
            <d:resourcetype>
              <d:collection/>
              <cal:calendar/>
            </d:resourcetype>
          </d:prop>
        </d:propstat>
      </d:response>
    </d:multistatus>`;

    fetchMock.mockResolvedValueOnce({
      ok: true,
      text: async () => calendarsXml,
    });

    const calendars = await listCalendars('user1');
    expect(fetchMock).toHaveBeenCalled();
    expect(calendars).toEqual([{ displayName: 'Personal', url: '/calendars/user/personal/' }]);
  });

  it('parses events from REPORT response', async () => {
    (prisma.appleCalendarAccount.findUnique as any).mockResolvedValue({
      userId: 'user1',
      email: 'user@example.com',
      appPasswordEncrypted: 'app-pass',
      calendarHomeUrl: '/calendars/user/',
      baseUrl: 'https://caldav.icloud.com',
    });

    const ics = `BEGIN:VEVENT
DTSTART:20260110T160000Z
DTEND:20260110T170000Z
SUMMARY:Busy Event
TRANSP:OPAQUE
END:VEVENT
BEGIN:VEVENT
DTSTART:20260111T160000Z
DTEND:20260111T170000Z
SUMMARY:Free Block
TRANSP:TRANSPARENT
END:VEVENT`;

    fetchMock.mockResolvedValueOnce({
      ok: true,
      text: async () => ics,
    });

    const events = await getEvents(
      'user1',
      '/calendars/user/personal/',
      '2026-01-10T00:00:00.000Z',
      '2026-01-12T00:00:00.000Z'
    );

    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining('/calendars/user/personal/'),
      expect.objectContaining({ method: 'REPORT' })
    );
    expect(events).toHaveLength(2);
    expect(events[0].summary).toBe('Busy Event');
    expect(events[1].transparency).toBe('transparent');
  });

  it('creates and cancels events with correct ICS payloads', async () => {
    (prisma.appleCalendarAccount.findUnique as any).mockResolvedValue({
      userId: 'user1',
      email: 'user@example.com',
      appPasswordEncrypted: 'app-pass',
      calendarHomeUrl: '/calendars/user/',
      baseUrl: 'https://caldav.icloud.com',
    });

    // createEvent response
    fetchMock.mockResolvedValue({
      ok: true,
      text: async () => '',
    });

    const eventUrl = await createEvent('user1', '/calendars/user/personal/', {
      summary: 'Meeting',
      start: '2026-01-10T10:00:00.000Z',
      end: '2026-01-10T10:30:00.000Z',
      transparency: 'transparent',
    });

    const createCall = fetchMock.mock.calls[fetchMock.mock.calls.length - 1];
    expect(createCall[1].method).toBe('PUT');
    expect(createCall[1].body).toContain('TRANSPARENT');

    await cancelEvent('user1', '/calendars/user/personal/', eventUrl);
    const cancelCall = fetchMock.mock.calls[fetchMock.mock.calls.length - 1];
    expect(cancelCall[1].body).toContain('STATUS:CANCELLED');
  });
});
