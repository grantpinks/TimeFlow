import type { InboxView } from '../../../../packages/shared/src/types/email.js';
import { DEFAULT_INBOX_VIEWS } from '../../../../packages/shared/src/types/email.js';

const STORAGE_KEY = 'timeflow_inbox_views_v1';

export function loadInboxViews(): InboxView[] {
  if (typeof window === 'undefined') return DEFAULT_INBOX_VIEWS;
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return DEFAULT_INBOX_VIEWS;
  try {
    return JSON.parse(raw) as InboxView[];
  } catch {
    return DEFAULT_INBOX_VIEWS;
  }
}

export function saveInboxViews(views: InboxView[]) {
  if (typeof window === 'undefined') return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(views));
}
