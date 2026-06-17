'use client';

import { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { DndContext, DragOverlay, useSensor, useSensors, PointerSensor, KeyboardSensor, DragEndEvent } from '@dnd-kit/core';
import { FloatingAssistantButton } from '@/components/FloatingAssistantButton';
import { Layout } from '@/components/Layout';
import { TaskList } from '@/components/TaskList';
import { Button, SearchBar, FilterPanel, Panel, SectionHeader } from '@/components/ui';
import type { TaskFilters } from '@/components/ui/FilterPanel';
import { KeyboardShortcutsModal } from '@/components/KeyboardShortcutsModal';
import { BulkActionToolbar } from '@/components/BulkActionToolbar';
import { FlowAnalyticsPanel } from '@/components/analytics/FlowAnalyticsPanel';
import type { FlowCommandStripAction, FlowCommandStripHandle } from '@/components/analytics/FlowCommandStrip';
import { FlowAIAssistantPanel } from '@/components/ai/FlowAIAssistantPanel';
import { ToastContainer } from '@/components/Toast';
import { useToast } from '@/hooks/useToast';
import { useTasks } from '@/hooks/useTasks';
import { useCategories } from '@/hooks/useCategories';
import { useKeyboardShortcuts } from '@/hooks/useKeyboardShortcuts';
import { useHabits } from '@/hooks/useHabits';
import { useUser } from '@/hooks/useUser';
import { exportTasksToCSV } from '@/utils/exportTasks';
import { buildTaskListSections, type CompletedGroupMode } from '@/utils/taskListGrouping';
import { useScheduleConflicts } from '@/hooks/useScheduleConflicts';
import * as api from '@/lib/api';
import type { Task } from '@timeflow/shared';
import '@/styles/print.css';

type TabType = 'unscheduled' | 'scheduled' | 'completed';

const COMPLETED_GROUP_MODES = ['date', 'category', 'identity'] as const;

function parseCompletedGroupMode(value: string | null): CompletedGroupMode {
  if (value && COMPLETED_GROUP_MODES.includes(value as CompletedGroupMode)) {
    return value as CompletedGroupMode;
  }
  return 'date';
}

export default function TasksPage() {
  const [showArchived, setShowArchived] = useState(false);
  const [reshuffling, setReshuffling] = useState(false);

  const {
    tasks,
    loading,
    error,
    createTask,
    updateTask,
    completeTask,
    deleteTask,
    archiveTask,
    unarchiveTask,
    refresh,
  } = useTasks(undefined, showArchived);

  const { habits } = useHabits();
  const { user } = useUser();
  const { toasts, showToast, removeToast } = useToast();
  const commandStripRef = useRef<FlowCommandStripHandle>(null);

  // Tab state (replaces 3-column layout)
  const [activeTab, setActiveTab] = useState<TabType>('unscheduled');

  // Smart Schedule state
  const [scheduling, setScheduling] = useState(false);
  const [scheduleError, setScheduleError] = useState<string | null>(null);
  const [scheduleResult, setScheduleResult] = useState<string | null>(null);

  // Drag and drop state
  const [activeTask, setActiveTask] = useState<Task | null>(null);

  // Keyboard shortcuts state
  const [showShortcutsModal, setShowShortcutsModal] = useState(false);
  const [showOverflowMenu, setShowOverflowMenu] = useState(false);

  // Analytics refresh — increment token to refetch without remounting panel
  const [analyticsRefreshToken, setAnalyticsRefreshToken] = useState(0);
  const [conflictRefreshToken, setConflictRefreshToken] = useState(0);
  const pendingDeepLinkAction = useRef<'ai' | 'schedule' | null>(null);
  const triggerAnalyticsRefresh = () => {
    setAnalyticsRefreshToken((prev) => prev + 1);
  };
  const triggerConflictRefresh = () => {
    setConflictRefreshToken((prev) => prev + 1);
  };

  // AI Assistant Panel state - Phase 2C
  const [showAIPanel, setShowAIPanel] = useState(false);
  const [aiInitialPrompt, setAiInitialPrompt] = useState<string | null>(null);

  // Completed tab grouping
  const [completedGroupMode, setCompletedGroupMode] = useState<CompletedGroupMode>(() => {
    if (typeof window === 'undefined') return 'date';
    return parseCompletedGroupMode(localStorage.getItem('taskCompletedGroupMode'));
  });

  // Bulk selection state
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedTasks, setSelectedTasks] = useState<Set<string>>(new Set());

  // Search and filter state
  const { categories } = useCategories();
  const [searchQuery, setSearchQuery] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState<TaskFilters>({
    categories: new Set(),
    priority: null,
    dueDateFrom: '',
    dueDateTo: '',
    durationRange: null,
  });

  // Sort state
  type SortField = 'dueDate' | 'priority' | 'durationMinutes' | 'createdAt';
  type SortDirection = 'asc' | 'desc';
  const [sortField, setSortField] = useState<SortField>('dueDate');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');

  // Load sort preference from localStorage
  useEffect(() => {
    const savedSort = localStorage.getItem('taskSortPreference');
    if (savedSort) {
      try {
        const { field, direction } = JSON.parse(savedSort);
        setSortField(field);
        setSortDirection(direction);
      } catch (err) {
        console.error('Failed to parse sort preference:', err);
      }
    }
  }, []);

  // Save sort preference to localStorage
  useEffect(() => {
    localStorage.setItem(
      'taskSortPreference',
      JSON.stringify({ field: sortField, direction: sortDirection })
    );
  }, [sortField, sortDirection]);

  useEffect(() => {
    localStorage.setItem('taskCompletedGroupMode', completedGroupMode);
  }, [completedGroupMode]);

  useEffect(() => {
    if (!scheduleResult) return;
    const timer = setTimeout(() => setScheduleResult(null), 5000);
    return () => clearTimeout(timer);
  }, [scheduleResult]);

  useEffect(() => {
    if (!scheduleError) return;
    const timer = setTimeout(() => setScheduleError(null), 8000);
    return () => clearTimeout(timer);
  }, [scheduleError]);

  const handleOpenAI = (prompt?: string) => {
    setAiInitialPrompt(prompt ?? null);
    setShowAIPanel(true);
  };

  const focusCommandStrip = useCallback(() => {
    commandStripRef.current?.focusInput();
  }, []);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k' && !event.shiftKey) {
        const target = event.target as HTMLElement;
        if (
          target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          target.contentEditable === 'true'
        ) {
          return;
        }
        event.preventDefault();
        event.stopImmediatePropagation();
        focusCommandStrip();
      }
    };

    document.addEventListener('keydown', handleKeyDown, { capture: true });
    return () => document.removeEventListener('keydown', handleKeyDown, { capture: true });
  }, [focusCommandStrip]);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor)
  );

  // Configure keyboard shortcuts
  useKeyboardShortcuts({
    shortcuts: [
      {
        key: '/',
        ctrlKey: true,
        description: 'Show keyboard shortcuts',
        handler: () => {
          setShowShortcutsModal(true);
        },
      },
      {
        key: '?',
        description: 'Show keyboard shortcuts',
        handler: () => {
          setShowShortcutsModal(true);
        },
      },
      {
        key: 'Escape',
        description: 'Close modals',
        handler: () => {
          setShowShortcutsModal(false);
          setShowOverflowMenu(false);
        },
      },
    ],
  });

  // Filter and sort tasks
  const filteredAndSortedTasks = useMemo(() => {
    let filtered = tasks;

    // Apply search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter((task) => {
        const titleMatch = task.title.toLowerCase().includes(query);
        const descriptionMatch = task.description?.toLowerCase().includes(query);
        return titleMatch || descriptionMatch;
      });
    }

    // Apply category filter
    if (filters.categories.size > 0) {
      filtered = filtered.filter((task) => {
        return task.categoryId && filters.categories.has(task.categoryId);
      });
    }

    // Apply priority filter
    if (filters.priority !== null) {
      filtered = filtered.filter((task) => task.priority === filters.priority);
    }

    // Apply due date range filter
    if (filters.dueDateFrom || filters.dueDateTo) {
      filtered = filtered.filter((task) => {
        if (!task.dueDate) return false;
        const taskDate = new Date(task.dueDate);

        if (filters.dueDateFrom) {
          const fromDate = new Date(filters.dueDateFrom);
          if (taskDate < fromDate) return false;
        }

        if (filters.dueDateTo) {
          const toDate = new Date(filters.dueDateTo);
          toDate.setHours(23, 59, 59, 999);
          if (taskDate > toDate) return false;
        }

        return true;
      });
    }

    // Apply duration filter
    if (filters.durationRange) {
      filtered = filtered.filter((task) => {
        if (filters.durationRange === 'short') {
          return task.durationMinutes < 30;
        } else if (filters.durationRange === 'medium') {
          return task.durationMinutes >= 30 && task.durationMinutes <= 60;
        } else if (filters.durationRange === 'long') {
          return task.durationMinutes > 60;
        }
        return true;
      });
    }

    // Apply sorting
    const sorted = [...filtered].sort((a, b) => {
      let comparison = 0;

      switch (sortField) {
        case 'dueDate':
          if (!a.dueDate && !b.dueDate) comparison = 0;
          else if (!a.dueDate) comparison = 1;
          else if (!b.dueDate) comparison = -1;
          else comparison = new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
          break;

        case 'priority':
          comparison = a.priority - b.priority;
          break;

        case 'durationMinutes':
          comparison = a.durationMinutes - b.durationMinutes;
          break;

        case 'createdAt':
          comparison = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
          break;
      }

      return sortDirection === 'asc' ? comparison : -comparison;
    });

    return sorted;
  }, [tasks, searchQuery, filters, sortField, sortDirection]);

  // Separate by status
  const unscheduledTasks = filteredAndSortedTasks.filter((t) => t.status === 'unscheduled');
  const scheduledTasks = filteredAndSortedTasks.filter((t) => t.status === 'scheduled');
  const completedTasks = filteredAndSortedTasks.filter((t) => t.status === 'completed');

  const filteredActiveOverdueCount = useMemo(() => {
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);
    return filteredAndSortedTasks.filter(
      (task) =>
        task.status !== 'completed' &&
        task.dueDate &&
        new Date(task.dueDate) < startOfToday
    ).length;
  }, [filteredAndSortedTasks]);

  // Get active tab tasks
  const activeTabTasks =
    activeTab === 'unscheduled' ? unscheduledTasks :
    activeTab === 'scheduled' ? scheduledTasks :
    completedTasks;

  const insights = useMemo(() => {
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const endOfToday = new Date(startOfToday);
    endOfToday.setHours(23, 59, 59, 999);
    const endOfWeek = new Date(startOfToday);
    endOfWeek.setDate(startOfToday.getDate() + (6 - startOfToday.getDay()));
    endOfWeek.setHours(23, 59, 59, 999);

    const overdueCount = tasks.filter((task) => {
      if (task.status === 'completed' || !task.dueDate) return false;
      return new Date(task.dueDate) < startOfToday;
    }).length;

    const weekLoadMinutes = activeTabTasks.reduce((sum, task) => {
      if (!task.dueDate) return sum;
      return new Date(task.dueDate) <= endOfWeek ? sum + task.durationMinutes : sum;
    }, 0);

    const avgMinutes = activeTabTasks.length
      ? Math.round(
          activeTabTasks.reduce((sum, task) => sum + task.durationMinutes, 0) /
            activeTabTasks.length
        )
      : 0;

    const formatDuration = (minutes: number) => {
      if (minutes < 60) return `${minutes}m`;
      const hours = Math.floor(minutes / 60);
      const remainder = minutes % 60;
      return remainder === 0 ? `${hours}h` : `${hours}h ${remainder}m`;
    };

    return {
      overdueCount,
      weekLoad: formatDuration(weekLoadMinutes),
      avgMinutes,
      hasData: activeTabTasks.length > 0,
    };
  }, [activeTabTasks, tasks]);

  const { conflicts, refetch: refetchConflicts } = useScheduleConflicts(
    activeTab === 'scheduled' || activeTab === 'unscheduled',
    conflictRefreshToken
  );

  const groupedSections = useMemo(
    () => buildTaskListSections(activeTabTasks, activeTab, completedGroupMode),
    [activeTabTasks, activeTab, completedGroupMode]
  );

  const handleSmartSchedule = useCallback(async () => {
    const taskIds = unscheduledTasks.map((t) => t.id);
    if (taskIds.length === 0) {
      setScheduleError('No unscheduled tasks to schedule');
      return;
    }

    setScheduling(true);
    setScheduleError(null);
    setScheduleResult(null);

    try {
      const now = new Date();
      const end = new Date();
      end.setDate(end.getDate() + 14);

      const result = await api.runSchedule({
        taskIds,
        dateRangeStart: now.toISOString(),
        dateRangeEnd: end.toISOString(),
      });

      setScheduleResult(
        `Successfully scheduled ${result.scheduled} task${
          result.scheduled === 1 ? '' : 's'
        }!`
      );
      refresh();
      triggerAnalyticsRefresh();
      triggerConflictRefresh();
    } catch (err) {
      setScheduleError(
        err instanceof Error ? err.message : 'Failed to run scheduling'
      );
    } finally {
      setScheduling(false);
    }
  }, [unscheduledTasks, refresh]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const action = params.get('action');
    if (action === 'ai' || action === 'schedule') {
      pendingDeepLinkAction.current = action;
      const url = new URL(window.location.href);
      url.searchParams.delete('action');
      window.history.replaceState({}, '', url.pathname + url.search);
    }
  }, []);

  useEffect(() => {
    if (loading || !pendingDeepLinkAction.current) return;
    const action = pendingDeepLinkAction.current;
    pendingDeepLinkAction.current = null;
    if (action === 'ai') {
      handleOpenAI();
    } else if (action === 'schedule') {
      void handleSmartSchedule();
    }
  }, [loading, handleSmartSchedule]);

  const commandStripAction = useMemo((): FlowCommandStripAction | null => {
    if (filteredActiveOverdueCount > 0) {
      return {
        id: 'tackle-overdue',
        label: `Tackle ${filteredActiveOverdueCount} overdue`,
        onClick: () =>
          handleOpenAI(
            filteredActiveOverdueCount === 1
              ? 'Help me prioritize and schedule my overdue task.'
              : `Help me prioritize and schedule my ${filteredActiveOverdueCount} overdue tasks.`
          ),
      };
    }

    if (unscheduledTasks.length > 0) {
      return {
        id: 'smart-schedule',
        label: scheduling ? 'Scheduling…' : `Schedule ${unscheduledTasks.length}`,
        disabled: scheduling,
        onClick: () => {
          void handleSmartSchedule();
        },
      };
    }

    return null;
  }, [filteredActiveOverdueCount, unscheduledTasks.length, scheduling, handleSmartSchedule]);

  // Drag and drop handlers
  const handleDragStart = (event: any) => {
    const task = tasks.find((t) => t.id === event.active.id);
    if (task) {
      setActiveTask(task);
    }
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveTask(null);

    if (!over || active.id === over.id) {
      return;
    }

    const newStatus = over.id as 'unscheduled' | 'scheduled' | 'completed';
    const taskId = active.id as string;

    const task = tasks.find((t) => t.id === taskId);
    if (!task || task.status === newStatus) {
      return;
    }

    try {
      if (newStatus === 'completed') {
        await completeTask(taskId);
      } else {
        await updateTask(taskId, { status: newStatus });
      }
      triggerAnalyticsRefresh(); // Fix #2: Refresh analytics after drag/drop
    } catch (err) {
      console.error('Failed to update task status:', err);
    }
  };

  // Bulk selection handlers
  const toggleTaskSelection = (taskId: string) => {
    const newSet = new Set(selectedTasks);
    if (newSet.has(taskId)) {
      newSet.delete(taskId);
    } else {
      newSet.add(taskId);
    }
    setSelectedTasks(newSet);
  };

  const clearSelection = () => {
    setSelectedTasks(new Set());
    setSelectionMode(false);
  };

  const handleBulkComplete = async () => {
    try {
      await Promise.all(
        Array.from(selectedTasks).map((taskId) => completeTask(taskId))
      );
      clearSelection();
      triggerAnalyticsRefresh(); // Fix #2: Refresh analytics after bulk complete
    } catch (err) {
      console.error('Failed to complete tasks:', err);
    }
  };

  const handleBulkDelete = async () => {
    if (!confirm(`Are you sure you want to delete ${selectedTasks.size} task(s)?`)) {
      return;
    }

    try {
      await Promise.all(
        Array.from(selectedTasks).map((taskId) => deleteTask(taskId))
      );
      clearSelection();
      triggerAnalyticsRefresh(); // Fix #2: Refresh analytics after bulk delete
    } catch (err) {
      console.error('Failed to delete tasks:', err);
    }
  };

  const handleBulkChangeStatus = async (status: 'unscheduled' | 'scheduled' | 'completed') => {
    try {
      if (status === 'completed') {
        await Promise.all(
          Array.from(selectedTasks).map((taskId) => completeTask(taskId))
        );
      } else {
        await Promise.all(
          Array.from(selectedTasks).map((taskId) => updateTask(taskId, { status }))
        );
      }
      clearSelection();
      triggerAnalyticsRefresh(); // Fix #2: Refresh analytics after bulk status change
    } catch (err) {
      console.error('Failed to change task status:', err);
    }
  };

  // Export and print handlers
  const handleExport = () => {
    exportTasksToCSV(filteredAndSortedTasks);
    setShowOverflowMenu(false);
  };

  const handlePrint = () => {
    window.print();
    setShowOverflowMenu(false);
  };

  // Wrapper functions to match TaskList interface (Promise<void>)
  // Fix #2: Trigger analytics refresh after mutations
  const handleCreateTask = async (data: any): Promise<void> => {
    await createTask(data);
    triggerAnalyticsRefresh();
  };

  const handleUpdateTask = async (id: string, data: any): Promise<void> => {
    await updateTask(id, data);
    triggerAnalyticsRefresh();
  };

  const handleCompleteTask = async (id: string): Promise<void> => {
    await completeTask(id);
    triggerAnalyticsRefresh();
  };

  const handleDeleteTask = async (id: string): Promise<void> => {
    await deleteTask(id);
    triggerAnalyticsRefresh();
  };

  const handleUnscheduleTask = async (id: string): Promise<void> => {
    const task = tasks.find((t) => t.id === id);
    const scheduledSnapshot = task?.scheduledTask
      ? {
          taskId: id,
          title: task.title,
          startDateTime: task.scheduledTask.startDateTime,
          endDateTime: task.scheduledTask.endDateTime,
        }
      : null;

    try {
      await updateTask(id, { status: 'unscheduled' });
      await refresh();
      triggerAnalyticsRefresh();
      triggerConflictRefresh();

      if (scheduledSnapshot) {
        showToast(`"${scheduledSnapshot.title}" removed from calendar`, 'info', {
          durationMs: 8000,
          action: {
            label: 'Undo',
            onClick: async () => {
              await api.rescheduleTask(
                scheduledSnapshot.taskId,
                scheduledSnapshot.startDateTime,
                scheduledSnapshot.endDateTime
              );
              await refresh();
              triggerAnalyticsRefresh();
              triggerConflictRefresh();
              showToast('Task restored to calendar', 'success');
            },
          },
          onActionError: () => {
            showToast('Could not restore — try Smart Schedule or Flow AI', 'error');
          },
        });
      }
    } catch (err) {
      showToast(
        err instanceof Error ? err.message : 'Failed to unschedule task',
        'error'
      );
    }
  };

  const handleArchiveTask = async (id: string): Promise<void> => {
    const task = tasks.find((t) => t.id === id);
    try {
      await archiveTask(id);
      triggerAnalyticsRefresh();
      if (task) {
        showToast(`"${task.title}" archived`, 'success');
      }
    } catch (err) {
      showToast(
        err instanceof Error ? err.message : 'Failed to archive task',
        'error'
      );
    }
  };

  const handleUnarchiveTask = async (id: string): Promise<void> => {
    const task = tasks.find((t) => t.id === id);
    try {
      await unarchiveTask(id);
      if (task) {
        showToast(`"${task.title}" restored`, 'success');
      }
    } catch (err) {
      showToast(
        err instanceof Error ? err.message : 'Failed to restore task',
        'error'
      );
    }
  };

  const handleToggleLockTask = async (id: string, locked: boolean): Promise<void> => {
    try {
      await updateTask(id, { scheduleLocked: locked });
      showToast(locked ? 'Task pinned — Smart Schedule won\'t move it' : 'Task unpinned', 'success');
    } catch (err) {
      showToast(
        err instanceof Error ? err.message : 'Failed to update pin',
        'error'
      );
    }
  };

  const handleReshuffleConflicts = async (): Promise<void> => {
    setReshuffling(true);
    try {
      const now = new Date();
      const end = new Date();
      end.setDate(end.getDate() + 14);
      const result = await api.reshuffleScheduleConflicts(now.toISOString(), end.toISOString());
      await refresh();
      refetchConflicts();
      triggerAnalyticsRefresh();
      triggerConflictRefresh();
      showToast(
        result.rescheduled > 0
          ? `Rescheduled ${result.rescheduled} conflicting task${result.rescheduled === 1 ? '' : 's'}`
          : 'No conflicts to reshuffle',
        result.rescheduled > 0 ? 'success' : 'info'
      );
    } catch (err) {
      showToast(
        err instanceof Error ? err.message : 'Failed to reshuffle tasks',
        'error'
      );
    } finally {
      setReshuffling(false);
    }
  };

  const tasksPageShortcuts = useMemo(
    () => [
      { keys: ['Ctrl', 'K'], description: 'Focus Flow AI command strip' },
      { keys: ['Ctrl', '/'], description: 'Show keyboard shortcuts' },
      { keys: ['Esc'], description: 'Close modals and dialogs' },
      { keys: ['?'], description: 'Show keyboard shortcuts' },
    ],
    []
  );

  return (
    <Layout>
      <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-4 sm:py-6 space-y-4 sm:space-y-6">
        {/* Analytics Panel with AI Assistant integration (Phase 2C) */}
        {/* Fix #2: Pass refresh key to force re-fetch after task mutations */}
        <FlowAnalyticsPanel
          onRefresh={triggerAnalyticsRefresh}
          onOpenAI={handleOpenAI}
          timeZone={user?.timeZone}
          commandStripRef={commandStripRef}
          contextualAction={commandStripAction}
          refreshToken={analyticsRefreshToken}
        />

        {conflicts && conflicts.count > 0 && (
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3">
            <p className="text-sm text-amber-900">
              <span className="font-semibold">{conflicts.count} scheduled task{conflicts.count === 1 ? '' : 's'}</span>
              {' '}conflict{conflicts.count === 1 ? 's' : ''} with calendar changes.
              {conflicts.tasks[0] && (
                <span className="text-amber-800"> e.g. &quot;{conflicts.tasks[0].title}&quot;</span>
              )}
            </p>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => void handleReshuffleConflicts()}
              disabled={reshuffling}
              loading={reshuffling}
              className="flex-shrink-0"
            >
              Reshuffle unlocked
            </Button>
          </div>
        )}

        {/* Header with Smart Schedule primary action */}
        <SectionHeader
          title="Tasks"
          subtitle={
            tasks.length === 0
              ? 'Create your first task to get started'
              : `${tasks.length} task${tasks.length === 1 ? '' : 's'} · ${unscheduledTasks.length} unscheduled · ${scheduledTasks.length} scheduled · ${completedTasks.length} completed`
          }
          actions={
            <>
              {/* Overflow menu for secondary actions */}
              <div className="relative">
                <button
                  onClick={() => setShowOverflowMenu(!showOverflowMenu)}
                  className="p-2.5 min-h-[44px] min-w-[44px] text-slate-600 hover:text-slate-900 hover:bg-slate-100 active:bg-slate-200 rounded-lg transition-colors inline-flex items-center justify-center"
                  title="More actions"
                  aria-label="More actions"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z"
                    />
                  </svg>
                </button>

                {showOverflowMenu && (
                  <>
                    {/* Backdrop */}
                    <div
                      className="fixed inset-0 z-10"
                      onClick={() => setShowOverflowMenu(false)}
                    />

                    {/* Menu */}
                    <div
                      className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-slate-200 py-1 z-20"
                      style={{ boxShadow: 'var(--elevation-3)' }}
                    >
                      <button
                        onClick={handlePrint}
                        disabled={tasks.length === 0}
                        className="w-full px-4 py-2 text-left text-sm text-slate-700 hover:bg-slate-50 disabled:text-slate-400 disabled:cursor-not-allowed flex items-center gap-2"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z"
                          />
                        </svg>
                        Print
                      </button>
                      <button
                        onClick={handleExport}
                        disabled={tasks.length === 0}
                        className="w-full px-4 py-2 text-left text-sm text-slate-700 hover:bg-slate-50 disabled:text-slate-400 disabled:cursor-not-allowed flex items-center gap-2"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                          />
                        </svg>
                        Export CSV
                      </button>
                      <button
                        onClick={() => {
                          setSelectionMode(!selectionMode);
                          setShowOverflowMenu(false);
                        }}
                        className="w-full px-4 py-2 text-left text-sm text-slate-700 hover:bg-slate-50 flex items-center gap-2"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4"
                          />
                        </svg>
                        {selectionMode ? 'Exit Selection' : 'Select Multiple'}
                      </button>
                      <button
                        onClick={() => {
                          setShowShortcutsModal(true);
                          setShowOverflowMenu(false);
                        }}
                        className="w-full px-4 py-2 text-left text-sm text-slate-700 hover:bg-slate-50 flex items-center gap-2"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M13 10V3L4 14h7v7l9-11h-7z"
                          />
                        </svg>
                        Keyboard Shortcuts
                      </button>
                    </div>
                  </>
                )}
              </div>

              {/* Primary action: Smart Schedule */}
              <Button
                onClick={handleSmartSchedule}
                disabled={scheduling || unscheduledTasks.length === 0}
                variant="primary"
                size="lg"
                loading={scheduling}
                leftIcon={
                  !scheduling ? (
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M13 10V3L4 14h7v7l9-11h-7z"
                      />
                    </svg>
                  ) : undefined
                }
              >
                {scheduling ? 'Scheduling...' : 'Smart Schedule'}
              </Button>
            </>
          }
        />

        {insights.hasData && (
          <div className="rounded-xl border border-slate-200/70 bg-white/80 px-4 py-2 text-xs text-slate-600 flex flex-wrap items-center gap-x-3 gap-y-1">
            <span className="text-[11px] uppercase tracking-[0.2em] text-slate-400">Insights</span>
            <span className="text-slate-600">
              <span className="text-slate-900 font-semibold">{insights.overdueCount}</span> overdue
            </span>
            <span className="text-slate-300">•</span>
            <span className="text-slate-600">
              <span className="text-slate-900 font-semibold">{insights.weekLoad}</span> week load
            </span>
            <span className="text-slate-300">•</span>
            <span className="text-slate-600">
              <span className="text-slate-900 font-semibold">{insights.avgMinutes}m</span> avg
            </span>
          </div>
        )}

        {/* Status messages */}
        {scheduleError && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
            {scheduleError}
          </div>
        )}
        {scheduleResult && (
          <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg text-sm">
            {scheduleResult}
          </div>
        )}
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
            {error}
          </div>
        )}

        {/* Search and Filters */}
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <SearchBar
                value={searchQuery}
                onChange={setSearchQuery}
                placeholder="Search tasks..."
              />
            </div>

            {/* Sort controls */}
            <div className="flex items-center gap-2">
              <label className="text-sm font-medium text-slate-700 whitespace-nowrap">
                Sort by:
              </label>
              <select
                value={sortField}
                onChange={(e) => setSortField(e.target.value as SortField)}
                className="px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
              >
                <option value="dueDate">Due Date</option>
                <option value="priority">Priority</option>
                <option value="durationMinutes">Duration</option>
                <option value="createdAt">Created</option>
              </select>
              <button
                onClick={() => setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc')}
                className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
                title={`Sort ${sortDirection === 'asc' ? 'ascending' : 'descending'}`}
              >
                {sortDirection === 'asc' ? (
                  <svg className="w-5 h-5 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                  </svg>
                ) : (
                  <svg className="w-5 h-5 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                )}
              </button>
            </div>
          </div>

          <FilterPanel
            filters={filters}
            onFiltersChange={setFilters}
            categories={categories}
            isOpen={showFilters}
            onToggle={() => setShowFilters(!showFilters)}
          />
        </div>

        {/* Tabs + Task List Panel */}
        <Panel padding="none">
          {/* Tabs */}
          <div className="flex gap-2 border-b border-slate-200 -mx-4 px-4 md:mx-0 md:px-0 overflow-x-auto scrollbar-thin pb-px">
            <button
              onClick={() => setActiveTab('unscheduled')}
              className={`flex-shrink-0 px-4 md:px-6 py-3 md:py-4 min-h-[48px] text-base md:text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
                activeTab === 'unscheduled'
                  ? 'border-primary-600 text-primary-700 bg-primary-50/50'
                  : 'border-transparent text-slate-600 hover:text-primary-600 hover:border-slate-300'
              }`}
            >
              Unscheduled
              <span className="ml-2 py-0.5 px-2 rounded-full text-xs bg-slate-100 text-slate-600">
                {unscheduledTasks.length}
              </span>
            </button>
            <button
              onClick={() => setActiveTab('scheduled')}
              className={`flex-shrink-0 px-4 md:px-6 py-3 md:py-4 min-h-[48px] text-base md:text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
                activeTab === 'scheduled'
                  ? 'border-primary-600 text-primary-700 bg-primary-50/50'
                  : 'border-transparent text-slate-600 hover:text-primary-600 hover:border-slate-300'
              }`}
            >
              Scheduled
              <span className="ml-2 py-0.5 px-2 rounded-full text-xs bg-slate-100 text-slate-600">
                {scheduledTasks.length}
              </span>
            </button>
            <button
              onClick={() => setActiveTab('completed')}
              className={`flex-shrink-0 px-4 md:px-6 py-3 md:py-4 min-h-[48px] text-base md:text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
                activeTab === 'completed'
                  ? 'border-primary-600 text-primary-700 bg-primary-50/50'
                  : 'border-transparent text-slate-600 hover:text-primary-600 hover:border-slate-300'
              }`}
            >
              Completed
              <span className="ml-2 py-0.5 px-2 rounded-full text-xs bg-slate-100 text-slate-600">
                {completedTasks.length}
              </span>
            </button>
          </div>

          {activeTab === 'completed' && (
            <div className="flex flex-wrap items-center gap-3 px-4 py-3 border-b border-slate-100 bg-slate-50/50">
              {completedTasks.length > 0 && (
                <>
                  <span className="text-xs font-medium text-slate-500 uppercase tracking-wide">Group by</span>
                  <div className="inline-flex rounded-lg border border-slate-200 bg-white p-0.5">
                    <button
                      type="button"
                      onClick={() => setCompletedGroupMode('date')}
                      className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                        completedGroupMode === 'date'
                          ? 'bg-primary-600 text-white'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      Date
                    </button>
                    <button
                      type="button"
                      onClick={() => setCompletedGroupMode('category')}
                      className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                        completedGroupMode === 'category'
                          ? 'bg-primary-600 text-white'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      Category
                    </button>
                    <button
                      type="button"
                      onClick={() => setCompletedGroupMode('identity')}
                      className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                        completedGroupMode === 'identity'
                          ? 'bg-primary-600 text-white'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      Identity
                    </button>
                  </div>
                </>
              )}
              <label className="ml-auto inline-flex items-center gap-2 text-xs text-slate-600 cursor-pointer">
                <input
                  type="checkbox"
                  checked={showArchived}
                  onChange={(e) => setShowArchived(e.target.checked)}
                  className="rounded border-slate-300 text-primary-600 focus:ring-primary-500"
                />
                Show archived
              </label>
            </div>
          )}

          {/* Task list for active tab */}
          <DndContext
            sensors={sensors}
            onDragStart={handleDragStart}
            onDragEnd={handleDragEnd}
          >
            <div className="min-h-[400px]">
              <TaskList
                tasks={activeTabTasks}
                onCreateTask={handleCreateTask}
                onUpdateTask={handleUpdateTask}
                onCompleteTask={handleCompleteTask}
                onDeleteTask={handleDeleteTask}
                onUnscheduleTask={handleUnscheduleTask}
                onArchiveTask={activeTab === 'completed' ? handleArchiveTask : undefined}
                onUnarchiveTask={activeTab === 'completed' && showArchived ? handleUnarchiveTask : undefined}
                onToggleLockTask={activeTab === 'scheduled' ? handleToggleLockTask : undefined}
                loading={loading}
                droppableId={activeTab}
                groupedSections={groupedSections}
                emptyState={{
                  title:
                    activeTab === 'unscheduled'
                      ? 'No unscheduled tasks'
                      : activeTab === 'scheduled'
                      ? 'Nothing scheduled yet'
                      : 'No completed tasks yet',
                  description:
                    activeTab === 'unscheduled'
                      ? 'Capture tasks as they come to keep momentum.'
                      : activeTab === 'scheduled'
                      ? 'Run Smart Schedule to place tasks on your calendar.'
                      : 'Finish a task to see it live here.',
                }}
                selectionMode={selectionMode}
                selectedTasks={selectedTasks}
                onToggleSelect={toggleTaskSelection}
              />
            </div>

            <DragOverlay>
              {activeTask ? (
                <div className="opacity-80 scale-105 rotate-2">
                  <div className="bg-white border-2 border-primary-400 rounded-lg p-4 shadow-xl">
                    <h3 className="font-semibold text-slate-800">{activeTask.title}</h3>
                    {activeTask.description && (
                      <p className="text-sm text-slate-600 mt-1">{activeTask.description}</p>
                    )}
                  </div>
                </div>
              ) : null}
            </DragOverlay>
          </DndContext>
        </Panel>
      </div>

      <FloatingAssistantButton />
      <KeyboardShortcutsModal
        isOpen={showShortcutsModal}
        onClose={() => setShowShortcutsModal(false)}
        shortcuts={tasksPageShortcuts}
      />
      <BulkActionToolbar
        selectedCount={selectedTasks.size}
        onComplete={handleBulkComplete}
        onDelete={handleBulkDelete}
        onChangeStatus={handleBulkChangeStatus}
        onClearSelection={clearSelection}
      />

      {/* AI Assistant Panel - Phase 2C */}
      {/* Fix #1: Pass habits, timeZone, and refresh callback for schedule preview */}
      <FlowAIAssistantPanel
        isOpen={showAIPanel}
        onClose={() => setShowAIPanel(false)}
        tasks={tasks}
        habits={habits}
        timeZone={user?.timeZone}
        initialPrompt={aiInitialPrompt}
        onInitialPromptConsumed={() => setAiInitialPrompt(null)}
        onTasksUpdate={() => {
          refresh();
          triggerAnalyticsRefresh();
        }}
      />
      <ToastContainer toasts={toasts} onRemove={removeToast} />
    </Layout>
  );
}
