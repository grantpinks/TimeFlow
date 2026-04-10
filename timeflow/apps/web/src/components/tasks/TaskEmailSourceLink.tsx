'use client';

import Link from 'next/link';
import { Mail } from 'lucide-react';
import type { Task } from '@timeflow/shared';

export type TaskEmailSourceFields = Pick<
  Task,
  'sourceEmailUrl' | 'sourceThreadId' | 'sourceEmailId'
>;

type Props = {
  /** Full task (usual case) */
  task?: Task;
  /** Minimal fields when you do not have a full Task (e.g. timeline row) */
  emailSource?: TaskEmailSourceFields;
  className?: string;
  /** Use on draggable cards so clicking the link does not start a drag */
  stopPropagation?: boolean;
};

function resolveSource(task?: Task, emailSource?: TaskEmailSourceFields): TaskEmailSourceFields | null {
  if (task) {
    return {
      sourceEmailUrl: task.sourceEmailUrl,
      sourceThreadId: task.sourceThreadId,
      sourceEmailId: task.sourceEmailId,
    };
  }
  if (emailSource) return emailSource;
  return null;
}

/**
 * Quick access to the Gmail thread or Inbox deep-link for tasks created from email.
 */
export function TaskEmailSourceLink({ task, emailSource, className = '', stopPropagation }: Props) {
  const src = resolveSource(task, emailSource);
  if (!src) return null;

  const gmailUrl = src.sourceEmailUrl?.trim();
  const threadKey = src.sourceThreadId || src.sourceEmailId;
  if (!gmailUrl && !threadKey) return null;

  const base =
    'inline-flex items-center gap-1.5 text-xs font-medium text-blue-600 hover:text-blue-800 hover:underline';

  const onPointerDown = stopPropagation ? (e: React.PointerEvent) => e.stopPropagation() : undefined;
  const onClick = stopPropagation ? (e: React.MouseEvent) => e.stopPropagation() : undefined;

  if (gmailUrl) {
    return (
      <a
        href={gmailUrl}
        target="_blank"
        rel="noopener noreferrer"
        className={`${base} ${className}`}
        onPointerDown={onPointerDown}
        onClick={onClick}
      >
        <Mail className="w-3.5 h-3.5 flex-shrink-0" aria-hidden />
        Open in Gmail
      </a>
    );
  }

  return (
    <Link
      href={`/inbox?thread=${encodeURIComponent(threadKey!)}`}
      className={`${base} ${className}`}
      onPointerDown={onPointerDown}
      onClick={onClick}
    >
      <Mail className="w-3.5 h-3.5 flex-shrink-0" aria-hidden />
      Open email
    </Link>
  );
}
