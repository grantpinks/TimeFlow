'use client';

import Link from 'next/link';

export interface IdentityStudioActionStripProps {
  dueTodayCount?: number | null;
  atRiskCount?: number | null;
  unscheduledCount?: number | null;
  focusedIdentityId?: string | null;
  className?: string;
}

function formatCount(value: number | null | undefined): string {
  if (value === null || value === undefined) {
    return '—';
  }
  return String(value);
}

export function IdentityStudioActionStrip({
  dueTodayCount = null,
  atRiskCount = null,
  unscheduledCount = null,
  focusedIdentityId = null,
  className = '',
}: IdentityStudioActionStripProps) {
  const todayHref = focusedIdentityId
    ? `/today?identity=${encodeURIComponent(focusedIdentityId)}`
    : '/today';
  const scheduleHref = `/assistant?prompt=${encodeURIComponent('Schedule my habits for this week')}`;

  return (
    <div
      className={`flex flex-wrap items-center gap-2 rounded-xl border border-slate-200 bg-slate-50/80 px-3 py-2 text-sm ${className}`}
      data-testid="identity-studio-action-strip"
      role="region"
      aria-label="Habit summary"
    >
      <Link href={todayHref} className="text-slate-600 hover:text-primary-700">
        <span className="font-semibold text-slate-900">{formatCount(dueTodayCount)}</span> due today
      </Link>
      <span className="text-slate-300" aria-hidden>
        ·
      </span>
      <Link href={todayHref} className="text-slate-600 hover:text-primary-700">
        <span className="font-semibold text-slate-900">{formatCount(atRiskCount)}</span> at risk
      </Link>
      <span className="text-slate-300" aria-hidden>
        ·
      </span>
      <Link href={scheduleHref} className="text-slate-600 hover:text-primary-700">
        <span className="font-semibold text-slate-900">{formatCount(unscheduledCount)}</span>{' '}
        unscheduled this week
      </Link>
    </div>
  );
}
