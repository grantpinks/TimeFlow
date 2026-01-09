/**
 * Scheduling Progress Modal
 *
 * Shows real-time progress during bulk habit scheduling commit.
 */

'use client';

import { FlowMascot } from '../FlowMascot';

interface BlockProgress {
  habitId: string;
  status: 'pending' | 'creating' | 'created' | 'failed';
  eventId?: string;
  error?: string;
}

interface SchedulingProgressModalProps {
  isOpen: boolean;
  progress: BlockProgress[];
  totalBlocks: number;
  onCancel?: () => void;
  onComplete: () => void;
  onViewCalendar?: () => void;
}

export function SchedulingProgressModal({
  isOpen,
  progress,
  totalBlocks,
  onCancel,
  onComplete,
  onViewCalendar,
}: SchedulingProgressModalProps) {
  if (!isOpen) return null;

  const completedCount = progress.filter((p) => p.status === 'created').length;
  const failedCount = progress.filter((p) => p.status === 'failed').length;
  const isComplete = completedCount + failedCount === totalBlocks;
  const allSucceeded = completedCount === totalBlocks && failedCount === 0;
  const hasFailures = failedCount > 0;

  const progressPercentage = totalBlocks > 0 ? (completedCount / totalBlocks) * 100 : 0;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl shadow-2xl max-w-md w-full mx-4 overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-primary-50 to-blue-50 p-6 text-center">
          <FlowMascot
            size="lg"
            expression={isComplete ? (allSucceeded ? 'happy' : 'thinking') : 'thinking'}
            className="mb-3 mx-auto"
          />

          {!isComplete && (
            <>
              <h3 className="text-lg font-semibold text-slate-900 mb-2">
                Creating your schedule...
              </h3>
              <p className="text-sm text-slate-600">
                {completedCount} of {totalBlocks} events created
              </p>
            </>
          )}

          {isComplete && allSucceeded && (
            <>
              <div className="text-4xl mb-2">✓</div>
              <h3 className="text-lg font-semibold text-slate-900 mb-2">
                {totalBlocks} habit{totalBlocks !== 1 ? 's' : ''} scheduled!
              </h3>
              <p className="text-sm text-slate-600">
                Your habits are now in your calendar
              </p>
            </>
          )}

          {isComplete && hasFailures && (
            <>
              <div className="text-4xl mb-2">⚠️</div>
              <h3 className="text-lg font-semibold text-slate-900 mb-2">
                {completedCount > 0 ? 'Partially scheduled' : 'Scheduling failed'}
              </h3>
              <p className="text-sm text-slate-600">
                {completedCount > 0
                  ? `Created ${completedCount} of ${totalBlocks} events`
                  : `Failed to create events`}
              </p>
            </>
          )}
        </div>

        {/* Progress Bar */}
        {!isComplete && (
          <div className="px-6 py-4">
            <div className="w-full h-3 bg-slate-200 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-primary-500 to-blue-500 rounded-full transition-all duration-300"
                style={{ width: `${progressPercentage}%` }}
              />
            </div>
          </div>
        )}

        {/* Error Details */}
        {hasFailures && (
          <div className="px-6 py-4 max-h-32 overflow-y-auto">
            <div className="text-sm space-y-2">
              {progress
                .filter((p) => p.status === 'failed')
                .map((p, index) => (
                  <div key={index} className="text-red-600 flex items-start gap-2">
                    <svg className="w-4 h-4 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                      <path
                        fillRule="evenodd"
                        d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                        clipRule="evenodd"
                      />
                    </svg>
                    <span>{p.error || 'Failed to create event'}</span>
                  </div>
                ))}
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="px-6 py-4 border-t border-slate-200 flex items-center justify-between gap-3">
          {!isComplete && onCancel && (
            <button
              onClick={onCancel}
              className="px-4 py-2 text-slate-700 hover:bg-slate-100 rounded-lg font-medium transition-colors"
            >
              Cancel
            </button>
          )}

          {isComplete && (
            <>
              <button
                onClick={onComplete}
                className="px-4 py-2 text-slate-700 hover:bg-slate-100 rounded-lg font-medium transition-colors"
              >
                Close
              </button>
              {allSucceeded && onViewCalendar && (
                <button
                  onClick={onViewCalendar}
                  className="px-4 py-2 bg-primary-600 text-white rounded-lg font-medium hover:bg-primary-700 transition-colors flex items-center gap-2"
                >
                  <span>View in Calendar</span>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M14 5l7 7m0 0l-7 7m7-7H3"
                    />
                  </svg>
                </button>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
