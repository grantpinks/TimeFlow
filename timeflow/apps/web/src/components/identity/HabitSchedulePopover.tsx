// apps/web/src/components/identity/HabitSchedulePopover.tsx
'use client';

import { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import * as api from '@/lib/api';
import type { CalendarEvent } from '@timeflow/shared';

interface HabitSchedulePopoverProps {
  habitId: string;
  habitTitle: string;
  /** Default session length in minutes */
  durationMinutes?: number;
  onScheduled: (startISO: string, durationMinutes: number) => Promise<void>;
  onClose: () => void;
}

/** Build quick-time chip options relative to now */
function buildQuickTimes(now: Date): Array<{ label: string; iso: string }> {
  const chips: Array<{ label: string; iso: string }> = [];

  // "Now" — rounded up to next 5 min
  const nowRounded = new Date(now);
  const rem = nowRounded.getMinutes() % 5;
  if (rem !== 0) nowRounded.setMinutes(nowRounded.getMinutes() + (5 - rem));
  nowRounded.setSeconds(0, 0);
  chips.push({ label: 'Now', iso: nowRounded.toISOString() });

  // In 1h, In 2h
  for (const h of [1, 2]) {
    const t = new Date(nowRounded.getTime() + h * 60 * 60 * 1000);
    chips.push({ label: `In ${h}h`, iso: t.toISOString() });
  }

  // Clock-time slots for the rest of today
  const slots = [9, 12, 15, 18, 21];
  for (const hour of slots) {
    const t = new Date(now);
    t.setHours(hour, 0, 0, 0);
    if (t > now) {
      const label = hour < 12 ? `${hour}am` : hour === 12 ? '12pm' : `${hour - 12}pm`;
      chips.push({ label, iso: t.toISOString() });
    }
  }

  return chips.slice(0, 6);
}

/** Format ISO to "h:mm am/pm" in local time */
function fmtTime(iso: string): string {
  const d = new Date(iso);
  let h = d.getHours();
  const m = String(d.getMinutes()).padStart(2, '0');
  const ampm = h >= 12 ? 'pm' : 'am';
  h = h % 12 || 12;
  return `${h}:${m}${ampm}`;
}

/** Convert 24h "HH:MM" input to ISO for today */
function localHHMMtoISO(hhmm: string): string | null {
  const [hStr, mStr] = hhmm.split(':');
  const h = parseInt(hStr, 10);
  const m = parseInt(mStr, 10);
  if (isNaN(h) || isNaN(m) || h < 0 || h > 23 || m < 0 || m > 59) return null;
  const d = new Date();
  d.setHours(h, m, 0, 0);
  return d.toISOString();
}

const TIMELINE_START_HOUR = 6;
const TIMELINE_END_HOUR = 22;
const TIMELINE_MINUTES = (TIMELINE_END_HOUR - TIMELINE_START_HOUR) * 60;

function pctOfTimeline(iso: string): number {
  const d = new Date(iso);
  const minutesSinceStart =
    (d.getHours() - TIMELINE_START_HOUR) * 60 + d.getMinutes();
  return Math.min(100, Math.max(0, (minutesSinceStart / TIMELINE_MINUTES) * 100));
}

export function HabitSchedulePopover({
  habitId: _habitId,
  habitTitle,
  durationMinutes = 30,
  onScheduled,
  onClose,
}: HabitSchedulePopoverProps) {
  const [customTime, setCustomTime] = useState('');
  const [customDuration, setCustomDuration] = useState(String(durationMinutes));
  const [submitting, setSubmitting] = useState(false);
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [eventsLoading, setEventsLoading] = useState(true);
  const ref = useRef<HTMLDivElement>(null);

  const now = new Date();
  const quickTimes = buildQuickTimes(now);

  // Lazy-load today's calendar events for the mini timeline
  useEffect(() => {
    const d = new Date();
    const y = d.getFullYear();
    const mo = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    const from = `${y}-${mo}-${day}T00:00:00`;
    const to = `${y}-${mo}-${day}T23:59:59`;
    api.getCalendarEvents(from, to)
      .then(setEvents)
      .catch(() => setEvents([]))
      .finally(() => setEventsLoading(false));
  }, []);

  // Close on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        onClose();
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [onClose]);

  async function pick(startISO: string, durMin: number) {
    setSubmitting(true);
    try {
      await onScheduled(startISO, durMin);
      onClose();
    } finally {
      setSubmitting(false);
    }
  }

  async function handleCustomSubmit(e: React.FormEvent) {
    e.preventDefault();
    const iso = localHHMMtoISO(customTime);
    const dur = parseInt(customDuration, 10);
    if (!iso || isNaN(dur) || dur < 5) return;
    await pick(iso, dur);
  }

  const nowPct = pctOfTimeline(now.toISOString());

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: -4, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -4, scale: 0.97 }}
      transition={{ duration: 0.15 }}
      className="absolute right-0 bottom-full z-50 mb-1 w-72 rounded-2xl border border-slate-200 bg-white p-4 shadow-xl"
    >
      {/* Header */}
      <div className="mb-3 flex items-center justify-between">
        <p className="text-xs font-bold text-slate-800">Schedule · {habitTitle}</p>
        <button
          type="button"
          onClick={onClose}
          className="rounded-md p-0.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
          aria-label="Close"
        >
          <svg className="h-3.5 w-3.5" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
          </svg>
        </button>
      </div>

      {/* Quick time chips */}
      <div className="mb-3 flex flex-wrap gap-1.5">
        {quickTimes.map((chip) => (
          <button
            key={chip.iso}
            type="button"
            disabled={submitting}
            onClick={() => pick(chip.iso, durationMinutes)}
            className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-semibold text-slate-700 transition-colors hover:border-teal-300 hover:bg-teal-50 hover:text-teal-800 disabled:opacity-50"
          >
            {chip.label}
            <span className="ml-1 text-[10px] font-normal text-slate-400">
              {fmtTime(chip.iso)}
            </span>
          </button>
        ))}
      </div>

      {/* Custom time form */}
      <form onSubmit={handleCustomSubmit} className="mb-3 flex items-center gap-2">
        <input
          type="time"
          value={customTime}
          onChange={(e) => setCustomTime(e.target.value)}
          className="w-28 rounded-lg border border-slate-200 px-2 py-1 text-xs text-slate-800 focus:border-teal-400 focus:outline-none focus:ring-1 focus:ring-teal-300"
        />
        <input
          type="number"
          value={customDuration}
          onChange={(e) => setCustomDuration(e.target.value)}
          min={5}
          max={240}
          className="w-16 rounded-lg border border-slate-200 px-2 py-1 text-xs text-slate-800 focus:border-teal-400 focus:outline-none focus:ring-1 focus:ring-teal-300"
          aria-label="Duration in minutes"
        />
        <span className="text-[10px] text-slate-400">min</span>
        <button
          type="submit"
          disabled={!customTime || submitting}
          className="rounded-lg bg-teal-600 px-3 py-1 text-xs font-bold text-white transition-colors hover:bg-teal-700 disabled:opacity-40"
        >
          Set
        </button>
      </form>

      {/* Mini day timeline */}
      <div>
        <p className="mb-1.5 text-[10px] font-bold uppercase tracking-widest text-slate-400">
          Today · {TIMELINE_START_HOUR}am – {TIMELINE_END_HOUR - 12}pm
        </p>
        <div className="relative h-5 overflow-hidden rounded-full bg-slate-100">
          {eventsLoading ? (
            <div className="absolute inset-0 animate-pulse bg-slate-200" />
          ) : (
            events
              .filter((ev) => {
                const start = new Date(ev.start);
                const end = new Date(ev.end);
                return (
                  start.getHours() < TIMELINE_END_HOUR &&
                  end.getHours() >= TIMELINE_START_HOUR
                );
              })
              .map((ev) => {
                const left = pctOfTimeline(ev.start);
                const right = 100 - pctOfTimeline(ev.end);
                const isHabit = ev.sourceType === 'habit';
                return (
                  <div
                    key={ev.id ?? `${ev.start}-${ev.summary}`}
                    title={ev.summary}
                    className={`absolute inset-y-0 ${
                      isHabit ? 'bg-teal-400/70' : 'bg-slate-400/40'
                    }`}
                    style={{ left: `${left}%`, right: `${right}%` }}
                  />
                );
              })
          )}
          {/* "Now" tick */}
          {now.getHours() >= TIMELINE_START_HOUR && now.getHours() < TIMELINE_END_HOUR && (
            <div
              className="absolute inset-y-0 w-0.5 bg-orange-400"
              style={{ left: `${nowPct}%` }}
            />
          )}
        </div>
        <div className="mt-0.5 flex justify-between text-[9px] text-slate-400">
          <span>{TIMELINE_START_HOUR}am</span>
          <span>12pm</span>
          <span>{TIMELINE_END_HOUR - 12}pm</span>
        </div>
      </div>
    </motion.div>
  );
}
