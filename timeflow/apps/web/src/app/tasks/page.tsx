'use client';

import { useState, useEffect, useMemo } from 'react';
import { DndContext, DragOverlay, useSensor, useSensors, PointerSensor, KeyboardSensor, DragEndEvent } from '@dnd-kit/core';
import { FloatingAssistantButton } from '@/components/FloatingAssistantButton';
import { Layout } from '@/components/Layout';
import { TaskList } from '@/components/TaskList';
import { Button, SearchBar, FilterPanel, Panel, SectionHeader } from '@/components/ui';
import type { TaskFilters } from '@/components/ui/FilterPanel';
import { KeyboardShortcutsModal } from '@/components/KeyboardShortcutsModal';
import { BulkActionToolbar } from '@/components/BulkActionToolbar';
import { useTasks } from '@/hooks/useTasks';
import { useCategories } from '@/hooks/useCategories';
import { useKeyboardShortcuts } from '@/hooks/useKeyboardShortcuts';
import { exportTasksToCSV } from '@/utils/exportTasks';
import * as api from '@/lib/api';
import type { Task } from '@timeflow/shared';
import '@/styles/print.css';

type TabType = 'unscheduled' | 'scheduled' | 'completed';

export default function TasksPage() {
  const {
    tasks,
    loading,
    error,
    createTask,
    updateTask,
    completeTask,
    deleteTask,
    refresh,
  } = useTasks();

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

  // Configure sensors for drag interactions
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

    const overdueCount = activeTabTasks.filter((task) => {
      if (!task.dueDate) return false;
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
  }, [activeTabTasks]);

  const groupedSections = useMemo(() => {
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const endOfToday = new Date(startOfToday);
    endOfToday.setHours(23, 59, 59, 999);
    const endOfWeek = new Date(startOfToday);
    endOfWeek.setDate(startOfToday.getDate() + (6 - startOfToday.getDay()));
    endOfWeek.setHours(23, 59, 59, 999);

    const buckets = {
      today: [] as Task[],
      thisWeek: [] as Task[],
      later: [] as Task[],
      noDueDate: [] as Task[],
    };

    activeTabTasks.forEach((task) => {
      if (!task.dueDate) {
        buckets.noDueDate.push(task);
        return;
      }

      const dueDate = new Date(task.dueDate);
      if (dueDate >= startOfToday && dueDate <= endOfToday) {
        buckets.today.push(task);
        return;
      }

      if (dueDate <= endOfWeek) {
        buckets.thisWeek.push(task);
        return;
      }

      buckets.later.push(task);
    });

    return [
      { id: 'today', title: 'Today', tasks: buckets.today },
      { id: 'this-week', title: 'This Week', tasks: buckets.thisWeek },
      { id: 'later', title: 'Later', tasks: buckets.later },
      { id: 'no-due-date', title: 'No Due Date', tasks: buckets.noDueDate },
    ].filter((section) => section.tasks.length > 0);
  }, [activeTabTasks]);

  const handleSmartSchedule = async () => {
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
    } catch (err) {
      setScheduleError(
        err instanceof Error ? err.message : 'Failed to run scheduling'
      );
    } finally {
      setScheduling(false);
    }
  };

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
  const handleCreateTask = async (data: any): Promise<void> => {
    await createTask(data);
  };

  const handleUpdateTask = async (id: string, data: any): Promise<void> => {
    await updateTask(id, data);
  };

  const handleCompleteTask = async (id: string): Promise<void> => {
    await completeTask(id);
  };

  const handleDeleteTask = async (id: string): Promise<void> => {
    await deleteTask(id);
  };

  return (
    <Layout>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
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
                  className="p-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors"
                  title="More actions"
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
          <div className="border-b border-slate-200">
            <nav className="flex -mb-px px-6" aria-label="Tabs">
              <button
                onClick={() => setActiveTab('unscheduled')}
                className={`
                  py-4 px-4 border-b-2 font-medium text-sm transition-colors
                  ${activeTab === 'unscheduled'
                    ? 'border-primary-600 text-primary-600'
                    : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
                  }
                `}
              >
                Unscheduled
                <span className="ml-2 py-0.5 px-2 rounded-full text-xs bg-slate-100 text-slate-600">
                  {unscheduledTasks.length}
                </span>
              </button>
              <button
                onClick={() => setActiveTab('scheduled')}
                className={`
                  py-4 px-4 border-b-2 font-medium text-sm transition-colors
                  ${activeTab === 'scheduled'
                    ? 'border-primary-600 text-primary-600'
                    : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
                  }
                `}
              >
                Scheduled
                <span className="ml-2 py-0.5 px-2 rounded-full text-xs bg-slate-100 text-slate-600">
                  {scheduledTasks.length}
                </span>
              </button>
              <button
                onClick={() => setActiveTab('completed')}
                className={`
                  py-4 px-4 border-b-2 font-medium text-sm transition-colors
                  ${activeTab === 'completed'
                    ? 'border-primary-600 text-primary-600'
                    : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
                  }
                `}
              >
                Completed
                <span className="ml-2 py-0.5 px-2 rounded-full text-xs bg-slate-100 text-slate-600">
                  {completedTasks.length}
                </span>
              </button>
            </nav>
          </div>

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
      />
      <BulkActionToolbar
        selectedCount={selectedTasks.size}
        onComplete={handleBulkComplete}
        onDelete={handleBulkDelete}
        onChangeStatus={handleBulkChangeStatus}
        onClearSelection={clearSelection}
      />
    </Layout>
  );
}
