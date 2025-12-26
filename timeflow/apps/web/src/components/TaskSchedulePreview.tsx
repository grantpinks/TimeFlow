'use client';

/**
 * TaskSchedulePreview component for drag-and-drop scheduling workflow
 *
 * Z-index hierarchy (highest to lowest):
 * - z-50: TaskSchedulePreview (this component)
 * - z-40: Other modals (future)
 * - z-30: EventDetailPopover
 * - z-20: Dropdowns, tooltips
 * - z-10: Sticky headers
 */

import React from 'react';
import type { Task } from '@timeflow/shared';

interface TaskSchedulePreviewProps {
  task: Task;
  slot: { start: Date; end: Date };
  onConfirm: () => void;
  onCancel: () => void;
  isScheduling: boolean;
}

export function TaskSchedulePreview({
  task,
  slot,
  onConfirm,
  onCancel,
  isScheduling,
}: TaskSchedulePreviewProps) {
  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
    });
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl p-6 max-w-md w-full mx-4">
        <h3 className="text-lg font-semibold text-slate-900 mb-4">
          Schedule Task Preview
        </h3>

        <div className="space-y-3 mb-6">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Task
            </label>
            <p className="text-base text-slate-900">{task.title}</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Duration
            </label>
            <p className="text-base text-slate-900">
              {task.durationMinutes} minutes
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Scheduled Time
            </label>
            <p className="text-base text-slate-900">
              {formatDate(slot.start)} at {formatTime(slot.start)} - {formatTime(slot.end)}
            </p>
          </div>

          {task.dueDate && (
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Due Date
              </label>
              <p className="text-base text-slate-900">
                {formatDate(new Date(task.dueDate))}
              </p>
            </div>
          )}
        </div>

        <div className="flex gap-3">
          <button
            onClick={onCancel}
            disabled={isScheduling}
            className="flex-1 px-4 py-2 border border-slate-300 rounded-lg text-slate-700 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={isScheduling}
            className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isScheduling ? 'Scheduling...' : 'Complete'}
          </button>
        </div>
      </div>
    </div>
  );
}
