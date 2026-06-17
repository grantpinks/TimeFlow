import { describe, expect, it } from 'vitest';
import { isOwnScheduledTaskEvent } from '../scheduleService.js';

describe('isOwnScheduledTaskEvent', () => {
  const task = {
    title: 'Write report',
    description: 'Q2 summary',
    scheduledTask: {
      eventId: 'evt-123',
      startDateTime: new Date('2026-06-16T14:00:00.000Z'),
      endDateTime: new Date('2026-06-16T15:00:00.000Z'),
    },
  };

  const user = {
    eventPrefixEnabled: true,
    eventPrefix: 'TF|',
  };

  it('matches by calendar event id', () => {
    expect(
      isOwnScheduledTaskEvent(
        {
          id: 'evt-123',
          summary: 'External meeting',
          start: '2026-06-16T14:00:00.000Z',
          end: '2026-06-16T15:00:00.000Z',
        },
        task,
        user
      )
    ).toBe(true);
  });

  it('matches by exact TimeFlow time block when event id is missing', () => {
    expect(
      isOwnScheduledTaskEvent(
        {
          summary: 'TF| Write report',
          start: '2026-06-16T14:00:00.000Z',
          end: '2026-06-16T15:00:00.000Z',
        },
        task,
        user
      )
    ).toBe(true);
  });

  it('does not match same title at a different time', () => {
    expect(
      isOwnScheduledTaskEvent(
        {
          summary: 'TF| Write report',
          start: '2026-06-16T16:00:00.000Z',
          end: '2026-06-16T17:00:00.000Z',
        },
        task,
        user
      )
    ).toBe(false);
  });

  it('does not treat unrelated external events as own task', () => {
    expect(
      isOwnScheduledTaskEvent(
        {
          id: 'evt-999',
          summary: 'Team standup',
          start: '2026-06-16T14:00:00.000Z',
          end: '2026-06-16T15:00:00.000Z',
        },
        task,
        user
      )
    ).toBe(false);
  });
});
