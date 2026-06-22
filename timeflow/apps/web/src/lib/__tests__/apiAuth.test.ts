import { beforeEach, describe, expect, it, vi } from 'vitest';
import { checkSession } from '../api';

describe('api auth session handling', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('refreshes an expired access cookie before treating the session as signed out', async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce({ ok: false, status: 401 })
      .mockResolvedValueOnce({ ok: true, status: 200 });
    vi.stubGlobal('fetch', fetchMock);

    await expect(checkSession()).resolves.toBe(true);

    expect(fetchMock).toHaveBeenNthCalledWith(1, '/api/auth/session', {
      credentials: 'include',
    });
    expect(fetchMock).toHaveBeenNthCalledWith(2, '/api/auth/refresh', {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
    });
  });
});
