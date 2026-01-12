'use client';

import { useState, useEffect, useMemo } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { DndContext, DragOverlay, useSensors, useSensor, PointerSensor } from '@dnd-kit/core';
import { Layout } from '@/components/Layout';
import { CalendarView } from '@/components/CalendarView';
import { FloatingAssistantButton } from '@/components/FloatingAssistantButton';
import { MiniCalendar } from '@/components/MiniCalendar';
import { TimeBreakdown } from '@/components/TimeBreakdown';
import { UpcomingEventsPanel } from '@/components/UpcomingEventsPanel';
import { UnscheduledTasksPanel } from '@/components/UnscheduledTasksPanel';
import { MeetingManagementPanel } from '@/components/MeetingManagementPanel';
import { TaskSchedulePreview } from '@/components/TaskSchedulePreview';
import { CalendarFiltersPopover } from '@/components/CalendarFiltersPopover';
import { Button, Input, Select, Textarea, Label } from '@/components/ui';
import { useTasks } from '@/hooks/useTasks';
import { useUser } from '@/hooks/useUser';
import * as api from '@/lib/api';
import { filterExternalEvents } from './calendarEventFilters';
import type { CalendarEvent, ScheduledHabitInstance, Task, HabitInsightsSummary } from '@timeflow/shared';
import { track, hashHabitId } from '@/lib/analytics';

export default function CalendarPage() {
  const reduceMotion = useReducedMotion();
  const { tasks, loading: tasksLoading, refresh: refreshTasks } = useTasks();
  const { user } = useUser();
  const [externalEvents, setExternalEvents] = useState<CalendarEvent[]>([]);
  const [scheduledHabitInstances, setScheduledHabitInstances] = useState<ScheduledHabitInstance[]>([]);
  const [habitInsights, setHabitInsights] = useState<HabitInsightsSummary | null>(null);
  const [eventsLoading, setEventsLoading] = useState(true);
  const [eventCategorizations, setEventCategorizations] = useState<Record<string, api.EventCategorization>>({});
  const [categories, setCategories] = useState<Array<{ id: string; name: string; color: string; order: number }>>([]);
  const [scheduling, setScheduling] = useState(false);
  const [categorizingEvents, setCategorizingEvents] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [activeDragTask, setActiveDragTask] = useState<any | null>(null);
  const [calendarDate, setCalendarDate] = useState(new Date());
  // Preview state for drag-and-drop scheduling
  const [previewTask, setPreviewTask] = useState<Task | null>(null);
  const [previewSlot, setPreviewSlot] = useState<{ start: Date; end: Date } | null>(null);
  const [isSchedulingFromPreview, setIsSchedulingFromPreview] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [editingState, setEditingState] = useState<{
    title: string;
    description: string;
    durationMinutes: number;
    priority: 1 | 2 | 3;
    dueDate: string;
    categoryId: string;
  } | null>(null);
  const [editingSubmitting, setEditingSubmitting] = useState(false);
  // Filter state
  const [selectedCategories, setSelectedCategories] = useState<Set<string>>(new Set());
  const [showEvents, setShowEvents] = useState(true);

  // Fetch calendar events for the current month (now includes tasks, habits, and external events from merged backend)
  // The backend getEvents endpoint returns merged events with source tracking
  const fetchExternalEvents = async () => {
    try {
      setEventsLoading(true);
      const now = new Date();
      const start = new Date(now.getFullYear(), now.getMonth(), 1);
      const end = new Date(now.getFullYear(), now.getMonth() + 2, 0); // End of next month
      const startIso = start.toISOString();
      const endIso = end.toISOString();

      let events: CalendarEvent[] = [];
      let habitInstances: ScheduledHabitInstance[] = [];

      try {
        events = await api.getCalendarEvents(startIso, endIso);
      } catch (err) {
        console.error('Failed to fetch calendar events:', err);
      }

      if (user?.id) {
        try {
          habitInstances = await api.getScheduledHabitInstances(startIso, endIso);
        } catch (err) {
          console.error('Failed to fetch scheduled habit instances:', err);
        }
      } else {
        habitInstances = [];
      }

      setScheduledHabitInstances(habitInstances);
      setExternalEvents(events);
    } finally {
      setEventsLoading(false);
    }
  };

  // Fetch habit insights for streak context
  const fetchHabitInsights = async () => {
    if (!user?.id) return;
    try {
      const insights = await api.getHabitInsights(14);
      setHabitInsights(insights);
    } catch (err) {
      console.error('Failed to fetch habit insights:', err);
    }
  };

  // Fetch categories on mount
  useEffect(() => {
    async function fetchCategories() {
      try {
        const cats = await api.getCategories();
        setCategories(cats);
        // Initialize all categories as selected
        setSelectedCategories(new Set(cats.map(c => c.id)));
      } catch (err) {
        console.error('Failed to fetch categories:', err);
      }
    }

    fetchCategories();
    fetchExternalEvents();
    fetchHabitInsights();
  }, [user?.id]);

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

  // Create mapping from habitId to streak metrics for popover display
  const habitStreakMap = useMemo(() => {
    if (!habitInsights) return new Map();
    const map = new Map<string, { current: number; atRisk: boolean }>();
    habitInsights.habits.forEach(habit => {
      map.set(habit.habitId, {
        current: habit.streak.current,
        atRisk: habit.streak.atRisk,
      });
    });
    return map;
  }, [habitInsights]);
  const timeflowEventIds = useMemo(() => {
    const ids = new Set<string>();

    // Add task event IDs
    tasks.forEach((task) => {
      if (task.scheduledTask?.eventId) {
        ids.add(task.scheduledTask.eventId);
      }
    });

    // Add habit event IDs from the scheduled habit API to ensure deduping even if backend data lags
    scheduledHabitInstances.forEach((instance) => {
      if (instance.eventId) {
        ids.add(instance.eventId);
      }
    });

    // Add habit event IDs from merged backend response
    // This prevents duplicates since habits exist both in our DB and in Google Calendar
    externalEvents.forEach((event) => {
      if (event.sourceType === 'habit' && event.id) {
        ids.add(event.id);
      }
    });

    return ids;
  }, [tasks, externalEvents, scheduledHabitInstances]);
  const displayExternalEvents = useMemo(() => {
    return filterExternalEvents(externalEvents, timeflowEventIds, {
      prefixEnabled: user?.eventPrefixEnabled ?? true,
      prefix: user?.eventPrefix ?? null,
      scheduledHabitInstances,
    });
  }, [
    externalEvents,
    timeflowEventIds,
    user?.eventPrefixEnabled,
    user?.eventPrefix,
    scheduledHabitInstances,
  ]);

  // Filtered events based on category selection and show events toggle
  const filteredExternalEvents = useMemo(() => {
    if (!showEvents) return [];
    if (selectedCategories.size === 0) return [];
    if (selectedCategories.size === categories.length) return displayExternalEvents;

    return displayExternalEvents.filter((event) => {
      if (!event.id) return false;
      const categorization = eventCategorizations[event.id];
      if (!categorization) return true; // Show uncategorized events
      return selectedCategories.has(categorization.categoryId);
    });
  }, [displayExternalEvents, showEvents, selectedCategories, eventCategorizations, categories.length]);

  // Fetch event categorizations with caching and background auto-categorization
  useEffect(() => {
    async function fetchCategorizations() {
      if (displayExternalEvents.length === 0) return;

      const eventIds = displayExternalEvents.map(e => e.id).filter((id): id is string => Boolean(id));
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
  }, [displayExternalEvents]);


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
    if (displayExternalEvents.length === 0) {
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
      const eventIds = displayExternalEvents.map(e => e.id).filter((id): id is string => Boolean(id));
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
      const eventIds = displayExternalEvents.map(e => e.id).filter((id): id is string => Boolean(id));
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

  const handleCompleteHabitById = async (scheduledHabitId: string, actualDurationMinutes?: number) => {
    try {
      // Find habitId for analytics
      const habitInstance = scheduledHabitInstances.find(
        inst => inst.scheduledHabitId === scheduledHabitId
      );

      await api.completeHabitInstance(scheduledHabitId, actualDurationMinutes);
      await Promise.all([
        fetchExternalEvents(), // Refresh to get updated completion status
        fetchHabitInsights(), // Refresh streak data
      ]);

      // Track completion (privacy-safe: hashed ID only, no title)
      if (habitInstance) {
        track('habit.instance.complete', {
          habit_id_hash: hashHabitId(habitInstance.habitId)
        });
      }

      setMessage({
        type: 'success',
        text: 'Habit completed!',
      });
    } catch (error) {
      setMessage({
        type: 'error',
        text: 'Failed to complete habit',
      });
    }
  };

  const handleUndoHabitById = async (scheduledHabitId: string) => {
    try {
      // Find habitId for analytics
      const habitInstance = scheduledHabitInstances.find(
        inst => inst.scheduledHabitId === scheduledHabitId
      );

      await api.undoHabitInstance(scheduledHabitId);
      await Promise.all([
        fetchExternalEvents(), // Refresh to get updated completion status
        fetchHabitInsights(), // Refresh streak data
      ]);

      // Track undo (privacy-safe: hashed ID only)
      if (habitInstance) {
        track('habit.instance.undo', {
          habit_id_hash: hashHabitId(habitInstance.habitId)
        });
      }

      setMessage({
        type: 'success',
        text: 'Habit completion undone',
      });
    } catch (error) {
      setMessage({
        type: 'error',
        text: 'Failed to undo habit',
      });
    }
  };

  const handleSkipHabitById = async (scheduledHabitId: string, reasonCode: any) => {
    try {
      // Find habitId for analytics
      const habitInstance = scheduledHabitInstances.find(
        inst => inst.scheduledHabitId === scheduledHabitId
      );

      await api.skipHabitInstance(scheduledHabitId, reasonCode);
      await Promise.all([
        fetchExternalEvents(), // Refresh to get updated completion status
        fetchHabitInsights(), // Refresh streak data
      ]);

      // Track skip (privacy-safe: hashed ID + preset reason code only)
      if (habitInstance) {
        track('habit.instance.skip', {
          habit_id_hash: hashHabitId(habitInstance.habitId),
          reason_code: reasonCode
        });
      }

      setMessage({
        type: 'success',
        text: 'Habit skipped',
      });
    } catch (error) {
      setMessage({
        type: 'error',
        text: 'Failed to skip habit',
      });
    }
  };

  const handleEditTaskById = (taskId: string) => {
    const task = tasks.find((t) => t.id === taskId);
    if (!task) {
      setMessage({
        type: 'error',
        text: 'Task not found.',
      });
      return;
    }
    setEditingTask(task);
    setEditingState({
      title: task.title,
      description: task.description ?? '',
      durationMinutes: task.durationMinutes,
      priority: task.priority as 1 | 2 | 3,
      dueDate: task.dueDate ? task.dueDate.slice(0, 10) : '',
      categoryId: task.categoryId ?? '',
    });
  };

  const closeEditModal = () => {
    setEditingTask(null);
    setEditingState(null);
    setEditingSubmitting(false);
  };

  const handleUpdateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingTask || !editingState?.title.trim()) return;
    setEditingSubmitting(true);

    try {
      await api.updateTask(editingTask.id, {
        title: editingState.title.trim(),
        description: editingState.description.trim() || undefined,
        durationMinutes: editingState.durationMinutes,
        priority: editingState.priority,
        dueDate: editingState.dueDate || undefined,
        categoryId: editingState.categoryId || undefined,
      });
      await Promise.all([refreshTasks(), fetchExternalEvents()]);
      setMessage({
        type: 'success',
        text: 'Task updated successfully!',
      });
      closeEditModal();
    } catch (error) {
      setMessage({
        type: 'error',
        text: error instanceof Error ? error.message : 'Failed to update task',
      });
      setEditingSubmitting(false);
    }
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

  // Filter handlers
  const handleCategoryToggle = (categoryId: string) => {
    const newSelected = new Set(selectedCategories);
    if (newSelected.has(categoryId)) {
      newSelected.delete(categoryId);
    } else {
      newSelected.add(categoryId);
    }
    setSelectedCategories(newSelected);
  };

  const handleToggleEvents = () => {
    setShowEvents(!showEvents);
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
                <CalendarFiltersPopover
                  categories={categories}
                  selectedCategories={selectedCategories}
                  onCategoryToggle={handleCategoryToggle}
                  showEvents={showEvents}
                  onToggleEvents={handleToggleEvents}
                />
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
                    disabled={categorizingEvents || displayExternalEvents.length === 0}
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
          <div className="grid grid-cols-12 flex-1 overflow-hidden bg-slate-50">
            {/* Left Rail - Unified Sidebar Panel */}
            <div className="col-span-12 lg:col-span-2 xl:col-span-2 flex flex-col h-full overflow-y-auto bg-white">
              <div className="p-4 space-y-6">
                {/* Remove border-b from child components via CSS override */}
                <style jsx>{`
                  div :global(.border-b) {
                    border-bottom: none !important;
                  }
                  div :global(.bg-white) {
                    background: transparent !important;
                  }
                  div :global(.p-3) {
                    padding: 0 !important;
                  }
                `}</style>

                <div>
                  <MiniCalendar
                    events={filteredExternalEvents}
                    tasks={tasks}
                    selectedDate={calendarDate}
                    onDateClick={setCalendarDate}
                  />
                </div>

                <div className="border-t border-slate-100 pt-6">
                  <TimeBreakdown tasks={tasks.filter((t) => t.status === 'scheduled')} />
                </div>

                <div className="border-t border-slate-100 pt-6">
                  <UpcomingEventsPanel events={filteredExternalEvents} />
                </div>

                <div className="border-t border-slate-100 pt-6">
                  <UnscheduledTasksPanel
                    tasks={unscheduledTasks}
                    onCompleteTask={handleCompleteTaskById}
                    onDeleteTask={handleDeleteTaskById}
                  />
                </div>

                <div className="border-t border-slate-100 pt-6">
                  <MeetingManagementPanel />
                </div>
              </div>
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
                  externalEvents={filteredExternalEvents}
                  eventCategorizations={eventCategorizations}
                  categories={categories}
                  habitStreakMap={habitStreakMap}
                  scheduledHabitInstances={scheduledHabitInstances}
                  selectedDate={calendarDate}
                  onRescheduleTask={handleRescheduleTask}
                  onCompleteTask={handleCompleteTaskById}
                  onCompleteHabit={handleCompleteHabitById}
                  onUndoHabit={handleUndoHabitById}
                  onSkipHabit={handleSkipHabitById}
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

      <AnimatePresence>
        {editingTask && editingState && (
          <motion.div
            className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4"
            initial={{ opacity: reduceMotion ? 1 : 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: reduceMotion ? 1 : 0 }}
          >
            <motion.div
              className="w-full max-w-lg bg-white rounded-lg shadow-xl border border-slate-200"
              initial={reduceMotion ? false : { y: 20, opacity: 0 }}
              animate={reduceMotion ? { opacity: 1 } : { y: 0, opacity: 1 }}
              exit={reduceMotion ? { opacity: 1 } : { y: 10, opacity: 0 }}
              transition={{ duration: reduceMotion ? 0 : 0.18, ease: 'easeOut' }}
            >
              <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200">
                <div>
                  <p className="text-xs uppercase tracking-wide text-slate-500">Edit task</p>
                  <h3 className="text-lg font-semibold text-slate-800 truncate">{editingTask.title}</h3>
                </div>
                <button
                  onClick={closeEditModal}
                  className="text-slate-400 hover:text-slate-600"
                  aria-label="Close edit modal"
                >
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <form onSubmit={handleUpdateSubmit} className="px-5 py-4 space-y-4">
                <div className="space-y-2">
                  <Label required>Title</Label>
                  <Input
                    type="text"
                    value={editingState.title}
                    onChange={(e) =>
                      setEditingState((prev) => prev && { ...prev, title: e.target.value })
                    }
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label optional>Description</Label>
                  <Textarea
                    value={editingState.description}
                    onChange={(e) =>
                      setEditingState((prev) => prev && { ...prev, description: e.target.value })
                    }
                    rows={2}
                    placeholder="Optional description"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Category</Label>
                    <Select
                      value={editingState.categoryId}
                      onChange={(e) =>
                        setEditingState((prev) => prev && { ...prev, categoryId: e.target.value })
                      }
                    >
                      <option value="">No category</option>
                      {categories.map((cat) => (
                        <option key={cat.id} value={cat.id}>
                          {cat.name}
                        </option>
                      ))}
                    </Select>
                    <a href="/categories" className="text-xs text-primary-600 hover:text-primary-700 mt-1 inline-block">
                      Manage categories
                    </a>
                  </div>

                  <div>
                    <Label>Duration</Label>
                    <Select
                      value={editingState.durationMinutes}
                      onChange={(e) =>
                        setEditingState(
                          (prev) => prev && { ...prev, durationMinutes: Number(e.target.value) }
                        )
                      }
                    >
                      <option value={15}>15 min</option>
                      <option value={30}>30 min</option>
                      <option value={45}>45 min</option>
                      <option value={60}>1 hour</option>
                      <option value={90}>1.5 hours</option>
                      <option value={120}>2 hours</option>
                      <option value={180}>3 hours</option>
                    </Select>
                  </div>

                  <div>
                    <Label>Priority</Label>
                    <Select
                      value={editingState.priority}
                      onChange={(e) =>
                        setEditingState(
                          (prev) => prev && { ...prev, priority: Number(e.target.value) as 1 | 2 | 3 }
                        )
                      }
                    >
                      <option value={1}>High</option>
                      <option value={2}>Medium</option>
                      <option value={3}>Low</option>
                    </Select>
                  </div>

                  <div>
                    <Label>Due Date</Label>
                    <Input
                      type="date"
                      value={editingState.dueDate}
                      onChange={(e) =>
                        setEditingState((prev) => prev && { ...prev, dueDate: e.target.value })
                      }
                    />
                  </div>
                </div>

                <div className="flex justify-end gap-3 pt-2">
                  <Button type="button" onClick={closeEditModal} variant="ghost">
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    disabled={editingSubmitting || !editingState.title.trim()}
                    variant="primary"
                    loading={editingSubmitting}
                  >
                    {editingSubmitting ? 'Saving...' : 'Save changes'}
                  </Button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <FloatingAssistantButton />
    </Layout>
  );
}
