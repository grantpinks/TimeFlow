'use client';

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { useDraggable } from '@dnd-kit/core';
import type { Task } from '@timeflow/shared';

export interface TaskCardProps {
  task: Task;
  onEdit?: (task: Task) => void;
  onDelete?: (taskId: string) => void;
  onComplete?: (taskId: string) => void;
  showActions?: boolean;
  draggable?: boolean;
  selectable?: boolean;
  selected?: boolean;
  onToggleSelect?: (taskId: string) => void;
}

export const TaskCard = React.forwardRef<HTMLDivElement, TaskCardProps>(
  ({ task, onEdit, onDelete, onComplete, showActions = true, draggable = false, selectable = false, selected = false, onToggleSelect }, ref) => {
    const [isExpanded, setIsExpanded] = useState(false);

    const {
      attributes,
      listeners,
      setNodeRef,
      transform,
      isDragging,
    } = useDraggable({
      id: task.id,
      disabled: !draggable,
    });

    const priorityConfig = {
      1: { label: 'HIGH', color: 'bg-red-100 text-red-700 border-red-300' },
      2: { label: 'MED', color: 'bg-yellow-100 text-yellow-700 border-yellow-300' },
      3: { label: 'LOW', color: 'bg-green-100 text-green-700 border-green-300' },
    };

    const priority = priorityConfig[task.priority];

    const isOverdue = task.dueDate && new Date(task.dueDate) < new Date() && task.status !== 'completed';
    const isCompleted = task.status === 'completed';

    const baseCardStyles = `
      bg-white border rounded-lg p-4 transition-all duration-200
      ${isOverdue ? 'border-red-200 bg-red-50' : 'border-slate-200'}
      ${isCompleted ? 'opacity-60' : ''}
    `;

    const categoryBorderStyle = task.category?.color
      ? { borderLeftWidth: '4px', borderLeftColor: task.category.color }
      : {};

    const formatDate = (dateStr: string) => {
      const date = new Date(dateStr);
      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
    };

    const truncateDescription = (text: string, maxLength: number) => {
      if (text.length <= maxLength) return text;
      return text.substring(0, maxLength) + '...';
    };

    const dragStyle = transform
      ? {
          transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
          opacity: isDragging ? 0.5 : 1,
          cursor: draggable ? 'grab' : 'default',
        }
      : { cursor: draggable ? 'grab' : 'default' };

    return (
      <motion.div
        ref={(node) => {
          setNodeRef(node);
          if (typeof ref === 'function') {
            ref(node);
          } else if (ref) {
            ref.current = node;
          }
        }}
        {...(draggable ? { ...attributes, ...listeners } : {})}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95 }}
        whileHover={!isDragging ? { scale: 1.01, boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)' } : {}}
        transition={{ duration: 0.2 }}
        className={baseCardStyles}
        style={{ ...categoryBorderStyle, ...dragStyle }}
      >
        <div className="flex items-start gap-3">
          {/* Selection Checkbox */}
          {selectable && onToggleSelect && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onToggleSelect(task.id);
              }}
              className={`
                mt-1 w-5 h-5 rounded border-2 flex items-center justify-center
                transition-all duration-200 flex-shrink-0
                ${selected
                  ? 'bg-primary-600 border-primary-600'
                  : 'border-slate-300 hover:border-primary-500 hover:bg-primary-50'
                }
              `}
            >
              {selected && (
                <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                </svg>
              )}
            </button>
          )}

          {/* Completion Checkbox */}
          {!selectable && showActions && onComplete && (
            <button
              onClick={() => onComplete(task.id)}
              className={`
                mt-1 w-5 h-5 rounded border-2 flex items-center justify-center
                transition-all duration-200 flex-shrink-0
                ${isCompleted
                  ? 'bg-green-500 border-green-500'
                  : 'border-slate-300 hover:border-primary-500 hover:bg-primary-50'
                }
              `}
            >
              {isCompleted && (
                <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                </svg>
              )}
            </button>
          )}

          {/* Content */}
          <div className="flex-1 min-w-0">
            {/* Title and Priority */}
            <div className="flex items-start gap-2 mb-2">
              <h3 className={`font-medium text-slate-900 flex-1 ${isCompleted ? 'line-through' : ''}`}>
                {task.title}
              </h3>
              <span className={`px-2 py-0.5 text-xs font-semibold rounded border ${priority.color} whitespace-nowrap`}>
                {priority.label}
              </span>
            </div>

            {/* Category Badge */}
            {task.category && (
              <div className="mb-2">
                <span
                  className="inline-flex items-center px-2 py-1 rounded text-xs font-medium"
                  style={{
                    backgroundColor: task.category.color ? `${task.category.color}20` : '#f1f5f9',
                    color: task.category.color || '#64748b',
                  }}
                >
                  {task.category.name}
                </span>
              </div>
            )}

            {/* Metadata Row */}
            <div className="flex flex-wrap items-center gap-3 text-sm text-slate-600 mb-2">
              {/* Duration */}
              <div className="flex items-center gap-1">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span>{task.durationMinutes}m</span>
              </div>

              {/* Due Date */}
              {task.dueDate && (
                <div className={`flex items-center gap-1 ${isOverdue ? 'text-red-600 font-medium' : ''}`}>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  <span>{formatDate(task.dueDate)}</span>
                  {isOverdue && <span className="text-xs">(OVERDUE)</span>}
                </div>
              )}

              {/* Scheduled Time */}
              {task.scheduledTask && (
                <div className="flex items-center gap-1 text-primary-600">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                  </svg>
                  <span className="text-xs font-medium">
                    {formatDate(task.scheduledTask.startDateTime)}
                  </span>
                </div>
              )}
            </div>

            {/* Description */}
            {task.description && (
              <div className="text-sm text-slate-600">
                <p className={isCompleted ? 'line-through' : ''}>
                  {isExpanded ? task.description : truncateDescription(task.description, 80)}
                </p>
                {task.description.length > 80 && (
                  <button
                    onClick={() => setIsExpanded(!isExpanded)}
                    className="text-primary-600 hover:text-primary-700 text-xs font-medium mt-1"
                  >
                    {isExpanded ? 'Show less' : 'Show more'}
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Actions */}
          {showActions && (onEdit || onDelete) && (
            <div className="flex items-center gap-1 flex-shrink-0">
              {onEdit && (
                <button
                  onClick={() => onEdit(task)}
                  className="p-1.5 text-slate-400 hover:text-primary-600 hover:bg-primary-50 rounded transition-colors"
                  title="Edit task"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                  </svg>
                </button>
              )}
              {onDelete && (
                <button
                  onClick={() => onDelete(task.id)}
                  className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                  title="Delete task"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </button>
              )}
            </div>
          )}
        </div>

        {/* Overflow Warning */}
        {task.scheduledTask?.overflowedDeadline && (
          <div className="mt-3 pt-3 border-t border-red-200">
            <div className="flex items-center gap-2 text-xs text-red-600">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              <span className="font-medium">Scheduled after deadline</span>
            </div>
          </div>
        )}
      </motion.div>
    );
  }
);

TaskCard.displayName = 'TaskCard';
