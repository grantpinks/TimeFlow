'use client';

/**
 * Flow Evolution — compact hero strip (leading identity, stage, XP, trial).
 * Supports active (live state), preview (roadmap / locked teaser), and degraded (retry).
 */

import { useMemo } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import type { IdentityEvolutionState, IdentityTrialState } from '@timeflow/shared';
import type { EvolutionSurfaceMode } from '@/hooks/useEvolutionSurface';
import { FlowMascot } from '@/components/FlowMascot';
import { MasteryTrialCard } from '@/components/identity/MasteryTrialCard';

const PREVIEW_STAGES = ['Seed', 'Builder', 'Disciplined', 'Embodied', 'Future self'] as const;

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
  /** Defaults to active when `evolution` is set; use explicit mode for preview/degraded. */
  mode?: EvolutionSurfaceMode;
  evolution: IdentityEvolutionState | null;
  /** Display name for the leading identity (from Today progress list) */
  identityName: string;
  /** e.g. "Recent: Ocean palette" — from parent / unlocks API */
  nextUnlockLabel?: string | null;
  timeZone: string;
  /** First load: optional subtle indicator in preview */
  loading?: boolean;
  onRetry?: () => void;
}

export function FlowEvolutionHero({
  mode: modeProp,
  evolution,
  identityName,
  nextUnlockLabel,
  timeZone,
  loading = false,
  onRetry,
}: FlowEvolutionHeroProps) {
  const reduceMotion = useReducedMotion();
  const mode: EvolutionSurfaceMode =
    modeProp ?? (evolution ? 'active' : 'preview');

  const xpPct = useMemo(
    () => (evolution ? Math.round(levelProgressRatio(evolution) * 100) : 0),
    [evolution]
  );

  const fallbackCopy =
    'Keep completing habits linked to this identity to evolve.';

  if (mode === 'degraded') {
    return (
      <motion.div
        initial={reduceMotion ? { opacity: 1, y: 0 } : { opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={reduceMotion ? { duration: 0 } : { duration: 0.35, ease: 'easeOut' }}
        className="mb-3 w-full overflow-hidden rounded-2xl border border-amber-200/90 bg-gradient-to-br from-amber-50/90 via-white to-slate-50/90 shadow-sm ring-1 ring-white/60 backdrop-blur-[2px]"
        data-testid="flow-evolution-hero"
      >
        <div className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
          <div className="flex items-start gap-3">
            <FlowMascot size="lg" expression="encouraging" />
            <div>
              <p className="text-[10px] font-bold uppercase tracking-widest text-amber-800/90">
                Progression unavailable
              </p>
              <p className="mt-1 text-sm text-slate-800">
                We couldn&apos;t load your Flow evolution. Check your connection and try again.
              </p>
            </div>
          </div>
          {onRetry && (
            <button
              type="button"
              onClick={() => void onRetry()}
              className="shrink-0 rounded-xl border border-amber-300 bg-white px-4 py-2 text-sm font-semibold text-amber-900 shadow-sm hover:bg-amber-50"
            >
              Retry
            </button>
          )}
        </div>
      </motion.div>
    );
  }

  if (mode === 'preview' || !evolution) {
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
            <FlowMascot size="lg" expression="happy" />
          </div>
          <div className="min-w-0 flex-1 space-y-3">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-widest text-teal-700/90">
                  Flow progression
                </p>
                <p className="mt-0.5 truncate text-base font-bold text-slate-900">{identityName}</p>
                {loading && (
                  <p className="mt-1 text-[11px] text-slate-500">Loading progression…</p>
                )}
              </div>
              <span className="inline-flex shrink-0 items-center rounded-full border border-dashed border-slate-300/90 bg-white/70 px-2.5 py-1 text-[11px] font-semibold text-slate-600 shadow-sm">
                Preview
              </span>
            </div>

            <div>
              <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                Stages
              </p>
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

            <p className="text-[11px] leading-relaxed text-slate-600">
              Link habits to identities and complete them on <strong>Today</strong> to earn XP, advance
              stages, and unlock Flow customizations. Live stats appear when progression is active for
              your account.
            </p>
          </div>
        </div>
      </motion.div>
    );
  }

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
