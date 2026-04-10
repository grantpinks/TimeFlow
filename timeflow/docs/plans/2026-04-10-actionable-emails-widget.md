# Actionable Emails Widget — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add a collapsible "Actionable Emails" widget to the Today page that surfaces emails needing attention (needs_reply + AI-detected + unread) with inline Draft Reply with AI, Create Task, and Archive actions — no context switching required.

**Architecture:**
- A new `ActionableEmailsWidget` component fetches inbox emails on mount and filters for actionable items. It is self-contained and manages its own data — no new API endpoints needed; `api.getInboxEmails()` already exists.
- Collapsed state is persisted to `localStorage` so the user's preference survives page refreshes.
- "Draft Reply with AI" fetches the full email (`api.getFullEmail`) then opens the existing `DraftPanel`. "Create Task" calls `api.draftTaskFromEmailAi` then opens `InboxAiDraftPanel`. "Archive" calls `api.archiveEmail` and removes the item optimistically.
- The widget sits between the `WhatsNowWidget` and the Daily Planning Banner in `today/page.tsx`.

**Tech Stack:** Next.js 14 App Router, React, Framer Motion, Tailwind CSS, Lucide React, existing `api.ts` client, existing `DraftPanel` + `InboxAiDraftPanel` components

**Filtering logic (priority order):**
1. `actionState === 'needs_reply'` — user explicitly flagged
2. `needsResponse === true` — AI detected a reply is needed
3. `!isRead` — unread emails (any category)

Sort: needs_reply first → needsResponse → unread. Cap at 5 shown.

---

## Task 1: Create `ActionableEmailsWidget` component

**Files:**
- Create: `apps/web/src/components/today/ActionableEmailsWidget.tsx`

**What it does:** Self-contained widget that fetches inbox emails, filters for actionable items, and renders a collapsible list with three action buttons per email row. Manages its own loading, error, and collapsed state.

**Step 1: Read the existing `WhatsNowWidget` for style reference**

```bash
head -60 "/Users/grantpinkerton/Desktop/Time Flow/TimeFlow/timeflow/apps/web/src/components/today/WhatsNowWidget.tsx"
```

Use the same visual style — white card with `rounded-2xl border border-slate-200 shadow-sm` and consistent padding.

**Step 2: Create the component**

```tsx
'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Mail, ChevronDown, ChevronUp, Archive, Sparkles, Clock, ExternalLink } from 'lucide-react';
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
  return (
    email.actionState === 'needs_reply' ||
    !!email.needsResponse ||
    !email.isRead
  );
}

function sortActionable(a: EmailMessage, b: EmailMessage): number {
  const score = (e: EmailMessage) =>
    e.actionState === 'needs_reply' ? 2 : e.needsResponse ? 1 : 0;
  return score(b) - score(a);
}

interface Props {
  className?: string;
}

export function ActionableEmailsWidget({ className = '' }: Props) {
  const { user } = useUser();
  const [emails, setEmails] = useState<EmailMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [collapsed, setCollapsed] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    return localStorage.getItem(COLLAPSED_KEY) === 'true';
  });

  // Draft Reply with AI state
  const [draftEmail, setDraftEmail] = useState<FullEmailMessage | null>(null);
  const [draftOpen, setDraftOpen] = useState(false);
  const [draftLoading, setDraftLoading] = useState<string | null>(null); // emailId being loaded

  // Create Task from email state
  const [taskDraft, setTaskDraft] = useState<InboxAiDraft | null>(null);
  const [taskDraftOpen, setTaskDraftOpen] = useState(false);
  const [taskDraftLoading, setTaskDraftLoading] = useState<string | null>(null);

  const fetchEmails = useCallback(async () => {
    try {
      const result = await api.getInboxEmails({ maxResults: 50, cacheMode: 'prefer' });
      const actionable = result.messages
        .filter(isActionable)
        .sort(sortActionable)
        .slice(0, MAX_SHOWN);
      setEmails(actionable);
    } catch {
      // Silent — widget is non-critical
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchEmails();
    const interval = setInterval(fetchEmails, REFRESH_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [fetchEmails]);

  const toggleCollapsed = () => {
    setCollapsed((prev) => {
      const next = !prev;
      localStorage.setItem(COLLAPSED_KEY, String(next));
      return next;
    });
  };

  const handleArchive = async (email: EmailMessage) => {
    setEmails((prev) => prev.filter((e) => e.id !== email.id));
    try {
      await api.archiveEmail(email.id);
    } catch {
      setEmails((prev) => [...prev, email].sort(sortActionable));
      toast.error('Failed to archive. Please try again.');
    }
  };

  const handleDraftReply = async (email: EmailMessage) => {
    setDraftLoading(email.id);
    try {
      const full = await api.getFullEmail(email.id);
      setDraftEmail(full);
      setDraftOpen(true);
    } catch {
      toast.error('Failed to load email. Please try again.');
    } finally {
      setDraftLoading(null);
    }
  };

  const handleCreateTask = async (email: EmailMessage) => {
    setTaskDraftLoading(email.id);
    try {
      const response = await api.draftTaskFromEmailAi(email.id);
      setTaskDraft({ type: 'task', draft: response.draft, confirmCta: response.confirmCta });
      setTaskDraftOpen(true);
    } catch {
      toast.error('Failed to generate task. Please try again.');
    } finally {
      setTaskDraftLoading(null);
    }
  };

  // Don't render if no email connected or still loading with no emails yet
  if (!loading && emails.length === 0) return null;

  const actionableCount = emails.length;

  return (
    <>
      <div className={`bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden ${className}`}>
        {/* Collapsible header */}
        <button
          onClick={toggleCollapsed}
          className="w-full flex items-center justify-between px-4 py-3 hover:bg-slate-50 transition-colors"
        >
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-blue-50 flex items-center justify-center flex-shrink-0">
              <Mail size={14} className="text-blue-500" />
            </div>
            <span className="text-sm font-semibold text-slate-700">
              {loading
                ? 'Checking emails…'
                : actionableCount === 0
                ? 'No emails need attention'
                : `${actionableCount} email${actionableCount === 1 ? '' : 's'} need${actionableCount === 1 ? 's' : ''} attention`}
            </span>
            {actionableCount > 0 && (
              <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-blue-500 text-white text-[10px] font-bold">
                {actionableCount}
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <a
              href="/inbox"
              onClick={(e) => e.stopPropagation()}
              className="text-xs text-[#0BAF9A] font-medium hover:underline"
            >
              View all
            </a>
            {collapsed ? (
              <ChevronDown size={16} className="text-slate-400" />
            ) : (
              <ChevronUp size={16} className="text-slate-400" />
            )}
          </div>
        </button>

        {/* Email list */}
        <AnimatePresence initial={false}>
          {!collapsed && actionableCount > 0 && (
            <motion.div
              key="email-list"
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="overflow-hidden"
            >
              <div className="border-t border-slate-100 divide-y divide-slate-100">
                {emails.map((email) => {
                  const isNeedsReply = email.actionState === 'needs_reply';
                  const isNeedsResponse = !!email.needsResponse;
                  const sender = email.from.split('<')[0].trim() || email.from;
                  const loadingDraft = draftLoading === email.id;
                  const loadingTask = taskDraftLoading === email.id;

                  return (
                    <div key={email.id} className="flex items-center gap-3 px-4 py-3 hover:bg-slate-50 transition-colors group">
                      {/* Status dot */}
                      <div className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${
                        isNeedsReply ? 'bg-orange-400' : isNeedsResponse ? 'bg-blue-400' : 'bg-slate-300'
                      }`} />

                      {/* Email content */}
                      <a
                        href={`/inbox`}
                        className="flex-1 min-w-0"
                      >
                        <div className="flex items-baseline gap-2 mb-0.5">
                          <span className={`text-sm truncate ${email.isRead ? 'font-medium text-slate-700' : 'font-semibold text-slate-900'}`}>
                            {sender}
                          </span>
                          {isNeedsReply && (
                            <span className="flex-shrink-0 text-[10px] font-medium text-orange-500 bg-orange-50 px-1.5 py-0.5 rounded-full">
                              Needs Reply
                            </span>
                          )}
                          {!isNeedsReply && isNeedsResponse && (
                            <span className="flex-shrink-0 text-[10px] font-medium text-blue-500 bg-blue-50 px-1.5 py-0.5 rounded-full">
                              Reply needed
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-slate-500 truncate">{email.subject}</p>
                      </a>

                      {/* Action buttons — visible on hover */}
                      <div className="flex items-center gap-1 flex-shrink-0 opacity-0 group-hover:opacity-100 sm:opacity-100 transition-opacity">
                        {/* Draft Reply with AI */}
                        <button
                          onClick={() => handleDraftReply(email)}
                          disabled={loadingDraft || loadingTask}
                          title="Draft Reply with AI"
                          className="flex items-center gap-1 px-2 py-1.5 text-xs font-medium bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-lg hover:from-purple-700 hover:to-indigo-700 transition-all disabled:opacity-50"
                        >
                          <Sparkles size={11} />
                          {loadingDraft ? '…' : 'Reply'}
                        </button>

                        {/* Create Task */}
                        <button
                          onClick={() => handleCreateTask(email)}
                          disabled={loadingDraft || loadingTask}
                          title="Create Task from email"
                          className="flex items-center gap-1 px-2 py-1.5 text-xs font-medium border-2 border-[#0BAF9A] text-[#0BAF9A] bg-white rounded-lg hover:bg-[#0BAF9A]/10 transition-colors disabled:opacity-50"
                        >
                          <Clock size={11} />
                          {loadingTask ? '…' : 'Task'}
                        </button>

                        {/* Archive */}
                        <button
                          onClick={() => handleArchive(email)}
                          title="Archive"
                          className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
                        >
                          <Archive size={14} />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Draft Reply with AI panel */}
      {draftEmail && (
        <DraftPanel
          isOpen={draftOpen}
          onClose={() => { setDraftOpen(false); setDraftEmail(null); }}
          email={draftEmail}
          userEmails={user?.email ? [user.email] : []}
          onSuccess={() => {
            setDraftOpen(false);
            setDraftEmail(null);
            fetchEmails();
          }}
        />
      )}

      {/* Create Task from email panel */}
      <InboxAiDraftPanel
        isOpen={taskDraftOpen}
        draft={taskDraft}
        onClose={() => { setTaskDraftOpen(false); setTaskDraft(null); }}
        onConfirm={async (draft) => {
          // Reuse the same confirm logic from inbox: create the task
          try {
            if (draft.type === 'task') {
              await api.createTask({
                title: draft.draft.title,
                description: draft.draft.description || '',
                priority: draft.draft.priority ?? 2,
                dueDate: draft.draft.dueDate || undefined,
              });
              toast.success('Task created!');
            }
          } catch {
            toast.error('Failed to create task. Please try again.');
          } finally {
            setTaskDraftOpen(false);
            setTaskDraft(null);
          }
        }}
      />
    </>
  );
}
```

**Step 3: Verify TypeScript**

```bash
cd "/Users/grantpinkerton/Desktop/Time Flow/TimeFlow/timeflow/apps/web" && npx tsc --noEmit 2>&1 | grep "ActionableEmails" | head -10
```
Expected: no output. Fix any errors — common ones:
- `EmailInboxResponse` shape: check the actual `messages` field name in `api.getInboxEmails` return type. It may be `emails` not `messages`. Run `grep -n "EmailInboxResponse\|messages\|emails" apps/web/src/lib/api.ts | head -20` to check.
- `draftTaskFromEmailAi` return shape: check the fields in `api.ts` around line 563's usage.
- `InboxAiDraftPanel.onConfirm` signature: check the actual prop type in `InboxAiDraftPanel.tsx`.

**Step 4: Commit**

```bash
cd "/Users/grantpinkerton/Desktop/Time Flow/TimeFlow/timeflow" && git add apps/web/src/components/today/ActionableEmailsWidget.tsx && git commit -m "feat: add ActionableEmailsWidget with Draft Reply AI, Create Task, Archive (18.22)"
```

---

## Task 2: Wire `ActionableEmailsWidget` into Today page (18.22 + 18.23)

**Files:**
- Modify: `apps/web/src/app/today/page.tsx`

**What to change:**

**Step 1: Add import**

At the top of `today/page.tsx`, find the existing widget imports and add:
```tsx
import { ActionableEmailsWidget } from '@/components/today/ActionableEmailsWidget';
```

**Step 2: Place widget in JSX**

Find the header section with `WhatsNowWidget` (around line 566):
```tsx
{/* What's Now — current and upcoming */}
<WhatsNowWidget
  events={events}
  tasks={tasks}
  className="mt-4"
/>
```

Add the Actionable Emails widget directly below it:
```tsx
{/* What's Now — current and upcoming */}
<WhatsNowWidget
  events={events}
  tasks={tasks}
  className="mt-4"
/>
{/* Actionable Emails — emails needing attention */}
<ActionableEmailsWidget className="mt-3" />
```

**Step 3: Verify TypeScript**

```bash
cd "/Users/grantpinkerton/Desktop/Time Flow/TimeFlow/timeflow/apps/web" && npx tsc --noEmit 2>&1 | grep "today/page\|ActionableEmails" | head -10
```
Expected: no output.

**Step 4: Commit**

```bash
cd "/Users/grantpinkerton/Desktop/Time Flow/TimeFlow/timeflow" && git add apps/web/src/app/today/page.tsx && git commit -m "feat: integrate ActionableEmailsWidget into Today page (18.22, 18.23)"
```

---

## Task 3: Push and verify production

**Step 1: Push**

```bash
cd "/Users/grantpinkerton/Desktop/Time Flow/TimeFlow/timeflow" && git push origin main
```

**Step 2: Smoke test checklist**

After Vercel deploys:
1. Open Today page — widget appears between What's Now and Daily Planning Banner
2. Header shows "N emails need attention" with a count badge
3. Click the header — widget collapses, refresh the page — it stays collapsed
4. Click again — expands, emails show with sender, subject, and status badge (Needs Reply / Reply needed)
5. Hover an email row — three buttons appear: "Reply" (purple), "Task" (teal outline), archive icon
6. Click "Reply" — loading spinner, then DraftPanel slides in
7. Click "Task" — loading spinner, then InboxAiDraftPanel appears with AI-generated task
8. Click archive icon — email disappears from widget optimistically
9. "View all" link → navigates to /inbox
10. If 0 actionable emails → widget is hidden entirely

---

## Summary: Roadmap items completed

| ID | Task | Completed in |
|----|------|-------------|
| 18.22 | Add "Actionable Emails" widget to Today page | Tasks 1 + 2 |
| 18.23 | Make email widget adaptive (collapsible, hides at 0) | Task 1 (localStorage collapse + `if emails.length === 0 return null`) |
