/**
 * Compact habit reminder toggles for /habits (mirrors Settings; instant save).
 */

'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useUser } from '@/hooks/useUser';
import { Panel } from '@/components/ui';

export function HabitNotificationPrefs() {
  const { user, loading, updatePreferences } = useUser();
  const [notifyStreakAtRisk, setNotifyStreakAtRisk] = useState(false);
  const [notifyMissedHighPriority, setNotifyMissedHighPriority] = useState(false);
  const [savingKey, setSavingKey] = useState<'streak' | 'missed' | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    setNotifyStreakAtRisk(user.notifyStreakAtRisk ?? false);
    setNotifyMissedHighPriority(user.notifyMissedHighPriority ?? false);
  }, [user]);

  const persist = async (
    key: 'streak' | 'missed',
    nextStreak: boolean,
    nextMissed: boolean
  ) => {
    setSavingKey(key);
    setError(null);
    try {
      await updatePreferences({
        notifyStreakAtRisk: nextStreak,
        notifyMissedHighPriority: nextMissed,
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not save preferences');
      if (user) {
        setNotifyStreakAtRisk(user.notifyStreakAtRisk ?? false);
        setNotifyMissedHighPriority(user.notifyMissedHighPriority ?? false);
      }
    } finally {
      setSavingKey(null);
    }
  };

  if (loading || !user) {
    return null;
  }

  return (
    <Panel className="border border-slate-200 bg-slate-50/80">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h3 className="text-sm font-semibold text-slate-900">Habit reminders</h3>
          <p className="mt-1 text-xs text-slate-600">
            Opt in to in-app reminders. You can change these anytime.
          </p>
        </div>
        <Link
          href="/settings#habit-notifications"
          className="shrink-0 text-sm font-medium text-primary-600 hover:text-primary-700 hover:underline"
        >
          All settings
        </Link>
      </div>

      <div className="mt-4 space-y-3">
        <label className="flex cursor-pointer items-start gap-3">
          <input
            type="checkbox"
            className="mt-0.5 h-4 w-4 rounded border-slate-300 text-primary-600 focus:ring-primary-500"
            checked={notifyStreakAtRisk}
            disabled={savingKey !== null}
            onChange={(e) => {
              const checked = e.target.checked;
              setNotifyStreakAtRisk(checked);
              void persist('streak', checked, notifyMissedHighPriority);
            }}
          />
          <span className="text-sm text-slate-800">
            <span className="font-medium">Streak-at-risk</span>
            <span className="mt-0.5 block text-xs text-slate-500">
              Nudge when a streak will break if you don&apos;t complete today
            </span>
          </span>
        </label>

        <label className="flex cursor-pointer items-start gap-3">
          <input
            type="checkbox"
            className="mt-0.5 h-4 w-4 rounded border-slate-300 text-primary-600 focus:ring-primary-500"
            checked={notifyMissedHighPriority}
            disabled={savingKey !== null}
            onChange={(e) => {
              const checked = e.target.checked;
              setNotifyMissedHighPriority(checked);
              void persist('missed', notifyStreakAtRisk, checked);
            }}
          />
          <span className="text-sm text-slate-800">
            <span className="font-medium">Missed high-priority habit</span>
            <span className="mt-0.5 block text-xs text-slate-500">
              Heads-up when a top-priority habit was missed (after the grace window)
            </span>
          </span>
        </label>
      </div>

      {error && <p className="mt-3 text-xs text-red-600">{error}</p>}
    </Panel>
  );
}
