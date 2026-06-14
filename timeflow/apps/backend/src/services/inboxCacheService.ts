import type { EmailInboxResponse } from '@timeflow/shared';
import { stripInboxSnippets } from '@timeflow/shared';
import { prisma } from '../config/prisma.js';
import * as gmailService from './gmailService.js';
import { syncGmailLabelsOnInboxFetch } from './gmailLabelSyncService.js';

const STALE_REFRESH_TTL_MS = 90 * 1000; // background refresh threshold
const SERVER_CACHE_MAX_AGE_MS = 24 * 60 * 60 * 1000; // hard expiry — metadata only
const refreshLocks = new Map<string, Promise<void>>();

export function getInboxCacheKey(maxResults?: number): string {
  return `max:${maxResults ?? 'default'}`;
}

export function getInboxCacheTtlMs(): number {
  return STALE_REFRESH_TTL_MS;
}

export function getInboxCacheMaxAgeMs(): number {
  return SERVER_CACHE_MAX_AGE_MS;
}

export async function readInboxCache(
  userId: string,
  cacheKey: string
): Promise<{ data: EmailInboxResponse; ageMs: number; isStale: boolean } | null> {
  const record = await prisma.inboxCache.findUnique({
    where: { userId_cacheKey: { userId, cacheKey } },
  });

  if (!record) return null;

  const ageMs = Date.now() - record.fetchedAt.getTime();
  if (ageMs >= SERVER_CACHE_MAX_AGE_MS) {
    await prisma.inboxCache.delete({
      where: { userId_cacheKey: { userId, cacheKey } },
    });
    return null;
  }

  return {
    data: stripInboxSnippets(record.data as EmailInboxResponse),
    ageMs,
    isStale: ageMs >= STALE_REFRESH_TTL_MS,
  };
}

export async function writeInboxCache(
  userId: string,
  cacheKey: string,
  data: EmailInboxResponse
): Promise<void> {
  const fetchedAt = new Date();
  const sanitized = stripInboxSnippets(data);
  await prisma.inboxCache.upsert({
    where: { userId_cacheKey: { userId, cacheKey } },
    create: {
      userId,
      cacheKey,
      data: sanitized,
      fetchedAt,
    },
    update: {
      data: sanitized,
      fetchedAt,
    },
  });
}

export async function refreshInboxCache(
  userId: string,
  cacheKey: string,
  options: { maxResults?: number }
): Promise<void> {
  const lockKey = `${userId}:${cacheKey}`;
  const existing = refreshLocks.get(lockKey);
  if (existing) {
    await existing;
    return;
  }

  const refreshPromise = (async () => {
    const inbox = await gmailService.getInboxMessages(userId, options);
    await writeInboxCache(userId, cacheKey, inbox);
    void syncGmailLabelsOnInboxFetch(userId);
  })();

  refreshLocks.set(lockKey, refreshPromise);

  try {
    await refreshPromise;
  } finally {
    refreshLocks.delete(lockKey);
  }
}

/**
 * Clear all inbox cache entries for a user
 * Called when new emails arrive via Gmail push to force fresh data
 */
export async function clearInboxCacheForUser(userId: string): Promise<void> {
  await prisma.inboxCache.deleteMany({
    where: { userId },
  });
}
