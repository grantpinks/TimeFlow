import { describe, expect, it } from 'vitest';
import { parseCalendarHomeUrl } from '../appleCalendarService';

describe('appleCalendarService', () => {
  it('parses calendar-home-set from DAV response', () => {
    const xml = `<?xml version="1.0"?>
  <d:multistatus xmlns:d="DAV:">
    <d:response>
      <d:propstat>
        <d:prop>
          <cal:calendar-home-set xmlns:cal="urn:ietf:params:xml:ns:caldav">
            <d:href>/123456789/calendars/</d:href>
          </cal:calendar-home-set>
        </d:prop>
      </d:propstat>
    </d:response>
  </d:multistatus>`;
    expect(parseCalendarHomeUrl(xml)).toBe('/123456789/calendars/');
  });
});
