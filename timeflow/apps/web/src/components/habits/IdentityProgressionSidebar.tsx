'use client';

import { useEffect, useMemo, useState } from 'react';
import type { Identity, IdentityEvolutionState } from '@timeflow/shared';
import * as api from '@/lib/api';
import { ApiRequestError } from '@/lib/api';

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
  evolutionStates: IdentityEvolutionState[];
  identities: Identity[];
  timeZone: string;
  onRefresh?: () => void;
}

export function IdentityProgressionSidebar({
  evolutionStates,
  identities,
  timeZone,
  onRefresh,
}: IdentityProgressionSidebarProps) {
  const leading = useMemo(
    () => (evolutionStates.length ? pickLeadingEvolution(evolutionStates) : null),
    [evolutionStates]
  );

  const leadingName = useMemo(() => {
    if (!leading) return '';
    return identities.find((i) => i.id === leading.identityId)?.name ?? 'Leading identity';
  }, [leading, identities]);

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
      evolutionStates.filter(
        (s) => s.trialState === 'Active' && s.trialTargetDays > 0
      ),
    [evolutionStates]
  );

  if (!leading) return null;

  return (
    <aside
      className="h-fit space-y-4 rounded-2xl border border-slate-200/90 bg-gradient-to-br from-teal-50/90 via-white to-slate-50/90 p-4 shadow-sm ring-1 ring-white/60 backdrop-blur-[2px] lg:sticky lg:top-4"
      data-testid="identity-progression-sidebar"
    >
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-widest text-teal-700/90">
            Progression
          </p>
          <p className="mt-1 text-sm font-bold text-slate-900">{leadingName}</p>
          <p className="text-xs text-slate-600">
            Leading by level — stage {stageLabel(leading.stage)}, level {leading.level}
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
