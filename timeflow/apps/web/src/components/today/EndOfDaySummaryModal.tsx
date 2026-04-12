/**
 * End-of-day summary: completions today + identity totals + tomorrow preview (18.34).
 */

'use client';

import { useEffect, useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { CalendarEvent, IdentityProgressResponse, Task } from '@timeflow/shared';
import * as api from '@/lib/api';
import { hexWithOpacity } from '@/lib/identityConstants';

function startOfLocalDay(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

function isSameLocalDay(iso: string, day: Date): boolean {
  const x = new Date(iso);
  return (
    x.getFullYear() === day.getFullYear() &&
    x.getMonth() === day.getMonth() &&
    x.getDate() === day.getDate()
  );
}

function isTomorrow(iso: string, from: Date): boolean {
  const t = startOfLocalDay(from);
  t.setDate(t.getDate() + 1);
  return isSameLocalDay(iso, t);
}

export interface EndOfDaySummaryModalProps {
  open: boolean;
  onClose: () => void;
  tasks: Task[];
  /** Today’s calendar events (same window as Today page). */
  eventsToday: CalendarEvent[];
  identityProgress: IdentityProgressResponse | null;
  dateLabel: string;
}

export function EndOfDaySummaryModal({
  open,
  onClose,
  tasks,
  eventsToday,
  identityProgress,
  dateLabel,
}: EndOfDaySummaryModalProps) {
  const [tomorrowEvents, setTomorrowEvents] = useState<CalendarEvent[]>([]);
  const [tomorrowLoading, setTomorrowLoading] = useState(false);

  useEffect(() => {
    if (!open) return;
    const now = new Date();
    const start = startOfLocalDay(now);
    start.setDate(start.getDate() + 1);
    const end = new Date(start);
    end.setDate(end.getDate() + 1);

    let cancelled = false;
    setTomorrowLoading(true);
    api
      .getCalendarEvents(start.toISOString(), end.toISOString())
      .then((ev) => {
        if (!cancelled) {
          setTomorrowEvents(
            [...ev].sort((a, b) => new Date(a.start).getTime() - new Date(b.start).getTime())
          );
        }
      })
      .catch(() => {
        if (!cancelled) setTomorrowEvents([]);
      })
      .finally(() => {
        if (!cancelled) setTomorrowLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  const completedTasksToday = useMemo(() => {
    const today = new Date();
    return tasks.filter(
      (t) => t.status === 'completed' && isSameLocalDay(t.updatedAt, today)
    );
  }, [tasks]);

  const completedHabitsToday = useMemo(() => {
    const today = new Date();
    return eventsToday.filter(
      (e) =>
        e.sourceType === 'habit' &&
        e.isCompleted &&
        isSameLocalDay(e.start, today)
    );
  }, [eventsToday]);

  const tasksDueTomorrow = useMemo(() => {
    const ref = new Date();
    return tasks.filter(
      (t) =>
        t.status !== 'completed' &&
        t.dueDate &&
        isTomorrow(t.dueDate, ref)
    );
  }, [tasks]);

  const identities = identityProgress?.identities ?? [];
  const totalDone =
    identities.length > 0
      ? identities.reduce((s, i) => s + i.completedCount, 0)
      : completedTasksToday.length + completedHabitsToday.length;

  const formatTime = (iso: string) =>
    new Date(iso).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-end justify-center p-4 sm:items-center"
          style={{ backgroundColor: 'rgba(15, 23, 42, 0.45)' }}
          onClick={onClose}
        >
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 16 }}
            transition={{ type: 'spring', stiffness: 380, damping: 32 }}
            className="max-h-[90vh] w-full max-w-lg overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-labelledby="eod-summary-title"
          >
            <div className="border-b border-slate-100 bg-gradient-to-r from-primary-50/80 to-white px-5 py-4 sm:px-6">
              <p className="text-xs font-semibold uppercase tracking-wide text-primary-700">
                Day in review
              </p>
              <h2 id="eod-summary-title" className="text-xl font-bold text-slate-900">
                Summary
              </h2>
              <p className="mt-0.5 text-sm text-slate-600">{dateLabel}</p>
            </div>

            <div className="max-h-[60vh] space-y-5 overflow-y-auto px-5 py-4 sm:px-6">
              <section>
                <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Completed today
                </h3>
                <div className="mt-2 flex flex-wrap gap-3 text-sm">
                  <span className="rounded-lg bg-slate-100 px-3 py-1.5 font-medium text-slate-800">
                    {completedTasksToday.length} task{completedTasksToday.length === 1 ? '' : 's'}
                  </span>
                  <span className="rounded-lg bg-emerald-50 px-3 py-1.5 font-medium text-emerald-900">
                    {completedHabitsToday.length} habit
                    {completedHabitsToday.length === 1 ? '' : 's'}
                  </span>
                </div>
                {completedTasksToday.length > 0 && (
                  <ul className="mt-2 space-y-1 text-sm text-slate-700">
                    {completedTasksToday.slice(0, 8).map((t) => (
                      <li key={t.id} className="flex items-center gap-2">
                        <span className="text-green-600">✓</span>
                        <span className="truncate">{t.title}</span>
                      </li>
                    ))}
                    {completedTasksToday.length > 8 && (
                      <li className="text-slate-500">
                        +{completedTasksToday.length - 8} more
                      </li>
                    )}
                  </ul>
                )}
              </section>

              {identities.length > 0 && (
                <section>
                  <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Identity progress
                  </h3>
                  <div className="mt-2 space-y-2">
                    {identities.map((row) => (
                      <div
                        key={row.identityId}
                        className="flex items-center justify-between rounded-lg border px-3 py-2 text-sm"
                        style={{
                          background: hexWithOpacity(row.color, 0.08),
                          borderColor: hexWithOpacity(row.color, 0.25),
                        }}
                      >
                        <span className="flex items-center gap-2 font-medium text-slate-900">
                          <span>{row.icon}</span>
                          {row.name}
                        </span>
                        <span className="text-slate-600">
                          {row.completedCount} done
                          {row.totalMinutes > 0 ? ` · ${row.totalMinutes} min` : ''}
                        </span>
                      </div>
                    ))}
                  </div>
                </section>
              )}

              <section>
                <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Tomorrow
                </h3>
                {tomorrowLoading ? (
                  <p className="mt-2 text-sm text-slate-500">Loading calendar…</p>
                ) : tomorrowEvents.length === 0 ? (
                  <p className="mt-2 text-sm text-slate-600">
                    Nothing on the calendar yet. You&apos;re clear to plan.
                  </p>
                ) : (
                  <ul className="mt-2 space-y-2">
                    {tomorrowEvents.slice(0, 12).map((ev) => (
                      <li
                        key={`${ev.id ?? ev.start}-${ev.summary}`}
                        className="flex gap-2 text-sm text-slate-800"
                      >
                        <span className="shrink-0 tabular-nums text-slate-500">
                          {formatTime(ev.start)}
                        </span>
                        <span className="min-w-0 truncate">{ev.summary || 'Event'}</span>
                      </li>
                    ))}
                    {tomorrowEvents.length > 12 && (
                      <li className="text-slate-500">
                        +{tomorrowEvents.length - 12} more events
                      </li>
                    )}
                  </ul>
                )}
                {tasksDueTomorrow.length > 0 && (
                  <div className="mt-3 rounded-lg border border-amber-100 bg-amber-50/80 px-3 py-2">
                    <p className="text-xs font-semibold uppercase text-amber-900">
                      Due tomorrow
                    </p>
                    <ul className="mt-1 space-y-0.5 text-sm text-amber-950">
                      {tasksDueTomorrow.slice(0, 5).map((t) => (
                        <li key={t.id} className="truncate">
                          {t.title}
                        </li>
                      ))}
                      {tasksDueTomorrow.length > 5 && (
                        <li className="text-amber-800">
                          +{tasksDueTomorrow.length - 5} more
                        </li>
                      )}
                    </ul>
                  </div>
                )}
              </section>
            </div>

            <div className="border-t border-slate-100 bg-slate-50/80 px-5 py-4 sm:px-6">
              <p className="mb-3 text-center text-xs text-slate-500">
                {totalDone > 0
                  ? `Nice work — ${totalDone} completion${totalDone === 1 ? '' : 's'} tracked across identities today.`
                  : 'Every day is a fresh start.'}
              </p>
              <button
                type="button"
                onClick={onClose}
                className="w-full rounded-xl bg-slate-900 py-3 text-sm font-semibold text-white transition hover:bg-slate-800"
              >
                Close
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
