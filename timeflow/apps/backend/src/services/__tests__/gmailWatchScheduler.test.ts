import { beforeEach, describe, expect, it, vi } from 'vitest';
import { prisma } from '../../config/prisma.js';
import * as gmailWatchService from '../gmailWatchService.js';

vi.mock('../../config/prisma.js', () => ({
  prisma: {
    gmailLabelSyncState: {
      findMany: vi.fn(),
    },
  },
}));

vi.mock('../gmailWatchService.js', () => ({
  startGmailWatch: vi.fn(),
}));

beforeEach(() => {
  vi.clearAllMocks();
  process.env.GMAIL_PUBSUB_TOPIC = 'projects/demo/topics/timeflow';
  process.env.GMAIL_WATCH_RENEWAL_WINDOW_MINUTES = '10';
});

describe('gmailWatchScheduler', () => {
  it('renews watches expiring within the window', async () => {
    vi.mocked(prisma.gmailLabelSyncState.findMany).mockResolvedValue([
      {
        userId: 'user-1',
        watchEnabled: true,
        watchExpiration: new Date(Date.now() + 5 * 60 * 1000),
      },
    ]);

    const { renewExpiringWatches } = await import('../gmailWatchScheduler.js');
    await renewExpiringWatches();

    expect(vi.mocked(gmailWatchService.startGmailWatch)).toHaveBeenCalledWith('user-1', {
      topicName: 'projects/demo/topics/timeflow',
    });
  });
});
