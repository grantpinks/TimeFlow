/**
 * Email Cache Utility
 *
 * Short-lived session cache for inbox metadata (no snippets) to reduce Gmail API calls.
 * Uses sessionStorage (not localStorage) so data clears when the tab closes.
 */

import type { EmailInboxResponse } from '@timeflow/shared';
import { stripInboxSnippets } from '@timeflow/shared';

interface CacheEntry {
  data: EmailInboxResponse;
  timestamp: number;
}

const CACHE_KEY = 'timeflow_email_cache';
const CACHE_TTL_MS = 90 * 1000; // 90 seconds

function getStorage(): Storage | null {
  if (typeof window === 'undefined' || typeof window.sessionStorage === 'undefined') {
    return null;
  }
  return window.sessionStorage;
}

/**
 * Get cached emails if they exist and are less than TTL old.
 */
export function getCachedEmails(): EmailInboxResponse | null {
  const storage = getStorage();
  if (!storage) return null;

  try {
    const cached = storage.getItem(CACHE_KEY);
    if (!cached) return null;

    const entry: CacheEntry = JSON.parse(cached);
    const now = Date.now();

    if (now - entry.timestamp < CACHE_TTL_MS) {
      return entry.data;
    }

    storage.removeItem(CACHE_KEY);
    return null;
  } catch {
    storage.removeItem(CACHE_KEY);
    return null;
  }
}

/**
 * Cache email data with current timestamp.
 */
export function cacheEmails(data: EmailInboxResponse): void {
  const storage = getStorage();
  if (!storage) return;

  try {
    const entry: CacheEntry = {
      data: stripInboxSnippets(data),
      timestamp: Date.now(),
    };
    storage.setItem(CACHE_KEY, JSON.stringify(entry));
  } catch (err) {
    console.warn('Failed to cache emails:', err);
  }
}

/**
 * Clear the email cache manually (e.g. on logout).
 */
export function clearEmailCache(): void {
  const storage = getStorage();
  if (!storage) return;
  storage.removeItem(CACHE_KEY);
}

/**
 * Get the age of the cache in milliseconds.
 * Returns null if no cache exists.
 */
export function getCacheAge(): number | null {
  const storage = getStorage();
  if (!storage) return null;

  try {
    const cached = storage.getItem(CACHE_KEY);
    if (!cached) return null;

    const entry: CacheEntry = JSON.parse(cached);
    return Date.now() - entry.timestamp;
  } catch {
    return null;
  }
}
