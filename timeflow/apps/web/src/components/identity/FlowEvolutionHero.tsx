'use client';

/**
 * Flow Evolution — compact hero strip (leading identity, stage, XP, trial).
 */

import { useMemo } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import type { IdentityEvolutionState, IdentityTrialState } from '@timeflow/shared';
import { FlowMascot } from '@/components/FlowMascot';
import { MasteryTrialCard } from '@/components/identity/MasteryTrialCard';

function mascotExpression(trial: IdentityTrialState): 'happy' | 'encouraging' | 'celebrating' {
  if (trial === 'Passed') return 'celebrating';
  if (trial === 'CheckpointFailed' || trial === 'Failed') return 'encouraging';
  return 'happy';
}

/** Progress within the current level (0–1) using server xp + xpToNextLevel. */
export function levelProgressRatio(state: IdentityEvolutionState): number {
  const L = state.level;
  const cost = L * L * 50;
  if (cost <= 0) return 1;
  const inLevel = cost - state.xpToNextLevel;
  return Math.min(1, Math.max(0, inLevel / cost));
}

function stageLabel(stage: string): string {
  if (stage === 'FutureSelf') return 'Future self';
  return stage;
}

export interface FlowEvolutionHeroProps {
  evolution: IdentityEvolutionState;
  /** Display name for the leading identity (from Today progress list) */
  identityName: string;
  /** e.g. "Recent: Ocean palette" — from parent / unlocks API */
  nextUnlockLabel?: string | null;
  timeZone: string;
}

export function FlowEvolutionHero({
  evolution,
  identityName,
  nextUnlockLabel,
  timeZone,
}: FlowEvolutionHeroProps) {
  const reduceMotion = useReducedMotion();
  const xpPct = useMemo(() => Math.round(levelProgressRatio(evolution) * 100), [evolution]);

  const fallbackCopy =
    'Keep completing habits linked to this identity to evolve.';

  return (
    <motion.div
      initial={reduceMotion ? { opacity: 1, y: 0 } : { opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={reduceMotion ? { duration: 0 } : { duration: 0.35, ease: 'easeOut' }}
      className="mb-3 w-full overflow-hidden rounded-2xl border border-slate-200/90 bg-gradient-to-br from-teal-50/90 via-white to-slate-50/90 shadow-sm ring-1 ring-white/60 backdrop-blur-[2px]"
      data-testid="flow-evolution-hero"
    >
      <div className="flex flex-col gap-4 p-4 sm:flex-row sm:items-stretch sm:gap-5">
        <div className="flex shrink-0 items-start gap-3 sm:flex-col sm:items-center sm:pt-0.5">
          <FlowMascot size="lg" expression={mascotExpression(evolution.trialState)} />
        </div>

        <div className="min-w-0 flex-1 space-y-3">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-widest text-teal-700/90">
                Leading identity
              </p>
              <p className="mt-0.5 truncate text-base font-bold text-slate-900">{identityName}</p>
            </div>
            <span className="inline-flex shrink-0 items-center rounded-full border border-teal-200/80 bg-white/70 px-2.5 py-1 text-[11px] font-semibold text-teal-900 shadow-sm">
              {stageLabel(evolution.stage)}
            </span>
          </div>

          <div>
            <div className="mb-1.5 flex flex-wrap items-baseline justify-between gap-2 text-xs">
              <span className="font-semibold text-slate-800">
                Level {evolution.level}
              </span>
              <span className="tabular-nums text-slate-500">
                {evolution.xpToNextLevel > 0
                  ? `${evolution.xpToNextLevel} XP to next level`
                  : 'Level maxed for this band'}
              </span>
            </div>
            <div
              className="h-2 w-full overflow-hidden rounded-full bg-slate-200/90 ring-1 ring-slate-100/80"
              role="progressbar"
              aria-valuenow={xpPct}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-label="Experience toward next level"
            >
              <div
                className="h-full rounded-full bg-gradient-to-r from-teal-500 via-teal-500 to-teal-600"
                style={{
                  width: `${xpPct}%`,
                  transition: reduceMotion ? undefined : 'width 0.6s ease-out',
                }}
              />
            </div>
          </div>

          <p className="text-[11px] leading-relaxed text-slate-600">
            {nextUnlockLabel ? (
              <>
                <span className="font-semibold text-slate-700">Latest unlock:</span>{' '}
                {nextUnlockLabel}
              </>
            ) : (
              fallbackCopy
            )}
          </p>

          <MasteryTrialCard evolution={evolution} timeZone={timeZone} />
        </div>
      </div>
    </motion.div>
  );
}
