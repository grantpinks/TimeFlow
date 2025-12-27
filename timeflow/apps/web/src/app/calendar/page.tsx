'use client';

import { useState, useEffect } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { DndContext, DragOverlay, useSensors, useSensor, PointerSensor } from '@dnd-kit/core';
import { Layout } from '@/components/Layout';
import { CalendarView, CalendarEventItem } from '@/components/CalendarView';
import { FloatingAssistantButton } from '@/components/FloatingAssistantButton';
import { MiniCalendar } from '@/components/MiniCalendar';
import { TimeBreakdown } from '@/components/TimeBreakdown';
import { UpcomingEventsPanel } from '@/components/UpcomingEventsPanel';
import { UnscheduledTasksPanel } from '@/components/UnscheduledTasksPanel';
import { PlanMeetingsPanel } from '@/components/PlanMeetingsPanel';
import { TaskSchedulePreview } from '@/components/TaskSchedulePreview';
import { useTasks } from '@/hooks/useTasks';
import * as api from '@/lib/api';
import type { CalendarEvent, Task } from '@timeflow/shared';

export default function CalendarPage() {
  const reduceMotion = useReducedMotion();
  const { tasks, loading: tasksLoading, refresh: refreshTasks } = useTasks();
  const [externalEvents, setExternalEvents] = useState<CalendarEvent[]>([]);
  const [eventsLoading, setEventsLoading] = useState(true);
  const [eventCategorizations, setEventCategorizations] = useState<Record<string, api.EventCategorization>>({});
  const [categories, setCategories] = useState<Array<{ id: string; name: string; color: string; order: number }>>([]);
  const [scheduling, setScheduling] = useState(false);
  const [categorizingEvents, setCategorizingEvents] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [selectedTask, setSelectedTask] = useState<{ id: string; title: string } | null>(null);
  const [showTaskModal, setShowTaskModal] = useState(false);
  const [activeDragTask, setActiveDragTask] = useState<any | null>(null);
  const [calendarDate, setCalendarDate] = useState(new Date());

  // Preview state for drag-and-drop scheduling
  const [previewTask, setPreviewTask] = useState<Task | null>(null);
  const [previewSlot, setPreviewSlot] = useState<{ start: Date; end: Date } | null>(null);
  const [isSchedulingFromPreview, setIsSchedulingFromPreview] = useState(false);

  // Fetch calendar events for the current month
  const fetchExternalEvents = async () => {
    try {
      setEventsLoading(true);
      const now = new Date();
      const start = new Date(now.getFullYear(), now.getMonth(), 1);
      const end = new Date(now.getFullYear(), now.getMonth() + 2, 0); // End of next month

      const events = await api.getCalendarEvents(
        start.toISOString(),
        end.toISOString()
      );
      setExternalEvents(events);
    } catch (err) {
      console.error('Failed to fetch calendar events:', err);
    } finally {
      setEventsLoading(false);
    }
  };

  // Fetch categories on mount
  useEffect(() => {
    async function fetchCategories() {
      try {
        const cats = await api.getCategories();
        setCategories(cats);
      } catch (err) {
        console.error('Failed to fetch categories:', err);
      }
    }

    fetchCategories();
    fetchExternalEvents();
  }, []);

  // Fetch event categorizations with caching and background auto-categorization
  useEffect(() => {
    async function fetchCategorizations() {
      if (externalEvents.length === 0) return;

      const eventIds = externalEvents.map(e => e.id).filter((id): id is string => Boolean(id));
      if (eventIds.length === 0) return;

      // Check cache
      const cacheKey = 'categorizations_cache';
      const cacheTimestampKey = 'categorizations_timestamp';
      const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

      try {
        const cachedData = sessionStorage.getItem(cacheKey);
        const cachedTimestamp = sessionStorage.getItem(cacheTimestampKey);

        if (cachedData && cachedTimestamp) {
          const age = Date.now() - parseInt(cachedTimestamp, 10);

          if (age < CACHE_DURATION) {
            const cached = JSON.parse(cachedData);
            // Check if cached data covers all current event IDs
            const cachedIds = Object.keys(cached);
            const allCovered = eventIds.every(id => cachedIds.includes(id));

            if (allCovered) {
              console.log('[Cache] Using cached categorizations');
              setEventCategorizations(cached);

              // Background auto-categorize: Check for new uncategorized events
              const uncategorizedIds = eventIds.filter(id => !cachedIds.includes(id));
              if (uncategorizedIds.length > 0) {
                console.log('[Background] Auto-categorizing', uncategorizedIds.length, 'new events');
                // Don't await - run in background
                api.categorizeAllEvents().then(() => {
                  // Refresh categorizations after background categorization
                  api.getEventCategorizations(eventIds).then(freshCats => {
                    setEventCategorizations(freshCats);
                    sessionStorage.setItem(cacheKey, JSON.stringify(freshCats));
                    sessionStorage.setItem(cacheTimestampKey, Date.now().toString());
                    console.log('[Background] Auto-categorization complete');
                  });
                }).catch(err => {
                  console.error('[Background] Auto-categorization failed:', err);
                });
              }

              return;
            }
          }
        }

        // Cache miss or stale - fetch from API
        console.log('[Cache] Fetching fresh categorizations');
        const cats = await api.getEventCategorizations(eventIds);
        setEventCategorizations(cats);

        // Update cache
        sessionStorage.setItem(cacheKey, JSON.stringify(cats));
        sessionStorage.setItem(cacheTimestampKey, Date.now().toString());

        // Background auto-categorize: Check if there are uncategorized events
        const categorizedIds = Object.keys(cats);
        const uncategorizedIds = eventIds.filter(id => !categorizedIds.includes(id));
        if (uncategorizedIds.length > 0) {
          console.log('[Background] Auto-categorizing', uncategorizedIds.length, 'new events');
          // Don't await - run in background
          api.categorizeAllEvents().then(() => {
            // Refresh categorizations after background categorization
            api.getEventCategorizations(eventIds).then(freshCats => {
              setEventCategorizations(freshCats);
              sessionStorage.setItem(cacheKey, JSON.stringify(freshCats));
              sessionStorage.setItem(cacheTimestampKey, Date.now().toString());
              console.log('[Background] Auto-categorization complete');
            });
          }).catch(err => {
            console.error('[Background] Auto-categorization failed:', err);
          });
        }
      } catch (err) {
        console.error('Failed to fetch event categorizations:', err);
      }
    }

    fetchCategorizations();
  }, [externalEvents]);

  // Handle Escape key to cancel preview
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && previewTask) {
        handleCancelPreview();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [previewTask]);

  const unscheduledTasks = tasks.filter((t) => t.status === 'unscheduled');

  const handleSmartSchedule = async () => {
    const taskIds = unscheduledTasks.map((t) => t.id);
    if (taskIds.length === 0) {
      setMessage({ type: 'error', text: 'No unscheduled tasks to schedule' });
      return;
    }

    setScheduling(true);
    setMessage(null);

    try {
      const now = new Date();
      const end = new Date();
      end.setDate(end.getDate() + 14);

      const result = await api.runSchedule({
        taskIds,
        dateRangeStart: now.toISOString(),
        dateRangeEnd: end.toISOString(),
      });

      setMessage({
        type: 'success',
        text: `Scheduled ${result.scheduled} task${result.scheduled === 1 ? '' : 's'}!`,
      });
      refreshTasks();
    } catch (err) {
      setMessage({
        type: 'error',
        text: err instanceof Error ? err.message : 'Scheduling failed',
      });
    } finally {
      setScheduling(false);
    }
  };

  // Helper to clear categorization cache
  const clearCategorizationCache = () => {
    sessionStorage.removeItem('categorizations_cache');
    sessionStorage.removeItem('categorizations_timestamp');
  };

  const handleCategorizeEvents = async () => {
    if (externalEvents.length === 0) {
      setMessage({ type: 'error', text: 'No events to categorize' });
      return;
    }

    setCategorizingEvents(true);
    setMessage(null);

    try {
      const result = await api.categorizeAllEvents();

      setMessage({
        type: 'success',
        text: result.message,
      });

      // Clear cache and refresh categorizations
      clearCategorizationCache();
      const eventIds = externalEvents.map(e => e.id).filter((id): id is string => Boolean(id));
      const cats = await api.getEventCategorizations(eventIds);
      setEventCategorizations(cats);

      // Update cache with fresh data
      sessionStorage.setItem('categorizations_cache', JSON.stringify(cats));
      sessionStorage.setItem('categorizations_timestamp', Date.now().toString());
    } catch (err) {
      setMessage({
        type: 'error',
        text: err instanceof Error ? err.message : 'Categorization failed',
      });
    } finally {
      setCategorizingEvents(false);
    }
  };

  const handleCategoryChange = async (
    eventId: string,
    categoryId: string,
    training?: { useForTraining?: boolean; example?: api.CategoryTrainingExampleSnapshot }
  ) => {
    try {
      await api.updateEventCategorization(eventId, categoryId, 'google', training as any);

      // Clear cache and refresh categorizations to get updated data
      clearCategorizationCache();
      const eventIds = externalEvents.map(e => e.id).filter((id): id is string => Boolean(id));
      const cats = await api.getEventCategorizations(eventIds);
      setEventCategorizations(cats);

      // Update cache with fresh data
      sessionStorage.setItem('categorizations_cache', JSON.stringify(cats));
      sessionStorage.setItem('categorizations_timestamp', Date.now().toString());

      setMessage({
        type: 'success',
        text: 'Event category updated successfully!',
      });
    } catch (err) {
      setMessage({
        type: 'error',
        text: err instanceof Error ? err.message : 'Failed to update category',
      });
    }
  };

  const handleEventSelect = (event: CalendarEventItem) => {
    if (event.isTask && event.taskId) {
      setSelectedTask({ id: event.taskId, title: event.title });
      setShowTaskModal(true);
    }
  };

  const handleDeleteTask = async () => {
    if (!selectedTask) return;

    try {
      await api.deleteTask(selectedTask.id);
      await refreshTasks();
      setMessage({
        type: 'success',
        text: 'Task deleted successfully!',
      });
    } catch (error) {
      setMessage({
        type: 'error',
        text: 'Failed to delete task',
      });
    } finally {
      setShowTaskModal(false);
      setSelectedTask(null);
    }
  };

  const handleUnscheduleTask = async () => {
    if (!selectedTask) return;

    try {
      // Update task status to unscheduled
      await api.updateTask(selectedTask.id, { status: 'unscheduled' });
      await refreshTasks();
      setMessage({
        type: 'success',
        text: 'Task unscheduled successfully!',
      });
    } catch (error) {
      setMessage({
        type: 'error',
        text: 'Failed to unschedule task',
      });
    } finally {
      setShowTaskModal(false);
      setSelectedTask(null);
    }
  };

  const handleRescheduleTask = async (taskId: string, start: Date, end: Date) => {
    try {
      await api.rescheduleTask(taskId, start.toISOString(), end.toISOString());
      // Refresh both tasks and calendar events to show the updated schedule
      await Promise.all([
        refreshTasks(),
        fetchExternalEvents(),
      ]);
      setMessage({
        type: 'success',
        text: 'Task rescheduled successfully!',
      });
    } catch (error) {
      setMessage({
        type: 'error',
        text: error instanceof Error ? error.message : 'Failed to reschedule task',
      });
      throw error; // Re-throw so the calendar knows it failed
    }
  };

  const handleCompleteTaskById = async (taskId: string) => {
    // Clear preview if this task is being previewed
    if (previewTask?.id === taskId) {
      setPreviewTask(null);
      setPreviewSlot(null);
    }

    try {
      await api.completeTask(taskId);
      await refreshTasks();
      setMessage({
        type: 'success',
        text: 'Task completed!',
      });
    } catch (error) {
      setMessage({
        type: 'error',
        text: 'Failed to complete task',
      });
    }
  };

  const handleEditTaskById = (taskId: string) => {
    // TODO: Navigate to task edit page or show edit modal
    console.log('Edit task:', taskId);
    setMessage({
      type: 'success',
      text: 'Edit functionality coming soon!',
    });
  };

  const handleUnscheduleTaskById = async (taskId: string) => {
    try {
      await api.updateTask(taskId, { status: 'unscheduled' });
      await refreshTasks();
      await fetchExternalEvents();
      setMessage({
        type: 'success',
        text: 'Task unscheduled successfully!',
      });
    } catch (error) {
      setMessage({
        type: 'error',
        text: 'Failed to unschedule task',
      });
    }
  };

  const handleDeleteTaskById = async (taskId: string) => {
    // Clear preview if this task is being previewed
    if (previewTask?.id === taskId) {
      setPreviewTask(null);
      setPreviewSlot(null);
    }

    try {
      await api.deleteTask(taskId);
      await refreshTasks();
      await fetchExternalEvents();
      setMessage({
        type: 'success',
        text: 'Task deleted successfully!',
      });
    } catch (error) {
      setMessage({
        type: 'error',
        text: 'Failed to delete task',
      });
    }
  };

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 6 },
    })
  );

  const handleDragStart = (event: any) => {
    // Find the task being dragged
    const taskId = event.active.id.replace('task-', '');
    const task = tasks.find((t) => t.id === taskId) || event.active.data?.current?.task;
    if (task) {
      setActiveDragTask(task);
    }
  };

  const handleConfirmSchedule = async () => {
    if (!previewTask || !previewSlot) return;

    setIsSchedulingFromPreview(true);

    try {
      await handleRescheduleTask(
        previewTask.id,
        previewSlot.start,
        previewSlot.end
      );

      // Clear preview on success
      setPreviewTask(null);
      setPreviewSlot(null);
    } catch (error) {
      console.error('Failed to schedule task:', error);
      // Keep preview open on error so user can retry
    } finally {
      setIsSchedulingFromPreview(false);
    }
  };

  const handleCancelPreview = () => {
    setPreviewTask(null);
    setPreviewSlot(null);
  };

  const handleDragEnd = async (event: any) => {
    const { active, over } = event;

    if (!over) {
      setActiveDragTask(null);
      return;
    }

    const slotData = over.data?.current;

    if (slotData?.slotStart) {
      const taskId = active.id.replace('task-', '');
      const task = activeDragTask || tasks.find((t) => t.id === taskId);

      if (task) {
        const durationMinutes = task.durationMinutes || 30;
        const slotStart = slotData.slotStart;
        const slotEnd = new Date(slotStart.getTime() + durationMinutes * 60000);

        // Set preview state instead of immediately scheduling
        setPreviewTask(task);
        setPreviewSlot({ start: slotStart, end: slotEnd });
      }
    }

    setActiveDragTask(null);
  };

  return (
    <Layout>
      <div className="flex flex-col -mx-4 -my-6" style={{ height: 'calc(100vh - 140px)' }}>
        {/* Header */}
        <div className="px-6 py-5 flex-shrink-0 bg-gradient-to-r from-slate-50 via-primary-50/30 to-blue-50/30 border-b border-slate-200">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-2">
                <h1 className="page-title bg-gradient-to-r from-slate-900 via-primary-700 to-blue-700 bg-clip-text text-transparent">
                  Calendar
                </h1>
                <motion.div
                  animate={reduceMotion ? { y: 0 } : { y: [0, -4, 0] }}
                  transition={
                    reduceMotion
                      ? { duration: 0 }
                      : {
                          duration: 1.5,
                          repeat: Infinity,
                          ease: 'easeInOut',
                        }
                  }
                >
                  <svg className="w-8 h-8 text-primary-500" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M11 3a1 1 0 10-2 0v1a1 1 0 102 0V3zM15.657 5.757a1 1 0 00-1.414-1.414l-.707.707a1 1 0 001.414 1.414l.707-.707zM18 10a1 1 0 01-1 1h-1a1 1 0 110-2h1a1 1 0 011 1zM5.05 6.464A1 1 0 106.464 5.05l-.707-.707a1 1 0 00-1.414 1.414l.707.707zM5 10a1 1 0 01-1 1H3a1 1 0 110-2h1a1 1 0 011 1zM8 16v-1h4v1a2 2 0 11-4 0zM12 14c.015-.34.208-.646.477-.859a4 4 0 10-4.954 0c.27.213.462.519.476.859h4.002z" />
                  </svg>
                </motion.div>
              </div>
              <p className="page-subtitle">
                AI-powered calendar with smart scheduling and intelligent time management
              </p>
            </div>
            <div className="flex flex-col gap-5">
              <div className="flex items-center gap-5">
                <a
                  href="/categories"
                  className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white/80 px-3 py-2 text-xs font-medium text-slate-700 hover:border-primary-200 hover:text-primary-700"
                >
                  Train categories
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </a>
                <div className="flex items-center gap-4">
                  <button
                    onClick={handleCategorizeEvents}
                    disabled={categorizingEvents || externalEvents.length === 0}
                    title="Use AI to categorize all calendar events. Re-runs categorization for all events."
                    className="bg-blue-600 text-white px-5 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50 font-medium flex items-center gap-2"
                  >
                    {categorizingEvents ? (
                      <>
                        <svg
                          className="animate-spin w-4 h-4"
                          fill="none"
                          viewBox="0 0 24 24"
                        >
                          <circle
                            className="opacity-25"
                            cx="12"
                            cy="12"
                            r="10"
                            stroke="currentColor"
                            strokeWidth="4"
                          />
                          <path
                            className="opacity-75"
                            fill="currentColor"
                            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                          />
                        </svg>
                        Categorizing...
                      </>
                    ) : (
                      <>
                        <svg
                          className="w-4 h-4"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z"
                          />
                        </svg>
                        Categorize Events
                      </>
                    )}
                  </button>
                  <button
                    onClick={handleSmartSchedule}
                    disabled={scheduling || unscheduledTasks.length === 0}
                    className="bg-primary-600 text-white px-6 py-2 rounded-lg hover:bg-primary-700 disabled:opacity-50 font-medium flex items-center gap-2"
                  >
                    {scheduling ? (
                      <>
                        <svg
                          className="animate-spin w-5 h-5"
                          fill="none"
                          viewBox="0 0 24 24"
                        >
                          <circle
                            className="opacity-25"
                            cx="12"
                            cy="12"
                            r="10"
                            stroke="currentColor"
                            strokeWidth="4"
                          />
                          <path
                            className="opacity-75"
                            fill="currentColor"
                            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                          />
                        </svg>
                        Scheduling...
                      </>
                    ) : (
                      <>
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
                            d="M13 10V3L4 14h7v7l9-11h-7z"
                          />
                        </svg>
                        Smart Schedule ({unscheduledTasks.length})
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* Category Legend */}
              <div className="flex items-center justify-center gap-4 text-xs">
                {categories.slice(0, 4).map((cat) => (
                  <div key={cat.id} className="flex items-center gap-2">
                    <span
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: cat.color }}
                    ></span>
                    <span className="text-slate-600 font-medium">{cat.name}</span>
                  </div>
                ))}
                {categories.length > 4 && (
                  <span className="text-slate-400">+{categories.length - 4}</span>
                )}
                <div className="w-px h-4 bg-slate-300 mx-2"></div>
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded bg-slate-500"></span>
                  <span className="text-slate-600 font-medium">Events</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Messages */}
        {message && (
          <div
            className={`mx-6 mb-4 px-4 py-3 rounded-lg flex-shrink-0 ${
              message.type === 'success'
                ? 'bg-green-50 border border-green-200 text-green-700'
                : 'bg-red-50 border border-red-200 text-red-700'
            }`}
          >
            {message.text}
          </div>
        )}

        {/* Dashboard Layout: Left Rail + Main Panel */}
        <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
          <div className="grid grid-cols-12 flex-1 overflow-hidden bg-white">
            {/* Left Rail - Panels */}
            <div className="col-span-12 lg:col-span-2 xl:col-span-2 flex flex-col h-full border-r border-slate-200">
              <MiniCalendar
                events={externalEvents}
                tasks={tasks}
                selectedDate={calendarDate}
                onDateClick={setCalendarDate}
              />
              <TimeBreakdown tasks={tasks.filter((t) => t.status === 'scheduled')} />
              <UpcomingEventsPanel events={externalEvents} />
              <UnscheduledTasksPanel
                tasks={unscheduledTasks}
                onCompleteTask={handleCompleteTaskById}
                onDeleteTask={handleDeleteTaskById}
              />
              <PlanMeetingsPanel />
            </div>

            {/* Main Panel - Calendar */}
            <div className="col-span-12 lg:col-span-10 xl:col-span-10 h-full overflow-hidden">
              {tasksLoading || eventsLoading ? (
                <div className="h-full surface-card rounded-lg flex items-center justify-center">
                  <div className="text-muted">Loading calendar...</div>
                </div>
              ) : (
                <CalendarView
                  tasks={tasks}
                  externalEvents={externalEvents}
                  eventCategorizations={eventCategorizations}
                  categories={categories}
                  selectedDate={calendarDate}
                  onSelectEvent={handleEventSelect}
                  onRescheduleTask={handleRescheduleTask}
                  onCompleteTask={handleCompleteTaskById}
                  onEditTask={handleEditTaskById}
                  onUnscheduleTask={handleUnscheduleTaskById}
                  onDeleteTask={handleDeleteTaskById}
                  onCategoryChange={handleCategoryChange}
                />
              )}
            </div>
          </div>

          {/* Drag Overlay */}
          <DragOverlay dropAnimation={null}>
            {activeDragTask ? (
              <div className="rounded-lg border border-primary-200 bg-white shadow-xl px-4 py-3 w-64">
                <p className="text-sm font-semibold text-slate-800">{activeDragTask.title}</p>
                <p className="text-xs text-slate-600 mt-1">
                  {activeDragTask.durationMinutes} min{' '}
                  {activeDragTask.category ? `• ${activeDragTask.category.name}` : ''}
                </p>
              </div>
            ) : null}
          </DragOverlay>
        </DndContext>
      </div>

      {/* Task Action Modal */}
      {showTaskModal && selectedTask && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl p-6 max-w-md w-full mx-4">
            <h3 className="text-xl font-bold text-slate-800 mb-2">Task Actions</h3>
            <p className="text-slate-600 mb-6">{selectedTask.title}</p>

            <div className="space-y-3">
              <button
                onClick={handleUnscheduleTask}
                className="w-full bg-amber-500 text-white px-4 py-3 rounded-lg hover:bg-amber-600 font-medium flex items-center justify-center gap-2"
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
                    d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
                Unschedule Task
              </button>

              <button
                onClick={handleDeleteTask}
                className="w-full bg-red-500 text-white px-4 py-3 rounded-lg hover:bg-red-600 font-medium flex items-center justify-center gap-2"
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
                    d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                  />
                </svg>
                Delete Task Permanently
              </button>

              <button
                onClick={() => {
                  setShowTaskModal(false);
                  setSelectedTask(null);
                }}
                className="w-full bg-slate-200 text-slate-700 px-4 py-3 rounded-lg hover:bg-slate-300 font-medium"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Task Schedule Preview Modal */}
      {previewTask && previewSlot && (
        <TaskSchedulePreview
          task={previewTask}
          slot={previewSlot}
          onConfirm={handleConfirmSchedule}
          onCancel={handleCancelPreview}
          isScheduling={isSchedulingFromPreview}
        />
      )}

      <FloatingAssistantButton />
    </Layout>
  );
}
