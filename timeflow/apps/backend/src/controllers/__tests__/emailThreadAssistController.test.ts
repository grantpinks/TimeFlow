import { beforeEach, describe, expect, it, vi } from 'vitest';
import { summarizeEmailThread, extractTasksFromThread } from '../emailThreadAssistController.js';
import * as assistantService from '../../services/assistantService.js';
import * as usageTrackingService from '../../services/usageTrackingService.js';
import {
  createControllerReply,
  createControllerRequest,
} from './helpers/typedFastifyMocks.js';

vi.mock('../../services/assistantService.js', () => ({
  runThreadAssistTask: vi.fn(),
}));

vi.mock('../../services/usageTrackingService.js', () => ({
  hasCreditsAvailable: vi.fn(),
  trackUsage: vi.fn(),
}));

type ThreadAssistRequestBody = {
  threadId: string;
  messages: Array<{
    id: string;
    from: string;
    subject: string;
    receivedAt: string;
    body: string;
  }>;
};

const threadPayload = {
  threadId: 'thread-1',
  messages: [
    {
      id: 'email-1',
      from: 'Sender <sender@example.com>',
      subject: 'Hello',
      receivedAt: new Date().toISOString(),
      body: 'First message',
    },
  ],
};

describe('emailThreadAssistController', () => {
  beforeEach(() => {
    vi.mocked(usageTrackingService.hasCreditsAvailable).mockResolvedValue({
      allowed: true,
      creditsRemaining: 100,
    });
    vi.mocked(usageTrackingService.trackUsage).mockResolvedValue({
      success: true,
      creditsRemaining: 95,
    });
  });

  it('returns 402 when insufficient credits for summary', async () => {
    const request = createControllerRequest<{
      Body: ThreadAssistRequestBody;
      User: { id: string };
    }>({
      user: { id: 'user-1' },
      body: threadPayload,
    });
    const reply = createControllerReply();

    vi.mocked(usageTrackingService.hasCreditsAvailable).mockResolvedValueOnce({
      allowed: false,
      reason: 'Insufficient credits',
      creditsRemaining: 0,
    });

    await summarizeEmailThread(request, reply);

    expect(assistantService.runThreadAssistTask).not.toHaveBeenCalled();
    expect((reply as { statusCode: number }).statusCode).toBe(402);
    expect(reply.send).toHaveBeenCalledWith(
      expect.objectContaining({ code: 'INSUFFICIENT_CREDITS' })
    );
  });

  it('returns thread summary', async () => {
    const request = createControllerRequest<{
      Body: ThreadAssistRequestBody;
      User: { id: string };
    }>({
      user: { id: 'user-1' },
      body: threadPayload,
    });
    const reply = createControllerReply();

    vi.mocked(assistantService.runThreadAssistTask).mockResolvedValue({
      summary: 'Summary here',
    } as any);

    await summarizeEmailThread(request, reply);

    expect(assistantService.runThreadAssistTask).toHaveBeenCalled();
    expect(reply.send).toHaveBeenCalledWith(
      expect.objectContaining({ summary: 'Summary here', creditsRemaining: 95 })
    );
    expect(usageTrackingService.trackUsage).toHaveBeenCalledWith(
      'user-1',
      'EMAIL_THREAD_SUMMARY',
      { threadId: 'thread-1' }
    );
  });

  it('returns extracted tasks', async () => {
    const request = createControllerRequest<{
      Body: ThreadAssistRequestBody;
      User: { id: string };
    }>({
      user: { id: 'user-1' },
      body: threadPayload,
    });
    const reply = createControllerReply();

    vi.mocked(assistantService.runThreadAssistTask).mockResolvedValue({
      tasks: [{ title: 'Reply', details: 'Confirm timing' }],
    } as any);

    await extractTasksFromThread(request, reply);

    expect(assistantService.runThreadAssistTask).toHaveBeenCalled();
    expect(reply.send).toHaveBeenCalledWith(
      expect.objectContaining({
        tasks: [{ title: 'Reply', details: 'Confirm timing' }],
        creditsRemaining: 95,
      })
    );
    expect(usageTrackingService.trackUsage).toHaveBeenCalledWith(
      'user-1',
      'EMAIL_THREAD_TASKS',
      { threadId: 'thread-1' }
    );
  });
});
