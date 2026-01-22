'use client';

import { motion } from 'framer-motion';
import type { ScheduledBlock } from '@timeflow/shared';

interface SchedulePreviewOverlayProps {
  blocks: ScheduledBlock[];
  onApply: () => void;
  onCancel: () => void;
  applying?: boolean;
  applied?: boolean;
}

export default function SchedulePreviewOverlay({
  blocks,
  onApply,
  onCancel,
  applying = false,
  applied = false,
}: SchedulePreviewOverlayProps) {
  if (blocks.length === 0) return null;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/20 backdrop-blur-sm z-50 flex items-center justify-center"
      onClick={onCancel}
    >
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4 p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="text-center">
          <h3 className="text-lg font-semibold text-slate-900 mb-4">
            Schedule Preview
          </h3>

          <div className="space-y-3 mb-6">
            {blocks.map((block, index) => (
              <div
                key={`${block.taskId || block.habitId}-${index}`}
                className="bg-blue-50 border border-blue-200 rounded-lg p-3"
              >
                <div className="text-sm text-slate-600">
                  {new Date(block.start).toLocaleDateString('en-US', {
                    weekday: 'short',
                    month: 'short',
                    day: 'numeric',
                  })}
                </div>
                <div className="text-sm font-medium text-slate-900">
                  {new Date(block.start).toLocaleTimeString('en-US', {
                    hour: '2-digit',
                    minute: '2-digit',
                    hour12: true,
                  })} - {new Date(block.end).toLocaleTimeString('en-US', {
                    hour: '2-digit',
                    minute: '2-digit',
                    hour12: true,
                  })}
                </div>
                <div className="text-xs text-slate-500 mt-1">
                  {block.taskId ? 'Task' : 'Habit'}
                </div>
              </div>
            ))}
          </div>

          <div className="flex gap-3">
            <button
              onClick={onCancel}
              disabled={applying}
              className="flex-1 px-4 py-2 text-slate-700 bg-slate-100 hover:bg-slate-200 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg font-medium transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={onApply}
              disabled={applying || applied}
              className="flex-1 px-4 py-2 text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg font-medium transition-colors"
            >
              {applied ? 'Applied ✓' : applying ? 'Applying...' : 'Apply Schedule'}
            </button>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}