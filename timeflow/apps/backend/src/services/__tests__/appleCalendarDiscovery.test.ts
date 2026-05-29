import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  discoverConnectedAccount,
  parseCalDavReportEvents,
  parseCalendarsList,
} from '../appleCalendarService.js';
import { prisma } from '../../config/prisma.js';

vi.mock('../../config/prisma.js', () => ({
  prisma: {
    connectedAccount: {
      upsert: vi.fn(),
      findFirst: vi.fn(),
      update: vi.fn(),
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

describe('appleCalendar discovery', () => {
  it('follows principal PROPFIND when calendar-home-set is missing on root', async () => {
    const rootXml = `<?xml version="1.0"?>
    <d:multistatus xmlns:d="DAV:">
      <d:response>
        <d:propstat>
          <d:status>HTTP/1.1 200 OK</d:status>
          <d:prop>
            <d:current-user-principal>
              <d:href>/123456/principal/</d:href>
            </d:current-user-principal>
          </d:prop>
        </d:propstat>
      </d:response>
    </d:multistatus>`;

    const principalXml = `<?xml version="1.0"?>
    <d:multistatus xmlns:d="DAV:" xmlns:cal="urn:ietf:params:xml:ns:caldav">
      <d:response>
        <d:propstat>
          <d:status>HTTP/1.1 200 OK</d:status>
          <d:prop>
            <cal:calendar-home-set>
              <d:href>https://p42-caldav.icloud.com:443/123456/calendars/</d:href>
            </cal:calendar-home-set>
          </d:prop>
        </d:propstat>
      </d:response>
    </d:multistatus>`;

    fetchMock
      .mockResolvedValueOnce({ ok: true, text: async () => rootXml })
      .mockResolvedValueOnce({ ok: true, text: async () => principalXml });

    (prisma.connectedAccount.upsert as any).mockResolvedValue({ id: 'acc-1' });

    const result = await discoverConnectedAccount('user1', 'grantpinks@gmail.com', 'abcd-efgh-ijkl-mnop');

    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(result.calendarHomeUrl).toBe('https://p42-caldav.icloud.com/123456/calendars/');
    expect(prisma.connectedAccount.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        update: expect.objectContaining({
          caldavBaseUrl: 'https://p42-caldav.icloud.com',
        }),
      })
    );
  });

  it('parses calendar-data from CalDAV REPORT multistatus', () => {
    const xml = `<?xml version="1.0"?>
    <d:multistatus xmlns:d="DAV:" xmlns:cal="urn:ietf:params:xml:ns:caldav">
      <d:response>
        <d:propstat>
          <d:prop>
            <cal:calendar-data>BEGIN:VCALENDAR
BEGIN:VEVENT
DTSTART:20260529T150000Z
DTEND:20260529T160000Z
SUMMARY:Test Event
END:VEVENT
END:VCALENDAR</cal:calendar-data>
          </d:prop>
        </d:propstat>
      </d:response>
    </d:multistatus>`;

    const events = parseCalDavReportEvents(xml);
    expect(events).toHaveLength(1);
    expect(events[0].summary).toBe('Test Event');
  });

  it('includes calendars without displayname using href fallback', () => {
    const xml = `<?xml version="1.0"?>
    <d:multistatus xmlns:d="DAV:" xmlns:cal="urn:ietf:params:xml:ns:caldav">
      <d:response>
        <d:href>/123456/calendars/home/</d:href>
        <d:propstat>
          <d:status>HTTP/1.1 200 OK</d:status>
          <d:prop>
            <d:resourcetype>
              <d:collection/>
              <cal:calendar/>
            </d:resourcetype>
          </d:prop>
        </d:propstat>
      </d:response>
    </d:multistatus>`;

    const calendars = parseCalendarsList(xml, 'https://p42-caldav.icloud.com');
    expect(calendars).toEqual([
      {
        displayName: 'home',
        url: 'https://p42-caldav.icloud.com/123456/calendars/home/',
      },
    ]);
  });
});
