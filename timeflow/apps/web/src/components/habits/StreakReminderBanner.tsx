/**
 * Streak Reminder Banner
 *
 * Displays an in-app reminder when a habit streak is at risk.
 * Shows on /habits and /today pages with CTA to take action.
 */

'use client';

import { useEffect, useRef, useState } from 'react';
import type { StreakAtRiskNotification } from '@timeflow/shared';

const RATE_LIMIT_MS = 4 * 60 * 60 * 1000;
const STORAGE_KEYS = {
  snoozedUntil: 'streakReminderSnoozedUntil',
  dismissed: 'streakReminderDismissed',
  lastShownAt: 'streakReminderLastShownAt',
};

interface StreakReminderBannerProps {
  atRiskHabits: StreakAtRiskNotification[];
  onScheduleRescue?: (habitId: string) => void;
  onCompleteNow?: (habitId: string) => void;
}

export function StreakReminderBanner({
  atRiskHabits,
  onScheduleRescue,
  onCompleteNow,
}: StreakReminderBannerProps) {
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

  // Show the first at-risk habit
  const habit = atRiskHabits[0];
  const habitStreak = habit.currentStreak;

  useEffect(() => {
    if (
      !isHydrated ||
      hasShown ||
      dismissed ||
      isSnoozed ||
      isRateLimited ||
      atRiskHabits.length === 0
    ) {
      return;
    }

    const now = new Date();
    localStorage.setItem(STORAGE_KEYS.lastShownAt, now.toISOString());
    lastShownAtRef.current = now;
    setHasShown(true);
  }, [isHydrated, hasShown, dismissed, isSnoozed, isRateLimited, atRiskHabits.length]);

  // Don't show if dismissed or snoozed
  if (!isHydrated) {
    return null;
  }

  if (dismissed || isSnoozed || isRateLimited) {
    return null;
  }

  // Don't show if no habits at risk
  if (atRiskHabits.length === 0) {
    return null;
  }

  return (
    <div className="bg-gradient-to-r from-red-50 to-orange-50 border-l-4 border-red-500 rounded-lg p-4 shadow-md">
      <div className="flex items-start gap-3">
        {/* Icon */}
        <div className="flex-shrink-0 w-10 h-10 bg-red-500 rounded-full flex items-center justify-center">
          <span className="text-white text-xl">🔥</span>
        </div>

        {/* Content */}
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <h3 className="font-bold text-red-900">Streak at Risk!</h3>
            <span className="px-2 py-0.5 bg-red-100 text-red-700 text-xs font-semibold rounded">
              {habitStreak} days
            </span>
          </div>

          <p className="text-sm text-red-800 mb-3">
            Your {habitStreak}-day streak for <span className="font-semibold">{habit.habitTitle}</span> will break if you don&apos;t complete it today. Don&apos;t lose your progress!
          </p>

          {/* Actions */}
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => onScheduleRescue?.(habit.habitId)}
              className="px-4 py-2 bg-red-600 text-white rounded-lg font-semibold text-sm hover:bg-red-700 transition-colors"
            >
              Schedule rescue block
            </button>

            <button
              onClick={() => onCompleteNow?.(habit.habitId)}
              className="px-4 py-2 bg-white border border-red-300 text-red-800 rounded-lg font-medium text-sm hover:bg-red-50 transition-colors"
            >
              Complete now
            </button>

            {/* Snooze/Dismiss */}
            <div className="ml-auto flex items-center gap-2">
              <button
                onClick={() => {
                  const snoozeUntil = new Date();
                  snoozeUntil.setHours(snoozeUntil.getHours() + 1);
                  handleSnooze(snoozeUntil);
                }}
                className="text-xs text-red-700 hover:text-red-900 underline"
              >
                Snooze 1h
              </button>
              <span className="text-red-300">|</span>
              <button
                onClick={() => {
                  const snoozeUntil = new Date();
                  snoozeUntil.setHours(snoozeUntil.getHours() + 3);
                  handleSnooze(snoozeUntil);
                }}
                className="text-xs text-red-700 hover:text-red-900 underline"
              >
                Snooze 3h
              </button>
              <span className="text-red-300">|</span>
              <button
                onClick={() => {
                  const snoozeUntil = new Date();
                  snoozeUntil.setDate(snoozeUntil.getDate() + 1);
                  handleSnooze(snoozeUntil);
                }}
                className="text-xs text-red-700 hover:text-red-900 underline"
              >
                Snooze tomorrow
              </button>
              <span className="text-red-300">|</span>
              <button
                onClick={handleDismiss}
                className="text-xs text-red-700 hover:text-red-900 underline"
              >
                Dismiss
              </button>
            </div>
          </div>
        </div>

        {/* Close button */}
        <button
          onClick={handleDismiss}
          className="flex-shrink-0 text-red-400 hover:text-red-600 transition-colors"
          aria-label="Dismiss reminder"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      {/* Additional at-risk habits indicator */}
      {atRiskHabits.length > 1 && (
        <div className="mt-3 pt-3 border-t border-red-200">
          <p className="text-xs text-red-700">
            + {atRiskHabits.length - 1} more {atRiskHabits.length - 1 === 1 ? 'habit' : 'habits'} at risk today
          </p>
        </div>
      )}
    </div>
  );
}
