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
});
