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
  isTask: boolean;
  taskId?: string;
  description?: string;
  overflowed?: boolean;
  categoryColor?: string;
  isHabit?: boolean;
  scheduledHabitId?: string;
  eventId?: string;
  attendees?: { email: string }[];
  // Completion tracking
  sourceType?: 'task' | 'habit' | 'external';
  sourceId?: string; // task ID or scheduledHabit ID
  isCompleted?: boolean;
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
  const [view, setView] = useState<View>(Views.WEEK);
  const [date, setDate] = useState(selectedDate || new Date());

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
        isTask: event.sourceType === 'task', // Preserve task status from merged events
        isHabit: isHabitEvent,
        scheduledHabitId: isHabitEvent ? event.sourceId : undefined,
        eventId: event.id ?? undefined,
        description: event.description,
        attendees: event.attendees,
        categoryColor: isHabitEvent
          ? habitColor
          : (categoryFromId?.color ?? categorization?.categoryColor),
        sourceType: event.sourceType,
        sourceId: event.sourceId,
        isCompleted: event.isCompleted,
      });
    }

    return calendarEvents;
  }, [tasks, externalEvents, eventCategorizations, categories]);

  const eventStyleGetter = useCallback((event: CalendarEventItem) => {
    // Base opacity: reduce for completed events
    const baseOpacity = event.isCompleted ? 0.5 : 1;

    if (event.isTask || event.sourceType === 'task') {
      // Brand Primary Teal for default tasks, or use category color
      let backgroundColor = event.categoryColor || '#0BAF9A'; // Brand Primary Teal
      let border = 'none';

      // Overflowed tasks get Coral border
      if (event.overflowed) {
        border = '2px solid #F97316'; // Coral border
      }

      return {
        className: event.overflowed ? 'task-event overflowed' : 'task-event',
        style: {
          backgroundColor,
          borderRadius: '4px',
          border,
          color: 'white',
          fontWeight: '500',
          opacity: baseOpacity,
          textDecoration: event.isCompleted ? 'line-through' : 'none',
        },
      };
    }

    if (event.isHabit || event.sourceType === 'habit') {
      const habitColor = event.categoryColor || '#6366F1'; // Indigo-500 fallback
      return {
        className: 'habit-event',
        style: {
          backgroundColor: habitColor,
          borderRadius: '4px',
          border: 'none',
          color: 'white',
          fontWeight: '500',
          opacity: baseOpacity,
          textDecoration: event.isCompleted ? 'line-through' : 'none',
        },
      };
    }

    // External events: Use category color if available, otherwise gray
    const backgroundColor = event.categoryColor || '#64748B'; // Use category color or fallback to gray
    const eventOpacity = event.categoryColor ? 0.95 : 0.75;

    return {
      className: 'external-event',
      style: {
        backgroundColor,
        borderRadius: '4px',
        border: `1px solid ${event.categoryColor ? event.categoryColor : '#475569'}`,
        color: 'white',
        fontWeight: '500',
        opacity: baseOpacity * eventOpacity, // Combine completion and categorization opacity
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

  return (
    <div className="h-full bg-white p-3 relative" style={{ display: 'flex', flexDirection: 'column' }}>
      {isRescheduling && (
        <div className="absolute top-4 right-4 bg-primary-600 text-white px-4 py-2 rounded-lg shadow-lg z-10">
          Rescheduling...
        </div>
      )}

      <div style={{ flex: '1 1 0%', minHeight: 0, overflow: 'hidden' }}>
        <Calendar
          localizer={localizer}
          events={events}
          startAccessor="start"
          endAccessor={(event) => (event as CalendarEventItem).layoutEnd ?? (event as CalendarEventItem).end}
          view={view}
          date={date}
          onNavigate={handleNavigate}
          onView={handleViewChange}
          views={['week', 'day', 'month']}
          dayLayoutAlgorithm="no-overlap"
          selectable
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
          }}
          components={{
            event: (props) => (
              <DraggableEvent
                event={props.event as CalendarEventItem}
                prefersReducedMotion={prefersReducedMotion}
                onResize={onResizeEvent}
              />
            ),
            timeSlotWrapper: TimeSlotWrapper,
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
  const { setNodeRef, isOver } = useDroppable({
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
      className={`${isOver || dropPreview ? 'bg-primary-50/70 ring-2 ring-primary-200 rounded-sm' : ''} transition-colors relative h-full`}
    >
      {children}
      {(isOver || dropPreview) && (
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
}: {
  event: CalendarEventItem;
  prefersReducedMotion: boolean;
  onResize?: (taskId: string, start: Date, end: Date) => Promise<void>;
  onHover?: (event: CalendarEventItem, anchor: HTMLElement | null) => void;
  onHoverEnd?: () => void;
}) {
  const [isResizing, setIsResizing] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const [resizePreviewEnd, setResizePreviewEnd] = useState<Date | null>(null);
  const resizeStartY = useRef<number>(0);
  const initialEnd = useRef<Date>(event.end);
  const initialDurationMinutes = useRef<number>(15);
  const pixelsPerMinute = useRef<number>(2);
  const eventRef = useRef<HTMLDivElement | null>(null);

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
    disabled: (!event.isTask && !event.isHabit) || isResizing,
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
    opacity: isDragging ? 0.35 : 1,
    boxShadow: isResizing ? '0 12px 28px -14px rgba(15, 23, 42, 0.45)' : undefined,
    position: 'relative',
    height: resizePreviewEnd ? `${(previewDuration / originalDuration) * 100}%` : '100%',
    minHeight: 24,
    zIndex: isDragging || isResizing ? 20 : undefined,
    cursor: !canDrag ? 'default' : isResizing ? 'ns-resize' : isDragging ? 'grabbing' : 'grab',
  };

  const motionProps =
    prefersReducedMotion || isDragging
      ? {}
      : {
          whileHover: { scale: 1.01 },
          whileTap: { scale: 0.98 },
        };

  // Format time for display
  const startTime = new Date(event.start).toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
  const visibleEnd = resizePreviewEnd ?? event.end;
  const endTime = new Date(visibleEnd).toLocaleTimeString('en-US', {
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
    },
    [setNodeRef]
  );

  const titleClampClass = isVeryShortEvent ? 'line-clamp-1' : isShortEvent ? 'line-clamp-2' : 'line-clamp-3';
  const titleSizeClass = isVeryShortEvent ? 'text-[11px]' : 'text-xs';

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
      className={`overflow-hidden h-full flex flex-col justify-start py-1.5 gap-0.5 ${
        canDrag ? 'pl-1 pr-2' : 'px-2'
      } ${isResizing ? 'ring-2 ring-white/80' : ''}`}
    >
      {canDrag && (
        <button
          type="button"
          className="absolute left-0 top-0 z-20 flex h-full w-7 cursor-grab items-start justify-center border-0 bg-transparent pt-1 text-white/90 hover:text-white active:cursor-grabbing"
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
      <div className={canDrag ? 'min-w-0 pl-6' : 'min-w-0'}>
        <div className={`font-semibold leading-snug ${titleClampClass} ${titleSizeClass}`}>
          {event.title}
        </div>
        {!isShortEvent && (
          <div className="text-[10px] opacity-90 leading-tight">
            {startTime} - {endTime}
          </div>
        )}
      </div>
      {event.isTask && onResize && (isHovered || isResizing) && (
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
    </motion.div>
  );
}

// NOTE: EventHoverCard component removed - unused as of Sprint 19
// If hover cards are needed in future, consider using EventDetailPopover instead
