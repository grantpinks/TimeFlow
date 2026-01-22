/**
 * @vitest-environment jsdom
 */
import React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, waitFor } from '@testing-library/react';
import { InboxPrefetch } from '../InboxPrefetch';
import * as api from '@/lib/api';
import * as emailCache from '@/lib/emailCache';

vi.mock('@/lib/api', () => ({
  getInboxEmails: vi.fn().mockResolvedValue({ messages: [] }),
}));

vi.mock('@/lib/emailCache', () => ({
  getCacheAge: vi.fn(),
}));

function mockStorage() {
  const store = new Map<string, string>();
  const storage = {
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
    value: storage,
    configurable: true,
  });
  Object.defineProperty(window, 'sessionStorage', {
    value: storage,
    configurable: true,
  });
}

describe('InboxPrefetch', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockStorage();
    window.localStorage.setItem('timeflow_token', 'token');
  });

  afterEach(() => {
    cleanup();
  });

  it('prefetches when authenticated and cache is stale or empty', async () => {
    vi.mocked(emailCache.getCacheAge).mockReturnValue(null);

    render(<InboxPrefetch />);

    await waitFor(() => {
      expect(api.getInboxEmails).toHaveBeenCalledWith(
        expect.objectContaining({ cacheMode: 'prefer' })
      );
    });
  });

  it('skips prefetch when cache is fresh', async () => {
    vi.mocked(emailCache.getCacheAge).mockReturnValue(10 * 1000);

    render(<InboxPrefetch />);

    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(api.getInboxEmails).not.toHaveBeenCalled();
  });

  it('skips prefetch when recently prefetched in session', async () => {
    window.sessionStorage.setItem('timeflow_inbox_prefetch_at', String(Date.now()));
    vi.mocked(emailCache.getCacheAge).mockReturnValue(null);

    render(<InboxPrefetch />);

    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(api.getInboxEmails).not.toHaveBeenCalled();
  });
});
