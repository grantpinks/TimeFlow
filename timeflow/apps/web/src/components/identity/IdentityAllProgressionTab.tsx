'use client';

import { useMemo } from 'react';
import type { IdentityDayProgress, IdentityEvolutionState } from '@timeflow/shared';
import type { EvolutionSurfaceMode } from '@/hooks/useEvolutionSurface';
import { IdentityProgressionTab } from './IdentityProgressionTab';

interface IdentityAllProgressionTabProps {
  identities: IdentityDayProgress[];
  evolutionStates: IdentityEvolutionState[];
  evolutionMode: EvolutionSurfaceMode;
  evolutionFeatureEnabled: boolean;
  evolutionLoading?: boolean;
  onRetry?: () => void;
  onSelectIdentity?: (identityId: string) => void;
  timeZone: string;
}

function stageLabel(stage: string): string {
  if (stage === 'FutureSelf') return 'Future self';
  return stage;
}

export function IdentityAllProgressionTab({
  identities,
  evolutionStates,
  evolutionMode,
  evolutionFeatureEnabled,
  evolutionLoading = false,
  onRetry,
  onSelectIdentity,
  timeZone,
}: IdentityAllProgressionTabProps) {
  if (!evolutionFeatureEnabled) {
    return (
      <IdentityProgressionTab
        evolution={null}
        upcoming={null}
        evolutionMode={evolutionMode}
        evolutionFeatureEnabled={false}
        dayProgress={null}
        evolutionLoading={evolutionLoading}
        onRetry={onRetry}
        timeZone={timeZone}
      />
    );
  }

  if (evolutionLoading && evolutionStates.length === 0) {
    return <div className="h-48 animate-pulse rounded-xl bg-slate-100" />;
  }

  if (evolutionStates.length === 0) {
    return (
      <IdentityProgressionTab
        evolution={null}
        upcoming={null}
        evolutionMode={evolutionMode}
        evolutionFeatureEnabled
        dayProgress={identities[0] ?? null}
        evolutionLoading={false}
        onRetry={onRetry}
        timeZone={timeZone}
      />
    );
  }

  const stateByIdentity = useMemo(
    () => new Map(evolutionStates.map((s) => [s.identityId, s])),
    [evolutionStates]
  );

  return (
    <div className="space-y-3">
      <p className="text-[11px] font-bold uppercase tracking-widest text-slate-500">
        Progression · all identities
      </p>
      <ul className="space-y-2">
        {identities.map((id) => {
          const evo = stateByIdentity.get(id.identityId);
          return (
            <li
              key={id.identityId}
              className="flex items-center justify-between gap-3 rounded-xl border border-slate-100 bg-slate-50/60 px-3 py-2.5"
            >
              <button
                type="button"
                onClick={() => onSelectIdentity?.(id.identityId)}
                className="flex min-w-0 flex-1 items-center gap-2 text-left hover:opacity-80"
              >
                <span aria-hidden>{id.icon}</span>
                <span className="truncate text-sm font-semibold text-slate-900">{id.name}</span>
              </button>
              {evo ? (
                <span className="shrink-0 text-xs tabular-nums text-slate-600">
                  L{evo.level} · {stageLabel(evo.stage)}
                  {evo.xpToNextLevel > 0 && (
                    <span className="ml-1.5 text-slate-400">{evo.xpToNextLevel} XP to next</span>
                  )}
                </span>
              ) : (
                <span className="shrink-0 text-xs text-slate-400">No data</span>
              )}
              {onSelectIdentity && (
                <button
                  type="button"
                  onClick={() => onSelectIdentity(id.identityId)}
                  className="shrink-0 text-[10px] font-semibold text-teal-700 hover:text-teal-800"
                >
                  Details →
                </button>
              )}
            </li>
          );
        })}
      </ul>
      <p className="text-center text-xs text-slate-500">
        Select an identity above for full stage path, unlocks, and trials.
      </p>
    </div>
  );
}
