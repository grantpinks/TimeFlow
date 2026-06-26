'use client';

import type { IdentityXpFeedbackEvent } from '@timeflow/shared';

export const IDENTITY_XP_FEEDBACK_EVENT = 'timeflow:identity-xp-feedback';

export function isIdentityXpFeedbackEnabled(): boolean {
  return process.env.NEXT_PUBLIC_CHARACTER_EVOLUTION_PROGRESS_VISIBILITY === 'true';
}

export function emitIdentityXpFeedback(event?: IdentityXpFeedbackEvent | null) {
  if (!event || typeof window === 'undefined' || !isIdentityXpFeedbackEnabled()) return;
  window.dispatchEvent(new CustomEvent(IDENTITY_XP_FEEDBACK_EVENT, { detail: event }));
}
