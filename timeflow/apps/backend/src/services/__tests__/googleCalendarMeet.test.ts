import { describe, expect, it } from 'vitest';
import { buildGoogleEventRequest } from '../googleCalendarService';

describe('googleCalendarService - Meet', () => {
  it('adds conference data when meet enabled', () => {
    const req = buildGoogleEventRequest({
      summary: 'Meeting',
      start: '2026-01-10T10:00:00.000Z',
      end: '2026-01-10T10:30:00.000Z',
      enableMeet: true,
    });
    expect(req.conferenceData).toBeTruthy();
  });

  it('sets transparency to transparent when specified', () => {
    const req = buildGoogleEventRequest({
      summary: 'Focus Time',
      start: '2026-01-10T10:00:00.000Z',
      end: '2026-01-10T10:30:00.000Z',
      transparency: 'transparent',
    });
    expect(req.transparency).toBe('transparent');
  });

  it('sets transparency to opaque when specified', () => {
    const req = buildGoogleEventRequest({
      summary: 'Meeting',
      start: '2026-01-10T10:00:00.000Z',
      end: '2026-01-10T10:30:00.000Z',
      transparency: 'opaque',
    });
    expect(req.transparency).toBe('opaque');
  });

  it('does not set transparency when not specified', () => {
    const req = buildGoogleEventRequest({
      summary: 'Meeting',
      start: '2026-01-10T10:00:00.000Z',
      end: '2026-01-10T10:30:00.000Z',
    });
    expect(req.transparency).toBeUndefined();
  });
});
