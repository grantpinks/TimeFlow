import { beforeEach, describe, expect, it, vi } from 'vitest';
import { prisma } from '../../config/prisma.js';
import { getGoogleTokenContext } from '../accountTokenService.js';

vi.mock('../../config/prisma.js', () => ({
  prisma: {
    connectedAccount: {
      findFirst: vi.fn(),
      upsert: vi.fn(),
    },
    user: {
      findUnique: vi.fn(),
    },
  },
}));

describe('accountTokenService.getGoogleTokenContext', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('uses connected account tokens when available', async () => {
    (prisma.connectedAccount.findFirst as any).mockResolvedValue({
      id: 'acct-1',
      googleAccessToken: 'acct-token',
      googleRefreshToken: 'acct-refresh',
      googleAccessTokenExpiry: new Date('2026-01-01T00:00:00.000Z'),
    });

    const result = await getGoogleTokenContext('user-1');

    expect(result).toEqual({
      connectedAccountId: 'acct-1',
      accessToken: 'acct-token',
      refreshTokenEncrypted: 'acct-refresh',
      accessTokenExpiry: new Date('2026-01-01T00:00:00.000Z'),
    });
    expect(prisma.user.findUnique).not.toHaveBeenCalled();
  });

  it('falls back to user token fields when no connected account exists', async () => {
    (prisma.connectedAccount.findFirst as any).mockResolvedValue(null);
    (prisma.user.findUnique as any).mockResolvedValue({
      id: 'user-1',
      googleId: 'google-1',
      email: 'user@example.com',
      googleAccessToken: 'user-token',
      googleRefreshToken: 'user-refresh',
      googleAccessTokenExpiry: new Date('2026-01-02T00:00:00.000Z'),
    });
    (prisma.connectedAccount.upsert as any).mockResolvedValue({
      id: 'acct-backfilled',
      googleAccessToken: 'user-token',
      googleRefreshToken: 'user-refresh',
      googleAccessTokenExpiry: new Date('2026-01-02T00:00:00.000Z'),
    });

    const result = await getGoogleTokenContext('user-1');

    expect(result).toEqual({
      connectedAccountId: 'acct-backfilled',
      accessToken: 'user-token',
      refreshTokenEncrypted: 'user-refresh',
      accessTokenExpiry: new Date('2026-01-02T00:00:00.000Z'),
    });
  });
});
