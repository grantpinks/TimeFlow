'use client';

import { motion, useReducedMotion } from 'framer-motion';
import type { Habit, SchedulePreview, Task } from '@timeflow/shared';

interface SchedulePreviewCardProps {
  preview: SchedulePreview;
  tasks: Task[];
  habits: Habit[];
  timeZone?: string;
  onApply: () => void;
  onCancel: () => void;
  applying?: boolean;
  applied?: boolean;
}

export default function SchedulePreviewCard({
  preview,
  tasks,
  habits,
  timeZone,
  onApply,
  onCancel,
  applying = false,
  applied = false,
}: SchedulePreviewCardProps) {
  const reduceMotion = useReducedMotion();
  const getTaskById = (taskId: string) => tasks.find((t) => t.id === taskId);
  const getHabitById = (habitId: string) => habits.find((h) => h.id === habitId);

  const dateKey = (isoString: string) =>
    new Date(isoString).toLocaleDateString('en-CA', {
      ...(timeZone ? { timeZone } : {}),
    });

  const formatTime = (isoString: string) =>
    new Date(isoString).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
      ...(timeZone ? { timeZone } : {}),
    });

  const formatDate = (isoString: string) =>
    new Date(isoString).toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      ...(timeZone ? { timeZone } : {}),
    });

  const sortedBlocks = [...preview.blocks].sort(
    (a, b) => new Date(a.start).getTime() - new Date(b.start).getTime()
  );

  const blocksByDate = sortedBlocks.reduce((acc, block) => {
    const key = dateKey(block.start);
    if (!acc[key]) {
      acc[key] = { label: formatDate(block.start), blocks: [] as typeof preview.blocks };
    }
    acc[key].blocks.push(block);
    return acc;
  }, {} as Record<string, { label: string; blocks: typeof preview.blocks }>);

  const orderedDates = Array.from(new Set(sortedBlocks.map((block) => dateKey(block.start))));

  const confidenceColor =
    preview.confidence === 'high'
      ? 'text-green-700 bg-green-50 border-green-200'
      : preview.confidence === 'medium'
        ? 'text-yellow-700 bg-yellow-50 border-yellow-200'
        : 'text-orange-700 bg-orange-50 border-orange-200';

  return (
    <motion.div
      initial={reduceMotion ? false : { opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={reduceMotion ? { duration: 0 } : { duration: 0.3, ease: 'easeOut' }}
      className="bg-white border border-primary-200 rounded-xl shadow-lg overflow-hidden"
    >
      {/* Premium Gradient Header */}
      <div className="bg-gradient-to-r from-primary-500 to-blue-500 px-4 sm:px-6 py-3 sm:py-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="text-xl sm:text-2xl">✨</span>
            <h3 className="text-base sm:text-lg font-semibold text-white">Schedule Recommendation</h3>
          </div>
          <motion.span
            className={`text-xs font-medium px-3 py-1.5 rounded-full border-2 ${confidenceColor} bg-white/95`}
            animate={!reduceMotion && preview.confidence === 'high' ? { scale: [1, 1.05, 1] } : {}}
            transition={
              !reduceMotion && preview.confidence === 'high'
                ? { duration: 1, repeat: Infinity, repeatDelay: 2 }
                : { duration: 0 }
            }
          >
            {preview.confidence} confidence
          </motion.span>
        </div>
      </div>

      {/* Content Area */}
      <div className="p-4 sm:p-6">

        {/* Summary (if provided) */}
        {preview.summary && (
          <p className="text-sm sm:text-base text-slate-700 mb-4 leading-relaxed">{preview.summary}</p>
        )}

        {/* Time blocks grouped by date */}
        <div className="space-y-3 sm:space-y-4 mb-4 max-h-[50vh] sm:max-h-none overflow-y-auto pr-1">
          {orderedDates.map((dateKeyItem) => {
            const entry = blocksByDate[dateKeyItem];
            if (!entry) return null;
            const blocks = entry.blocks;
            const dateLabel = entry.label;
            return (
            <div key={dateKeyItem} className="border border-slate-200 rounded-lg overflow-hidden">
              <div className="bg-gradient-to-r from-slate-50 to-slate-100 text-slate-700 text-xs sm:text-sm font-semibold px-3 sm:px-4 py-2 flex items-center gap-2">
                <span>📅</span>
                {dateLabel}
              </div>
              <div className="divide-y divide-slate-100">
                {blocks.map((block, index) => {
                  const isHabitBlock = Boolean(block.habitId && !block.taskId);
                  const task = block.taskId ? getTaskById(block.taskId) : undefined;
                  const habit = block.habitId ? getHabitById(block.habitId) : undefined;
                  const title = task?.title ?? habit?.title ?? block.title ?? (isHabitBlock ? 'Habit' : 'Task');

                  return (
                    <motion.div
                      key={`${block.taskId ?? block.habitId ?? 'block'}-${index}`}
                      initial={reduceMotion ? false : { opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={
                        reduceMotion
                          ? { duration: 0 }
                          : { delay: index * 0.05, duration: 0.2 }
                      }
                      className="flex items-center gap-3 px-3 sm:px-4 py-2.5 sm:py-3 hover:bg-primary-50/50 transition-colors cursor-default group"
                    >
                      <div
                        className={`w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full flex-shrink-0 ${
                          isHabitBlock ? 'bg-emerald-500' : 'bg-primary-500'
                        } group-hover:scale-110 transition-transform`}
                        aria-hidden
                      />
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm sm:text-base text-slate-800 break-words leading-snug">{title}</p>
                        <p className="text-xs sm:text-sm text-slate-600 flex items-center gap-1">
                          <span>🕐</span>
                          {formatTime(block.start)} - {formatTime(block.end)}
                        </p>
                        {isHabitBlock && (
                          <p className="text-xs text-emerald-700 mt-1 font-medium">🔄 Habit</p>
                        )}
                      </div>
                      {block.overflowedDeadline && (
                        <span className="text-xs font-medium text-red-600 bg-red-50 px-2.5 py-1 rounded-full border border-red-200 flex-shrink-0">
                          ⚠️ Past deadline
                        </span>
                      )}
                    </motion.div>
                  );
                })}
              </div>
            </div>
          );
          })}
      </div>

        {/* Conflicts/Warnings */}
        {preview.conflicts && preview.conflicts.length > 0 && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            className="mb-4 p-3 sm:p-4 bg-yellow-50 border border-yellow-200 rounded-lg"
          >
            <p className="text-sm font-semibold text-yellow-800 mb-2 flex items-center gap-2">
              <span>⚠️</span>
              Warnings:
            </p>
            <ul className="text-sm text-yellow-700 space-y-1.5">
              {preview.conflicts.map((conflict, index) => (
                <li key={index} className="flex items-start gap-2">
                  <span className="text-yellow-500 mt-0.5">•</span>
                  <span>{conflict}</span>
                </li>
              ))}
            </ul>
          </motion.div>
        )}

        {/* Premium Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
          <motion.button
            onClick={onApply}
            disabled={applying || applied}
            whileHover={!reduceMotion && !applying && !applied ? { scale: 1.02 } : {}}
            whileTap={!reduceMotion && !applying && !applied ? { scale: 0.98 } : {}}
            className={`w-full sm:flex-1 px-4 sm:px-6 py-3 rounded-lg font-semibold transition-all ${
              applied
                ? 'bg-green-500 text-white cursor-default'
                : 'bg-gradient-to-r from-primary-600 to-blue-600 text-white hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed'
            }`}
          >
            {applying ? (
              <span className="flex items-center justify-center gap-2">
                <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  />
                </svg>
                Applying...
              </span>
            ) : applied ? (
              <span className="flex items-center justify-center gap-2">
                <span>✓</span>
                Applied
              </span>
            ) : (
              <span className="flex items-center justify-center gap-2">
                <span>✓</span>
                Apply Schedule
              </span>
            )}
          </motion.button>
          <motion.button
            onClick={onCancel}
            disabled={applying}
            whileHover={!reduceMotion && !applying ? { scale: 1.02 } : {}}
            whileTap={!reduceMotion && !applying ? { scale: 0.98 } : {}}
            className="w-full sm:w-auto px-4 sm:px-6 py-3 border-2 border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 hover:border-slate-400 disabled:opacity-50 disabled:cursor-not-allowed font-medium transition-all"
          >
            Cancel
          </motion.button>
        </div>
      </div>
    </motion.div>
  );
}
