import { describe, expect, it, vi } from 'vitest';
import { draftTaskFromEmail } from '../inboxAiController.js';

vi.mock('../../services/inboxAiService.js', () => ({
  draftTaskFromEmail: vi.fn().mockResolvedValue({
    draft: { title: 'Follow up', description: 'Reply to the email' },
    confirmCta: 'Want me to create this task?',
  }),
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

describe('inboxAiController', () => {
  it('returns a task draft with confirmation CTA', async () => {
    const request: any = {
      user: { id: 'user-1' },
      body: { emailId: 'email-1' },
    };
    const reply = createReply();

    await draftTaskFromEmail(request, reply);

    expect(reply.send).toHaveBeenCalledWith(
      expect.objectContaining({
        draft: expect.any(Object),
        confirmCta: expect.any(String),
      })
    );
  });
});
