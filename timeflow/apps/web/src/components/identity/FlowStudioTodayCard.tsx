'use client';

import Link from 'next/link';
import type { IdentityDayProgress, IdentityEvolutionState } from '@timeflow/shared';
import type { EvolutionSurfaceMode } from '@/hooks/useEvolutionSurface';
import { FlowMascot } from '@/components/FlowMascot';

interface FlowStudioTodayCardProps {
  identities: IdentityDayProgress[];
  evolutionStates: IdentityEvolutionState[];
  evolutionMode: EvolutionSurfaceMode;
  evolutionFeatureEnabled: boolean;
  loading?: boolean;
}

function stageLabel(stage: string): string {
  return stage === 'FutureSelf' ? 'Future self' : stage;
}

function pickLeadingEvolution(states: IdentityEvolutionState[]): IdentityEvolutionState | null {
  return [...states].sort((a, b) => b.level - a.level || b.xp - a.xp)[0] ?? null;
}

export function FlowStudioTodayCard({
  identities,
  evolutionStates,
  evolutionMode,
  evolutionFeatureEnabled,
  loading = false,
}: FlowStudioTodayCardProps) {
  const totalCompletions = identities.reduce((sum, identity) => sum + identity.completedCount, 0);
  const totalMinutes = identities.reduce((sum, identity) => sum + identity.totalMinutes, 0);
  const leadingEvolution = evolutionMode === 'active' ? pickLeadingEvolution(evolutionStates) : null;
  const leadingIdentity = leadingEvolution
    ? identities.find((identity) => identity.identityId === leadingEvolution.identityId) ?? null
    : identities.find((identity) => identity.completedCount > 0) ?? identities[0] ?? null;

  if (loading) {
    return <div className="h-28 animate-pulse rounded-2xl bg-slate-100" aria-label="Loading Flow Studio summary" />;
  }

  const statusLabel = leadingEvolution
    ? `Level ${leadingEvolution.level} · ${stageLabel(leadingEvolution.stage)}`
    : evolutionFeatureEnabled
      ? 'Progression is ready'
      : 'Preview mode';

  return (
    <section className="rounded-2xl border border-teal-200/70 bg-gradient-to-br from-teal-50/90 via-white to-slate-50/90 p-4 shadow-sm">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex min-w-0 items-center gap-3">
          <div className="shrink-0 rounded-2xl border border-white/70 bg-white/70 p-2 shadow-sm">
            <FlowMascot size="md" expression="happy" showAccessory={false} />
          </div>
          <div className="min-w-0">
            <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-teal-700">
              Flow Studio
            </p>
            <h2 className="mt-1 truncate text-base font-semibold text-slate-950">
              {leadingIdentity?.name ?? 'Your identities'}
            </h2>
            <p className="mt-0.5 text-sm text-slate-600">{statusLabel}</p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 sm:justify-end">
          <span className="rounded-full bg-white/80 px-3 py-1 text-xs font-semibold text-slate-700 shadow-sm">
            {totalCompletions} completion{totalCompletions === 1 ? '' : 's'} today
          </span>
          {totalMinutes > 0 ? (
            <span className="rounded-full bg-white/80 px-3 py-1 text-xs font-semibold text-slate-700 shadow-sm">
              {totalMinutes}m logged
            </span>
          ) : null}
          <Link
            href="/flow-studio"
            className="inline-flex items-center justify-center rounded-full bg-teal-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-teal-700"
          >
            Open Flow Studio
          </Link>
        </div>
      </div>
      <div className="mt-4 flex flex-col gap-3 rounded-2xl border border-white/80 bg-white/65 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-slate-500">
            Today&apos;s identity actions
          </p>
          <p className="mt-1 text-sm text-slate-600">
            Keep planning and scheduling identity-linked habits without loading reward previews here.
          </p>
        </div>
        <Link
          href="/habits"
          className="inline-flex shrink-0 items-center justify-center rounded-full border border-teal-200 bg-white px-4 py-2 text-sm font-semibold text-teal-700 shadow-sm transition hover:border-teal-300 hover:bg-teal-50"
        >
          Plan identity habits
        </Link>
      </div>
    </section>
  );
}
