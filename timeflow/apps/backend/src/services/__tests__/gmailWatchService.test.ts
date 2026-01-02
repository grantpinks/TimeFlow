import { beforeEach, describe, expect, it, vi } from 'vitest';
import { startGmailWatch } from '../gmailWatchService';
import { prisma } from '../../config/prisma.js';

const oauth2ClientMock = {
  on: vi.fn(),
};

const gmailMock = {
  users: {
    watch: vi.fn(),
  },
};

vi.mock('googleapis', () => ({
  google: {
    gmail: vi.fn(() => gmailMock),
  },
}));

vi.mock('../../config/google.js', () => ({
  getUserOAuth2Client: vi.fn(() => oauth2ClientMock),
}));

vi.mock('../../config/prisma.js', () => ({
  prisma: {
    user: {
      findUnique: vi.fn(),
    },
    gmailLabelSyncState: {
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
  },
}));

beforeEach(() => {
  vi.clearAllMocks();
});

describe('gmailWatchService', () => {
  it('starts a Gmail watch and persists historyId + expiration', async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue({
      id: 'user-1',
      googleAccessToken: 'access-token',
      googleRefreshToken: 'refresh-token',
      googleAccessTokenExpiry: null,
    } as any);

    vi.mocked(prisma.gmailLabelSyncState.findUnique).mockResolvedValue(null);
    vi.mocked(prisma.gmailLabelSyncState.create).mockResolvedValue({
      id: 'sync-1',
      userId: 'user-1',
      backfillDays: 7,
      backfillMaxThreads: 100,
      createdAt: new Date(),
      updatedAt: new Date(),
    } as any);

    vi.mocked(prisma.gmailLabelSyncState.update).mockResolvedValue({
      userId: 'user-1',
      watchEnabled: true,
      watchResourceId: 'resource-123',
      watchTopicName: 'projects/demo/topics/timeflow',
      lastHistoryId: '999',
      watchExpiration: new Date('2030-01-01T00:00:00Z'),
    } as any);

    gmailMock.users.watch.mockResolvedValue({
      data: {
        historyId: '999',
        expiration: '1893456000000',
        id: 'resource-123',
      },
    });

    const result = await startGmailWatch('user-1', {
      topicName: 'projects/demo/topics/timeflow',
    });

    expect(result.watchEnabled).toBe(true);
    expect(result.lastHistoryId).toBe('999');
  });
});
