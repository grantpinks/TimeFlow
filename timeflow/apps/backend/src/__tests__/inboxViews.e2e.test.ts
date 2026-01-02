import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import type { FastifyInstance } from 'fastify';

const prismaMock = {
  user: {
    findUnique: vi.fn(),
    update: vi.fn(),
  },
};

vi.mock('../config/prisma.js', () => ({
  prisma: prismaMock,
}));

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
  inboxViews: null,
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

describe('GET /api/inbox/views', () => {
  it('returns default views when user has none', async () => {
    prismaMock.user.findUnique.mockResolvedValue({ ...fakeUser, inboxViews: null });

    const res = await server.inject({
      method: 'GET',
      url: '/api/inbox/views',
      headers: { authorization: authHeader() },
    });

    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    expect(body.views.map((view: { id: string }) => view.id)).toEqual([
      'all',
      'professional',
      'personal',
    ]);
  });
});

describe('PUT /api/inbox/views', () => {
  it('updates views and persists on PUT', async () => {
    const views = [
      { id: 'personal', name: 'Personal', labelIds: ['personal', 'updates'], isBuiltin: true },
    ];
    prismaMock.user.update.mockResolvedValue({ ...fakeUser, inboxViews: views });

    const res = await server.inject({
      method: 'PUT',
      url: '/api/inbox/views',
      headers: { authorization: authHeader() },
      payload: { views },
    });

    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    const personalView = body.views.find((view: { id: string }) => view.id === 'personal');
    expect(personalView?.labelIds).toContain('updates');
  });
});
