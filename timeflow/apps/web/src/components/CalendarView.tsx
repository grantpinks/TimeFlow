'use client';

import { useMemo, useState, useCallback, useRef, useEffect } from 'react';
import type { ComponentType } from 'react';
import { Calendar, luxonLocalizer, Views, type View } from 'react-big-calendar';
import { useDroppable, useDraggable } from '@dnd-kit/core';
import { DateTime } from 'luxon';
import { motion, useReducedMotion } from 'framer-motion';
import type { Task, CalendarEvent, CategoryTrainingExampleSnapshot, HabitSkipReason } from '@timeflow/shared';
import { EventDetailPopover } from './EventDetailPopover';
import 'react-big-calendar/lib/css/react-big-calendar.css';

// Setup luxon localizer
const localizer = luxonLocalizer(DateTime);

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
}

export interface CalendarEventItem {
  id: string;
  title: string;
  start: Date;
  end: Date;
  isTask: boolean;
  taskId?: string;
  description?: string;
  overflowed?: boolean;
  categoryColor?: string;
  isHabit?: boolean;
  scheduledHabitId?: string;
  eventId?: string;
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
        calendarEvents.push({
          id: `task-${task.id}`,
          title: task.title,
          start: new Date(task.scheduledTask.startDateTime),
          end: new Date(task.scheduledTask.endDateTime),
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

      calendarEvents.push({
        id: `event-${event.id || Math.random().toString()}`,
        title: event.summary,
        start: new Date(event.start),
        end: new Date(event.end),
        isTask: event.sourceType === 'task', // Preserve task status from merged events
        isHabit: isHabitEvent,
        scheduledHabitId: isHabitEvent ? event.sourceId : undefined,
        eventId: event.id ?? undefined,
        description: event.description,
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
      });
      setPopoverOpen(true);

      // Call original onSelectEvent if provided
      if (onSelectEvent) {
        onSelectEvent(event);
      }
    },
    [tasks, eventCategorizations, onSelectEvent, externalEvents, scheduledHabitInstances, habitStreakMap, categories]
  );

  const TimeSlotWrapper: ComponentType<any> = (slotProps: any) => {
    const start = slotProps.value as Date;
    return (
      <DroppableSlot start={start} durationMinutes={15}>
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
          endAccessor="end"
          view={view}
          date={date}
          onNavigate={handleNavigate}
          onView={handleViewChange}
          views={['week', 'day', 'month']}
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
      />
    </div>
  );
}

function DroppableSlot({
  start,
  durationMinutes,
  children,
}: {
  start: Date;
  durationMinutes: number;
  children: React.ReactNode;
}) {
  const { setNodeRef, isOver } = useDroppable({
    id: `slot-${start.toISOString()}`,
    data: { slotStart: start },
  });

  return (
    <div
      ref={setNodeRef}
      className={`${isOver ? 'bg-primary-50/70 ring-2 ring-primary-200 rounded-sm' : ''} transition-colors relative`}
      style={{ minHeight: `${durationMinutes * 1.25}px` }}
    >
      {children}
      {isOver && (
        <div className="pointer-events-none absolute inset-0 border border-dashed border-primary-300 rounded-sm"></div>
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
  const resizeStartY = useRef<number>(0);
  const initialEnd = useRef<Date>(event.end);
  const eventRef = useRef<HTMLDivElement | null>(null);

  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
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

    const handleMouseMove = () => {
      // Visual feedback placeholder (no live preview yet).
    };

    const handleMouseUp = async (upEvent: MouseEvent) => {
      const deltaY = upEvent.clientY - resizeStartY.current;
      const minutesDelta = Math.round(deltaY / 2);
      const newDuration = Math.max(15, Math.round((initialEnd.current.getTime() - event.start.getTime()) / 60000) + minutesDelta);
      const newEnd = new Date(event.start.getTime() + newDuration * 60000);

      if (event.taskId && newEnd.getTime() !== initialEnd.current.getTime()) {
        try {
          await onResize(event.taskId, event.start, newEnd);
        } catch (error) {
          console.error('Failed to resize event:', error);
        }
      }

      setIsResizing(false);
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  }, [event, onResize]);

  const style: React.CSSProperties = {
    transform: transform ? `translate3d(${transform.x}px, ${transform.y}px, 0)` : undefined,
    opacity: isDragging ? 0.85 : 1,
    boxShadow: isDragging ? '0 12px 30px -10px rgba(59,130,246,0.35)' : undefined,
    position: 'relative',
    height: '100%',
    cursor: isResizing ? 'ns-resize' : isDragging ? 'grabbing' : 'grab',
  };

  const motionProps = prefersReducedMotion
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
  const endTime = new Date(event.end).toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });

  const duration = (event.end.getTime() - event.start.getTime()) / (1000 * 60); // minutes
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
      {...listeners}
      {...attributes}
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
      className="overflow-hidden h-full flex flex-col justify-start px-2 py-1.5 gap-0.5"
    >
      <div className={`font-semibold leading-snug ${titleClampClass} ${titleSizeClass}`}>
        {event.title}
      </div>
      {!isShortEvent && (
        <div className="text-[10px] opacity-90 leading-tight">
          {startTime} - {endTime}
        </div>
      )}
      {event.isTask && onResize && (isHovered || isResizing) && (
        <div
          className="absolute bottom-0 left-0 right-0 h-1.5 bg-white/30 hover:bg-white/50 cursor-ns-resize flex items-center justify-center"
          onMouseDown={handleResizeStart}
          style={{ touchAction: 'none' }}
        >
          <div className="w-8 h-0.5 bg-white/80 rounded-full"></div>
        </div>
      )}
    </motion.div>
  );
}

// NOTE: EventHoverCard component removed - unused as of Sprint 19
// If hover cards are needed in future, consider using EventDetailPopover instead
