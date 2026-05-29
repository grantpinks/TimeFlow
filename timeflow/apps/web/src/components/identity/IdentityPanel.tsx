'use client';

import { useState, useMemo, useEffect } from 'react';
import type { IdentityDayProgress, IdentityEvolutionState } from '@timeflow/shared';
import type { EvolutionSurfaceMode } from '@/hooks/useEvolutionSurface';
import { useIdentityConsistency } from '@/hooks/useIdentityConsistency';
import { useAllIdentitiesConsistency } from '@/hooks/useAllIdentitiesConsistency';
import { useUpcomingUnlocks } from '@/hooks/useUpcomingUnlocks';
import { useTodayHabitSchedule } from '@/hooks/useTodayHabitSchedule';
import { useUser } from '@/hooks/useUser';
import { IdentityTodayTab } from './IdentityTodayTab';
import { IdentityAllTodayTab } from './IdentityAllTodayTab';
import { IdentityProgressionTab } from './IdentityProgressionTab';
import { IdentityAllProgressionTab } from './IdentityAllProgressionTab';
import { FlowMascot } from '@/components/FlowMascot';

type TabId = 'today' | 'progression';

/** Sentinel: overview of every identity */
export const ALL_IDENTITIES_ID = '__all__';

interface IdentityPanelProps {
  identities: IdentityDayProgress[];
  evolutionStates: IdentityEvolutionState[];
  evolutionMode: EvolutionSurfaceMode;
  evolutionFeatureEnabled: boolean;
  evolutionLoading?: boolean;
  onRefreshEvolution?: () => void;
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
  evolutionFeatureEnabled,
  evolutionLoading = false,
  onRefreshEvolution,
  sessionReady,
  timeZone,
  loading = false,
}: IdentityPanelProps) {
  const [activeTab, setActiveTab] = useState<TabId>('today');
  const showAllPill = identities.length > 1;
  const [selectedIdentityId, setSelectedIdentityId] = useState<string | null>(
    showAllPill ? ALL_IDENTITIES_ID : identities[0]?.identityId ?? null
  );

  useEffect(() => {
    if (identities.length > 1 && selectedIdentityId === null) {
      setSelectedIdentityId(ALL_IDENTITIES_ID);
    } else if (
      selectedIdentityId &&
      selectedIdentityId !== ALL_IDENTITIES_ID &&
      !identities.find((i) => i.identityId === selectedIdentityId)
    ) {
      setSelectedIdentityId(showAllPill ? ALL_IDENTITIES_ID : identities[0]?.identityId ?? null);
    } else if (identities.length === 1 && selectedIdentityId === ALL_IDENTITIES_ID) {
      setSelectedIdentityId(identities[0]?.identityId ?? null);
    }
  }, [identities, selectedIdentityId, showAllPill]);

  const isAllView = selectedIdentityId === ALL_IDENTITIES_ID && showAllPill;

  const validId = useMemo(() => {
    if (isAllView) return ALL_IDENTITIES_ID;
    if (!selectedIdentityId) return identities[0]?.identityId ?? null;
    return identities.find((i) => i.identityId === selectedIdentityId)
      ? selectedIdentityId
      : identities[0]?.identityId ?? null;
  }, [selectedIdentityId, identities, isAllView]);

  const selectedIdentity = isAllView
    ? null
    : identities.find((i) => i.identityId === validId) ?? null;
  const selectedEvolution = isAllView
    ? null
    : evolutionStates.find((s) => s.identityId === validId) ?? null;

  const totalDone = identities.reduce((s, i) => s + i.completedCount, 0);
  const identityIds = useMemo(() => identities.map((i) => i.identityId), [identities]);
  // Stable reference: do not pass a raw `[]` literal — new reference every render
  // would cause useAllIdentitiesConsistency's useCallback to rebuild on every paint,
  // firing fetchAll() → setSections([]) → re-render → infinite loop.
  const allIdentityIds = useMemo(
    () => (isAllView ? identityIds : []),
    [isAllView, identityIds]
  );

  const { data: consistencyData, loading: consistencyLoading } = useIdentityConsistency(
    isAllView ? null : validId,
    sessionReady
  );

  const {
    sections: allSections,
    loading: allConsistencyLoading,
    allHabits,
    refresh: refreshAllConsistency,
  } = useAllIdentitiesConsistency(allIdentityIds, sessionReady);

  const { data: upcomingData, loading: upcomingLoading } = useUpcomingUnlocks(
    evolutionMode === 'active' && !isAllView ? validId : null,
    sessionReady
  );
  const { user } = useUser();

  const habitPlanMeta = useMemo(() => {
    if (isAllView) return allHabits;
    return (consistencyData?.habits ?? []).map((h) => ({
      habitId: h.habitId,
      habitName: h.habitName,
    }));
  }, [isAllView, allHabits, consistencyData?.habits]);

  const habitsLoading = isAllView ? allConsistencyLoading : consistencyLoading;

  const { instances: scheduledInstances, scheduleHabit } = useTodayHabitSchedule(sessionReady, {
    habits: habitPlanMeta,
    habitsLoading,
    prefixEnabled: user?.eventPrefixEnabled ?? true,
    prefix: user?.eventPrefix ?? null,
  });

  const handleScheduleHabit = async (
    habitId: string,
    title: string,
    startISO: string,
    durationMinutes: number
  ) => {
    await scheduleHabit(habitId, title, startISO, durationMinutes);
    if (isAllView) void refreshAllConsistency();
  };

  if (loading) {
    return <div className="h-64 animate-pulse rounded-2xl bg-slate-100" />;
  }

  return (
    <div className="w-full rounded-2xl border border-slate-200/80 bg-white shadow-sm">

      {/* Greeting strip */}
      <div className="flex items-center gap-3 rounded-t-2xl border-b border-slate-100 bg-gradient-to-r from-teal-50/80 via-white to-primary-50/40 px-4 py-3">
        <FlowMascot size="sm" expression="happy" />
        <p className="text-sm font-semibold text-slate-800">{greeting(totalDone)}</p>
      </div>

      {/* Identity pill selector */}
      {showAllPill && (
        <div className="flex gap-2 overflow-x-auto border-b border-slate-100 px-4 py-2.5 scrollbar-none">
          <button
            type="button"
            onClick={() => setSelectedIdentityId(ALL_IDENTITIES_ID)}
            className={`flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold transition-colors ${
              isAllView
                ? 'bg-teal-600 text-white shadow-sm'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            <span aria-hidden>◎</span>
            <span>All</span>
            {totalDone > 0 && (
              <span
                className={`rounded-full px-1 text-[10px] font-bold ${
                  isAllView ? 'bg-teal-500 text-white' : 'bg-slate-200 text-slate-600'
                }`}
              >
                {totalDone}✓
              </span>
            )}
          </button>
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
                    validId === id.identityId ? 'bg-teal-500 text-white' : 'bg-slate-200 text-slate-600'
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
      <div className="rounded-b-2xl px-4 py-4">
        {activeTab === 'today' ? (
          isAllView ? (
            <IdentityAllTodayTab
              identities={identities}
              sections={allSections}
              loading={allConsistencyLoading}
              scheduledInstances={scheduledInstances}
              onScheduleHabit={handleScheduleHabit}
              onSelectIdentity={(id) => setSelectedIdentityId(id)}
            />
          ) : (
            <IdentityTodayTab
              habits={consistencyData?.habits ?? []}
              loading={consistencyLoading}
              todayDone={selectedIdentity?.completedCount ?? 0}
              todayMinutes={selectedIdentity?.totalMinutes ?? 0}
              streakDays={selectedIdentity?.currentStreak}
              scheduledInstances={scheduledInstances}
              onScheduleHabit={handleScheduleHabit}
            />
          )
        ) : isAllView ? (
          <IdentityAllProgressionTab
            identities={identities}
            evolutionStates={evolutionStates}
            evolutionMode={evolutionMode}
            evolutionFeatureEnabled={evolutionFeatureEnabled}
            evolutionLoading={evolutionLoading}
            onRetry={onRefreshEvolution}
            onSelectIdentity={(id) => {
              setSelectedIdentityId(id);
              setActiveTab('progression');
            }}
            timeZone={timeZone}
          />
        ) : (
          <IdentityProgressionTab
            evolution={selectedEvolution}
            upcoming={upcomingData}
            evolutionMode={evolutionMode}
            evolutionFeatureEnabled={evolutionFeatureEnabled}
            dayProgress={selectedIdentity}
            loading={upcomingLoading}
            evolutionLoading={evolutionLoading}
            onRetry={onRefreshEvolution}
            timeZone={timeZone}
          />
        )}
      </div>
    </div>
  );
}
