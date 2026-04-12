'use client';

/**
 * Review AI-extracted meeting follow-ups and create tasks with identity tags (18.33).
 */

import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { Identity } from '@timeflow/shared';
import * as api from '@/lib/api';

export type MeetingActionItemRow = {
  title: string;
  identityId: string | null;
  selected: boolean;
};

export interface MeetingActionItemsModalProps {
  open: boolean;
  onClose: () => void;
  meetingTitle: string;
  /** Initial rows from AI */
  initialRows: { title: string; identityId: string | null }[];
  onCreated?: () => void | Promise<void>;
}

export function MeetingActionItemsModal({
  open,
  onClose,
  meetingTitle,
  initialRows,
  onCreated,
}: MeetingActionItemsModalProps) {
  const [identities, setIdentities] = useState<Identity[]>([]);
  const [rows, setRows] = useState<MeetingActionItemRow[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    api
      .getIdentities()
      .then(setIdentities)
      .catch(() => setIdentities([]));
  }, [open]);

  useEffect(() => {
    if (!open) return;
    setRows(
      initialRows.map((r) => ({
        title: r.title,
        identityId: r.identityId,
        selected: true,
      }))
    );
    setError(null);
  }, [open, initialRows]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  const handleCreate = async () => {
    const toCreate = rows.filter((r) => r.selected && r.title.trim());
    if (toCreate.length === 0) {
      onClose();
      return;
    }
    setSaving(true);
    setError(null);
    try {
      for (const r of toCreate) {
        await api.createTask({
          title: r.title.trim(),
          identityId: r.identityId ?? undefined,
          priority: 2,
          durationMinutes: 30,
        });
      }
      await onCreated?.();
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to create tasks');
    } finally {
      setSaving(false);
    }
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[70] flex items-end justify-center p-4 sm:items-center"
          style={{ backgroundColor: 'rgba(15, 23, 42, 0.45)' }}
          onClick={onClose}
        >
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 12 }}
            transition={{ type: 'spring', stiffness: 380, damping: 32 }}
            className="max-h-[90vh] w-full max-w-lg overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-labelledby="meeting-actions-title"
          >
            <div className="border-b border-slate-100 bg-gradient-to-r from-primary-50/80 to-white px-5 py-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-primary-800">
                Follow-ups from meeting
              </p>
              <h2 id="meeting-actions-title" className="text-lg font-bold text-slate-900">
                {meetingTitle}
              </h2>
              <p className="mt-1 text-sm text-slate-600">
                Select tasks to add to your list. Identity tags help them count toward the right
                goal.
              </p>
            </div>

            <div className="max-h-[50vh] space-y-2 overflow-y-auto px-5 py-4">
              {rows.length === 0 ? (
                <p className="text-sm text-slate-600">
                  No action items were suggested. Try again after adding more detail to the event
                  description.
                </p>
              ) : (
                rows.map((row, i) => (
                  <div
                    key={`${row.title}-${i}`}
                    className="flex flex-col gap-2 rounded-xl border border-slate-100 bg-slate-50/80 p-3 sm:flex-row sm:items-center"
                  >
                    <label className="flex flex-1 cursor-pointer items-start gap-2">
                      <input
                        type="checkbox"
                        checked={row.selected}
                        onChange={(e) =>
                          setRows((prev) =>
                            prev.map((r, j) =>
                              j === i ? { ...r, selected: e.target.checked } : r
                            )
                          )
                        }
                        className="mt-1"
                      />
                      <span className="text-sm font-medium text-slate-900">{row.title}</span>
                    </label>
                    <select
                      value={row.identityId ?? ''}
                      onChange={(e) =>
                        setRows((prev) =>
                          prev.map((r, j) =>
                            j === i
                              ? {
                                  ...r,
                                  identityId: e.target.value === '' ? null : e.target.value,
                                }
                              : r
                          )
                        )
                      }
                      className="w-full rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-xs text-slate-800 sm:w-44"
                      disabled={!row.selected}
                    >
                      <option value="">No identity</option>
                      {identities.map((id) => (
                        <option key={id.id} value={id.id}>
                          {id.icon} {id.name}
                        </option>
                      ))}
                    </select>
                  </div>
                ))
              )}
            </div>

            {error && <p className="px-5 pb-2 text-sm text-red-600">{error}</p>}

            <div className="flex flex-col gap-2 border-t border-slate-100 bg-slate-50/80 px-5 py-4 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={onClose}
                className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleCreate}
                disabled={saving || rows.filter((r) => r.selected).length === 0}
                className="rounded-xl bg-primary-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-primary-700 disabled:opacity-50"
              >
                {saving ? 'Creating…' : 'Create selected tasks'}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
