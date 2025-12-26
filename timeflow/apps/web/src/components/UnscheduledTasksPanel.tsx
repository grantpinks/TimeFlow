'use client';

import { useState } from 'react';
import { useDraggable } from '@dnd-kit/core';
import type { Task } from '@timeflow/shared';

interface UnscheduledTasksPanelProps {
  tasks: Task[];
  onTaskClick?: (task: Task) => void;
  onCompleteTask?: (taskId: string) => Promise<void>;
  onDeleteTask?: (taskId: string) => Promise<void>;
}

export function UnscheduledTasksPanel({
  tasks,
  onTaskClick,
  onCompleteTask,
  onDeleteTask,
}: UnscheduledTasksPanelProps) {
  const [expanded, setExpanded] = useState(true);

  return (
    <div className="bg-white border-b border-slate-200 overflow-hidden flex-shrink-0">
      {/* Header */}
      <div
        className="flex items-center justify-between px-3 py-2.5 cursor-pointer hover:bg-slate-50/50 transition-colors"
        onClick={() => setExpanded(!expanded)}
      >
        <h3 className="text-sm font-semibold text-slate-800">Unscheduled Tasks</h3>
        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full font-medium">
            {tasks.length}
          </span>
          <svg
            className={`w-3.5 h-3.5 text-slate-400 transition-transform ${expanded ? 'rotate-180' : ''}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </div>

      {/* Tasks List */}
      {expanded && (
        <div className="max-h-96 overflow-y-auto">
          {tasks.length === 0 ? (
            <div className="p-8 text-center">
              <svg
                className="w-10 h-10 mx-auto mb-2 text-slate-300"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
                />
              </svg>
              <p className="text-xs font-medium text-slate-700">All caught up!</p>
              <p className="text-[11px] text-slate-500 mt-0.5">No unscheduled tasks</p>
            </div>
          ) : (
            <div className="divide-y divide-slate-50">
              {tasks.map((task) => (
                <DraggableTaskItem
                  key={task.id}
                  task={task}
                  onTaskClick={onTaskClick}
                  onCompleteTask={onCompleteTask}
                  onDeleteTask={onDeleteTask}
                />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function DraggableTaskItem({
  task,
  onTaskClick,
  onCompleteTask,
  onDeleteTask,
}: {
  task: Task;
  onTaskClick?: (task: Task) => void;
  onCompleteTask?: (taskId: string) => Promise<void>;
  onDeleteTask?: (taskId: string) => Promise<void>;
}) {
  const [showActions, setShowActions] = useState(false);

  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: `task-${task.id}`,
    data: { task },
  });

  const style: React.CSSProperties = {
    transform: transform ? `translate3d(${transform.x}px, ${transform.y}px, 0)` : undefined,
    opacity: isDragging ? 0.5 : 1,
  };

  const handleComplete = async (e: React.MouseEvent) => {
    e.stopPropagation();
    await onCompleteTask?.(task.id);
  };

  const handleDelete = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (window.confirm(`Delete "${task.title}"?`)) {
      await onDeleteTask?.(task.id);
    }
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="px-3 py-2 hover:bg-slate-50/50 transition-colors cursor-move relative group"
      onMouseEnter={() => setShowActions(true)}
      onMouseLeave={() => setShowActions(false)}
      onClick={() => onTaskClick?.(task)}
      {...listeners}
      {...attributes}
    >
      <div className="flex items-start gap-2.5">
        {/* Category color indicator */}
        <div
          className="w-2 h-2 rounded-full mt-1 flex-shrink-0"
          style={{ backgroundColor: task.category?.color || '#0BAF9A' }}
        />

        <div className="flex-1 min-w-0">
          <p className="text-xs font-medium text-slate-800 truncate leading-snug">
            {task.title}
          </p>
          <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
            {task.category && (
              <span className="text-[11px] text-slate-600 bg-slate-100 px-1.5 py-0.5 rounded font-medium">
                {task.category.name}
              </span>
            )}
            <span className="text-[11px] text-slate-500">
              {task.durationMinutes}m
            </span>
            {task.priority && (
              <span
                className={`text-[11px] px-1.5 py-0.5 rounded font-semibold ${
                  task.priority === 1
                    ? 'bg-red-100 text-red-700'
                    : task.priority === 2
                    ? 'bg-amber-100 text-amber-700'
                    : 'bg-slate-100 text-slate-600'
                }`}
              >
                P{task.priority}
              </span>
            )}
          </div>
        </div>

        {/* Quick Actions */}
        {showActions && (
          <div className="flex items-center gap-0.5 flex-shrink-0">
            <button
              onClick={handleComplete}
              className="p-1 hover:bg-green-100 rounded transition-colors"
              title="Complete task"
            >
              <svg
                className="w-3.5 h-3.5 text-green-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2.5}
                  d="M5 13l4 4L19 7"
                />
              </svg>
            </button>
            <button
              onClick={handleDelete}
              className="p-1 hover:bg-red-100 rounded transition-colors"
              title="Delete task"
            >
              <svg
                className="w-3.5 h-3.5 text-red-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2.5}
                  d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                />
              </svg>
            </button>
          </div>
        )}
      </div>

      {/* Drag hint */}
      {isDragging && (
        <div className="absolute inset-0 bg-primary-50 border border-dashed border-primary-300 rounded-lg flex items-center justify-center">
          <p className="text-[11px] text-primary-600 font-semibold">Drop on calendar to schedule</p>
        </div>
      )}
    </div>
  );
}
