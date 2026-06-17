'use client';

import { useMemo, useState, useCallback, useRef, useEffect } from 'react';
import type { ComponentType } from 'react';
import { Calendar, luxonLocalizer, Views, type View } from 'react-big-calendar';
import { useDroppable, useDraggable } from '@dnd-kit/core';
import { DateTime } from 'luxon';
import { motion, useReducedMotion } from 'framer-motion';
import type { Task, CalendarEvent, CategoryTrainingExampleSnapshot, HabitSkipReason } from '@timeflow/shared';
import { EventDetailPopover } from './EventDetailPopover';
import {
  formatDropPreviewTime,
  snapResizeDuration,
  type CalendarDropPreview,
} from '@/app/calendar/calendarDragUtils';
import 'react-big-calendar/lib/css/react-big-calendar.css';
import { resolveEventDisplayColor } from '@/lib/eventDisplayColor';
import { useViewport } from '@/hooks/useViewport';

// Setup luxon localizer
const localizer = luxonLocalizer(DateTime);

/**
 * Normalize timestamps to minute precision so tiny second/millisecond drift
 * does not create false overlap lanes in react-big-calendar.
 */
const normalizeCalendarDate = (value: string | Date): Date => {
  const dt = new Date(value);
  dt.setSeconds(0, 0);
  return dt;
};

/**
 * Treat event end as an exclusive boundary for lane layout.
 * Back-to-back events (end === next start) should not stack.
 */
const toExclusiveLayoutEnd = (start: Date, end: Date): Date => {
  const startMs = start.getTime();
  const endMs = end.getTime();
  if (endMs <= startMs) return end;
  return new Date(endMs - 1);
};

interface Category {
  id: string;
  name: string;
  color: string;
}

interface EventCategorization {
  categoryId: string;
  categoryName: string;
  categoryColor: string;
  confidence: number;
  isManual: boolean;
}

interface CalendarViewProps {
  tasks: Task[];
  externalEvents: CalendarEvent[];
  eventCategorizations?: Record<string, EventCategorization>;
  categories?: Category[];
  habitStreakMap?: Map<string, { current: number; atRisk: boolean }>;
  scheduledHabitInstances?: Array<{ scheduledHabitId: string; habitId: string }>;
  selectedDate?: Date;
  dropPreview?: CalendarDropPreview | null;
  isDraggingActive?: boolean; // Disable animations during drag for better performance
  onSelectSlot?: (slotInfo: { start: Date; end: Date }) => void;
  onSelectEvent?: (event: CalendarEventItem) => void;
  onRescheduleTask?: (taskId: string, start: Date, end: Date) => Promise<void>;
  onResizeEvent?: (taskId: string, start: Date, end: Date) => Promise<void>;
  onCompleteTask?: (taskId: string) => Promise<void>;
  onCompleteHabit?: (scheduledHabitId: string, actualDurationMinutes?: number) => Promise<void>;
  onUndoHabit?: (scheduledHabitId: string) => Promise<void>;
  onSkipHabit?: (scheduledHabitId: string, reasonCode: HabitSkipReason) => Promise<void>;
  onHabitReschedule?: (scheduledHabitId: string, start: Date, end: Date) => Promise<void>;
  onEditTask?: (taskId: string) => void;
  onUnscheduleTask?: (taskId: string) => Promise<void>;
  onDeleteTask?: (taskId: string) => Promise<void>;
  onCategoryChange?: (
    eventId: string,
    categoryId: string,
    training?: { useForTraining?: boolean; example?: CategoryTrainingExampleSnapshot },
    eventSummary?: string
  ) => Promise<void>;
  /** Called after tasks are created from meeting action-item flow (refresh list). */
  onTasksRefresh?: () => void | Promise<void>;
}

export interface CalendarEventItem {
  id: string;
  title: string;
  start: Date;
  end: Date;
  /** Used by react-big-calendar for overlap lane calculation only. */
  layoutEnd?: Date;
  allDay?: boolean; // True for all-day events and unscheduled due tasks
  isTask: boolean;
  taskId?: string;
  description?: string;
  overflowed?: boolean;
  categoryColor?: string;
  /** Per-connected-calendar color (takes precedence over AI category tint for external events). */
  calendarColor?: string;
  isHabit?: boolean;
  scheduledHabitId?: string;
  eventId?: string;
  attendees?: { email: string }[];
  // Completion tracking
  sourceType?: 'task' | 'habit' | 'external';
  sourceId?: string; // task ID or scheduledHabit ID
  isCompleted?: boolean;
  // Due date task properties
  isDueTask?: boolean; // True for unscheduled tasks shown in all-day section
  dueDate?: Date; // The actual due date for tasks
  priority?: 1 | 2 | 3; // Task priority for styling
}

export function CalendarView({
  tasks,
  externalEvents,
  eventCategorizations,
  categories,
  habitStreakMap,
  scheduledHabitInstances,
  selectedDate,
  dropPreview,
  isDraggingActive = false,
  onSelectSlot,
  onSelectEvent,
  onRescheduleTask,
  onResizeEvent,
  onCompleteTask,
  onCompleteHabit,
  onUndoHabit,
  onSkipHabit,
  onHabitReschedule,
  onEditTask,
  onUnscheduleTask,
  onDeleteTask,
  onCategoryChange,
  onTasksRefresh,
}: CalendarViewProps) {
  const { isMobile } = useViewport();

  // Default to week view to avoid hydration mismatch
  // User can switch to day view if preferred
  const [view, setView] = useState<View>(Views.WEEK);
  const [date, setDate] = useState(selectedDate || new Date());

  // Switch to day view on mobile after mount (no hydration mismatch)
  useEffect(() => {
    if (isMobile && view === Views.WEEK) {
      setView(Views.DAY);
    }
  }, [isMobile, view]);

  // Update internal date when selectedDate prop changes
  useEffect(() => {
    if (selectedDate) {
      setDate(selectedDate);
    }
  }, [selectedDate]);
  const isRescheduling = false;
  const [popoverOpen, setPopoverOpen] = useState(false);
  const [popoverPosition, setPopoverPosition] = useState({ x: 0, y: 0 });
  const [selectedEventForPopover, setSelectedEventForPopover] = useState<{
    id: string;
    title: string;
    start: Date;
    end: Date;
    description?: string;
    isTask: boolean;
    task?: Task;
    isHabit?: boolean;
    scheduledHabitId?: string;
    habitCompletion?: {
      status: 'completed' | 'skipped';
      reasonCode?: string;
    };
    habitStreak?: {
      current: number;
      atRisk: boolean;
    };
    categoryColor?: string;
    categoryName?: string;
    categoryId?: string;
    overflowed?: boolean;
    attendees?: { email: string }[];
  } | null>(null);

  const prefersReducedMotion = useReducedMotion() ?? false;

  // Convert tasks and events to calendar format
  const events = useMemo(() => {
    const calendarEvents: CalendarEventItem[] = [];
    const categoryLookup = new Map(
      (categories ?? []).map((category) => [category.id, category])
    );
    const habitCategory = (categories ?? []).find(
      (category) => category.name.trim().toLowerCase() === 'habits'
    );

    // Add scheduled tasks
    for (const task of tasks) {
      if (task.scheduledTask) {
        const categoryFromId = task.categoryId
          ? categoryLookup.get(task.categoryId)
          : undefined;
        const categoryColor = task.category?.color ?? categoryFromId?.color;
        const start = normalizeCalendarDate(task.scheduledTask.startDateTime);
        const end = normalizeCalendarDate(task.scheduledTask.endDateTime);
        calendarEvents.push({
          id: `task-${task.id}`,
          title: task.title,
          start,
          end,
          layoutEnd: toExclusiveLayoutEnd(start, end),
          isTask: true,
          taskId: task.id,
          description: task.description ?? undefined,
          overflowed: task.scheduledTask.overflowedDeadline,
          categoryColor,
          sourceType: 'task',
          sourceId: task.id,
          isCompleted: task.status === 'completed',
        });
      }
    }

    // Add unscheduled tasks with due dates to all-day section
    for (const task of tasks) {
      if (!task.scheduledTask && task.dueDate && task.status !== 'completed') {
        const categoryFromId = task.categoryId
          ? categoryLookup.get(task.categoryId)
          : undefined;
        const categoryColor = task.category?.color ?? categoryFromId?.color;

        // Due date task appears as all-day item on the day it's due
        // Use exclusive end convention: end time is next day at midnight (react-big-calendar standard)
        const dueDate = normalizeCalendarDate(task.dueDate);
        const dueDateEnd = new Date(dueDate);
        dueDateEnd.setDate(dueDateEnd.getDate() + 1); // Exclusive end: next day at midnight

        calendarEvents.push({
          id: `due-task-${task.id}`,
          title: `📋 ${task.title}`, // Add icon to distinguish from all-day events
          start: dueDate,
          end: dueDateEnd,
          layoutEnd: dueDateEnd,
          allDay: true, // Show in all-day section
          isDueTask: true, // Mark as unscheduled due task
          dueDate: dueDate,
          priority: task.priority,
          isTask: true,
          taskId: task.id,
          description: task.description ?? undefined,
          categoryColor,
          sourceType: 'task',
          sourceId: task.id,
          isCompleted: false,
        });
      }
    }

    // Add external events with categorization and completion tracking
    for (const event of externalEvents) {
      const categorization = event.id ? eventCategorizations?.[event.id] : undefined;
      const categoryFromId = categorization?.categoryId
        ? categoryLookup.get(categorization.categoryId)
        : undefined;
      const isHabitEvent = event.sourceType === 'habit';
      const habitColor = habitCategory?.color;
      const start = normalizeCalendarDate(event.start);
      const end = normalizeCalendarDate(event.end);

      calendarEvents.push({
        id: `event-${event.id || Math.random().toString()}`,
        title: event.summary,
        start,
        end,
        layoutEnd: toExclusiveLayoutEnd(start, end),
        allDay: event.allDay ?? false, // Mark all-day events for special rendering (normalize to boolean)
        isTask: event.sourceType === 'task', // Preserve task status from merged events
        isHabit: isHabitEvent,
        scheduledHabitId: isHabitEvent ? event.sourceId : undefined,
        eventId: event.id ?? undefined,
        description: event.description,
        attendees: event.attendees,
        calendarColor: event.calendarColor,
        categoryColor: isHabitEvent
          ? habitColor
          : resolveEventDisplayColor(
              event,
              categorization
                ? {
                    ...categorization,
                    categoryColor: categoryFromId?.color ?? categorization.categoryColor,
                  }
                : null
            ),
        sourceType: event.sourceType,
        sourceId: event.sourceId,
        isCompleted: event.isCompleted,
      });
    }

    return calendarEvents;
  }, [tasks, externalEvents, eventCategorizations, categories]);

  const eventStyleGetter = useCallback((event: CalendarEventItem) => {
    // Due tasks in all-day section get priority-based colors
    if (event.isDueTask) {
      // Priority-based colors: P1=Red, P2=Amber, P3=Blue
      const priorityColors: Record<number, string> = {
        1: '#EF4444', // Red-500 for high priority
        2: '#F59E0B', // Amber-500 for medium priority
        3: '#3B82F6', // Blue-500 for low priority
      };
      const priority = event.priority ?? 2;
      const accentColor = priorityColors[priority] ?? priorityColors[2]; // Fallback to medium priority
      const backgroundColor = `${accentColor}F2`; // 95% opacity

      return {
        className: 'due-task-event',
        style: {
          backgroundColor,
          borderRadius: '4px',
          borderLeft: `4px solid ${accentColor}`,
          border: `1px solid ${accentColor}60`,
          color: '#1e293b',
          fontWeight: '500',
          fontSize: '0.875rem',
        },
      };
    }

    if (event.isTask || event.sourceType === 'task') {
      // Brand Primary Teal for default tasks, or use category color
      const accentColor = event.categoryColor || '#0BAF9A'; // Brand Primary Teal
      // Completed: translucent (20%), Incomplete: solid (95%)
      const backgroundColor = event.isCompleted ? `${accentColor}20` : `${accentColor}F2`;

      // Overflowed tasks get Coral accent
      const leftBorderColor = event.overflowed ? '#F97316' : accentColor;

      return {
        className: event.overflowed ? 'task-event overflowed' : 'task-event',
        style: {
          backgroundColor,
          borderRadius: '2px',
          borderLeft: `5px solid ${leftBorderColor}`,
          border: `1px solid ${accentColor}30`,
          color: event.isCompleted ? '#64748b' : '#1e293b', // Lighter text for completed
          fontWeight: '400',
          textDecoration: event.isCompleted ? 'line-through' : 'none',
        },
      };
    }

    if (event.isHabit || event.sourceType === 'habit') {
      const accentColor = event.categoryColor || '#6366F1'; // Indigo-500 fallback
      // Completed: translucent (20%), Incomplete: solid (95%)
      const backgroundColor = event.isCompleted ? `${accentColor}20` : `${accentColor}F2`;

      return {
        className: 'habit-event',
        style: {
          backgroundColor,
          borderRadius: '2px',
          borderLeft: `5px solid ${accentColor}`,
          border: `1px solid ${accentColor}30`,
          color: event.isCompleted ? '#64748b' : '#1e293b', // Lighter text for completed
          fontWeight: '400',
          textDecoration: event.isCompleted ? 'line-through' : 'none',
        },
      };
    }

    // categoryColor already reflects calendar vs manual category priority
    const accentColor = event.categoryColor ?? event.calendarColor ?? '#64748B';
    // Completed: translucent (20%), Incomplete: solid (95%)
    const backgroundColor = event.isCompleted ? `${accentColor}20` : `${accentColor}F2`;

    return {
      className: 'external-event',
      style: {
        backgroundColor,
        borderRadius: '2px',
        borderLeft: `5px solid ${accentColor}`,
        border: `1px solid ${accentColor}30`,
        color: event.isCompleted ? '#64748b' : '#1e293b', // Lighter text for completed
        fontWeight: '400',
        textDecoration: event.isCompleted ? 'line-through' : 'none',
      },
    };
  }, []);

  const handleNavigate = useCallback((newDate: Date) => {
    setDate(newDate);
  }, []);

  const handleViewChange = useCallback((newView: View) => {
    setView(newView);
  }, []);

  const handleEventClick = useCallback(
    (event: CalendarEventItem, e: React.SyntheticEvent) => {
      // Get click position for popover placement
      const mouseEvent = e as unknown as MouseEvent;
      setPopoverPosition({ x: mouseEvent.clientX, y: mouseEvent.clientY });

      // Find the full task details if this is a task event
      const taskId = event.taskId;
      const task = taskId ? tasks.find((t) => t.id === taskId) : undefined;
      const categoryFromId = task?.categoryId
        ? categories?.find((category) => category.id === task.categoryId)
        : undefined;
      const habitCategory = categories?.find(
        (category) => category.name.trim().toLowerCase() === 'habits'
      );

      // For external events, get categorization
      const eventIdForCategorization = event.id.replace('event-', '');
      const categorization = !event.isTask ? eventCategorizations?.[eventIdForCategorization] : undefined;
      const categorizationCategory = categorization?.categoryId
        ? categories?.find((category) => category.id === categorization.categoryId)
        : undefined;

      // Check if this is a habit event
      const isHabit = event.sourceType === 'habit';
      const scheduledHabitId = isHabit ? event.sourceId : undefined;
      const habitCompletion = isHabit && event.isCompleted ? { status: 'completed' as const } : undefined;

      // For habit events, look up streak information
      let habitStreak: { current: number; atRisk: boolean } | undefined;
      if (isHabit && scheduledHabitId && scheduledHabitInstances && habitStreakMap) {
        // Find the habitId from scheduledHabitId
        const habitInstance = scheduledHabitInstances.find(
          inst => inst.scheduledHabitId === scheduledHabitId
        );
        if (habitInstance) {
          habitStreak = habitStreakMap.get(habitInstance.habitId);
        }
      }

      setSelectedEventForPopover({
        id: taskId || eventIdForCategorization,
        title: event.title,
        start: event.start,
        end: event.end,
        description: event.isTask ? task?.description ?? undefined : event.description ?? undefined,
        isTask: event.isTask,
        task,
        isHabit,
        scheduledHabitId,
        habitCompletion,
        habitStreak,
        categoryColor: event.categoryColor,
        categoryName: event.isHabit
          ? habitCategory?.name
          : event.isTask
          ? (task?.category?.name ?? categoryFromId?.name)
          : (categorizationCategory?.name ?? categorization?.categoryName),
        categoryId: event.isHabit
          ? habitCategory?.id
          : event.isTask
          ? (task?.category?.id ?? categoryFromId?.id)
          : (categorizationCategory?.id ?? categorization?.categoryId),
        overflowed: event.overflowed,
        attendees: event.attendees,
      });
      setPopoverOpen(true);

      // Call original onSelectEvent if provided
      if (onSelectEvent) {
        onSelectEvent(event);
      }
    },
    [tasks, eventCategorizations, onSelectEvent, scheduledHabitInstances, habitStreakMap, categories]
  );

  const TimeSlotWrapper: ComponentType<any> = (slotProps: any) => {
    const start = slotProps.value as Date;
    const slotPreview =
      dropPreview && dropPreview.start.getTime() === start.getTime()
        ? dropPreview
        : null;

    return (
      <DroppableSlot start={start} dropPreview={slotPreview}>
        {slotProps.children}
      </DroppableSlot>
    );
  };

  // DateCellWrapper for all-day section droppable zones
  const DateCellWrapper: ComponentType<any> = (cellProps: any) => {
    const date = cellProps.value as Date;
    // When dropping into all-day section, schedule at 9:00 AM on that date
    const defaultDropTime = new Date(date);
    defaultDropTime.setHours(9, 0, 0, 0);

    const cellPreview =
      dropPreview && dropPreview.start.getTime() === defaultDropTime.getTime()
        ? dropPreview
        : null;

    return (
      <DroppableSlot start={defaultDropTime} dropPreview={cellPreview}>
        {cellProps.children}
      </DroppableSlot>
    );
  };

  // EventWrapper makes the background area of all-day cells droppable
  const EventWrapper: ComponentType<any> = (wrapperProps: any) => {
    // Only wrap all-day events
    const event = wrapperProps.event as CalendarEventItem | undefined;
    if (!event?.allDay) {
      return <>{wrapperProps.children}</>;
    }

    const date = event.start;
    const defaultDropTime = new Date(date);
    defaultDropTime.setHours(9, 0, 0, 0);

    return (
      <div className="relative">
        {wrapperProps.children}
      </div>
    );
  };

  // AllDayOverlay: Adds invisible droppable zones over all-day section
  const AllDayDroppableOverlay = () => {
    // Get the current week's dates from selectedDate
    const startOfWeek = DateTime.fromJSDate(selectedDate || new Date()).startOf('week');
    const weekDays = Array.from({ length: 7 }, (_, i) => startOfWeek.plus({ days: i }).toJSDate());

    return (
      <div className="absolute top-0 left-0 right-0 pointer-events-none z-10" style={{ height: '60px' }}>
        <div className="flex h-full">
          {weekDays.map((date, idx) => {
            const defaultDropTime = new Date(date);
            defaultDropTime.setHours(9, 0, 0, 0);

            const { setNodeRef } = useDroppable({
              id: `allday-${date.toISOString()}`,
              data: { slotStart: defaultDropTime },
            });

            const cellPreview =
              dropPreview && dropPreview.start.getTime() === defaultDropTime.getTime()
                ? dropPreview
                : null;

            return (
              <div
                key={idx}
                ref={setNodeRef}
                className={`flex-1 pointer-events-auto ${cellPreview ? 'bg-primary-50/50 ring-2 ring-primary-200' : 'hover:bg-slate-50/30'}`}
                style={{ transition: 'background-color 0.15s' }}
              />
            );
          })}
        </div>
      </div>
    );
  };

  return (
    <div className="h-full bg-white p-1 md:p-3 relative w-full" style={{ display: 'flex', flexDirection: 'column', maxWidth: '100vw', overflow: 'hidden' }}>
      {isRescheduling && (
        <div className="absolute top-2 right-2 md:top-4 md:right-4 bg-primary-600 text-white px-3 py-1.5 md:px-4 md:py-2 rounded-lg shadow-lg z-10 text-sm">
          Rescheduling...
        </div>
      )}

      <div className="w-full" style={{ flex: '1 1 0%', minHeight: 0, overflow: 'hidden', position: 'relative' }}>
        <AllDayDroppableOverlay />
        <Calendar
          localizer={localizer}
          events={events}
          startAccessor="start"
          endAccessor={(event) => (event as CalendarEventItem).layoutEnd ?? (event as CalendarEventItem).end}
          allDayAccessor={(event) => (event as CalendarEventItem).allDay ?? false}
          view={view}
          date={date}
          onNavigate={handleNavigate}
          onView={handleViewChange}
          views={['week', 'day', 'month']}
          dayLayoutAlgorithm="no-overlap"
          selectable={false}
          onSelectSlot={onSelectSlot}
          onSelectEvent={handleEventClick}
          eventPropGetter={eventStyleGetter}
          min={new Date(0, 0, 0, 6, 0, 0)} // 6 AM
          max={new Date(0, 0, 0, 23, 59, 59)} // End of day
          step={15}
          timeslots={4}
          scrollToTime={new Date(0, 0, 0, 8, 0, 0)}
          style={{ height: '100%' }}
          formats={{
            timeGutterFormat: 'h a',
            eventTimeRangeFormat: ({ start, end }: { start: Date; end: Date }) => {
              // Add 1 minute to end time for display (backend uses :59 to avoid overlaps)
              const displayEnd = new Date(end.getTime() + 60000);
              const startTime = DateTime.fromJSDate(start).toFormat('h:mm a');
              const endTime = DateTime.fromJSDate(displayEnd).toFormat('h:mm a');
              return `${startTime} – ${endTime}`;
            },
          }}
          components={{
            event: (props) => (
              <DraggableEvent
                event={props.event as CalendarEventItem}
                prefersReducedMotion={prefersReducedMotion || isDraggingActive}
                onResize={onResizeEvent}
                onCompleteTask={onCompleteTask}
                onCompleteHabit={onCompleteHabit}
              />
            ),
            timeSlotWrapper: TimeSlotWrapper,
            dateCellWrapper: DateCellWrapper,
            eventWrapper: EventWrapper,
          }}
        />
      </div>

      {/* Event Detail Popover */}
      <EventDetailPopover
        isOpen={popoverOpen}
        onClose={() => setPopoverOpen(false)}
        event={selectedEventForPopover}
        position={popoverPosition}
        categories={categories}
        onComplete={onCompleteTask}
        onEdit={onEditTask}
        onUnschedule={onUnscheduleTask}
        onDelete={onDeleteTask}
        onCategoryChange={onCategoryChange}
        onHabitComplete={onCompleteHabit}
        onHabitUndo={onUndoHabit}
        onHabitSkip={onSkipHabit}
        onHabitReschedule={onHabitReschedule}
        onTaskReschedule={onRescheduleTask}
        onTasksRefresh={onTasksRefresh}
      />
    </div>
  );
}

function DroppableSlot({
  start,
  dropPreview,
  children,
}: {
  start: Date;
  dropPreview?: CalendarDropPreview | null;
  children: React.ReactNode;
}) {
  const { setNodeRef } = useDroppable({
    id: `slot-${start.toISOString()}`,
    data: { slotStart: start },
  });

  const previewDurationMinutes = dropPreview
    ? Math.max(15, Math.round((dropPreview.end.getTime() - dropPreview.start.getTime()) / 60000))
    : 15;
  const previewSlotHeight = `${Math.max(1, previewDurationMinutes / 15) * 100}%`;
  const previewColor = dropPreview?.color ?? (dropPreview?.kind === 'habit' ? '#6366F1' : '#0BAF9A');
  const previewTime = dropPreview ? formatDropPreviewTime(dropPreview.start, dropPreview.end) : '';

  return (
    <div
      ref={setNodeRef}
      className={`${dropPreview ? 'bg-primary-50/70 ring-2 ring-primary-200 rounded-sm' : ''} transition-colors relative h-full`}
    >
      {children}
      {dropPreview && (
        <div className="pointer-events-none absolute inset-0 border border-dashed border-primary-300 rounded-sm" />
      )}
      {dropPreview && (
        <div
          className="pointer-events-none absolute left-1 right-1 top-0 z-30 overflow-hidden rounded-md border-2 bg-white/95 px-2 py-1.5 text-left shadow-lg"
          style={{
            height: previewSlotHeight,
            minHeight: 34,
            borderColor: previewColor,
            boxShadow: `0 10px 24px -14px ${previewColor}`,
          }}
        >
          <div className="truncate text-[11px] font-semibold leading-tight text-slate-900">
            {dropPreview.title}
          </div>
          <div className="mt-0.5 text-[10px] font-medium leading-tight text-slate-600">
            {previewTime}
          </div>
        </div>
      )}
    </div>
  );
}

function DraggableEvent({
  event,
  prefersReducedMotion,
  onResize,
  onHover,
  onHoverEnd,
  onCompleteTask,
  onCompleteHabit,
}: {
  event: CalendarEventItem;
  prefersReducedMotion: boolean;
  onResize?: (taskId: string, start: Date, end: Date) => Promise<void>;
  onHover?: (event: CalendarEventItem, anchor: HTMLElement | null) => void;
  onHoverEnd?: () => void;
  onCompleteTask?: (taskId: string) => Promise<void>;
  onCompleteHabit?: (scheduledHabitId: string, actualDurationMinutes?: number) => Promise<void>;
}) {
  const [isResizing, setIsResizing] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const [isCompleting, setIsCompleting] = useState(false);
  const [localCompleted, setLocalCompleted] = useState(Boolean(event.isCompleted));
  const [resizePreviewEnd, setResizePreviewEnd] = useState<Date | null>(null);
  const [isNarrow, setIsNarrow] = useState(false);
  const resizeStartY = useRef<number>(0);
  const initialEnd = useRef<Date>(event.end);
  const initialDurationMinutes = useRef<number>(15);
  const pixelsPerMinute = useRef<number>(2);
  const eventRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    setLocalCompleted(Boolean(event.isCompleted));
  }, [event.isCompleted]);

  // Detect narrow events (overlapping/stacked) and apply compact mode
  useEffect(() => {
    if (!eventRef.current) return;

    const checkWidth = () => {
      if (eventRef.current) {
        const width = eventRef.current.getBoundingClientRect().width;
        setIsNarrow(width < 100); // Narrow if less than 100px (reduced from 150px to show drag handles more often)
      }
    };

    checkWidth();

    // Recheck on window resize
    window.addEventListener('resize', checkWidth);
    return () => window.removeEventListener('resize', checkWidth);
  }, []);

  // Disable drag for: non-task/non-habit events, all-day events (except due tasks), and while resizing
  // All-day events should not be draggable as converting them to timed events would break them
  // Exception: Due tasks (isDueTask) in all-day section ARE draggable for scheduling
  const isDragDisabled = (!event.isTask && !event.isHabit) || isResizing || (event.allDay && !event.isDueTask);

  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: event.id,
    data: {
      task: event.isTask
        ? {
            id: event.taskId,
            durationMinutes: (event.end.getTime() - event.start.getTime()) / 60000,
          }
        : null,
      calendarEvent: {
        title: event.title,
        sourceType: event.sourceType,
        taskId: event.taskId,
        scheduledHabitId: event.scheduledHabitId,
        start: event.start,
        end: event.end,
        categoryColor: event.categoryColor,
      },
    },
    disabled: isDragDisabled,
  });

  const handleResizeStart = useCallback((e: React.MouseEvent) => {
    if (!event.isTask || !onResize) return;
    e.stopPropagation();
    e.preventDefault();
    setIsResizing(true);
    resizeStartY.current = e.clientY;
    initialEnd.current = event.end;
    initialDurationMinutes.current = Math.max(
      15,
      Math.round((event.end.getTime() - event.start.getTime()) / 60000)
    );
    pixelsPerMinute.current = Math.max(
      0.1,
      (eventRef.current?.getBoundingClientRect().height ?? initialDurationMinutes.current * 2) /
        initialDurationMinutes.current
    );

    const previousCursor = document.body.style.cursor;
    const previousUserSelect = document.body.style.userSelect;
    document.body.style.cursor = 'ns-resize';
    document.body.style.userSelect = 'none';

    const calculateEnd = (clientY: number) => {
      const deltaY = clientY - resizeStartY.current;
      const newDuration = snapResizeDuration({
        originalDurationMinutes: initialDurationMinutes.current,
        deltaY,
        pixelsPerMinute: pixelsPerMinute.current,
      });

      return new Date(event.start.getTime() + newDuration * 60000);
    };

    const handleMouseMove = (moveEvent: MouseEvent) => {
      setResizePreviewEnd(calculateEnd(moveEvent.clientY));
    };

    const handleMouseUp = async (upEvent: MouseEvent) => {
      const newEnd = calculateEnd(upEvent.clientY);

      if (event.taskId && newEnd.getTime() !== initialEnd.current.getTime()) {
        try {
          await onResize(event.taskId, event.start, newEnd);
        } catch (error) {
          console.error('Failed to resize event:', error);
        }
      }

      setIsResizing(false);
      setResizePreviewEnd(null);
      document.body.style.cursor = previousCursor;
      document.body.style.userSelect = previousUserSelect;
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  }, [event, onResize]);

  const originalDuration = Math.max(15, (event.end.getTime() - event.start.getTime()) / (1000 * 60));
  const previewDuration = resizePreviewEnd
    ? Math.max(15, (resizePreviewEnd.getTime() - event.start.getTime()) / (1000 * 60))
    : originalDuration;
  const canDrag = event.isTask || event.isHabit;

  const style: React.CSSProperties = {
    opacity: isDragging ? 0 : 1, // Completely hide original event during drag - only show DragOverlay
    boxShadow: isResizing ? '0 12px 28px -14px rgba(15, 23, 42, 0.45)' : undefined,
    position: 'relative',
    height: resizePreviewEnd ? `${(previewDuration / originalDuration) * 100}%` : '100%',
    minHeight: 24,
    zIndex: isDragging || isResizing ? 20 : undefined,
    cursor: !canDrag ? 'default' : isResizing ? 'ns-resize' : isDragging ? 'grabbing' : isNarrow && canDrag ? 'grab' : 'grab',
    // Thinner left border for narrow events to save space
    borderLeftWidth: isNarrow ? '3px' : undefined,
  };

  const motionProps =
    prefersReducedMotion || isDragging || isResizing
      ? {}
      : {
          whileHover: { scale: localCompleted ? 1 : 1.01 },
          whileTap: { scale: 0.98 },
          animate: {
            opacity: localCompleted ? 0.72 : 1,
            scale: isCompleting ? 0.97 : 1,
          },
          transition: { duration: 0.2, ease: 'easeOut' },
        };

  // Format end time for resize preview (add 1 minute for display)
  const visibleEnd = resizePreviewEnd ?? event.end;
  const displayEnd = new Date(visibleEnd.getTime() + 60000);
  const endTime = displayEnd.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });

  const duration = previewDuration;
  const isShortEvent = duration <= 30;
  const isVeryShortEvent = duration <= 15;

  const setRefs = useCallback(
    (node: HTMLDivElement | null) => {
      eventRef.current = node;
      setNodeRef(node);
      // Check width immediately when ref is set
      if (node) {
        const width = node.getBoundingClientRect().width;
        setIsNarrow(width < 100); // Match the threshold in useEffect
      }
    },
    [setNodeRef]
  );

  const titleClampClass = isVeryShortEvent ? 'line-clamp-1' : isShortEvent ? 'line-clamp-2' : 'line-clamp-3';
  const titleSizeClass = isVeryShortEvent ? 'text-[11px]' : isNarrow ? 'text-[10px]' : 'text-xs';

  const handleCheckboxClick = useCallback(async (e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent opening popover
    e.preventDefault();

    if (localCompleted || isCompleting) {
      return;
    }

    setIsCompleting(true);
    setLocalCompleted(true);

    try {
      if (event.sourceType === 'task' && event.taskId && onCompleteTask) {
        await onCompleteTask(event.taskId);
      } else if (event.sourceType === 'habit' && event.scheduledHabitId && onCompleteHabit) {
        const actualDurationMinutes = Math.round((event.end.getTime() - event.start.getTime()) / 60000);
        await onCompleteHabit(event.scheduledHabitId, actualDurationMinutes);
      } else {
        setLocalCompleted(false);
        // External event - log for analytics tracking
        console.log('External event completed for analytics:', {
          eventId: event.eventId,
          title: event.title,
          start: event.start,
          end: event.end,
          sourceType: event.sourceType,
        });
        // TODO: Add proper external event completion tracking API call
      }
    } catch (error) {
      setLocalCompleted(false);
      console.error('Failed to complete event:', error);
    } finally {
      setIsCompleting(false);
    }
  }, [event, localCompleted, isCompleting, onCompleteTask, onCompleteHabit]);

  const showCheckbox = !isNarrow && (isHovered || localCompleted);

  const textColorClass = localCompleted ? 'text-slate-600' : 'text-white';
  const dragHandleColorClass = localCompleted ? 'text-slate-600 hover:text-slate-800' : 'text-white/90 hover:text-white';

  // Compact mode for narrow/overlapping events
  const showDragHandle = canDrag && !isNarrow; // Hide drag handle when narrow
  const paddingClass = isNarrow
    ? 'px-1 py-1' // Minimal padding for narrow events
    : canDrag
      ? 'pl-1 pr-8 py-1.5' // Normal padding with space for drag handle and checkbox
      : 'px-2 pr-8 py-1.5'; // Normal padding for non-draggable events

  return (
    <motion.div
      ref={setRefs}
      style={style}
      {...motionProps}
      onMouseEnter={() => {
        setIsHovered(true);
        if (!isDragging && !isResizing) {
          onHover?.(event, eventRef.current);
        }
      }}
      onMouseLeave={() => {
        setIsHovered(false);
        onHoverEnd?.();
      }}
      // When narrow, make entire event draggable
      {...(isNarrow && canDrag ? { ...listeners, ...attributes } : {})}
      className={`overflow-hidden h-full flex flex-col justify-start gap-0.5 ${paddingClass} ${isResizing ? 'ring-2 ring-white/80' : ''} ${isNarrow && canDrag ? 'cursor-grab active:cursor-grabbing' : ''}`}
    >
      {showDragHandle && (
        <button
          type="button"
          className={`absolute left-0 top-0 z-20 flex h-full w-7 cursor-grab items-start justify-center border-0 bg-transparent pt-1 ${dragHandleColorClass} active:cursor-grabbing`}
          aria-label="Drag to reschedule"
          {...listeners}
          {...attributes}
          onClick={(e) => e.stopPropagation()}
        >
          <span className="text-[10px] leading-none opacity-90 select-none" aria-hidden>
            ⋮⋮
          </span>
        </button>
      )}
      <div className={showDragHandle ? 'min-w-0 pl-6' : 'min-w-0'}>
        <div
          className={`font-medium leading-snug ${textColorClass} ${titleClampClass} ${titleSizeClass}`}
          title={event.title} // Show full title on hover for truncated text
        >
          {event.title}
        </div>
      </div>
      {event.isTask && onResize && !isDragging && (isHovered || isResizing) && (
        <div
          className="absolute bottom-0 left-0 right-0 h-3 bg-white/25 hover:bg-white/45 cursor-ns-resize flex items-center justify-center"
          onMouseDown={handleResizeStart}
          style={{ touchAction: 'none' }}
        >
          <div className="w-8 h-0.5 bg-white/80 rounded-full"></div>
        </div>
      )}
      {isResizing && resizePreviewEnd && (
        <div className="pointer-events-none absolute bottom-3 right-1 rounded bg-white/95 px-1.5 py-0.5 text-[10px] font-semibold text-slate-800 shadow-sm">
          Ends {endTime}
        </div>
      )}
      {showCheckbox && (
        <button
          type="button"
          onClick={handleCheckboxClick}
          className="absolute right-1 top-1 z-20 flex h-5 w-5 cursor-pointer items-center justify-center rounded border-0 bg-white/90 hover:bg-white shadow-sm transition-all"
          aria-label={localCompleted ? 'Completed' : 'Mark as complete'}
          disabled={isCompleting}
        >
          {localCompleted ? (
            <motion.svg
              className="w-4 h-4 text-green-600"
              fill="currentColor"
              viewBox="0 0 20 20"
              initial={prefersReducedMotion ? false : { scale: 0.5, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ duration: 0.18, ease: 'easeOut' }}
            >
              <path
                fillRule="evenodd"
                d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                clipRule="evenodd"
              />
            </motion.svg>
          ) : (
            <div className="w-3 h-3 rounded-sm border-2 border-slate-400 hover:border-slate-600 transition-colors"></div>
          )}
        </button>
      )}
    </motion.div>
  );
}

// NOTE: EventHoverCard component removed - unused as of Sprint 19
// If hover cards are needed in future, consider using EventDetailPopover instead
