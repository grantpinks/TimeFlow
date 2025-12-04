'use client';

import { useMemo, useState, useCallback } from 'react';
import { Calendar, luxonLocalizer, Views } from 'react-big-calendar';
import withDragAndDrop from 'react-big-calendar/lib/addons/dragAndDrop';
import { DateTime } from 'luxon';
import type { Task, CalendarEvent } from '@timeflow/shared';
import 'react-big-calendar/lib/css/react-big-calendar.css';
import 'react-big-calendar/lib/addons/dragAndDrop/styles.css';

// Setup luxon localizer
const localizer = luxonLocalizer(DateTime);

// Create DnD-enabled Calendar
const DnDCalendar = withDragAndDrop(Calendar);

interface CalendarViewProps {
  tasks: Task[];
  externalEvents: CalendarEvent[];
  onSelectSlot?: (slotInfo: { start: Date; end: Date }) => void;
  onSelectEvent?: (event: CalendarEventItem) => void;
  onRescheduleTask?: (taskId: string, start: Date, end: Date) => Promise<void>;
}

export interface CalendarEventItem {
  id: string;
  title: string;
  start: Date;
  end: Date;
  isTask: boolean;
  taskId?: string;
  overflowed?: boolean;
}

export function CalendarView({
  tasks,
  externalEvents,
  onSelectSlot,
  onSelectEvent,
  onRescheduleTask,
}: CalendarViewProps) {
  const [view, setView] = useState<'week' | 'day' | 'month'>(Views.WEEK);
  const [date, setDate] = useState(new Date());
  const [isRescheduling, setIsRescheduling] = useState(false);

  // Convert tasks and events to calendar format
  const events = useMemo(() => {
    const calendarEvents: CalendarEventItem[] = [];

    // Add scheduled tasks
    for (const task of tasks) {
      if (task.scheduledTask) {
        calendarEvents.push({
          id: `task-${task.id}`,
          title: task.title,
          start: new Date(task.scheduledTask.startDateTime),
          end: new Date(task.scheduledTask.endDateTime),
          isTask: true,
          taskId: task.id,
          overflowed: task.scheduledTask.overflowedDeadline,
        });
      }
    }

    // Add external events
    for (const event of externalEvents) {
      calendarEvents.push({
        id: `event-${event.id || Math.random().toString()}`,
        title: event.summary,
        start: new Date(event.start),
        end: new Date(event.end),
        isTask: false,
      });
    }

    return calendarEvents;
  }, [tasks, externalEvents]);

  const eventStyleGetter = useCallback((event: CalendarEventItem) => {
    if (event.isTask) {
      return {
        className: event.overflowed ? 'task-event overflowed' : 'task-event',
        style: {
          backgroundColor: event.overflowed ? '#ef4444' : '#3b82f6',
          borderRadius: '4px',
          border: 'none',
          color: 'white',
        },
      };
    }
    return {
      className: 'external-event',
      style: {
        backgroundColor: '#64748b',
        borderRadius: '4px',
        border: 'none',
        color: 'white',
        opacity: 0.7,
      },
    };
  }, []);

  const handleNavigate = useCallback((newDate: Date) => {
    setDate(newDate);
  }, []);

  const handleViewChange = useCallback((newView: 'week' | 'day' | 'month') => {
    setView(newView);
  }, []);

  const handleEventDrop = useCallback(
    async ({
      event,
      start,
      end,
    }: {
      event: CalendarEventItem;
      start: Date;
      end: Date;
    }) => {
      // Only allow rescheduling of tasks, not external calendar events
      if (!event.isTask || !event.taskId || !onRescheduleTask) {
        return;
      }

      setIsRescheduling(true);
      try {
        await onRescheduleTask(event.taskId, start, end);
      } catch (error) {
        console.error('Failed to reschedule task:', error);
      } finally {
        setIsRescheduling(false);
      }
    },
    [onRescheduleTask]
  );

  const handleEventResize = useCallback(
    async ({
      event,
      start,
      end,
    }: {
      event: CalendarEventItem;
      start: Date;
      end: Date;
    }) => {
      // Only allow resizing of tasks, not external calendar events
      if (!event.isTask || !event.taskId || !onRescheduleTask) {
        return;
      }

      setIsRescheduling(true);
      try {
        await onRescheduleTask(event.taskId, start, end);
      } catch (error) {
        console.error('Failed to resize task:', error);
      } finally {
        setIsRescheduling(false);
      }
    },
    [onRescheduleTask]
  );

  return (
    <div className="h-[700px] bg-white rounded-lg shadow-sm border border-slate-200 p-4">
      {isRescheduling && (
        <div className="absolute top-4 right-4 bg-primary-600 text-white px-4 py-2 rounded-lg shadow-lg z-10">
          Rescheduling...
        </div>
      )}
      <DnDCalendar
        localizer={localizer}
        events={events}
        startAccessor="start"
        endAccessor="end"
        view={view}
        date={date}
        onNavigate={handleNavigate}
        onView={handleViewChange}
        views={['week', 'day', 'month']}
        selectable
        onSelectSlot={onSelectSlot}
        onSelectEvent={onSelectEvent}
        onEventDrop={handleEventDrop}
        onEventResize={handleEventResize}
        resizable
        draggableAccessor={(event: CalendarEventItem) => event.isTask}
        eventPropGetter={eventStyleGetter}
        min={new Date(0, 0, 0, 6, 0, 0)} // 6 AM
        max={new Date(0, 0, 0, 23, 0, 0)} // 11 PM
        step={15}
        timeslots={4}
      />
    </div>
  );
}

