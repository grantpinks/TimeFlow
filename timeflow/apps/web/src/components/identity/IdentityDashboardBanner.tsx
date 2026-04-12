'use client';

/**
 * IdentityDashboardBanner — full-width identity hero (Today page header).
 *
 * Three zones:
 *   Left  — Flow mascot (water-drop) + contextual greeting + daily totals
 *   Center — Double-donut SVG chart: outer = minutes, inner = completions
 *   Right  — Identity legend rows with click-to-filter + Focus mode toggle
 */

import { useMemo } from 'react';
import { motion } from 'framer-motion';
import type { IdentityDayProgress } from '@timeflow/shared';
import { hexWithOpacity } from '@/lib/identityConstants';

// ─── helpers ────────────────────────────────────────────────────────────────

function greeting(now: Date, totalDone: number): string {
  const h = now.getHours();
  if (totalDone === 0) {
    if (h < 12) return 'Your day is wide open — let\'s start strong!';
    if (h < 17) return 'Afternoon already. Pick one identity and go.';
    return 'Evening is still time to grow.';
  }
  if (h < 12) return `Nice start — ${totalDone} done before noon!`;
  if (h < 17) return `Solid afternoon. ${totalDone} completions so far.`;
  if (h < 20) return `Good evening! ${totalDone} done today.`;
  return `Wrapping up with ${totalDone} completions. Well done!`;
}

function fmtMinutes(m: number): string {
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  const rem = m % 60;
  return rem > 0 ? `${h}h ${rem}m` : `${h}h`;
}

// ─── SVG double-donut chart ──────────────────────────────────────────────────

const CX = 70;
const CY = 70;
const R_OUTER = 56; // minutes ring
const R_INNER = 38; // completions ring
const STROKE_OUTER = 14;
const STROKE_INNER = 11;
const GAP_PX = 2.5; // gap between segments in arc-length px

function circum(r: number) {
  return 2 * Math.PI * r;
}

interface ArcSegment {
  color: string;
  value: number;
}

/**
 * Renders one ring of the donut.
 * Each identity gets a colored arc proportional to its `value`.
 * A small gap is left between segments.
 */
function DonutRing({
  segments,
  r,
  strokeWidth,
  emptyColor = '#e2e8f0',
}: {
  segments: ArcSegment[];
  r: number;
  strokeWidth: number;
  emptyColor?: string;
}) {
  const C = circum(r);
  const total = segments.reduce((s, seg) => s + seg.value, 0);

  if (total === 0) {
    return (
      <circle
        cx={CX}
        cy={CY}
        r={r}
        fill="none"
        stroke={emptyColor}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
      />
    );
  }

  const arcs: { color: string; dasharray: string; dashoffset: number }[] = [];
  let cursor = 0;

  for (const seg of segments) {
    const segLen = Math.max(0, (seg.value / total) * C - GAP_PX);
    const dasharray = `${segLen} ${C - segLen}`;
    const dashoffset = C - cursor;
    arcs.push({ color: seg.color, dasharray, dashoffset });
    cursor += (seg.value / total) * C;
  }

  return (
    <>
      {arcs.map((arc, i) => (
        <motion.circle
          key={i}
          cx={CX}
          cy={CY}
          r={r}
          fill="none"
          stroke={arc.color}
          strokeWidth={strokeWidth}
          strokeDasharray={arc.dasharray}
          strokeDashoffset={arc.dashoffset}
          strokeLinecap="round"
          transform={`rotate(-90 ${CX} ${CY})`}
          initial={{ strokeDasharray: `0 ${circum(r)}` }}
          animate={{ strokeDasharray: arc.dasharray }}
          transition={{ duration: 0.7, delay: i * 0.08, ease: 'easeOut' }}
        />
      ))}
    </>
  );
}

// ─── Flow mascot SVG ─────────────────────────────────────────────────────────

function FlowMascot({ mood }: { mood: 'happy' | 'excited' | 'neutral' }) {
  const eyeY = 52;
  const smileD =
    mood === 'excited'
      ? 'M 36 66 Q 44 74 52 66' // bigger grin
      : 'M 37 65 Q 44 71 51 65'; // gentle smile

  return (
    <svg
      viewBox="0 0 88 110"
      className="w-full h-full drop-shadow-md"
      aria-label="Flow mascot"
      role="img"
    >
      <defs>
        <radialGradient id="flowBody" cx="45%" cy="40%" r="58%">
          <stop offset="0%" stopColor="#2dd4bf" />
          <stop offset="100%" stopColor="#0d9488" />
        </radialGradient>
        <radialGradient id="flowShine" cx="35%" cy="30%" r="40%">
          <stop offset="0%" stopColor="rgba(255,255,255,0.4)" />
          <stop offset="100%" stopColor="rgba(255,255,255,0)" />
        </radialGradient>
      </defs>

      {/* Body — teardrop */}
      <path
        d="M 44 4 C 72 28, 82 52, 78 70 A 34 34 0 1 1 10 70 C 6 52, 16 28, 44 4 Z"
        fill="url(#flowBody)"
      />
      {/* Shine overlay */}
      <path
        d="M 44 4 C 72 28, 82 52, 78 70 A 34 34 0 1 1 10 70 C 6 52, 16 28, 44 4 Z"
        fill="url(#flowShine)"
      />

      {/* Eyes */}
      <circle cx="32" cy={eyeY} r="5.5" fill="white" />
      <circle cx="56" cy={eyeY} r="5.5" fill="white" />
      <circle cx="33.5" cy={eyeY + 1} r="3" fill="#0f172a" />
      <circle cx="57.5" cy={eyeY + 1} r="3" fill="#0f172a" />
      {/* Eye shine */}
      <circle cx="35" cy={eyeY - 1} r="1.2" fill="white" />
      <circle cx="59" cy={eyeY - 1} r="1.2" fill="white" />

      {/* Smile */}
      <path
        d={smileD}
        fill="none"
        stroke="white"
        strokeWidth="2.8"
        strokeLinecap="round"
      />

      {/* Cheek blush */}
      {mood === 'excited' && (
        <>
          <ellipse cx="24" cy="63" rx="5" ry="3" fill="rgba(251,113,133,0.35)" />
          <ellipse cx="64" cy="63" rx="5" ry="3" fill="rgba(251,113,133,0.35)" />
        </>
      )}

      {/* Arms (small wiggly lines when excited) */}
      {mood === 'excited' && (
        <>
          <path
            d="M 10 72 Q 2 60, 8 52"
            fill="none"
            stroke="#0d9488"
            strokeWidth="5"
            strokeLinecap="round"
          />
          <path
            d="M 78 72 Q 86 60, 80 52"
            fill="none"
            stroke="#0d9488"
            strokeWidth="5"
            strokeLinecap="round"
          />
        </>
      )}
    </svg>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

interface IdentityDashboardBannerProps {
  identities: IdentityDayProgress[];
  loading?: boolean;
  onFilterChange?: (id: string | null) => void;
  activeFilter?: string | null;
  focusMode?: boolean;
  onFocusModeToggle?: () => void;
  now?: Date;
}

export function IdentityDashboardBanner({
  identities,
  loading = false,
  onFilterChange,
  activeFilter = null,
  focusMode = false,
  onFocusModeToggle,
  now = new Date(),
}: IdentityDashboardBannerProps) {
  const totalCompletions = useMemo(
    () => identities.reduce((s, i) => s + i.completedCount, 0),
    [identities]
  );
  const totalMinutes = useMemo(
    () => identities.reduce((s, i) => s + i.totalMinutes, 0),
    [identities]
  );
  const identitiesWithProgress = identities.filter(
    (i) => i.completedCount > 0 || i.inProgressCount > 0
  );

  const mood: 'happy' | 'excited' | 'neutral' =
    totalCompletions >= 5 ? 'excited' : totalCompletions > 0 ? 'happy' : 'neutral';

  const outerSegments: ArcSegment[] = identities.map((i) => ({
    color: i.color,
    value: i.totalMinutes,
  }));
  const innerSegments: ArcSegment[] = identities.map((i) => ({
    color: i.color,
    value: i.completedCount,
  }));

  const greetingText = greeting(now, totalCompletions);

  if (loading) {
    return (
      <div className="h-36 w-full animate-pulse rounded-2xl bg-slate-100" />
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: 'easeOut' }}
      className="w-full overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm"
    >
      <div className="grid grid-cols-1 gap-0 sm:grid-cols-[auto_140px_1fr] lg:grid-cols-[260px_160px_1fr]">

        {/* ── Zone 1: Flow + greeting ───────────────────────── */}
        <div className="relative flex items-center gap-4 overflow-hidden bg-gradient-to-br from-teal-50 via-white to-primary-50/60 px-5 py-4 sm:border-r sm:border-slate-100">
          {/* Decorative bubble */}
          <div
            className="pointer-events-none absolute -right-6 -top-6 h-24 w-24 rounded-full opacity-10"
            style={{ background: 'radial-gradient(circle, #0d9488, transparent)' }}
          />

          <div className="relative h-20 w-16 flex-shrink-0">
            <FlowMascot mood={mood} />
          </div>

          <div className="min-w-0">
            <p className="text-[11px] font-bold uppercase tracking-widest text-teal-700">
              Flow says
            </p>
            <p className="mt-0.5 text-sm font-semibold leading-snug text-slate-800">
              {greetingText}
            </p>

            {/* Totals */}
            <div className="mt-2.5 flex flex-wrap items-center gap-2 text-xs text-slate-600">
              <span className="flex items-center gap-1 rounded-md bg-teal-50 px-2 py-0.5 font-semibold text-teal-800">
                <svg className="h-3 w-3" viewBox="0 0 20 20" fill="currentColor" aria-hidden>
                  <path
                    fillRule="evenodd"
                    d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                    clipRule="evenodd"
                  />
                </svg>
                {totalCompletions} done
              </span>
              {totalMinutes > 0 && (
                <span className="flex items-center gap-1 rounded-md bg-slate-100 px-2 py-0.5 font-medium text-slate-700">
                  ⏱ {fmtMinutes(totalMinutes)}
                </span>
              )}
              {identitiesWithProgress.length > 0 && (
                <span className="text-slate-500">
                  {identitiesWithProgress.length} identit
                  {identitiesWithProgress.length === 1 ? 'y' : 'ies'} active
                </span>
              )}
            </div>
          </div>
        </div>

        {/* ── Zone 2: Double-donut chart ────────────────────── */}
        <div className="flex flex-col items-center justify-center border-slate-100 py-4 sm:border-r">
          <div className="relative">
            <svg
              width={CX * 2}
              height={CY * 2}
              className="overflow-visible"
              aria-label="Identity progress donut chart"
              role="img"
            >
              {/* Background tracks */}
              <circle
                cx={CX}
                cy={CY}
                r={R_OUTER}
                fill="none"
                stroke="#f1f5f9"
                strokeWidth={STROKE_OUTER}
              />
              <circle
                cx={CX}
                cy={CY}
                r={R_INNER}
                fill="none"
                stroke="#f1f5f9"
                strokeWidth={STROKE_INNER}
              />
              {/* Outer ring — minutes */}
              <DonutRing
                segments={outerSegments}
                r={R_OUTER}
                strokeWidth={STROKE_OUTER}
              />
              {/* Inner ring — completions */}
              <DonutRing
                segments={innerSegments}
                r={R_INNER}
                strokeWidth={STROKE_INNER}
              />
            </svg>

            {/* Center label */}
            <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
              <p className="text-xl font-bold leading-none text-slate-900">
                {totalCompletions}
              </p>
              <p className="mt-0.5 text-[10px] font-semibold uppercase tracking-wide text-slate-500">
                done
              </p>
            </div>
          </div>

          {/* Mini legend for rings */}
          <div className="mt-1.5 flex gap-3 text-[10px] text-slate-500">
            <span className="flex items-center gap-1">
              <span
                className="inline-block h-1.5 w-3.5 rounded-full"
                style={{ background: '#0d9488' }}
              />
              min
            </span>
            <span className="flex items-center gap-1">
              <span
                className="inline-block h-1.5 w-3.5 rounded-full opacity-60"
                style={{ background: '#0d9488' }}
              />
              done
            </span>
          </div>
        </div>

        {/* ── Zone 3: Identity legend ───────────────────────── */}
        <div className="flex flex-col justify-between px-5 py-4">
          {identities.length === 0 ? (
            <p className="text-sm text-slate-500">
              No identities yet.{' '}
              <a href="/settings/identities" className="text-primary-600 underline-offset-2 hover:underline">
                Add one
              </a>
            </p>
          ) : (
            <ul className="flex flex-wrap gap-2 lg:flex-col lg:gap-1.5">
              {identities.map((id) => {
                const isActive = activeFilter === id.identityId;
                const hasProgress = id.completedCount > 0 || id.inProgressCount > 0;

                return (
                  <motion.li
                    key={id.identityId}
                    whileHover={{ x: 2 }}
                    transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                  >
                    <button
                      type="button"
                      onClick={() => onFilterChange?.(isActive ? null : id.identityId)}
                      className="group flex w-full items-center gap-2.5 rounded-xl px-2.5 py-1.5 text-left transition-colors hover:bg-slate-50"
                      style={
                        isActive
                          ? {
                              background: hexWithOpacity(id.color, 0.1),
                              outline: `1.5px solid ${hexWithOpacity(id.color, 0.5)}`,
                            }
                          : undefined
                      }
                      title={
                        hasProgress
                          ? `${id.name}: ${id.completedCount} done · ${id.totalMinutes}m`
                          : `${id.name}: nothing yet today`
                      }
                    >
                      {/* Color dot */}
                      <span
                        className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-lg text-sm shadow-sm"
                        style={{
                          background: hexWithOpacity(id.color, hasProgress ? 0.18 : 0.08),
                          border: `1.5px solid ${hexWithOpacity(id.color, hasProgress ? 0.4 : 0.2)}`,
                        }}
                      >
                        {id.icon}
                      </span>

                      {/* Name */}
                      <span
                        className="min-w-0 flex-1 truncate text-xs font-semibold"
                        style={{ color: hasProgress ? id.color : '#64748b' }}
                      >
                        {id.name}
                      </span>

                      {/* Stats */}
                      {hasProgress ? (
                        <span className="flex-shrink-0 text-xs tabular-nums text-slate-500">
                          {id.completedCount > 0 && <span>{id.completedCount}✓</span>}
                          {id.completedCount > 0 && id.totalMinutes > 0 && (
                            <span className="mx-0.5 text-slate-300">·</span>
                          )}
                          {id.totalMinutes > 0 && <span>{id.totalMinutes}m</span>}
                          {id.inProgressCount > 0 && id.completedCount === 0 && (
                            <span className="text-amber-600">{id.inProgressCount} in progress</span>
                          )}
                        </span>
                      ) : (
                        <span className="flex-shrink-0 text-[10px] text-slate-400">—</span>
                      )}
                    </button>
                  </motion.li>
                );
              })}
            </ul>
          )}

          {/* Focus mode toggle */}
          {onFocusModeToggle && (
            <div className="mt-3 flex items-center justify-between border-t border-slate-100 pt-3">
              <span className="text-xs text-slate-500">
                {focusMode
                  ? activeFilter
                    ? 'Filtering by identity'
                    : 'Focus mode on'
                  : 'Filter by identity above'}
              </span>
              <button
                type="button"
                role="switch"
                aria-checked={focusMode}
                onClick={onFocusModeToggle}
                className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors ${
                  focusMode
                    ? 'border-primary-500 bg-primary-50 text-primary-800'
                    : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300'
                }`}
              >
                <span
                  className={`h-2 w-2 rounded-full transition-colors ${
                    focusMode ? 'bg-primary-500' : 'bg-slate-300'
                  }`}
                  aria-hidden
                />
                Focus
              </button>
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
}
