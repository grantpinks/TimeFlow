/**
 * @vitest-environment jsdom
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { render, waitFor } from '@testing-library/react';
import { FlowSchedulingBanner } from '../FlowSchedulingBanner';

const getAuthHeader = (headers?: HeadersInit) => {
  if (!headers) return undefined;
  if (headers instanceof Headers) {
    return headers.get('Authorization') ?? undefined;
  }
  if (Array.isArray(headers)) {
    const match = headers.find(([key]) => key.toLowerCase() === 'authorization');
    return match ? match[1] : undefined;
  }
  return (headers as Record<string, string>).Authorization;
};

describe('FlowSchedulingBanner', () => {
  beforeEach(() => {
    const store = new Map<string, string>();
    globalThis.localStorage = {
      getItem: (key: string) => store.get(key) ?? null,
      setItem: (key: string, value: string) => {
        store.set(key, value);
      },
      removeItem: (key: string) => {
        store.delete(key);
      },
      clear: () => {
        store.clear();
      },
      key: (index: number) => Array.from(store.keys())[index] ?? null,
      get length() {
        return store.size;
      },
    } as Storage;
    vi.stubGlobal('fetch', vi.fn());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('includes auth token from timeflow_token for scheduling requests', async () => {
    localStorage.setItem('timeflow_token', 'test-token');

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

    const contextAuth = getAuthHeader(contextCall?.[1]?.headers);
    const habitsAuth = getAuthHeader(habitsCall?.[1]?.headers);

    expect(contextAuth).toBe('Bearer test-token');
    expect(habitsAuth).toBe('Bearer test-token');
  });
});
