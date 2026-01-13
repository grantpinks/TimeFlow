/**
 * @vitest-environment jsdom
 */
import React from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
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

describe('InboxPage aging nudges', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it('does not emit React DOM attribute warnings', () => {
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
      messages: [],
      nextPageToken: null,
    });

    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    render(<InboxPage />);
    const errors = errorSpy.mock.calls.flat().join(' ');
    errorSpy.mockRestore();
    expect(errors).not.toMatch(/non-boolean attribute `initial`/i);
    expect(errors).not.toMatch(/non-boolean attribute `jsx`/i);
    expect(errors).not.toMatch(/non-boolean attribute `global`/i);
  });

  it('shows nudges for aging needs reply and unread important threads', async () => {
    const now = Date.now();
    const needsReplyDate = new Date(now - 5 * 24 * 60 * 60 * 1000).toISOString();
    const unreadImportantDate = new Date(now - 4 * 24 * 60 * 60 * 1000).toISOString();

    vi.mocked(api.getInboxEmails).mockResolvedValue({
      messages: [
        {
          id: 'email-1',
          threadId: 'thread-1',
          from: 'Sender <sender@example.com>',
          subject: 'Hello',
          receivedAt: needsReplyDate,
          importance: 'normal',
          snippet: 'Test',
          actionState: 'needs_reply',
          isRead: true,
        },
        {
          id: 'email-2',
          threadId: 'thread-2',
          from: 'VIP <vip@example.com>',
          subject: 'Urgent',
          receivedAt: unreadImportantDate,
          importance: 'high',
          snippet: 'Important',
          isRead: false,
        },
      ],
    });

    render(<InboxPage />);
    expect(await screen.findByText(/Needs Reply > 3 days/i)).not.toBeNull();
    expect(await screen.findByText(/Unread important > 3 days/i)).not.toBeNull();
  });
});
