'use client';

import { useState } from 'react';
import type { Habit, Identity, StudioHabitRowStatus } from '@timeflow/shared';
import { LoadingSpinner } from '@/components/ui';
import { TimeSlotPicker } from '@/components/habits/TimeSlotPicker';
import type { TimeSlot } from '@/components/habits/TimeSlotPicker';
import { HabitAdherenceMiniChart } from '@/components/habits/HabitAdherenceMiniChart';
import type { AdherenceDay } from '@/components/habits/HabitAdherenceMiniChart';
import { HabitRowMenu } from './HabitRowMenu';

export interface HabitRowProps {
  habit: Habit;
  variant?: 'default' | 'compact';
  rowStatus?: StudioHabitRowStatus | null;
  adherenceSeries?: AdherenceDay[];
  onEdit: (habit: Habit) => void;
  onDelete: (id: string) => void;
  identities?: Identity[];
  onMoveToIdentity?: (habitId: string, identityId: string | null) => void;
}

function formatFrequency(habit: Habit): string {
  if (habit.frequency === 'daily') return 'Daily';
  if (habit.frequency === 'weekly') {
    return `Weekly (${habit.daysOfWeek.join(', ')})`;
  }
  return 'Custom';
}

function formatMeta(habit: Habit): string {
  const parts = [formatFrequency(habit), `${habit.durationMinutes}m`];
  if (habit.preferredTimeOfDay) {
    parts.push(habit.preferredTimeOfDay);
  }
  return parts.join(' · ');
}

function statusDotClass(status: StudioHabitRowStatus['status']): string {
  switch (status) {
    case 'done_today':
      return 'bg-emerald-500';
    case 'scheduled':
      return 'bg-blue-500';
    case 'at_risk':
      return 'bg-amber-500';
    default:
      return 'bg-slate-300';
  }
}

function formatNext(start: string | null): string {
  if (!start) return 'Not scheduled';
  const d = new Date(start);
  const now = new Date();
  const sameDay =
    d.getDate() === now.getDate() &&
    d.getMonth() === now.getMonth() &&
    d.getFullYear() === now.getFullYear();
  if (sameDay) {
    return `Today ${d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}`;
  }
  return d.toLocaleString([], { weekday: 'short', hour: 'numeric', minute: '2-digit' });
}

export function HabitRow({
  habit,
  variant = 'default',
  rowStatus,
  adherenceSeries,
  onEdit,
  onDelete,
  identities,
  onMoveToIdentity,
}: HabitRowProps) {
  const [scheduleOpen, setScheduleOpen] = useState(false);
  const [dateOption, setDateOption] = useState<'today' | 'tomorrow' | 'this-week' | null>(
    null
  );
  const [isScheduling, setIsScheduling] = useState(false);

  const handleSlotSelect = async (slot: TimeSlot) => {
    setIsScheduling(true);
    try {
      const response = await fetch('/api/habits/commit-schedule', {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          acceptedBlocks: [
            {
              habitId: habit.id,
              startDateTime: slot.startDateTime,
              endDateTime: slot.endDateTime,
            },
          ],
        }),
      });
      if (!response.ok) {
        throw new Error('Failed to schedule habit');
      }
      const data = await response.json();
      if (data.progress?.[0]?.status === 'created') {
        setDateOption(null);
        setScheduleOpen(false);
      } else {
        throw new Error('Scheduling failed');
      }
    } catch {
      // Phase 3 will surface inline errors
    } finally {
      setIsScheduling(false);
    }
  };

  const py = variant === 'compact' ? 'py-2' : 'py-2.5';
  const schedulingActive = scheduleOpen || dateOption !== null;

  return (
    <div
      className={`rounded-lg border border-slate-100 bg-white ${py} px-3 ${
        schedulingActive ? 'relative z-50' : ''
      }`}
      data-testid="habit-row"
    >
      <div className="flex items-center gap-3 min-w-0">
        <span
          className={`h-2.5 w-2.5 shrink-0 rounded-full ${statusDotClass(rowStatus?.status ?? 'open')}`}
          title={rowStatus?.status ?? 'open'}
          aria-hidden
        />
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium text-slate-900">{habit.title}</p>
          <p className="truncate text-xs text-slate-500">{formatMeta(habit)}</p>
        </div>
        {rowStatus && rowStatus.currentStreak > 0 && (
          <span className="hidden sm:inline text-xs text-amber-700 shrink-0">
            🔥 {rowStatus.currentStreak}
          </span>
        )}
        <span className="hidden md:inline text-xs text-slate-500 shrink-0 max-w-[7rem] truncate">
          {formatNext(rowStatus?.nextStart ?? null)}
        </span>
        <div className="relative shrink-0">
          <button
            type="button"
            disabled={!habit.isActive || isScheduling}
            onClick={() => {
              setScheduleOpen((v) => !v);
              setDateOption(null);
            }}
            className="rounded-lg border border-slate-200 px-2 py-1 text-xs font-medium text-primary-700 hover:bg-primary-50 disabled:opacity-50"
          >
            {isScheduling ? (
              <LoadingSpinner size="sm" label="Scheduling" />
            ) : (
              'Schedule'
            )}
          </button>
          {scheduleOpen && !dateOption && (
            <div className="absolute right-0 top-full z-50 mt-1 w-40 rounded-lg border border-slate-200 bg-white py-1 shadow-lg">
              {(['today', 'tomorrow', 'this-week'] as const).map((opt) => (
                <button
                  key={opt}
                  type="button"
                  className="block w-full px-3 py-2 text-left text-xs hover:bg-slate-50 capitalize"
                  onClick={() => setDateOption(opt)}
                >
                  {opt.replace('-', ' ')}
                </button>
              ))}
            </div>
          )}
          {dateOption && (
            <TimeSlotPicker
              habitId={habit.id}
              habitTitle={habit.title}
              dateOption={dateOption}
              align="right"
              onSelectSlot={handleSlotSelect}
              onCancel={() => {
                setDateOption(null);
                setScheduleOpen(false);
              }}
            />
          )}
        </div>
        <HabitRowMenu
          onEdit={() => onEdit(habit)}
          onDelete={() => onDelete(habit.id)}
          identities={identities}
          currentIdentityId={habit.identityId ?? null}
          onMoveToIdentity={
            onMoveToIdentity
              ? (identityId) => onMoveToIdentity(habit.id, identityId)
              : undefined
          }
        />
      </div>
      {adherenceSeries && adherenceSeries.length > 0 && (
        <div className="mt-2 border-t border-slate-100 pt-2">
          <HabitAdherenceMiniChart series={adherenceSeries} compact />
        </div>
      )}
    </div>
  );
}
