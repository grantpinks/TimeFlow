import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import type { FastifyInstance } from 'fastify';
import * as assistantService from '../services/assistantService.js';
import type { FullEmailMessage, SendEmailRequest, SendEmailResponse } from '@timeflow/shared';

const prismaMock = {
  user: {
    findUnique: vi.fn(),
  },
  writingVoiceProfile: {
    findUnique: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
  },
};

const gmailServiceMock = {
  getFullEmail: vi.fn(),
  createGmailDraft: vi.fn(),
  sendEmail: vi.fn(),
};

vi.mock('../config/prisma.js', () => ({
  prisma: prismaMock,
}));

vi.mock('../services/gmailService.js', () => gmailServiceMock);

vi.mock('../services/assistantService.js', () => ({
  runAssistantTask: vi.fn(),
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

describe('POST /api/email/draft/ai', () => {
  it('rejects unauthenticated requests', async () => {
    const res = await server.inject({
      method: 'POST',
      url: '/api/email/draft/ai',
      payload: { emailId: 'email-1' },
    });

    expect(res.statusCode).toBe(401);
  });

  it('blocks when Gmail account is not connected', async () => {
    prismaMock.user.findUnique.mockResolvedValue({
      id: fakeUser.id,
      googleAccessToken: null,
    });

    const res = await server.inject({
      method: 'POST',
      url: '/api/email/draft/ai',
      headers: { authorization: authHeader() },
      payload: { emailId: 'email-1' },
    });

    expect(res.statusCode).toBe(403);
    expect(res.json()).toEqual(
      expect.objectContaining({ code: 'GMAIL_NOT_CONNECTED' })
    );
  });

  it('returns a draft for authenticated users', async () => {
    prismaMock.user.findUnique.mockResolvedValue({
      id: fakeUser.id,
      googleAccessToken: 'token',
    });
    prismaMock.writingVoiceProfile.findUnique.mockResolvedValue({
      userId: fakeUser.id,
      formality: 5,
      length: 5,
      tone: 5,
      voiceSamples: null,
      aiDraftsGenerated: 0,
    });
    gmailServiceMock.getFullEmail.mockResolvedValue({
      id: 'email-1',
      from: 'Jane <jane@example.com>',
      subject: 'Quick question',
      snippet: 'Can we connect tomorrow?',
      receivedAt: new Date().toISOString(),
      importance: 'normal',
      body: 'Can we connect tomorrow?',
    });
    vi.mocked(assistantService.runAssistantTask).mockResolvedValue({
      draftText: 'Sure, that works for me.',
    } as any);

    const res = await server.inject({
      method: 'POST',
      url: '/api/email/draft/ai',
      headers: { authorization: authHeader() },
      payload: { emailId: 'email-1' },
    });

    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual(
      expect.objectContaining({
        draftText: 'Sure, that works for me.',
        to: 'jane@example.com',
        subject: 'Re: Quick question',
      })
    );
  });
});

describe('POST /api/email/drafts', () => {
  it('requires confirmation before sending', async () => {
    prismaMock.user.findUnique.mockResolvedValue({
      id: fakeUser.id,
      googleAccessToken: 'token',
    });

    const res = await server.inject({
      method: 'POST',
      url: '/api/email/drafts',
      headers: { authorization: authHeader() },
      payload: {
        action: 'send',
        confirmed: false,
        draftText: 'Hello',
        to: 'jane@example.com',
        subject: 'Re: Quick question',
        htmlPreview: '<p>Hello</p>',
        textPreview: 'Hello',
        determinismToken: 'token',
        threadId: 'thread-1',
      },
    });

    expect(res.statusCode).toBe(400);
    expect(res.json()).toEqual(
      expect.objectContaining({
        error: expect.stringMatching(/confirmation/i),
      })
    );
  });
});
