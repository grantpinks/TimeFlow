import { describe, expect, it, vi } from 'vitest';
import { draftTaskFromEmail } from '../inboxAiController.js';
import {
  createControllerReply,
  createControllerRequest,
} from './helpers/typedFastifyMocks.js';

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

type InboxAiRequestBody = {
  emailId: string;
};

describe('inboxAiController', () => {
  it('returns a task draft with confirmation CTA', async () => {
    const request = createControllerRequest<{
      Body: InboxAiRequestBody;
      User: { id: string };
    }>({
      user: { id: 'user-1' },
      body: { emailId: 'email-1' },
    });
    const reply = createControllerReply();

    await draftTaskFromEmail(request, reply);

    expect(reply.send).toHaveBeenCalledWith(
      expect.objectContaining({
        draft: expect.any(Object),
        confirmCta: expect.any(String),
      })
    );
  });
});
