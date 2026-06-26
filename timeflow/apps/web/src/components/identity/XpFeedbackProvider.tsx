'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useReducedMotion } from 'framer-motion';
import type { IdentityXpFeedbackEvent } from '@timeflow/shared';
import { track } from '@/lib/analytics';
import {
  IDENTITY_XP_FEEDBACK_EVENT,
  isIdentityXpFeedbackEnabled,
} from '@/lib/identityXpFeedback';
import {
  XpFeedbackToast,
  formatXpFeedbackMessage,
  getXpFeedbackVariant,
  type XpFeedbackToastViewModel,
} from './XpFeedbackToast';

export { IDENTITY_XP_FEEDBACK_EVENT };

const BATCH_WINDOW_MS = 300;
const NORMAL_DURATION_MS = 4000;
const MAJOR_DURATION_MS = 7000;

interface XpFeedbackProviderProps {
  onOpenProgress?: (identityId: string) => void;
}

function toToast(id: string, event: IdentityXpFeedbackEvent): XpFeedbackToastViewModel | null {
  if (event.xpGranted <= 0) return null;

  const variant = getXpFeedbackVariant(event);
  return {
    id,
    variant,
    message: formatXpFeedbackMessage(event),
    source: event.source,
    identityId: event.identityId,
    durationMs: variant === 'xp' ? NORMAL_DURATION_MS : MAJOR_DURATION_MS,
  };
}

function toBatchToast(id: string, events: IdentityXpFeedbackEvent[]): XpFeedbackToastViewModel | null {
  const rewardingEvents = events.filter((event) => event.xpGranted > 0);
  if (rewardingEvents.length === 0) return null;
  if (rewardingEvents.length === 1) return toToast(id, rewardingEvents[0]!);

  const totalXp = rewardingEvents.reduce((sum, event) => sum + event.xpGranted, 0);
  return {
    id,
    variant: 'batch',
    message: `${rewardingEvents.length} completions strengthened your identities. +${totalXp} XP`,
    source: rewardingEvents[0]!.source,
    identityId: rewardingEvents[0]!.identityId,
    durationMs: NORMAL_DURATION_MS,
  };
}

export function XpFeedbackProvider({ onOpenProgress }: XpFeedbackProviderProps) {
  const reducedMotion = useReducedMotion() === true;
  const [toasts, setToasts] = useState<XpFeedbackToastViewModel[]>([]);
  const pendingEventsRef = useRef<IdentityXpFeedbackEvent[]>([]);
  const flushTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const dismissTimersRef = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());
  const nextToastIdRef = useRef(0);

  const removeToast = useCallback((id: string) => {
    const timer = dismissTimersRef.current.get(id);
    if (timer) clearTimeout(timer);
    dismissTimersRef.current.delete(id);
    setToasts((current) => current.filter((toast) => toast.id !== id));
  }, []);

  const scheduleDismiss = useCallback(
    (toast: XpFeedbackToastViewModel) => {
      const timer = setTimeout(() => removeToast(toast.id), toast.durationMs);
      dismissTimersRef.current.set(toast.id, timer);
    },
    [removeToast]
  );

  const showToast = useCallback(
    (toast: XpFeedbackToastViewModel) => {
      setToasts((current) => [...current, toast]);
      scheduleDismiss(toast);
      track('identity_xp_toast_shown', { source: toast.source, variant: toast.variant });
      if (toast.variant === 'level') {
        track('identity_level_up_shown', { source: toast.source });
      } else if (toast.variant === 'stage') {
        track('identity_stage_unlocked_shown', { source: toast.source });
      }
    },
    [scheduleDismiss]
  );

  const flushPendingEvents = useCallback(() => {
    flushTimerRef.current = null;
    const events = pendingEventsRef.current;
    pendingEventsRef.current = [];

    const toast = toBatchToast(`xp-toast-${nextToastIdRef.current++}`, events);
    if (toast) showToast(toast);
  }, [showToast]);

  useEffect(() => {
    if (!isIdentityXpFeedbackEnabled() || typeof window === 'undefined') return;

    const handleXpFeedback = (rawEvent: Event) => {
      const event = rawEvent as CustomEvent<IdentityXpFeedbackEvent>;
      if (!event.detail || event.detail.xpGranted <= 0) return;

      pendingEventsRef.current.push(event.detail);
      if (!flushTimerRef.current) {
        flushTimerRef.current = setTimeout(flushPendingEvents, BATCH_WINDOW_MS);
      }
    };

    window.addEventListener(IDENTITY_XP_FEEDBACK_EVENT, handleXpFeedback);
    return () => {
      window.removeEventListener(IDENTITY_XP_FEEDBACK_EVENT, handleXpFeedback);
      if (flushTimerRef.current) clearTimeout(flushTimerRef.current);
      dismissTimersRef.current.forEach((timer) => clearTimeout(timer));
      dismissTimersRef.current.clear();
    };
  }, [flushPendingEvents]);

  const handleOpenProgress = useCallback(
    (toast: XpFeedbackToastViewModel) => {
      track('identity_xp_toast_clicked', { source: toast.source, variant: toast.variant });
      if (onOpenProgress) {
        onOpenProgress(toast.identityId);
        return;
      }
      if (typeof window !== 'undefined') {
        window.location.assign(`/habits?progress=${encodeURIComponent(toast.identityId)}`);
      }
    },
    [onOpenProgress]
  );

  if (toasts.length === 0) return null;

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-4 z-[1300] flex flex-col items-center gap-3 px-4 sm:inset-x-auto sm:bottom-auto sm:right-4 sm:top-4 sm:items-end">
      {toasts.map((toast) => (
        <XpFeedbackToast
          key={toast.id}
          toast={toast}
          reducedMotion={reducedMotion}
          onDismiss={removeToast}
          onOpenProgress={() => handleOpenProgress(toast)}
        />
      ))}
    </div>
  );
}
