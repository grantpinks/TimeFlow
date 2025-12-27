import { describe, expect, it } from 'vitest';
import { buildAvailabilitySlots } from '../meetingAvailabilityService';

describe('meetingAvailabilityService', () => {
  it('applies buffers and builds 15-minute slots', () => {
    const slots = buildAvailabilitySlots({
      rangeStart: '2026-01-10T09:00:00.000Z',
      rangeEnd: '2026-01-10T12:00:00.000Z',
      durationsMinutes: [30],
      bufferBeforeMinutes: 10,
      bufferAfterMinutes: 10,
      busyIntervals: [
        { start: '2026-01-10T10:00:00.000Z', end: '2026-01-10T10:30:00.000Z' },
      ],
      timeZone: 'UTC',
      wakeTime: '09:00',
      sleepTime: '17:00',
      dailySchedule: null,
    });
    expect(slots.some((s) => s.start === '2026-01-10T09:00:00.000Z')).toBe(true);
    expect(slots.some((s) => s.start === '2026-01-10T10:00:00.000Z')).toBe(false);
  });
});
