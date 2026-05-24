'use client';

import { useMemo } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import type { IdentityEvolutionState, UpcomingUnlocksResponse } from '@timeflow/shared';
import { MasteryTrialCard } from './MasteryTrialCard';

const STAGE_ORDER = ['Seed', 'Builder', 'Disciplined', 'Embodied', 'FutureSelf'] as const;
const STAGE_LABELS: Record<string, string> = { FutureSelf: 'Future self' };

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

interface IdentityProgressionTabProps {
  evolution: IdentityEvolutionState | null;
  upcoming: UpcomingUnlocksResponse | null;
  loading?: boolean;
  timeZone: string;
}

export function IdentityProgressionTab({
  evolution,
  upcoming,
  loading = false,
  timeZone,
}: IdentityProgressionTabProps) {
  const reduceMotion = useReducedMotion();

  const xpPct = useMemo(
    () => (evolution ? Math.round(levelProgressRatio(evolution) * 100) : 0),
    [evolution]
  );

  if (loading) {
    return <div className="h-48 animate-pulse rounded-xl bg-slate-100" />;
  }

  if (!evolution) {
    return (
      <p className="py-6 text-center text-sm text-slate-500">
        No progression data yet. Complete habits linked to this identity on Today to begin.
      </p>
    );
  }

  const currentStageIdx = STAGE_ORDER.indexOf(evolution.stage as (typeof STAGE_ORDER)[number]);
  const sessionsNeeded = upcoming?.sessionsNeeded ?? Math.ceil((evolution.xpToNextLevel ?? 0) / 10);
  const nextUnlock = upcoming?.upcoming[0] ?? null;

  return (
    <div className="space-y-4">
      {/* Stage path timeline */}
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

      {/* XP bar */}
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

      {/* Next action callout */}
      {sessionsNeeded > 0 && (
        <div className="flex items-start gap-3 rounded-xl border border-teal-200 bg-teal-50/70 px-4 py-3">
          <span className="mt-0.5 text-lg" aria-hidden>🎯</span>
          <div className="text-sm text-slate-800">
            <span className="font-semibold">
              Complete {sessionsNeeded} more habit session{sessionsNeeded !== 1 ? 's' : ''}{' '}
            </span>
            to reach Level {evolution.level + 1}
            {nextUnlock ? (
              <> and unlock <span className="font-semibold text-teal-700">{nextUnlock.displayName}</span>.</>
            ) : (
              '.'
            )}
          </div>
        </div>
      )}

      {/* Upcoming milestones */}
      {upcoming && upcoming.upcoming.length > 0 && (
        <div>
          <p className="mb-2 text-[11px] font-bold uppercase tracking-widest text-slate-500">Coming up</p>
          <ul className="space-y-1.5">
            {upcoming.upcoming.map((u) => (
              <li key={u.unlockKey} className="flex items-center gap-3 rounded-lg px-2 py-1.5 hover:bg-slate-50">
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

      {/* Trial card — only if active */}
      {evolution.trialState === 'Active' && (
        <MasteryTrialCard evolution={evolution} timeZone={timeZone} />
      )}
    </div>
  );
}
