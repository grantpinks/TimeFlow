/**
 * What's Now Widget
 *
 * Displays what the user should be doing right now based on current time and schedule.
 * Shows current event, upcoming event, or suggested next action.
 */

'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import type { CalendarEvent, Task } from '@timeflow/shared';

interface WhatsNowWidgetProps {
  events: CalendarEvent[];
  tasks: Task[];
  className?: string;
}

interface CurrentActivity {
  type: 'event' | 'task' | 'free' | 'upcoming';
  title: string;
  description?: string;
  timeInfo: string;
  progress?: number; // 0-100 for current events
  icon: 'calendar' | 'task' | 'coffee' | 'clock';
  color: 'primary' | 'green' | 'amber' | 'blue';
}

export function WhatsNowWidget({ events, tasks, className = '' }: WhatsNowWidgetProps) {
  const [currentActivity, setCurrentActivity] = useState<CurrentActivity | null>(null);
  const [currentTime, setCurrentTime] = useState(new Date());

  // Update current time every 30 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(new Date());
    }, 30000);
    return () => clearInterval(interval);
  }, []);

  // Determine what's happening now
  useEffect(() => {
    const now = currentTime;
    const nowTime = now.getTime();

    // Check for current event
    const currentEvent = events.find((event) => {
      const start = new Date(event.start).getTime();
      const end = new Date(event.end).getTime();
      return nowTime >= start && nowTime < end;
    });

    if (currentEvent) {
      const start = new Date(currentEvent.start).getTime();
      const end = new Date(currentEvent.end).getTime();
      const progress = ((nowTime - start) / (end - start)) * 100;
      const minutesRemaining = Math.round((end - nowTime) / 1000 / 60);

      setCurrentActivity({
        type: 'event',
        title: currentEvent.summary || 'Untitled Event',
        description: currentEvent.description,
        timeInfo: `${minutesRemaining} min remaining`,
        progress,
        icon: 'calendar',
        color: 'primary',
      });
      return;
    }

    // Check for scheduled task happening now
    // Note: Task scheduled time would need to come from ScheduledTask relation
    // For now, we'll skip this and move to upcoming events

    // Check for upcoming event in next 2 hours
    const upcomingEvents = events
      .filter((event) => {
        const start = new Date(event.start).getTime();
        return start > nowTime && start < nowTime + 2 * 60 * 60 * 1000;
      })
      .sort((a, b) => {
        const aStart = new Date(a.start).getTime();
        const bStart = new Date(b.start).getTime();
        return aStart - bStart;
      });

    if (upcomingEvents.length > 0) {
      const nextEvent = upcomingEvents[0];
      const start = new Date(nextEvent.start);
      const minutesUntil = Math.round((start.getTime() - nowTime) / 1000 / 60);
      const timeStr = start.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });

      setCurrentActivity({
        type: 'upcoming',
        title: nextEvent.summary || 'Untitled Event',
        description: `Starting at ${timeStr}`,
        timeInfo: `in ${minutesUntil} min`,
        icon: 'clock',
        color: 'blue',
      });
      return;
    }

    // Check for unscheduled high-priority tasks
    const unscheduledTasks = tasks
      .filter((task) => task.status === 'unscheduled' && task.priority >= 3)
      .sort((a, b) => b.priority - a.priority);

    if (unscheduledTasks.length > 0) {
      const topTask = unscheduledTasks[0];
      setCurrentActivity({
        type: 'task',
        title: topTask.title,
        description: 'High-priority task ready to schedule',
        timeInfo: `${topTask.durationMinutes} min`,
        icon: 'task',
        color: 'green',
      });
      return;
    }

    // Free time
    setCurrentActivity({
      type: 'free',
      title: 'Free Time',
      description: 'No scheduled events right now',
      timeInfo: 'Time to focus or take a break',
      icon: 'coffee',
      color: 'amber',
    });
  }, [events, tasks, currentTime]);

  if (!currentActivity) return null;

  const iconMap = {
    calendar: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
        />
      </svg>
    ),
    task: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
        />
      </svg>
    ),
    coffee: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z"
        />
      </svg>
    ),
    clock: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
        />
      </svg>
    ),
  };

  const colorMap = {
    primary: 'from-primary-500 to-primary-600',
    green: 'from-green-500 to-emerald-600',
    amber: 'from-amber-500 to-orange-600',
    blue: 'from-blue-500 to-indigo-600',
  };

  const bgColorMap = {
    primary: 'bg-primary-50 border-primary-200',
    green: 'bg-green-50 border-green-200',
    amber: 'bg-amber-50 border-amber-200',
    blue: 'bg-blue-50 border-blue-200',
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      className={`${bgColorMap[currentActivity.color]} border-2 rounded-xl p-4 sm:p-5 shadow-lg ${className}`}
    >
      <div className="flex items-start gap-3 sm:gap-4">
        {/* Icon */}
        <div
          className={`flex-shrink-0 p-3 rounded-xl bg-gradient-to-br ${colorMap[currentActivity.color]} text-white shadow-md`}
        >
          {iconMap[currentActivity.icon]}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <h3 className="font-bold text-slate-900 text-base sm:text-lg truncate">
              {currentActivity.title}
            </h3>
            <span className="flex-shrink-0 text-xs font-semibold text-slate-600 bg-white/70 px-2 py-0.5 rounded-full">
              {currentActivity.timeInfo}
            </span>
          </div>

          {currentActivity.description && (
            <p className="text-sm text-slate-600 mb-2 line-clamp-2">
              {currentActivity.description}
            </p>
          )}

          {/* Progress bar for current events */}
          {currentActivity.progress !== undefined && (
            <div className="relative w-full h-2 bg-white/50 rounded-full overflow-hidden">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${currentActivity.progress}%` }}
                transition={{ duration: 0.5 }}
                className={`absolute inset-y-0 left-0 bg-gradient-to-r ${colorMap[currentActivity.color]} rounded-full`}
              />
            </div>
          )}

          {/* Status badge */}
          <div className="mt-2">
            {currentActivity.type === 'event' && (
              <span className="inline-flex items-center gap-1 text-xs font-medium text-primary-700">
                <span className="w-2 h-2 bg-primary-500 rounded-full animate-pulse" />
                In Progress
              </span>
            )}
            {currentActivity.type === 'upcoming' && (
              <span className="inline-flex items-center gap-1 text-xs font-medium text-blue-700">
                <span className="w-2 h-2 bg-blue-500 rounded-full animate-pulse" />
                Coming Up
              </span>
            )}
            {currentActivity.type === 'task' && (
              <span className="inline-flex items-center gap-1 text-xs font-medium text-green-700">
                <span className="w-2 h-2 bg-green-500 rounded-full" />
                Suggested Action
              </span>
            )}
            {currentActivity.type === 'free' && (
              <span className="inline-flex items-center gap-1 text-xs font-medium text-amber-700">
                <span className="w-2 h-2 bg-amber-500 rounded-full" />
                No Active Events
              </span>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  );
}
