/**
 * @vitest-environment jsdom
 */
import React from 'react';
import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import InboxPage from '../page';
import * as api from '@/lib/api';

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

vi.mock('@/lib/api', () => ({
  getInboxEmails: vi.fn(),
  getEmailCategories: vi.fn().mockResolvedValue({
    categories: [
      { id: 'personal', name: 'Personal', color: '#0BAF9A' },
      { id: 'work', name: 'Work', color: '#2563EB' },
    ],
  }),
  getEmailAccounts: vi.fn().mockResolvedValue([]),
  getInboxViews: vi.fn().mockResolvedValue({
    views: [
      { id: 'all', name: 'All', labelIds: [], isBuiltin: true },
      { id: 'work', name: 'Work', labelIds: ['work'], isBuiltin: true },
    ],
  }),
  updateInboxViews: vi.fn().mockResolvedValue({ views: [] }),
  deleteInboxView: vi.fn().mockResolvedValue({}),
  searchEmails: vi.fn().mockResolvedValue({ messages: [] }),
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

describe('InboxPage view switching', () => {
  it('clears the reading pane when the selected thread is filtered out', async () => {
    if (!window.matchMedia) {
      window.matchMedia = () =>
        ({
          matches: false,
          media: '',
          onchange: null,
          addListener: vi.fn(),
          removeListener: vi.fn(),
          addEventListener: vi.fn(),
          removeEventListener: vi.fn(),
          dispatchEvent: vi.fn(),
        }) as MediaQueryList;
    }

    vi.mocked(api.getInboxEmails).mockResolvedValue({
      messages: [
        {
          id: 'email-1',
          threadId: 'thread-1',
          from: 'Sender <sender@example.com>',
          subject: 'Hello',
          receivedAt: new Date().toISOString(),
          importance: 'normal',
          snippet: 'Test',
          category: 'personal',
          isRead: false,
        },
      ],
    });

    const user = userEvent.setup();
    render(<InboxPage />);

    await screen.findByText('Hello');
    await user.click(screen.getByRole('button', { name: 'Work' }));

    expect(await screen.findByText(/Select an email to read/i)).not.toBeNull();
  });
});
