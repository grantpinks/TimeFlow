import { describe, it, expect } from 'vitest';
import { suggestHabitBlocks } from '../src/suggestHabitBlocks.js';
import type {
  CalendarEvent,
  HabitInput,
  HabitSuggestionBlock,
  UserPreferences,
} from '../src/types.js';

const prefs: UserPreferences = {
  timeZone: 'America/Chicago',
  wakeTime: '08:00',
  sleepTime: '23:00',
};

const rangeStart = '2025-12-01T00:00:00';
const rangeEnd = '2025-12-07T23:59:59';

function describeTimes(block: HabitSuggestionBlock) {
  return `${block.start} - ${block.end}`;
}

describe('suggestHabitBlocks', () => {
  it('schedules a daily habit within preferred morning window', () => {
    const habits: HabitInput[] = [
      {
        id: 'habit-1',
        durationMinutes: 60,
        frequency: 'daily',
        preferredTimeOfDay: 'morning',
      },
    ];

    const suggestions = suggestHabitBlocks(habits, [], prefs, rangeStart, rangeEnd);

    expect(suggestions.length).toBeGreaterThan(0);
    // First day should start at wake time (8am) since morning window starts at 5am but wake is 8am
    expect(suggestions[0].start).toContain('2025-12-01T08:00');
    expect(suggestions[0].status).toBe('proposed');
  });

  it('respects weekly daysOfWeek', () => {
    const habits: HabitInput[] = [
      {
        id: 'weekly-habit',
        durationMinutes: 30,
        frequency: 'weekly',
        daysOfWeek: ['mon', 'thu'],
        preferredTimeOfDay: 'afternoon',
      },
    ];

    const suggestions = suggestHabitBlocks(habits, [], prefs, rangeStart, rangeEnd);

    const scheduledDays = suggestions.map((s) => s.start.slice(0, 10));
    expect(scheduledDays).toContain('2025-12-01'); // Monday
    expect(scheduledDays).toContain('2025-12-04'); // Thursday
    expect(scheduledDays).not.toContain('2025-12-02'); // Tuesday
  });

  it('avoids busy events and still stays in preferred window when possible', () => {
    const habits: HabitInput[] = [
      {
        id: 'habit-busy',
        durationMinutes: 60,
        frequency: 'daily',
        preferredTimeOfDay: 'morning',
      },
    ];

    const busyEvents: CalendarEvent[] = [
      { start: '2025-12-01T08:00:00-06:00', end: '2025-12-01T10:00:00-06:00' },
    ];

    const suggestions = suggestHabitBlocks(habits, busyEvents, prefs, rangeStart, rangeEnd);
    // Should place after the meeting but still within morning window (before noon)
    expect(suggestions[0].start).toContain('2025-12-01T10:00');
    expect(describeTimes(suggestions[0])).toContain('11:00:00');
  });

  it('falls back outside preferred window with reason when needed', () => {
    const habits: HabitInput[] = [
      {
        id: 'habit-fallback',
        durationMinutes: 120,
        frequency: 'daily',
        preferredTimeOfDay: 'evening',
      },
    ];

    const busyEvents: CalendarEvent[] = [
      { start: '2025-12-01T17:00:00-06:00', end: '2025-12-01T22:00:00-06:00' }, // block evening
    ];

    const suggestions = suggestHabitBlocks(habits, busyEvents, prefs, rangeStart, rangeEnd);
    expect(suggestions[0].start).toContain('2025-12-01T08:00'); // fallback to earliest available
    expect(suggestions[0].reason).toBe('Placed outside preferred window');
  });

  it('does not overlap multiple habit suggestions', () => {
    const habits: HabitInput[] = [
      {
        id: 'habit-1',
        durationMinutes: 60,
        frequency: 'daily',
        preferredTimeOfDay: 'morning',
      },
      {
        id: 'habit-2',
        durationMinutes: 60,
        frequency: 'daily',
        preferredTimeOfDay: 'morning',
      },
    ];

    const suggestions = suggestHabitBlocks(habits, [], prefs, rangeStart, rangeEnd);
    const first = suggestions.find((s) => s.habitId === 'habit-1');
    const second = suggestions.find((s) => s.habitId === 'habit-2');

    expect(first).toBeTruthy();
    expect(second).toBeTruthy();
    // First habit at 8-9, second should follow at 9-10 (no overlap)
    expect(first!.start).toContain('08:00');
    expect(second!.start).toContain('09:00');
  });

  it('respects per-day wake/sleep overrides from dailySchedule', () => {
    const weekendPrefs: UserPreferences = {
      ...prefs,
      dailySchedule: {
        saturday: { wakeTime: '10:00', sleepTime: '20:00' },
      },
    };

    const habits: HabitInput[] = [
      {
        id: 'weekend-habit',
        durationMinutes: 30,
        frequency: 'weekly',
        daysOfWeek: ['sat'],
        preferredTimeOfDay: 'morning',
      },
    ];

    const suggestions = suggestHabitBlocks(habits, [], weekendPrefs, rangeStart, rangeEnd);
    expect(suggestions.length).toBe(1);
    expect(suggestions[0].start).toContain('2025-12-06T10:00'); // Saturday honors 10am wake time
  });

  it('skips days with invalid wake/sleep windows and schedules the next valid day', () => {
    const skewedPrefs: UserPreferences = {
      ...prefs,
      dailySchedule: {
        monday: { wakeTime: '20:00', sleepTime: '06:00' }, // invalid window: end before start
      },
    };

    const habits: HabitInput[] = [
      {
        id: 'skip-invalid-day',
        durationMinutes: 30,
        frequency: 'daily',
        preferredTimeOfDay: 'morning',
      },
    ];

    const suggestions = suggestHabitBlocks(habits, [], skewedPrefs, rangeStart, rangeEnd);
    const scheduledDays = suggestions.map((s) => s.start.slice(0, 10));
    expect(scheduledDays).not.toContain('2025-12-01'); // Monday skipped due to invalid bounds
    expect(scheduledDays).toContain('2025-12-02'); // Tuesday scheduled normally
  });
});
