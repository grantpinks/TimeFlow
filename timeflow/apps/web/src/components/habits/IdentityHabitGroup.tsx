'use client';

import type { ReactNode } from 'react';
import type { Habit, Identity, IdentityEvolutionState } from '@timeflow/shared';

function stageLabel(stage: string): string {
  if (stage === 'FutureSelf') return 'Future self';
  return stage;
}

export interface IdentityHabitGroupProps {
  identity: Identity | null;
  /** True when this bucket is habits without an identity link */
  isUnassigned?: boolean;
  habits: Habit[];
  evolution?: IdentityEvolutionState | null;
  children: ReactNode;
}

export function IdentityHabitGroup({
  identity,
  isUnassigned = false,
  habits,
  evolution,
  children,
}: IdentityHabitGroupProps) {
  const stripColor = isUnassigned ? '#94a3b8' : identity?.color ?? '#64748b';
  const title = isUnassigned
    ? 'Unassigned'
    : identity
      ? `${identity.icon} ${identity.name}`
      : 'Unlinked identity';

  const showTrialLine =
    evolution?.trialState === 'Active' &&
    evolution.trialTargetDays > 0;

  return (
    <section
      className="overflow-hidden rounded-2xl border border-slate-200/90 bg-gradient-to-br from-teal-50/40 via-white to-slate-50/80 shadow-sm ring-1 ring-white/50 backdrop-blur-[2px]"
      data-testid="identity-habit-group"
      aria-label={`${habits.length} habit${habits.length === 1 ? '' : 's'}`}
    >
      <header className="flex flex-wrap items-center gap-3 border-b border-slate-200/70 bg-white/40 px-4 py-3">
        <div
          className="h-9 w-1 shrink-0 rounded-full shadow-sm"
          style={{ backgroundColor: stripColor }}
          aria-hidden
        />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="truncate text-sm font-bold text-slate-900">{title}</h3>
            {evolution && (
              <span
                className="inline-flex shrink-0 items-center rounded-full border border-teal-200/90 bg-white/80 px-2 py-0.5 text-[11px] font-semibold text-teal-900 shadow-sm"
                data-testid="identity-habit-group-stage-badge"
              >
                {stageLabel(evolution.stage)}
              </span>
            )}
          </div>
          {showTrialLine && (
            <p
              className="mt-1 text-xs text-slate-600"
              data-testid="identity-habit-group-trial-line"
            >
              Trial: {evolution.trialActiveDays}/{evolution.trialTargetDays} days
            </p>
          )}
        </div>
      </header>
      <div className="space-y-3 p-3 sm:p-4">{children}</div>
    </section>
  );
}
