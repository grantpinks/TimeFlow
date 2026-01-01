/**
 * Today Page v2
 *
 * 3-column layout for daily planning ritual:
 * - Left: Inbox (unscheduled tasks)
 * - Middle: Hourly timeline
 * - Right: AI context/quick chat
 */

'use client';

import { useState, useEffect, useMemo, memo } from 'react';
import { DndContext, DragOverlay, PointerSensor, KeyboardSensor, useDraggable, useSensor, useSensors } from '@dnd-kit/core';
import { motion, useReducedMotion } from 'framer-motion';
import { Layout } from '@/components/Layout';
import { FloatingAssistantButton } from '@/components/FloatingAssistantButton';
import { HourlyTimeline } from '@/components/HourlyTimeline';
import { EmailViewer } from '@/components/EmailViewer';
import { EmailComposer } from '@/components/EmailComposer';
import { Panel, SectionHeader } from '@/components/ui';
import { useTasks } from '@/hooks/useTasks';
import { useUser } from '@/hooks/useUser';
import * as api from '@/lib/api';
import type { EmailCategoryConfig } from '@/lib/api';
import { getCachedEmails, cacheEmails, clearEmailCache } from '@/lib/emailCache';
import { track } from '@/lib/analytics';
import type { CalendarEvent, HabitSuggestionBlock, EmailMessage, Task, FullEmailMessage, EmailCategory } from '@timeflow/shared';

export default function TodayPage() {
  const { user, isAuthenticated } = useUser();
  const { tasks, loading: tasksLoading, refresh: refreshTasks, completeTask } = useTasks();
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [eventsLoading, setEventsLoading] = useState(true);
  const [showBanner, setShowBanner] = useState(true);
  const [habitSuggestions, setHabitSuggestions] = useState<HabitSuggestionBlock[]>([]);
  const [habitSuggestionsLoading, setHabitSuggestionsLoading] = useState(true);
  const [habitSuggestionsError, setHabitSuggestionsError] = useState<string | null>(null);
  const [emails, setEmails] = useState<EmailMessage[]>([]);
  const [focusedEmailsOnly, setFocusedEmailsOnly] = useState(false);
  const [inboxLoading, setInboxLoading] = useState(true);
  const [inboxError, setInboxError] = useState<string | null>(null);
  const [nextEmailPageToken, setNextEmailPageToken] = useState<string | undefined>();
  const [loadingMoreEmails, setLoadingMoreEmails] = useState(false);
  const [emailSearchQuery, setEmailSearchQuery] = useState('');
  const [selectedEmailId, setSelectedEmailId] = useState<string | null>(null);
  const [emailViewerOpen, setEmailViewerOpen] = useState(false);
  const [emailComposerOpen, setEmailComposerOpen] = useState(false);
  const [replyToEmail, setReplyToEmail] = useState<FullEmailMessage | null>(null);
  const [emailCategories, setEmailCategories] = useState<EmailCategoryConfig[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<EmailCategory | 'all'>('all');
  const [activeDragTask, setActiveDragTask] = useState<Task | null>(null);
  const prefersReducedMotion = useReducedMotion();

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 6 },
    }),
    useSensor(KeyboardSensor, {
      // coordinateGetter: sortableKeyboardCoordinates, // For custom keyboard behavior if needed
    })
  );

  // Load banner dismissal state from localStorage
  useEffect(() => {
    const dismissed = localStorage.getItem('todayBannerDismissed');
    if (dismissed === 'true') {
      setShowBanner(false);
    }
  }, []);

  const handleDismissBanner = () => {
    setShowBanner(false);
    localStorage.setItem('todayBannerDismissed', 'true');
  };

  // Fetch today's calendar events
  const fetchTodayEvents = async () => {
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
  };

  useEffect(() => {
    if (isAuthenticated) {
      fetchTodayEvents();
    }
  }, [isAuthenticated]);

  // Fetch habit scheduling suggestions (read-only)
  useEffect(() => {
    async function fetchSuggestions() {
      try {
        setHabitSuggestionsLoading(true);
        const res = await api.getHabitSuggestions();
        setHabitSuggestions(res.suggestions);
        setHabitSuggestionsError(null);
      } catch (err) {
        setHabitSuggestionsError(
          err instanceof Error ? err.message : 'Failed to load habit suggestions'
        );
      } finally {
        setHabitSuggestionsLoading(false);
      }
    }

    if (isAuthenticated) {
      fetchSuggestions();
    }
  }, [isAuthenticated]);

  // Fetch inbox emails (Gmail) with 5-minute cache
  useEffect(() => {
    async function fetchInbox() {
      try {
        setInboxLoading(true);

        // Check cache first
        const cached = getCachedEmails();
        if (cached) {
          // Use cached data
          setEmails(cached.messages);
          setNextEmailPageToken(cached.nextPageToken);
          setInboxError(null);
          setInboxLoading(false);
          return;
        }

        // No cache or expired - fetch from API
        const res = await api.getInboxEmails({ maxResults: 50 });
        setEmails(res.messages);
        setNextEmailPageToken(res.nextPageToken);
        setInboxError(null);

        // Cache the result
        cacheEmails(res);
      } catch (err) {
        setInboxError(err instanceof Error ? err.message : 'Failed to load inbox');
      } finally {
        setInboxLoading(false);
      }
    }

    if (isAuthenticated) {
      fetchInbox();
    }
  }, [isAuthenticated]);

  // Load more emails function
  const loadMoreEmails = async () => {
    if (!nextEmailPageToken || loadingMoreEmails) return;

    try {
      setLoadingMoreEmails(true);
      const res = await api.getInboxEmails({
        maxResults: 50,
        pageToken: nextEmailPageToken
      });
      setEmails(prev => [...prev, ...res.messages]);
      setNextEmailPageToken(res.nextPageToken);
    } catch (err) {
      console.error('Failed to load more emails:', err);
    } finally {
      setLoadingMoreEmails(false);
    }
  };

  // Refresh inbox emails (clears cache and fetches fresh data)
  const refreshInbox = async () => {
    try {
      setInboxLoading(true);
      clearEmailCache();
      const res = await api.getInboxEmails({ maxResults: 50 });
      setEmails(res.messages);
      setNextEmailPageToken(res.nextPageToken);
      setInboxError(null);
      cacheEmails(res);
    } catch (err) {
      setInboxError(err instanceof Error ? err.message : 'Failed to load inbox');
    } finally {
      setInboxLoading(false);
    }
  };

  // Fetch email categories on mount
  useEffect(() => {
    async function loadCategories() {
      try {
        const { categories } = await api.getEmailCategories();
        setEmailCategories(categories);
      } catch (err) {
        console.error('Failed to load email categories:', err);
      }
    }
    loadCategories();
  }, []);

  // Handle email click - open email viewer
  const handleEmailClick = (emailId: string) => {
    setSelectedEmailId(emailId);
    setEmailViewerOpen(true);
  };

  // Handle email reply
  const handleEmailReply = (email: FullEmailMessage) => {
    setReplyToEmail(email);
    setEmailComposerOpen(true);
  };

  // Handle email archive
  const handleEmailArchive = (emailId: string) => {
    // Remove from local state immediately for better UX
    setEmails((prev) => prev.filter((e) => e.id !== emailId));
    // Optionally clear cache to force refresh on next load
    clearEmailCache();
  };

  // Handle email mark as read
  const handleEmailMarkAsRead = (emailId: string, isRead: boolean) => {
    // Update local state
    setEmails((prev) =>
      prev.map((e) => (e.id === emailId ? { ...e, isRead } : e))
    );
    // Clear cache to ensure fresh data on next load
    clearEmailCache();
  };

  // Handle email sent
  const handleEmailSent = () => {
    // Refresh inbox to show sent email (if it's a reply)
    refreshInbox();
  };

  // Handle email search
  const handleEmailSearch = async (query: string) => {
    if (!query.trim()) {
      // If empty query, reload inbox
      await refreshInbox();
      return;
    }

    try {
      setInboxLoading(true);
      const res = await api.searchEmails(query, 50);
      setEmails(res.messages);
      setNextEmailPageToken(res.nextPageToken);
      setInboxError(null);
    } catch (err) {
      setInboxError(err instanceof Error ? err.message : 'Failed to search emails');
    } finally {
      setInboxLoading(false);
    }
  };

  // Redirect if not authenticated
  const now = new Date();
  const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const endOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);

  // Get unscheduled tasks (inbox)
  const unscheduledTasks = tasks.filter((task) => task.status === 'unscheduled');
  const scheduledTasks = tasks.filter((task) => task.status === 'scheduled');

  // Prioritize: due today first, then high priority, then rest
  const unscheduledDueToday = unscheduledTasks.filter((task) => {
    if (!task.dueDate) return false;
    const dueDate = new Date(task.dueDate);
    return dueDate >= startOfDay && dueDate < endOfDay;
  });

  const unscheduledHighPriority = unscheduledTasks.filter(
    (task) =>
      task.priority === 1 &&
      (!task.dueDate || new Date(task.dueDate) >= endOfDay)
  );

  const unscheduledOther = unscheduledTasks.filter(
    (task) =>
      !unscheduledDueToday.includes(task) &&
      !unscheduledHighPriority.includes(task)
  );

  const handleCompleteTask = async (taskId: string) => {
    try {
      await completeTask(taskId);
      await refreshTasks();
    } catch (err) {
      console.error('Failed to complete task:', err);
    }
  };

  const handleDragStart = (event: { active: { id: string; data: { current?: { task: Task } } } }) => {
    const task = event.active.data.current?.task ?? unscheduledTasks.find((t) => t.id === event.active.id);
    if (task) {
      setActiveDragTask(task);
    }
  };

  const handleDragEnd = async (event: { active: { id: string }; over: { data: { current?: { hour?: number } } } | null }) => {
    if (!event.over || typeof event.over.data.current?.hour !== 'number') {
      setActiveDragTask(null);
      return;
    }

    const droppedHour = event.over.data.current.hour;
    const task = unscheduledTasks.find((t) => t.id === event.active.id);
    if (!task) {
      setActiveDragTask(null);
      return;
    }

    const today = new Date();
    const start = new Date(today.getFullYear(), today.getMonth(), today.getDate(), droppedHour, 0, 0);
    const end = new Date(start.getTime() + task.durationMinutes * 60000);

    try {
      await api.rescheduleTask(task.id, start.toISOString(), end.toISOString());
      await refreshTasks();
      await fetchTodayEvents();
    } catch (err) {
      console.error('Failed to schedule task via drag-drop:', err);
    } finally {
      setActiveDragTask(null);
    }
  };

  const formatTimeRange = (start: string, end: string) => {
    const startDate = new Date(start);
    const endDate = new Date(end);
    return `${startDate.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
    })} - ${endDate.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
    })}`;
  };

  const formatShortDate = (iso: string) =>
    new Date(iso).toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
    });

  // Filter emails by focus mode and category (no hook to avoid render-order issues)
  const displayedEmails = (() => {
    let filtered = focusedEmailsOnly
      ? emails.filter((email) => !email.isPromotional && email.importance !== 'low')
      : emails;

    if (selectedCategory !== 'all') {
      filtered = filtered.filter((email) => email.category === selectedCategory);
    }

    return filtered;
  })();

  // Auth/loading guard placed after hooks to keep hook order consistent
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

  const updateSuggestionStatus = async (habitId: string, start: string, end: string, status: 'accepted' | 'rejected') => {
    // Optimistically update UI
    setHabitSuggestions((prev) =>
      prev.map((s) =>
        s.habitId === habitId && s.start === start
          ? { ...s, status }
          : s
      )
    );

    try {
      if (status === 'accepted') {
        await api.acceptHabitSuggestion({ habitId, start, end });
        // Refresh calendar events to show the new habit
        await fetchTodayEvents();
      } else {
        await api.rejectHabitSuggestion({ habitId, start });
      }
    } catch (err) {
      console.error('Failed to update habit suggestion:', err);
      // Revert UI on error
      setHabitSuggestions((prev) =>
        prev.map((s) =>
          s.habitId === habitId && s.start === start
            ? { ...s, status: 'proposed' }
            : s
        )
      );
    }
  };

  const loading = tasksLoading || eventsLoading;

  return (
    <Layout>
      <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
        <div className="max-w-[1600px] mx-auto space-y-6 px-4 sm:px-6 lg:px-8">
        {/* Page Header */}
        <div className="mb-6">
          <div className="flex items-baseline gap-3 mb-2">
            <h1 className="text-3xl font-bold text-slate-900">
              Today
            </h1>
            <span className="text-slate-600 font-medium text-base">
              {now.toLocaleDateString('en-US', {
                weekday: 'long',
                month: 'long',
                day: 'numeric',
              })}
            </span>
          </div>
          <p className="text-sm text-slate-600">
            {unscheduledTasks.length} tasks to schedule • {scheduledTasks.length} on timeline
          </p>
        </div>

        {/* Daily Planning Banner */}
        {showBanner && (
          <motion.div
            initial={prefersReducedMotion ? { opacity: 1 } : { opacity: 0, y: -20 }}
            animate={prefersReducedMotion ? { opacity: 1 } : { opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.1 }}
            className="bg-primary-50 rounded-lg border border-primary-100 p-5"
          >
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1">
                <h2 className="text-base font-semibold text-slate-900 mb-3">
                  Daily Planning Ritual
                </h2>
                <div className="flex flex-wrap gap-4 text-sm text-slate-700">
                  <div className="flex items-center gap-2">
                    <span className="flex-shrink-0 w-6 h-6 rounded-full bg-primary-600 text-white flex items-center justify-center text-xs font-semibold">
                      1
                    </span>
                    <span>Review your to-dos</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="flex-shrink-0 w-6 h-6 rounded-full bg-primary-600 text-white flex items-center justify-center text-xs font-semibold">
                      2
                    </span>
                    <span>Check your schedule</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="flex-shrink-0 w-6 h-6 rounded-full bg-primary-600 text-white flex items-center justify-center text-xs font-semibold">
                      3
                    </span>
                    <span>Ask AI for suggestions</span>
                  </div>
                </div>
              </div>
              <button
                onClick={handleDismissBanner}
                className="text-slate-400 hover:text-slate-600 transition-colors rounded-lg p-1"
                title="Dismiss"
                aria-label="Dismiss banner"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </motion.div>
        )}

        {loading ? (
          <div className="bg-gradient-to-br from-white to-slate-50 rounded-2xl shadow-lg border border-slate-200 p-16 text-center">
            <div className="animate-spin rounded-full h-14 w-14 border-4 border-primary-200 border-t-primary-600 mx-auto mb-5"></div>
            <p className="text-slate-600 font-medium text-lg">Loading today&apos;s schedule...</p>
          </div>
        ) : (
          <>
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* LEFT COLUMN: To Do & Habits (3 columns of 12) */}
            <div className="lg:col-span-3 space-y-5">
              <Panel>
                <SectionHeader
                  title="To Do"
                  count={unscheduledTasks.length}
                />

                <div className="space-y-3 max-h-[600px] overflow-y-auto">
                  {/* Due Today Section */}
                  {unscheduledDueToday.length > 0 && (
                    <div>
                      <h3 className="text-xs font-semibold text-amber-700 uppercase mb-2">
                        Due Today
                      </h3>
                      <div className="space-y-2">
                        {unscheduledDueToday.map((task) => (
                          <DraggableTaskCard
                            key={task.id}
                            task={task}
                            accentClass="bg-amber-50 border border-amber-200"
                            onComplete={() => handleCompleteTask(task.id)}
                            prefersReducedMotion={prefersReducedMotion}
                          />
                        ))}
                      </div>
                    </div>
                  )}

                  {/* High Priority Section */}
                  {unscheduledHighPriority.length > 0 && (
                    <div>
                      <h3 className="text-xs font-semibold text-red-700 uppercase mb-2">
                        High Priority
                      </h3>
                      <div className="space-y-2">
                        {unscheduledHighPriority.map((task) => (
                          <DraggableTaskCard
                            key={task.id}
                            task={task}
                            accentClass="bg-red-50 border border-red-200"
                            onComplete={() => handleCompleteTask(task.id)}
                            prefersReducedMotion={prefersReducedMotion}
                          />
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Other Tasks Section */}
                  {unscheduledOther.length > 0 && (
                    <div>
                      <h3 className="text-xs font-semibold text-slate-600 uppercase mb-2">
                        Other Tasks
                      </h3>
                      <div className="space-y-2">
                        {unscheduledOther.slice(0, 10).map((task) => (
                          <DraggableTaskCard
                            key={task.id}
                            task={task}
                            accentClass="bg-slate-50 border border-slate-200"
                            onComplete={() => handleCompleteTask(task.id)}
                            prefersReducedMotion={prefersReducedMotion}
                          />
                        ))}
                      </div>
                    </div>
                  )}

                  {unscheduledTasks.length === 0 && (
                    <div className="text-center py-8 text-slate-400">
                      <svg
                        className="w-12 h-12 mx-auto mb-2"
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
                      <p className="text-sm">Nothing to do right now</p>
                    </div>
                  )}
                </div>
              </Panel>

              {/* Habit Suggestions - Moved from right column */}
              <Panel padding="sm">
                <SectionHeader
                  title="Habit Suggestions"
                />
                {habitSuggestionsLoading ? (
                  <div className="flex items-center justify-center py-6">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
                  </div>
                ) : habitSuggestionsError ? (
                  <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg p-3">
                    {habitSuggestionsError}
                  </div>
                ) : habitSuggestions.length === 0 ? (
                  <div className="text-sm text-slate-500 py-4">
                    No active habits to suggest yet.
                  </div>
                ) : (
                  <div className="space-y-3 max-h-[360px] overflow-y-auto pr-1">
                    {habitSuggestions.map((suggestion) => (
                      <div
                        key={`${suggestion.habitId}-${suggestion.start}`}
                        className="border border-slate-200 rounded-lg p-3"
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex-1">
                            <p className="text-sm font-semibold text-slate-800">
                              {suggestion.habit.title}
                            </p>
                            <p className="text-xs text-slate-600 mt-0.5">
                              {formatShortDate(suggestion.start)} • {formatTimeRange(suggestion.start, suggestion.end)}
                            </p>
                            {suggestion.reason && (
                              <p className="text-xs text-amber-700 mt-1">{suggestion.reason}</p>
                            )}
                          </div>
                          <span className="text-[11px] px-2 py-0.5 rounded-full bg-primary-50 text-primary-700 border border-primary-100 whitespace-nowrap">
                            {suggestion.status}
                          </span>
                        </div>
                        <div className="flex gap-2 mt-3">
                          <button
                            onClick={() => updateSuggestionStatus(suggestion.habitId, suggestion.start, suggestion.end, 'accepted')}
                            className="px-3 py-1 text-xs rounded bg-primary-600 text-white hover:bg-primary-700 transition-colors disabled:opacity-60"
                            disabled={suggestion.status === 'accepted'}
                          >
                            {suggestion.status === 'accepted' ? '✓ Added' : `Add ${suggestion.habit.title}`}
                          </button>
                          <button
                            onClick={() => updateSuggestionStatus(suggestion.habitId, suggestion.start, suggestion.end, 'rejected')}
                            className="px-3 py-1 text-xs rounded bg-slate-200 text-slate-700 hover:bg-slate-300 transition-colors disabled:opacity-60"
                            disabled={suggestion.status === 'rejected'}
                          >
                            {suggestion.status === 'rejected' ? '✗ Dismissed' : 'Dismiss'}
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </Panel>
            </div>

            {/* MIDDLE COLUMN: Timeline (6 columns of 12) */}
            <div className="lg:col-span-6">
              <Panel>
                <SectionHeader
                  title="Today's Schedule"
                />
                <div className="max-h-[650px] overflow-y-auto pr-2 -mr-2">
                  <HourlyTimeline
                    tasks={tasks}
                    events={events}
                    wakeTime={user.wakeTime || '08:00'}
                    sleepTime={user.sleepTime || '23:00'}
                    onCompleteTask={handleCompleteTask}
                    enableDropTargets
                  />
                </div>
              </Panel>
            </div>

            {/* RIGHT COLUMN: Quick Actions & Habits (3 columns of 12) */}
            <div className="lg:col-span-3 space-y-5">
              <Panel padding="sm">
                <SectionHeader
                  title="Quick Actions"
                />
                <div className="space-y-2.5">
                  <a
                    href="/assistant"
                    className="group flex items-center justify-center gap-2 w-full bg-gradient-to-r from-accent-600 to-accent-500 text-white px-4 py-3.5 rounded-xl hover:from-accent-700 hover:to-accent-600 font-semibold text-sm transition-all shadow-sm hover:shadow-md"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                    </svg>
                    Ask AI Assistant
                  </a>
                  <a
                    href="/tasks"
                    className="group flex items-center justify-center gap-2 w-full bg-gradient-to-r from-primary-600 to-primary-500 text-white px-4 py-3.5 rounded-xl hover:from-primary-700 hover:to-primary-600 font-semibold text-sm transition-all shadow-sm hover:shadow-md"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                    </svg>
                    View All Tasks
                  </a>
                  <a
                    href="/calendar"
                    className="group flex items-center justify-center gap-2 w-full bg-white border-2 border-slate-200 text-slate-700 px-4 py-3.5 rounded-xl hover:border-primary-300 hover:bg-primary-50 font-semibold text-sm transition-all"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                    Open Calendar
                  </a>
                  <a
                    href="/categories"
                    className="group flex items-center justify-center gap-2 w-full bg-white border-2 border-slate-200 text-slate-700 px-4 py-3.5 rounded-xl hover:border-accent-300 hover:bg-accent-50 font-semibold text-sm transition-all"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                    </svg>
                    Categories
                  </a>
                </div>

                <div className="mt-6 pt-5 border-t border-slate-100">
                  <h3 className="text-sm font-semibold text-slate-700 mb-3">
                    Today&apos;s Stats
                  </h3>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-slate-600">Unscheduled:</span>
                      <span className="font-medium text-slate-800">
                        {unscheduledTasks.length}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-600">Scheduled:</span>
                      <span className="font-medium text-slate-800">
                        {tasks.filter((t) => t.status === 'scheduled').length}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-600">Completed:</span>
                      <span className="font-medium text-green-600">
                        {tasks.filter((t) => t.status === 'completed').length}
                      </span>
                    </div>
                  </div>
                </div>
              </Panel>
            </div>
          </div>

          {/* FULL-WIDTH INBOX SECTION */}
          <div className="mt-6">
            <Panel padding="none">
              {/* Top Bar */}
              <div className="border-b border-slate-200 p-4">
                <div className="flex items-center gap-3">
                  {/* Search */}
                  <div className="flex-1 relative">
                    <input
                      type="text"
                      value={emailSearchQuery}
                      onChange={(e) => setEmailSearchQuery(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          handleEmailSearch(emailSearchQuery);
                        }
                      }}
                      placeholder="Search emails, contacts or labels"
                      className="w-full px-4 py-2.5 pl-10 border border-slate-200 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent text-sm placeholder:text-slate-400"
                    />
                    <svg
                      className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                    {emailSearchQuery && (
                      <button
                        onClick={() => {
                          setEmailSearchQuery('');
                          refreshInbox();
                        }}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    )}
                  </div>

                  {/* Ask AI Button */}
                  <button className="px-4 py-2.5 bg-primary-50 text-primary-700 rounded-lg hover:bg-primary-100 transition-colors font-medium text-sm flex items-center gap-2">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                    </svg>
                    Ask AI
                  </button>

                  {/* Compose Button */}
                  <button
                    onClick={() => {
                      setReplyToEmail(null);
                      setEmailComposerOpen(true);
                    }}
                    className="px-4 py-2.5 bg-slate-900 text-white rounded-lg hover:bg-slate-800 transition-colors font-medium text-sm flex items-center gap-2"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                    Compose
                  </button>
                </div>
              </div>

              {/* Main Content Area */}
              <div className="flex" style={{ height: '600px' }}>
                {/* Left Sidebar */}
                <div className="w-64 border-r border-slate-200 p-4 overflow-y-auto">
                  {/* Inbox */}
                  <div className="mb-6">
                    <button
                      onClick={() => setFocusedEmailsOnly(false)}
                      className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                        !focusedEmailsOnly
                          ? 'bg-slate-100 text-slate-900'
                          : 'text-slate-600 hover:bg-slate-50'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                        </svg>
                        <span>Inbox</span>
                      </div>
                      <span className="text-xs font-semibold text-slate-500">{emails.filter((e) => !e.isRead).length}</span>
                    </button>
                  </div>

                  {/* Focused */}
                  <div className="mb-6">
                    <button
                      onClick={() => setFocusedEmailsOnly(true)}
                      className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                        focusedEmailsOnly
                          ? 'bg-slate-100 text-slate-900'
                          : 'text-slate-600 hover:bg-slate-50'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <span>Focused</span>
                      </div>
                    </button>
                  </div>

                  {/* Categories/Labels */}
                  {emailCategories.length > 0 && (
                    <div>
                      <h3 className="px-3 mb-2 text-xs font-semibold text-slate-500 uppercase tracking-wide">Categories</h3>
                      <div className="space-y-1">
                        <button
                          onClick={() => setSelectedCategory('all')}
                          className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                            selectedCategory === 'all'
                              ? 'bg-slate-100 text-slate-900'
                              : 'text-slate-600 hover:bg-slate-50'
                          }`}
                        >
                          <span>All Categories</span>
                          <span className="text-xs font-semibold text-slate-500">{emails.length}</span>
                        </button>
                        {emailCategories.map((cat) => {
                          const count = emails.filter((e) => e.category === cat.id).length;
                          if (count === 0) return null;

                          return (
                            <button
                              key={cat.id}
                              onClick={() => setSelectedCategory(cat.id)}
                              className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                                selectedCategory === cat.id
                                  ? 'bg-slate-100 text-slate-900'
                                  : 'text-slate-600 hover:bg-slate-50'
                              }`}
                            >
                              <div className="flex items-center gap-2">
                                <div
                                  className="w-2 h-2 rounded-full"
                                  style={{ backgroundColor: cat.color }}
                                />
                                <span>{cat.name}</span>
                              </div>
                              <span className="text-xs font-semibold text-slate-500">{count}</span>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>

                {/* Email List */}
                <div className="flex-1 overflow-y-auto">
                  {inboxLoading ? (
                    <div className="flex items-center justify-center h-full">
                      <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary-600"></div>
                    </div>
                  ) : inboxError ? (
                    <div className="p-4">
                      <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg p-4">
                        {inboxError}
                      </div>
                    </div>
                  ) : displayedEmails.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full text-slate-500">
                      <svg className="w-16 h-16 mb-4 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                      </svg>
                      <p className="text-base font-medium">No emails to show</p>
                    </div>
                  ) : (
                    <>
                      <div className="divide-y divide-slate-100">
                        {displayedEmails.map((email) => {
                          const categoryConfig = email.category ? emailCategories.find((c) => c.id === email.category) : null;

                          return (
                            <div
                              key={email.id}
                              onClick={() => handleEmailClick(email.id)}
                              className={`flex items-center gap-4 px-6 py-4 hover:bg-slate-50 cursor-pointer transition-colors border-l-2 ${
                                !email.isRead
                                  ? 'bg-white border-l-primary-600'
                                  : 'border-l-transparent'
                              }`}
                            >
                              {/* Unread Indicator */}
                              <div className="flex-shrink-0">
                                {!email.isRead && (
                                  <div className="w-2 h-2 rounded-full bg-primary-600"></div>
                                )}
                              </div>

                              {/* Avatar */}
                              <div className="flex-shrink-0 w-10 h-10 rounded-full bg-gradient-to-br from-slate-200 to-slate-300 flex items-center justify-center">
                                <span className="text-sm font-semibold text-slate-600">
                                  {email.from.charAt(0).toUpperCase()}
                                </span>
                              </div>

                              {/* Email Content */}
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 mb-0.5">
                                  <span className={`text-sm truncate ${!email.isRead ? 'font-semibold text-slate-900' : 'font-medium text-slate-700'}`}>
                                    {email.from}
                                  </span>
                                  {categoryConfig && (
                                    <span
                                      className="text-xs px-2 py-0.5 rounded-full font-medium flex-shrink-0"
                                      style={{
                                        backgroundColor: `${categoryConfig.color}15`,
                                        color: categoryConfig.color,
                                        border: `1px solid ${categoryConfig.color}40`,
                                      }}
                                    >
                                      {categoryConfig.name}
                                    </span>
                                  )}
                                </div>
                                <div className="flex items-baseline gap-2">
                                  <p className={`text-sm flex-1 truncate ${!email.isRead ? 'font-semibold text-slate-900' : 'text-slate-700'}`}>
                                    {email.subject}
                                  </p>
                                  {email.snippet && (
                                    <span className="text-xs text-slate-500 flex-shrink-0">
                                      {email.snippet.substring(0, 50)}...
                                    </span>
                                  )}
                                </div>
                              </div>

                              {/* Date */}
                              <div className="flex-shrink-0 text-xs text-slate-500">
                                {new Date(email.receivedAt).toLocaleString('en-US', {
                                  month: 'short',
                                  day: 'numeric',
                                })}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                      {nextEmailPageToken && (
                        <div className="p-4">
                          <button
                            onClick={loadMoreEmails}
                            disabled={loadingMoreEmails}
                            className="w-full px-4 py-3 text-sm font-medium text-primary-600 hover:bg-primary-50 border border-primary-200 rounded-lg transition-colors disabled:opacity-50"
                          >
                            {loadingMoreEmails ? 'Loading...' : 'Load More Emails'}
                          </button>
                        </div>
                      )}
                    </>
                  )}
                </div>
              </div>
            </Panel>
          </div>
          </>
        )}
        </div>

        <DragOverlay dropAnimation={null}>
          {activeDragTask ? (
            <motion.div
              initial={prefersReducedMotion ? { opacity: 1 } : { scale: 1.05, opacity: 0.9 }}
              animate={prefersReducedMotion ? { opacity: 1 } : { scale: 1, opacity: 1 }}
              className="relative"
            >
              {/* Glow effect */}
              <div className="absolute inset-0 bg-gradient-to-br from-primary-400 to-accent-400 rounded-xl blur-xl opacity-40 animate-pulse"></div>

              {/* Card content */}
              <div className="relative rounded-xl border-2 border-primary-300 bg-gradient-to-br from-white to-primary-50 shadow-2xl px-5 py-4 w-72">
                <div className="flex items-start gap-3">
                  <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-gradient-to-br from-primary-600 to-primary-500 flex items-center justify-center text-white shadow-md">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                    </svg>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-slate-900 line-clamp-2">
                      {activeDragTask.title}
                    </p>
                    <div className="flex items-center gap-2 mt-1.5 text-xs text-slate-600">
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <span className="font-medium">{activeDragTask.durationMinutes} min</span>
                      {activeDragTask.category && (
                        <>
                          <span className="text-slate-400">•</span>
                          <span
                            className="px-2 py-0.5 rounded-full text-xs font-semibold"
                            style={{
                              backgroundColor: `${activeDragTask.category.color}20`,
                              color: activeDragTask.category.color,
                              borderColor: activeDragTask.category.color,
                              borderWidth: '1px',
                            }}
                          >
                            {activeDragTask.category.name}
                          </span>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                {/* Drag indicator */}
                <div className="absolute -right-2 -top-2 w-6 h-6 rounded-full bg-gradient-to-br from-accent-500 to-accent-600 flex items-center justify-center shadow-lg animate-bounce">
                  <svg className="w-3.5 h-3.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" />
                  </svg>
                </div>
              </div>
            </motion.div>
          ) : null}
        </DragOverlay>
      </DndContext>

      <FloatingAssistantButton />

      {/* Email Viewer Modal */}
      <EmailViewer
        emailId={selectedEmailId}
        isOpen={emailViewerOpen}
        onClose={() => {
          setEmailViewerOpen(false);
          setSelectedEmailId(null);
        }}
        onReply={handleEmailReply}
        onArchive={handleEmailArchive}
        onMarkAsRead={handleEmailMarkAsRead}
      />

      {/* Email Composer Modal */}
      <EmailComposer
        isOpen={emailComposerOpen}
        onClose={() => {
          setEmailComposerOpen(false);
          setReplyToEmail(null);
        }}
        onSent={handleEmailSent}
        replyToEmail={replyToEmail}
      />
    </Layout>
  );
}

type DraggableTaskCardProps = {
  task: Task;
  accentClass: string;
  onComplete: () => void;
  prefersReducedMotion: boolean;
};

const DraggableTaskCard = memo(function DraggableTaskCard({ task, accentClass, onComplete, prefersReducedMotion }: DraggableTaskCardProps) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: task.id,
    data: { task },
  });

  const ariaLabel = `${task.title}, ${task.durationMinutes} minutes${
    task.category ? `, ${task.category.name}` : ''
  }. Press space or enter to pick up and move to a time slot.`;

  const style = useMemo(
    () => ({
      transform: transform ? `translate3d(${transform.x}px, ${transform.y}px, 0)` : undefined,
      opacity: isDragging ? 0.9 : 1,
      boxShadow: isDragging ? '0 12px 30px -10px rgba(59,130,246,0.35)' : undefined,
    }),
    [transform, isDragging]
  );

  const motionProps = prefersReducedMotion
    ? {}
    : {
        whileHover: { scale: 1.01 },
        whileTap: { scale: 0.97 },
      };

  return (
    <motion.div
      ref={setNodeRef}
      style={style}
      className={`rounded-lg p-3 cursor-grab active:cursor-grabbing select-none transition-shadow focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 ${accentClass}`}
      role="button"
      tabIndex={0}
      aria-label={ariaLabel}
      aria-grabbed={isDragging}
      {...listeners}
      {...attributes}
      {...motionProps}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <h4 className="font-medium text-slate-800 text-sm">{task.title}</h4>
          <div className="flex items-center gap-2 mt-1">
            <span className="text-xs text-slate-600">{task.durationMinutes} min</span>
            {task.category && (
              <span
                className="text-xs px-2 py-0.5 rounded font-medium"
                style={{
                  backgroundColor: `${task.category.color}20`,
                  color: task.category.color,
                }}
              >
                {task.category.name}
              </span>
            )}
          </div>
        </div>
        <motion.button
          type="button"
          onClick={onComplete}
          className="text-slate-400 hover:text-green-600 transition-colors flex-shrink-0 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 rounded"
          title="Mark complete"
          aria-label={`Mark ${task.title} as complete`}
          whileTap={prefersReducedMotion ? undefined : { scale: 0.88 }}
          whileHover={prefersReducedMotion ? undefined : { scale: 1.08 }}
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        </motion.button>
      </div>
    </motion.div>
  );
});
