'use client';

import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import { Button } from '@/components/ui';

interface BulkActionToolbarProps {
  selectedCount: number;
  onComplete: () => void;
  onDelete: () => void;
  onChangeStatus: (status: 'unscheduled' | 'scheduled' | 'completed') => void;
  onClearSelection: () => void;
}

export function BulkActionToolbar({
  selectedCount,
  onComplete,
  onDelete,
  onChangeStatus,
  onClearSelection,
}: BulkActionToolbarProps) {
  const prefersReducedMotion = useReducedMotion();

  return (
    <AnimatePresence>
      {selectedCount > 0 && (
        <motion.div
          className="fixed bottom-0 left-0 right-0 z-40 bg-white border-t border-slate-200 shadow-2xl"
          initial={{ y: prefersReducedMotion ? 0 : 100, opacity: prefersReducedMotion ? 1 : 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: prefersReducedMotion ? 0 : 100, opacity: prefersReducedMotion ? 1 : 0 }}
          transition={{ duration: prefersReducedMotion ? 0 : 0.2, ease: 'easeOut' }}
        >
          <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
              {/* Selection Info */}
              <div className="flex items-center gap-3">
                <div className="w-2 h-2 rounded-full bg-primary-600 animate-pulse"></div>
                <span className="text-sm sm:text-base font-medium text-slate-900">
                  {selectedCount} task{selectedCount === 1 ? '' : 's'} selected
                </span>
                <button
                  onClick={onClearSelection}
                  className="text-sm text-slate-500 hover:text-slate-700 underline"
                >
                  Clear
                </button>
              </div>

              {/* Actions */}
              <div className="flex flex-wrap items-center gap-2">
                {/* Move to Status */}
                <div className="flex gap-2">
                  <Button
                    onClick={() => onChangeStatus('unscheduled')}
                    variant="ghost"
                    size="sm"
                    className="text-xs sm:text-sm"
                  >
                    → Unscheduled
                  </Button>
                  <Button
                    onClick={() => onChangeStatus('scheduled')}
                    variant="ghost"
                    size="sm"
                    className="text-xs sm:text-sm"
                  >
                    → Scheduled
                  </Button>
                </div>

                {/* Complete */}
                <Button
                  onClick={onComplete}
                  variant="secondary"
                  size="sm"
                  leftIcon={
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M5 13l4 4L19 7"
                      />
                    </svg>
                  }
                  className="text-xs sm:text-sm"
                >
                  Complete
                </Button>

                {/* Delete */}
                <Button
                  onClick={onDelete}
                  variant="destructive"
                  size="sm"
                  leftIcon={
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                      />
                    </svg>
                  }
                  className="text-xs sm:text-sm"
                >
                  Delete
                </Button>
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
