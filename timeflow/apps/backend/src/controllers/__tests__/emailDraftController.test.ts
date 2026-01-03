import { describe, expect, it, vi } from 'vitest';
import { generateEmailDraft } from '../emailDraftController.js';
import * as assistantService from '../../services/assistantService.js';
import { prisma } from '../../config/prisma.js';

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

function createReply() {
  const reply: any = {
    statusCode: 200,
    status(code: number) {
      this.statusCode = code;
      return this;
    },
    send: vi.fn(),
  };
  return reply;
}

describe('emailDraftController', () => {
  it('uses assistantService to generate drafts', async () => {
    const request: any = {
      user: { id: 'user-1' },
      body: {
        emailId: 'email-1',
        voicePreferences: { formality: 5, length: 5, tone: 5 },
        additionalContext: 'Keep it short',
      },
    };
    const reply = createReply();

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
});
