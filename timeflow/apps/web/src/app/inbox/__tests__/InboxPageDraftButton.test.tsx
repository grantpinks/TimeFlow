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
  const ensureLocalStorage = () => {
    if (!window.localStorage || typeof window.localStorage.setItem !== 'function') {
      const store = new Map<string, string>();
      const localStorageMock = {
        getItem: (key: string) => store.get(key) ?? null,
        setItem: (key: string, value: string) => {
          store.set(key, value);
        },
        removeItem: (key: string) => {
          store.delete(key);
        },
        clear: () => {
          store.clear();
        },
      };
      Object.defineProperty(window, 'localStorage', {
        value: localStorageMock,
        configurable: true,
      });
    }
  };

  it('does not emit React DOM attribute warnings', () => {
    ensureLocalStorage();
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    render(<InboxPage />);
    const errors = errorSpy.mock.calls.flat().join(' ');
    errorSpy.mockRestore();
    expect(errors).not.toMatch(/non-boolean attribute `initial`/i);
    expect(errors).not.toMatch(/non-boolean attribute `jsx`/i);
    expect(errors).not.toMatch(/non-boolean attribute `global`/i);
  });

  it('renders the AI draft button in the thread header', async () => {
    ensureLocalStorage();
    render(<InboxPage />);
    expect(await screen.findByRole('button', { name: 'Draft Reply with AI' })).not.toBeNull();
  });
});
