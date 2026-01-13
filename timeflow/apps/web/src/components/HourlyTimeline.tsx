/**
 * HourlyTimeline Component
 *
 * Displays today's schedule in an hour-by-hour format with scheduled tasks and events.
 */

'use client';

import { useMemo, memo } from 'react';
import { useDroppable } from '@dnd-kit/core';
import { motion, useReducedMotion } from 'framer-motion';
import type { Task, CalendarEvent } from '@timeflow/shared';

interface TimelineItem {
  id: string;
  type: 'task' | 'event' | 'habit';
  title: string;
  start: Date;
  end: Date;
  description?: string;
  priority?: 1 | 2 | 3;
  status?: string;
  isOverdue?: boolean;
  categoryColor?: string;
  sourceType?: 'task' | 'habit' | 'external';
  sourceId?: string;
  isCompleted?: boolean;
}

interface TimeSlot {
  hour: number;
  items: TimelineItem[];
  isFree: boolean;
}

interface HourlyTimelineProps {
  tasks: Task[];
  events: CalendarEvent[];
  wakeTime?: string; // HH:mm format, default 08:00
  sleepTime?: string; // HH:mm format, default 23:00
  onCompleteTask?: (taskId: string) => void;
  onCompleteHabit?: (scheduledHabitId: string) => void;
  enableDropTargets?: boolean;
}

export function HourlyTimeline({
  tasks,
  events,
  wakeTime = '08:00',
  sleepTime = '23:00',
  onCompleteTask,
  onCompleteHabit,
  enableDropTargets = false,
}: HourlyTimelineProps) {
  const now = new Date();
  const currentHour = now.getHours();

  // Parse wake/sleep times
  const wakeHour = parseInt(wakeTime.split(':')[0]);
  const sleepHour = parseInt(sleepTime.split(':')[0]);

  // Build timeline items
  const timelineItems = useMemo(() => {
    const items: TimelineItem[] = [];
    const today = new Date();
    const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const endOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1);

    // Add scheduled tasks
    tasks
      .filter((task) => task.status === 'scheduled' && task.scheduledTask)
      .forEach((task) => {
        const scheduledStart = new Date(task.scheduledTask!.startDateTime);
        const scheduledEnd = new Date(task.scheduledTask!.endDateTime);

        if (scheduledStart >= startOfDay && scheduledStart < endOfDay) {
          items.push({
            id: task.id,
            type: 'task',
            title: task.title,
            start: scheduledStart,
            end: scheduledEnd,
            description: task.description || undefined,
            priority: task.priority,
            status: task.status,
            isOverdue: task.scheduledTask?.overflowedDeadline,
            categoryColor: task.category?.color,
          });
        }
      });

    // Add calendar events (includes tasks, habits, and external events from merged backend)
    events.forEach((event) => {
      const eventStart = new Date(event.start);
      const eventEnd = new Date(event.end);

      if (eventStart >= startOfDay && eventStart < endOfDay) {
        items.push({
          id: event.id ?? `event-${eventStart.getTime()}-${eventEnd.getTime()}`,
          type: event.sourceType === 'habit' ? 'habit' : event.sourceType === 'task' ? 'task' : 'event',
          title: event.summary,
          start: eventStart,
          end: eventEnd,
          description: event.description,
          sourceType: event.sourceType,
          sourceId: event.sourceId,
          isCompleted: event.isCompleted,
        });
      }
    });

    return items.sort((a, b) => a.start.getTime() - b.start.getTime());
  }, [tasks, events]);

  // Build time slots
  const timeSlots = useMemo(() => {
    const slots: TimeSlot[] = [];

    for (let hour = wakeHour; hour <= sleepHour; hour++) {
      const hourItems = timelineItems.filter((item) => {
        const itemHour = item.start.getHours();
        return itemHour === hour;
      });

      slots.push({
        hour,
        items: hourItems,
        isFree: hourItems.length === 0,
      });
    }

    return slots;
  }, [timelineItems, wakeHour, sleepHour]);

  const formatHour = (hour: number) => {
    const period = hour >= 12 ? 'PM' : 'AM';
    const displayHour = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
    return `${displayHour}:00 ${period}`;
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
    });
  };

  return (
    <div className="space-y-1">
      {timeSlots.map((slot) => (
        <TimelineSlot
          key={slot.hour}
          slot={slot}
          isCurrent={slot.hour === currentHour}
          onCompleteTask={onCompleteTask}
          onCompleteHabit={onCompleteHabit}
          enableDropTargets={enableDropTargets}
          formatHour={formatHour}
          formatTime={formatTime}
        />
      ))}

      {timeSlots.length === 0 && (
        <div className="text-center py-12 text-slate-500">
          <p>No time slots available</p>
        </div>
      )}
    </div>
  );
}

type TimelineSlotProps = {
  slot: TimeSlot;
  isCurrent: boolean;
  onCompleteTask?: (taskId: string) => void;
  onCompleteHabit?: (scheduledHabitId: string) => void;
  enableDropTargets: boolean;
  formatHour: (hour: number) => string;
  formatTime: (date: Date) => string;
};

const TimelineSlot = memo(function TimelineSlot({
  slot,
  isCurrent,
  onCompleteTask,
  onCompleteHabit,
  enableDropTargets,
  formatHour,
  formatTime,
}: TimelineSlotProps) {
  const { setNodeRef, isOver } = useDroppable({
    id: `slot-${slot.hour}`,
    data: { hour: slot.hour },
    disabled: !enableDropTargets,
  });

  const ariaLabel = enableDropTargets
    ? `${formatHour(slot.hour)} time slot. ${slot.isFree ? 'Empty, drop a task here to schedule it' : `Has ${slot.items.length} item${slot.items.length > 1 ? 's' : ''}`}`
    : undefined;

  return (
    <div
      ref={enableDropTargets ? setNodeRef : undefined}
      className={`flex gap-4 py-2 px-3 rounded-lg transition-all ${
        isCurrent
          ? 'bg-primary-50 border-l-4 border-primary-500'
          : 'hover:bg-slate-50 border-l-4 border-transparent'
      } ${enableDropTargets ? 'border-dashed border-slate-200' : ''} ${
        isOver ? 'ring-2 ring-primary-300 bg-primary-50/70' : ''
      }`}
      role={enableDropTargets ? 'region' : undefined}
      aria-label={ariaLabel}
      aria-dropeffect={enableDropTargets && slot.isFree ? 'move' : undefined}
    >
      <div className="w-20 flex-shrink-0">
        <span className={`text-sm font-medium ${isCurrent ? 'text-primary-700' : 'text-slate-600'}`}>
          {formatHour(slot.hour)}
        </span>
      </div>

      <div className="flex-1 min-w-0">
        {slot.isFree ? (
          <div className="text-sm text-slate-400 italic py-1">
            {enableDropTargets ? 'Drop a task to schedule here' : 'Free time'}
          </div>
        ) : (
          <div className="space-y-2">
            {slot.items.map((item) => (
              <TimelineCard
                key={item.id}
                item={item}
                onCompleteTask={onCompleteTask}
                onCompleteHabit={onCompleteHabit}
                formatTime={formatTime}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
});

const TimelineCard = memo(function TimelineCard({
  item,
  onCompleteTask,
  onCompleteHabit,
  formatTime,
}: {
  item: TimelineItem;
  onCompleteTask?: (taskId: string) => void;
  onCompleteHabit?: (scheduledHabitId: string) => void;
  formatTime: (date: Date) => string;
}) {
  const prefersReducedMotion = useReducedMotion();

  // Color scheme
  const defaultTaskColor = '#0BAF9A'; // Brand Primary Teal for tasks
  const habitColor = '#6366F1'; // Indigo-500 for habits
  const externalEventColor = '#64748b'; // Gray for external events

  // Background color based on type and category
  const bgColor = item.categoryColor
    ? `${item.categoryColor}20` // Light version of category color
    : item.type === 'habit'
    ? '#EEF2FF' // Light indigo background for habits
    : item.type === 'task'
    ? '#E6F9F6' // Light teal background for tasks
    : '#f1f5f9'; // Light gray for external events

  // Border color
  const borderColor = item.categoryColor
    ? item.categoryColor
    : item.type === 'habit'
    ? habitColor
    : item.type === 'task'
    ? defaultTaskColor
    : externalEventColor;

  // Overflowed tasks get Coral border
  const finalBorderColor = item.isOverdue ? '#F97316' : borderColor;

  // Opacity for completed items
  const opacity = item.isCompleted ? 0.5 : 1;

  // Determine if we should show completion checkbox
  const canComplete = (item.type === 'task' && !item.isCompleted && onCompleteTask) ||
                      (item.type === 'habit' && !item.isCompleted && onCompleteHabit);

  const handleComplete = () => {
    if (item.type === 'task' && onCompleteTask) {
      onCompleteTask(item.id);
    } else if (item.type === 'habit' && item.sourceId && onCompleteHabit) {
      onCompleteHabit(item.sourceId);
    }
  };

  return (
    <div
      className="flex items-start gap-2 py-2 px-3 rounded-lg border-l-4"
      style={{
        backgroundColor: bgColor,
        borderLeftColor: finalBorderColor,
        opacity,
      }}
    >
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs font-medium text-slate-600">
            {formatTime(item.start)} - {formatTime(item.end)}
          </span>
          {item.type === 'task' && item.priority === 1 && (
            <span className="text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded">HIGH</span>
          )}
          {item.type === 'habit' && (
            <span className="text-xs bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded">HABIT</span>
          )}
          {item.isOverdue && (
            <span className="text-xs bg-red-200 text-red-800 px-2 py-0.5 rounded">OVERDUE</span>
          )}
          {item.isCompleted && (
            <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded">✓ DONE</span>
          )}
        </div>
        <h4 className={`font-medium text-slate-800 text-sm mt-1 ${item.isCompleted ? 'line-through' : ''}`}>
          {item.title}
        </h4>
        {item.description && (
          <p className="text-xs text-slate-600 mt-1 line-clamp-1">{item.description}</p>
        )}
      </div>
      {canComplete && (
        <motion.button
          type="button"
          onClick={handleComplete}
          className="text-slate-400 hover:text-green-600 transition-colors flex-shrink-0 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 rounded"
          title="Mark complete"
          aria-label={`Mark ${item.title} as complete`}
          whileTap={prefersReducedMotion ? undefined : { scale: 0.9 }}
          whileHover={prefersReducedMotion ? undefined : { scale: 1.05 }}
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        </motion.button>
      )}
    </div>
  );
});
