/**
 * Google OAuth2 and Calendar API Configuration
 *
 * Creates a reusable OAuth2 client for interacting with Google APIs.
 * Tokens are managed per-user and stored in the database.
 */

import { google, Auth } from 'googleapis';
import { env } from './env.js';

/**
 * Get a configured OAuth2 client for the application.
 * This client is used to generate auth URLs and exchange codes for tokens.
 */
export function getOAuth2Client(): Auth.OAuth2Client {
  return new google.auth.OAuth2(
    env.GOOGLE_CLIENT_ID,
    env.GOOGLE_CLIENT_SECRET,
    env.GOOGLE_REDIRECT_URI
  );
}

/**
 * Get an OAuth2 client configured with a specific user's tokens.
 * Use this when making API calls on behalf of an authenticated user.
 */
export function getUserOAuth2Client(
  accessToken: string,
  refreshToken: string | null,
  expiryDate?: number
): Auth.OAuth2Client {
  const client = getOAuth2Client();
  client.setCredentials({
    access_token: accessToken,
    refresh_token: refreshToken ?? undefined,
    expiry_date: expiryDate,
  });
  return client;
}

/**
 * Scopes required for Google Calendar read/write access.
 */
export const GOOGLE_SCOPES = [
  'https://www.googleapis.com/auth/calendar.readonly',
  'https://www.googleapis.com/auth/calendar.events',
  'https://www.googleapis.com/auth/userinfo.email',
  'https://www.googleapis.com/auth/userinfo.profile',
];

