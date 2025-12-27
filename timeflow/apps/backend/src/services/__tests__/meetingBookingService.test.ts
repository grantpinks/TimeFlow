import { describe, expect, it } from 'vitest';
import { isSlotAvailable } from '../meetingBookingService';

describe('meetingBookingService', () => {
  it('rejects overlapping slot with existing meeting', () => {
    const ok = isSlotAvailable(
      { start: '2026-01-10T10:00:00.000Z', end: '2026-01-10T10:30:00.000Z' },
      [{ startDateTime: new Date('2026-01-10T10:15:00.000Z'), endDateTime: new Date('2026-01-10T10:45:00.000Z') }]
    );
    expect(ok).toBe(false);
  });
});
