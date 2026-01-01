import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import type { FastifyInstance } from 'fastify';

const prismaMock = {
  user: {
    findUnique: vi.fn(),
  },
};

const gmailSyncServiceMock = {
  syncGmailLabels: vi.fn(),
  removeAllTimeFlowLabels: vi.fn(),
  updateSyncSettings: vi.fn(),
  getSyncStatus: vi.fn(),
};

vi.mock('../config/prisma.js', () => ({
  prisma: prismaMock,
}));

vi.mock('../services/gmailLabelSyncService.js', () => gmailSyncServiceMock);

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

describe('PATCH /api/gmail-sync/settings', () => {
  it('returns 400 when no settings are provided', async () => {
    prismaMock.user.findUnique.mockResolvedValue(fakeUser);

    const res = await server.inject({
      method: 'PATCH',
      url: '/api/gmail-sync/settings',
      headers: {
        authorization: authHeader(),
      },
    });

    expect(res.statusCode).toBe(400);
    const body = JSON.parse(res.body);
    expect(body.message).toMatch(/settings/i);
    expect(gmailSyncServiceMock.updateSyncSettings).not.toHaveBeenCalled();
  });

  it('updates settings when valid values are provided', async () => {
    prismaMock.user.findUnique.mockResolvedValue(fakeUser);
    gmailSyncServiceMock.updateSyncSettings.mockResolvedValue({
      userId: fakeUser.id,
      backfillDays: 10,
      backfillMaxThreads: 200,
    });

    const res = await server.inject({
      method: 'PATCH',
      url: '/api/gmail-sync/settings',
      headers: {
        authorization: authHeader(),
      },
      payload: {
        backfillDays: 10,
      },
    });

    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    expect(body.backfillDays).toBe(10);
    expect(gmailSyncServiceMock.updateSyncSettings).toHaveBeenCalledWith(fakeUser.id, {
      backfillDays: 10,
      backfillMaxThreads: undefined,
    });
  });
});
