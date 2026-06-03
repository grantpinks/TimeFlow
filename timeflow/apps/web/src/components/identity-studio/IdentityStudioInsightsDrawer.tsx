'use client';

import Link from 'next/link';
import { HabitsInsights } from '@/components/habits/HabitsInsights';

export interface IdentityStudioInsightsDrawerProps {
  open: boolean;
  filterHabitIds?: ReadonlySet<string> | null;
  filterIdentityName?: string | null;
  filterIdentityId?: string | null;
  onClose: () => void;
}

export function IdentityStudioInsightsDrawer({
  open,
  filterHabitIds,
  filterIdentityId,
  filterIdentityName,
  onClose,
}: IdentityStudioInsightsDrawerProps) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex justify-end" role="dialog" aria-modal="true">
      <button
        type="button"
        className="absolute inset-0 bg-black/40"
        aria-label="Close insights"
        onClick={onClose}
      />
      <div className="relative flex h-full w-full max-w-lg flex-col bg-white shadow-xl">
        <header className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">Insights</h2>
            {filterIdentityName && (
              <p className="text-xs text-slate-500">Filtered: {filterIdentityName}</p>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-2 text-slate-500 hover:bg-slate-100"
          >
            ✕
          </button>
        </header>
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          <HabitsInsights filterHabitIds={filterHabitIds} embedded />
          <Link
            href={
              filterIdentityId
                ? `/today?identity=${encodeURIComponent(filterIdentityId)}`
                : '/today'
            }
            className="block text-center text-sm font-medium text-primary-600 hover:underline"
          >
            Open on Today →
          </Link>
        </div>
      </div>
    </div>
  );
}
