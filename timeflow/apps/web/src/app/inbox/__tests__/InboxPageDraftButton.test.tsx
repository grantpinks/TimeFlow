/**
 * @vitest-environment jsdom
 */
import React from 'react';
import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import InboxPage from '../page';

vi.mock('@/components/Layout', () => ({
  Layout: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

vi.mock('next/image', () => ({
  __esModule: true,
  default: (props: React.ImgHTMLAttributes<HTMLImageElement>) => <img {...props} />,
}));

vi.mock('framer-motion', () => ({
  motion: new Proxy(
    {},
    {
      get: () => (props: any) => <div {...props} />,
    }
  ),
  AnimatePresence: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

vi.mock('@/hooks/useUser', () => ({
  useUser: () => ({ isAuthenticated: true, user: { email: 'me@example.com' } }),
}));

vi.mock('@/lib/api', () => ({
  getInboxEmails: vi.fn().mockResolvedValue({
    messages: [
      {
        id: 'email-1',
        threadId: 'thread-1',
        from: 'Sender <sender@example.com>',
        subject: 'Hello',
        receivedAt: new Date().toISOString(),
        importance: 'normal',
        snippet: 'Test',
      },
    ],
  }),
  getEmailCategories: vi.fn().mockResolvedValue({ categories: [] }),
  getEmailAccounts: vi.fn().mockResolvedValue([]),
  getInboxViews: vi.fn().mockResolvedValue({ views: [] }),
  updateInboxViews: vi.fn().mockResolvedValue({ views: [] }),
  deleteInboxView: vi.fn().mockResolvedValue({}),
  searchEmails: vi.fn().mockResolvedValue({ messages: [] }),
  getThread: vi.fn().mockResolvedValue({
    messages: [
      {
        id: 'email-1',
        threadId: 'thread-1',
        from: 'Sender <sender@example.com>',
        subject: 'Hello',
        receivedAt: new Date().toISOString(),
        importance: 'normal',
        body: 'Test',
      },
    ],
  }),
  getFullEmail: vi.fn().mockResolvedValue({
    id: 'email-1',
    threadId: 'thread-1',
    from: 'Sender <sender@example.com>',
    subject: 'Hello',
    receivedAt: new Date().toISOString(),
    importance: 'normal',
    body: 'Test',
  }),
}));

vi.mock('@/lib/inboxViewsStorage', () => ({
  loadInboxViews: () => [],
  saveInboxViews: () => {},
}));

vi.mock('@/components/inbox/DraftPanel', () => ({
  DraftPanel: () => null,
}));

vi.mock('@/components/inbox/InboxAiDraftPanel', () => ({
  InboxAiDraftPanel: () => null,
}));

describe('InboxPage AI draft button', () => {
  it('renders the AI draft button in the thread header', async () => {
    render(<InboxPage />);
    expect(await screen.findByRole('button', { name: 'Draft Reply with AI' })).not.toBeNull();
  });
});
