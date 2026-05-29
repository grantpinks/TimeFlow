'use client';

import { useState } from 'react';
import Link from 'next/link';
import type { ConnectedAccount } from '@/lib/api';

interface ConnectedCalendarsPanelProps {
  accounts: ConnectedAccount[];
  loading: boolean;
  onToggleCalendar: (connectedCalendarId: string, visible: boolean) => Promise<void>;
  onSetListedInSidebar: (connectedCalendarId: string, listedInSidebar: boolean) => Promise<void>;
}

function providerLabel(provider: ConnectedAccount['provider']): string {
  if (provider === 'apple_caldav') return 'iCloud';
  return 'Google';
}

export function ConnectedCalendarsPanel({
  accounts,
  loading,
  onToggleCalendar,
  onSetListedInSidebar,
}: ConnectedCalendarsPanelProps) {
  const [hiddenExpanded, setHiddenExpanded] = useState(false);

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

  const listedCalendars = accounts.flatMap((account) =>
    account.calendars
      .filter((cal) => cal.listedInSidebar !== false)
      .map((cal) => ({ account, cal }))
  );
  const hiddenCalendars = accounts.flatMap((account) =>
    account.calendars
      .filter((cal) => cal.listedInSidebar === false)
      .map((cal) => ({ account, cal }))
  );

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

      {listedCalendars.length === 0 ? (
        <p className="text-xs text-slate-500 mb-2">No calendars shown. Restore hidden calendars below or manage in Settings.</p>
      ) : (
        <div className="space-y-3">
          {accounts.map((account) => {
            const calendars = account.calendars.filter((cal) => cal.listedInSidebar !== false);
            if (calendars.length === 0) return null;

            return (
              <div key={account.id}>
                <p className="text-[11px] uppercase tracking-wide text-slate-500 mb-1.5">
                  {providerLabel(account.provider)} • {account.email}
                </p>
                <div className="space-y-1.5">
                  {calendars.map((calendar) => (
                    <div
                      key={calendar.id}
                      className="group flex items-center gap-1 text-sm text-slate-700"
                    >
                      <label className="flex flex-1 items-center gap-2 cursor-pointer min-w-0">
                        <input
                          type="checkbox"
                          className="h-3.5 w-3.5 shrink-0 rounded border-slate-300 text-primary-600 focus:ring-primary-500"
                          checked={calendar.visible}
                          onChange={(e) => onToggleCalendar(calendar.id, e.target.checked)}
                          title={calendar.visible ? 'Hide events on calendar' : 'Show events on calendar'}
                        />
                        <span
                          className="inline-block h-2.5 w-2.5 shrink-0 rounded-sm"
                          style={{ backgroundColor: calendar.color ?? '#64748B' }}
                        />
                        <span className="truncate">{calendar.name}</span>
                      </label>
                      <button
                        type="button"
                        onClick={() => onSetListedInSidebar(calendar.id, false)}
                        className="shrink-0 rounded p-0.5 text-slate-400 opacity-0 transition-opacity hover:text-slate-600 group-hover:opacity-100 focus:opacity-100"
                        title="Remove from this list"
                        aria-label={`Hide ${calendar.name} from sidebar`}
                      >
                        <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {hiddenCalendars.length > 0 && (
        <div className="mt-3 border-t border-slate-100 pt-2">
          <button
            type="button"
            onClick={() => setHiddenExpanded((open) => !open)}
            className="text-xs font-medium text-slate-500 hover:text-slate-700"
          >
            {hiddenExpanded ? 'Hide' : 'Show'} {hiddenCalendars.length} hidden calendar
            {hiddenCalendars.length === 1 ? '' : 's'}
          </button>
          {hiddenExpanded && (
            <ul className="mt-2 space-y-1">
              {hiddenCalendars.map(({ account, cal }) => (
                <li
                  key={cal.id}
                  className="flex items-center justify-between gap-2 text-xs text-slate-600"
                >
                  <span className="truncate">
                    {cal.name}{' '}
                    <span className="text-slate-400">
                      ({providerLabel(account.provider)})
                    </span>
                  </span>
                  <button
                    type="button"
                    onClick={() => onSetListedInSidebar(cal.id, true)}
                    className="shrink-0 font-medium text-primary-600 hover:text-primary-700"
                  >
                    Show
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
