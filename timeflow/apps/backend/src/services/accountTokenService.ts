import { ConnectedAccount, ConnectedAccountProvider, User } from '@prisma/client';
import { prisma } from '../config/prisma.js';
import { getUserOAuth2Client } from '../config/google.js';
import { decryptWithLegacyFallback, decryptStoredToken, encrypt } from '../utils/crypto.js';
import type { OAuth2Client } from 'google-auth-library';

export interface GoogleTokenContext {
  connectedAccountId: string | null;
  accessToken: string;
  refreshTokenEncrypted: string | null;
  accessTokenExpiry: Date | null;
}

export interface GoogleTokenUpdate {
  accessToken?: string | null;
  refreshTokenPlain?: string | null;
  accessTokenExpiry?: Date | null;
}

async function backfillGoogleAccountFromUser(user: User): Promise<ConnectedAccount | null> {
  if (!user.googleId || !user.googleAccessToken) {
    return null;
  }

  return prisma.connectedAccount.upsert({
    where: {
      userId_provider_providerAccountId: {
        userId: user.id,
        provider: ConnectedAccountProvider.google,
        providerAccountId: user.googleId,
      },
    },
    update: {
      email: user.email,
      isPrimary: true,
      googleAccessToken: user.googleAccessToken,
      googleRefreshToken: user.googleRefreshToken,
      googleAccessTokenExpiry: user.googleAccessTokenExpiry,
    },
    create: {
      userId: user.id,
      provider: ConnectedAccountProvider.google,
      providerAccountId: user.googleId,
      email: user.email,
      isPrimary: true,
      googleAccessToken: user.googleAccessToken,
      googleRefreshToken: user.googleRefreshToken,
      googleAccessTokenExpiry: user.googleAccessTokenExpiry,
    },
  });
}

export async function getPrimaryGoogleAccount(userId: string): Promise<ConnectedAccount | null> {
  const account = await prisma.connectedAccount.findFirst({
    where: {
      userId,
      provider: ConnectedAccountProvider.google,
      isPrimary: true,
    },
    orderBy: { createdAt: 'asc' },
  });

  if (account) {
    return account;
  }

  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) {
    return null;
  }

  return backfillGoogleAccountFromUser(user);
}

export async function getGoogleTokenContext(userId: string): Promise<GoogleTokenContext> {
  const account = await getPrimaryGoogleAccount(userId);
  if (account?.googleAccessToken) {
    const accessToken = decryptStoredToken(account.googleAccessToken);
    if (!accessToken) {
      throw new Error('User not authenticated with Google');
    }
    return {
      connectedAccountId: account.id,
      accessToken,
      refreshTokenEncrypted: account.googleRefreshToken ?? null,
      accessTokenExpiry: account.googleAccessTokenExpiry ?? null,
    };
  }

  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user?.googleAccessToken) {
    throw new Error('User not authenticated with Google');
  }

  const accessToken = decryptStoredToken(user.googleAccessToken);
  if (!accessToken) {
    throw new Error('User not authenticated with Google');
  }

  return {
    connectedAccountId: null,
    accessToken,
    refreshTokenEncrypted: user.googleRefreshToken ?? null,
    accessTokenExpiry: user.googleAccessTokenExpiry ?? null,
  };
}

/** Persist rotated Google OAuth tokens (encrypts access + refresh at rest). */
export async function persistGoogleOAuthTokens(
  userId: string,
  connectedAccountId: string | null,
  update: GoogleTokenUpdate,
  fallback?: GoogleTokenUpdate
): Promise<void> {
  const data: {
    googleAccessToken?: string | null;
    googleRefreshToken?: string | null;
    googleAccessTokenExpiry?: Date | null;
  } = {};

  if (update.accessToken !== undefined) {
    data.googleAccessToken = encrypt(update.accessToken) ?? null;
  } else if (fallback?.accessToken !== undefined) {
    data.googleAccessToken = encrypt(fallback.accessToken) ?? null;
  }

  if (update.refreshTokenPlain !== undefined) {
    data.googleRefreshToken = encrypt(update.refreshTokenPlain) ?? null;
  }

  if (update.accessTokenExpiry !== undefined) {
    data.googleAccessTokenExpiry = update.accessTokenExpiry;
  } else if (fallback?.accessTokenExpiry !== undefined) {
    data.googleAccessTokenExpiry = fallback.accessTokenExpiry;
  }

  if (Object.keys(data).length === 0) {
    return;
  }

  const writes: Array<Promise<unknown>> = [
    prisma.user.update({
      where: { id: userId },
      data,
    }),
  ];

  if (connectedAccountId) {
    writes.push(
      prisma.connectedAccount.update({
        where: { id: connectedAccountId },
        data,
      })
    );
  }

  await Promise.all(writes);
}

/** OAuth2 client with automatic encrypted token persistence on refresh. */
export async function getGoogleOAuth2ClientForUser(userId: string): Promise<OAuth2Client> {
  const tokenContext = await getGoogleTokenContext(userId);

  const oauth2Client = getUserOAuth2Client(
    tokenContext.accessToken,
    decryptWithLegacyFallback(tokenContext.refreshTokenEncrypted),
    tokenContext.accessTokenExpiry?.getTime()
  );

  oauth2Client.on('tokens', async (tokens) => {
    try {
      await persistGoogleOAuthTokens(
        userId,
        tokenContext.connectedAccountId,
        {
          accessToken: tokens.access_token ?? tokenContext.accessToken,
          refreshTokenPlain: tokens.refresh_token ?? undefined,
          accessTokenExpiry: tokens.expiry_date
            ? new Date(tokens.expiry_date)
            : tokenContext.accessTokenExpiry,
        }
      );
    } catch (err) {
      console.error('[accountTokenService] Failed to persist refreshed Google tokens', {
        userId,
        err,
      });
    }
  });

  return oauth2Client;
}
