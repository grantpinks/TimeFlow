import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import type { FastifyInstance } from 'fastify';

const prismaMock = {
  user: {
    findUnique: vi.fn(),
  },
  gmailLabelSyncState: {
    findUnique: vi.fn(),
  },
};

const gmailWatchServiceMock = {
  syncFromHistory: vi.fn(),
};

vi.mock('../config/prisma.js', () => ({
  prisma: prismaMock,
}));

vi.mock('../services/gmailWatchService.js', () => gmailWatchServiceMock);

let server: FastifyInstance;
let buildServer: typeof import('../server.js').buildServer;

beforeAll(async () => {
  process.env.NODE_ENV = 'development';
  process.env.DATABASE_URL = 'file:memory:?schema=public';
  process.env.SESSION_SECRET = 'test-session-secret';
  process.env.ENCRYPTION_KEY = 'test-encryption-key-should-be-32-characters!';
  process.env.GMAIL_PUBSUB_PUSH_SECRET = 'secret';

  ({ buildServer } = await import('../server.js'));
  server = await buildServer();
});

afterAll(async () => {
  if (server) {
    await server.close();
  }
});

afterEach(() => {
  vi.clearAllMocks();
});

describe('POST /api/integrations/gmail/push error details', () => {
  it('returns error details in development when sync fails', async () => {
    prismaMock.user.findUnique.mockResolvedValue({
      id: 'user-123',
      email: 'user@example.com',
    });
    prismaMock.gmailLabelSyncState.findUnique.mockResolvedValue({
      userId: 'user-123',
      lastHistoryId: '50',
    });
    gmailWatchServiceMock.syncFromHistory.mockRejectedValue(new Error('History sync failed'));

    const payload = {
      message: {
        data: Buffer.from(
          JSON.stringify({ emailAddress: 'user@example.com', historyId: '100' })
        ).toString('base64'),
      },
      subscription: 'projects/demo/subscriptions/timeflow',
    };

    const res = await server.inject({
      method: 'POST',
      url: '/api/integrations/gmail/push',
      headers: { 'x-pubsub-token': 'secret' },
      payload,
    });

    expect(res.statusCode).toBe(500);
    const body = res.json() as { error?: string; details?: string };
    expect(body.error).toBe('Failed to process Gmail push');
    expect(body.details).toBe('History sync failed');
  });
});
