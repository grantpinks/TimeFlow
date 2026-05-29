'use client';

import { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import Link from 'next/link';
import type { ConnectedAccount } from '@/lib/api';
import { CALENDAR_COLOR_PRESETS, defaultCalendarColor } from '@/lib/calendarColorPresets';

interface ConnectedCalendarsPanelProps {
  accounts: ConnectedAccount[];
  loading: boolean;
  onToggleCalendar: (connectedCalendarId: string, visible: boolean) => Promise<void>;
  onSetListedInSidebar: (connectedCalendarId: string, listedInSidebar: boolean) => Promise<void>;
  onSetCalendarColor: (connectedCalendarId: string, color: string) => Promise<void>;
  onResyncAccount?: (connectedAccountId: string) => Promise<void>;
}

const CUSTOM_COLOR_DEBOUNCE_MS = 300;

function providerLabel(provider: ConnectedAccount['provider']): string {
  if (provider === 'apple_caldav') return 'iCloud';
  return 'Google';
}

function accountHasSyncIssue(account: ConnectedAccount): boolean {
  if (!account.lastErrorAt) return false;
  if (!account.lastSuccessAt) return true;
  return new Date(account.lastErrorAt) > new Date(account.lastSuccessAt);
}

function CalendarColorPicker({
  color,
  calendarIndex,
  onChange,
}: {
  color: string | null;
  calendarIndex: number;
  onChange: (color: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [menuPos, setMenuPos] = useState<{ top: number; left: number } | null>(null);
  const [previewColor, setPreviewColor] = useState<string | null>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const savedColor = color ?? defaultCalendarColor(calendarIndex);
  const swatchColor = previewColor ?? savedColor;

  const closeMenu = () => {
    setOpen(false);
    setMenuPos(null);
    setPreviewColor(null);
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
      debounceRef.current = null;
    }
  };

  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, []);

  const openMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const rect = buttonRef.current?.getBoundingClientRect();
    if (rect) {
      setMenuPos({ top: rect.bottom + 4, left: rect.left });
    }
    setOpen(true);
  };

  const applyPreset = (preset: string) => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
      debounceRef.current = null;
    }
    setPreviewColor(null);
    onChange(preset);
    closeMenu();
  };

  const scheduleCustomColor = (hex: string) => {
    setPreviewColor(hex);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      onChange(hex);
      debounceRef.current = null;
    }, CUSTOM_COLOR_DEBOUNCE_MS);
  };

  const menu =
    open && menuPos && typeof document !== 'undefined'
      ? createPortal(
          <>
            <button
              type="button"
              className="fixed inset-0 z-[100] cursor-default"
              aria-label="Close color picker"
              onClick={closeMenu}
            />
            <div
              className="fixed z-[101] w-36 rounded-lg border border-slate-200 bg-white p-2 shadow-lg"
              style={{ top: menuPos.top, left: menuPos.left }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="grid grid-cols-5 gap-1">
                {CALENDAR_COLOR_PRESETS.map((preset) => (
                  <button
                    key={preset}
                    type="button"
                    className="h-5 w-5 rounded-sm border border-slate-200 transition-transform hover:scale-110"
                    style={{ backgroundColor: preset }}
                    title={preset}
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      applyPreset(preset);
                    }}
                  />
                ))}
              </div>
              <label className="mt-2 flex items-center gap-2 border-t border-slate-100 pt-2 text-[10px] text-slate-500">
                Custom
                <input
                  type="color"
                  value={swatchColor.length === 7 ? swatchColor : '#64748B'}
                  className="h-5 w-8 cursor-pointer rounded border-0 bg-transparent p-0"
                  onChange={(e) => {
                    e.stopPropagation();
                    scheduleCustomColor(e.target.value);
                  }}
                />
              </label>
            </div>
          </>,
          document.body
        )
      : null;

  return (
    <>
      <button
        ref={buttonRef}
        type="button"
        className="h-3.5 w-3.5 shrink-0 rounded-sm border border-slate-200 shadow-sm ring-offset-1 hover:ring-2 hover:ring-primary-300 focus:outline-none focus:ring-2 focus:ring-primary-400"
        style={{ backgroundColor: swatchColor }}
        title="Choose calendar color"
        aria-label="Choose calendar color"
        aria-expanded={open}
        onClick={openMenu}
      />
      {menu}
    </>
  );
}

export function ConnectedCalendarsPanel({
  accounts,
  loading,
  onToggleCalendar,
  onSetListedInSidebar,
  onSetCalendarColor,
  onResyncAccount,
}: ConnectedCalendarsPanelProps) {
  const [hiddenExpanded, setHiddenExpanded] = useState(false);
  const [collapsedAccounts, setCollapsedAccounts] = useState<Record<string, boolean>>({});
  const [resyncingId, setResyncingId] = useState<string | null>(null);

  if (loading) {
    return <p className="text-xs text-slate-500">Loading connected calendars…</p>;
  }

  if (accounts.length === 0) {
    return (
      <div>
        <p className="text-xs text-slate-500">No connected calendars yet.</p>
        <Link
          href="/settings"
          className="mt-1 inline-block text-xs font-medium text-primary-600 hover:text-primary-700"
        >
          Connect a calendar
        </Link>
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

  let globalCalendarIndex = 0;

  return (
    <div className="space-y-3">
      {accounts.map((account) => {
        const calendars = account.calendars.filter((cal) => cal.listedInSidebar !== false);
        if (calendars.length === 0) return null;

        const collapsed = collapsedAccounts[account.id] ?? false;
        const syncIssue = accountHasSyncIssue(account);

        return (
          <div key={account.id} className="rounded-md border border-slate-100 bg-slate-50/50">
            <div className="flex items-center gap-1 px-2 py-1.5">
              <button
                type="button"
                onClick={() =>
                  setCollapsedAccounts((prev) => ({ ...prev, [account.id]: !collapsed }))
                }
                className="flex min-w-0 flex-1 items-center gap-1 text-left"
              >
                <svg
                  className={`h-3 w-3 shrink-0 text-slate-400 transition-transform ${collapsed ? '' : 'rotate-90'}`}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" />
                </svg>
                <span className="truncate text-[11px] font-medium uppercase tracking-wide text-slate-600">
                  {providerLabel(account.provider)} · {account.email}
                </span>
              </button>
              {syncIssue && (
                <span
                  className="shrink-0 text-amber-500"
                  title={account.lastErrorMessage ?? 'Sync issue — try resync'}
                >
                  ⚠
                </span>
              )}
              {onResyncAccount && (
                <button
                  type="button"
                  disabled={resyncingId === account.id}
                  onClick={async () => {
                    setResyncingId(account.id);
                    try {
                      await onResyncAccount(account.id);
                    } finally {
                      setResyncingId(null);
                    }
                  }}
                  className="shrink-0 rounded px-1 text-[10px] font-medium text-primary-600 hover:bg-primary-50 disabled:opacity-50"
                  title="Resync calendars from provider"
                >
                  {resyncingId === account.id ? '…' : 'Sync'}
                </button>
              )}
            </div>

            {!collapsed && (
              <div className="space-y-1 border-t border-slate-100 px-2 py-1.5">
                {calendars.map((calendar) => {
                  const colorIndex = globalCalendarIndex++;
                  return (
                    <div
                      key={calendar.id}
                      className="group flex items-center gap-1 text-sm text-slate-700"
                    >
                      <label className="flex min-w-0 flex-1 cursor-pointer items-center gap-2">
                        <input
                          type="checkbox"
                          className="h-3.5 w-3.5 shrink-0 rounded border-slate-300 text-primary-600 focus:ring-primary-500"
                          checked={calendar.visible}
                          onChange={(e) => onToggleCalendar(calendar.id, e.target.checked)}
                          title={
                            calendar.visible
                              ? 'Hide events on calendar'
                              : 'Show events on calendar'
                          }
                        />
                        <CalendarColorPicker
                          color={calendar.color}
                          calendarIndex={colorIndex}
                          onChange={(nextColor) => onSetCalendarColor(calendar.id, nextColor)}
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
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M6 18L18 6M6 6l12 12"
                          />
                        </svg>
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}

      {listedCalendars.length === 0 && (
        <p className="text-xs text-slate-500">
          No calendars shown. Restore hidden calendars below or manage in Settings.
        </p>
      )}

      {hiddenCalendars.length > 0 && (
        <div className="border-t border-slate-100 pt-2">
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
                    <span className="text-slate-400">({providerLabel(account.provider)})</span>
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
