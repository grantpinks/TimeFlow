/**
 * @vitest-environment jsdom
 */
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ThreadAssistPanel } from '../ThreadAssistPanel';
import type { EmailMessage, FullEmailMessage } from '@timeflow/shared';

vi.mock('@/lib/api', () => ({
  ApiRequestError: class extends Error {
    code?: string;
    constructor(message: string, init?: { code?: string }) {
      super(message);
      this.code = init?.code;
    }
  },
  postThreadSummary: vi.fn(),
  postThreadTasks: vi.fn(),
  createTask: vi.fn(),
}));

vi.mock('@/lib/analytics', () => ({
  track: vi.fn(),
}));

import * as api from '@/lib/api';

const listEmail: EmailMessage = {
  id: 'e1',
  threadId: 't1',
  from: 'a@b.com',
  subject: 'Hello',
  receivedAt: new Date().toISOString(),
  importance: 'normal',
};

const threadMessages: FullEmailMessage[] = [
  {
    ...listEmail,
    body: 'Please follow up tomorrow.',
  },
];

describe('ThreadAssistPanel', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders summarize and extract buttons', () => {
    render(
      <ThreadAssistPanel
        threadId="t1"
        threadMessages={threadMessages}
        listEmail={listEmail}
        identities={[]}
      />
    );
    expect(screen.getAllByRole('button', { name: /Summarize/i }).length).toBeGreaterThan(0);
    expect(screen.getAllByRole('button', { name: /Extract tasks/i }).length).toBeGreaterThan(0);
  });

  it('calls postThreadSummary when Summarize is clicked', async () => {
    vi.mocked(api.postThreadSummary).mockResolvedValue({
      threadId: 't1',
      summary: 'Short summary.',
    });

    render(
      <ThreadAssistPanel
        threadId="t1"
        threadMessages={threadMessages}
        listEmail={listEmail}
        identities={[]}
      />
    );

    fireEvent.click(screen.getAllByRole('button', { name: /Summarize/i })[0]);

    expect(api.postThreadSummary).toHaveBeenCalled();
    const summaries = await screen.findAllByText('Short summary.');
    expect(summaries.length).toBeGreaterThan(0);
  });
});
