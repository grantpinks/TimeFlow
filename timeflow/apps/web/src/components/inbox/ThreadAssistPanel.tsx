'use client';

import { useState } from 'react';
import Link from 'next/link';
import type { EmailMessage, FullEmailMessage, Identity } from '@timeflow/shared';
import { ApiRequestError, createTask, postThreadSummary, postThreadTasks } from '@/lib/api';
import { buildThreadAssistRequestBody } from '@/lib/threadAssistPayload';
import { IdentitySelector } from '@/components/identity/IdentitySelector';
import { track } from '@/lib/analytics';
import toast from 'react-hot-toast';
import { AlignLeft, ListTodo, Loader2 } from 'lucide-react';

/** Must match backend `CREDIT_COSTS` in usageTrackingService.ts */
const CREDITS_SUMMARY = 5;
const CREDITS_TASKS = 10;

/** Hide credit hints when enforcement is off (matches backend: dev default, or NEXT_PUBLIC flag). */
function flowCreditsUiDisabled(): boolean {
  if (typeof process === 'undefined') return false;
  const v = process.env.NEXT_PUBLIC_FLOW_CREDITS_DISABLED?.trim();
  if (v) {
    const s = v.toLowerCase();
    if (s === '0' || s === 'false' || s === 'no') return false;
    if (s === '1' || s === 'true' || s === 'yes') return true;
  }
  return process.env.NODE_ENV === 'development';
}

export interface ThreadAssistPanelProps {
  threadId: string;
  threadMessages: FullEmailMessage[];
  listEmail: EmailMessage;
  identities: Identity[];
  disabled?: boolean;
}

export function ThreadAssistPanel({
  threadId,
  threadMessages,
  listEmail,
  identities,
  disabled = false,
}: ThreadAssistPanelProps) {
  const [summaryLoading, setSummaryLoading] = useState(false);
  const [tasksLoading, setTasksLoading] = useState(false);
  const [createLoading, setCreateLoading] = useState(false);
  const [summaryText, setSummaryText] = useState<string | null>(null);
  const [extractedTasks, setExtractedTasks] = useState<
    { title: string; details?: string | null }[]
  >([]);
  const [identityId, setIdentityId] = useState<string | null>(null);

  const payload = buildThreadAssistRequestBody(threadId, threadMessages);
  const busy = disabled || summaryLoading || tasksLoading || createLoading;

  async function handleSummarize() {
    setSummaryLoading(true);
    try {
      track('inbox.thread_assist', { action: 'summary' });
      const res = await postThreadSummary(payload);
      setSummaryText(res.summary);
      toast.success('Summary ready');
    } catch (e) {
      if (e instanceof ApiRequestError && e.code === 'INSUFFICIENT_CREDITS') {
        toast.error(
          `${e.message} Summaries use ${CREDITS_SUMMARY} Flow Credits each.`
        );
        return;
      }
      console.error(e);
      toast.error('Could not summarize thread.');
    } finally {
      setSummaryLoading(false);
    }
  }

  async function handleExtractTasks() {
    setTasksLoading(true);
    try {
      track('inbox.thread_assist', { action: 'extract_tasks' });
      const res = await postThreadTasks(payload);
      const tasks = res.tasks || [];
      setExtractedTasks(tasks);
      if (!tasks.length) {
        toast('No actionable tasks found in this thread.');
      } else {
        toast.success(`Found ${tasks.length} task(s)`);
      }
    } catch (e) {
      if (e instanceof ApiRequestError && e.code === 'INSUFFICIENT_CREDITS') {
        toast.error(
          `${e.message} Extraction uses ${CREDITS_TASKS} Flow Credits each.`
        );
        return;
      }
      console.error(e);
      toast.error('Could not extract tasks.');
    } finally {
      setTasksLoading(false);
    }
  }

  function buildTaskDescription(task: { title: string; details?: string | null }) {
    const tid = listEmail.threadId || listEmail.id;
    const gmailUrl = `https://mail.google.com/mail/u/0/#inbox/${tid}`;
    return [
      task.details?.trim() || '',
      '',
      `From thread: ${listEmail.subject}`,
      `Source: ${gmailUrl}`,
    ].join('\n');
  }

  async function handleCreateOne(task: { title: string; details?: string | null }) {
    setCreateLoading(true);
    try {
      const tid = listEmail.threadId || listEmail.id;
      const gmailUrl = `https://mail.google.com/mail/u/0/#inbox/${tid}`;
      await createTask({
        title: task.title,
        description: buildTaskDescription(task),
        priority: 2,
        identityId: identityId ?? undefined,
        sourceEmailId: listEmail.id,
        sourceThreadId: listEmail.threadId,
        sourceEmailProvider: 'gmail',
        sourceEmailUrl: gmailUrl,
      });
      track('inbox.thread_assist', { action: 'create_task' });
      toast.success('Task created');
    } catch (e) {
      console.error(e);
      toast.error('Failed to create task');
    } finally {
      setCreateLoading(false);
    }
  }

  async function handleCreateAll() {
    if (extractedTasks.length === 0) return;
    setCreateLoading(true);
    try {
      const tid = listEmail.threadId || listEmail.id;
      const gmailUrl = `https://mail.google.com/mail/u/0/#inbox/${tid}`;
      let n = 0;
      for (const t of extractedTasks) {
        await createTask({
          title: t.title,
          description: buildTaskDescription(t),
          priority: 2,
          identityId: identityId ?? undefined,
          sourceEmailId: listEmail.id,
          sourceThreadId: listEmail.threadId,
          sourceEmailProvider: 'gmail',
          sourceEmailUrl: gmailUrl,
        });
        n++;
      }
      track('inbox.thread_assist', { action: 'create_tasks_all', task_count: n });
      toast.success(`Created ${n} task(s)`);
      setExtractedTasks([]);
    } catch (e) {
      console.error(e);
      toast.error('Failed to create tasks');
    } finally {
      setCreateLoading(false);
    }
  }

  return (
    <div className="mb-6 rounded-xl border border-teal-200/80 bg-gradient-to-br from-teal-50/90 to-white p-4 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-2 mb-3">
        <div>
          <h4
            className="text-sm font-semibold text-slate-900 tracking-wide uppercase"
            style={{ fontFamily: "'JetBrains Mono', monospace" }}
          >
            AI thread assist
          </h4>
          <p className="text-xs text-slate-500 mt-0.5" style={{ fontFamily: "'Manrope', sans-serif" }}>
            Summarize or pull actionable tasks from this thread.
            {!flowCreditsUiDisabled() && (
              <>
                {' '}
                Uses Flow Credits (see{' '}
                <Link href="/settings" className="text-[#0BAF9A] hover:underline">
                  Settings
                </Link>
                ).
              </>
            )}
          </p>
        </div>
      </div>

      <div className="flex flex-wrap gap-2 mb-3">
        <button
          type="button"
          onClick={handleSummarize}
          disabled={busy}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-lg border-2 border-[#0BAF9A] text-[#0BAF9A] hover:bg-[#0BAF9A]/10 disabled:opacity-50 transition-colors"
          style={{ fontFamily: "'Manrope', sans-serif" }}
        >
          {summaryLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <AlignLeft className="h-4 w-4" />}
          Summarize
          {!flowCreditsUiDisabled() && ` (${CREDITS_SUMMARY} cr)`}
        </button>
        <button
          type="button"
          onClick={handleExtractTasks}
          disabled={busy}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-lg bg-[#0BAF9A] text-white hover:bg-[#078c77] disabled:opacity-50 transition-colors"
          style={{ fontFamily: "'Manrope', sans-serif" }}
        >
          {tasksLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <ListTodo className="h-4 w-4" />}
          Extract tasks
          {!flowCreditsUiDisabled() && ` (${CREDITS_TASKS} cr)`}
        </button>
      </div>

      {identities.length > 0 && (
        <div className="mb-3 max-w-md">
          <IdentitySelector
            identities={identities}
            value={identityId}
            onChange={setIdentityId}
            label="Link new tasks to identity"
            showLinkPrompt={false}
            placeholder="No identity (optional)"
            disabled={busy}
          />
        </div>
      )}

      {summaryText && (
        <div className="mb-4 rounded-lg border border-slate-200 bg-white/80 p-3 text-sm text-slate-700 whitespace-pre-wrap">
          {summaryText}
        </div>
      )}

      {extractedTasks.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <span className="text-xs font-medium text-slate-600 uppercase tracking-wide">
              Suggested tasks
            </span>
            <button
              type="button"
              onClick={handleCreateAll}
              disabled={createLoading}
              className="text-xs font-semibold text-[#0BAF9A] hover:underline disabled:opacity-50"
            >
              Create all
            </button>
          </div>
          <ul className="space-y-2">
            {extractedTasks.map((task, i) => (
              <li
                key={`${task.title}-${i}`}
                className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2 rounded-lg border border-slate-200 bg-white p-3"
              >
                <div className="min-w-0 flex-1">
                  <div className="font-medium text-slate-900 text-sm">{task.title}</div>
                  {task.details && (
                    <div className="text-xs text-slate-500 mt-1">{task.details}</div>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => handleCreateOne(task)}
                  disabled={createLoading}
                  className="flex-shrink-0 px-2.5 py-1 text-xs font-semibold rounded-md border border-[#0BAF9A] text-[#0BAF9A] hover:bg-[#0BAF9A]/10 disabled:opacity-50"
                >
                  Create
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
