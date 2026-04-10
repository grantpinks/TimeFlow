'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Mail, ChevronDown, ChevronUp, Archive, Sparkles, Clock } from 'lucide-react';
import Link from 'next/link';
import * as api from '@/lib/api';
import type { EmailMessage, FullEmailMessage } from '@timeflow/shared';
import { DraftPanel } from '@/components/inbox/DraftPanel';
import { InboxAiDraftPanel, type InboxAiDraft } from '@/components/inbox/InboxAiDraftPanel';
import { useUser } from '@/hooks/useUser';
import toast from 'react-hot-toast';

const COLLAPSED_KEY = 'timeflow_actionable_emails_collapsed';
const MAX_SHOWN = 5;
const REFRESH_INTERVAL_MS = 5 * 60 * 1000;

function isActionable(email: EmailMessage): boolean {
  return email.actionState === 'needs_reply' || email.needsResponse === true || email.isRead === false;
}

function actionPriority(email: EmailMessage): number {
  if (email.actionState === 'needs_reply') return 0;
  if (email.needsResponse === true) return 1;
  return 2; // unread
}

function getSenderName(from: string): string {
  const match = from.match(/^([^<]+)<[^>]+>$/);
  if (match) return match[1].trim();
  return from.split('@')[0] ?? from;
}

export function ActionableEmailsWidget() {
  const { user } = useUser();
  const [emails, setEmails] = useState<EmailMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [collapsed, setCollapsed] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    return localStorage.getItem(COLLAPSED_KEY) === 'true';
  });

  // Draft Reply state
  const [draftEmail, setDraftEmail] = useState<FullEmailMessage | null>(null);
  const [draftOpen, setDraftOpen] = useState(false);

  // AI Task draft state
  const [aiDraft, setAiDraft] = useState<InboxAiDraft | null>(null);
  const [aiDraftEmailId, setAiDraftEmailId] = useState<string | null>(null);
  const [aiDraftOpen, setAiDraftOpen] = useState(false);

  // Loading states per email
  const [replyLoading, setReplyLoading] = useState<Record<string, boolean>>({});
  const [taskLoading, setTaskLoading] = useState<Record<string, boolean>>({});
  const [archiveLoading, setArchiveLoading] = useState<Record<string, boolean>>({});

  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchEmails = useCallback(async () => {
    try {
      const res = await api.getInboxEmails({ maxResults: 50, cacheMode: 'prefer' });
      const actionable = res.messages
        .filter(isActionable)
        .sort((a, b) => actionPriority(a) - actionPriority(b))
        .slice(0, MAX_SHOWN);
      setEmails(actionable);
    } catch {
      // silently fail — widget is non-critical
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchEmails();
    intervalRef.current = setInterval(fetchEmails, REFRESH_INTERVAL_MS);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [fetchEmails]);

  function toggleCollapsed() {
    setCollapsed((prev) => {
      const next = !prev;
      localStorage.setItem(COLLAPSED_KEY, String(next));
      return next;
    });
  }

  async function handleReply(email: EmailMessage) {
    setReplyLoading((prev) => ({ ...prev, [email.id]: true }));
    try {
      const full = await api.getFullEmail(email.id);
      setDraftEmail(full);
      setDraftOpen(true);
    } catch {
      toast.error('Failed to load email');
    } finally {
      setReplyLoading((prev) => ({ ...prev, [email.id]: false }));
    }
  }

  async function handleTask(email: EmailMessage) {
    setTaskLoading((prev) => ({ ...prev, [email.id]: true }));
    try {
      const res = await api.draftTaskFromEmailAi(email.id);
      const draft: InboxAiDraft = {
        type: 'task',
        draft: {
          title: res.draft.title,
          description: res.draft.description,
          priority: res.draft.priority,
          dueDate: res.draft.dueDate,
          reason: res.draft.reason,
        },
        confirmCta: res.confirmCta,
      };
      setAiDraft(draft);
      setAiDraftEmailId(email.id);
      setAiDraftOpen(true);
    } catch {
      toast.error('Failed to draft task');
    } finally {
      setTaskLoading((prev) => ({ ...prev, [email.id]: false }));
    }
  }

  async function handleConfirmTaskDraft() {
    if (!aiDraft || aiDraft.type !== 'task' || !aiDraftEmailId) return;
    const { draft } = aiDraft;
    await api.createTask({
      title: draft.title,
      description: draft.description,
      priority: draft.priority as 1 | 2 | 3,
      dueDate: draft.dueDate ?? undefined,
      sourceEmailId: aiDraftEmailId,
    });
    toast.success('Task created');
    setAiDraftOpen(false);
    setAiDraft(null);
    setAiDraftEmailId(null);
  }

  async function handleArchive(email: EmailMessage) {
    setArchiveLoading((prev) => ({ ...prev, [email.id]: true }));
    // Optimistic removal
    setEmails((prev) => prev.filter((e) => e.id !== email.id));
    try {
      await api.archiveEmail(email.id);
    } catch {
      toast.error('Failed to archive');
      // Re-fetch to restore state
      fetchEmails();
    } finally {
      setArchiveLoading((prev) => ({ ...prev, [email.id]: false }));
    }
  }

  if (loading || emails.length === 0) return null;

  const userEmails = user?.email ? [user.email] : undefined;

  return (
    <>
      <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
        {/* Header */}
        <button
          type="button"
          onClick={toggleCollapsed}
          className="w-full flex items-center justify-between px-4 py-3 hover:bg-slate-50 transition-colors"
        >
          <div className="flex items-center gap-2">
            <Mail className="h-4 w-4 text-purple-500" />
            <span className="text-sm font-semibold text-slate-800">
              {emails.length} email{emails.length !== 1 ? 's' : ''} need attention
            </span>
          </div>
          <div className="flex items-center gap-2">
            <Link
              href="/inbox"
              onClick={(e) => e.stopPropagation()}
              className="text-xs text-purple-600 hover:text-purple-700 font-medium"
            >
              View all
            </Link>
            {collapsed ? (
              <ChevronDown className="h-4 w-4 text-slate-400" />
            ) : (
              <ChevronUp className="h-4 w-4 text-slate-400" />
            )}
          </div>
        </button>

        {/* Email rows */}
        <AnimatePresence initial={false}>
          {!collapsed && (
            <motion.div
              key="email-list"
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="overflow-hidden"
            >
              <div className="divide-y divide-slate-100">
                {emails.map((email) => (
                  <div
                    key={email.id}
                    className="px-4 py-3 flex items-start gap-3 hover:bg-slate-50/60 transition-colors"
                  >
                    {/* Left: sender + subject */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-medium text-slate-800 truncate">
                          {getSenderName(email.from)}
                        </span>
                        {email.actionState === 'needs_reply' ? (
                          <span className="inline-flex items-center gap-1 rounded-full bg-purple-100 px-2 py-0.5 text-[10px] font-semibold text-purple-700">
                            Needs Reply
                          </span>
                        ) : email.needsResponse ? (
                          <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-semibold text-amber-700">
                            <Clock className="h-2.5 w-2.5" />
                            Reply needed
                          </span>
                        ) : null}
                      </div>
                      <p className="text-xs text-slate-500 truncate mt-0.5">{email.subject}</p>
                    </div>

                    {/* Right: action buttons */}
                    <div className="flex items-center gap-1.5 shrink-0">
                      {/* Reply */}
                      <button
                        type="button"
                        disabled={replyLoading[email.id]}
                        onClick={() => handleReply(email)}
                        className="inline-flex items-center gap-1 rounded-md px-2.5 py-1 text-xs font-medium text-white bg-gradient-to-r from-purple-500 to-violet-600 hover:from-purple-600 hover:to-violet-700 disabled:opacity-60 transition-all shadow-sm"
                      >
                        {replyLoading[email.id] ? (
                          <span className="h-3 w-3 animate-spin rounded-full border border-white border-t-transparent" />
                        ) : null}
                        Reply
                      </button>

                      {/* Task */}
                      <button
                        type="button"
                        disabled={taskLoading[email.id]}
                        onClick={() => handleTask(email)}
                        className="inline-flex items-center gap-1 rounded-md px-2.5 py-1 text-xs font-medium text-teal-700 border border-teal-300 hover:bg-teal-50 disabled:opacity-60 transition-all"
                      >
                        {taskLoading[email.id] ? (
                          <span className="h-3 w-3 animate-spin rounded-full border border-teal-600 border-t-transparent" />
                        ) : (
                          <Sparkles className="h-3 w-3" />
                        )}
                        Task
                      </button>

                      {/* Archive */}
                      <button
                        type="button"
                        disabled={archiveLoading[email.id]}
                        onClick={() => handleArchive(email)}
                        className="inline-flex items-center rounded-md p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 disabled:opacity-60 transition-all"
                        aria-label="Archive email"
                      >
                        {archiveLoading[email.id] ? (
                          <span className="h-3.5 w-3.5 animate-spin rounded-full border border-slate-400 border-t-transparent" />
                        ) : (
                          <Archive className="h-3.5 w-3.5" />
                        )}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Draft Reply Panel */}
      {draftEmail && (
        <DraftPanel
          isOpen={draftOpen}
          onClose={() => {
            setDraftOpen(false);
            setDraftEmail(null);
          }}
          email={draftEmail}
          onSuccess={() => {
            setDraftOpen(false);
            setDraftEmail(null);
            fetchEmails();
          }}
          userEmails={userEmails}
        />
      )}

      {/* AI Task Draft Panel */}
      <InboxAiDraftPanel
        isOpen={aiDraftOpen}
        draft={aiDraft}
        onClose={() => {
          setAiDraftOpen(false);
          setAiDraft(null);
          setAiDraftEmailId(null);
        }}
        onConfirm={handleConfirmTaskDraft}
      />
    </>
  );
}
