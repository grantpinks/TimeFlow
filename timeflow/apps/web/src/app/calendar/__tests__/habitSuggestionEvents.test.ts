import { describe, expect, it } from 'vitest';
import { buildHabitSuggestionCalendarEvents } from '../habitSuggestionEvents';
import type { CalendarEvent, EnrichedHabitSuggestion } from '@timeflow/shared';

function suggestion(overrides: Partial<EnrichedHabitSuggestion> = {}): EnrichedHabitSuggestion {
  return {
    habitId: 'habit-1',
    start: '2026-06-25T09:00:00.000-05:00',
    end: '2026-06-25T09:30:00.000-05:00',
    status: 'proposed',
    habit: {
      id: 'habit-1',
      title: 'Run',
      description: null,
      durationMinutes: 30,
    },
    ...overrides,
  };
}

function busyEvent(overrides: Partial<CalendarEvent> = {}): CalendarEvent {
  return {
    id: 'busy-1',
    summary: 'Busy',
    start: '2026-06-25T09:15:00.000-05:00',
    end: '2026-06-25T09:45:00.000-05:00',
    sourceType: 'external',
    transparency: 'opaque',
    ...overrides,
  };
}

describe('buildHabitSuggestionCalendarEvents', () => {
  it('builds distinct calendar ghost events when enabled', () => {
    const events = buildHabitSuggestionCalendarEvents(
      [suggestion()],
      true,
      new Date('2026-06-25T12:00:00.000-05:00')
    );

    expect(events).toHaveLength(1);
    expect(events[0]?.id).toContain('habit-suggestion-habit-1');
    expect(events[0]?.title).toBe('Suggested: Run');
    expect(events[0]?.habitId).toBe('habit-1');
  });

  it('adds a larger display end for very short suggestions without changing the scheduled end', () => {
    const events = buildHabitSuggestionCalendarEvents(
      [
        suggestion({
          start: '2026-06-25T17:00:00.000-05:00',
          end: '2026-06-25T17:05:00.000-05:00',
        }),
      ],
      true,
      new Date('2026-06-25T12:00:00.000-05:00')
    );

    expect(events[0]?.end.toISOString()).toBe(new Date('2026-06-25T17:05:00.000-05:00').toISOString());
    expect(events[0]?.displayEnd.toISOString()).toBe(new Date('2026-06-25T17:30:00.000-05:00').toISOString());
  });

  it('returns no events when disabled', () => {
    expect(buildHabitSuggestionCalendarEvents([suggestion()], false)).toEqual([]);
  });

  it('drops proposed suggestions that overlap occupied timed calendar events', () => {
    const events = buildHabitSuggestionCalendarEvents(
      [
        suggestion({
          habitId: 'overlap',
          start: '2026-06-25T09:00:00.000-05:00',
          end: '2026-06-25T09:30:00.000-05:00',
        }),
        suggestion({
          habitId: 'available',
          start: '2026-06-25T10:00:00.000-05:00',
          end: '2026-06-25T10:30:00.000-05:00',
          habit: {
            id: 'available',
            title: 'Read',
            description: null,
            durationMinutes: 30,
          },
        }),
      ],
      true,
      new Date('2026-06-25T12:00:00.000-05:00'),
      'America/Chicago',
      [busyEvent()]
    );

    expect(events).toHaveLength(1);
    expect(events[0]?.habitId).toBe('available');
  });

  it('ignores suggestions from days before today', () => {
    const events = buildHabitSuggestionCalendarEvents(
      [
        suggestion({
          start: '2026-06-24T17:00:00.000-05:00',
          end: '2026-06-24T17:30:00.000-05:00',
        }),
        suggestion({
          habitId: 'habit-2',
          start: '2026-06-25T08:00:00.000-05:00',
          end: '2026-06-25T08:30:00.000-05:00',
          habit: {
            id: 'habit-2',
            title: 'Study',
            description: null,
            durationMinutes: 30,
          },
        }),
      ],
      true,
      new Date('2026-06-25T12:00:00.000-05:00')
    );

    expect(events).toHaveLength(1);
    expect(events[0]?.habitId).toBe('habit-2');
  });

  it('keeps profile-timezone morning suggestions even when browser midnight would be later', () => {
    const events = buildHabitSuggestionCalendarEvents(
      [
        suggestion({
          habitId: 'habit-past',
          start: '2026-06-24T20:00:00.000Z',
          end: '2026-06-24T20:30:00.000Z',
        }),
        suggestion({
          habitId: 'habit-london-morning',
          start: '2026-06-24T23:30:00.000Z',
          end: '2026-06-25T00:00:00.000Z',
          habit: {
            id: 'habit-london-morning',
            title: 'London Morning',
            description: null,
            durationMinutes: 30,
          },
        }),
      ],
      true,
      new Date('2026-06-25T12:00:00.000+01:00'),
      'Europe/London'
    );

    expect(events).toHaveLength(1);
    expect(events[0]?.habitId).toBe('habit-london-morning');
  });

  it('ignores rejected and invalid suggestions', () => {
    const events = buildHabitSuggestionCalendarEvents(
      [
        suggestion({ status: 'rejected' }),
        suggestion({ start: 'not-a-date' }),
        suggestion({ start: '2026-06-25T10:00:00.000-05:00', end: '2026-06-25T09:00:00.000-05:00' }),
      ],
      true
    );

    expect(events).toEqual([]);
  });
});
