import type { EmailInboxResponse } from '@timeflow/shared';
import { prisma } from '../config/prisma.js';
import * as gmailService from './gmailService.js';
import { syncGmailLabelsOnInboxFetch } from './gmailLabelSyncService.js';

const CACHE_TTL_MS = 2 * 60 * 1000;
const refreshLocks = new Map<string, Promise<void>>();

export function getInboxCacheKey(maxResults?: number): string {
  return `max:${maxResults ?? 'default'}`;
}

export function getInboxCacheTtlMs(): number {
  return CACHE_TTL_MS;
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
  return {
    data: record.data as EmailInboxResponse,
    ageMs,
    isStale: ageMs >= CACHE_TTL_MS,
  };
}

export async function writeInboxCache(
  userId: string,
  cacheKey: string,
  data: EmailInboxResponse
): Promise<void> {
  const fetchedAt = new Date();
  await prisma.inboxCache.upsert({
    where: { userId_cacheKey: { userId, cacheKey } },
    create: {
      userId,
      cacheKey,
      data,
      fetchedAt,
    },
    update: {
      data,
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
