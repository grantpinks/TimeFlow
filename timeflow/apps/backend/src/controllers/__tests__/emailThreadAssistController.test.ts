import { describe, expect, it, vi } from 'vitest';
import { summarizeEmailThread, extractTasksFromThread } from '../emailThreadAssistController.js';
import * as assistantService from '../../services/assistantService.js';
import {
  createControllerReply,
  createControllerRequest,
} from './helpers/typedFastifyMocks.js';

vi.mock('../../services/assistantService.js', () => ({
  runThreadAssistTask: vi.fn(),
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
      expect.objectContaining({ summary: 'Summary here' })
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
      expect.objectContaining({ tasks: [{ title: 'Reply', details: 'Confirm timing' }] })
    );
  });
});
