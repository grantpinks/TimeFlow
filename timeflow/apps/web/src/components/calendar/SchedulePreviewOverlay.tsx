'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, X, CalendarCheck, AlertTriangle, Info } from 'lucide-react';
import { LoadingSpinner } from '@/components/ui';
import type { ScheduledBlock, Habit, Task } from '@timeflow/shared';

interface SchedulePreviewOverlayProps {
  blocks: ScheduledBlock[];
  onApply: () => void;
  onCancel: () => void;
  applying?: boolean;
  applied?: boolean;
  /** Optional: task list for resolving task titles */
  tasks?: Task[];
  /** Optional: habit list for resolving habit titles */
  habits?: Habit[];
  /** Optional: conflicts / warnings from the AI */
  conflicts?: string[];
  /** Optional: AI-generated summary */
  summary?: string;
  /** Optional: confidence level from AI */
  confidence?: 'high' | 'medium' | 'low';
}

export function SchedulePreviewOverlay({
  blocks,
  onApply,
  onCancel,
  applying = false,
  applied = false,
  tasks = [],
  habits = [],
  conflicts = [],
  summary,
  confidence,
}: SchedulePreviewOverlayProps) {
  const hasBlocks = blocks.length > 0;

  const getTaskTitle = (taskId?: string) =>
    taskId ? (tasks.find((t) => t.id === taskId)?.title ?? 'Task') : undefined;

  const getHabitTitle = (habitId?: string) =>
    habitId ? (habits.find((h) => h.id === habitId)?.title ?? 'Habit') : undefined;

  const formatTime = (iso: string) =>
    new Date(iso).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    });

  const formatDate = (iso: string) =>
    new Date(iso).toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
    });

  const confidenceColor =
    confidence === 'high'
      ? 'text-green-700 bg-green-50 border-green-200'
      : confidence === 'medium'
        ? 'text-yellow-700 bg-yellow-50 border-yellow-200'
        : confidence === 'low'
          ? 'text-orange-700 bg-orange-50 border-orange-200'
          : '';

  return (
    <AnimatePresence>
      <motion.div
          key="overlay-backdrop"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="fixed inset-0 bg-black/30 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          onClick={onCancel}
          aria-modal="true"
          role="dialog"
          aria-label="Schedule preview"
        >
          <motion.div
            key="overlay-panel"
            initial={{ scale: 0.92, opacity: 0, y: 16 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.92, opacity: 0, y: 16 }}
            transition={{ duration: 0.22, ease: 'easeOut' }}
            className="bg-white rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="bg-gradient-to-r from-primary-500 to-blue-500 px-5 py-4 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <Sparkles className="w-5 h-5 text-white/90" strokeWidth={2} aria-hidden />
                <h3 className="text-base font-semibold text-white">Schedule Preview</h3>
              </div>
              <div className="flex items-center gap-3">
                {confidence && (
                  <span className={`text-xs font-medium px-2.5 py-1 rounded-full border ${confidenceColor} bg-white/95`}>
                    {confidence} confidence
                  </span>
                )}
                <button
                  onClick={onCancel}
                  className="text-white/70 hover:text-white transition-colors p-1 rounded-lg hover:bg-white/10"
                  aria-label="Close preview"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Body */}
            <div className="p-5 max-h-[65vh] overflow-y-auto">
              {/* Summary */}
              {summary && (
                <p className="text-sm text-slate-600 mb-4 leading-relaxed">{summary}</p>
              )}

              {/* Empty state */}
              {!hasBlocks && (
                <div className="flex items-start gap-3 p-4 bg-slate-50 border border-slate-200 rounded-xl mb-4">
                  <Info className="w-5 h-5 text-slate-400 shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-slate-700">No tasks scheduled</p>
                    <p className="text-sm text-slate-500 mt-1">
                      All tasks may already be scheduled or conflict with fixed events. Return to Flow and ask to schedule specific tasks.
                    </p>
                  </div>
                </div>
              )}

              {/* Block list */}
              {hasBlocks && (
                <div className="space-y-2 mb-4">
                  {blocks.map((block, index) => {
                    const isHabit = Boolean(block.habitId && !block.taskId);
                    const title =
                      getTaskTitle(block.taskId) ??
                      getHabitTitle(block.habitId) ??
                      (block as any).title ??
                      (isHabit ? 'Habit' : 'Task');

                    return (
                      <div
                        key={`${block.taskId ?? block.habitId ?? 'block'}-${index}`}
                        className="flex items-center gap-3 p-3 bg-slate-50 border border-slate-200 rounded-xl hover:bg-primary-50/40 hover:border-primary-200 transition-colors"
                      >
                        <div
                          className={`w-2.5 h-2.5 rounded-full shrink-0 ${isHabit ? 'bg-emerald-500' : 'bg-primary-500'}`}
                          aria-hidden
                        />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-slate-800 truncate">{title}</p>
                          <p className="text-xs text-slate-500 mt-0.5">
                            {formatDate(block.start)} · {formatTime(block.start)} – {formatTime(block.end)}
                          </p>
                          {isHabit && (
                            <span className="text-xs text-emerald-600 font-medium">Habit</span>
                          )}
                        </div>
                        {(block as any).overflowedDeadline && (
                          <span className="text-xs font-medium text-red-600 bg-red-50 px-2 py-0.5 rounded-full border border-red-200 shrink-0">
                            Past deadline
                          </span>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Conflicts / warnings */}
              {conflicts.length > 0 && (
                <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-xl mb-4">
                  <div className="flex items-center gap-2 mb-2">
                    <AlertTriangle className="w-4 h-4 text-yellow-600 shrink-0" />
                    <p className="text-sm font-semibold text-yellow-800">Warnings</p>
                  </div>
                  <ul className="space-y-1">
                    {conflicts.map((c, i) => (
                      <li key={i} className="text-sm text-yellow-700 flex items-start gap-1.5">
                        <span className="text-yellow-500 mt-0.5 shrink-0">•</span>
                        {c}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>

            {/* Footer actions */}
            <div className="px-5 pb-5 flex gap-3 border-t border-slate-100 pt-4">
              <button
                onClick={onCancel}
                disabled={applying}
                className="flex-1 px-4 py-2.5 text-slate-700 bg-slate-100 hover:bg-slate-200 disabled:opacity-50 disabled:cursor-not-allowed rounded-xl font-medium transition-colors text-sm"
              >
                Cancel
              </button>
              <button
                onClick={onApply}
                disabled={applying || applied || !hasBlocks}
                title={!hasBlocks ? 'No tasks to apply' : undefined}
                className="flex-1 px-4 py-2.5 text-white bg-gradient-to-r from-primary-600 to-blue-600 hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed rounded-xl font-semibold transition-all text-sm flex items-center justify-center gap-2"
              >
                {applying ? (
                  <>
                    <LoadingSpinner size="sm" variant="inverse" label="Applying schedule" />
                    Applying…
                  </>
                ) : applied ? (
                  <>
                    <CalendarCheck className="w-4 h-4" />
                    Applied!
                  </>
                ) : (
                  <>
                    <CalendarCheck className="w-4 h-4" />
                    Apply Schedule
                  </>
                )}
              </button>
            </div>
          </motion.div>
        </motion.div>
    </AnimatePresence>
  );
}
