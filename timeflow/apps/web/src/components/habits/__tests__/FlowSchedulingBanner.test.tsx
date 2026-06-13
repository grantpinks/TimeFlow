/**
 * @vitest-environment jsdom
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { render, waitFor } from '@testing-library/react';
import { FlowSchedulingBanner } from '../FlowSchedulingBanner';

describe('FlowSchedulingBanner', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('includes credentials for scheduling requests', async () => {
    const fetchMock = vi.mocked(global.fetch);
    fetchMock.mockImplementation((input) => {
      const url = typeof input === 'string' ? input : input.toString();
      if (url.endsWith('/api/habits/scheduling-context')) {
        return Promise.resolve({
          ok: true,
          json: async () => ({
            unscheduledHabitsCount: 1,
            nextRelevantDay: 'tomorrow',
            urgentHabits: 0,
            calendarDensity: 'light',
          }),
        } as Response);
      }
      if (url.endsWith('/api/habits')) {
        return Promise.resolve({
          ok: true,
          json: async () => [
            {
              id: 'habit-1',
              userId: 'user-1',
              title: 'Deep Work',
              description: '',
              frequency: 'daily',
              daysOfWeek: [],
              preferredTimeOfDay: 'morning',
              durationMinutes: 30,
              isActive: true,
              createdAt: '2024-01-01T00:00:00.000Z',
              updatedAt: '2024-01-01T00:00:00.000Z',
            },
          ],
        } as Response);
      }
      return Promise.resolve({
        ok: true,
        json: async () => ({}),
      } as Response);
    });

    render(<FlowSchedulingBanner />);

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalled();
    });

    const calls = fetchMock.mock.calls;
    const callByUrl = (suffix: string) =>
      calls.find(([input]) =>
        (typeof input === 'string' ? input : input.toString()).endsWith(suffix)
      );

    const contextCall = callByUrl('/api/habits/scheduling-context');
    const habitsCall = callByUrl('/api/habits');

    expect(contextCall).toBeTruthy();
    expect(habitsCall).toBeTruthy();

    expect(contextCall?.[1]?.credentials).toBe('include');
    expect(habitsCall?.[1]?.credentials).toBe('include');
  });
});
