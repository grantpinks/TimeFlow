'use client';

import { useState, useEffect } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { useDroppable } from '@dnd-kit/core';
import type { Task, CreateTaskRequest, UpdateTaskRequest } from '@timeflow/shared';
import { useCategories } from '@/hooks/useCategories';
import { TaskCard } from '@/components/ui/TaskCard';
import { Button, Input, Select, Textarea, Label, TemplateModal } from '@/components/ui';
import { saveTaskTemplate } from '@/utils/taskTemplates';
import type { TaskTemplate } from '@/utils/taskTemplates';
import { CategoryTrainingModal } from '@/components/CategoryTrainingModal';

interface TaskListProps {
  tasks: Task[];
  onCreateTask: (data: CreateTaskRequest) => Promise<void>;
  onUpdateTask: (id: string, data: UpdateTaskRequest) => Promise<void>;
  onCompleteTask: (id: string) => Promise<void>;
  onDeleteTask: (id: string) => Promise<void>;
  loading?: boolean;
  droppableId?: string;
  autoOpenForm?: boolean;
  selectionMode?: boolean;
  selectedTasks?: Set<string>;
  onToggleSelect?: (taskId: string) => void;
}

export function TaskList({
  tasks,
  onCreateTask,
  onUpdateTask,
  onCompleteTask,
  onDeleteTask,
  loading,
  droppableId,
  autoOpenForm = false,
  selectionMode = false,
  selectedTasks = new Set(),
  onToggleSelect,
}: TaskListProps) {
  const { categories, createCategory } = useCategories();
  const prefersReducedMotion = useReducedMotion();
  const { setNodeRef, isOver } = useDroppable({
    id: droppableId || 'default',
  });
  const [showForm, setShowForm] = useState(false);

  // Auto-open form when triggered by keyboard shortcut
  useEffect(() => {
    if (autoOpenForm) {
      setShowForm(true);
    }
  }, [autoOpenForm]);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [duration, setDuration] = useState(30);
  const [priority, setPriority] = useState<1 | 2 | 3>(2);
  const [dueDate, setDueDate] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [submitting, setSubmitting] = useState(false);
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
  const [showTemplateModal, setShowTemplateModal] = useState(false);
  const [showCustomCategoryModal, setShowCustomCategoryModal] = useState(false);
  const [customCategoryTarget, setCustomCategoryTarget] = useState<'create' | 'edit' | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    setSubmitting(true);
    try {
      await onCreateTask({
        title: title.trim(),
        description: description.trim() || undefined,
        durationMinutes: duration,
        priority,
        dueDate: dueDate || undefined,
        categoryId: categoryId || undefined,
      });
      // Reset form
      setTitle('');
      setDescription('');
      setDuration(30);
      setPriority(2);
      setDueDate('');
      setCategoryId('');
      setShowForm(false);
    } catch (err) {
      console.error('Failed to create task:', err);
    } finally {
      setSubmitting(false);
    }
  };

  const openEditModal = (task: Task) => {
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
      await onUpdateTask(editingTask.id, {
        title: editingState.title.trim(),
        description: editingState.description.trim() || undefined,
        durationMinutes: editingState.durationMinutes,
        priority: editingState.priority,
        dueDate: editingState.dueDate || undefined,
        categoryId: editingState.categoryId || undefined,
      });
      closeEditModal();
    } catch (err) {
      console.error('Failed to update task:', err);
      setEditingSubmitting(false);
    }
  };

  // Template handlers
  const handleSelectTemplate = (template: Omit<TaskTemplate, 'id'>) => {
    setTitle(template.title);
    setDescription(template.description || '');
    setDuration(template.durationMinutes);
    setPriority(template.priority);
    setCategoryId(template.categoryId || '');
    setShowForm(true);
  };

  const handleSaveAsTemplate = () => {
    if (!title.trim()) {
      alert('Please enter a task title first');
      return;
    }

    const templateName = prompt('Enter a name for this template:');
    if (!templateName) return;

    saveTaskTemplate({
      name: templateName.trim(),
      title: title.trim(),
      description: description.trim(),
      durationMinutes: duration,
      priority,
      categoryId: categoryId || undefined,
    });

    alert('Template saved successfully!');
  };

  const handleCustomCategoryComplete = (newCategoryId: string) => {
    if (customCategoryTarget === 'create') {
      setCategoryId(newCategoryId);
    } else if (customCategoryTarget === 'edit') {
      setEditingState((prev) => prev && { ...prev, categoryId: newCategoryId });
    }
    setShowCustomCategoryModal(false);
    setCustomCategoryTarget(null);
  };

  return (
    <div className="space-y-4">
      {/* Add task button/form */}
      {!showForm ? (
        <div className="space-y-2">
          <Button
            onClick={() => setShowForm(true)}
            variant="ghost"
            className="w-full border-2 border-dashed border-slate-300 rounded-lg text-slate-500 hover:border-primary-400 hover:text-primary-600"
          >
            + Add Task
          </Button>
          <Button
            onClick={() => setShowTemplateModal(true)}
            variant="ghost"
            size="sm"
            className="w-full text-slate-500 hover:text-primary-600"
            leftIcon={
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                />
              </svg>
            }
          >
            From Template
          </Button>
        </div>
      ) : (
        <form
          onSubmit={handleSubmit}
          className="bg-white p-4 rounded-lg shadow-sm border border-slate-200 space-y-4"
        >
          <Input
            type="text"
            placeholder="Task title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            autoFocus
          />

          <Textarea
            placeholder="Description (optional)"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={2}
          />

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Category</Label>
              <Select
                value={categoryId}
                onChange={(e) => {
                  const value = e.target.value;
                  if (value === '__custom__') {
                    setCustomCategoryTarget('create');
                    setShowCustomCategoryModal(true);
                    return;
                  }
                  setCategoryId(value);
                }}
              >
                <option value="">No category</option>
                {categories.map((cat) => (
                  <option key={cat.id} value={cat.id}>
                    {cat.name}
                  </option>
                ))}
                <option value="__custom__">Custom...</option>
              </Select>
              <a href="/categories" className="text-xs text-primary-600 hover:text-primary-700 mt-1 inline-block">
                Manage categories
              </a>
            </div>

            <div>
              <Label>Duration</Label>
              <Select
                value={duration}
                onChange={(e) => setDuration(Number(e.target.value))}
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
                value={priority}
                onChange={(e) => setPriority(Number(e.target.value) as 1 | 2 | 3)}
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
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
              />
            </div>
          </div>

          <div className="flex gap-2 justify-between">
            <Button
              type="button"
              onClick={handleSaveAsTemplate}
              variant="ghost"
              size="sm"
              disabled={!title.trim()}
              leftIcon={
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z"
                  />
                </svg>
              }
              title="Save as template"
            >
              Save as Template
            </Button>
            <div className="flex gap-2">
              <Button
                type="button"
                onClick={() => setShowForm(false)}
                variant="ghost"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={submitting || !title.trim()}
                variant="primary"
                loading={submitting}
              >
                {submitting ? 'Adding...' : 'Add Task'}
              </Button>
            </div>
          </div>
        </form>
      )}

      {/* Task list */}
      {loading ? (
        <div ref={setNodeRef} className="text-center text-slate-500 py-8">
          Loading tasks...
        </div>
      ) : tasks.length === 0 ? (
        <div
          ref={setNodeRef}
          className={`text-center text-slate-500 py-8 rounded-lg border-2 border-dashed transition-colors ${
            isOver ? 'border-primary-400 bg-primary-50' : 'border-slate-200'
          }`}
        >
          No tasks yet. Add one above!
        </div>
      ) : (
        <motion.div
          ref={setNodeRef}
          className={`space-y-3 p-4 rounded-lg transition-colors ${
            isOver ? 'bg-primary-50 border-2 border-primary-400' : ''
          }`}
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
          {tasks.map((task) => (
            <TaskCard
              key={task.id}
              task={task}
              onEdit={openEditModal}
              onDelete={onDeleteTask}
              onComplete={onCompleteTask}
              draggable={!selectionMode}
              selectable={selectionMode}
              selected={selectedTasks.has(task.id)}
              onToggleSelect={onToggleSelect}
            />
          ))}
        </motion.div>
      )}

      <AnimatePresence>
        {editingTask && editingState && (
          <motion.div
            className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4"
            initial={{ opacity: prefersReducedMotion ? 1 : 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: prefersReducedMotion ? 1 : 0 }}
          >
            <motion.div
              className="w-full max-w-lg bg-white rounded-lg shadow-xl border border-slate-200"
              initial={prefersReducedMotion ? false : { y: 20, opacity: 0 }}
              animate={prefersReducedMotion ? { opacity: 1 } : { y: 0, opacity: 1 }}
              exit={prefersReducedMotion ? { opacity: 1 } : { y: 10, opacity: 0 }}
              transition={{ duration: prefersReducedMotion ? 0 : 0.18, ease: 'easeOut' }}
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
                      onChange={(e) => {
                        const value = e.target.value;
                        if (value === '__custom__') {
                          setCustomCategoryTarget('edit');
                          setShowCustomCategoryModal(true);
                          return;
                        }
                        setEditingState((prev) => prev && { ...prev, categoryId: value });
                      }}
                    >
                      <option value="">No category</option>
                      {categories.map((cat) => (
                        <option key={cat.id} value={cat.id}>
                          {cat.name}
                        </option>
                      ))}
                      <option value="__custom__">Custom...</option>
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
                  <Button
                    type="button"
                    onClick={closeEditModal}
                    variant="ghost"
                  >
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

      {/* Template Modal */}
      <TemplateModal
        isOpen={showTemplateModal}
        onClose={() => setShowTemplateModal(false)}
        onSelectTemplate={handleSelectTemplate}
        categories={categories}
      />

      <CategoryTrainingModal
        isOpen={showCustomCategoryModal}
        onClose={() => {
          setShowCustomCategoryModal(false);
          setCustomCategoryTarget(null);
        }}
        onComplete={handleCustomCategoryComplete}
        createCategory={createCategory}
      />
    </div>
  );
}
