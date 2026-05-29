import { describe, expect, it } from 'vitest';
import { parseIcsEvent } from '../appleCalendarService';

describe('appleCalendarService - ICS events', () => {
  it('parses transparent events and UTC times from ICS', () => {
    const ics = `BEGIN:VEVENT
DTSTART:20260110T160000Z
DTEND:20260110T170000Z
SUMMARY:TimeFlow Task
TRANSP:TRANSPARENT
END:VEVENT`;
    const event = parseIcsEvent(ics);
    expect(event.start).toBe('2026-01-10T16:00:00.000Z');
    expect(event.end).toBe('2026-01-10T17:00:00.000Z');
    expect(event.transparency).toBe('transparent');
  });

  it('parses DTSTART with TZID as local wall time (iCloud style)', () => {
    const ics = `BEGIN:VEVENT
UID:test-merge-uid
DTSTART;TZID=America/Chicago:20260529T120000
DTEND;TZID=America/Chicago:20260529T130000
SUMMARY:Test Merge Calendars
END:VEVENT`;
    const event = parseIcsEvent(ics, 'America/Chicago');
    expect(event.id).toBe('test-merge-uid');
    expect(event.start).toBe('2026-05-29T17:00:00.000Z');
    expect(event.end).toBe('2026-05-29T18:00:00.000Z');
    expect(event.summary).toBe('Test Merge Calendars');
  });

  it('unfolds folded ICS lines before parsing', () => {
    const ics = `BEGIN:VEVENT
DTSTART;TZID=America/Chicago:20260529T120000
DTEND;TZID=America/Chicago:20260529T130000
SUMMARY:Test Merge Calen
 dars
END:VEVENT`;
    const event = parseIcsEvent(ics, 'America/Chicago');
    expect(event.summary).toBe('Test Merge Calendars');
  });
});
