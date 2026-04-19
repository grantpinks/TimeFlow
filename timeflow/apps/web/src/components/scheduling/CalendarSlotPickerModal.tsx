'use client';

import { useEffect, useMemo, useState } from 'react';
import * as api from '@/lib/api';
import type { CalendarEvent } from '@timeflow/shared';

type RangeMode = '1d' | '3d' | '7d';

interface CalendarSlotPickerModalProps {
  isOpen: boolean;
  title: string;
  durationMinutes: number;
  initialDate?: Date;
  onClose: () => void;
  onSelect: (start: Date, end: Date) => void;
}

const SLOT_MINUTES = 30;
const START_HOUR = 6;
const END_HOUR = 22;
const ROW_HEIGHT = 28;

function startOfDay(date: Date): Date {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

function addDays(date: Date, days: number): Date {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

function formatDayLabel(date: Date): string {
  return date.toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  });
}

function formatTime(date: Date): string {
  return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
}

function localDayKey(date: Date): string {
  const y = date.getFullYear();
  const m = (date.getMonth() + 1).toString().padStart(2, '0');
  const d = date.getDate().toString().padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function overlaps(
  startA: Date,
  endA: Date,
  startB: Date,
  endB: Date
): boolean {
  return startA < endB && endA > startB;
}

export function CalendarSlotPickerModal({
  isOpen,
  title,
  durationMinutes,
  initialDate,
  onClose,
  onSelect,
}: CalendarSlotPickerModalProps) {
  const [rangeMode, setRangeMode] = useState<RangeMode>('1d');
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [anchorDate, setAnchorDate] = useState<Date>(startOfDay(initialDate ?? new Date()));
  const [selectedStart, setSelectedStart] = useState<Date | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    setAnchorDate(startOfDay(initialDate ?? new Date()));
    setSelectedStart(null);
  }, [isOpen, initialDate]);

  const daysToShow = rangeMode === '1d' ? 1 : rangeMode === '3d' ? 3 : 7;

  const visibleDays = useMemo(() => {
    return Array.from({ length: daysToShow }, (_, idx) => addDays(anchorDate, idx));
  }, [anchorDate, daysToShow]);

  useEffect(() => {
    if (!isOpen) return;
    let cancelled = false;

    async function loadEvents() {
      setLoading(true);
      setError(null);
      try {
        const rangeStart = startOfDay(visibleDays[0]);
        const rangeEnd = startOfDay(addDays(visibleDays[visibleDays.length - 1], 1));
        const from = rangeStart.toISOString();
        const to = rangeEnd.toISOString();
        const data = await api.getCalendarEvents(from, to);
        if (!cancelled) setEvents(data);
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Could not load calendar events');
          setEvents([]);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    loadEvents();
    return () => {
      cancelled = true;
    };
  }, [isOpen, visibleDays]);

  const blockedEvents = useMemo(() => {
    return events.filter((e) => e.transparency !== 'transparent');
  }, [events]);

  const timeSlots = useMemo(() => {
    const slots: { hour: number; minute: number }[] = [];
    for (let hour = START_HOUR; hour < END_HOUR; hour += 1) {
      slots.push({ hour, minute: 0 }, { hour, minute: 30 });
    }
    return slots;
  }, []);

  const durationRows = Math.max(1, Math.ceil(durationMinutes / SLOT_MINUTES));

  const selectedEnd = useMemo(() => {
    if (!selectedStart) return null;
    const end = new Date(selectedStart);
    end.setMinutes(end.getMinutes() + durationMinutes);
    return end;
  }, [selectedStart, durationMinutes]);

  const eventsByDay = useMemo(() => {
    const map = new Map<string, CalendarEvent[]>();
    for (const ev of blockedEvents) {
      const start = new Date(ev.start);
      const key = localDayKey(startOfDay(start));
      const list = map.get(key) ?? [];
      list.push(ev);
      map.set(key, list);
    }
    for (const list of map.values()) {
      list.sort((a, b) => new Date(a.start).getTime() - new Date(b.start).getTime());
    }
    return map;
  }, [blockedEvents]);

  const isSlotBlocked = (day: Date, hour: number, minute: number): boolean => {
    const start = new Date(day);
    start.setHours(hour, minute, 0, 0);
    const end = new Date(start);
    end.setMinutes(end.getMinutes() + durationMinutes);

    if (end.getDate() !== start.getDate()) return true;
    if (end.getHours() > END_HOUR || (end.getHours() === END_HOUR && end.getMinutes() > 0)) return true;

    return blockedEvents.some((event) => {
      const eventStart = new Date(event.start);
      const eventEnd = new Date(event.end);
      return overlaps(start, end, eventStart, eventEnd);
    });
  };

  const handleSelectCell = (day: Date, hour: number, minute: number) => {
    if (isSlotBlocked(day, hour, minute)) return;
    const start = new Date(day);
    start.setHours(hour, minute, 0, 0);
    setSelectedStart(start);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/35 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-2xl border border-slate-200 w-full max-w-5xl">
        <div className="px-4 py-3 border-b border-slate-200 flex items-center justify-between">
          <div>
            <h3 className="text-base font-semibold text-slate-900">Pick a time on your calendar</h3>
            <p className="text-xs text-slate-600">{title} • {durationMinutes} min</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="px-2.5 py-1.5 text-sm rounded-md border border-slate-300 text-slate-700 hover:bg-slate-50"
          >
            Close
          </button>
        </div>

        <div className="px-4 py-3 border-b border-slate-200 flex items-center justify-between">
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setRangeMode('1d')}
              className={`px-3 py-1.5 text-sm rounded-md ${rangeMode === '1d' ? 'bg-primary-600 text-white' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'}`}
            >
              1 day
            </button>
            <button
              type="button"
              onClick={() => setRangeMode('3d')}
              className={`px-3 py-1.5 text-sm rounded-md ${rangeMode === '3d' ? 'bg-primary-600 text-white' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'}`}
            >
              3 days
            </button>
            <button
              type="button"
              onClick={() => setRangeMode('7d')}
              className={`px-3 py-1.5 text-sm rounded-md ${rangeMode === '7d' ? 'bg-primary-600 text-white' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'}`}
            >
              Week
            </button>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setAnchorDate(addDays(anchorDate, -daysToShow))}
              className="px-3 py-1.5 text-sm rounded-md border border-slate-300 text-slate-700 hover:bg-slate-50"
            >
              Prev
            </button>
            <button
              type="button"
              onClick={() => setAnchorDate(startOfDay(new Date()))}
              className="px-3 py-1.5 text-sm rounded-md border border-slate-300 text-slate-700 hover:bg-slate-50"
            >
              Today
            </button>
            <button
              type="button"
              onClick={() => setAnchorDate(addDays(anchorDate, daysToShow))}
              className="px-3 py-1.5 text-sm rounded-md border border-slate-300 text-slate-700 hover:bg-slate-50"
            >
              Next
            </button>
          </div>
        </div>

        <div className="px-4 py-3">
          {error && (
            <div className="mb-3 text-sm text-red-700 bg-red-50 border border-red-200 rounded-md px-3 py-2">
              {error}
            </div>
          )}
          <p className="text-xs text-slate-500 mb-2">
            Click a free slot. Busy times (from your calendar) are blocked.
          </p>

          <div className="border border-slate-200 rounded-lg overflow-hidden">
            <div className="grid" style={{ gridTemplateColumns: `80px repeat(${visibleDays.length}, minmax(0, 1fr))` }}>
              <div className="bg-slate-50 border-b border-r border-slate-200 h-10" />
              {visibleDays.map((day) => {
                const today = startOfDay(new Date()).getTime();
                const isTodayCol = startOfDay(day).getTime() === today;
                const key = localDayKey(day);
                const dayEvents = eventsByDay.get(key) ?? [];
                return (
                  <div
                    key={day.toISOString()}
                    className={`h-10 border-b border-slate-200 px-2 flex flex-col justify-center text-xs font-medium ${
                      isTodayCol ? 'bg-blue-50 text-blue-900' : 'bg-slate-50 text-slate-700'
                    }`}
                  >
                    <span>{formatDayLabel(day)}</span>
                    {dayEvents.length > 0 && (
                      <span className="text-[10px] font-normal text-slate-500 truncate">
                        {dayEvents.length} event{dayEvents.length !== 1 ? 's' : ''}
                      </span>
                    )}
                  </div>
                );
              })}

              {timeSlots.map(({ hour, minute }) => (
                <FragmentRow
                  key={`${hour}:${minute}`}
                  hour={hour}
                  minute={minute}
                  visibleDays={visibleDays}
                  selectedStart={selectedStart}
                  durationRows={durationRows}
                  loading={loading}
                  isSlotBlocked={isSlotBlocked}
                  onSelect={handleSelectCell}
                />
              ))}
            </div>
          </div>

          <div className="mt-3 max-h-28 overflow-y-auto text-xs text-slate-600 border border-slate-100 rounded-md p-2 bg-slate-50/80">
            <p className="font-medium text-slate-700 mb-1">Events in this range</p>
            {blockedEvents.length === 0 ? (
              <p className="text-slate-500">No busy blocks in this window (or calendar not connected).</p>
            ) : (
              <ul className="space-y-1">
                {blockedEvents.slice(0, 12).map((ev) => (
                  <li key={`${ev.id ?? ev.start}-${ev.summary}`} className="truncate">
                    <span className="text-slate-500">
                      {formatDayLabel(new Date(ev.start))} {formatTime(new Date(ev.start))}–
                      {formatTime(new Date(ev.end))}
                    </span>{' '}
                    <span className="text-slate-800">{ev.summary}</span>
                  </li>
                ))}
                {blockedEvents.length > 12 && (
                  <li className="text-slate-500">+{blockedEvents.length - 12} more…</li>
                )}
              </ul>
            )}
          </div>
        </div>

        <div className="px-4 py-3 border-t border-slate-200 flex items-center justify-between">
          <div className="text-sm text-slate-700">
            {selectedStart && selectedEnd
              ? `Selected: ${formatDayLabel(selectedStart)} • ${formatTime(selectedStart)} - ${formatTime(selectedEnd)}`
              : 'No slot selected'}
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-3 py-1.5 text-sm rounded-md border border-slate-300 text-slate-700 hover:bg-slate-50"
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={!selectedStart || !selectedEnd}
              onClick={() => {
                if (selectedStart && selectedEnd) {
                  onSelect(selectedStart, selectedEnd);
                }
              }}
              className={`px-3 py-1.5 text-sm rounded-md ${
                selectedStart && selectedEnd
                  ? 'bg-primary-600 text-white hover:bg-primary-700'
                  : 'bg-slate-200 text-slate-400 cursor-not-allowed'
              }`}
            >
              Use this slot
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

interface FragmentRowProps {
  hour: number;
  minute: number;
  visibleDays: Date[];
  selectedStart: Date | null;
  durationRows: number;
  loading: boolean;
  isSlotBlocked: (day: Date, hour: number, minute: number) => boolean;
  onSelect: (day: Date, hour: number, minute: number) => void;
}

function FragmentRow({
  hour,
  minute,
  visibleDays,
  selectedStart,
  durationRows,
  loading,
  isSlotBlocked,
  onSelect,
}: FragmentRowProps) {
  return (
    <>
      <div
        className="border-r border-b border-slate-200 px-2 text-[11px] text-slate-500 flex items-start justify-end"
        style={{ height: `${ROW_HEIGHT}px` }}
      >
        {minute === 0 ? `${hour.toString().padStart(2, '0')}:00` : ''}
      </div>
      {visibleDays.map((day) => {
        const blocked = isSlotBlocked(day, hour, minute);
        const cellStart = new Date(day);
        cellStart.setHours(hour, minute, 0, 0);

        const isSelected = (() => {
          if (!selectedStart) return false;
          const diffMinutes = (cellStart.getTime() - selectedStart.getTime()) / (60 * 1000);
          return diffMinutes >= 0 && diffMinutes < durationRows * SLOT_MINUTES;
        })();

        return (
          <button
            key={`${day.toISOString()}-${hour}-${minute}`}
            type="button"
            disabled={blocked || loading}
            onClick={() => onSelect(day, hour, minute)}
            className={`border-b border-slate-200 relative ${
              blocked
                ? 'bg-slate-100 cursor-not-allowed'
                : isSelected
                  ? 'bg-primary-200 hover:bg-primary-300'
                  : 'bg-white hover:bg-blue-50'
            }`}
            style={{ height: `${ROW_HEIGHT}px` }}
          />
        );
      })}
    </>
  );
}
