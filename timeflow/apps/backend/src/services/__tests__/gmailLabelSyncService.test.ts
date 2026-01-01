import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  getSyncStatus,
  removeAllTimeFlowLabels,
  syncGmailLabels,
  updateSyncSettings,
} from '../gmailLabelSyncService';
import { prisma } from '../../config/prisma.js';

const oauth2ClientMock = {
  on: vi.fn(),
};

const gmailMock = {
  users: {
    labels: {
      get: vi.fn(),
      update: vi.fn(),
      create: vi.fn(),
      delete: vi.fn(),
    },
    messages: {
      list: vi.fn(),
      get: vi.fn(),
    },
    threads: {
      modify: vi.fn(),
    },
  },
};

const categorizeEmailMock = vi.fn();

vi.mock('googleapis', () => ({
  google: {
    gmail: vi.fn(() => gmailMock),
  },
}));

vi.mock('../../config/google.js', () => ({
  getUserOAuth2Client: vi.fn(() => oauth2ClientMock),
}));

vi.mock('../emailCategorizationService.js', () => ({
  categorizeEmail: (...args: unknown[]) => categorizeEmailMock(...args),
}));

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
  const baseSyncState = {
    id: 'sync-1',
    userId: testUserId,
    backfillDays: 7,
    backfillMaxThreads: 100,
    lastSyncedAt: null,
    lastSyncThreadCount: 0,
    lastSyncError: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  };
  const baseUser = {
    id: testUserId,
    googleAccessToken: 'access-token',
    googleRefreshToken: 'refresh-token',
    googleAccessTokenExpiry: null,
  };

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

  describe('syncGmailLabels', () => {
    it('does not disable sync when Gmail label update fails', async () => {
      const immediateTimeout = vi.spyOn(global, 'setTimeout').mockImplementation((callback: any) => {
        callback();
        return 0 as any;
      });

      vi.mocked(prisma.user.findUnique).mockResolvedValue({
        ...baseUser,
        emailCategoryConfigs: [
          {
            id: 'config-1',
            categoryId: 'work',
            name: 'Work',
            color: '#ffffff',
            gmailSyncEnabled: true,
            gmailLabelId: 'label-1',
          },
        ],
      } as any);
      vi.mocked(prisma.gmailLabelSyncState.findUnique).mockResolvedValueOnce(baseSyncState as any);
      vi.mocked(prisma.gmailLabelSyncState.update).mockResolvedValueOnce(baseSyncState as any);
      gmailMock.users.labels.get.mockResolvedValueOnce({ data: { id: 'label-1' } });
      gmailMock.users.labels.update.mockRejectedValueOnce({ code: 500, message: 'boom' });
      gmailMock.users.messages.list.mockResolvedValueOnce({ data: { messages: [] } });

      const result = await syncGmailLabels(testUserId);

      expect(result.success).toBe(false);
      expect(result.errors[0]).toMatch(/error syncing category/i);
      expect(prisma.emailCategoryConfig.update).not.toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ gmailSyncEnabled: false }),
        })
      );

      immediateTimeout.mockRestore();
    });

    it('disables sync when the label is missing in Gmail', async () => {
      const immediateTimeout = vi.spyOn(global, 'setTimeout').mockImplementation((callback: any) => {
        callback();
        return 0 as any;
      });

      vi.mocked(prisma.user.findUnique).mockResolvedValue({
        ...baseUser,
        emailCategoryConfigs: [
          {
            id: 'config-2',
            categoryId: 'personal',
            name: 'Personal',
            color: '#ffffff',
            gmailSyncEnabled: true,
            gmailLabelId: 'label-missing',
          },
        ],
      } as any);
      vi.mocked(prisma.gmailLabelSyncState.findUnique).mockResolvedValueOnce(baseSyncState as any);
      vi.mocked(prisma.gmailLabelSyncState.update).mockResolvedValueOnce(baseSyncState as any);
      gmailMock.users.labels.get.mockRejectedValueOnce({ code: 404 });
      gmailMock.users.messages.list.mockResolvedValueOnce({ data: { messages: [] } });

      const result = await syncGmailLabels(testUserId);

      expect(result.success).toBe(false);
      expect(prisma.emailCategoryConfig.update).toHaveBeenCalledWith({
        where: { id: 'config-2' },
        data: {
          gmailSyncEnabled: false,
          gmailLabelId: null,
        },
      });

      immediateTimeout.mockRestore();
    });
  });

  describe('removeAllTimeFlowLabels', () => {
    it('clears sync metadata even when Gmail labels are already gone', async () => {
      const immediateTimeout = vi.spyOn(global, 'setTimeout').mockImplementation((callback: any) => {
        callback();
        return 0 as any;
      });

      vi.mocked(prisma.user.findUnique).mockResolvedValue({
        ...baseUser,
        emailCategoryConfigs: [
          {
            id: 'config-3',
            categoryId: 'updates',
            name: 'Updates',
            gmailLabelId: 'label-404',
          },
        ],
      } as any);
      vi.mocked(prisma.gmailLabelSyncState.findUnique).mockResolvedValueOnce(baseSyncState as any);
      vi.mocked(prisma.gmailLabelSyncState.update).mockResolvedValueOnce(baseSyncState as any);
      gmailMock.users.labels.delete.mockRejectedValueOnce({ code: 404 });

      const result = await removeAllTimeFlowLabels(testUserId);

      expect(result.success).toBe(true);
      expect(prisma.emailCategoryConfig.update).toHaveBeenCalledWith({
        where: { id: 'config-3' },
        data: {
          gmailLabelId: null,
          gmailSyncEnabled: false,
        },
      });

      immediateTimeout.mockRestore();
    });
  });
});
