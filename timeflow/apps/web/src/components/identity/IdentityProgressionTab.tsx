'use client';

import { useMemo } from 'react';
import Link from 'next/link';
import { motion, useReducedMotion } from 'framer-motion';
import type { IdentityDayProgress, IdentityEvolutionState, UpcomingUnlocksResponse } from '@timeflow/shared';
import type { EvolutionSurfaceMode } from '@/hooks/useEvolutionSurface';
import { MasteryTrialCard } from './MasteryTrialCard';

const STAGE_ORDER = ['Seed', 'Builder', 'Disciplined', 'Embodied', 'FutureSelf'] as const;
const STAGE_LABELS: Record<string, string> = { FutureSelf: 'Future self' };
const PREVIEW_STAGES = ['Seed', 'Builder', 'Disciplined', 'Embodied', 'Future self'] as const;

function stageLabel(s: string) {
  return STAGE_LABELS[s] ?? s;
}

/**
 * Compute XP progress ratio (0–1) within the current level band.
 * Level cost L → L+1: L * L * 50
 * We use xpToNextLevel (already derived on the type) to avoid cumulative XP math.
 */
function levelProgressRatio(evolution: IdentityEvolutionState): number {
  const levelCost = evolution.level * evolution.level * 50;
  if (levelCost <= 0) return 1;
  const xpEarned = levelCost - evolution.xpToNextLevel;
  return Math.min(1, Math.max(0, xpEarned / levelCost));
}

function TodayProgressFallback({ dayProgress }: { dayProgress: IdentityDayProgress }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50/80 px-4 py-3 text-sm text-slate-700">
      <p className="text-[11px] font-bold uppercase tracking-widest text-slate-500">Today (no XP track yet)</p>
      <ul className="mt-2 space-y-1 text-xs">
        <li>
          <span className="font-semibold">{dayProgress.completedCount}</span> completion
          {dayProgress.completedCount !== 1 ? 's' : ''} today
        </li>
        {dayProgress.totalMinutes > 0 && (
          <li>
            <span className="font-semibold">{dayProgress.totalMinutes}</span> minutes logged
          </li>
        )}
        {dayProgress.currentStreak > 0 && (
          <li>
            <span className="font-semibold">{dayProgress.currentStreak}</span>-day streak
          </li>
        )}
        <li>
          <span className="font-semibold">{dayProgress.completionCountTotal}</span> lifetime completions
        </li>
      </ul>
    </div>
  );
}

interface IdentityProgressionTabProps {
  evolution: IdentityEvolutionState | null;
  upcoming: UpcomingUnlocksResponse | null;
  evolutionMode: EvolutionSurfaceMode;
  /** User flag — when false, evolution APIs are not loaded */
  evolutionFeatureEnabled: boolean;
  dayProgress: IdentityDayProgress | null;
  loading?: boolean;
  evolutionLoading?: boolean;
  onRetry?: () => void;
  timeZone: string;
}

export function IdentityProgressionTab({
  evolution,
  upcoming,
  evolutionMode,
  evolutionFeatureEnabled,
  dayProgress,
  loading = false,
  evolutionLoading = false,
  onRetry,
  timeZone,
}: IdentityProgressionTabProps) {
  const reduceMotion = useReducedMotion();

  const xpPct = useMemo(
    () => (evolution ? Math.round(levelProgressRatio(evolution) * 100) : 0),
    [evolution]
  );

  if (evolution) {
    const currentStageIdx = STAGE_ORDER.indexOf(evolution.stage as (typeof STAGE_ORDER)[number]);
    const sessionsNeeded = upcoming?.sessionsNeeded ?? Math.ceil(evolution.xpToNextLevel / 10);
    const nextUnlock = upcoming?.upcoming[0] ?? null;

    return (
      <div className="space-y-4">
        <div>
          <p className="mb-2 text-[11px] font-bold uppercase tracking-widest text-slate-500">Stage path</p>
          <div className="flex items-center gap-1.5">
            {STAGE_ORDER.map((stage, i) => {
              const isPast = i < currentStageIdx;
              const isCurrent = i === currentStageIdx;
              return (
                <div key={stage} className="flex items-center gap-1.5">
                  <span
                    className={`rounded-full px-2.5 py-0.5 text-[10px] font-semibold transition-colors ${
                      isCurrent
                        ? 'border border-teal-300 bg-teal-100 text-teal-900'
                        : isPast
                        ? 'border border-teal-200 bg-teal-50 text-teal-700'
                        : 'border border-slate-200 bg-slate-50 text-slate-400'
                    }`}
                  >
                    {isCurrent && <span className="mr-1">●</span>}
                    {stageLabel(stage)}
                  </span>
                  {i < STAGE_ORDER.length - 1 && (
                    <span className={`text-[10px] ${isPast ? 'text-teal-300' : 'text-slate-200'}`}>
                      ──
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        <div>
          <div className="mb-1.5 flex items-baseline justify-between text-xs">
            <span className="font-semibold text-slate-800">
              Level {evolution.level} · {stageLabel(evolution.stage)}
            </span>
            <span className="tabular-nums text-slate-500">
              {evolution.xpToNextLevel > 0
                ? `${evolution.xpToNextLevel} XP to Level ${evolution.level + 1}`
                : 'Level maxed for this band'}
            </span>
          </div>
          <div
            className="h-2.5 w-full overflow-hidden rounded-full bg-slate-200 ring-1 ring-slate-100"
            role="progressbar"
            aria-valuenow={xpPct}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label="XP toward next level"
          >
            <motion.div
              className="h-full rounded-full bg-gradient-to-r from-teal-400 to-teal-600"
              initial={reduceMotion ? { width: `${xpPct}%` } : { width: '0%' }}
              animate={{ width: `${xpPct}%` }}
              transition={{ duration: 0.7, ease: 'easeOut' }}
            />
          </div>
        </div>

        {sessionsNeeded > 0 && (
          <div className="flex items-start gap-3 rounded-xl border border-teal-200 bg-teal-50/70 px-4 py-3">
            <span className="mt-0.5 text-lg" aria-hidden>
              🎯
            </span>
            <div className="text-sm text-slate-800">
              <span className="font-semibold">
                Complete {sessionsNeeded} more habit session{sessionsNeeded !== 1 ? 's' : ''}{' '}
              </span>
              to reach Level {evolution.level + 1}
              {nextUnlock ? (
                <>
                  {' '}
                  and unlock <span className="font-semibold text-teal-700">{nextUnlock.displayName}</span>.
                </>
              ) : (
                '.'
              )}
            </div>
          </div>
        )}

        {upcoming && upcoming.upcoming.length > 0 && (
          <div>
            <p className="mb-2 text-[11px] font-bold uppercase tracking-widest text-slate-500">Coming up</p>
            <ul className="space-y-1.5">
              {upcoming.upcoming.slice(0, 3).map((u) => (
                <li
                  key={u.unlockKey}
                  className="flex items-center gap-3 rounded-lg px-2 py-1.5 hover:bg-slate-50"
                >
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-slate-100 text-sm">
                    {u.unlockType === 'flow_palette' ? '🎨' : u.unlockType === 'flow_emote' ? '✨' : '🏗️'}
                  </span>
                  <span className="flex-1 text-xs text-slate-700">
                    <span className="font-semibold">{u.displayName}</span>
                    {u.grantedByLevel && (
                      <span className="ml-1.5 text-slate-400">Level {u.grantedByLevel}</span>
                    )}
                    {u.grantedByStage && (
                      <span className="ml-1.5 text-slate-400">{stageLabel(u.grantedByStage)}</span>
                    )}
                  </span>
                  <span className="text-[10px] text-slate-400">{u.description}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {evolution.trialState === 'Active' && (
          <MasteryTrialCard evolution={evolution} timeZone={timeZone} />
        )}
      </div>
    );
  }

  if (evolutionFeatureEnabled && (evolutionLoading || loading)) {
    return <div className="h-48 animate-pulse rounded-xl bg-slate-100" />;
  }

  if (evolutionMode === 'degraded') {
    return (
      <div className="space-y-3 py-4 text-center">
        <p className="text-sm text-slate-700">Couldn&apos;t load progression. Check your connection and try again.</p>
        {onRetry && (
          <button
            type="button"
            onClick={() => void onRetry()}
            className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-800 shadow-sm hover:bg-slate-50"
          >
            Retry
          </button>
        )}
      </div>
    );
  }

  if (!evolutionFeatureEnabled) {
    return (
      <div className="space-y-4 py-2">
        <div className="rounded-xl border border-dashed border-teal-200 bg-teal-50/50 px-4 py-4 text-center">
          <p className="text-sm font-semibold text-slate-900">Identity evolution is off</p>
          <p className="mt-1 text-xs leading-relaxed text-slate-600">
            Turn it on in Settings to track XP, level up, run mastery trials, and unlock Flow customizations.
            Your Today completions still count — they just aren&apos;t shown here yet.
          </p>
          <Link
            href="/settings#identity-evolution"
            className="mt-3 inline-flex rounded-lg bg-teal-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-teal-700"
          >
            Enable in Settings
          </Link>
        </div>
        {dayProgress && (dayProgress.completedCount > 0 || dayProgress.completionCountTotal > 0) && (
          <TodayProgressFallback dayProgress={dayProgress} />
        )}
        <PreviewStagesTeaser />
      </div>
    );
  }

  // Enabled but no evolution row yet (loading finished)
  return (
    <div className="space-y-4 py-2">
      <p className="text-center text-sm text-slate-600">
        {dayProgress && dayProgress.completedCount > 0
          ? 'Progression is loading for this identity. Complete another habit session or refresh the page if stats stay blank.'
          : 'Complete a habit linked to this identity on Today to earn XP and start your stage path.'}
      </p>
      {dayProgress && dayProgress.completedCount > 0 && <TodayProgressFallback dayProgress={dayProgress} />}
      <PreviewStagesTeaser />
      {onRetry && (
        <div className="text-center">
          <button
            type="button"
            onClick={() => void onRetry()}
            className="text-xs font-semibold text-teal-700 hover:text-teal-800"
          >
            Refresh progression
          </button>
        </div>
      )}
    </div>
  );
}

function PreviewStagesTeaser() {
  return (
    <div>
      <p className="mb-2 text-[11px] font-bold uppercase tracking-widest text-slate-500">Stage path (preview)</p>
      <div className="flex flex-wrap gap-1.5">
        {PREVIEW_STAGES.map((label, i) => (
          <span
            key={label}
            className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${
              i === 0
                ? 'border border-teal-200 bg-teal-50 text-teal-900'
                : 'border border-slate-200 bg-slate-50/80 text-slate-500'
            }`}
          >
            {label}
          </span>
        ))}
      </div>
    </div>
  );
}
