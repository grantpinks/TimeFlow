'use client';

import { useState, useEffect } from 'react';
import { Layout } from '@/components/Layout';
import { FloatingAssistantButton } from '@/components/FloatingAssistantButton';
import { useTasks } from '@/hooks/useTasks';
import { useUser } from '@/hooks/useUser';
import * as api from '@/lib/api';
import type { CalendarEvent, Task } from '@timeflow/shared';

interface TimelineItem {
  id: string;
  type: 'task' | 'event';
  title: string;
  start: Date;
  end: Date;
  description?: string;
  priority?: 1 | 2 | 3;
  status?: string;
  isOverdue?: boolean;
}

export default function TodayPage() {
  const { user, isAuthenticated } = useUser();
  const { tasks, loading: tasksLoading, refresh: refreshTasks, completeTask } = useTasks();
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [eventsLoading, setEventsLoading] = useState(true);

  // Fetch today's calendar events
  useEffect(() => {
    async function fetchTodayEvents() {
      try {
        const now = new Date();
        const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const endOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);

        const calendarEvents = await api.getCalendarEvents(
          startOfDay.toISOString(),
          endOfDay.toISOString()
        );
        setEvents(calendarEvents);
      } catch (err) {
        console.error('Failed to fetch calendar events:', err);
      } finally {
        setEventsLoading(false);
      }
    }

    if (isAuthenticated) {
      fetchTodayEvents();
    }
  }, [isAuthenticated]);

  // Redirect if not authenticated (with delay to allow auth to load)
  useEffect(() => {
    const timer = setTimeout(() => {
      if (!isAuthenticated && typeof window !== 'undefined') {
        window.location.href = '/';
      }
    }, 1000);

    return () => clearTimeout(timer);
  }, [isAuthenticated]);

  if (!isAuthenticated || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto mb-4"></div>
          <p className="text-slate-600">Loading...</p>
        </div>
      </div>
    );
  }

  // Build timeline items from tasks and events
  const now = new Date();
  const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const endOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);

  const timelineItems: TimelineItem[] = [];

  // Add scheduled tasks for today
  tasks
    .filter((task) => task.status === 'scheduled' && task.scheduledTask)
    .forEach((task) => {
      const scheduledStart = new Date(task.scheduledTask!.startDateTime);
      const scheduledEnd = new Date(task.scheduledTask!.endDateTime);

      if (scheduledStart >= startOfDay && scheduledStart < endOfDay) {
        timelineItems.push({
          id: task.id,
          type: 'task',
          title: task.title,
          start: scheduledStart,
          end: scheduledEnd,
          description: task.description || undefined,
          priority: task.priority,
          status: task.status,
          isOverdue: task.scheduledTask?.overflowedDeadline,
        });
      }
    });

  // Add calendar events
  events.forEach((event) => {
    timelineItems.push({
      id: event.id,
      type: 'event',
      title: event.summary,
      start: new Date(event.start),
      end: new Date(event.end),
      description: event.description,
    });
  });

  // Sort by start time
  timelineItems.sort((a, b) => a.start.getTime() - b.start.getTime());

  // Get unscheduled tasks due today
  const unscheduledDueToday = tasks.filter((task) => {
    if (task.status !== 'unscheduled' || !task.dueDate) return false;
    const dueDate = new Date(task.dueDate);
    return dueDate >= startOfDay && dueDate < endOfDay;
  });

  // Get high priority unscheduled tasks (not due today)
  const highPriorityUnscheduled = tasks.filter(
    (task) =>
      task.status === 'unscheduled' &&
      task.priority === 1 &&
      (!task.dueDate || new Date(task.dueDate) >= endOfDay)
  );

  const handleCompleteTask = async (taskId: string) => {
    try {
      await completeTask(taskId);
      await refreshTasks();
    } catch (err) {
      console.error('Failed to complete task:', err);
    }
  };

  const loading = tasksLoading || eventsLoading;

  return (
    <Layout>
      <div className="max-w-5xl mx-auto space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold text-slate-800">
            Today
            <span className="text-slate-500 font-normal text-xl ml-3">
              {now.toLocaleDateString('en-US', {
                weekday: 'long',
                month: 'long',
                day: 'numeric',
              })}
            </span>
          </h1>
          <p className="text-slate-600 mt-1">Your schedule and tasks for today</p>
        </div>

        {loading ? (
          <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-12 text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto mb-4"></div>
            <p className="text-slate-600">Loading today's schedule...</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Timeline - Main Column */}
            <div className="lg:col-span-2">
              <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-6">
                <h2 className="text-lg font-semibold text-slate-800 mb-4">
                  Today's Schedule
                </h2>

                {timelineItems.length === 0 ? (
                  <div className="text-center py-12 text-slate-500">
                    <svg
                      className="w-16 h-16 mx-auto mb-4 text-slate-300"
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
                    <p className="text-lg mb-2">No scheduled items for today</p>
                    <p className="text-sm">
                      Use Smart Schedule or the AI Assistant to plan your day
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {timelineItems.map((item) => (
                      <div
                        key={item.id}
                        className={`border-l-4 pl-4 py-3 rounded-r-lg ${
                          item.type === 'task'
                            ? item.isOverdue
                              ? 'border-red-500 bg-red-50'
                              : 'border-primary-500 bg-primary-50'
                            : 'border-slate-400 bg-slate-50'
                        }`}
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-medium text-slate-600">
                                {item.start.toLocaleTimeString('en-US', {
                                  hour: 'numeric',
                                  minute: '2-digit',
                                })}
                                {' - '}
                                {item.end.toLocaleTimeString('en-US', {
                                  hour: 'numeric',
                                  minute: '2-digit',
                                })}
                              </span>
                              {item.type === 'task' && item.priority === 1 && (
                                <span className="text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded">
                                  HIGH
                                </span>
                              )}
                              {item.isOverdue && (
                                <span className="text-xs bg-red-200 text-red-800 px-2 py-0.5 rounded">
                                  OVERDUE
                                </span>
                              )}
                            </div>
                            <h3 className="font-medium text-slate-800 mt-1">
                              {item.title}
                            </h3>
                            {item.description && (
                              <p className="text-sm text-slate-600 mt-1">
                                {item.description}
                              </p>
                            )}
                          </div>
                          {item.type === 'task' && item.status !== 'completed' && (
                            <button
                              onClick={() => handleCompleteTask(item.id)}
                              className="text-slate-400 hover:text-green-600 transition-colors"
                              title="Mark complete"
                            >
                              <svg
                                className="w-6 h-6"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth={2}
                                  d="M5 13l4 4L19 7"
                                />
                              </svg>
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Sidebar - Unscheduled Items */}
            <div className="space-y-6">
              {/* Unscheduled due today */}
              {unscheduledDueToday.length > 0 && (
                <div className="bg-amber-50 rounded-lg border border-amber-200 p-4">
                  <h3 className="font-semibold text-amber-900 mb-3 flex items-center gap-2">
                    <svg
                      className="w-5 h-5"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                      />
                    </svg>
                    Due Today ({unscheduledDueToday.length})
                  </h3>
                  <div className="space-y-2">
                    {unscheduledDueToday.map((task) => (
                      <div
                        key={task.id}
                        className="bg-white rounded p-3 border border-amber-200"
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <h4 className="font-medium text-slate-800 text-sm">
                              {task.title}
                            </h4>
                            <p className="text-xs text-slate-600 mt-1">
                              {task.durationMinutes} min
                              {task.priority === 1 && (
                                <span className="ml-2 text-red-600 font-medium">
                                  HIGH
                                </span>
                              )}
                            </p>
                          </div>
                          <button
                            onClick={() => handleCompleteTask(task.id)}
                            className="text-slate-400 hover:text-green-600 transition-colors"
                            title="Mark complete"
                          >
                            <svg
                              className="w-5 h-5"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M5 13l4 4L19 7"
                              />
                            </svg>
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* High priority unscheduled */}
              {highPriorityUnscheduled.length > 0 && (
                <div className="bg-white rounded-lg border border-slate-200 p-4">
                  <h3 className="font-semibold text-slate-800 mb-3 flex items-center gap-2">
                    <svg
                      className="w-5 h-5 text-red-500"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                      />
                    </svg>
                    High Priority
                  </h3>
                  <div className="space-y-2">
                    {highPriorityUnscheduled.slice(0, 5).map((task) => (
                      <div
                        key={task.id}
                        className="bg-slate-50 rounded p-3 border border-slate-200"
                      >
                        <h4 className="font-medium text-slate-800 text-sm">
                          {task.title}
                        </h4>
                        <p className="text-xs text-slate-600 mt-1">
                          {task.durationMinutes} min
                          {task.dueDate && (
                            <span className="ml-2">
                              Due:{' '}
                              {new Date(task.dueDate).toLocaleDateString('en-US', {
                                month: 'short',
                                day: 'numeric',
                              })}
                            </span>
                          )}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Quick actions */}
              <div className="bg-slate-50 rounded-lg border border-slate-200 p-4">
                <h3 className="font-semibold text-slate-800 mb-3">Quick Actions</h3>
                <div className="space-y-2">
                  <a
                    href="/tasks"
                    className="block w-full text-center bg-primary-600 text-white px-4 py-2 rounded-lg hover:bg-primary-700 font-medium text-sm"
                  >
                    View All Tasks
                  </a>
                  <a
                    href="/assistant"
                    className="block w-full text-center bg-accent-600 text-white px-4 py-2 rounded-lg hover:bg-accent-700 font-medium text-sm"
                  >
                    Ask AI Assistant
                  </a>
                  <a
                    href="/calendar"
                    className="block w-full text-center border border-slate-300 text-slate-700 px-4 py-2 rounded-lg hover:bg-slate-100 font-medium text-sm"
                  >
                    Open Calendar
                  </a>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      <FloatingAssistantButton />
    </Layout>
  );
}
