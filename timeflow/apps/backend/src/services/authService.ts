/**
 * Auth Service
 *
 * Handles Google OAuth2 flow and user creation/lookup.
 */

import { google } from 'googleapis';
import { ConnectedAccountProvider } from '@prisma/client';
import { prisma } from '../config/prisma.js';
import {
  getOAuth2Client,
  GOOGLE_GMAIL_SCOPES,
  GOOGLE_SCOPES,
  GOOGLE_SIGNIN_SCOPES,
} from '../config/google.js';
import { encrypt, decryptWithLegacyFallback } from '../utils/crypto.js';
import { encodeOAuthState, type OAuthStatePayload } from '../utils/oauthState.js';
import { resolveGrantedScopeString } from './googleScopeService.js';

export type GoogleAuthUrlOptions = {
  state?: string;
  prompt?: 'consent' | 'select_account' | 'none';
  includeGrantedScopes?: boolean;
};

/**
 * Generate the Google OAuth2 authorization URL.
 */
export function getGoogleAuthUrl(
  scopes: string[] = GOOGLE_SIGNIN_SCOPES,
  options: GoogleAuthUrlOptions = {}
): string {
  const oauth2Client = getOAuth2Client();
  const { state, prompt = 'consent', includeGrantedScopes } = options;

  return oauth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: scopes,
    prompt,
    ...(includeGrantedScopes ? { include_granted_scopes: true } : {}),
    ...(state ? { state } : {}),
  });
}

async function upsertGoogleTokensForUser(
  userId: string,
  userInfo: { email: string; id: string },
  tokens: {
    access_token?: string | null;
    refresh_token?: string | null;
    expiry_date?: number | null;
    scope?: string | null;
  },
  existingRefreshToken?: string | null,
  existingGrantedScopes?: string | null
) {
  const encryptedRefreshToken = encrypt(tokens.refresh_token) ?? undefined;
  const accessTokenExpiry = tokens.expiry_date ? new Date(tokens.expiry_date) : undefined;
  const googleGrantedScopes = await resolveGrantedScopeString(
    tokens.access_token,
    tokens.scope,
    existingGrantedScopes
  );

  const user = await prisma.user.update({
    where: { id: userId },
    data: {
      email: userInfo.email,
      googleId: userInfo.id,
      googleAccessToken: encrypt(tokens.access_token ?? undefined) ?? undefined,
      googleRefreshToken: encryptedRefreshToken ?? existingRefreshToken ?? undefined,
      googleAccessTokenExpiry: accessTokenExpiry,
      googleGrantedScopes,
    },
  });

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
      googleAccessToken: encrypt(tokens.access_token ?? undefined) ?? undefined,
      googleRefreshToken: encryptedRefreshToken ?? existingRefreshToken ?? undefined,
      googleAccessTokenExpiry: accessTokenExpiry,
    },
    create: {
      userId: user.id,
      provider: ConnectedAccountProvider.google,
      providerAccountId: userInfo.id,
      email: userInfo.email,
      isPrimary: true,
      googleAccessToken: encrypt(tokens.access_token ?? undefined) ?? undefined,
      googleRefreshToken: encryptedRefreshToken ?? existingRefreshToken ?? undefined,
      googleAccessTokenExpiry: accessTokenExpiry,
    },
  });

  return user;
}

/**
 * Exchange authorization code for tokens and create/update user.
 * Returns the user record.
 */
export async function handleGoogleCallback(code: string, statePayload?: OAuthStatePayload) {
  const oauth2Client = getOAuth2Client();

  const { tokens } = await oauth2Client.getToken(code);
  oauth2Client.setCredentials(tokens);

  const oauth2 = google.oauth2({ version: 'v2', auth: oauth2Client });
  const { data: userInfo } = await oauth2.userinfo.get();

  if (!userInfo.email || !userInfo.id) {
    throw new Error('Failed to retrieve user info from Google');
  }

  const encryptedRefreshToken = encrypt(tokens.refresh_token) ?? undefined;
  const accessTokenExpiry = tokens.expiry_date ? new Date(tokens.expiry_date) : undefined;

  const { linkUserId } = statePayload ?? {};

  if (linkUserId) {
    const existing = await prisma.user.findUnique({ where: { id: linkUserId } });
    if (!existing) {
      throw new Error('User not found');
    }
    if (existing.googleId && existing.googleId !== userInfo.id) {
      throw new Error('Google account does not match your TimeFlow account');
    }
    if (!existing.googleId && existing.email.toLowerCase() !== userInfo.email.toLowerCase()) {
      throw new Error('Google account does not match your TimeFlow account');
    }

    return upsertGoogleTokensForUser(
      linkUserId,
      { email: userInfo.email, id: userInfo.id },
      tokens,
      existing.googleRefreshToken,
      existing.googleGrantedScopes
    );
  }

  const existing = await prisma.user.findUnique({
    where: { googleId: userInfo.id },
    select: { googleGrantedScopes: true },
  });
  const googleGrantedScopes = await resolveGrantedScopeString(
    tokens.access_token,
    tokens.scope,
    existing?.googleGrantedScopes
  );

  const user = await prisma.user.upsert({
    where: { googleId: userInfo.id },
    update: {
      email: userInfo.email,
      googleAccessToken: encrypt(tokens.access_token) ?? undefined,
      googleRefreshToken: encryptedRefreshToken ?? undefined,
      googleAccessTokenExpiry: accessTokenExpiry,
      googleGrantedScopes,
    },
    create: {
      email: userInfo.email,
      googleId: userInfo.id,
      googleAccessToken: encrypt(tokens.access_token) ?? undefined,
      googleRefreshToken: encryptedRefreshToken,
      googleAccessTokenExpiry: accessTokenExpiry,
      googleGrantedScopes,
    },
  });

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
      googleAccessToken: encrypt(tokens.access_token) ?? undefined,
      googleRefreshToken: encryptedRefreshToken ?? undefined,
      googleAccessTokenExpiry: accessTokenExpiry,
    },
    create: {
      userId: user.id,
      provider: ConnectedAccountProvider.google,
      providerAccountId: userInfo.id,
      email: userInfo.email,
      isPrimary: true,
      googleAccessToken: encrypt(tokens.access_token) ?? undefined,
      googleRefreshToken: encryptedRefreshToken,
      googleAccessTokenExpiry: accessTokenExpiry,
    },
  });

  return user;
}

/** Sign-in OAuth URL (calendar + profile only). Preserves previously granted Gmail scopes. */
export function getGoogleSignInAuthUrl(returnTo?: string): string {
  const state = encodeOAuthState({ returnTo: returnTo ?? '/tasks' });
  return getGoogleAuthUrl(GOOGLE_SIGNIN_SCOPES, {
    state,
    includeGrantedScopes: true,
  });
}

/** Incremental Gmail permission OAuth URL for a logged-in user. */
export function getGoogleGmailAuthUrl(userId: string, returnTo?: string): string {
  const state = encodeOAuthState({
    returnTo: returnTo ?? '/settings',
    linkUserId: userId,
    flow: 'gmail',
  });
  return getGoogleAuthUrl(GOOGLE_GMAIL_SCOPES, {
    state,
    includeGrantedScopes: true,
    prompt: 'consent',
  });
}

/** Full reconnect OAuth URL (all scopes) for a logged-in user. */
export function getGoogleReconnectAuthUrl(userId: string, returnTo?: string): string {
  const state = encodeOAuthState({
    returnTo: returnTo ?? '/settings',
    linkUserId: userId,
    flow: 'reconnect',
  });
  return getGoogleAuthUrl(GOOGLE_SCOPES, {
    state,
    includeGrantedScopes: true,
    prompt: 'consent',
  });
}

export { GOOGLE_SIGNIN_SCOPES, GOOGLE_GMAIL_SCOPES, GOOGLE_SCOPES };

/**
 * Best-effort revoke of a Google OAuth refresh token on logout.
 */
export async function revokeGoogleRefreshToken(storedToken: string | null | undefined): Promise<void> {
  if (!storedToken) return;
  const refreshToken = decryptWithLegacyFallback(storedToken);
  if (!refreshToken) return;
  const oauth2Client = getOAuth2Client();
  await oauth2Client.revokeToken(refreshToken);
}
