/**
 * @vitest-environment jsdom
 */

import { describe, expect, it } from 'vitest';
import type { CalendarEvent } from '@timeflow/shared';
import { filterExternalEvents } from '../calendarEventFilters';

const baseEvent: CalendarEvent = {
  id: 'evt-1',
  summary: 'Sample',
  start: '2026-01-05T15:00:00.000Z',
  end: '2026-01-05T16:00:00.000Z',
};

describe('filterExternalEvents', () => {
  it('keeps TimeFlow habit events with default prefix', () => {
    const events: CalendarEvent[] = [
      { ...baseEvent, id: 'habit-1', summary: 'TF| Habit: Deep Work' },
    ];

    const result = filterExternalEvents(events, new Set(), {
      prefixEnabled: true,
      prefix: 'TF|',
    });
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('habit-1');
  });

  it('filters TimeFlow task events with default prefix', () => {
    const events: CalendarEvent[] = [
      { ...baseEvent, id: 'task-1', summary: 'TF| Write report' },
    ];

    const result = filterExternalEvents(events, new Set(), {
      prefixEnabled: true,
      prefix: 'TF|',
    });
    expect(result).toHaveLength(0);
  });

  it('filters events already represented by scheduled tasks', () => {
    const events: CalendarEvent[] = [
      { ...baseEvent, id: 'evt-123', summary: 'Standup' },
    ];

    const result = filterExternalEvents(events, new Set(['evt-123']), {
      prefixEnabled: true,
      prefix: 'TF|',
    });
    expect(result).toHaveLength(0);
  });

  it('respects custom prefixes', () => {
    const events: CalendarEvent[] = [
      { ...baseEvent, id: 'habit-1', summary: 'MY| Habit: Stretch' },
      { ...baseEvent, id: 'task-1', summary: 'MY| Write report' },
    ];

    const result = filterExternalEvents(events, new Set(), {
      prefixEnabled: true,
      prefix: 'MY|',
    });
    expect(result).toHaveLength(1);
    expect(result[0].summary).toContain('Habit: Stretch');
  });

  it('keeps legacy TimeFlow habit events even when their IDs are flagged', () => {
    const events: CalendarEvent[] = [
      {
        ...baseEvent,
        id: 'habit-legacy',
        summary: '[TimeFlow Habit] Deep Work',
        sourceType: 'external',
      },
    ];

    const result = filterExternalEvents(events, new Set(['habit-legacy']), {
      prefixEnabled: true,
      prefix: 'TF|',
    });
    expect(result).toHaveLength(1);
    expect(result[0].summary).toBe('[TimeFlow Habit] Deep Work');
  });
});
