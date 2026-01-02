import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import type { FastifyInstance } from 'fastify';

const prismaMock = {
  user: {
    findUnique: vi.fn(),
  },
};

const gmailWatchServiceMock = {
  startGmailWatch: vi.fn(),
  stopGmailWatch: vi.fn(),
};

vi.mock('../config/prisma.js', () => ({
  prisma: prismaMock,
}));

vi.mock('../services/gmailWatchService.js', () => gmailWatchServiceMock);

let server: FastifyInstance;
let buildServer: typeof import('../server.js').buildServer;

const fakeUser = {
  id: 'user-456',
  email: 'user@example.com',
  googleId: 'google-456',
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
  process.env.GMAIL_PUBSUB_TOPIC = 'projects/demo/topics/timeflow';

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

describe('POST /api/gmail-sync/watch/enable', () => {
  it('enables Gmail watch for authenticated user', async () => {
    prismaMock.user.findUnique.mockResolvedValue(fakeUser);
    gmailWatchServiceMock.startGmailWatch.mockResolvedValue({ watchEnabled: true });

    const res = await server.inject({
      method: 'POST',
      url: '/api/gmail-sync/watch/enable',
      headers: { authorization: authHeader() },
    });

    expect(res.statusCode).toBe(200);
    expect(gmailWatchServiceMock.startGmailWatch).toHaveBeenCalled();
  });
});

describe('POST /api/gmail-sync/watch/disable', () => {
  it('disables Gmail watch for authenticated user', async () => {
    prismaMock.user.findUnique.mockResolvedValue(fakeUser);
    gmailWatchServiceMock.stopGmailWatch.mockResolvedValue({ watchEnabled: false });

    const res = await server.inject({
      method: 'POST',
      url: '/api/gmail-sync/watch/disable',
      headers: { authorization: authHeader() },
    });

    expect(res.statusCode).toBe(200);
    expect(gmailWatchServiceMock.stopGmailWatch).toHaveBeenCalled();
  });
});
