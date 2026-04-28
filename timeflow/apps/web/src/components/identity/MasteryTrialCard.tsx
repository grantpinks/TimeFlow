'use client';

/**
 * Compact mastery-trial summary for the Flow Evolution hero.
 */

import { useMemo } from 'react';
import { DateTime } from 'luxon';
import type { IdentityEvolutionState, IdentityTrialState } from '@timeflow/shared';

function trialPillLabel(state: IdentityTrialState): { label: string; className: string } {
  switch (state) {
    case 'NotStarted':
      return { label: 'Not started', className: 'bg-slate-100 text-slate-600 ring-slate-200/80' };
    case 'Active':
      return { label: 'Active', className: 'bg-teal-50 text-teal-800 ring-teal-200/80' };
    case 'CheckpointFailed':
      return { label: 'Checkpoint', className: 'bg-amber-50 text-amber-900 ring-amber-200/80' };
    case 'Passed':
      return { label: 'Passed', className: 'bg-emerald-50 text-emerald-800 ring-emerald-200/80' };
    case 'Failed':
      return { label: 'Failed', className: 'bg-rose-50 text-rose-800 ring-rose-200/80' };
    default:
      return { label: String(state), className: 'bg-slate-100 text-slate-600' };
  }
}

function dayOfWindow(
  trialStartedAt: string | null,
  trialEndsAt: string | null,
  windowDays: number,
  timeZone: string
): { day: number; total: number } | null {
  if (!trialStartedAt || !trialEndsAt || windowDays <= 0) return null;
  const zone = timeZone || 'UTC';
  const start = DateTime.fromISO(trialStartedAt, { zone });
  const now = DateTime.now().setZone(zone);
  if (!start.isValid) return null;
  const startDay = start.startOf('day');
  const nowDay = now.startOf('day');
  if (nowDay < startDay) {
    return { day: 1, total: windowDays };
  }
  const daysElapsed = Math.floor(nowDay.diff(startDay, 'days').days);
  const day = Math.min(windowDays, Math.max(1, daysElapsed + 1));
  return { day, total: windowDays };
}

export interface MasteryTrialCardProps {
  evolution: IdentityEvolutionState;
  timeZone: string;
}

export function MasteryTrialCard({ evolution, timeZone }: MasteryTrialCardProps) {
  const pill = trialPillLabel(evolution.trialState);
  const target = Math.max(1, evolution.trialTargetDays);
  const active = Math.min(evolution.trialActiveDays, target);
  const trialProgress = target > 0 ? active / target : 0;

  const windowLabel = useMemo(
    () => dayOfWindow(evolution.trialStartedAt, evolution.trialEndsAt, evolution.trialWindowDays, timeZone),
    [evolution.trialStartedAt, evolution.trialEndsAt, evolution.trialWindowDays, timeZone]
  );

  const showCheckpointCopy =
    evolution.trialState === 'CheckpointFailed' ||
    (evolution.trialState === 'Active' && evolution.trialCheckpointDays > 0);

  return (
    <div
      className="rounded-xl border border-slate-200/80 bg-white/50 px-3 py-2.5 shadow-sm ring-1 ring-slate-100/80 backdrop-blur-sm"
      data-testid="mastery-trial-card"
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span
          className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wide ring-1 ${pill.className}`}
        >
          {pill.label}
        </span>
        {windowLabel && evolution.trialState !== 'NotStarted' && (
          <span className="text-[11px] font-medium text-slate-500">
            Day {windowLabel.day} of {windowLabel.total}
          </span>
        )}
      </div>

      {evolution.trialState !== 'NotStarted' && (
        <div className="mt-2">
          <div className="mb-1 flex justify-between text-[11px] text-slate-600">
            <span>Trial days</span>
            <span className="tabular-nums font-semibold text-slate-700">
              {active} / {target}
            </span>
          </div>
          <div
            className="h-1.5 w-full overflow-hidden rounded-full bg-slate-200/80"
            role="progressbar"
            aria-valuenow={active}
            aria-valuemin={0}
            aria-valuemax={target}
            aria-label="Mastery trial progress"
          >
            <div
              className="h-full rounded-full bg-gradient-to-r from-teal-500 to-teal-600 transition-[width] duration-500 ease-out"
              style={{ width: `${Math.round(trialProgress * 100)}%` }}
            />
          </div>
        </div>
      )}

      {showCheckpointCopy && (
        <p className="mt-2 text-[11px] leading-snug text-slate-600">
          You missed a few days — your progress is saved at a checkpoint. Keep going from here.
        </p>
      )}
    </div>
  );
}
