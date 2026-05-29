'use client';

import { useMemo } from 'react';
import type { IdentityDayProgress, ScheduledHabitInstance } from '@timeflow/shared';
import type { IdentityConsistencySection } from '@/hooks/useAllIdentitiesConsistency';
import { IdentityTodayTab } from './IdentityTodayTab';

interface IdentityAllTodayTabProps {
  identities: IdentityDayProgress[];
  sections: IdentityConsistencySection[];
  loading?: boolean;
  scheduledInstances?: ScheduledHabitInstance[];
  onScheduleHabit?: (
    habitId: string,
    title: string,
    startISO: string,
    durationMinutes: number
  ) => Promise<void>;
  onSelectIdentity?: (identityId: string) => void;
}

function fmtMinutes(m: number): string {
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  const rem = m % 60;
  return rem > 0 ? `${h}h ${rem}m` : `${h}h`;
}

function fmtScheduledTime(iso: string): string {
  return new Date(iso).toLocaleTimeString(undefined, {
    hour: 'numeric',
    minute: '2-digit',
  });
}

export function IdentityAllTodayTab({
  identities,
  sections,
  loading = false,
  scheduledInstances = [],
  onScheduleHabit,
  onSelectIdentity,
}: IdentityAllTodayTabProps) {
  const todayStr = new Date().toLocaleDateString('en-CA');

  const scheduledByHabitId = useMemo(() => {
    const map = new Map<string, ScheduledHabitInstance>();
    for (const inst of scheduledInstances) {
      if (!map.has(inst.habitId)) map.set(inst.habitId, inst);
    }
    return map;
  }, [scheduledInstances]);

  const sectionById = useMemo(
    () => new Map(sections.map((s) => [s.identityId, s])),
    [sections]
  );

  const totalDone = identities.reduce((s, i) => s + i.completedCount, 0);
  const totalMinutes = identities.reduce((s, i) => s + i.totalMinutes, 0);

  /** Cross-identity items still open today (not done, for quick scan) */
  const stillOpen = useMemo(() => {
    const items: {
      identityId: string;
      identityName: string;
      icon: string;
      habitId: string;
      habitName: string;
      scheduled?: ScheduledHabitInstance;
    }[] = [];

    for (const id of identities) {
      const sec = sectionById.get(id.identityId);
      if (!sec) continue;
      for (const h of sec.habits) {
        const todayIdx = h.dates.indexOf(todayStr);
        const doneToday = todayIdx !== -1 && h.completions[todayIdx];
        if (doneToday) continue;
        if (todayIdx === -1) continue;
        items.push({
          identityId: id.identityId,
          identityName: id.name,
          icon: id.icon,
          habitId: h.habitId,
          habitName: h.habitName,
          scheduled: scheduledByHabitId.get(h.habitId),
        });
      }
    }

    return items.sort((a, b) => {
      const aSched = a.scheduled ? 1 : 0;
      const bSched = b.scheduled ? 1 : 0;
      if (aSched !== bSched) return aSched - bSched;
      return a.identityName.localeCompare(b.identityName);
    });
  }, [identities, sectionById, todayStr, scheduledByHabitId]);

  const needsSchedule = stillOpen.filter((x) => !x.scheduled);

  const orderedIdentities = useMemo(() => {
    const openCountById = new Map<string, number>();
    for (const x of stillOpen) {
      openCountById.set(x.identityId, (openCountById.get(x.identityId) ?? 0) + 1);
    }
    return [...identities].sort((a, b) => {
      const aOpen = openCountById.get(a.identityId) ?? 0;
      const bOpen = openCountById.get(b.identityId) ?? 0;
      if (aOpen !== bOpen) return bOpen - aOpen;
      return a.name.localeCompare(b.name);
    });
  }, [identities, stillOpen]);

  if (loading) {
    return <div className="h-48 animate-pulse rounded-xl bg-slate-100" />;
  }

  if (identities.length === 0) {
    return (
      <p className="py-6 text-center text-sm text-slate-500">
        No identities yet.{' '}
        <a href="/settings/identities" className="text-teal-600 underline-offset-2 hover:underline">
          Create one
        </a>
      </p>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2 text-sm">
        <span className="rounded-md bg-slate-100 px-2 py-0.5 text-xs font-bold uppercase tracking-wide text-slate-600">
          All identities
        </span>
        <span className="flex items-center gap-1 rounded-md bg-teal-50 px-2 py-0.5 font-semibold text-teal-800">
          ✓ {totalDone} done
        </span>
        {totalMinutes > 0 && (
          <span className="rounded-md bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-700">
            ⏱ {fmtMinutes(totalMinutes)}
          </span>
        )}
        {needsSchedule.length > 0 && (
          <span className="rounded-md bg-amber-50 px-2 py-0.5 text-xs font-semibold text-amber-800">
            {needsSchedule.length} to schedule
          </span>
        )}
      </div>

      {stillOpen.length > 0 && (
        <div className="rounded-xl border border-amber-100 bg-amber-50/60 px-4 py-3">
          <p className="mb-2 text-[11px] font-bold uppercase tracking-widest text-amber-700">
            Still open today · all identities
          </p>
          <ul className="space-y-1.5">
            {stillOpen.map((item) => (
              <li
                key={`${item.identityId}-${item.habitId}`}
                className="flex items-center justify-between gap-2 text-xs text-slate-700"
              >
                <span className="flex min-w-0 items-center gap-2">
                  <span className="shrink-0 text-sm" aria-hidden>
                    {item.icon}
                  </span>
                  <span className="truncate">
                    <span className="font-medium text-slate-500">{item.identityName}</span>
                    <span className="text-slate-400"> · </span>
                    {item.habitName}
                  </span>
                </span>
                {item.scheduled ? (
                  <span className="shrink-0 font-medium text-teal-700">
                    {fmtScheduledTime(item.scheduled.startDateTime)}
                  </span>
                ) : (
                  <span className="shrink-0 font-semibold text-amber-700">+ Schedule</span>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="space-y-5">
        {orderedIdentities.map((identity) => {
          const sec = sectionById.get(identity.identityId);
          const habits = sec?.habits ?? [];

          return (
            <section
              key={identity.identityId}
              className="rounded-xl border border-slate-100 bg-slate-50/40 px-3 py-3"
            >
              <div className="mb-2 flex items-center justify-between gap-2">
                <button
                  type="button"
                  onClick={() => onSelectIdentity?.(identity.identityId)}
                  className="flex min-w-0 items-center gap-2 text-left hover:opacity-80"
                  title={`Focus ${identity.name}`}
                >
                  <span className="text-base" aria-hidden>
                    {identity.icon}
                  </span>
                  <span className="truncate text-sm font-bold text-slate-900">{identity.name}</span>
                  {identity.completedCount > 0 && (
                    <span className="shrink-0 rounded-full bg-teal-100 px-1.5 text-[10px] font-bold text-teal-800">
                      {identity.completedCount}✓
                    </span>
                  )}
                </button>
                {onSelectIdentity && (
                  <button
                    type="button"
                    onClick={() => onSelectIdentity(identity.identityId)}
                    className="shrink-0 text-[10px] font-semibold text-teal-700 hover:text-teal-800"
                  >
                    Focus →
                  </button>
                )}
              </div>

              {habits.length === 0 ? (
                <p className="text-xs text-slate-500">No habits linked.</p>
              ) : (
                <IdentityTodayTab
                  habits={habits}
                  todayDone={identity.completedCount}
                  todayMinutes={identity.totalMinutes}
                  streakDays={identity.currentStreak}
                  scheduledInstances={scheduledInstances}
                  onScheduleHabit={onScheduleHabit}
                  compact
                />
              )}
            </section>
          );
        })}
      </div>
    </div>
  );
}
