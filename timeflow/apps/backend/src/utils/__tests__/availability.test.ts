import { describe, expect, it } from 'vitest';
import { buildAvailabilitySummary, getLargestFreeBlockToday } from '../availability';
import type { CalendarEvent } from '@timeflow/shared';
import type { UserPreferences } from '../scheduleValidator';

describe('buildAvailabilitySummary', () => {
  it('returns open slots that exclude busy events', () => {
    const calendarEvents: CalendarEvent[] = [
      {
        summary: 'Busy block',
        start: '2025-01-01T09:00:00.000Z',
        end: '2025-01-01T10:00:00.000Z',
      },
    ];
    const userPrefs: UserPreferences = {
      wakeTime: '08:00',
      sleepTime: '12:00',
      timeZone: 'UTC',
      dailySchedule: null,
      dailyScheduleConstraints: null,
    };

    const summary = buildAvailabilitySummary({
      message: 'When am I free today?',
      calendarEvents,
      userPrefs,
      now: new Date('2025-01-01T00:00:00.000Z'),
    });

    expect(summary).toContain('Here are your open slots for today:');
    expect(summary).toContain('8:00 AM - 9:00 AM');
    expect(summary).toContain('10:00 AM - 12:00 PM');
  });

  it('rounds odd-minute boundaries to 5-minute increments', () => {
    const calendarEvents: CalendarEvent[] = [
      {
        summary: 'Odd meeting',
        start: '2025-01-02T09:00:00.000Z',
        end: '2025-01-02T10:07:00.000Z',
      },
    ];
    const userPrefs: UserPreferences = {
      wakeTime: '08:00',
      sleepTime: '12:00',
      timeZone: 'UTC',
      dailySchedule: null,
      dailyScheduleConstraints: null,
    };

    const summary = buildAvailabilitySummary({
      message: 'When am I free today?',
      calendarEvents,
      userPrefs,
      now: new Date('2025-01-02T00:00:00.000Z'),
    });

    expect(summary).toContain('10:10 AM - 12:00 PM');
    expect(summary).not.toContain('10:07 AM');
  });
});

describe('getLargestFreeBlockToday', () => {
  it('returns the longest open window for today', () => {
    const calendarEvents: CalendarEvent[] = [
      {
        summary: 'Morning meeting',
        start: '2025-01-01T09:00:00.000Z',
        end: '2025-01-01T10:00:00.000Z',
      },
      {
        summary: 'Afternoon meeting',
        start: '2025-01-01T14:00:00.000Z',
        end: '2025-01-01T15:00:00.000Z',
      },
    ];
    const userPrefs: UserPreferences = {
      wakeTime: '08:00',
      sleepTime: '18:00',
      timeZone: 'UTC',
      dailySchedule: null,
      dailyScheduleConstraints: null,
    };

    const block = getLargestFreeBlockToday({
      calendarEvents,
      userPrefs,
      now: new Date('2025-01-01T00:00:00.000Z'),
    });

    expect(block).toContain('10:00 AM');
    expect(block).toContain('2:00 PM');
  });
});
