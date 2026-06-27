'use client';

import { useMemo } from 'react';
import type { Identity, IdentityEvolutionState } from '@timeflow/shared';
import type { EvolutionSurfaceMode } from '@/hooks/useEvolutionSurface';
import { useUpcomingUnlocks } from '@/hooks/useUpcomingUnlocks';
import { FlowEvolutionHero } from '@/components/identity/FlowEvolutionHero';
import { FlowCustomizationPanel } from '@/components/identity/FlowCustomizationPanel';

function stageLabel(stage: string): string {
  return stage === 'FutureSelf' ? 'Future self' : stage;
}

function pickLeadingEvolution(states: IdentityEvolutionState[]): IdentityEvolutionState | null {
  return [...states].sort((a, b) => b.level - a.level || b.xp - a.xp)[0] ?? null;
}

function unlockIcon(unlockKey: string): string {
  if (unlockKey.includes('palette')) return '🎨';
  if (unlockKey.includes('eyes') || unlockKey.includes('gaze') || unlockKey.includes('focus')) return '👁';
  if (unlockKey.includes('aura') || unlockKey.includes('orbit') || unlockKey.includes('ring')) return '✨';
  if (unlockKey.includes('background') || unlockKey.includes('field') || unlockKey.includes('sky')) return '🌅';
  if (unlockKey.includes('hat') || unlockKey.includes('cap') || unlockKey.includes('crown')) return '👑';
  return '✦';
}

export interface IdentityStudioEvolutionPanelProps {
  evolutionEnabled: boolean;
  isAuthenticated: boolean;
  surfaceMode: EvolutionSurfaceMode;
  evolutionStates: IdentityEvolutionState[];
  identities: Identity[];
  loading: boolean;
  timeZone: string;
  focusedIdentityId?: string | null;
  onRefresh?: () => void;
}

export function IdentityStudioEvolutionPanel({
  evolutionEnabled,
  isAuthenticated,
  surfaceMode,
  evolutionStates,
  identities,
  loading,
  timeZone,
  focusedIdentityId = null,
  onRefresh,
}: IdentityStudioEvolutionPanelProps) {
  const scopedStates = useMemo(
    () =>
      focusedIdentityId
        ? evolutionStates.filter((state) => state.identityId === focusedIdentityId)
        : evolutionStates,
    [evolutionStates, focusedIdentityId]
  );
  const leadingEvolution = useMemo(() => pickLeadingEvolution(scopedStates), [scopedStates]);
  const leadingIdentity = useMemo(() => {
    if (focusedIdentityId) return identities.find((identity) => identity.id === focusedIdentityId) ?? null;
    if (leadingEvolution) return identities.find((identity) => identity.id === leadingEvolution.identityId) ?? null;
    return [...identities].sort((a, b) => a.sortOrder - b.sortOrder)[0] ?? null;
  }, [focusedIdentityId, identities, leadingEvolution]);

  const { data: upcoming, loading: upcomingLoading } = useUpcomingUnlocks(
    evolutionEnabled && isAuthenticated && leadingEvolution ? leadingEvolution.identityId : null,
    isAuthenticated
  );

  const stats = useMemo(() => {
    const states = evolutionStates;
    const activeTrials = states.filter((state) => state.trialState === 'Active').length;
    const totalXp = states.reduce((sum, state) => sum + state.xp, 0);
    const averageLevel = states.length
      ? Math.round((states.reduce((sum, state) => sum + state.level, 0) / states.length) * 10) / 10
      : 0;
    return {
      activeIdentities: identities.filter((identity) => identity.isActive).length,
      activeTrials,
      totalXp,
      averageLevel,
    };
  }, [evolutionStates, identities]);

  const modeLabel =
    surfaceMode === 'active'
      ? 'Live progression'
      : surfaceMode === 'degraded'
        ? 'Progression needs refresh'
        : 'Preview mode';

  return (
    <section
      data-testid="identity-studio-evolution-panel"
      className="relative overflow-hidden rounded-3xl border border-teal-200/70 bg-[radial-gradient(circle_at_top_left,_rgba(20,184,166,0.18),_transparent_32%),linear-gradient(135deg,_rgba(240,253,250,0.96),_rgba(255,255,255,0.92)_45%,_rgba(248,250,252,0.96))] p-5 shadow-sm ring-1 ring-white/70 backdrop-blur-sm"
      aria-label="Identity evolution panel"
    >
      <div className="absolute right-0 top-0 h-28 w-28 rounded-bl-full bg-teal-200/20" aria-hidden />
      <div className="relative space-y-5">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-teal-700">
              Identity evolution
            </p>
            <h2 className="mt-1 text-2xl font-semibold tracking-tight text-slate-950">
              Flow progression studio
            </h2>
            <p className="mt-1 max-w-2xl text-sm leading-6 text-slate-600">
              Track who you are becoming, preview the next rewards, and shape Flow&apos;s look from the same
              Identity Studio workspace.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-full border border-teal-200 bg-white/80 px-3 py-1 text-xs font-semibold text-teal-800 shadow-sm">
              {modeLabel}
            </span>
            {onRefresh ? (
              <button
                type="button"
                onClick={onRefresh}
                className="rounded-full border border-slate-200 bg-white/85 px-3 py-1 text-xs font-semibold text-slate-700 shadow-sm transition hover:border-teal-300 hover:bg-teal-50"
              >
                Refresh
              </button>
            ) : null}
          </div>
        </div>

        <div className="grid gap-4 xl:grid-cols-[minmax(0,1.05fr)_minmax(320px,0.95fr)]">
          <div className="space-y-4">
            <div className="rounded-2xl border border-white/80 bg-white/70 p-4 shadow-sm">
              <FlowEvolutionHero
                mode={surfaceMode}
                evolution={leadingEvolution}
                identityName={leadingIdentity?.name ?? 'Your leading identity'}
                timeZone={timeZone}
                loading={loading}
                onRetry={onRefresh}
              />
            </div>

            <div className="grid gap-3 sm:grid-cols-4">
              <StatCard label="Active identities" value={stats.activeIdentities.toString()} />
              <StatCard label="Average level" value={stats.averageLevel.toString()} />
              <StatCard label="Total XP" value={stats.totalXp.toLocaleString()} />
              <StatCard label="Active trials" value={stats.activeTrials.toString()} />
            </div>
          </div>

          <div className="space-y-4">
            <div className="rounded-2xl border border-slate-200/80 bg-white/75 p-4 shadow-sm">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-slate-500">
                    Future unlock previews
                  </p>
                  <h3 className="mt-1 text-base font-semibold text-slate-900">
                    {leadingIdentity?.name ?? 'Your identity'} rewards
                  </h3>
                </div>
                {leadingEvolution ? (
                  <span className="rounded-full bg-teal-50 px-2.5 py-1 text-xs font-semibold text-teal-800">
                    Level {leadingEvolution.level} · {stageLabel(leadingEvolution.stage)}
                  </span>
                ) : null}
              </div>

              {upcomingLoading ? (
                <div className="mt-4 space-y-2" aria-busy="true">
                  <div className="h-12 animate-pulse rounded-xl bg-slate-100" />
                  <div className="h-12 animate-pulse rounded-xl bg-slate-100" />
                </div>
              ) : upcoming?.upcoming.length ? (
                <ul className="mt-4 space-y-2">
                  {upcoming.upcoming.slice(0, 4).map((unlock) => (
                    <li
                      key={unlock.unlockKey}
                      className="flex gap-3 rounded-xl border border-slate-100 bg-slate-50/75 p-3"
                    >
                      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white text-lg shadow-sm">
                        {unlockIcon(unlock.unlockKey)}
                      </span>
                      <span className="min-w-0">
                        <span className="block text-sm font-semibold text-slate-900">
                          {unlock.displayName}
                        </span>
                        <span className="block text-xs leading-5 text-slate-600">
                          {unlock.description}
                        </span>
                        <span className="mt-1 inline-flex text-[11px] font-semibold text-teal-700">
                          {unlock.grantedByLevel
                            ? `Unlocks at level ${unlock.grantedByLevel}`
                            : unlock.grantedByStage
                              ? `Unlocks at ${stageLabel(unlock.grantedByStage)} stage`
                              : 'Unlock coming soon'}
                        </span>
                      </span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="mt-4 rounded-xl border border-dashed border-slate-200 bg-slate-50/80 p-3 text-sm text-slate-600">
                  Complete identity-linked habits to reveal upcoming Flow rewards.
                </p>
              )}
            </div>

            <FlowCustomizationPanel evolutionEnabled={evolutionEnabled && isAuthenticated} />
          </div>
        </div>
      </div>
    </section>
  );
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-white/80 bg-white/70 p-3 shadow-sm">
      <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500">{label}</p>
      <p className="mt-1 text-xl font-semibold tabular-nums text-slate-950">{value}</p>
    </div>
  );
}
