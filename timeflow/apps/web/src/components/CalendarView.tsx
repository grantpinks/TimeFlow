'use client';

import { useMemo, useState, useCallback, useRef, useEffect } from 'react';
import { Calendar, luxonLocalizer, Views } from 'react-big-calendar';
import { DndContext, DragOverlay, useDroppable, useDraggable, useSensors, useSensor, PointerSensor } from '@dnd-kit/core';
import { DateTime } from 'luxon';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { createPortal } from 'react-dom';
import type { Task, CalendarEvent, CategoryTrainingExampleSnapshot } from '@timeflow/shared';
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
  selectedDate?: Date;
  onSelectSlot?: (slotInfo: { start: Date; end: Date }) => void;
  onSelectEvent?: (event: CalendarEventItem) => void;
  onRescheduleTask?: (taskId: string, start: Date, end: Date) => Promise<void>;
  onResizeEvent?: (taskId: string, start: Date, end: Date) => Promise<void>;
  onCompleteTask?: (taskId: string) => Promise<void>;
  onEditTask?: (taskId: string) => void;
  onUnscheduleTask?: (taskId: string) => Promise<void>;
  onDeleteTask?: (taskId: string) => Promise<void>;
  onCategoryChange?: (
    eventId: string,
    categoryId: string,
    training?: { useForTraining?: boolean; example?: CategoryTrainingExampleSnapshot }
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
}

export function CalendarView({
  tasks,
  externalEvents,
  eventCategorizations,
  categories,
  selectedDate,
  onSelectSlot,
  onSelectEvent,
  onRescheduleTask,
  onResizeEvent,
  onCompleteTask,
  onEditTask,
  onUnscheduleTask,
  onDeleteTask,
  onCategoryChange,
}: CalendarViewProps) {
  const [view, setView] = useState<'week' | 'day' | 'month'>(Views.WEEK);
  const [date, setDate] = useState(selectedDate || new Date());

  // Update internal date when selectedDate prop changes
  useEffect(() => {
    if (selectedDate) {
      setDate(selectedDate);
    }
  }, [selectedDate]);
  const [isRescheduling, setIsRescheduling] = useState(false);
  const [popoverOpen, setPopoverOpen] = useState(false);
  const [popoverPosition, setPopoverPosition] = useState({ x: 0, y: 0 });
  const [hoverCard, setHoverCard] = useState<{ event: CalendarEventItem; rect: DOMRect } | null>(null);
  const [selectedEventForPopover, setSelectedEventForPopover] = useState<{
    id: string;
    title: string;
    start: Date;
    end: Date;
    description?: string;
    isTask: boolean;
    task?: Task;
    categoryColor?: string;
    categoryName?: string;
    categoryId?: string;
    overflowed?: boolean;
  } | null>(null);

  const prefersReducedMotion = useReducedMotion();

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
          description: task.description,
          overflowed: task.scheduledTask.overflowedDeadline,
          categoryColor: task.category?.color,
        });
      }
    }

    // Add external events with categorization
    for (const event of externalEvents) {
      const categorization = eventCategorizations?.[event.id];

      calendarEvents.push({
        id: `event-${event.id || Math.random().toString()}`,
        title: event.summary,
        start: new Date(event.start),
        end: new Date(event.end),
        isTask: false,
        description: event.description,
        categoryColor: categorization?.categoryColor, // Use AI-assigned category color
      });
    }

    return calendarEvents;
  }, [tasks, externalEvents, eventCategorizations]);

  const eventStyleGetter = useCallback((event: CalendarEventItem) => {
    if (event.isTask) {
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
        },
      };
    }

    // External events: Use category color if available, otherwise gray
    const backgroundColor = event.categoryColor || '#64748B'; // Use category color or fallback to gray

    return {
      className: 'external-event',
      style: {
        backgroundColor,
        borderRadius: '4px',
        border: `1px solid ${event.categoryColor ? event.categoryColor : '#475569'}`,
        color: 'white',
        fontWeight: '500',
        opacity: event.categoryColor ? 0.95 : 0.75, // Higher opacity if categorized
      },
    };
  }, []);

  const handleNavigate = useCallback((newDate: Date) => {
    setDate(newDate);
  }, []);

  const handleViewChange = useCallback((newView: 'week' | 'day' | 'month') => {
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

      // For external events, get categorization
      const eventIdForCategorization = event.id.replace('event-', '');
      const categorization = !event.isTask ? eventCategorizations?.[eventIdForCategorization] : undefined;

      setHoverCard(null);
      setSelectedEventForPopover({
        id: taskId || eventIdForCategorization,
        title: event.title,
        start: event.start,
        end: event.end,
        description: event.isTask ? task?.description : event.description,
        isTask: event.isTask,
        task,
        categoryColor: event.categoryColor,
        categoryName: event.isTask ? task?.category?.name : categorization?.categoryName,
        categoryId: event.isTask ? task?.category?.id : categorization?.categoryId,
        overflowed: event.overflowed,
      });
      setPopoverOpen(true);

      // Call original onSelectEvent if provided
      if (onSelectEvent) {
        onSelectEvent(event);
      }
    },
    [tasks, eventCategorizations, onSelectEvent]
  );

  const handleEventHover = useCallback((event: CalendarEventItem, anchor: HTMLElement | null) => {
    if (!anchor) return;
    const rect = anchor.getBoundingClientRect();
    setHoverCard({ event, rect });
  }, []);

  const handleEventHoverEnd = useCallback(() => {
    setHoverCard(null);
  }, []);

  useEffect(() => {
    if (!hoverCard) return;
    const handleScroll = () => setHoverCard(null);
    const handleResize = () => setHoverCard(null);
    window.addEventListener('scroll', handleScroll, true);
    window.addEventListener('resize', handleResize);
    return () => {
      window.removeEventListener('scroll', handleScroll, true);
      window.removeEventListener('resize', handleResize);
    };
  }, [hoverCard]);

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
              onHover={handleEventHover}
              onHoverEnd={handleEventHoverEnd}
            />
          ),
          timeSlotWrapper: (slotProps) => {
            const start = slotProps.value as Date;
            return (
              <DroppableSlot start={start} durationMinutes={15}>
                {slotProps.children}
              </DroppableSlot>
            );
          },
        }}
        />
      </div>

      <AnimatePresence>
        {hoverCard && !popoverOpen && (
          <EventHoverCard
            key={hoverCard.event.id}
            event={hoverCard.event}
            anchorRect={hoverCard.rect}
            prefersReducedMotion={prefersReducedMotion}
          />
        )}
      </AnimatePresence>

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
    data: { task: event.isTask ? { id: event.taskId, durationMinutes: (event.end.getTime() - event.start.getTime()) / 60000 } : null },
    disabled: !event.isTask || isResizing,
  });

  const handleResizeStart = useCallback((e: React.MouseEvent) => {
    if (!event.isTask || !onResize) return;
    e.stopPropagation();
    e.preventDefault();
    setIsResizing(true);
    resizeStartY.current = e.clientY;
    initialEnd.current = event.end;

    const handleMouseMove = (moveEvent: MouseEvent) => {
      const deltaY = moveEvent.clientY - resizeStartY.current;
      const minutesDelta = Math.round(deltaY / 2); // Approx 2px per minute
      const newDuration = Math.max(15, Math.round((initialEnd.current.getTime() - event.start.getTime()) / 60000) + minutesDelta);
      const newEnd = new Date(event.start.getTime() + newDuration * 60000);

      // Visual feedback (would need to update event state for real-time preview)
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

function EventHoverCard({
  event,
  anchorRect,
  prefersReducedMotion,
}: {
  event: CalendarEventItem;
  anchorRect: DOMRect;
  prefersReducedMotion: boolean;
}) {
  if (typeof document === 'undefined') return null;

  const cardWidth = 280;
  const cardMaxHeight = 200;
  const offset = 12;
  const padding = 12;

  let left = anchorRect.right + offset;
  if (left + cardWidth > window.innerWidth - padding) {
    left = anchorRect.left - cardWidth - offset;
  }
  if (left < padding) {
    left = padding;
  }

  let top = anchorRect.top + 6;
  const maxTop = window.innerHeight - cardMaxHeight - padding;
  if (top > maxTop) {
    top = maxTop;
  }
  if (top < padding) {
    top = padding;
  }

  const startLabel = DateTime.fromJSDate(event.start).toFormat('h:mm a');
  const endLabel = DateTime.fromJSDate(event.end).toFormat('h:mm a');
  const dateLabel = DateTime.fromJSDate(event.start).toFormat('ccc, LLL d');
  const description = event.description?.trim();
  const accentColor = event.categoryColor || (event.isTask ? '#0BAF9A' : '#64748B');

  return createPortal(
    <motion.div
      initial={prefersReducedMotion ? { opacity: 1 } : { opacity: 0, y: 8, scale: 0.98 }}
      animate={prefersReducedMotion ? { opacity: 1 } : { opacity: 1, y: 0, scale: 1 }}
      exit={prefersReducedMotion ? { opacity: 0 } : { opacity: 0, y: 4, scale: 0.98 }}
      transition={{ duration: prefersReducedMotion ? 0 : 0.18, ease: 'easeOut' }}
      style={{ left, top, width: cardWidth, maxHeight: cardMaxHeight }}
      className="fixed z-[60] rounded-xl border border-slate-200 bg-white/95 shadow-2xl backdrop-blur-sm px-4 py-3 text-slate-900"
    >
      <div className="flex items-center gap-2 text-[11px] text-slate-600">
        <span className="inline-flex items-center gap-2">
          <span className="h-2 w-2 rounded-full" style={{ backgroundColor: accentColor }} />
          {event.isTask ? 'Task' : 'Event'}
        </span>
        <span className="text-slate-300">|</span>
        <span>{dateLabel}</span>
      </div>
      <div className="mt-2 text-sm font-semibold leading-snug line-clamp-2">{event.title}</div>
      <div className="mt-1 text-xs text-slate-600">
        {startLabel} - {endLabel}
      </div>
      <div className="mt-2 text-xs leading-relaxed text-slate-600 line-clamp-5">
        {description || 'No description provided.'}
      </div>
    </motion.div>,
    document.body
  );
}
