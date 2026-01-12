import { beforeEach, describe, expect, it, vi } from 'vitest';
import { generateEmailDraft } from '../emailDraftController.js';
import * as assistantService from '../../services/assistantService.js';
import { prisma } from '../../config/prisma.js';
import {
  createControllerReply,
  createControllerRequest,
} from './helpers/typedFastifyMocks.js';

vi.mock('../../services/assistantService.js', () => ({
  runAssistantTask: vi.fn(),
}));

vi.mock('../../services/gmailService.js', () => ({
  getFullEmail: vi.fn().mockResolvedValue({
    id: 'email-1',
    from: 'Jane <jane@example.com>',
    subject: 'Quick question',
    snippet: 'Can we connect tomorrow?',
    receivedAt: new Date().toISOString(),
    importance: 'normal',
    body: 'Can we connect tomorrow?',
  }),
}));

vi.mock('../../config/prisma.js', () => ({
  prisma: {
    user: { findUnique: vi.fn() },
    writingVoiceProfile: {
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
  },
}));

type EmailDraftRequestBody = {
  emailId: string;
  voicePreferences?: { formality: number; length: number; tone: number };
  additionalContext?: string;
};

describe('emailDraftController', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('uses assistantService to generate drafts', async () => {
    const request = createControllerRequest<{
      Body: EmailDraftRequestBody;
      User: { id: string };
    }>({
      user: { id: 'user-1' },
      body: {
        emailId: 'email-1',
        voicePreferences: { formality: 5, length: 5, tone: 5 },
        additionalContext: 'Keep it short',
      },
    });
    const reply = createControllerReply();

    vi.mocked(prisma.user.findUnique).mockResolvedValue({
      id: 'user-1',
      googleAccessToken: 'token',
    } as any);
    vi.mocked(prisma.writingVoiceProfile.findUnique).mockResolvedValue(null);
    vi.mocked(prisma.writingVoiceProfile.create).mockResolvedValue({
      userId: 'user-1',
      formality: 5,
      length: 5,
      tone: 5,
      voiceSamples: 'Sample',
      aiDraftsGenerated: 0,
    } as any);
    vi.mocked(prisma.writingVoiceProfile.update).mockResolvedValue({} as any);

    vi.mocked(assistantService.runAssistantTask).mockResolvedValue({
      draftText: 'Draft from assistant',
    } as any);

    await generateEmailDraft(request, reply);

    expect(assistantService.runAssistantTask).toHaveBeenCalled();
    expect(reply.send).toHaveBeenCalledWith(
      expect.objectContaining({
        draftText: 'Draft from assistant',
      })
    );
  });

  it('blocks draft generation when quota is exceeded', async () => {
    const request = createControllerRequest<{
      Body: EmailDraftRequestBody;
      User: { id: string };
    }>({
      user: { id: 'user-1' },
      body: { emailId: 'email-1' },
    });
    const reply = createControllerReply();

    process.env.AI_DRAFT_QUOTA_MAX = '1';

    vi.mocked(prisma.user.findUnique).mockResolvedValue({
      id: 'user-1',
      googleAccessToken: 'token',
    } as any);
    vi.mocked(prisma.writingVoiceProfile.findUnique).mockResolvedValue({
      userId: 'user-1',
      formality: 5,
      length: 5,
      tone: 5,
      voiceSamples: null,
      aiDraftsGenerated: 1,
    } as any);

    await generateEmailDraft(request, reply);

    expect(assistantService.runAssistantTask).not.toHaveBeenCalled();
    expect(reply.statusCode).toBe(429);
    expect(reply.send).toHaveBeenCalledWith(
      expect.objectContaining({
        error: expect.stringMatching(/quota/i),
      })
    );

    delete process.env.AI_DRAFT_QUOTA_MAX;
  });

  it('does not log raw email or draft content', async () => {
    const request = createControllerRequest<{
      Body: EmailDraftRequestBody;
      User: { id: string };
    }>({
      user: { id: 'user-1' },
      body: { emailId: 'email-1' },
    });
    const reply = createControllerReply();
    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    vi.mocked(prisma.user.findUnique).mockResolvedValue({
      id: 'user-1',
      googleAccessToken: 'token',
    } as any);
    vi.mocked(prisma.writingVoiceProfile.findUnique).mockResolvedValue({
      userId: 'user-1',
      formality: 5,
      length: 5,
      tone: 5,
      voiceSamples: null,
      aiDraftsGenerated: 0,
    } as any);

    vi.mocked(assistantService.runAssistantTask).mockResolvedValue({
      draftText: 'DRAFT_SECRET_CONTENT',
    } as any);

    await generateEmailDraft(request, reply);

    const logOutput = JSON.stringify(logSpy.mock.calls);
    const errorOutput = JSON.stringify(errorSpy.mock.calls);

    expect(logOutput).not.toContain('DRAFT_SECRET_CONTENT');
    expect(errorOutput).not.toContain('DRAFT_SECRET_CONTENT');
    expect(logOutput).not.toContain('Can we connect tomorrow?');
    expect(errorOutput).not.toContain('Can we connect tomorrow?');

    logSpy.mockRestore();
    errorSpy.mockRestore();
  });
});
