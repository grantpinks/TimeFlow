'use client';

import { useMemo, useState } from 'react';
import { DateTime } from 'luxon';
import type { CalendarEvent } from '@timeflow/shared';

interface UpcomingEventsPanelProps {
  events: CalendarEvent[];
  onEventClick?: (event: CalendarEvent) => void;
}

export function UpcomingEventsPanel({ events, onEventClick }: UpcomingEventsPanelProps) {
  const [expanded, setExpanded] = useState(true);

  // Filter and sort upcoming events (from now onwards, next 7 days)
  const upcomingEvents = useMemo(() => {
    const now = new Date();
    const weekFromNow = new Date();
    weekFromNow.setDate(weekFromNow.getDate() + 7);

    return events
      .filter((event) => {
        const eventStart = new Date(event.start);
        return eventStart >= now && eventStart <= weekFromNow;
      })
      .sort((a, b) => new Date(a.start).getTime() - new Date(b.start).getTime())
      .slice(0, 10); // Show max 10 upcoming events
  }, [events]);

  const formatEventTime = (start: string, end: string) => {
    const startDt = DateTime.fromISO(start);
    const endDt = DateTime.fromISO(end);
    const now = DateTime.now();

    // Check if event is today
    const isToday = startDt.hasSame(now, 'day');
    const isTomorrow = startDt.hasSame(now.plus({ days: 1 }), 'day');

    let dayLabel = '';
    if (isToday) {
      dayLabel = 'Today';
    } else if (isTomorrow) {
      dayLabel = 'Tomorrow';
    } else {
      dayLabel = startDt.toFormat('EEE, MMM d');
    }

    const timeRange = `${startDt.toFormat('h:mm a')} - ${endDt.toFormat('h:mm a')}`;

    return { dayLabel, timeRange };
  };

  // Generate a consistent color for each event (based on event ID or title)
  const getEventColor = (event: CalendarEvent) => {
    const colors = [
      '#3B82F6', // blue
      '#8B5CF6', // purple
      '#EC4899', // pink
      '#F59E0B', // amber
      '#10B981', // emerald
      '#6366F1', // indigo
      '#EF4444', // red
      '#14B8A6', // teal
    ];

    const hash = (event.id || event.summary).split('').reduce((acc, char) => {
      return char.charCodeAt(0) + ((acc << 5) - acc);
    }, 0);

    return colors[Math.abs(hash) % colors.length];
  };

  return (
    <div className="bg-white border-b border-slate-200 overflow-hidden flex-shrink-0">
      {/* Header */}
      <div
        className="flex items-center justify-between px-3 py-2.5 cursor-pointer hover:bg-slate-50/50 transition-colors"
        onClick={() => setExpanded(!expanded)}
      >
        <h3 className="text-sm font-semibold text-slate-800">Upcoming Events</h3>
        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full font-medium">
            {upcomingEvents.length}
          </span>
          <svg
            className={`w-3.5 h-3.5 text-slate-400 transition-transform ${expanded ? 'rotate-180' : ''}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </div>

      {/* Events List */}
      {expanded && (
        <div className="max-h-96 overflow-y-auto">
          {upcomingEvents.length === 0 ? (
            <div className="p-8 text-center">
              <svg
                className="w-10 h-10 mx-auto mb-2 text-slate-300"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                />
              </svg>
              <p className="text-xs text-slate-500">No upcoming events</p>
            </div>
          ) : (
            <div className="divide-y divide-slate-50">
              {upcomingEvents.map((event, index) => {
                const { dayLabel, timeRange } = formatEventTime(event.start, event.end);
                const eventColor = getEventColor(event);

                return (
                  <div
                    key={event.id || index}
                    className="px-3 py-2 hover:bg-slate-50/50 transition-colors cursor-pointer"
                    onClick={() => onEventClick?.(event)}
                  >
                    <div className="flex items-start gap-2.5">
                      {/* Colored dot indicator */}
                      <div
                        className="w-2 h-2 rounded-full mt-1 flex-shrink-0"
                        style={{ backgroundColor: eventColor }}
                      />

                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium text-slate-800 truncate leading-snug">
                          {event.summary}
                        </p>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          <span className="text-[11px] font-semibold text-primary-600">
                            {dayLabel}
                          </span>
                          <span className="text-[11px] text-slate-500">
                            {timeRange}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
