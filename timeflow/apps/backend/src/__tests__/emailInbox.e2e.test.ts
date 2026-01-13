import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import type { FastifyInstance } from 'fastify';
import { GmailRateLimitError } from '../utils/gmailRateLimiter.js';

const prismaMock = {
  user: {
    findUnique: vi.fn(),
  },
  inboxCache: {
    findUnique: vi.fn(),
    upsert: vi.fn(),
  },
};

const gmailServiceMock = {
  getInboxMessages: vi.fn(),
};

vi.mock('../config/prisma.js', () => ({
  prisma: prismaMock,
}));

vi.mock('../services/gmailService.js', () => gmailServiceMock);

let server: FastifyInstance;
let buildServer: typeof import('../server.js').buildServer;

const fakeUser = {
  id: 'user-123',
  email: 'user@example.com',
  googleId: 'google-123',
  timeZone: 'America/Chicago',
  wakeTime: '08:00',
  sleepTime: '23:00',
  defaultTaskDurationMinutes: 30,
  defaultCalendarId: null,
};

function authHeader(userId = fakeUser.id) {
  const token = server.jwt.sign({ sub: userId, type: 'access' });
  return `Bearer ${token}`;
}

beforeAll(async () => {
  process.env.NODE_ENV = 'test';
  process.env.DATABASE_URL = 'file:memory:?schema=public';
  process.env.SESSION_SECRET = 'test-session-secret';
  process.env.ENCRYPTION_KEY = 'test-encryption-key-should-be-32-characters!';

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

describe('GET /api/email/inbox', () => {
  it('rejects unauthenticated requests', async () => {
    const res = await server.inject({
      method: 'GET',
      url: '/api/email/inbox',
    });

    expect(res.statusCode).toBe(401);
  });

  it('returns inbox messages for authenticated users', async () => {
    prismaMock.user.findUnique.mockResolvedValue(fakeUser);
    prismaMock.inboxCache.findUnique.mockResolvedValue(null);
    gmailServiceMock.getInboxMessages.mockResolvedValue({
      messages: [
        {
          id: '1',
          threadId: 't1',
          from: 'sender@example.com',
          subject: 'Test email',
          snippet: 'Hello from the inbox',
          receivedAt: '2025-12-05T10:00:00.000Z',
          importance: 'normal',
          labels: ['INBOX'],
          isRead: false,
          isPromotional: false,
        },
      ],
      nextPageToken: 'next-token',
    });

    const res = await server.inject({
      method: 'GET',
      url: '/api/email/inbox?maxResults=5',
      headers: {
        authorization: authHeader(),
      },
    });

    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    expect(body.messages).toHaveLength(1);
    expect(body.nextPageToken).toBe('next-token');
    expect(body.messages[0].subject).toBe('Test email');
    expect(gmailServiceMock.getInboxMessages).toHaveBeenCalledWith(fakeUser.id, {
      maxResults: 5,
      pageToken: undefined,
    });
    expect(prismaMock.inboxCache.upsert).toHaveBeenCalledTimes(1);
  });

  it('returns 429 when Gmail rate limit is exceeded', async () => {
    prismaMock.user.findUnique.mockResolvedValue(fakeUser);
    prismaMock.inboxCache.findUnique.mockResolvedValue(null);
    gmailServiceMock.getInboxMessages.mockRejectedValue(new GmailRateLimitError(12));

    const res = await server.inject({
      method: 'GET',
      url: '/api/email/inbox',
      headers: {
        authorization: authHeader(),
      },
    });

    expect(res.statusCode).toBe(429);
    const body = JSON.parse(res.body);
    expect(body.retryAfterSeconds).toBe(12);
    expect(body.error).toMatch(/rate limit/i);
  });

  it('serves fresh cached inbox without calling Gmail', async () => {
    prismaMock.user.findUnique.mockResolvedValue(fakeUser);
    prismaMock.inboxCache.findUnique.mockResolvedValue({
      id: 'cache-1',
      userId: fakeUser.id,
      cacheKey: 'max:default',
      fetchedAt: new Date(Date.now() - 30 * 1000),
      data: {
        messages: [
          {
            id: 'cached-1',
            threadId: 't-cache',
            from: 'cached@example.com',
            subject: 'Cached email',
            snippet: 'Cached',
            receivedAt: '2025-12-05T10:00:00.000Z',
            importance: 'normal',
            labels: ['INBOX'],
            isRead: true,
          },
        ],
        nextPageToken: 'cached-token',
      },
    });

    const res = await server.inject({
      method: 'GET',
      url: '/api/email/inbox',
      headers: {
        authorization: authHeader(),
      },
    });

    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    expect(body.messages).toHaveLength(1);
    expect(body.messages[0].subject).toBe('Cached email');
    expect(body.nextPageToken).toBe('cached-token');
    expect(body.isStale).toBe(false);
    expect(body.cacheAgeMs).toBeTypeOf('number');
    expect(gmailServiceMock.getInboxMessages).not.toHaveBeenCalled();
  });

  it('serves stale cached inbox and triggers refresh', async () => {
    prismaMock.user.findUnique.mockResolvedValue(fakeUser);
    prismaMock.inboxCache.findUnique.mockResolvedValue({
      id: 'cache-2',
      userId: fakeUser.id,
      cacheKey: 'max:default',
      fetchedAt: new Date(Date.now() - 5 * 60 * 1000),
      data: {
        messages: [
          {
            id: 'stale-1',
            threadId: 't-stale',
            from: 'stale@example.com',
            subject: 'Stale email',
            snippet: 'Stale',
            receivedAt: '2025-12-05T10:00:00.000Z',
            importance: 'normal',
            labels: ['INBOX'],
            isRead: true,
          },
        ],
        nextPageToken: 'stale-token',
      },
    });
    gmailServiceMock.getInboxMessages.mockResolvedValue({
      messages: [],
      nextPageToken: null,
    });

    const res = await server.inject({
      method: 'GET',
      url: '/api/email/inbox',
      headers: {
        authorization: authHeader(),
      },
    });

    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    expect(body.messages).toHaveLength(1);
    expect(body.messages[0].subject).toBe('Stale email');
    expect(body.isStale).toBe(true);
    expect(gmailServiceMock.getInboxMessages).toHaveBeenCalled();
  });
});
