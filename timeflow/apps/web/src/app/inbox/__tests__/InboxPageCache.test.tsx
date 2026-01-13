/**
 * @vitest-environment jsdom
 */
import React from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import InboxPage from '../page';
import * as api from '@/lib/api';
import { cacheEmails, clearEmailCache } from '@/lib/emailCache';

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

describe('InboxPage cache behavior', () => {
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

  afterEach(() => {
    clearEmailCache();
  });

  it('renders cached emails immediately and refreshes in background', async () => {
    ensureLocalStorage();
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

    cacheEmails({
      messages: [
        {
          id: 'cached-1',
          threadId: 'thread-cached',
          from: 'Cached <cached@example.com>',
          subject: 'Cached email',
          snippet: 'Cached',
          receivedAt: new Date().toISOString(),
          importance: 'normal',
          isRead: false,
        },
      ],
      nextPageToken: null,
    });

    let resolveInbox: (value: any) => void;
    const inboxPromise = new Promise((resolve) => {
      resolveInbox = resolve as (value: any) => void;
    });
    vi.mocked(api.getInboxEmails).mockReturnValue(inboxPromise as any);

    render(<InboxPage />);

    expect(await screen.findByText('Cached email')).not.toBeNull();
    expect(api.getInboxEmails).toHaveBeenCalledWith(
      expect.objectContaining({ cacheMode: 'prefer' })
    );

    resolveInbox!({
      messages: [
        {
          id: 'fresh-1',
          threadId: 'thread-fresh',
          from: 'Fresh <fresh@example.com>',
          subject: 'Fresh email',
          snippet: 'Fresh',
          receivedAt: new Date().toISOString(),
          importance: 'normal',
          isRead: true,
        },
      ],
      nextPageToken: null,
      isStale: false,
    });

    expect(await screen.findByText('Fresh email')).not.toBeNull();
  });
});
