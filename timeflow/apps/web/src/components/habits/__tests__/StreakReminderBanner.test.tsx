/**
 * @vitest-environment jsdom
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { StreakReminderBanner } from '../StreakReminderBanner';
import type { StreakAtRiskNotification } from '@timeflow/shared';

const BASE_NOTIFICATION: StreakAtRiskNotification = {
  habitId: 'habit-1',
  habitTitle: 'Morning Walk',
  currentStreak: 3,
  message: 'Test message',
};

const setupStorage = () => {
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

  return store;
};

describe('StreakReminderBanner', () => {
  beforeEach(() => {
    setupStorage();
  });

  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  it('renders the banner and records last shown time', async () => {
    render(
      <StreakReminderBanner
        atRiskHabits={[BASE_NOTIFICATION]}
      />
    );

    expect(await screen.findByText('Streak at Risk!')).not.toBeNull();

    await waitFor(() => {
      const stored = localStorage.getItem('streakReminderLastShownAt');
      expect(stored).not.toBeNull();
      const storedDate = new Date(stored!);
      expect(Number.isNaN(storedDate.getTime())).toBe(false);
      const diffMs = Math.abs(storedDate.getTime() - Date.now());
      expect(diffMs).toBeLessThan(2000);
    });
  });

  it('does not render when dismissed', async () => {
    localStorage.setItem('streakReminderDismissed', 'true');

    render(
      <StreakReminderBanner
        atRiskHabits={[BASE_NOTIFICATION]}
      />
    );

    await waitFor(() => {
      expect(screen.queryByText('Streak at Risk!')).toBeNull();
    });
  });

  it('does not render when snoozed until future', async () => {
    const snoozedUntil = new Date(Date.now() + 60 * 60 * 1000).toISOString();
    localStorage.setItem('streakReminderSnoozedUntil', snoozedUntil);

    render(
      <StreakReminderBanner
        atRiskHabits={[BASE_NOTIFICATION]}
      />
    );

    await waitFor(() => {
      expect(screen.queryByText('Streak at Risk!')).toBeNull();
    });
  });

  it('does not render when rate limited', async () => {
    const recent = new Date(Date.now() - 60 * 60 * 1000).toISOString();
    localStorage.setItem('streakReminderLastShownAt', recent);

    render(
      <StreakReminderBanner
        atRiskHabits={[BASE_NOTIFICATION]}
      />
    );

    await waitFor(() => {
      expect(screen.queryByText('Streak at Risk!')).toBeNull();
    });
  });

  it('snoozes until tomorrow and stores the timestamp', async () => {
    const user = userEvent.setup();

    render(
      <StreakReminderBanner
        atRiskHabits={[BASE_NOTIFICATION]}
      />
    );

    const snoozeButton = await screen.findByText('Snooze tomorrow');
    await user.click(snoozeButton);

    const stored = localStorage.getItem('streakReminderSnoozedUntil');
    expect(stored).not.toBeNull();

    const storedDate = new Date(stored!);
    const diffMs = storedDate.getTime() - Date.now();
    expect(diffMs).toBeGreaterThan(20 * 60 * 60 * 1000);
    expect(diffMs).toBeLessThan(28 * 60 * 60 * 1000);
  });

  it('invokes schedule rescue when CTA clicked', async () => {
    const user = userEvent.setup();
    const onScheduleRescue = vi.fn();

    render(
      <StreakReminderBanner
        atRiskHabits={[BASE_NOTIFICATION]}
        onScheduleRescue={onScheduleRescue}
      />
    );

    const rescueButton = await screen.findByText('Schedule rescue block');
    await user.click(rescueButton);

    expect(onScheduleRescue).toHaveBeenCalledWith('habit-1');
  });
});
