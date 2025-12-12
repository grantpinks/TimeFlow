/**
 * Event Detail Popover Component
 *
 * Displays detailed information about calendar events with quick actions.
 * Supports intelligent positioning and keyboard navigation.
 */

'use client';

import { useEffect, useRef } from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import type { Task } from '@timeflow/shared';

interface EventDetailPopoverProps {
  isOpen: boolean;
  onClose: () => void;
  event: {
    id: string;
    title: string;
    start: Date;
    end: Date;
    description?: string;
    isTask: boolean;
    task?: Task;
    categoryColor?: string;
    categoryName?: string;
    overflowed?: boolean;
  } | null;
  position: { x: number; y: number };
  onComplete?: (taskId: string) => void;
  onEdit?: (taskId: string) => void;
  onUnschedule?: (taskId: string) => void;
  onDelete?: (taskId: string) => void;
}

export function EventDetailPopover({
  isOpen,
  onClose,
  event,
  position,
  onComplete,
  onEdit,
  onUnschedule,
  onDelete,
}: EventDetailPopoverProps) {
  const popoverRef = useRef<HTMLDivElement>(null);
  const prefersReducedMotion = useReducedMotion();

  // Close on Escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      return () => document.removeEventListener('keydown', handleEscape);
    }
  }, [isOpen, onClose]);

  // Close on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (popoverRef.current && !popoverRef.current.contains(e.target as Node)) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isOpen, onClose]);

  if (!event) return null;

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
    });
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
    });
  };

  const getDuration = () => {
    const durationMs = event.end.getTime() - event.start.getTime();
    const durationMinutes = Math.floor(durationMs / 60000);
    if (durationMinutes < 60) return `${durationMinutes}min`;
    const hours = Math.floor(durationMinutes / 60);
    const mins = durationMinutes % 60;
    return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
  };

  const getPriorityLabel = (priority?: 1 | 2 | 3) => {
    if (!priority) return null;
    const labels = { 1: 'High', 2: 'Medium', 3: 'Low' };
    const colors = {
      1: 'bg-red-100 text-red-700 border-red-200',
      2: 'bg-amber-100 text-amber-700 border-amber-200',
      3: 'bg-slate-100 text-slate-700 border-slate-200',
    };
    return { label: labels[priority], color: colors[priority] };
  };

  // Intelligent positioning (avoid overflow)
  const getPopoverStyle = () => {
    const popoverWidth = 320;
    const popoverHeight = 300;
    const padding = 16;

    let x = position.x;
    let y = position.y;

    // Adjust horizontal position
    if (x + popoverWidth > window.innerWidth - padding) {
      x = window.innerWidth - popoverWidth - padding;
    }
    if (x < padding) {
      x = padding;
    }

    // Adjust vertical position
    if (y + popoverHeight > window.innerHeight - padding) {
      y = window.innerHeight - popoverHeight - padding;
    }
    if (y < padding) {
      y = padding;
    }

    return { left: x, top: y };
  };

  const priority = event.task ? getPriorityLabel(event.task.priority) : null;

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          ref={popoverRef}
          className="fixed z-50 w-80 bg-white rounded-lg shadow-2xl border border-slate-200 overflow-hidden"
          style={getPopoverStyle()}
          initial={prefersReducedMotion ? { opacity: 1 } : { opacity: 0, scale: 0.95, y: -10 }}
          animate={prefersReducedMotion ? { opacity: 1 } : { opacity: 1, scale: 1, y: 0 }}
          exit={prefersReducedMotion ? { opacity: 1 } : { opacity: 0, scale: 0.95, y: -10 }}
          transition={{ duration: prefersReducedMotion ? 0 : 0.15, ease: 'easeOut' }}
          role="dialog"
          aria-label="Event details"
        >
          {/* Header with color indicator */}
          <div
            className="px-4 py-3 border-b border-slate-200"
            style={{
              borderLeftWidth: '4px',
              borderLeftColor: event.categoryColor || '#0BAF9A',
            }}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold text-slate-900 text-base leading-tight">
                  {event.title}
                </h3>
                <div className="flex items-center gap-2 mt-1 flex-wrap">
                  <span className="text-xs text-slate-600">
                    {event.isTask ? 'Task' : 'Event'}
                  </span>
                  {event.categoryName && (
                    <span className="text-xs px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 border border-slate-200">
                      {event.categoryName}
                    </span>
                  )}
                  {priority && (
                    <span className={`text-xs px-2 py-0.5 rounded-full border ${priority.color}`}>
                      {priority.label}
                    </span>
                  )}
                  {event.overflowed && (
                    <span className="text-xs px-2 py-0.5 rounded-full bg-orange-100 text-orange-700 border border-orange-200">
                      Overdue
                    </span>
                  )}
                </div>
              </div>
              <button
                onClick={onClose}
                className="text-slate-400 hover:text-slate-600 transition-colors p-1 rounded hover:bg-slate-100"
                aria-label="Close"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>

          {/* Body */}
          <div className="px-4 py-3 space-y-3">
            {/* Time & Duration */}
            <div className="space-y-1.5">
              <div className="flex items-center gap-2 text-sm text-slate-700">
                <svg className="w-4 h-4 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span>{formatDate(event.start)}</span>
              </div>
              <div className="flex items-center gap-2 text-sm text-slate-700">
                <svg className="w-4 h-4 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span>
                  {formatTime(event.start)} - {formatTime(event.end)} ({getDuration()})
                </span>
              </div>
            </div>

            {/* Description */}
            {event.description && (
              <div className="pt-2 border-t border-slate-100">
                <p className="text-xs text-slate-600 leading-relaxed">{event.description}</p>
              </div>
            )}
          </div>

          {/* Quick Actions (only for tasks) */}
          {event.isTask && event.task && (
            <div className="px-4 py-3 bg-slate-50 border-t border-slate-200">
              <div className="grid grid-cols-2 gap-2">
                {event.task.status !== 'completed' && onComplete && (
                  <button
                    onClick={() => {
                      onComplete(event.id);
                      onClose();
                    }}
                    className="px-3 py-2 text-xs font-medium text-white bg-green-600 hover:bg-green-700 rounded-lg transition-colors flex items-center justify-center gap-1.5"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    Complete
                  </button>
                )}

                {onEdit && (
                  <button
                    onClick={() => {
                      onEdit(event.id);
                      onClose();
                    }}
                    className="px-3 py-2 text-xs font-medium text-slate-700 bg-white hover:bg-slate-100 border border-slate-300 rounded-lg transition-colors flex items-center justify-center gap-1.5"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                    </svg>
                    Edit
                  </button>
                )}

                {onUnschedule && event.task.status === 'scheduled' && (
                  <button
                    onClick={() => {
                      onUnschedule(event.id);
                      onClose();
                    }}
                    className="px-3 py-2 text-xs font-medium text-slate-700 bg-white hover:bg-slate-100 border border-slate-300 rounded-lg transition-colors flex items-center justify-center gap-1.5"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                    Unschedule
                  </button>
                )}

                {onDelete && (
                  <button
                    onClick={() => {
                      if (confirm(`Delete "${event.title}"?`)) {
                        onDelete(event.id);
                        onClose();
                      }
                    }}
                    className="px-3 py-2 text-xs font-medium text-red-700 bg-white hover:bg-red-50 border border-red-300 rounded-lg transition-colors flex items-center justify-center gap-1.5"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                    Delete
                  </button>
                )}
              </div>
            </div>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
