import { describe, expect, it } from 'vitest';
import { isWithinWakeHours } from '../scheduleValidator';

describe('isWithinWakeHours', () => {
  it('uses per-day wake/sleep constraints when provided', () => {
    const prefs = {
      wakeTime: '08:00',
      sleepTime: '23:00',
      timeZone: 'UTC',
      dailyScheduleConstraints: {
        saturday: { wakeTime: '10:00', sleepTime: '20:00' },
      },
    };

    const result = isWithinWakeHours(
      '2025-01-04T09:00:00.000Z',
      '2025-01-04T10:00:00.000Z',
      prefs
    );

    expect(result.valid).toBe(false);
    expect(result.wakeTime).toBe('10:00');
    expect(result.sleepTime).toBe('20:00');
  });

  it('falls back to default wake/sleep times when no daily schedule is set', () => {
    const prefs = {
      wakeTime: '08:00',
      sleepTime: '23:00',
      timeZone: 'UTC',
    };

    const result = isWithinWakeHours(
      '2025-01-06T09:00:00.000Z',
      '2025-01-06T10:00:00.000Z',
      prefs
    );

    expect(result.valid).toBe(true);
    expect(result.wakeTime).toBe('08:00');
    expect(result.sleepTime).toBe('23:00');
  });
});
