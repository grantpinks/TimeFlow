'use client';

import { useEffect, useRef } from 'react';
import * as api from '@/lib/api';
import { getCacheAge } from '@/lib/emailCache';

const PREFETCH_TTL_MS = 2 * 60 * 1000;
const PREFETCH_KEY = 'timeflow_inbox_prefetch_at';
const DEBUG_PREFETCH = process.env.NEXT_PUBLIC_INBOX_PREFETCH_DEBUG === 'true';

function canUseStorage(): boolean {
  return (
    typeof window !== 'undefined' &&
    typeof window.localStorage?.getItem === 'function' &&
    typeof window.sessionStorage?.getItem === 'function'
  );
}

export function InboxPrefetch() {
  const startedRef = useRef(false);

  useEffect(() => {
    if (!canUseStorage() || startedRef.current) return;

    const token = window.localStorage.getItem('timeflow_token');
    if (!token) return;

    const cacheAge = getCacheAge();
    if (cacheAge !== null && cacheAge < PREFETCH_TTL_MS) {
      if (DEBUG_PREFETCH) {
        console.log('[InboxPrefetch] Skipping: cache fresh', { cacheAge });
      }
      return;
    }

    const lastPrefetch = Number(window.sessionStorage.getItem(PREFETCH_KEY) ?? 0);
    if (lastPrefetch && Date.now() - lastPrefetch < PREFETCH_TTL_MS) {
      if (DEBUG_PREFETCH) {
        console.log('[InboxPrefetch] Skipping: recent session prefetch');
      }
      return;
    }

    startedRef.current = true;
    window.sessionStorage.setItem(PREFETCH_KEY, Date.now().toString());

    if (DEBUG_PREFETCH) {
      console.log('[InboxPrefetch] Starting prefetch');
    }

    void api.getInboxEmails({ maxResults: 100, cacheMode: 'prefer' }).catch((error) => {
      if (DEBUG_PREFETCH) {
        console.warn('[InboxPrefetch] Prefetch failed', error);
      }
    });
  }, []);

  return null;
}
