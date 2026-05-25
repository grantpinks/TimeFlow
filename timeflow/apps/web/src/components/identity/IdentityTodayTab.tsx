'use client';

import { useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { HabitConsistencyEntry, ScheduledHabitInstance } from '@timeflow/shared';
import { HabitSchedulePopover } from './HabitSchedulePopover';

interface IdentityTodayTabProps {
  habits: HabitConsistencyEntry[];
  loading?: boolean;
  /** Today's completions and minutes from identity progress */
  todayDone: number;
  todayMinutes: number;
  /** Current streak in days for the selected identity */
  streakDays?: number;
  /** Scheduled habit instances for today */
  scheduledInstances?: ScheduledHabitInstance[];
  /** Call to schedule a habit at a given time */
  onScheduleHabit?: (
    habitId: string,
    title: string,
    startISO: string,
    durationMinutes: number
  ) => Promise<void>;
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

/** Format ISO datetime to "h:mmam/pm" in local time */
function fmtScheduledTime(iso: string): string {
  const d = new Date(iso);
  let h = d.getHours();
  const m = String(d.getMinutes()).padStart(2, '0');
  const ampm = h >= 12 ? 'pm' : 'am';
  h = h % 12 || 12;
  return m === '00' ? `${h}${ampm}` : `${h}:${m}${ampm}`;
}

export function IdentityTodayTab({
  habits,
  loading = false,
  todayDone,
  todayMinutes,
  streakDays = 0,
  scheduledInstances = [],
  onScheduleHabit,
}: IdentityTodayTabProps) {
  // Use local calendar date, not UTC — toISOString() returns UTC which can be
  // off by one day for users in UTC−N timezones late in the evening.
  const todayStr = new Date().toLocaleDateString('en-CA');

  const [openPopoverHabitId, setOpenPopoverHabitId] = useState<string | null>(null);

  // Map habitId → its first scheduled instance today (if any)
  const scheduledByHabitId = useMemo(() => {
    const map = new Map<string, ScheduledHabitInstance>();
    for (const inst of scheduledInstances) {
      if (!map.has(inst.habitId)) {
        map.set(inst.habitId, inst);
      }
    }
    return map;
  }, [scheduledInstances]);

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

  // Show plan column only when scheduling is available
  const showPlanColumn = !!onScheduleHabit;

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

      {/* Consistency ribbon + Today's plan — two columns */}
      <div>
        <div className="mb-2 flex items-center justify-between">
          <p className="text-[11px] font-bold uppercase tracking-widest text-slate-500">
            Habit consistency · last 7 days
          </p>
          {showPlanColumn && (
            <p className="text-[11px] font-bold uppercase tracking-widest text-slate-500">
              Today's plan
            </p>
          )}
        </div>

        <ul className="space-y-2">
          {habits.map((h) => {
            const rate = h.elapsedDays > 0 ? h.completionCount / h.elapsedDays : 0;
            const pct = Math.round(rate * 100);
            const scheduled = scheduledByHabitId.get(h.habitId);
            const todayIdx = h.dates.indexOf(todayStr);
            const doneToday = todayIdx !== -1 && h.completions[todayIdx];
            const isPopoverOpen = openPopoverHabitId === h.habitId;

            return (
              <motion.li
                key={h.habitId}
                initial={{ opacity: 0, x: -4 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.25 }}
                className="flex items-center gap-3"
              >
                {/* Left: ribbon */}
                <div className={`flex items-center gap-3 ${showPlanColumn ? 'min-w-0 flex-1' : 'w-full'}`}>
                  <span className="w-28 shrink-0 truncate text-xs font-medium text-slate-700">
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
                  <span className="w-7 shrink-0 text-right text-[10px] tabular-nums text-slate-500">
                    {h.completionCount}/{h.elapsedDays}
                  </span>

                  {/* Mini bar — hidden when plan column is showing to save space */}
                  {!showPlanColumn && (
                    <div className="h-1.5 w-16 overflow-hidden rounded-full bg-slate-100">
                      <div
                        className="h-full rounded-full bg-teal-400 transition-all duration-500"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  )}
                </div>

                {/* Right: plan column */}
                {showPlanColumn && (
                  <div className="relative w-28 shrink-0 flex justify-end">
                    {doneToday ? (
                      <span className="flex items-center gap-1 text-xs font-semibold text-teal-600">
                        <svg className="h-3 w-3" viewBox="0 0 20 20" fill="currentColor" aria-hidden>
                          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                        </svg>
                        Done
                      </span>
                    ) : scheduled ? (
                      <span className="flex items-center gap-1 rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 text-[11px] font-semibold text-slate-600">
                        🕐 {fmtScheduledTime(scheduled.startDateTime)}
                      </span>
                    ) : (
                      <button
                        type="button"
                        onClick={() =>
                          setOpenPopoverHabitId(isPopoverOpen ? null : h.habitId)
                        }
                        className="flex items-center gap-1 rounded-full border border-dashed border-slate-300 bg-white px-2 py-0.5 text-[11px] font-semibold text-slate-500 transition-colors hover:border-teal-400 hover:text-teal-700"
                      >
                        <svg className="h-3 w-3" viewBox="0 0 20 20" fill="currentColor" aria-hidden>
                          <path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" />
                        </svg>
                        Schedule
                      </button>
                    )}

                    <AnimatePresence>
                      {isPopoverOpen && onScheduleHabit && (
                        <HabitSchedulePopover
                          habitId={h.habitId}
                          habitTitle={h.habitName}
                          onScheduled={async (startISO, durMin) => {
                            await onScheduleHabit(h.habitId, h.habitName, startISO, durMin);
                          }}
                          onClose={() => setOpenPopoverHabitId(null)}
                        />
                      )}
                    </AnimatePresence>
                  </div>
                )}
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
