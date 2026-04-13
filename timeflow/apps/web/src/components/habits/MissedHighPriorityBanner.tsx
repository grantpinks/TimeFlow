/**
 * In-app banner when a high-priority habit was missed (opt-in via notifyMissedHighPriority).
 */

'use client';

import { useEffect, useRef, useState } from 'react';
import type { MissedHabitNotification } from '@timeflow/shared';
import { track, hashHabitId } from '@/lib/analytics';

const RATE_LIMIT_MS = 4 * 60 * 60 * 1000;
const STORAGE_KEYS = {
  snoozedUntil: 'missedHighPriorityReminderSnoozedUntil',
  dismissed: 'missedHighPriorityReminderDismissed',
  lastShownAt: 'missedHighPriorityReminderLastShownAt',
};

interface MissedHighPriorityBannerProps {
  missedHabits: MissedHabitNotification[];
  onScheduleRescue?: (habitId: string) => void;
  onOpenCalendar?: () => void;
}

export function MissedHighPriorityBanner({
  missedHabits,
  onScheduleRescue,
  onOpenCalendar,
}: MissedHighPriorityBannerProps) {
  const lastShownAtRef = useRef<Date | null>(null);
  const [dismissed, setDismissed] = useState(false);
  const [snoozedUntil, setSnoozedUntil] = useState<Date | null>(null);
  const [isHydrated, setIsHydrated] = useState(false);
  const [hasShown, setHasShown] = useState(false);

  useEffect(() => {
    const dismissedValue = localStorage.getItem(STORAGE_KEYS.dismissed);
    if (dismissedValue === 'true') {
      setDismissed(true);
    }

    const snoozedValue = localStorage.getItem(STORAGE_KEYS.snoozedUntil);
    if (snoozedValue) {
      const parsed = new Date(snoozedValue);
      if (!Number.isNaN(parsed.getTime())) {
        setSnoozedUntil(parsed);
      }
    }

    const lastShownValue = localStorage.getItem(STORAGE_KEYS.lastShownAt);
    if (lastShownValue) {
      const parsed = new Date(lastShownValue);
      if (!Number.isNaN(parsed.getTime())) {
        lastShownAtRef.current = parsed;
      }
    }

    setIsHydrated(true);
  }, []);

  const isSnoozed = snoozedUntil && snoozedUntil > new Date();
  const isRateLimited =
    !hasShown &&
    lastShownAtRef.current &&
    Date.now() - lastShownAtRef.current.getTime() < RATE_LIMIT_MS;

  const handleSnooze = (until: Date) => {
    setSnoozedUntil(until);
    localStorage.setItem(STORAGE_KEYS.snoozedUntil, until.toISOString());
  };

  const handleDismiss = () => {
    setDismissed(true);
    localStorage.setItem(STORAGE_KEYS.dismissed, 'true');
  };

  const habit = missedHabits[0];

  useEffect(() => {
    if (
      !isHydrated ||
      hasShown ||
      dismissed ||
      isSnoozed ||
      isRateLimited ||
      missedHabits.length === 0
    ) {
      return;
    }

    const now = new Date();
    localStorage.setItem(STORAGE_KEYS.lastShownAt, now.toISOString());
    lastShownAtRef.current = now;
    setHasShown(true);

    track('habits.notification.missed_banner.shown', {
      count: missedHabits.length,
    });
  }, [isHydrated, hasShown, dismissed, isSnoozed, isRateLimited, missedHabits.length]);

  if (!isHydrated) {
    return null;
  }

  if (dismissed || isSnoozed || isRateLimited) {
    return null;
  }

  if (missedHabits.length === 0 || !habit) {
    return null;
  }

  const logAction = (
    action: 'rescue' | 'calendar' | 'snooze_1h' | 'snooze_3h' | 'snooze_tomorrow' | 'dismiss'
  ) => {
    track('habits.notification.missed_banner.action', {
      action,
      habit_id_hash: hashHabitId(habit.habitId),
    });
  };

  return (
    <div className="rounded-lg border-l-4 border-violet-500 bg-gradient-to-r from-violet-50 to-indigo-50 p-4 shadow-md">
      <div className="flex items-start gap-3">
        <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-violet-600">
          <span className="text-xl text-white" aria-hidden>
            ⚠️
          </span>
        </div>

        <div className="min-w-0 flex-1">
          <div className="mb-1 flex flex-wrap items-center gap-2">
            <h3 className="font-bold text-violet-950">High-priority habit missed</h3>
            <span className="rounded bg-violet-100 px-2 py-0.5 text-xs font-semibold text-violet-800">
              P{habit.priorityRank}
            </span>
          </div>

          <p className="mb-3 text-sm text-violet-900">
            {habit.message.trim() ? (
              habit.message
            ) : (
              <>
                <span className="font-semibold">{habit.habitTitle}</span> slipped past its window. Reschedule a
                block or open your calendar.
              </>
            )}
          </p>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => {
                logAction('rescue');
                onScheduleRescue?.(habit.habitId);
              }}
              className="rounded-lg bg-violet-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-violet-700"
            >
              Schedule rescue block
            </button>

            <button
              type="button"
              onClick={() => {
                logAction('calendar');
                onOpenCalendar?.();
              }}
              className="rounded-lg border border-violet-300 bg-white px-4 py-2 text-sm font-medium text-violet-900 transition-colors hover:bg-violet-50"
            >
              Open calendar
            </button>

            <div className="ml-auto flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  const snoozeUntil = new Date();
                  snoozeUntil.setHours(snoozeUntil.getHours() + 1);
                  logAction('snooze_1h');
                  handleSnooze(snoozeUntil);
                }}
                className="text-xs text-violet-800 underline hover:text-violet-950"
              >
                Snooze 1h
              </button>
              <span className="text-violet-300">|</span>
              <button
                type="button"
                onClick={() => {
                  const snoozeUntil = new Date();
                  snoozeUntil.setHours(snoozeUntil.getHours() + 3);
                  logAction('snooze_3h');
                  handleSnooze(snoozeUntil);
                }}
                className="text-xs text-violet-800 underline hover:text-violet-950"
              >
                Snooze 3h
              </button>
              <span className="text-violet-300">|</span>
              <button
                type="button"
                onClick={() => {
                  const snoozeUntil = new Date();
                  snoozeUntil.setDate(snoozeUntil.getDate() + 1);
                  logAction('snooze_tomorrow');
                  handleSnooze(snoozeUntil);
                }}
                className="text-xs text-violet-800 underline hover:text-violet-950"
              >
                Snooze tomorrow
              </button>
              <span className="text-violet-300">|</span>
              <button
                type="button"
                onClick={() => {
                  logAction('dismiss');
                  handleDismiss();
                }}
                className="text-xs text-violet-800 underline hover:text-violet-950"
              >
                Dismiss
              </button>
            </div>
          </div>
        </div>

        <button
          type="button"
          onClick={() => {
            logAction('dismiss');
            handleDismiss();
          }}
          className="flex-shrink-0 text-violet-400 transition-colors hover:text-violet-600"
          aria-label="Dismiss reminder"
        >
          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      {missedHabits.length > 1 && (
        <div className="mt-3 border-t border-violet-200 pt-3">
          <p className="text-xs text-violet-800">
            + {missedHabits.length - 1} more high-priority{' '}
            {missedHabits.length - 1 === 1 ? 'habit' : 'habits'} missed recently
          </p>
        </div>
      )}
    </div>
  );
}
