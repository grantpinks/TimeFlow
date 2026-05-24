'use client';

import { useState, useMemo } from 'react';
import type { IdentityDayProgress, IdentityEvolutionState } from '@timeflow/shared';
import type { EvolutionSurfaceMode } from '@/hooks/useEvolutionSurface';
import { useIdentityConsistency } from '@/hooks/useIdentityConsistency';
import { useUpcomingUnlocks } from '@/hooks/useUpcomingUnlocks';
import { IdentityTodayTab } from './IdentityTodayTab';
import { IdentityProgressionTab } from './IdentityProgressionTab';
import { FlowMascot } from '@/components/FlowMascot';

type TabId = 'today' | 'progression';

interface IdentityPanelProps {
  identities: IdentityDayProgress[];
  evolutionStates: IdentityEvolutionState[];
  evolutionMode: EvolutionSurfaceMode;
  sessionReady: boolean;
  timeZone: string;
  loading?: boolean;
}

function greeting(totalDone: number): string {
  const h = new Date().getHours();
  if (totalDone === 0) {
    if (h < 12) return "Your day is wide open — let's start strong!";
    if (h < 17) return 'Afternoon already. Pick one identity and go.';
    return 'Evening is still time to grow.';
  }
  if (h < 12) return `Nice start — ${totalDone} done before noon!`;
  if (h < 17) return `Solid afternoon. ${totalDone} completions so far.`;
  if (h < 20) return `Good evening! ${totalDone} done today.`;
  return `Wrapping up with ${totalDone} completions. Well done!`;
}

export function IdentityPanel({
  identities,
  evolutionStates,
  evolutionMode,
  sessionReady,
  timeZone,
  loading = false,
}: IdentityPanelProps) {
  const [activeTab, setActiveTab] = useState<TabId>('today');
  const [selectedIdentityId, setSelectedIdentityId] = useState<string | null>(
    identities[0]?.identityId ?? null
  );

  // Keep selection valid if identities list changes
  const validId = useMemo(() => {
    if (!selectedIdentityId) return identities[0]?.identityId ?? null;
    return identities.find((i) => i.identityId === selectedIdentityId)
      ? selectedIdentityId
      : identities[0]?.identityId ?? null;
  }, [selectedIdentityId, identities]);

  const selectedIdentity = identities.find((i) => i.identityId === validId) ?? null;
  const selectedEvolution = evolutionStates.find((s) => s.identityId === validId) ?? null;

  const totalDone = identities.reduce((s, i) => s + i.completedCount, 0);

  const { data: consistencyData, loading: consistencyLoading } = useIdentityConsistency(
    validId,
    sessionReady
  );
  const { data: upcomingData, loading: upcomingLoading } = useUpcomingUnlocks(
    // Only fetch upcoming unlocks when evolution is fully active
    evolutionMode === 'active' ? validId : null,
    sessionReady
  );

  if (loading) {
    return <div className="h-64 animate-pulse rounded-2xl bg-slate-100" />;
  }

  return (
    <div className="w-full overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm">

      {/* Greeting strip */}
      <div className="flex items-center gap-3 border-b border-slate-100 bg-gradient-to-r from-teal-50/80 via-white to-primary-50/40 px-4 py-3">
        <FlowMascot size="sm" expression="happy" />
        <p className="text-sm font-semibold text-slate-800">{greeting(totalDone)}</p>
      </div>

      {/* Identity pill selector — only shown when there are multiple identities */}
      {identities.length > 1 && (
        <div className="flex gap-2 overflow-x-auto border-b border-slate-100 px-4 py-2.5 scrollbar-none">
          {identities.map((id) => (
            <button
              key={id.identityId}
              type="button"
              onClick={() => setSelectedIdentityId(id.identityId)}
              className={`flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold transition-colors ${
                validId === id.identityId
                  ? 'bg-teal-600 text-white shadow-sm'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              <span>{id.icon}</span>
              <span>{id.name}</span>
              {id.completedCount > 0 && (
                <span
                  className={`rounded-full px-1 text-[10px] font-bold ${
                    validId === id.identityId
                      ? 'bg-teal-500 text-white'
                      : 'bg-slate-200 text-slate-600'
                  }`}
                >
                  {id.completedCount}✓
                </span>
              )}
            </button>
          ))}
        </div>
      )}

      {/* Tab switcher */}
      <div className="flex gap-1 border-b border-slate-100 bg-slate-50/70 px-4 py-2">
        {(['today', 'progression'] as TabId[]).map((tab) => (
          <button
            key={tab}
            type="button"
            onClick={() => setActiveTab(tab)}
            className={`rounded-lg px-4 py-1.5 text-xs font-bold capitalize transition-all ${
              activeTab === tab
                ? 'bg-white text-slate-900 shadow-sm ring-1 ring-slate-200'
                : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            {tab === 'today' ? 'Today' : 'Progression'}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div className="px-4 py-4">
        {activeTab === 'today' ? (
          <IdentityTodayTab
            habits={consistencyData?.habits ?? []}
            loading={consistencyLoading}
            todayDone={selectedIdentity?.completedCount ?? 0}
            todayMinutes={selectedIdentity?.totalMinutes ?? 0}
            // IdentityDayProgress uses currentStreak, not streakDays
            streakDays={selectedIdentity?.currentStreak}
          />
        ) : (
          <IdentityProgressionTab
            evolution={selectedEvolution}
            upcoming={upcomingData}
            loading={upcomingLoading}
            timeZone={timeZone}
          />
        )}
      </div>
    </div>
  );
}
