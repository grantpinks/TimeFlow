'use client';

import { useState, useMemo } from 'react';
import { DateTime } from 'luxon';
import type { CalendarEvent, Task } from '@timeflow/shared';

interface MiniCalendarProps {
  events: CalendarEvent[];
  tasks: Task[];
  selectedDate?: Date;
  onDateClick?: (date: Date) => void;
}

export function MiniCalendar({ events, tasks, selectedDate, onDateClick }: MiniCalendarProps) {
  const [currentMonth, setCurrentMonth] = useState(DateTime.now());

  // Get dates that have events or tasks
  const datesWithActivity = useMemo(() => {
    const activityDates = new Set<string>();

    // Add dates with external events
    events.forEach((event) => {
      const date = DateTime.fromISO(event.start).toFormat('yyyy-MM-dd');
      activityDates.add(date);
    });

    // Add dates with scheduled tasks
    tasks.forEach((task) => {
      if (task.scheduledTask) {
        const date = DateTime.fromISO(task.scheduledTask.startDateTime).toFormat('yyyy-MM-dd');
        activityDates.add(date);
      }
    });

    return activityDates;
  }, [events, tasks]);

  // Generate calendar grid
  const calendarDays = useMemo(() => {
    const startOfMonth = currentMonth.startOf('month');
    const endOfMonth = currentMonth.endOf('month');
    const startDate = startOfMonth.startOf('week');
    const endDate = endOfMonth.endOf('week');

    const days: DateTime[] = [];
    let current = startDate;

    while (current <= endDate) {
      days.push(current);
      current = current.plus({ days: 1 });
    }

    return days;
  }, [currentMonth]);

  const handlePrevMonth = () => {
    setCurrentMonth(currentMonth.minus({ months: 1 }));
  };

  const handleNextMonth = () => {
    setCurrentMonth(currentMonth.plus({ months: 1 }));
  };

  const handleDateClick = (date: DateTime) => {
    onDateClick?.(date.toJSDate());
  };

  const today = DateTime.now().toFormat('yyyy-MM-dd');
  const selected = selectedDate ? DateTime.fromJSDate(selectedDate).toFormat('yyyy-MM-dd') : null;

  return (
    <div className="bg-white border-b border-slate-200 p-3 flex-shrink-0">
      {/* Month Header */}
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-slate-800">
          {currentMonth.toFormat('MMMM yyyy')}
        </h3>
        <div className="flex items-center gap-1">
          <button
            onClick={handlePrevMonth}
            className="p-1 hover:bg-slate-100 rounded transition-colors"
            aria-label="Previous month"
          >
            <svg className="w-4 h-4 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <button
            onClick={handleNextMonth}
            className="p-1 hover:bg-slate-100 rounded transition-colors"
            aria-label="Next month"
          >
            <svg className="w-4 h-4 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </div>
      </div>

      {/* Weekday Headers */}
      <div className="grid grid-cols-7 gap-1 mb-2">
        {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((day, i) => (
          <div key={i} className="text-center text-xs font-medium text-slate-500 py-1">
            {day}
          </div>
        ))}
      </div>

      {/* Calendar Grid */}
      <div className="grid grid-cols-7 gap-1">
        {calendarDays.map((date) => {
          const dateStr = date.toFormat('yyyy-MM-dd');
          const isToday = dateStr === today;
          const isSelected = dateStr === selected;
          const isCurrentMonth = date.month === currentMonth.month;
          const hasActivity = datesWithActivity.has(dateStr);

          return (
            <button
              key={dateStr}
              onClick={() => handleDateClick(date)}
              className={`
                relative h-8 rounded-lg text-xs font-medium transition-all
                ${!isCurrentMonth ? 'text-slate-300' : ''}
                ${isToday && !isSelected ? 'bg-primary-50 text-primary-600 font-semibold' : ''}
                ${isSelected ? 'bg-primary-500 text-white font-semibold shadow-sm' : ''}
                ${!isToday && !isSelected && isCurrentMonth ? 'text-slate-700 hover:bg-slate-50' : ''}
              `}
            >
              {date.day}
              {hasActivity && !isSelected && (
                <div className="absolute bottom-0.5 left-1/2 transform -translate-x-1/2">
                  <div className="w-1 h-1 rounded-full bg-primary-400"></div>
                </div>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
