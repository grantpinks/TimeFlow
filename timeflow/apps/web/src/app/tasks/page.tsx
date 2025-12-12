'use client';

import { useState, useRef, useEffect, useMemo } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { DndContext, DragOverlay, useSensor, useSensors, PointerSensor, KeyboardSensor, DragEndEvent } from '@dnd-kit/core';
import { FloatingAssistantButton } from '@/components/FloatingAssistantButton';
import { Layout } from '@/components/Layout';
import { TaskList } from '@/components/TaskList';
import { Button, HabitCard, SearchBar, FilterPanel } from '@/components/ui';
import type { TaskFilters } from '@/components/ui/FilterPanel';
import { KeyboardShortcutsModal } from '@/components/KeyboardShortcutsModal';
import { BulkActionToolbar } from '@/components/BulkActionToolbar';
import { useTasks } from '@/hooks/useTasks';
import { useHabits } from '@/hooks/useHabits';
import { useCategories } from '@/hooks/useCategories';
import { useKeyboardShortcuts } from '@/hooks/useKeyboardShortcuts';
import { exportTasksToCSV } from '@/utils/exportTasks';
import * as api from '@/lib/api';
import type { Habit, HabitFrequency, TimeOfDay, Task } from '@timeflow/shared';
import '@/styles/print.css';

export default function TasksPage() {
  const prefersReducedMotion = useReducedMotion();
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
  const [scheduling, setScheduling] = useState(false);
  const [scheduleError, setScheduleError] = useState<string | null>(null);
  const [scheduleResult, setScheduleResult] = useState<string | null>(null);

  // Habits state
  const { habits, loading: habitsLoading, createHabit, updateHabit, deleteHabit } = useHabits();
  const [showHabits, setShowHabits] = useState(false);
  const [showAddHabit, setShowAddHabit] = useState(false);
  const [editingHabit, setEditingHabit] = useState<string | null>(null);

  // Form state for add habit
  const [newHabitTitle, setNewHabitTitle] = useState('');
  const [newHabitDescription, setNewHabitDescription] = useState('');
  const [newHabitFrequency, setNewHabitFrequency] = useState<HabitFrequency>('daily');
  const [newHabitDaysOfWeek, setNewHabitDaysOfWeek] = useState<string[]>([]);
  const [newHabitTimeOfDay, setNewHabitTimeOfDay] = useState<TimeOfDay | ''>('');
  const [newHabitDuration, setNewHabitDuration] = useState(30);
  const [newHabitCustomInterval, setNewHabitCustomInterval] = useState(2);

  // Form state for edit habit
  const [editHabitTitle, setEditHabitTitle] = useState('');
  const [editHabitDescription, setEditHabitDescription] = useState('');
  const [editHabitFrequency, setEditHabitFrequency] = useState<HabitFrequency>('daily');
  const [editHabitDaysOfWeek, setEditHabitDaysOfWeek] = useState<string[]>([]);
  const [editHabitTimeOfDay, setEditHabitTimeOfDay] = useState<TimeOfDay | ''>('');
  const [editHabitDuration, setEditHabitDuration] = useState(30);
  const [editHabitIsActive, setEditHabitIsActive] = useState(true);
  const [editHabitCustomInterval, setEditHabitCustomInterval] = useState(2);

  const [addHabitError, setAddHabitError] = useState('');
  const [editHabitError, setEditHabitError] = useState('');

  // Drag and drop state
  const [activeTask, setActiveTask] = useState<Task | null>(null);

  // Keyboard shortcuts state
  const [showShortcutsModal, setShowShortcutsModal] = useState(false);
  const [quickAddColumnIndex, setQuickAddColumnIndex] = useState<number | null>(null);

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
        distance: 8, // Require 8px movement to start drag
      },
    }),
    useSensor(KeyboardSensor)
  );

  // Configure keyboard shortcuts
  useKeyboardShortcuts({
    shortcuts: [
      {
        key: 'k',
        ctrlKey: true,
        description: 'Quick add task to Unscheduled',
        handler: () => {
          setQuickAddColumnIndex(0);
        },
      },
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
          setQuickAddColumnIndex(null);
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
          // Set to end of day
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
          // Tasks without due dates go to end
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
      // Schedule for the next 14 days
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

  // Habit handlers
  const handleAddHabit = async () => {
    if (!newHabitTitle.trim()) {
      setAddHabitError('Title is required');
      return;
    }

    try {
      await createHabit({
        title: newHabitTitle.trim(),
        description: newHabitDescription.trim() || undefined,
        frequency: newHabitFrequency,
        daysOfWeek: newHabitFrequency === 'weekly' ? newHabitDaysOfWeek : undefined,
        preferredTimeOfDay: newHabitTimeOfDay || undefined,
        durationMinutes: newHabitDuration,
      });

      // Reset form
      setNewHabitTitle('');
      setNewHabitDescription('');
      setNewHabitFrequency('daily');
      setNewHabitDaysOfWeek([]);
      setNewHabitTimeOfDay('');
      setNewHabitDuration(30);
      setNewHabitCustomInterval(2);
      setShowAddHabit(false);
      setAddHabitError('');
    } catch (err) {
      setAddHabitError(err instanceof Error ? err.message : 'Failed to create habit');
    }
  };

  const handleEditHabit = (habit: Habit) => {
    setEditingHabit(habit.id);
    setEditHabitTitle(habit.title);
    setEditHabitDescription(habit.description || '');
    setEditHabitFrequency(habit.frequency as HabitFrequency);
    setEditHabitDaysOfWeek(habit.daysOfWeek);
    setEditHabitTimeOfDay((habit.preferredTimeOfDay as TimeOfDay) || '');
    setEditHabitDuration(habit.durationMinutes);
    setEditHabitIsActive(habit.isActive);
    setEditHabitError('');
  };

  const handleSaveEditHabit = async () => {
    if (!editingHabit || !editHabitTitle.trim()) {
      setEditHabitError('Title is required');
      return;
    }

    try {
      await updateHabit(editingHabit, {
        title: editHabitTitle.trim(),
        description: editHabitDescription.trim() || undefined,
        frequency: editHabitFrequency,
        daysOfWeek: editHabitFrequency === 'weekly' ? editHabitDaysOfWeek : undefined,
        preferredTimeOfDay: editHabitTimeOfDay || undefined,
        durationMinutes: editHabitDuration,
        isActive: editHabitIsActive,
      });

      setEditingHabit(null);
      setEditHabitError('');
    } catch (err) {
      setEditHabitError(err instanceof Error ? err.message : 'Failed to update habit');
    }
  };

  const handleDeleteHabit = async (id: string) => {
    if (!confirm('Are you sure you want to delete this habit?')) {
      return;
    }

    try {
      await deleteHabit(id);
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to delete habit');
    }
  };

  const toggleDayOfWeek = (
    day: string,
    daysArray: string[],
    setter: (days: string[]) => void
  ) => {
    if (daysArray.includes(day)) {
      setter(daysArray.filter((d) => d !== day));
    } else {
      setter([...daysArray, day]);
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

    // Determine the new status based on the droppable zone
    const newStatus = over.id as 'unscheduled' | 'scheduled' | 'completed';
    const taskId = active.id as string;

    // Find the task being dragged
    const task = tasks.find((t) => t.id === taskId);
    if (!task || task.status === newStatus) {
      return;
    }

    // Update the task status
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

  // Export handler
  const handleExport = () => {
    exportTasksToCSV(filteredAndSortedTasks);
  };

  // Print handler
  const handlePrint = () => {
    window.print();
  };

  return (
    <Layout>
      <div className="page-shell">
        {/* Header */}
        <motion.div
          className="page-header flex-col sm:flex-row sm:items-center sm:justify-between"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{
            duration: prefersReducedMotion ? 0 : 0.3,
            ease: 'easeOut',
          }}
        >
          <div>
            <h1 className="page-title">Tasks</h1>
            <p className="page-subtitle mt-2 text-sm sm:text-base">
              {tasks.length === 0
                ? 'Create your first task to get started'
                : `Managing ${tasks.length} task${tasks.length === 1 ? '' : 's'} across ${
                    unscheduledTasks.length
                  } unscheduled, ${scheduledTasks.length} scheduled, and ${
                    completedTasks.length
                  } completed`}
            </p>
          </div>
          <div className="flex items-center gap-2 sm:gap-3">
            <button
              onClick={() => setShowShortcutsModal(true)}
              className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
              title="Keyboard shortcuts (Ctrl+/ or ?)"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M8 9l4-4 4 4m0 6l-4 4-4-4"
                />
              </svg>
            </button>
            <Button
              onClick={handlePrint}
              variant="ghost"
              size="md"
              disabled={tasks.length === 0}
              leftIcon={
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z"
                  />
                </svg>
              }
              title="Print tasks"
            >
              <span className="hidden sm:inline">Print</span>
            </Button>
            <Button
              onClick={handleExport}
              variant="ghost"
              size="md"
              disabled={tasks.length === 0}
              leftIcon={
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                  />
                </svg>
              }
              title="Export tasks to CSV"
            >
              <span className="hidden sm:inline">Export</span>
            </Button>
            <Button
              onClick={() => setSelectionMode(!selectionMode)}
              variant={selectionMode ? 'primary' : 'ghost'}
              size="md"
              leftIcon={
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4"
                  />
                </svg>
              }
            >
              <span className="hidden sm:inline">{selectionMode ? 'Done' : 'Select'}</span>
            </Button>
            <Button
              onClick={handleSmartSchedule}
              disabled={scheduling || unscheduledTasks.length === 0}
              variant="primary"
              size="lg"
              loading={scheduling}
              leftIcon={
                !scheduling ? (
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
                ) : undefined
              }
            >
              <span className="hidden sm:inline">{scheduling ? 'Scheduling...' : 'Smart Schedule'}</span>
              <span className="sm:hidden">{scheduling ? 'Scheduling...' : 'Schedule'}</span>
            </Button>
          </div>
        </motion.div>

        {/* Status messages */}
        {scheduleError && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
            {scheduleError}
          </div>
        )}
        {scheduleResult && (
          <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg">
            {scheduleResult}
          </div>
        )}

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
            {error}
          </div>
        )}

        {/* Search, Filter, and Sort Controls */}
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row gap-4">
            {/* Search Bar */}
            <div className="flex-1">
              <SearchBar
                value={searchQuery}
                onChange={setSearchQuery}
                placeholder="Search tasks by title or description..."
              />
            </div>

            {/* Sort Dropdown */}
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

          {/* Filter Panel */}
          <FilterPanel
            filters={filters}
            onFiltersChange={setFilters}
            categories={categories}
            isOpen={showFilters}
            onToggle={() => setShowFilters(!showFilters)}
          />
        </div>

        {/* Task sections */}
        <DndContext
          sensors={sensors}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
        >
          <motion.div
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 lg:gap-8"
            variants={{
              hidden: { opacity: 0 },
              show: {
                opacity: 1,
                transition: {
                  staggerChildren: prefersReducedMotion ? 0 : 0.1,
                },
              },
            }}
            initial="hidden"
            animate="show"
          >
            {/* Unscheduled */}
            <motion.div
              variants={{
                hidden: { opacity: 0, y: 20 },
                show: { opacity: 1, y: 0 },
              }}
            >
              <h2 className="text-base sm:text-lg font-semibold text-slate-700 mb-3 sm:mb-4 flex items-center gap-2">
                <span className="w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full bg-slate-400"></span>
                Unscheduled
                <span className="text-slate-400 font-normal text-sm sm:text-base">
                  ({unscheduledTasks.length})
                </span>
              </h2>
              <TaskList
                tasks={unscheduledTasks}
                onCreateTask={createTask}
                onUpdateTask={updateTask}
                onCompleteTask={completeTask}
                onDeleteTask={deleteTask}
                loading={loading}
                droppableId="unscheduled"
                autoOpenForm={quickAddColumnIndex === 0}
                selectionMode={selectionMode}
                selectedTasks={selectedTasks}
                onToggleSelect={toggleTaskSelection}
              />
            </motion.div>

            {/* Scheduled */}
            <motion.div
              variants={{
                hidden: { opacity: 0, y: 20 },
                show: { opacity: 1, y: 0 },
              }}
            >
              <h2 className="text-base sm:text-lg font-semibold text-slate-700 mb-3 sm:mb-4 flex items-center gap-2">
                <span className="w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full bg-primary-500"></span>
                Scheduled
                <span className="text-slate-400 font-normal text-sm sm:text-base">
                  ({scheduledTasks.length})
                </span>
              </h2>
              {scheduledTasks.length === 0 ? (
                <div className="text-slate-500 text-center py-6 sm:py-8 bg-white rounded-lg border border-slate-200 text-sm sm:text-base">
                  No scheduled tasks
                </div>
              ) : (
                <TaskList
                  tasks={scheduledTasks}
                  onCreateTask={createTask}
                  onUpdateTask={updateTask}
                  onCompleteTask={completeTask}
                  onDeleteTask={deleteTask}
                  droppableId="scheduled"
                  selectionMode={selectionMode}
                  selectedTasks={selectedTasks}
                  onToggleSelect={toggleTaskSelection}
                />
              )}
            </motion.div>

            {/* Completed */}
            <motion.div
              variants={{
                hidden: { opacity: 0, y: 20 },
                show: { opacity: 1, y: 0 },
              }}
            >
              <h2 className="text-base sm:text-lg font-semibold text-slate-700 mb-3 sm:mb-4 flex items-center gap-2">
                <span className="w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full bg-green-500"></span>
                Completed
                <span className="text-slate-400 font-normal text-sm sm:text-base">
                  ({completedTasks.length})
                </span>
              </h2>
              {completedTasks.length === 0 ? (
                <div className="text-slate-500 text-center py-6 sm:py-8 bg-white rounded-lg border border-slate-200 text-sm sm:text-base">
                  No completed tasks
                </div>
              ) : (
                <TaskList
                  tasks={completedTasks}
                  onCreateTask={createTask}
                  onUpdateTask={updateTask}
                  onCompleteTask={completeTask}
                  onDeleteTask={deleteTask}
                  droppableId="completed"
                  selectionMode={selectionMode}
                  selectedTasks={selectedTasks}
                  onToggleSelect={toggleTaskSelection}
                />
              )}
            </motion.div>
          </motion.div>

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

        {/* Habits Section */}
        <div className="border-t border-slate-200 pt-6 sm:pt-8">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-0 mb-4 sm:mb-6">
            <button
              onClick={() => setShowHabits(!showHabits)}
              className="flex items-center gap-2 sm:gap-3 text-xl sm:text-2xl font-bold text-slate-800 hover:text-primary-600 transition-colors"
            >
              <svg
                className={`w-5 h-5 sm:w-6 sm:h-6 transform transition-transform ${showHabits ? 'rotate-90' : ''}`}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 5l7 7-7 7"
                />
              </svg>
              Habits
              <span className="text-xs sm:text-sm text-slate-500 font-normal">
                ({habits.length} {habits.length === 1 ? 'habit' : 'habits'})
              </span>
            </button>
            {showHabits && (
              <button
                onClick={() => setShowAddHabit(true)}
                className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors font-medium text-sm sm:text-base self-start sm:self-auto"
              >
                Add Habit
              </button>
            )}
          </div>

          {showHabits && (
            <div className="space-y-4">
              {/* Add Habit Form */}
              {showAddHabit && (
                <div className="bg-slate-50 rounded-lg border border-slate-200 p-6">
                  <h3 className="text-lg font-semibold text-slate-800 mb-4">Add New Habit</h3>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">
                        Title
                      </label>
                      <input
                        type="text"
                        value={newHabitTitle}
                        onChange={(e) => setNewHabitTitle(e.target.value)}
                        placeholder="e.g., Morning Exercise"
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">
                        Description (optional)
                      </label>
                      <textarea
                        value={newHabitDescription}
                        onChange={(e) => setNewHabitDescription(e.target.value)}
                        placeholder="Additional details..."
                        rows={2}
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg resize-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                      />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">
                          Frequency
                        </label>
                        <select
                          value={newHabitFrequency}
                          onChange={(e) => setNewHabitFrequency(e.target.value as HabitFrequency)}
                          className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                        >
                          <option value="daily">Daily</option>
                          <option value="weekly">Weekly</option>
                          <option value="custom">Custom</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">
                          Time of Day
                        </label>
                        <select
                          value={newHabitTimeOfDay}
                          onChange={(e) => setNewHabitTimeOfDay(e.target.value as TimeOfDay | '')}
                          className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                        >
                          <option value="">Any time</option>
                          <option value="morning">Morning</option>
                          <option value="afternoon">Afternoon</option>
                          <option value="evening">Evening</option>
                        </select>
                      </div>
                    </div>

                    {newHabitFrequency === 'weekly' && (
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-2">
                          Days of Week
                        </label>
                        <div className="flex gap-2 flex-wrap">
                          {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((day) => (
                            <button
                              key={day}
                              type="button"
                              onClick={() =>
                                toggleDayOfWeek(day.toLowerCase(), newHabitDaysOfWeek, setNewHabitDaysOfWeek)
                              }
                              className={`px-3 py-2 rounded-lg border text-sm font-medium transition-colors ${
                                newHabitDaysOfWeek.includes(day.toLowerCase())
                                  ? 'bg-primary-600 text-white border-primary-600'
                                  : 'bg-white text-slate-700 border-slate-300 hover:border-primary-300'
                              }`}
                            >
                              {day}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}

                    {newHabitFrequency === 'custom' && (
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-2">
                          Repeat Interval
                        </label>
                        <div className="flex items-center gap-3">
                          <span className="text-sm text-slate-600">Every</span>
                          <input
                            type="number"
                            value={newHabitCustomInterval}
                            onChange={(e) => setNewHabitCustomInterval(Math.max(1, Number(e.target.value)))}
                            min="1"
                            max="30"
                            className="w-20 px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                          />
                          <span className="text-sm text-slate-600">day{newHabitCustomInterval !== 1 ? 's' : ''}</span>
                        </div>
                        <p className="text-xs text-slate-500 mt-1">
                          e.g., Every 2 days = Mon, Wed, Fri, Sun, Tue...
                        </p>
                      </div>
                    )}

                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">
                        Duration (minutes)
                      </label>
                      <input
                        type="number"
                        value={newHabitDuration}
                        onChange={(e) => setNewHabitDuration(Number(e.target.value))}
                        min="5"
                        max="240"
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                      />
                    </div>

                    {addHabitError && (
                      <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-2 rounded-lg text-sm">
                        {addHabitError}
                      </div>
                    )}

                    <div className="flex gap-3">
                      <button
                        onClick={handleAddHabit}
                        disabled={!newHabitTitle.trim()}
                        className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:bg-slate-300 disabled:cursor-not-allowed transition-colors font-medium"
                      >
                        Add Habit
                      </button>
                      <button
                        onClick={() => {
                          setShowAddHabit(false);
                          setAddHabitError('');
                        }}
                        className="px-4 py-2 bg-slate-200 text-slate-700 rounded-lg hover:bg-slate-300 transition-colors font-medium"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Habits List */}
              {habitsLoading ? (
                <div className="flex justify-center items-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
                </div>
              ) : habits.length === 0 ? (
                <div className="text-center py-12 bg-white rounded-lg border border-slate-200">
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
                      d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4"
                    />
                  </svg>
                  <p className="text-lg text-slate-600 mb-2">No habits yet</p>
                  <p className="text-sm text-slate-500">
                    Create your first habit to start building better routines
                  </p>
                </div>
              ) : (
                <motion.div
                  className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4"
                  variants={{
                    hidden: { opacity: 0 },
                    show: {
                      opacity: 1,
                      transition: {
                        staggerChildren: prefersReducedMotion ? 0 : 0.05,
                      },
                    },
                  }}
                  initial="hidden"
                  animate="show"
                >
                  {habits.map((habit) => (
                    <div key={habit.id}>
                      {editingHabit === habit.id ? (
                        <div className="space-y-3">
                          <input
                            type="text"
                            value={editHabitTitle}
                            onChange={(e) => setEditHabitTitle(e.target.value)}
                            className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                          />

                          <textarea
                            value={editHabitDescription}
                            onChange={(e) => setEditHabitDescription(e.target.value)}
                            rows={2}
                            placeholder="Description..."
                            className="w-full px-3 py-2 border border-slate-300 rounded-lg resize-none focus:ring-2 focus:ring-primary-500"
                          />

                          <div className="grid grid-cols-2 gap-3">
                            <div>
                              <label className="block text-xs font-medium text-slate-700 mb-1">
                                Frequency
                              </label>
                              <select
                                value={editHabitFrequency}
                                onChange={(e) => setEditHabitFrequency(e.target.value as HabitFrequency)}
                                className="w-full px-2 py-1.5 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                              >
                                <option value="daily">Daily</option>
                                <option value="weekly">Weekly</option>
                                <option value="custom">Custom</option>
                              </select>
                            </div>

                            <div>
                              <label className="block text-xs font-medium text-slate-700 mb-1">
                                Time
                              </label>
                              <select
                                value={editHabitTimeOfDay}
                                onChange={(e) => setEditHabitTimeOfDay(e.target.value as TimeOfDay | '')}
                                className="w-full px-2 py-1.5 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                              >
                                <option value="">Any</option>
                                <option value="morning">AM</option>
                                <option value="afternoon">PM</option>
                                <option value="evening">Eve</option>
                              </select>
                            </div>
                          </div>

                          {editHabitFrequency === 'weekly' && (
                            <div>
                              <label className="block text-xs font-medium text-slate-700 mb-2">
                                Days
                              </label>
                              <div className="flex gap-1 flex-wrap">
                                {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((day) => (
                                  <button
                                    key={day}
                                    type="button"
                                    onClick={() =>
                                      toggleDayOfWeek(day.toLowerCase(), editHabitDaysOfWeek, setEditHabitDaysOfWeek)
                                    }
                                    className={`px-2 py-1 rounded border text-xs font-medium ${
                                      editHabitDaysOfWeek.includes(day.toLowerCase())
                                        ? 'bg-primary-600 text-white border-primary-600'
                                        : 'bg-white text-slate-700 border-slate-300'
                                    }`}
                                  >
                                    {day.substring(0, 1)}
                                  </button>
                                ))}
                              </div>
                            </div>
                          )}

                          {editHabitFrequency === 'custom' && (
                            <div>
                              <label className="block text-xs font-medium text-slate-700 mb-2">
                                Repeat Interval
                              </label>
                              <div className="flex items-center gap-2">
                                <span className="text-xs text-slate-600">Every</span>
                                <input
                                  type="number"
                                  value={editHabitCustomInterval}
                                  onChange={(e) => setEditHabitCustomInterval(Math.max(1, Number(e.target.value)))}
                                  min="1"
                                  max="30"
                                  className="w-16 px-2 py-1.5 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                                />
                                <span className="text-xs text-slate-600">day{editHabitCustomInterval !== 1 ? 's' : ''}</span>
                              </div>
                            </div>
                          )}

                          <div className="grid grid-cols-2 gap-3">
                            <div>
                              <label className="block text-xs font-medium text-slate-700 mb-1">
                                Duration (min)
                              </label>
                              <input
                                type="number"
                                value={editHabitDuration}
                                onChange={(e) => setEditHabitDuration(Number(e.target.value))}
                                min="5"
                                max="240"
                                className="w-full px-2 py-1.5 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                              />
                            </div>

                            <div>
                              <label className="block text-xs font-medium text-slate-700 mb-1">
                                Status
                              </label>
                              <select
                                value={editHabitIsActive ? 'active' : 'inactive'}
                                onChange={(e) => setEditHabitIsActive(e.target.value === 'active')}
                                className="w-full px-2 py-1.5 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                              >
                                <option value="active">Active</option>
                                <option value="inactive">Inactive</option>
                              </select>
                            </div>
                          </div>

                          {editHabitError && (
                            <p className="text-xs text-red-600">{editHabitError}</p>
                          )}

                          <div className="flex gap-2">
                            <button
                              onClick={handleSaveEditHabit}
                              className="flex-1 px-3 py-1.5 text-sm bg-primary-600 text-white rounded-lg hover:bg-primary-700"
                            >
                              Save
                            </button>
                            <button
                              onClick={() => {
                                setEditingHabit(null);
                                setEditHabitError('');
                              }}
                              className="flex-1 px-3 py-1.5 text-sm bg-slate-200 text-slate-700 rounded-lg hover:bg-slate-300"
                            >
                              Cancel
                            </button>
                          </div>
                        </div>
                      ) : (
                        <HabitCard
                          habit={habit}
                          onEdit={handleEditHabit}
                          onDelete={handleDeleteHabit}
                        />
                      )}
                    </div>
                  ))}
                </motion.div>
              )}
            </div>
          )}
        </div>
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
