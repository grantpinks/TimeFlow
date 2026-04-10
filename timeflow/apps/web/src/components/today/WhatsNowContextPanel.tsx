/**
 * Smart context for the current "What's Now" moment — notes, attendees, habit why, identity progress.
 */

'use client';

import { useMemo, useState, useEffect } from 'react';
import type {
  CalendarEvent,
  Habit,
  Task,
  IdentityProgressResponse,
} from '@timeflow/shared';
import { computeWhatsNowPhase } from '@/lib/whatsNow';
import { Users, FileText, Target, Sparkles } from 'lucide-react';

export interface WhatsNowContextPanelProps {
  events: CalendarEvent[];
  tasks: Task[];
  habits: Habit[];
  identityProgress: IdentityProgressResponse | null;
  className?: string;
}

export function WhatsNowContextPanel({
  events,
  tasks,
  habits,
  identityProgress,
  className = '',
}: WhatsNowContextPanelProps) {
  const [currentTime, setCurrentTime] = useState(() => new Date());

  useEffect(() => {
    const id = setInterval(() => setCurrentTime(new Date()), 30000);
    return () => clearInterval(id);
  }, []);

  const phase = useMemo(
    () => computeWhatsNowPhase(events, tasks, currentTime),
    [events, tasks, currentTime]
  );

  const habitById = useMemo(() => {
    const m = new Map<string, Habit>();
    habits.forEach((h) => m.set(h.id, h));
    return m;
  }, [habits]);

  const content = useMemo(() => {
    if (phase.kind === 'current') {
      const ev = phase.event;

      if (ev.sourceType === 'habit' && ev.habitId) {
        const h = habitById.get(ev.habitId);
        const row = h?.identityId
          ? identityProgress?.identities.find((i) => i.identityId === h.identityId)
          : undefined;
        return (
          <div className="space-y-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              Habit context
            </p>
            {h?.whyStatement ? (
              <div>
                <div className="flex items-center gap-1.5 text-xs font-medium text-slate-600 mb-1">
                  <Target className="w-3.5 h-3.5" aria-hidden />
                  Why this matters
                </div>
                <p className="text-sm text-slate-800 leading-relaxed">{h.whyStatement}</p>
              </div>
            ) : (
              <p className="text-sm text-slate-600">Stay present for this habit block.</p>
            )}
            {h?.longTermGoal && (
              <p className="text-xs text-slate-600">
                <span className="font-medium text-slate-700">Goal: </span>
                {h.longTermGoal}
              </p>
            )}
            {row && (
              <div className="rounded-lg bg-white/80 border border-slate-200/80 px-3 py-2 text-sm">
                <div className="flex items-center gap-2">
                  <span className="text-base" aria-hidden>
                    {row.icon}
                  </span>
                  <span className="font-medium text-slate-800">{row.name}</span>
                </div>
                <p className="text-xs text-slate-600 mt-1">
                  Today: {row.completedCount} completed
                  {row.inProgressCount > 0
                    ? ` · ${row.inProgressCount} in progress`
                    : ''}
                </p>
              </div>
            )}
          </div>
        );
      }

      if (ev.sourceType === 'task' && ev.sourceId) {
        const t = tasks.find((x) => x.id === ev.sourceId);
        return (
          <div className="space-y-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              Task context
            </p>
            {t?.description ? (
              <div>
                <div className="flex items-center gap-1.5 text-xs font-medium text-slate-600 mb-1">
                  <FileText className="w-3.5 h-3.5" aria-hidden />
                  Notes
                </div>
                <p className="text-sm text-slate-800 whitespace-pre-wrap">{t.description}</p>
              </div>
            ) : (
              <p className="text-sm text-slate-600">No extra notes on this task.</p>
            )}
            {t?.identity?.name && (
              <p className="text-xs text-slate-600">
                <Sparkles className="w-3.5 h-3.5 inline mr-1 text-primary-600" aria-hidden />
                {t.identity.name}
              </p>
            )}
          </div>
        );
      }

      const attendees = ev.attendees?.length
        ? ev.attendees.map((a) => a.email).filter(Boolean)
        : [];
      return (
        <div className="space-y-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            Meeting & notes
          </p>
          {attendees.length > 0 && (
            <div>
              <div className="flex items-center gap-1.5 text-xs font-medium text-slate-600 mb-1">
                <Users className="w-3.5 h-3.5" aria-hidden />
                Attendees
              </div>
              <ul className="text-sm text-slate-800 space-y-0.5">
                {attendees.map((email) => (
                  <li key={email} className="truncate">
                    {email}
                  </li>
                ))}
              </ul>
            </div>
          )}
          {ev.description ? (
            <div>
              <div className="flex items-center gap-1.5 text-xs font-medium text-slate-600 mb-1">
                <FileText className="w-3.5 h-3.5" aria-hidden />
                Description
              </div>
              <p className="text-sm text-slate-800 whitespace-pre-wrap line-clamp-6">
                {ev.description}
              </p>
            </div>
          ) : (
            !attendees.length && (
              <p className="text-sm text-slate-600">No attendees or notes on this event.</p>
            )
          )}
        </div>
      );
    }

    if (phase.kind === 'upcoming') {
      const ev = phase.event;
      const attendees = ev.attendees?.length
        ? ev.attendees.map((a) => a.email).filter(Boolean)
        : [];
      return (
        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            Up next
          </p>
          {ev.description && (
            <p className="text-sm text-slate-700 line-clamp-4 whitespace-pre-wrap">
              {ev.description}
            </p>
          )}
          {attendees.length > 0 && (
            <p className="text-xs text-slate-600">
              {attendees.length} attendee{attendees.length === 1 ? '' : 's'}
            </p>
          )}
          {!ev.description && !attendees.length && (
            <p className="text-sm text-slate-600">Starts in {phase.minutesUntil} min.</p>
          )}
        </div>
      );
    }

    if (phase.kind === 'suggested-task') {
      const t = phase.task;
      const row = t.identityId
        ? identityProgress?.identities.find((i) => i.identityId === t.identityId)
        : undefined;
      return (
        <div className="space-y-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            Suggested task
          </p>
          {t.description ? (
            <p className="text-sm text-slate-800 whitespace-pre-wrap">{t.description}</p>
          ) : (
            <p className="text-sm text-slate-600">Schedule this task when you&apos;re ready.</p>
          )}
          {row && (
            <div className="rounded-lg bg-white/80 border border-slate-200/80 px-3 py-2 text-xs text-slate-700">
              <span className="mr-1">{row.icon}</span>
              {row.name}: {row.completedCount} done today
            </div>
          )}
        </div>
      );
    }

    return (
      <p className="text-sm text-slate-600">
        Open space — review your timeline or capture something in the assistant.
      </p>
    );
  }, [phase, habitById, tasks, identityProgress]);

  const title = useMemo(() => {
    if (phase.kind === 'current') {
      if (phase.event.sourceType === 'habit') return 'Habit focus';
      if (phase.event.sourceType === 'task') return 'Task focus';
      return 'Meeting focus';
    }
    if (phase.kind === 'upcoming') return 'Before you start';
    if (phase.kind === 'suggested-task') return 'Queue context';
    return 'Right now';
  }, [phase]);

  return (
    <div
      className={`rounded-xl border border-slate-200 bg-gradient-to-b from-slate-50 to-white p-4 shadow-sm ${className}`}
    >
      <h3 className="text-sm font-semibold text-slate-900 mb-3">{title}</h3>
      {content}
    </div>
  );
}
