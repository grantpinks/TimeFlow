'use client';

import { useState } from 'react';

type TaskDraft = {
  title: string;
  description: string;
  priority: number;
  dueDate: string | null;
  reason?: string;
};

type LabelDraft = {
  categoryId: string;
  reason: string;
};

type ExplanationDraft = {
  explanation: string;
};

export type InboxAiDraft =
  | { type: 'task'; draft: TaskDraft; confirmCta: string; schedule?: boolean }
  | { type: 'label'; draft: LabelDraft; confirmCta: string }
  | { type: 'explanation'; draft: ExplanationDraft; confirmCta: string };

interface InboxAiDraftPanelProps {
  isOpen: boolean;
  draft: InboxAiDraft | null;
  onClose: () => void;
  onConfirm: () => Promise<void> | void;
}

export function InboxAiDraftPanel({ isOpen, draft, onClose, onConfirm }: InboxAiDraftPanelProps) {
  const [confirmed, setConfirmed] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  if (!isOpen || !draft) return null;

  async function handleConfirm() {
    if (!confirmed) return;
    setSubmitting(true);
    try {
      await onConfirm();
    } finally {
      setSubmitting(false);
      setConfirmed(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="w-full max-w-lg rounded-xl bg-white p-6 shadow-xl">
        <div className="flex items-start justify-between">
          <div>
            <h3 className="text-xl font-semibold text-slate-800">AI Draft</h3>
            <p className="text-sm text-slate-500">Review and confirm before applying.</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-sm text-slate-500 hover:text-slate-700"
          >
            Close
          </button>
        </div>

        <div className="mt-4 space-y-3 text-sm text-slate-700">
          {draft.type === 'task' && (
            <>
              <div>
                <div className="text-xs uppercase text-slate-400">Title</div>
                <div className="font-medium">{draft.draft.title}</div>
              </div>
              <div>
                <div className="text-xs uppercase text-slate-400">Description</div>
                <div>{draft.draft.description}</div>
              </div>
              <div className="flex gap-6">
                <div>
                  <div className="text-xs uppercase text-slate-400">Priority</div>
                  <div>{draft.draft.priority}</div>
                </div>
                <div>
                  <div className="text-xs uppercase text-slate-400">Due Date</div>
                  <div>{draft.draft.dueDate || 'None'}</div>
                </div>
              </div>
              {draft.draft.reason && (
                <div className="text-slate-500">{draft.draft.reason}</div>
              )}
            </>
          )}

          {draft.type === 'label' && (
            <>
              <div>
                <div className="text-xs uppercase text-slate-400">Suggested Label</div>
                <div className="font-medium">{draft.draft.categoryId}</div>
              </div>
              <div className="text-slate-500">{draft.draft.reason}</div>
            </>
          )}

          {draft.type === 'explanation' && (
            <div className="text-slate-600">{draft.draft.explanation}</div>
          )}
        </div>

        <div className="mt-6 space-y-3">
          <label className="flex items-center gap-2 text-sm text-slate-600">
            <input
              type="checkbox"
              checked={confirmed}
              onChange={(event) => setConfirmed(event.target.checked)}
            />
            I confirm this is ready.
          </label>
          <button
            type="button"
            onClick={handleConfirm}
            disabled={!confirmed || submitting}
            className="w-full rounded-lg bg-emerald-500 px-4 py-2 text-white disabled:opacity-60"
          >
            {submitting ? 'Applying...' : draft.confirmCta}
          </button>
        </div>
      </div>
    </div>
  );
}
