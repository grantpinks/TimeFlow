'use client';

import { useMemo, useState, type CSSProperties } from 'react';
import Link from 'next/link';
import { useDraggable } from '@dnd-kit/core';
import type { Habit, StudioHabitRowStatus, StudioSummaryResponse } from '@timeflow/shared';
import { FlowMascot } from '@/components/FlowMascot';

interface CalendarHabitsPanelProps {
  habits: Habit[];
  studioSummary?: StudioSummaryResponse | null;
  timeZone?: string;
  loadingSummary?: boolean;
  showHabitRecommendations?: boolean;
  habitSuggestionsLoading?: boolean;
  onToggleHabitRecommendations?: (enabled: boolean) => void;
}

type HabitGroup = {
  title: string;
  eyebrow: string;
  tone: 'risk' | 'scheduled' | 'done' | 'open';
  habits: Array<{ habit: Habit; status?: StudioHabitRowStatus }>;
};

const groupToneClasses: Record<HabitGroup['tone'], string> = {
  risk: 'bg-rose-50 text-rose-700 border-rose-100',
  scheduled: 'bg-blue-50 text-blue-700 border-blue-100',
  done: 'bg-emerald-50 text-emerald-700 border-emerald-100',
  open: 'bg-amber-50 text-amber-700 border-amber-100',
};

export function CalendarHabitsPanel({
  habits,
  studioSummary,
  timeZone,
  loadingSummary = false,
  showHabitRecommendations = true,
  habitSuggestionsLoading = false,
  onToggleHabitRecommendations,
}: CalendarHabitsPanelProps) {
  const [expanded, setExpanded] = useState(true);

  const activeHabits = useMemo(() => habits.filter((h) => h.isActive), [habits]);
  const statusByHabitId = useMemo(() => {
    return new Map((studioSummary?.rows ?? []).map((row) => [row.habitId, row]));
  }, [studioSummary]);

  const activeWithStatus = useMemo(
    () => activeHabits.map((habit) => ({ habit, status: statusByHabitId.get(habit.id) })),
    [activeHabits, statusByHabitId]
  );

  const doneTodayCount = activeWithStatus.filter((item) => item.status?.completedToday).length;
  const stillDueCount = studioSummary?.strip.dueTodayCount ?? 0;
  const atRiskCount =
    studioSummary?.strip.atRiskCount ??
    activeWithStatus.filter((item) => item.status?.status === 'at_risk' && item.status.streakAtRisk).length;
  const needsSlotCount =
    studioSummary?.strip.unscheduledWeekCount ??
    activeWithStatus.filter((item) => item.status?.status === 'open' || !item.status?.nextStart).length;

  const groups: HabitGroup[] = [
    {
      title: 'Protect streak',
      eyebrow: 'Do these before the day ends',
      tone: 'risk',
      habits: activeWithStatus.filter((item) => item.status?.status === 'at_risk'),
    },
    {
      title: 'Scheduled today',
      eyebrow: 'Already placed on your calendar',
      tone: 'scheduled',
      habits: activeWithStatus.filter((item) => item.status?.status === 'scheduled'),
    },
    {
      title: 'Done today',
      eyebrow: 'Completed and counted',
      tone: 'done',
      habits: activeWithStatus.filter((item) => item.status?.status === 'done_today'),
    },
    {
      title: 'Needs a slot',
      eyebrow: 'Drag these into open time',
      tone: 'open',
      habits: activeWithStatus.filter((item) => !item.status || item.status.status === 'open'),
    },
  ];

  return (
    <div className="overflow-hidden flex-shrink-0">
      <div
        className="flex items-center justify-between cursor-pointer hover:bg-slate-50/50 transition-colors -mx-1 px-1 py-0.5 rounded-md"
        onClick={() => setExpanded(!expanded)}
      >
        <div>
          <h3 className="text-sm font-semibold text-slate-800">Habits</h3>
          {expanded && activeHabits.length > 0 && (
            <p className="text-[11px] text-slate-500">Today&apos;s routine status</p>
          )}
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-600 bg-slate-100 px-2 py-0.5 rounded-full font-semibold">
            {doneTodayCount}/{activeHabits.length}
          </span>
          <svg
            className={`w-3.5 h-3.5 text-slate-400 transition-transform ${expanded ? 'rotate-180' : ''}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </div>

      {expanded && (
        <div className="max-h-[32rem] overflow-y-auto pt-2">
          {activeHabits.length === 0 ? (
            <div className="p-6 text-center">
              <div className="flex justify-center mb-2">
                <FlowMascot size="sm" expression="encouraging" />
              </div>
              <p className="text-xs font-medium text-slate-700">No active habits</p>
              <p className="text-[11px] text-slate-500 mt-0.5 mb-3">
                Create habits to drag them onto the calendar.
              </p>
              <Link
                href="/habits"
                className="text-[11px] font-medium text-primary-600 hover:text-primary-700"
              >
                Go to Habits →
              </Link>
            </div>
          ) : (
            <div className="space-y-3">
              {onToggleHabitRecommendations && (
                <div className="mx-1 rounded-xl border border-primary-100 bg-gradient-to-r from-primary-50/90 to-blue-50/70 px-3 py-2 shadow-sm">
                  <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="h-2 w-2 rounded-full bg-primary-500" aria-hidden />
                        <p className="text-xs font-semibold text-primary-900">Calendar suggestions</p>
                      </div>
                      <p className="mt-0.5 text-[10px] text-primary-700/80">
                        {habitSuggestionsLoading ? 'Syncing slots' : 'Show smart slots on the calendar'}
                      </p>
                    </div>
                    <label
                      className={`relative h-6 w-11 flex-shrink-0 cursor-pointer rounded-full transition-colors focus-within:ring-2 focus-within:ring-primary-500 focus-within:ring-offset-2 ${
                        showHabitRecommendations ? 'bg-primary-600' : 'bg-slate-300'
                      }`}
                      title="Toggle habit suggestions"
                    >
                      <input
                        type="checkbox"
                        className="sr-only"
                        checked={showHabitRecommendations}
                        onChange={(event) => onToggleHabitRecommendations(event.target.checked)}
                        aria-label="Show habit suggestions"
                      />
                      <span
                        aria-hidden
                        className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform ${
                          showHabitRecommendations ? 'translate-x-5' : 'translate-x-0.5'
                        }`}
                      />
                    </label>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-3 gap-1.5 px-1">
                <HabitStat label="still due" value={stillDueCount} tone="amber" />
                <HabitStat label="at risk" value={atRiskCount} tone="rose" />
                <HabitStat label="need slots" value={needsSlotCount} tone="blue" />
              </div>

              {loadingSummary && (
                <p className="px-2 text-[11px] text-slate-500">Refreshing habit status...</p>
              )}

              <div className="space-y-2">
                {groups.map((group) => (
                  <HabitGroupSection key={group.title} group={group} timeZone={timeZone} />
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function HabitStat({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone: 'amber' | 'rose' | 'blue';
}) {
  const classes = {
    amber: 'bg-amber-50 text-amber-700 border-amber-100',
    rose: 'bg-rose-50 text-rose-700 border-rose-100',
    blue: 'bg-blue-50 text-blue-700 border-blue-100',
  }[tone];

  return (
    <div className={`rounded-lg border px-2 py-1.5 ${classes}`}>
      <p className="text-sm font-bold leading-none">{value}</p>
      <p className="mt-0.5 text-[10px] font-medium leading-tight">{label}</p>
    </div>
  );
}

function HabitGroupSection({ group, timeZone }: { group: HabitGroup; timeZone?: string }) {
  if (group.habits.length === 0) {
    return null;
  }

  return (
    <section className="rounded-xl border border-slate-100 bg-white shadow-sm overflow-hidden">
      <div className={`border-b px-3 py-2 ${groupToneClasses[group.tone]}`}>
        <div className="flex items-center justify-between gap-2">
          <p className="text-xs font-semibold">{group.title}</p>
          <span className="rounded-full bg-white/70 px-1.5 py-0.5 text-[10px] font-bold">
            {group.habits.length}
          </span>
        </div>
        <p className="mt-0.5 text-[10px] opacity-80">{group.eyebrow}</p>
      </div>
      <div className="divide-y divide-slate-50">
        {group.habits.map((item) => (
          <DraggableHabitItem
            key={`${group.title}-${item.habit.id}`}
            habit={item.habit}
            status={item.status}
            timeZone={timeZone}
          />
        ))}
      </div>
    </section>
  );
}

function DraggableHabitItem({
  habit,
  status,
  timeZone,
}: {
  habit: Habit;
  status?: StudioHabitRowStatus;
  timeZone?: string;
}) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: `habit-${habit.id}`,
    data: { habit },
  });

  const style: CSSProperties = {
    opacity: isDragging ? 0.45 : 1,
  };

  const nextStartDate = status?.nextStart ? new Date(status.nextStart) : null;
  const nextTime =
    nextStartDate && !Number.isNaN(nextStartDate.getTime())
      ? nextStartDate.toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
        ...(timeZone ? { timeZone } : {}),
      })
      : null;
  const scheduledTime = status?.status === 'scheduled' ? nextTime : null;
  const isScheduled = status?.status === 'scheduled';
  const statusLabel =
    status?.completedToday
      ? 'Done today'
      : scheduledTime
      ? `Scheduled ${scheduledTime}`
      : isScheduled
      ? 'Scheduled today'
      : status?.streakAtRisk
      ? 'Streak at risk'
      : 'Needs a slot';

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="px-3 py-2 hover:bg-slate-50/50 transition-colors cursor-move relative group"
      {...listeners}
      {...attributes}
    >
      <div className="flex items-start gap-2.5">
        <div
          className={`w-2 h-2 rounded-full mt-1 flex-shrink-0 ${
            status?.completedToday
              ? 'bg-emerald-500'
              : isScheduled
              ? 'bg-blue-500'
              : status?.streakAtRisk
              ? 'bg-rose-500'
              : 'bg-amber-500'
          }`}
        />

        <div className="flex-1 min-w-0">
          <p className="text-xs font-medium text-slate-800 truncate leading-snug">{habit.title}</p>
          <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
            <span className="text-[11px] text-slate-500">{habit.durationMinutes}m</span>
            <span className="text-[11px] font-medium text-slate-600">{statusLabel}</span>
            {status && status.currentStreak > 0 && (
              <span className="text-[11px] font-semibold text-orange-600">
                {status.currentStreak}-day streak
              </span>
            )}
            {habit.identityModel && (
              <span
                className="text-[11px] px-1.5 py-0.5 rounded font-medium max-w-[8rem] truncate"
                style={{
                  backgroundColor: `${habit.identityModel.color}22`,
                  color: habit.identityModel.color,
                }}
              >
                {habit.identityModel.name}
              </span>
            )}
          </div>
        </div>
      </div>

      {isDragging && (
        <div className="absolute inset-0 bg-indigo-50 border border-dashed border-indigo-300 rounded-lg flex items-center justify-center">
          <p className="text-[11px] text-indigo-700 font-semibold">Drop on calendar</p>
        </div>
      )}
    </div>
  );
}
