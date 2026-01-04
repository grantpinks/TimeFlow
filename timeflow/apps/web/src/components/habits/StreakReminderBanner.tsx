/**
 * Streak Reminder Banner
 *
 * Displays an in-app reminder when a habit streak is at risk.
 * Shows on /habits and /today pages with CTA to take action.
 */

'use client';

import { useState } from 'react';
import type { PerHabitInsights } from '@timeflow/shared';

interface StreakReminderBannerProps {
  atRiskHabits: PerHabitInsights[];
  onScheduleRescue?: (habitId: string) => void;
  onCompleteNow?: (habitId: string) => void;
}

export function StreakReminderBanner({
  atRiskHabits,
  onScheduleRescue,
  onCompleteNow,
}: StreakReminderBannerProps) {
  const [dismissed, setDismissed] = useState(false);
  const [snoozedUntil, setSnoozedUntil] = useState<Date | null>(null);

  // Don't show if dismissed or snoozed
  if (dismissed || (snoozedUntil && snoozedUntil > new Date())) {
    return null;
  }

  // Don't show if no habits at risk
  if (atRiskHabits.length === 0) {
    return null;
  }

  const handleSnooze = (hours: number) => {
    const snoozeUntil = new Date();
    snoozeUntil.setHours(snoozeUntil.getHours() + hours);
    setSnoozedUntil(snoozeUntil);

    // Store in localStorage for persistence
    localStorage.setItem('streakReminderSnoozedUntil', snoozeUntil.toISOString());
  };

  const handleDismiss = () => {
    setDismissed(true);
    // Store in localStorage for session persistence
    localStorage.setItem('streakReminderDismissed', 'true');
  };

  // Show the first at-risk habit
  const habit = atRiskHabits[0];

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
              {habit.streak.current} days
            </span>
          </div>

          <p className="text-sm text-red-800 mb-3">
            Your {habit.streak.current}-day streak for <span className="font-semibold">{habit.habitTitle}</span> will break if you don't complete it today. Don't lose your progress!
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
                onClick={() => handleSnooze(1)}
                className="text-xs text-red-700 hover:text-red-900 underline"
              >
                Snooze 1h
              </button>
              <span className="text-red-300">|</span>
              <button
                onClick={() => handleSnooze(3)}
                className="text-xs text-red-700 hover:text-red-900 underline"
              >
                Snooze 3h
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
