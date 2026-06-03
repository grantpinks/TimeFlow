'use client';

import { useEffect, useMemo, useState } from 'react';
import type { Identity, IdentityEvolutionState } from '@timeflow/shared';
import type { EvolutionSurfaceMode } from '@/hooks/useEvolutionSurface';
import * as api from '@/lib/api';
import { ApiRequestError } from '@/lib/api';

const PREVIEW_STAGES = ['Seed', 'Builder', 'Disciplined', 'Embodied', 'Future self'] as const;

function formatUnlockKeyLabel(key: string): string {
  const tail = key.replace(/^flow_[^_]+_/, '').replace(/^mechanic_/, '');
  const words = tail.split('_').filter(Boolean);
  if (words.length === 0) return key;
  return words.map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(' ');
}

function pickLeadingEvolution(states: IdentityEvolutionState[]): IdentityEvolutionState {
  return [...states].sort((a, b) => b.level - a.level || b.xp - a.xp)[0]!;
}

function stageLabel(stage: string): string {
  if (stage === 'FutureSelf') return 'Future self';
  return stage;
}

export interface IdentityProgressionSidebarProps {
  surfaceMode: EvolutionSurfaceMode;
  evolutionStates: IdentityEvolutionState[];
  identities: Identity[];
  timeZone: string;
  /** When set, sidebar shows progression for this identity only */
  focusedIdentityId?: string | null;
  variant?: 'sidebar' | 'embedded';
  onRefresh?: () => void;
  onRetry?: () => void;
}

export function IdentityProgressionSidebar({
  surfaceMode,
  evolutionStates,
  identities,
  timeZone,
  focusedIdentityId = null,
  variant = 'sidebar',
  onRefresh,
  onRetry,
}: IdentityProgressionSidebarProps) {
  const scopedStates = useMemo(() => {
    if (!focusedIdentityId) return evolutionStates;
    return evolutionStates.filter((s) => s.identityId === focusedIdentityId);
  }, [evolutionStates, focusedIdentityId]);

  const leading = useMemo(
    () => (scopedStates.length ? pickLeadingEvolution(scopedStates) : null),
    [scopedStates]
  );

  const stickyClass =
    variant === 'sidebar' ? 'lg:sticky lg:top-4' : '';

  const previewLeadingName = useMemo(() => {
    if (identities.length === 0) return 'Your identity';
    return [...identities].sort((a, b) => a.sortOrder - b.sortOrder)[0]!.name;
  }, [identities]);

  const leadingName = useMemo(() => {
    if (focusedIdentityId) {
      return identities.find((i) => i.id === focusedIdentityId)?.name ?? 'Identity';
    }
    if (!leading) return previewLeadingName;
    return identities.find((i) => i.id === leading.identityId)?.name ?? 'Leading identity';
  }, [leading, identities, previewLeadingName, focusedIdentityId]);

  const progressionTitle = focusedIdentityId ? 'This identity' : 'All identities';

  const [nextUnlockLabel, setNextUnlockLabel] = useState<string | null>(null);

  useEffect(() => {
    if (!leading?.identityId) {
      setNextUnlockLabel(null);
      return;
    }
    let cancelled = false;
    api
      .getIdentityUnlocks(leading.identityId)
      .then((res) => {
        if (cancelled) return;
        const sorted = [...res.unlocks].sort((a, b) => a.grantedAt.localeCompare(b.grantedAt));
        const last = sorted[sorted.length - 1];
        setNextUnlockLabel(last ? formatUnlockKeyLabel(last.unlockKey) : null);
      })
      .catch((e) => {
        if (!cancelled) {
          if (e instanceof ApiRequestError && e.status === 403) setNextUnlockLabel(null);
          else setNextUnlockLabel(null);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [leading?.identityId]);

  const activeTrials = useMemo(
    () =>
      scopedStates.filter(
        (s) => s.trialState === 'Active' && s.trialTargetDays > 0
      ),
    [scopedStates]
  );

  if (surfaceMode === 'degraded') {
    return (
      <aside
        className={`h-fit space-y-4 rounded-2xl border border-amber-200/90 bg-gradient-to-br from-amber-50/90 via-white to-slate-50/90 p-4 shadow-sm ring-1 ring-white/60 backdrop-blur-[2px] ${stickyClass}`}
        data-testid="identity-progression-sidebar"
      >
        <p className="text-[10px] font-bold uppercase tracking-widest text-amber-800/90">
          Progression
        </p>
        <p className="mt-1 text-sm text-slate-800">
          Couldn&apos;t load progression. Check your connection and try again.
        </p>
        {onRetry && (
          <button
            type="button"
            onClick={() => void onRetry()}
            className="w-full rounded-xl border border-amber-300 bg-white py-2 text-sm font-semibold text-amber-900 shadow-sm hover:bg-amber-50"
          >
            Retry
          </button>
        )}
      </aside>
    );
  }

  if (surfaceMode === 'preview' || !leading) {
    return (
      <aside
        className={`h-fit space-y-4 rounded-2xl border border-slate-200/90 bg-gradient-to-br from-teal-50/90 via-white to-slate-50/90 p-4 shadow-sm ring-1 ring-white/60 backdrop-blur-[2px] ${stickyClass}`}
        data-testid="identity-progression-sidebar"
      >
        <div className="flex items-start justify-between gap-2">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-widest text-teal-700/90">
              {progressionTitle}
            </p>
            <p className="mt-1 text-sm font-bold text-slate-900">{previewLeadingName}</p>
            <p className="text-xs text-slate-600">
              Preview — stages unlock as you earn XP on Today.
            </p>
          </div>
          <span className="shrink-0 rounded-full border border-dashed border-slate-300 bg-white/80 px-2 py-0.5 text-[10px] font-semibold text-slate-600">
            Preview
          </span>
        </div>

        <div className="rounded-xl border border-slate-200/80 bg-white/60 p-3">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
            Stage path
          </p>
          <div className="mt-2 flex flex-wrap gap-1">
            {PREVIEW_STAGES.map((label, i) => (
              <span
                key={label}
                className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                  i === 0
                    ? 'border border-teal-200 bg-teal-50 text-teal-900'
                    : 'border border-slate-200 bg-slate-50 text-slate-500'
                }`}
              >
                {label}
              </span>
            ))}
          </div>
        </div>

        <div className="rounded-xl border border-teal-200/60 bg-teal-50/50 p-3">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-teal-800/90">
            How it works
          </p>
          <p className="mt-1 text-sm text-slate-800">
            Link habits to <span className="font-semibold">{previewLeadingName}</span> and complete them
            from Today to build XP, pass trials, and unlock Flow customizations.
          </p>
          <p className="mt-2 text-[10px] text-slate-400">Times use your zone: {timeZone}</p>
        </div>
      </aside>
    );
  }

  return (
    <aside
      className={`h-fit space-y-4 rounded-2xl border border-slate-200/90 bg-gradient-to-br from-teal-50/90 via-white to-slate-50/90 p-4 shadow-sm ring-1 ring-white/60 backdrop-blur-[2px] ${stickyClass}`}
      data-testid="identity-progression-sidebar"
    >
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-widest text-teal-700/90">
            {progressionTitle}
          </p>
          <p className="mt-1 text-sm font-bold text-slate-900">{leadingName}</p>
          <p className="text-xs text-slate-600">
            {focusedIdentityId
              ? `Stage ${stageLabel(leading.stage)}, level ${leading.level}`
              : `Leading by level — stage ${stageLabel(leading.stage)}, level ${leading.level}`}
          </p>
        </div>
        {onRefresh && (
          <button
            type="button"
            onClick={onRefresh}
            className="shrink-0 rounded-lg border border-slate-200 bg-white/80 px-2 py-1 text-[11px] font-semibold text-slate-700 shadow-sm hover:bg-teal-50/80"
          >
            Refresh
          </button>
        )}
      </div>

      <div className="rounded-xl border border-slate-200/80 bg-white/60 p-3">
        <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
          Next unlock hint
        </p>
        <p className="mt-1 text-sm text-slate-800">
          {nextUnlockLabel
            ? `Recent unlock: ${nextUnlockLabel}. Keep leveling to open more Flow customizations.`
            : 'Complete habits linked to your leading identity to earn XP and unlock Flow palettes, emotes, and more.'}
        </p>
      </div>

      <div className="rounded-xl border border-slate-200/80 bg-white/60 p-3">
        <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
          Active trials
        </p>
        {activeTrials.length === 0 ? (
          <p className="mt-2 text-xs text-slate-600">No active trials right now.</p>
        ) : (
          <ul className="mt-2 space-y-2">
            {activeTrials.map((s) => {
              const name = identities.find((i) => i.id === s.identityId)?.name ?? 'Identity';
              return (
                <li
                  key={s.identityId}
                  className="flex items-center justify-between gap-2 text-xs text-slate-800"
                >
                  <span className="truncate font-medium">{name}</span>
                  <span className="shrink-0 tabular-nums text-slate-600">
                    {s.trialActiveDays}/{s.trialTargetDays}d
                  </span>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      <div className="rounded-xl border border-teal-200/60 bg-teal-50/50 p-3">
        <p className="text-[11px] font-semibold uppercase tracking-wide text-teal-800/90">
          Stage focus
        </p>
        <p className="mt-1 text-sm text-slate-800">
          You are in the <span className="font-semibold">{stageLabel(leading.stage)}</span> stage
          on <span className="font-semibold">{leadingName}</span>. Linked habits on this page count
          toward trials when scheduled and completed.
        </p>
        <p className="mt-2 text-[10px] text-slate-400">Times use your zone: {timeZone}</p>
      </div>
    </aside>
  );
}
