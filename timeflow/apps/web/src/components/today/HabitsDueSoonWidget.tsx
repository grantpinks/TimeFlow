/**
 * Habits Due Soon — next scheduled habit block within 60 minutes (or in progress).
 * Sprint 18.24
 */

'use client';

import { useMemo, useState, useEffect } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { Flame, Calendar } from 'lucide-react';
import type { CalendarEvent, Habit } from '@timeflow/shared';

const WINDOW_MS = 60 * 60 * 1000;

type PickResult =
  | {
      event: CalendarEvent;
      kind: 'in-progress';
      msRemaining: number;
    }
  | {
      event: CalendarEvent;
      kind: 'starting-soon';
      msUntilStart: number;
    };

function habitEventsForFilter(
  events: CalendarEvent[],
  habits: Habit[],
  identityFilter: string | null
): CalendarEvent[] {
  return events.filter((e) => {
    if (e.sourceType !== 'habit' || e.isCompleted || !e.sourceId) return false;
    if (!identityFilter) return true;
    const hid = e.habitId;
    if (!hid) return false;
    const h = habits.find((x) => x.id === hid);
    return h?.identityId === identityFilter;
  });
}

function pickNextHabitDueSoon(
  events: CalendarEvent[],
  habits: Habit[],
  identityFilter: string | null,
  now: Date
): PickResult | null {
  const list = habitEventsForFilter(events, habits, identityFilter);
  const t = now.getTime();

  let inProgress: { event: CalendarEvent; end: number } | null = null;
  for (const e of list) {
    const start = new Date(e.start).getTime();
    const end = new Date(e.end).getTime();
    if (t >= start && t < end) {
      if (!inProgress || end < inProgress.end) {
        inProgress = { event: e, end };
      }
    }
  }
  if (inProgress) {
    return {
      event: inProgress.event,
      kind: 'in-progress',
      msRemaining: Math.max(0, inProgress.end - t),
    };
  }

  let best: { event: CalendarEvent; start: number } | null = null;
  for (const e of list) {
    const start = new Date(e.start).getTime();
    if (start > t && start <= t + WINDOW_MS) {
      if (!best || start < best.start) {
        best = { event: e, start };
      }
    }
  }
  if (best) {
    return {
      event: best.event,
      kind: 'starting-soon',
      msUntilStart: best.start - t,
    };
  }

  return null;
}

function formatCountdown(ms: number): string {
  if (ms <= 0) return '0:00';
  const totalSec = Math.ceil(ms / 1000);
  const m = Math.floor(totalSec / 60);
  const s = totalSec % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

export interface HabitsDueSoonWidgetProps {
  events: CalendarEvent[];
  habits: Habit[];
  identityFilter: string | null;
  className?: string;
  onCompleteHabit?: (scheduledHabitId: string) => void;
  completingId?: string | null;
}

export function HabitsDueSoonWidget({
  events,
  habits,
  identityFilter,
  className = '',
  onCompleteHabit,
  completingId,
}: HabitsDueSoonWidgetProps) {
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  const picked = useMemo(
    () => pickNextHabitDueSoon(events, habits, identityFilter, now),
    [events, habits, identityFilter, now]
  );

  if (!picked) return null;

  const label =
    picked.kind === 'in-progress'
      ? `${formatCountdown(picked.msRemaining)} left`
      : `starts in ${formatCountdown(picked.msUntilStart)}`;

  const { event } = picked;
  const title = event.summary?.trim() || 'Habit';
  const scheduledHabitId = event.sourceId!;

  return (
    <motion.div
      initial={{ opacity: 0, y: -6 }}
      animate={{ opacity: 1, y: 0 }}
      className={`rounded-xl border-2 border-emerald-200 bg-gradient-to-br from-emerald-50 to-teal-50/90 p-4 shadow-md ${className}`}
    >
      <div className="flex items-start gap-3">
        <div className="flex-shrink-0 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 p-2.5 text-white shadow-md">
          <Flame className="h-5 w-5" aria-hidden />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-semibold uppercase tracking-wide text-emerald-800">
              Habit due soon
            </span>
            <span className="rounded-full bg-white/80 px-2 py-0.5 font-mono text-xs font-semibold tabular-nums text-emerald-900">
              {label}
            </span>
          </div>
          <p className="mt-1 truncate text-base font-semibold text-slate-900">{title}</p>
          <p className="mt-0.5 text-xs text-slate-600">
            {picked.kind === 'in-progress' ? 'In progress — wrap up or mark done.' : 'Starting within the hour.'}
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            {onCompleteHabit && (
              <button
                type="button"
                onClick={() => onCompleteHabit(scheduledHabitId)}
                disabled={!!completingId}
                className="rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white shadow-sm transition-colors hover:bg-emerald-700 disabled:opacity-50"
              >
                {completingId === scheduledHabitId ? '…' : 'Mark done'}
              </button>
            )}
            <Link
              href="/calendar"
              className="inline-flex items-center gap-1 rounded-lg border border-emerald-300 bg-white/90 px-3 py-1.5 text-xs font-semibold text-emerald-900 transition-colors hover:bg-emerald-50"
            >
              <Calendar className="h-3.5 w-3.5" aria-hidden />
              Calendar
            </Link>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
