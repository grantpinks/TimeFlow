'use client';

import { useMemo } from 'react';
import { motion } from 'framer-motion';
import type { HabitConsistencyEntry } from '@timeflow/shared';

interface IdentityTodayTabProps {
  habits: HabitConsistencyEntry[];
  loading?: boolean;
  /** Today's completions and minutes from identity progress */
  todayDone: number;
  todayMinutes: number;
  /** Current streak in days for the selected identity */
  streakDays?: number;
}

function fmtMinutes(m: number): string {
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  const rem = m % 60;
  return rem > 0 ? `${h}h ${rem}m` : `${h}h`;
}

/** Returns day-of-week label for a YYYY-MM-DD string */
function dayLabel(dateStr: string): string {
  const d = new Date(dateStr + 'T12:00:00');
  return ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'][d.getDay()];
}

export function IdentityTodayTab({
  habits,
  loading = false,
  todayDone,
  todayMinutes,
  streakDays = 0,
}: IdentityTodayTabProps) {
  const todayStr = new Date().toISOString().split('T')[0];

  const notDoneToday = useMemo(
    () =>
      habits.filter((h) => {
        const todayIdx = h.dates.indexOf(todayStr);
        return todayIdx !== -1 && !h.completions[todayIdx];
      }),
    [habits, todayStr]
  );

  if (loading) {
    return <div className="h-40 animate-pulse rounded-xl bg-slate-100" />;
  }

  if (habits.length === 0) {
    return (
      <div className="py-6 text-center text-sm text-slate-500">
        No habits linked to this identity yet.{' '}
        <a href="/habits" className="text-teal-600 underline-offset-2 hover:underline">
          Add one
        </a>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Summary row */}
      <div className="flex flex-wrap items-center gap-2 text-sm">
        <span className="flex items-center gap-1 rounded-md bg-teal-50 px-2 py-0.5 font-semibold text-teal-800">
          <svg className="h-3.5 w-3.5" viewBox="0 0 20 20" fill="currentColor" aria-hidden>
            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
          </svg>
          {todayDone} done
        </span>
        {todayMinutes > 0 && (
          <span className="rounded-md bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-700">
            ⏱ {fmtMinutes(todayMinutes)}
          </span>
        )}
        {streakDays >= 2 && (
          <span className="rounded-md bg-orange-50 px-2 py-0.5 text-xs font-semibold text-orange-700">
            🔥 {streakDays}-day streak
          </span>
        )}
      </div>

      {/* Consistency ribbon */}
      <div>
        <p className="mb-2 text-[11px] font-bold uppercase tracking-widest text-slate-500">
          Habit consistency · last 7 days
        </p>
        <ul className="space-y-2">
          {habits.map((h) => {
            const rate = h.elapsedDays > 0 ? h.completionCount / h.elapsedDays : 0;
            const pct = Math.round(rate * 100);
            return (
              <motion.li
                key={h.habitId}
                initial={{ opacity: 0, x: -4 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.25 }}
                className="flex items-center gap-3"
              >
                {/* Habit name */}
                <span className="w-36 shrink-0 truncate text-xs font-medium text-slate-700">
                  {h.habitName}
                </span>

                {/* 7-day dot grid */}
                <div className="flex items-center gap-1">
                  {h.dates.map((date, i) => {
                    const isToday = date === todayStr;
                    const done = h.completions[i];
                    const isFuture = date > todayStr;
                    return (
                      <div
                        key={date}
                        title={`${date}: ${done ? 'done' : isFuture ? 'upcoming' : 'missed'}`}
                        className={`h-5 w-5 rounded-full border text-center text-[9px] font-bold leading-5 ${
                          done
                            ? 'border-teal-400 bg-teal-400 text-white'
                            : isFuture
                            ? 'border-slate-200 bg-slate-50 text-slate-400'
                            : 'border-slate-200 bg-white text-slate-400'
                        } ${isToday ? 'ring-2 ring-teal-300 ring-offset-1' : ''}`}
                      >
                        {done ? '✓' : dayLabel(date)[0]}
                      </div>
                    );
                  })}
                </div>

                {/* Rate */}
                <span className="w-8 shrink-0 text-right text-[10px] tabular-nums text-slate-500">
                  {h.completionCount}/{h.elapsedDays}
                </span>

                {/* Mini bar */}
                <div className="h-1.5 w-16 overflow-hidden rounded-full bg-slate-100">
                  <div
                    className="h-full rounded-full bg-teal-400 transition-all duration-500"
                    style={{ width: `${pct}%` }}
                  />
                </div>
              </motion.li>
            );
          })}
        </ul>
      </div>

      {/* Not yet done today */}
      {notDoneToday.length > 0 && (
        <div className="rounded-xl border border-amber-100 bg-amber-50/60 px-4 py-3">
          <p className="mb-1.5 text-[11px] font-bold uppercase tracking-widest text-amber-700">
            Still to do today
          </p>
          <ul className="space-y-1">
            {notDoneToday.map((h) => (
              <li key={h.habitId} className="flex items-center gap-2 text-xs text-slate-700">
                <span className="h-1.5 w-1.5 rounded-full bg-amber-400" aria-hidden />
                {h.habitName}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
