import { describe, expect, it } from 'vitest';
import { parseIcsEvent } from '../appleCalendarService';

describe('appleCalendarService - ICS events', () => {
  it('parses transparent events and times from ICS', () => {
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
});
