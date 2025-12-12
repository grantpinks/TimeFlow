'use client';

import { useMemo, useState, useCallback, useRef } from 'react';
import { Calendar, luxonLocalizer, Views } from 'react-big-calendar';
import { DndContext, DragOverlay, useDroppable, useDraggable, useSensors, useSensor, PointerSensor } from '@dnd-kit/core';
import { DateTime } from 'luxon';
import { motion, useReducedMotion } from 'framer-motion';
import type { Task, CalendarEvent } from '@timeflow/shared';
import { EventDetailPopover } from './EventDetailPopover';
import 'react-big-calendar/lib/css/react-big-calendar.css';

// Setup luxon localizer
const localizer = luxonLocalizer(DateTime);

interface CalendarViewProps {
  tasks: Task[];
  externalEvents: CalendarEvent[];
  onSelectSlot?: (slotInfo: { start: Date; end: Date }) => void;
  onSelectEvent?: (event: CalendarEventItem) => void;
  onRescheduleTask?: (taskId: string, start: Date, end: Date) => Promise<void>;
  onResizeEvent?: (taskId: string, start: Date, end: Date) => Promise<void>;
  onCompleteTask?: (taskId: string) => Promise<void>;
  onEditTask?: (taskId: string) => void;
  onUnscheduleTask?: (taskId: string) => Promise<void>;
  onDeleteTask?: (taskId: string) => Promise<void>;
}

export interface CalendarEventItem {
  id: string;
  title: string;
  start: Date;
  end: Date;
  isTask: boolean;
  taskId?: string;
  overflowed?: boolean;
  categoryColor?: string;
}

export function CalendarView({
  tasks,
  externalEvents,
  onSelectSlot,
  onSelectEvent,
  onRescheduleTask,
  onResizeEvent,
  onCompleteTask,
  onEditTask,
  onUnscheduleTask,
  onDeleteTask,
}: CalendarViewProps) {
  const [view, setView] = useState<'week' | 'day' | 'month'>(Views.WEEK);
  const [date, setDate] = useState(new Date());
  const [isRescheduling, setIsRescheduling] = useState(false);
  const [activeDragTask, setActiveDragTask] = useState<Task | null>(null);
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
    categoryColor?: string;
    categoryName?: string;
    overflowed?: boolean;
  } | null>(null);

  const prefersReducedMotion = useReducedMotion();
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 6 },
    })
  );

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
          categoryColor: task.category?.color,
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
          borderRadius: '6px',
          border,
          color: 'white',
          fontWeight: '500',
        },
      };
    }
    // External Google events: gray with better opacity
    return {
      className: 'external-event',
      style: {
        backgroundColor: '#64748b',
        borderRadius: '6px',
        border: 'none',
        color: 'white',
        opacity: 0.6,
      },
    };
  }, []);

  const handleNavigate = useCallback((newDate: Date) => {
    setDate(newDate);
  }, []);

  const handleViewChange = useCallback((newView: 'week' | 'day' | 'month') => {
    setView(newView);
  }, []);

  const handleDragStart = useCallback((active: { id: string; data?: { current?: { task: Task } } }) => {
    const task = active.data?.current?.task || tasks.find((t) => t.id === active.id.replace('task-', ''));
    if (task) {
      setActiveDragTask(task);
    }
  }, [tasks]);

  const handleDragEnd = useCallback(
    async (event: { active: { id: string }; over: { data: { current?: { slotStart?: Date } } } | null }) => {
      const slotData = event.over?.data.current;
      if (!slotData?.slotStart) {
        setActiveDragTask(null);
        return;
      }

      const taskId = event.active.id.replace('task-', '');
      if (!onRescheduleTask) {
        setActiveDragTask(null);
        return;
      }

      const durationMinutes = activeDragTask?.durationMinutes ?? 15;
      const slotStart = slotData.slotStart;
      const slotEnd = new Date(slotStart.getTime() + durationMinutes * 60000);

      setIsRescheduling(true);
      try {
        await onRescheduleTask(taskId, slotStart, slotEnd);
      } catch (error) {
        console.error('Failed to reschedule task:', error);
      } finally {
        setIsRescheduling(false);
        setActiveDragTask(null);
      }
    },
    [activeDragTask, onRescheduleTask]
  );

  const handleEventClick = useCallback(
    (event: CalendarEventItem, e: React.SyntheticEvent) => {
      // Get click position for popover placement
      const mouseEvent = e as unknown as MouseEvent;
      setPopoverPosition({ x: mouseEvent.clientX, y: mouseEvent.clientY });

      // Find the full task details if this is a task event
      const taskId = event.taskId;
      const task = taskId ? tasks.find((t) => t.id === taskId) : undefined;

      setSelectedEventForPopover({
        id: taskId || event.id,
        title: event.title,
        start: event.start,
        end: event.end,
        description: task?.description,
        isTask: event.isTask,
        task,
        categoryColor: event.categoryColor,
        categoryName: task?.category?.name,
        overflowed: event.overflowed,
      });
      setPopoverOpen(true);

      // Call original onSelectEvent if provided
      if (onSelectEvent) {
        onSelectEvent(event);
      }
    },
    [tasks, onSelectEvent]
  );

  return (
    <div className="h-[700px] bg-white rounded-lg shadow-sm border border-slate-200 p-4 relative overflow-hidden">
      <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
        {isRescheduling && (
          <div className="absolute top-4 right-4 bg-primary-600 text-white px-4 py-2 rounded-lg shadow-lg z-10">
            Rescheduling...
          </div>
        )}

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
          max={new Date(0, 0, 0, 23, 0, 0)} // 11 PM
          step={15}
          timeslots={4}
          components={{
            event: (props) => <DraggableEvent event={props.event as CalendarEventItem} prefersReducedMotion={prefersReducedMotion} onResize={onResizeEvent} />,
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

        <DragOverlay dropAnimation={null}>
          {activeDragTask ? (
            <div className="rounded-lg border border-primary-200 bg-white shadow-xl px-4 py-3 w-64">
              <p className="text-sm font-semibold text-slate-800">{activeDragTask.title}</p>
              <p className="text-xs text-slate-600 mt-1">
                {activeDragTask.durationMinutes} min {activeDragTask.category ? `• ${activeDragTask.category.name}` : ''}
              </p>
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>

      {/* Event Detail Popover */}
      <EventDetailPopover
        isOpen={popoverOpen}
        onClose={() => setPopoverOpen(false)}
        event={selectedEventForPopover}
        position={popoverPosition}
        onComplete={onCompleteTask}
        onEdit={onEditTask}
        onUnschedule={onUnscheduleTask}
        onDelete={onDeleteTask}
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
}: {
  event: CalendarEventItem;
  prefersReducedMotion: boolean;
  onResize?: (taskId: string, start: Date, end: Date) => Promise<void>;
}) {
  const [isResizing, setIsResizing] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const resizeStartY = useRef<number>(0);
  const initialEnd = useRef<Date>(event.end);

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

  return (
    <motion.div
      ref={setNodeRef}
      style={style}
      {...listeners}
      {...attributes}
      {...motionProps}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {event.title}
      {event.isTask && onResize && (isHovered || isResizing) && (
        <div
          className="absolute bottom-0 left-0 right-0 h-1.5 bg-primary-500/50 hover:bg-primary-500 cursor-ns-resize flex items-center justify-center"
          onMouseDown={handleResizeStart}
          style={{ touchAction: 'none' }}
        >
          <div className="w-12 h-0.5 bg-white rounded-full"></div>
        </div>
      )}
    </motion.div>
  );
}
