'use client';

import { useState } from 'react';
import type { Task, CreateTaskRequest } from '@timeflow/shared';

interface TaskListProps {
  tasks: Task[];
  onCreateTask: (data: CreateTaskRequest) => Promise<void>;
  onCompleteTask: (id: string) => Promise<void>;
  onDeleteTask: (id: string) => Promise<void>;
  loading?: boolean;
}

const priorityLabels: Record<number, string> = {
  1: 'High',
  2: 'Medium',
  3: 'Low',
};

const priorityColors: Record<number, string> = {
  1: 'bg-red-100 text-red-700',
  2: 'bg-yellow-100 text-yellow-700',
  3: 'bg-green-100 text-green-700',
};

export function TaskList({
  tasks,
  onCreateTask,
  onCompleteTask,
  onDeleteTask,
  loading,
}: TaskListProps) {
  const [showForm, setShowForm] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [duration, setDuration] = useState(30);
  const [priority, setPriority] = useState<1 | 2 | 3>(2);
  const [dueDate, setDueDate] = useState('');
  const [submitting, setSubmitting] = useState(false);

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
      });
      // Reset form
      setTitle('');
      setDescription('');
      setDuration(30);
      setPriority(2);
      setDueDate('');
      setShowForm(false);
    } catch (err) {
      console.error('Failed to create task:', err);
    } finally {
      setSubmitting(false);
    }
  };

  const formatDate = (dateString: string | null | undefined) => {
    if (!dateString) return null;
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
    });
  };

  const formatDuration = (minutes: number) => {
    if (minutes < 60) return `${minutes}m`;
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
  };

  return (
    <div className="space-y-4">
      {/* Add task button/form */}
      {!showForm ? (
        <button
          onClick={() => setShowForm(true)}
          className="w-full py-3 border-2 border-dashed border-slate-300 rounded-lg text-slate-500 hover:border-primary-400 hover:text-primary-600 transition-colors"
        >
          + Add Task
        </button>
      ) : (
        <form
          onSubmit={handleSubmit}
          className="bg-white p-4 rounded-lg shadow-sm border border-slate-200 space-y-4"
        >
          <input
            type="text"
            placeholder="Task title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
            autoFocus
          />

          <textarea
            placeholder="Description (optional)"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 resize-none"
            rows={2}
          />

          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-sm text-slate-600 mb-1">
                Duration
              </label>
              <select
                value={duration}
                onChange={(e) => setDuration(Number(e.target.value))}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
              >
                <option value={15}>15 min</option>
                <option value={30}>30 min</option>
                <option value={45}>45 min</option>
                <option value={60}>1 hour</option>
                <option value={90}>1.5 hours</option>
                <option value={120}>2 hours</option>
                <option value={180}>3 hours</option>
              </select>
            </div>

            <div>
              <label className="block text-sm text-slate-600 mb-1">
                Priority
              </label>
              <select
                value={priority}
                onChange={(e) => setPriority(Number(e.target.value) as 1 | 2 | 3)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
              >
                <option value={1}>High</option>
                <option value={2}>Medium</option>
                <option value={3}>Low</option>
              </select>
            </div>

            <div>
              <label className="block text-sm text-slate-600 mb-1">
                Due Date
              </label>
              <input
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
            </div>
          </div>

          <div className="flex gap-2 justify-end">
            <button
              type="button"
              onClick={() => setShowForm(false)}
              className="px-4 py-2 text-slate-600 hover:text-slate-800"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting || !title.trim()}
              className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50"
            >
              {submitting ? 'Adding...' : 'Add Task'}
            </button>
          </div>
        </form>
      )}

      {/* Task list */}
      {loading ? (
        <div className="text-center text-slate-500 py-8">Loading tasks...</div>
      ) : tasks.length === 0 ? (
        <div className="text-center text-slate-500 py-8">
          No tasks yet. Add one above!
        </div>
      ) : (
        <ul className="space-y-2">
          {tasks.map((task) => (
            <li
              key={task.id}
              className={`bg-white p-4 rounded-lg shadow-sm border border-slate-200 flex items-center gap-4 ${
                task.status === 'completed' ? 'opacity-60' : ''
              }`}
            >
              {/* Complete button */}
              <button
                onClick={() => onCompleteTask(task.id)}
                disabled={task.status === 'completed'}
                className={`w-6 h-6 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${
                  task.status === 'completed'
                    ? 'bg-green-500 border-green-500 text-white'
                    : 'border-slate-300 hover:border-green-500'
                }`}
              >
                {task.status === 'completed' && (
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
                      d="M5 13l4 4L19 7"
                    />
                  </svg>
                )}
              </button>

              {/* Task info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span
                    className={`font-medium ${
                      task.status === 'completed'
                        ? 'line-through text-slate-400'
                        : 'text-slate-800'
                    }`}
                  >
                    {task.title}
                  </span>
                  <span
                    className={`text-xs px-2 py-0.5 rounded ${
                      priorityColors[task.priority]
                    }`}
                  >
                    {priorityLabels[task.priority]}
                  </span>
                  {task.status === 'scheduled' && (
                    <span className="text-xs px-2 py-0.5 rounded bg-primary-100 text-primary-700">
                      Scheduled
                    </span>
                  )}
                </div>
                <div className="text-sm text-slate-500 flex gap-3 mt-1">
                  <span>{formatDuration(task.durationMinutes)}</span>
                  {task.dueDate && (
                    <span>Due: {formatDate(task.dueDate)}</span>
                  )}
                  {task.scheduledTask && (
                    <span>
                      Scheduled:{' '}
                      {new Date(task.scheduledTask.startDateTime).toLocaleString(
                        'en-US',
                        {
                          month: 'short',
                          day: 'numeric',
                          hour: 'numeric',
                          minute: '2-digit',
                        }
                      )}
                    </span>
                  )}
                </div>
              </div>

              {/* Delete button */}
              <button
                onClick={() => onDeleteTask(task.id)}
                className="text-slate-400 hover:text-red-500 p-1"
                title="Delete task"
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
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

