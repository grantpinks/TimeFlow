# Identity Today Tab — Schedule Panel Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add a "Today's plan" right column to the `IdentityTodayTab` consistency ribbon that shows each habit's scheduled time (if any) and a `+ Schedule` popover for unplaced habits, using only existing backend endpoints.

**Architecture:**
- New hook `useTodayHabitSchedule` fetches today's `ScheduledHabitInstance[]` and exposes a `scheduleHabit()` action that writes to `POST /calendar/create-habit-events`.
- New component `HabitSchedulePopover` renders quick-time chips, a custom time input, and a mini day timeline that lazy-loads `CalendarEvent[]` for today.
- `IdentityTodayTab` gets a two-column layout: existing ribbon on the left (60%), new "Today's plan" column on the right (40%); popover anchors to the `+ Schedule` pill.
- `IdentityPanel` adds the hook and passes its results down as props.

**Tech Stack:** TypeScript, React, Tailwind, Framer Motion, `@timeflow/shared` (`ScheduledHabitInstance`, `CalendarEvent`), existing `api.getScheduledHabitInstances`, `api.getCalendarEvents`, `api.createHabitEvents`

---

## Reference: Key Files

| File | Role |
|---|---|
| `apps/web/src/hooks/useTodayHabitSchedule.ts` | New — fetch today's scheduled instances + scheduleHabit action |
| `apps/web/src/components/identity/HabitSchedulePopover.tsx` | New — time picker popover with mini timeline |
| `apps/web/src/components/identity/IdentityTodayTab.tsx` | Modify — two-column layout, pass schedule props |
| `apps/web/src/components/identity/IdentityPanel.tsx` | Modify — add hook, pass new props |
| `apps/web/src/lib/api.ts` | Reference only — `getScheduledHabitInstances`, `getCalendarEvents`, `createHabitEvents` |
| `packages/shared/src/types/habit.ts` | Reference — `ScheduledHabitInstance` |
| `packages/shared/src/types/calendar.ts` | Reference — `CalendarEvent` |

## Data Notes

- `ScheduledHabitInstance`: `{ scheduledHabitId, habitId, title, startDateTime, endDateTime }`
- `CalendarEvent`: `{ summary, start, end, sourceType, isCompleted }` — `start`/`end` are ISO strings
- `createHabitEvents` body: `{ events: [{ habitId, title, start, end }] }` — `start`/`end` are ISO strings
- `getScheduledHabitInstances(from, to)` and `getCalendarEvents(from, to)` both take ISO date strings

---

## Task 1: `useTodayHabitSchedule` Hook

**Files:**
- Create: `apps/web/src/hooks/useTodayHabitSchedule.ts`

**Step 1: Create the hook**

```typescript
// apps/web/src/hooks/useTodayHabitSchedule.ts
'use client';

import { useState, useEffect, useCallback } from 'react';
import * as api from '@/lib/api';
import type { ScheduledHabitInstance } from '@timeflow/shared';

/** Returns local YYYY-MM-DDT00:00:00 and T23:59:59 for today */
function todayRange(): { from: string; to: string } {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return {
    from: `${y}-${m}-${day}T00:00:00`,
    to: `${y}-${m}-${day}T23:59:59`,
  };
}

export interface UseTodayHabitScheduleResult {
  instances: ScheduledHabitInstance[];
  loading: boolean;
  scheduleHabit: (
    habitId: string,
    title: string,
    startISO: string,
    durationMinutes: number
  ) => Promise<void>;
  refresh: () => void;
}

export function useTodayHabitSchedule(sessionReady: boolean): UseTodayHabitScheduleResult {
  const [instances, setInstances] = useState<ScheduledHabitInstance[]>([]);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    if (!sessionReady) return;
    setLoading(true);
    try {
      const { from, to } = todayRange();
      const data = await api.getScheduledHabitInstances(from, to);
      setInstances(data);
    } catch {
      setInstances([]);
    } finally {
      setLoading(false);
    }
  }, [sessionReady]);

  useEffect(() => { void load(); }, [load]);

  const scheduleHabit = useCallback(
    async (habitId: string, title: string, startISO: string, durationMinutes: number) => {
      const start = new Date(startISO);
      const end = new Date(start.getTime() + durationMinutes * 60 * 1000);
      await api.createHabitEvents([
        {
          habitId,
          title,
          start: start.toISOString(),
          end: end.toISOString(),
        },
      ]);
      await load();
    },
    [load]
  );

  return { instances, loading, scheduleHabit, refresh: load };
}
```

**Step 2: Build check**

```bash
cd apps/web && npx tsc --noEmit 2>&1 | grep "useTodayHabitSchedule"
```
Expected: no errors.

**Step 3: Commit**

```bash
git add apps/web/src/hooks/useTodayHabitSchedule.ts
git commit -m "feat(web): add useTodayHabitSchedule hook for today's habit schedule data"
```

---

## Task 2: `HabitSchedulePopover` Component

**Files:**
- Create: `apps/web/src/components/identity/HabitSchedulePopover.tsx`

**Step 1: Create the component**

```tsx
// apps/web/src/components/identity/HabitSchedulePopover.tsx
'use client';

import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
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
    chips.push({
      label: `In ${h}h`,
      iso: t.toISOString(),
    });
  }

  // Clock-time slots for the rest of today (3pm, 6pm, 9pm style)
  const slots = [9, 12, 15, 18, 21];
  for (const hour of slots) {
    const t = new Date(now);
    t.setHours(hour, 0, 0, 0);
    if (t > now) {
      const label = hour < 12 ? `${hour}am` : hour === 12 ? '12pm' : `${hour - 12}pm`;
      chips.push({ label, iso: t.toISOString() });
    }
  }

  // Keep max 6 chips
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

/** Mini timeline: 6am–10pm, 16-hour window = 960 minutes */
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
  habitId,
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

  // Lazy-load today's calendar events
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
      className="absolute right-0 top-full z-50 mt-1 w-72 rounded-2xl border border-slate-200 bg-white p-4 shadow-xl"
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
          placeholder="HH:MM"
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
              .map((ev, i) => {
                const left = pctOfTimeline(ev.start);
                const right = 100 - pctOfTimeline(ev.end);
                const isHabit = ev.sourceType === 'habit';
                return (
                  <div
                    key={i}
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
          {nowPct >= 0 && nowPct <= 100 && (
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
```

**Step 2: Build check**

```bash
cd apps/web && npx tsc --noEmit 2>&1 | grep "HabitSchedulePopover"
```
Expected: no errors.

**Step 3: Commit**

```bash
git add apps/web/src/components/identity/HabitSchedulePopover.tsx
git commit -m "feat(web): add HabitSchedulePopover with quick chips, custom time, and mini timeline"
```

---

## Task 3: Modify `IdentityTodayTab` — Two-Column Layout

**Files:**
- Modify: `apps/web/src/components/identity/IdentityTodayTab.tsx`

**Context:** The existing file is at `apps/web/src/components/identity/IdentityTodayTab.tsx`. Read it fully before editing. The key changes:
1. Add two new props: `scheduledInstances: ScheduledHabitInstance[]` and `onScheduleHabit`
2. Build a per-habit lookup map from `scheduledInstances`
3. Change the ribbon `<ul>` to a side-by-side layout — left: existing dots/bar, right: time badge or schedule button
4. Wire the `+ Schedule` button to open `HabitSchedulePopover` (anchored via `position: relative` wrapper)

**Step 1: Implement the changes**

Replace the full content of `apps/web/src/components/identity/IdentityTodayTab.tsx` with:

```tsx
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

  // Determine whether to show the plan column (only if scheduling is available)
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
                {/* Left: ribbon — habit name + dots + rate + bar */}
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

                  {/* Mini bar — hidden on small plan column to save space */}
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
```

**Step 2: Build check**

```bash
cd apps/web && npx tsc --noEmit 2>&1 | grep "IdentityTodayTab"
```
Expected: no errors.

**Step 3: Commit**

```bash
git add apps/web/src/components/identity/IdentityTodayTab.tsx
git commit -m "feat(web): two-column layout in IdentityTodayTab with Today's plan schedule column"
```

---

## Task 4: Modify `IdentityPanel` — Add Hook and Pass Schedule Props

**Files:**
- Modify: `apps/web/src/components/identity/IdentityPanel.tsx`

**Step 1: Add imports and hook**

Read `apps/web/src/components/identity/IdentityPanel.tsx` first. Then:

1. Add import at the top:
```typescript
import { useTodayHabitSchedule } from '@/hooks/useTodayHabitSchedule';
```

2. Inside the component body, after the existing hooks, add:
```typescript
const { instances: scheduledInstances, scheduleHabit } = useTodayHabitSchedule(sessionReady);
```

3. Update the `<IdentityTodayTab>` call to pass the new props:
```tsx
<IdentityTodayTab
  habits={consistencyData?.habits ?? []}
  loading={consistencyLoading}
  todayDone={selectedIdentity?.completedCount ?? 0}
  todayMinutes={selectedIdentity?.totalMinutes ?? 0}
  streakDays={selectedIdentity?.currentStreak}
  scheduledInstances={scheduledInstances}
  onScheduleHabit={scheduleHabit}
/>
```

**Step 2: Build check**

```bash
cd apps/web && npx tsc --noEmit 2>&1 | grep "IdentityPanel"
```
Expected: no errors.

**Step 3: Commit**

```bash
git add apps/web/src/components/identity/IdentityPanel.tsx
git commit -m "feat(web): wire useTodayHabitSchedule into IdentityPanel for Today tab schedule column"
```

---

## Task 5: Smoke Test

**Step 1: Run type-check across all modified files**

```bash
cd apps/web && npx tsc --noEmit 2>&1 | grep -v "node_modules" | grep "error TS"
```
Expected: no new errors (pre-existing test-file errors are OK).

**Step 2: Visual check (manual)**

Open Today page locally (`pnpm dev` in apps/web). With at least one identity that has habits:
- [ ] "Today's plan" column appears to the right of the dot grid
- [ ] Habits with a scheduled block today show the time (e.g. `🕐 3pm`)
- [ ] Habits without a block show `+ Schedule` dashed pill
- [ ] Clicking `+ Schedule` opens the popover
- [ ] Quick chip buttons show future times only
- [ ] Mini timeline renders (may be thin/empty if no events)
- [ ] Selecting a time closes the popover and converts the pill to a time badge
- [ ] Habits done today show `✓ Done` in teal instead of the schedule pill

**Step 3: Deploy**

```bash
git push origin main
```
