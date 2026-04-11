/**
 * End-of-day identity report — all identities’ progress for today (18.19).
 */

'use client';

import { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { IdentityDayProgress } from '@timeflow/shared';
import { hexWithOpacity } from '@/lib/identityConstants';

export interface EndOfDayIdentityReportModalProps {
  open: boolean;
  onClose: () => void;
  identities: IdentityDayProgress[];
  /** e.g. "Friday, April 10" */
  dateLabel: string;
}

export function EndOfDayIdentityReportModal({
  open,
  onClose,
  identities,
  dateLabel,
}: EndOfDayIdentityReportModalProps) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  const totalDone = identities.reduce((s, i) => s + i.completedCount, 0);
  const totalMinutes = identities.reduce((s, i) => s + i.totalMinutes, 0);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="fixed inset-0 z-50 flex items-end justify-center p-4 sm:items-center"
          style={{ backgroundColor: 'rgba(15, 23, 42, 0.45)' }}
          onClick={onClose}
          role="presentation"
        >
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 16 }}
            transition={{ type: 'spring', stiffness: 380, damping: 32 }}
            className="max-h-[85vh] w-full max-w-lg overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-labelledby="eod-report-title"
          >
            <div className="border-b border-slate-100 bg-gradient-to-r from-slate-50 to-white px-5 py-4 sm:px-6">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                End of day
              </p>
              <h2 id="eod-report-title" className="text-xl font-bold text-slate-900">
                Identity progress
              </h2>
              <p className="mt-0.5 text-sm text-slate-600">{dateLabel}</p>
            </div>

            <div className="max-h-[55vh] space-y-3 overflow-y-auto px-5 py-4 sm:px-6">
              {identities.length === 0 ? (
                <p className="text-center text-sm text-slate-500 py-8">
                  No identity data for today yet. Complete a task or habit linked to an identity to
                  see progress here.
                </p>
              ) : (
                identities.map((row) => (
                  <div
                    key={row.identityId}
                    className="flex gap-3 rounded-xl border border-slate-100 p-3"
                    style={{
                      background: hexWithOpacity(row.color, 0.06),
                      borderColor: hexWithOpacity(row.color, 0.25),
                    }}
                  >
                    <span className="text-2xl" aria-hidden>
                      {row.icon}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="font-semibold text-slate-900">{row.name}</p>
                      <p className="mt-1 text-sm text-slate-600">
                        {row.completedCount} completed
                        {row.totalMinutes > 0 ? ` · ${row.totalMinutes} min` : ''}
                        {row.inProgressCount > 0
                          ? ` · ${row.inProgressCount} still on the calendar`
                          : ''}
                      </p>
                    </div>
                  </div>
                ))
              )}
            </div>

            <div className="border-t border-slate-100 bg-slate-50/80 px-5 py-4 sm:px-6">
              <div className="mb-4 flex flex-wrap justify-between gap-2 text-sm">
                <span className="text-slate-600">Totals today</span>
                <span className="font-semibold text-slate-900">
                  {totalDone} completion{totalDone === 1 ? '' : 's'}
                  {totalMinutes > 0 ? ` · ${totalMinutes} min` : ''}
                </span>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="w-full rounded-xl bg-slate-900 py-3 text-sm font-semibold text-white transition hover:bg-slate-800"
              >
                Close
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
