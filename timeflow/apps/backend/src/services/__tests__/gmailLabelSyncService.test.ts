import { beforeEach, describe, expect, it, vi } from 'vitest';
import { getSyncStatus, updateSyncSettings } from '../gmailLabelSyncService';
import { prisma } from '../../config/prisma.js';

vi.mock('../../config/prisma.js', () => ({
  prisma: {
    gmailLabelSyncState: {
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
    user: {
      findUnique: vi.fn(),
    },
    emailCategoryConfig: {
      update: vi.fn(),
    },
  },
}));

beforeEach(() => {
  vi.clearAllMocks();
});

describe('gmailLabelSyncService', () => {
  const testUserId = 'test-user-id';

  describe('getSyncStatus', () => {
    it('should return null if sync state does not exist', async () => {
      vi.mocked(prisma.gmailLabelSyncState.findUnique).mockResolvedValueOnce(null);
      const status = await getSyncStatus(testUserId);
      expect(status).toBeNull();
    });
  });

  describe('updateSyncSettings', () => {
    it('should create sync state if it does not exist', async () => {
      vi.mocked(prisma.gmailLabelSyncState.findUnique).mockResolvedValueOnce(null);
      vi.mocked(prisma.gmailLabelSyncState.create).mockResolvedValueOnce({
        id: 'sync1',
        userId: testUserId,
        backfillDays: 7,
        backfillMaxThreads: 100,
        lastSyncedAt: null,
        lastSyncThreadCount: 0,
        lastSyncError: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      vi.mocked(prisma.gmailLabelSyncState.update).mockResolvedValueOnce({
        id: 'sync1',
        userId: testUserId,
        backfillDays: 14,
        backfillMaxThreads: 200,
        lastSyncedAt: null,
        lastSyncThreadCount: 0,
        lastSyncError: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const syncState = await updateSyncSettings(testUserId, {
        backfillDays: 14,
        backfillMaxThreads: 200,
      });

      expect(syncState.backfillDays).toBe(14);
      expect(syncState.backfillMaxThreads).toBe(200);
    });

    it('should update existing sync state', async () => {
      vi.mocked(prisma.gmailLabelSyncState.findUnique).mockResolvedValueOnce({
        id: 'sync2',
        userId: testUserId,
        backfillDays: 7,
        backfillMaxThreads: 100,
        lastSyncedAt: null,
        lastSyncThreadCount: 0,
        lastSyncError: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      vi.mocked(prisma.gmailLabelSyncState.update).mockResolvedValueOnce({
        id: 'sync2',
        userId: testUserId,
        backfillDays: 30,
        backfillMaxThreads: 100,
        lastSyncedAt: null,
        lastSyncThreadCount: 0,
        lastSyncError: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const updated = await updateSyncSettings(testUserId, { backfillDays: 30 });

      expect(updated.backfillDays).toBe(30);
      expect(updated.backfillMaxThreads).toBe(100);
    });
  });
});
