/**
 * Auth Service
 *
 * Handles Google OAuth2 flow and user creation/lookup.
 */

import { google } from 'googleapis';
import { prisma } from '../config/prisma.js';
import { getOAuth2Client, GOOGLE_SCOPES } from '../config/google.js';
import { encrypt } from '../utils/crypto.js';

/**
 * Generate the Google OAuth2 authorization URL.
 */
export function getGoogleAuthUrl(): string {
  const oauth2Client = getOAuth2Client();

  return oauth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: GOOGLE_SCOPES,
    prompt: 'consent', // Force consent to always get refresh token
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

  // Create or update user in database
  const user = await prisma.user.upsert({
    where: { googleId: userInfo.id },
    update: {
      email: userInfo.email,
      googleAccessToken: tokens.access_token,
      googleRefreshToken: encrypt(tokens.refresh_token) ?? undefined,
      googleAccessTokenExpiry: tokens.expiry_date
        ? new Date(tokens.expiry_date)
        : undefined,
    },
    create: {
      email: userInfo.email,
      googleId: userInfo.id,
      googleAccessToken: tokens.access_token,
      googleRefreshToken: encrypt(tokens.refresh_token) ?? undefined,
      googleAccessTokenExpiry: tokens.expiry_date
        ? new Date(tokens.expiry_date)
        : undefined,
    },
  });

  return user;
}


