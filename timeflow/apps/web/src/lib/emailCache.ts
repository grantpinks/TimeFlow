/**
 * Email Cache Utility
 *
 * Provides a 5-minute cache for inbox emails to reduce Gmail API calls.
 */

import type { EmailInboxResponse } from '@timeflow/shared';

interface CacheEntry {
  data: EmailInboxResponse;
  timestamp: number;
}

const CACHE_KEY = 'timeflow_email_cache';
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

/**
 * Get cached emails if they exist and are less than 5 minutes old.
 */
export function getCachedEmails(): EmailInboxResponse | null {
  if (typeof window === 'undefined') return null;

  try {
    const cached = localStorage.getItem(CACHE_KEY);
    if (!cached) return null;

    const entry: CacheEntry = JSON.parse(cached);
    const now = Date.now();

    // Check if cache is still valid (less than 5 minutes old)
    if (now - entry.timestamp < CACHE_TTL_MS) {
      return entry.data;
    }

    // Cache expired, remove it
    localStorage.removeItem(CACHE_KEY);
    return null;
  } catch (err) {
    // If parsing fails, clear the cache
    localStorage.removeItem(CACHE_KEY);
    return null;
  }
}

/**
 * Cache email data with current timestamp.
 */
export function cacheEmails(data: EmailInboxResponse): void {
  if (typeof window === 'undefined') return;

  try {
    const entry: CacheEntry = {
      data,
      timestamp: Date.now(),
    };
    localStorage.setItem(CACHE_KEY, JSON.stringify(entry));
  } catch (err) {
    // If storage quota exceeded or other error, just ignore
    console.warn('Failed to cache emails:', err);
  }
}

/**
 * Clear the email cache manually.
 */
export function clearEmailCache(): void {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(CACHE_KEY);
}

/**
 * Get the age of the cache in milliseconds.
 * Returns null if no cache exists.
 */
export function getCacheAge(): number | null {
  if (typeof window === 'undefined') return null;

  try {
    const cached = localStorage.getItem(CACHE_KEY);
    if (!cached) return null;

    const entry: CacheEntry = JSON.parse(cached);
    return Date.now() - entry.timestamp;
  } catch (err) {
    return null;
  }
}
