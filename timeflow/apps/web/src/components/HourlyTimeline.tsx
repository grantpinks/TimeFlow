/**
 * HourlyTimeline Component
 *
 * Displays today's schedule in an hour-by-hour format with scheduled tasks,
 * calendar events, habits, and optional suggested email-review blocks.
 */

'use client';

import { useMemo, memo, useState, useEffect } from 'react';
import Link from 'next/link';
import { useDroppable } from '@dnd-kit/core';
import { motion, useReducedMotion } from 'framer-motion';
import { CheckSquare, Flame, Calendar, Mail, X } from 'lucide-react';
import type { Task, CalendarEvent } from '@timeflow/shared';
import { TaskEmailSourceLink } from '@/components/tasks/TaskEmailSourceLink';

const BRAND_TEAL = '#0BAF9A';
const SLATE_UNLINKED = '#94a3b8';
const SLATE_EVENT = '#64748b';
const BLUE_EMAIL = '#3b82f6';

type TimelineItemType = 'task' | 'event' | 'habit' | 'email';

interface TimelineItem {
  id: string;
  type: TimelineItemType;
  title: string;
  start: Date;
  end: Date;
  description?: string;
  priority?: 1 | 2 | 3;
  status?: string;
  isOverdue?: boolean;
  categoryColor?: string;
  sourceType?: 'task' | 'habit' | 'external';
  sourceId?: string;
  isCompleted?: boolean;
  /** Identity-linked task: stripe + pill */
  identityColor?: string;
  identityIcon?: string;
  identityName?: string;
  /** Suggested email-review block */
  isSuggested?: boolean;
  emailCount?: number;
  /** Task created from email — for quick link */
  sourceEmailUrl?: string | null;
  sourceThreadId?: string | null;
  sourceEmailId?: string | null;
}

interface TimeSlot {
  hour: number;
  items: TimelineItem[];
  isFree: boolean;
}

interface HourlyTimelineProps {
  tasks: Task[];
  events: CalendarEvent[];
  wakeTime?: string;
  sleepTime?: string;
  onCompleteTask?: (taskId: string) => void;
  onCompleteHabit?: (scheduledHabitId: string, actualDurationMinutes?: number) => void;
  enableDropTargets?: boolean;
  /** Count of actionable inbox emails (needs reply / response / unread). */
  actionableEmailCount?: number;
  /** When true, do not insert the suggested email block. */
  emailBlockDismissed?: boolean;
  onDismissEmailBlock?: () => void;
  /** Focus mode: hide suggested email-review block entirely. */
  hideSuggestedEmailBlock?: boolean;
}

function mergeIntervals(intervals: { start: Date; end: Date }[]): { start: Date; end: Date }[] {
  if (intervals.length === 0) return [];
  const sorted = [...intervals].sort((a, b) => a.start.getTime() - b.start.getTime());
  const merged: { start: Date; end: Date }[] = [];
  let cur = { ...sorted[0] };
  for (let i = 1; i < sorted.length; i++) {
    const next = sorted[i];
    if (next.start.getTime() <= cur.end.getTime()) {
      cur.end = new Date(Math.max(cur.end.getTime(), next.end.getTime()));
    } else {
      merged.push(cur);
      cur = { ...next };
    }
  }
  merged.push(cur);
  return merged;
}

function clipToWindow(
  start: Date,
  end: Date,
  windowStart: Date,
  windowEnd: Date
): { start: Date; end: Date } | null {
  const s = new Date(Math.max(start.getTime(), windowStart.getTime()));
  const e = new Date(Math.min(end.getTime(), windowEnd.getTime()));
  if (e.getTime() <= s.getTime()) return null;
  return { start: s, end: e };
}

/** First contiguous gap ≥ minGapMs inside [workStart, workEnd], or null. */
function findFirstGap(
  workStart: Date,
  workEnd: Date,
  busy: { start: Date; end: Date }[],
  minGapMs: number
): { start: Date; end: Date } | null {
  const clipped = busy
    .map((b) => clipToWindow(b.start, b.end, workStart, workEnd))
    .filter((x): x is { start: Date; end: Date } => x !== null);
  const merged = mergeIntervals(clipped);
  let cursor = workStart.getTime();
  const endMs = workEnd.getTime();

  for (const interval of merged) {
    const gapStart = cursor;
    const gapEnd = interval.start.getTime();
    if (gapEnd > gapStart && gapEnd - gapStart >= minGapMs) {
      return { start: new Date(gapStart), end: new Date(gapEnd) };
    }
    cursor = Math.max(cursor, interval.end.getTime());
    if (cursor >= endMs) break;
  }
  if (endMs - cursor >= minGapMs) {
    return { start: new Date(cursor), end: new Date(endMs) };
  }
  return null;
}

export function HourlyTimeline({
  tasks,
  events,
  wakeTime = '08:00',
  sleepTime = '23:00',
  onCompleteTask,
  onCompleteHabit,
  enableDropTargets = false,
  actionableEmailCount = 0,
  emailBlockDismissed = false,
  onDismissEmailBlock,
  hideSuggestedEmailBlock = false,
}: HourlyTimelineProps) {
  const now = new Date();
  const currentHour = now.getHours();

  const wakeHour = parseInt(wakeTime.split(':')[0], 10);
  const sleepHour = parseInt(sleepTime.split(':')[0], 10);

  const timelineItems = useMemo(() => {
    const items: TimelineItem[] = [];
    const today = new Date();
    const y = today.getFullYear();
    const m = today.getMonth();
    const d = today.getDate();
    const startOfDay = new Date(y, m, d);
    const endOfDay = new Date(y, m, d + 1);

    const workStart = new Date(y, m, d, wakeHour, 0, 0, 0);
    const workEnd = new Date(y, m, d, sleepHour, 0, 0, 0);

    tasks
      .filter((task) => task.status === 'scheduled' && task.scheduledTask)
      .forEach((task) => {
        const scheduledStart = new Date(task.scheduledTask!.startDateTime);
        const scheduledEnd = new Date(task.scheduledTask!.endDateTime);

        if (scheduledStart >= startOfDay && scheduledStart < endOfDay) {
          const id = task.identity;
          items.push({
            id: task.id,
            type: 'task',
            title: task.title,
            start: scheduledStart,
            end: scheduledEnd,
            description: task.description || undefined,
            priority: task.priority,
            status: task.status,
            isOverdue: task.scheduledTask?.overflowedDeadline,
            categoryColor: task.category?.color,
            identityColor: id?.color,
            identityIcon: id?.icon,
            identityName: id?.name,
            sourceEmailUrl: task.sourceEmailUrl,
            sourceThreadId: task.sourceThreadId,
            sourceEmailId: task.sourceEmailId,
          });
        }
      });

    events.forEach((event) => {
      const eventStart = new Date(event.start);
      const eventEnd = new Date(event.end);

      if (eventStart >= startOfDay && eventStart < endOfDay) {
        const type: TimelineItem['type'] =
          event.sourceType === 'habit' ? 'habit' : event.sourceType === 'task' ? 'task' : 'event';
        items.push({
          id: event.id ?? `event-${eventStart.getTime()}-${eventEnd.getTime()}`,
          type,
          title: event.summary,
          start: eventStart,
          end: eventEnd,
          description: event.description,
          sourceType: event.sourceType,
          sourceId: event.sourceId,
          isCompleted: event.isCompleted,
        });
      }
    });

    const sorted = items.sort((a, b) => a.start.getTime() - b.start.getTime());

    if (
      actionableEmailCount > 0 &&
      !emailBlockDismissed &&
      !hideSuggestedEmailBlock &&
      workEnd.getTime() > workStart.getTime()
    ) {
      const busy = sorted.map((it) => ({ start: it.start, end: it.end }));
      const gap = findFirstGap(workStart, workEnd, busy, 15 * 60 * 1000);
      if (gap) {
        const desiredMs = Math.min(
          actionableEmailCount * 10 * 60 * 1000,
          45 * 60 * 1000,
          gap.end.getTime() - gap.start.getTime()
        );
        if (desiredMs >= 15 * 60 * 1000) {
          const end = new Date(gap.start.getTime() + desiredMs);
          sorted.push({
            id: `suggested-email-${y}-${m + 1}-${d}`,
            type: 'email',
            title: `Email review (${actionableEmailCount} need${actionableEmailCount === 1 ? 's' : ''} attention)`,
            start: gap.start,
            end,
            isSuggested: true,
            emailCount: actionableEmailCount,
          });
          sorted.sort((a, b) => a.start.getTime() - b.start.getTime());
        }
      }
    }

    return sorted;
  }, [
    tasks,
    events,
    actionableEmailCount,
    emailBlockDismissed,
    hideSuggestedEmailBlock,
    wakeHour,
    sleepHour,
  ]);

  const timeSlots = useMemo(() => {
    const slots: TimeSlot[] = [];

    for (let hour = wakeHour; hour <= sleepHour; hour++) {
      const hourItems = timelineItems.filter((item) => {
        const itemHour = item.start.getHours();
        return itemHour === hour;
      });

      slots.push({
        hour,
        items: hourItems,
        isFree: hourItems.length === 0,
      });
    }

    return slots;
  }, [timelineItems, wakeHour, sleepHour]);

  const formatHour = (hour: number) => {
    const period = hour >= 12 ? 'PM' : 'AM';
    const displayHour = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
    return `${displayHour}:00 ${period}`;
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
    });
  };

  return (
    <div className="space-y-1">
      {timeSlots.map((slot) => (
        <TimelineSlot
          key={slot.hour}
          slot={slot}
          isCurrent={slot.hour === currentHour}
          onCompleteTask={onCompleteTask}
          onCompleteHabit={onCompleteHabit}
          onDismissEmailBlock={onDismissEmailBlock}
          enableDropTargets={enableDropTargets}
          formatHour={formatHour}
          formatTime={formatTime}
        />
      ))}

      {timeSlots.length === 0 && (
        <div className="text-center py-12 text-slate-500">
          <p>No time slots available</p>
        </div>
      )}
    </div>
  );
}

type TimelineSlotProps = {
  slot: TimeSlot;
  isCurrent: boolean;
  onCompleteTask?: (taskId: string) => void;
  onCompleteHabit?: (scheduledHabitId: string, actualDurationMinutes?: number) => void;
  onDismissEmailBlock?: () => void;
  enableDropTargets: boolean;
  formatHour: (hour: number) => string;
  formatTime: (date: Date) => string;
};

const TimelineSlot = memo(function TimelineSlot({
  slot,
  isCurrent,
  onCompleteTask,
  onCompleteHabit,
  onDismissEmailBlock,
  enableDropTargets,
  formatHour,
  formatTime,
}: TimelineSlotProps) {
  const { setNodeRef, isOver } = useDroppable({
    id: `slot-${slot.hour}`,
    data: { hour: slot.hour },
    disabled: !enableDropTargets,
  });

  const ariaLabel = enableDropTargets
    ? `${formatHour(slot.hour)} time slot. ${slot.isFree ? 'Empty, drop a task here to schedule it' : `Has ${slot.items.length} item${slot.items.length > 1 ? 's' : ''}`}`
    : undefined;

  return (
    <div
      ref={enableDropTargets ? setNodeRef : undefined}
      className={`flex gap-4 py-2 px-3 rounded-lg transition-all ${
        isCurrent
          ? 'bg-primary-50 border-l-4 border-primary-500'
          : 'hover:bg-slate-50 border-l-4 border-transparent'
      } ${enableDropTargets ? 'border-dashed border-slate-200' : ''} ${
        isOver ? 'ring-2 ring-primary-300 bg-primary-50/70' : ''
      }`}
      role={enableDropTargets ? 'region' : undefined}
      aria-label={ariaLabel}
      aria-dropeffect={enableDropTargets && slot.isFree ? 'move' : undefined}
    >
      <div className="w-20 flex-shrink-0">
        <span className={`text-sm font-medium ${isCurrent ? 'text-primary-700' : 'text-slate-600'}`}>
          {formatHour(slot.hour)}
        </span>
      </div>

      <div className="flex-1 min-w-0">
        {slot.isFree ? (
          <div className="text-sm text-slate-400 italic py-1">
            {enableDropTargets ? 'Drop a task to schedule here' : 'Free time'}
          </div>
        ) : (
          <div className="space-y-2">
            {slot.items.map((item) => (
              <TimelineCard
                key={item.id}
                item={item}
                onCompleteTask={onCompleteTask}
                onCompleteHabit={onCompleteHabit}
                onDismissEmailBlock={onDismissEmailBlock}
                formatTime={formatTime}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
});

function durationMinutes(start: Date, end: Date): number {
  return Math.round((end.getTime() - start.getTime()) / 60000);
}

const TimelineCard = memo(function TimelineCard({
  item,
  onCompleteTask,
  onCompleteHabit,
  onDismissEmailBlock,
  formatTime,
}: {
  item: TimelineItem;
  onCompleteTask?: (taskId: string) => void;
  onCompleteHabit?: (scheduledHabitId: string, actualDurationMinutes?: number) => void;
  onDismissEmailBlock?: () => void;
  formatTime: (date: Date) => string;
}) {
  const prefersReducedMotion = useReducedMotion();
  const mins = durationMinutes(item.start, item.end);
  const [habitActualMins, setHabitActualMins] = useState(() => String(mins));

  useEffect(() => {
    if (item.type === 'habit') {
      setHabitActualMins(String(mins));
    }
  }, [item.type, item.sourceId, item.id, mins]);

  const stripeColor = (() => {
    if (item.type === 'email') return BLUE_EMAIL;
    if (item.type === 'habit') return BRAND_TEAL;
    if (item.type === 'event') return SLATE_EVENT;
    if (item.type === 'task') {
      if (item.identityColor) return item.identityColor;
      if (item.categoryColor) return item.categoryColor;
      return SLATE_UNLINKED;
    }
    return SLATE_UNLINKED;
  })();

  const finalBorderColor = item.isOverdue ? '#F97316' : stripeColor;

  const opacity = item.isCompleted ? 0.6 : 1;

  const canComplete =
    (item.type === 'task' && !item.isCompleted && onCompleteTask) ||
    (item.type === 'habit' && !item.isCompleted && onCompleteHabit && item.sourceId);

  const handleComplete = () => {
    if (item.type === 'task' && onCompleteTask) {
      onCompleteTask(item.id);
    } else if (item.type === 'habit' && item.sourceId && onCompleteHabit) {
      const raw = habitActualMins.trim();
      let actual: number | undefined;
      if (raw) {
        const n = parseInt(raw, 10);
        if (!Number.isNaN(n) && n >= 1 && n <= 24 * 60) actual = n;
      }
      onCompleteHabit(item.sourceId, actual);
    }
  };

  const surfaceClass =
    item.type === 'email'
      ? 'bg-blue-50/80 border border-dashed border-blue-200'
      : 'bg-slate-50 ring-1 ring-inset ring-slate-200/90';

  return (
    <div
      className={`relative flex items-start gap-2 py-2.5 pl-3 pr-2 rounded-xl ${surfaceClass}`}
      style={{
        borderLeftWidth: 3,
        borderLeftStyle: 'solid',
        borderLeftColor: finalBorderColor,
        opacity,
      }}
    >
      <div className="flex-shrink-0 pt-0.5 text-slate-500">
        {item.type === 'task' && <CheckSquare className="w-4 h-4" aria-hidden />}
        {item.type === 'habit' && <Flame className="w-4 h-4 text-[#0BAF9A]" aria-hidden />}
        {item.type === 'event' && <Calendar className="w-4 h-4" aria-hidden />}
        {item.type === 'email' && <Mail className="w-4 h-4 text-blue-600" aria-hidden />}
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs font-medium text-slate-600">
            {formatTime(item.start)} – {formatTime(item.end)}
          </span>
          <span className="text-xs text-slate-400">{mins} min</span>
          {item.type === 'task' && item.priority === 1 && (
            <span className="text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded font-medium">HIGH</span>
          )}
          {item.type === 'habit' && (
            <span className="text-xs bg-teal-100 text-teal-800 px-2 py-0.5 rounded font-medium">HABIT</span>
          )}
          {item.type === 'email' && (
            <span className="text-xs bg-blue-100 text-blue-800 px-2 py-0.5 rounded font-medium">SUGGESTED</span>
          )}
          {item.isOverdue && (
            <span className="text-xs bg-orange-100 text-orange-800 px-2 py-0.5 rounded font-medium">OVERDUE</span>
          )}
          {item.isCompleted && (
            <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded font-medium">Done</span>
          )}
        </div>
        <h4 className={`font-semibold text-slate-900 text-sm mt-1 ${item.isCompleted ? 'line-through text-slate-500' : ''}`}>
          {item.title}
        </h4>
        {item.type === 'email' && (
          <p className="text-xs text-slate-600 mt-1">
            Review your inbox — matches your &quot;needs attention&quot; emails on Today.
          </p>
        )}
        {item.identityName && item.type === 'task' && (
          <span
            className="inline-flex items-center gap-1 mt-1.5 text-[11px] font-medium px-2 py-0.5 rounded-full border border-slate-200 bg-white/80"
            style={{ color: item.identityColor ?? undefined }}
          >
            {item.identityIcon && <span aria-hidden>{item.identityIcon}</span>}
            {item.identityName}
          </span>
        )}
        {item.type === 'task' &&
          (item.sourceEmailId || item.sourceEmailUrl || item.sourceThreadId) && (
            <div className="mt-1.5">
              <TaskEmailSourceLink
                emailSource={{
                  sourceEmailUrl: item.sourceEmailUrl,
                  sourceThreadId: item.sourceThreadId,
                  sourceEmailId: item.sourceEmailId,
                }}
              />
            </div>
          )}
        {item.description && item.type !== 'email' && (
          <p className="text-xs text-slate-600 mt-1 line-clamp-2">{item.description}</p>
        )}
      </div>

      <div className="flex flex-shrink-0 items-start gap-1">
        {item.type === 'email' && onDismissEmailBlock && (
          <button
            type="button"
            onClick={onDismissEmailBlock}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-white/80 transition-colors"
            title="Hide suggested block for today"
            aria-label="Dismiss suggested email block"
          >
            <X className="w-4 h-4" />
          </button>
        )}
        {item.type === 'email' && (
          <Link
            href="/inbox"
            className="text-xs font-medium text-blue-600 hover:text-blue-800 whitespace-nowrap pt-1"
          >
            Open inbox
          </Link>
        )}
        {canComplete && (
          <div className="flex flex-col items-end gap-1">
            {item.type === 'habit' && (
              <label className="flex items-center gap-1 text-[10px] text-slate-500 whitespace-nowrap">
                <span className="hidden sm:inline">Actual min</span>
                <input
                  type="number"
                  min={1}
                  max={24 * 60}
                  inputMode="numeric"
                  value={habitActualMins}
                  onChange={(e) => setHabitActualMins(e.target.value)}
                  className="w-11 rounded border border-slate-200 px-1 py-0.5 text-[11px] text-slate-800"
                  title="Minutes spent (optional; empty = planned)"
                  aria-label="Actual minutes spent"
                />
              </label>
            )}
            <motion.button
              type="button"
              onClick={handleComplete}
              className="text-slate-400 hover:text-green-600 transition-colors flex-shrink-0 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 rounded p-1"
              title="Mark complete"
              aria-label={`Mark ${item.title} as complete`}
              whileTap={prefersReducedMotion ? undefined : { scale: 0.9 }}
              whileHover={prefersReducedMotion ? undefined : { scale: 1.05 }}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </motion.button>
          </div>
        )}
      </div>
    </div>
  );
});
