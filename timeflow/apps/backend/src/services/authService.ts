/**
 * Auth Service
 *
 * Handles Google OAuth2 flow and user creation/lookup.
 */

import { google } from 'googleapis';
import { ConnectedAccountProvider } from '@prisma/client';
import { prisma } from '../config/prisma.js';
import { getOAuth2Client, GOOGLE_SCOPES } from '../config/google.js';
import { encrypt } from '../utils/crypto.js';

/**
 * Generate the Google OAuth2 authorization URL.
 * @param state - Optional state parameter to preserve context (e.g., return URL)
 */
export function getGoogleAuthUrl(state?: string): string {
  const oauth2Client = getOAuth2Client();

  return oauth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: GOOGLE_SCOPES,
    prompt: 'consent', // Force consent to always get refresh token
    ...(state ? { state } : {}),
  });
}

/**
 * Exchange authorization code for tokens and create/update user.
 * Returns the user record.
 */
export async function handleGoogleCallback(code: string) {
  const oauth2Client = getOAuth2Client();

  // Exchange code for tokens
  const { tokens } = await oauth2Client.getToken(code);
  oauth2Client.setCredentials(tokens);

  // Get user info from Google
  const oauth2 = google.oauth2({ version: 'v2', auth: oauth2Client });
  const { data: userInfo } = await oauth2.userinfo.get();

  if (!userInfo.email || !userInfo.id) {
    throw new Error('Failed to retrieve user info from Google');
  }

  const encryptedRefreshToken = encrypt(tokens.refresh_token) ?? undefined;
  const accessTokenExpiry = tokens.expiry_date
    ? new Date(tokens.expiry_date)
    : undefined;

  // Create or update user in database
  const user = await prisma.user.upsert({
    where: { googleId: userInfo.id },
    update: {
      email: userInfo.email,
      googleAccessToken: tokens.access_token,
      googleRefreshToken: encryptedRefreshToken,
      googleAccessTokenExpiry: accessTokenExpiry,
    },
    create: {
      email: userInfo.email,
      googleId: userInfo.id,
      googleAccessToken: tokens.access_token,
      googleRefreshToken: encryptedRefreshToken,
      googleAccessTokenExpiry: accessTokenExpiry,
    },
  });

  // Keep new account hub populated in parallel with legacy fields.
  await prisma.connectedAccount.upsert({
    where: {
      userId_provider_providerAccountId: {
        userId: user.id,
        provider: ConnectedAccountProvider.google,
        providerAccountId: userInfo.id,
      },
    },
    update: {
      email: userInfo.email,
      isPrimary: true,
      googleAccessToken: tokens.access_token,
      googleRefreshToken: encryptedRefreshToken,
      googleAccessTokenExpiry: accessTokenExpiry,
    },
    create: {
      userId: user.id,
      provider: ConnectedAccountProvider.google,
      providerAccountId: userInfo.id,
      email: userInfo.email,
      isPrimary: true,
      googleAccessToken: tokens.access_token,
      googleRefreshToken: encryptedRefreshToken,
      googleAccessTokenExpiry: accessTokenExpiry,
    },
  });

  return user;
}


