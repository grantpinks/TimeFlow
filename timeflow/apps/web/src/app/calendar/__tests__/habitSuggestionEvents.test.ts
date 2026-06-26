import { describe, expect, it } from 'vitest';
import { buildHabitSuggestionCalendarEvents } from '../habitSuggestionEvents';
import type { EnrichedHabitSuggestion } from '@timeflow/shared';

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

describe('buildHabitSuggestionCalendarEvents', () => {
  it('builds distinct calendar ghost events when enabled', () => {
    const events = buildHabitSuggestionCalendarEvents([suggestion()], true);

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
      true
    );

    expect(events[0]?.end.toISOString()).toBe(new Date('2026-06-25T17:05:00.000-05:00').toISOString());
    expect(events[0]?.displayEnd.toISOString()).toBe(new Date('2026-06-25T17:30:00.000-05:00').toISOString());
  });

  it('returns no events when disabled', () => {
    expect(buildHabitSuggestionCalendarEvents([suggestion()], false)).toEqual([]);
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
