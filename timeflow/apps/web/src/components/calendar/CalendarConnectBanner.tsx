'use client';

import Link from 'next/link';
import type { ConnectedAccount } from '@/lib/api';

interface CalendarConnectBannerProps {
  accounts: ConnectedAccount[];
  dismissed: boolean;
  onDismiss: () => void;
}

export function CalendarConnectBanner({ accounts, dismissed, onDismiss }: CalendarConnectBannerProps) {
  if (dismissed) return null;

  const hasIcloud = accounts.some((a) => a.provider === 'apple_caldav');
  if (hasIcloud || accounts.length === 0) return null;

  return (
    <div className="mx-3 mb-2 rounded-lg border border-primary-100 bg-primary-50/80 px-3 py-2.5">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-xs font-semibold text-slate-800">Connect more calendars</p>
          <p className="mt-0.5 text-[11px] leading-snug text-slate-600">
            Add iCloud in Settings with an app-specific password to see work and personal events together.
          </p>
          <Link
            href="/settings"
            className="mt-1.5 inline-block text-[11px] font-medium text-primary-600 hover:text-primary-700"
          >
            Open Settings →
          </Link>
        </div>
        <button
          type="button"
          onClick={onDismiss}
          className="shrink-0 rounded p-0.5 text-slate-400 hover:text-slate-600"
          aria-label="Dismiss"
        >
          <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
    </div>
  );
}
