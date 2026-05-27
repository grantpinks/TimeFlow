import { ConnectedAccount, ConnectedAccountProvider, User } from '@prisma/client';
import { prisma } from '../config/prisma.js';

export interface GoogleTokenContext {
  connectedAccountId: string | null;
  accessToken: string;
  refreshTokenEncrypted: string | null;
  accessTokenExpiry: Date | null;
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
    return {
      connectedAccountId: account.id,
      accessToken: account.googleAccessToken,
      refreshTokenEncrypted: account.googleRefreshToken ?? null,
      accessTokenExpiry: account.googleAccessTokenExpiry ?? null,
    };
  }

  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user?.googleAccessToken) {
    throw new Error('User not authenticated with Google');
  }

  return {
    connectedAccountId: null,
    accessToken: user.googleAccessToken,
    refreshTokenEncrypted: user.googleRefreshToken ?? null,
    accessTokenExpiry: user.googleAccessTokenExpiry ?? null,
  };
}
