/**
 * After completing a habit, suggests open tasks tied to the same identity (18.32).
 */

'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import type { PostHabitFollowUp } from '@/lib/postHabitRelatedTasks';

export interface PostHabitRelatedTasksModalProps {
  followUp: PostHabitFollowUp | null;
  onClose: () => void;
}

export function PostHabitRelatedTasksModal({ followUp, onClose }: PostHabitRelatedTasksModalProps) {
  const open = Boolean(followUp && followUp.tasks.length > 0);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  return (
    <AnimatePresence>
      {open && followUp && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[60] flex items-end justify-center p-4 sm:items-center"
          style={{ backgroundColor: 'rgba(15, 23, 42, 0.45)' }}
          onClick={onClose}
        >
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 16 }}
            transition={{ type: 'spring', stiffness: 380, damping: 32 }}
            className="max-h-[85vh] w-full max-w-md overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-labelledby="post-habit-followup-title"
          >
            <div
              className="border-b border-slate-100 px-5 py-4 sm:px-6"
              style={
                followUp.identityColor
                  ? {
                      background: `linear-gradient(135deg, ${followUp.identityColor}14 0%, #fff 55%)`,
                    }
                  : undefined
              }
            >
              <p className="text-xs font-semibold uppercase tracking-wide text-emerald-700">
                Nice work
              </p>
              <h2 id="post-habit-followup-title" className="text-lg font-bold text-slate-900">
                You finished {followUp.habitTitle}!
              </h2>
              {followUp.identityName && (
                <p className="mt-1 text-sm text-slate-600">
                  <span className="inline-flex items-center gap-1.5">
                    {followUp.identityIcon && (
                      <span aria-hidden className="text-base">
                        {followUp.identityIcon}
                      </span>
                    )}
                    Keep momentum with your{' '}
                    <span className="font-semibold text-slate-800">{followUp.identityName}</span>{' '}
                    tasks:
                  </span>
                </p>
              )}
              {!followUp.identityName && (
                <p className="mt-1 text-sm text-slate-600">You might also tackle these next:</p>
              )}
            </div>

            <ul className="max-h-[min(40vh,320px)] space-y-2 overflow-y-auto px-5 py-4 sm:px-6">
              {followUp.tasks.map((t) => (
                <li
                  key={t.id}
                  className="flex items-start gap-3 rounded-xl border border-slate-100 bg-slate-50/80 px-3 py-2.5 text-sm"
                >
                  <span className="mt-0.5 text-slate-400" aria-hidden>
                    ◇
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-slate-900">{t.title}</p>
                    <p className="text-xs text-slate-500">
                      {t.status === 'unscheduled' ? 'Unscheduled' : 'Scheduled'} · {t.durationMinutes}{' '}
                      min
                      {t.dueDate && (
                        <>
                          {' '}
                          · Due{' '}
                          {new Date(t.dueDate).toLocaleDateString('en-US', {
                            month: 'short',
                            day: 'numeric',
                          })}
                        </>
                      )}
                    </p>
                  </div>
                </li>
              ))}
            </ul>

            <div className="flex flex-col gap-2 border-t border-slate-100 bg-slate-50/80 px-5 py-4 sm:flex-row sm:justify-end sm:px-6">
              <button
                type="button"
                onClick={onClose}
                className="order-2 w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 sm:order-1 sm:w-auto"
              >
                Not now
              </button>
              <Link
                href="/tasks"
                onClick={onClose}
                className="order-1 w-full rounded-xl bg-primary-600 px-4 py-2.5 text-center text-sm font-semibold text-white transition hover:bg-primary-700 sm:order-2 sm:w-auto"
              >
                Open Tasks
              </Link>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
