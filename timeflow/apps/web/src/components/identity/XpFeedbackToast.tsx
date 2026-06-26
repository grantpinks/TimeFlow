'use client';

import type { IdentityXpFeedbackEvent } from '@timeflow/shared';

export type XpFeedbackToastVariant = 'xp' | 'level' | 'stage' | 'batch';

export interface XpFeedbackToastViewModel {
  id: string;
  variant: XpFeedbackToastVariant;
  message: string;
  source: 'task' | 'habit';
  identityId: string;
  durationMs: number;
}

export function getXpFeedbackVariant(event: IdentityXpFeedbackEvent): XpFeedbackToastVariant {
  if (event.stageAfter !== event.stageBefore) return 'stage';
  if (event.levelAfter > event.levelBefore) return 'level';
  return 'xp';
}

export function formatXpFeedbackMessage(event: IdentityXpFeedbackEvent): string {
  const variant = getXpFeedbackVariant(event);
  if (variant === 'stage') {
    return `${event.stageAfter} stage unlocked for ${event.identityName}`;
  }
  if (variant === 'level') {
    return `${event.identityName} reached Level ${event.levelAfter}`;
  }
  return `You showed up for ${event.identityName}. +${event.xpGranted} XP`;
}

interface XpFeedbackToastProps {
  toast: XpFeedbackToastViewModel;
  reducedMotion: boolean;
  onDismiss: (id: string) => void;
  onOpenProgress: (identityId: string) => void;
}

export function XpFeedbackToast({
  toast,
  reducedMotion,
  onDismiss,
  onOpenProgress,
}: XpFeedbackToastProps) {
  const accent =
    toast.variant === 'stage'
      ? 'from-amber-400 to-orange-500'
      : toast.variant === 'level'
        ? 'from-emerald-400 to-teal-500'
        : 'from-sky-400 to-cyan-500';

  return (
    <div
      role="status"
      aria-live="polite"
      data-motion={reducedMotion ? 'reduced' : 'animated'}
      className={[
        'pointer-events-auto w-[min(92vw,24rem)] rounded-2xl border border-slate-200/80 bg-white/95 p-4 text-slate-900 shadow-2xl shadow-slate-950/15 backdrop-blur',
        reducedMotion ? '' : 'transition-all duration-300 ease-out',
      ].join(' ')}
    >
      <div className="flex gap-3">
        <div
          aria-hidden="true"
          className={`mt-0.5 h-10 w-10 shrink-0 rounded-2xl bg-gradient-to-br ${accent} shadow-lg shadow-slate-950/10`}
        />
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold leading-5">{toast.message}</p>
          <p className="mt-1 text-xs text-slate-500">Identity progress updated</p>
          <div className="mt-3 flex items-center gap-3">
            <button
              type="button"
              onClick={() => onOpenProgress(toast.identityId)}
              className="text-xs font-semibold text-teal-700 underline-offset-4 hover:underline"
            >
              View progress
            </button>
            <button
              type="button"
              onClick={() => onDismiss(toast.id)}
              className="text-xs font-medium text-slate-500 underline-offset-4 hover:text-slate-700 hover:underline"
              aria-label="Dismiss identity progress notification"
            >
              Dismiss
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
