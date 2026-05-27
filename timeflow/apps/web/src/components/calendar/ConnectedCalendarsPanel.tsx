'use client';

import Link from 'next/link';
import type { ConnectedAccount } from '@/lib/api';

interface ConnectedCalendarsPanelProps {
  accounts: ConnectedAccount[];
  loading: boolean;
  onToggleCalendar: (connectedCalendarId: string, visible: boolean) => Promise<void>;
}

function providerLabel(provider: ConnectedAccount['provider']): string {
  if (provider === 'apple_caldav') return 'iCloud';
  return 'Google';
}

export function ConnectedCalendarsPanel({
  accounts,
  loading,
  onToggleCalendar,
}: ConnectedCalendarsPanelProps) {
  if (loading) {
    return (
      <div>
        <h3 className="text-sm font-semibold text-slate-900 mb-2">My calendars</h3>
        <p className="text-xs text-slate-500">Loading connected calendars...</p>
      </div>
    );
  }

  if (accounts.length === 0) {
    return (
      <div>
        <div className="flex items-center justify-between gap-2 mb-2">
          <h3 className="text-sm font-semibold text-slate-900">My calendars</h3>
          <Link
            href="/settings"
            className="text-xs font-medium text-primary-600 hover:text-primary-700"
          >
            Connect
          </Link>
        </div>
        <p className="text-xs text-slate-500">No connected calendars yet.</p>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between gap-2 mb-3">
        <h3 className="text-sm font-semibold text-slate-900">My calendars</h3>
        <Link
          href="/settings"
          className="text-xs font-medium text-primary-600 hover:text-primary-700"
        >
          Manage
        </Link>
      </div>
      <div className="space-y-3">
        {accounts.map((account) => (
          <div key={account.id}>
            <p className="text-[11px] uppercase tracking-wide text-slate-500 mb-1.5">
              {providerLabel(account.provider)} • {account.email}
            </p>
            <div className="space-y-1.5">
              {account.calendars.map((calendar) => (
                <label
                  key={calendar.id}
                  className="flex items-center gap-2 text-sm text-slate-700 cursor-pointer"
                >
                  <input
                    type="checkbox"
                    className="h-3.5 w-3.5 rounded border-slate-300 text-primary-600 focus:ring-primary-500"
                    checked={calendar.visible}
                    onChange={(e) => onToggleCalendar(calendar.id, e.target.checked)}
                  />
                  <span
                    className="inline-block h-2.5 w-2.5 rounded-sm"
                    style={{ backgroundColor: calendar.color ?? '#64748B' }}
                  />
                  <span className="truncate">{calendar.name}</span>
                </label>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
