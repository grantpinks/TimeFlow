/**
 * Auth Controller
 *
 * Handles authentication endpoints for Google OAuth2.
 */

import { FastifyRequest, FastifyReply } from 'fastify';
import * as authService from '../services/authService.js';
import * as categoryService from '../services/categoryService.js';
import { prisma } from '../config/prisma.js';
import { env } from '../config/env.js';
import { z } from 'zod';
import { formatZodError } from '../utils/errorFormatter.js';
import { decodeOAuthState } from '../utils/oauthState.js';
import { getGoogleConnectionStatus } from '../services/googleScopeService.js';
import { extractRefreshToken } from '../utils/authTokenExtractor.js';
import {
  ACCESS_COOKIE_NAME,
  ACCESS_TOKEN_EXPIRES_IN,
  REFRESH_COOKIE_NAME,
  REFRESH_TOKEN_EXPIRES_IN,
  buildAccessCookieOptions,
  buildRefreshCookieOptions,
  buildClearCookieOptions,
} from '../utils/sessionCookies.js';

const callbackQuerySchema = z.object({
  code: z.string().optional(),
  error: z.string().optional(),
  state: z.string().optional(), // OAuth2 state parameter (returnTo URL)
});

function frontendBaseUrl(): string {
  const base = env.APP_BASE_URL?.replace(/\/$/, '') ?? '';
  if (!base) {
    throw new Error('APP_BASE_URL is not configured');
  }
  return base;
}

function authErrorRedirect(errorCode: string): string {
  return `${frontendBaseUrl()}/auth/error?error=${encodeURIComponent(errorCode)}`;
}

/**
 * GET /api/auth/google/start
 * Redirects user to Google OAuth2 consent screen.
 * Accepts optional ?returnTo= query parameter to redirect after auth completes.
 */
export async function startGoogleAuth(
  request: FastifyRequest<{ Querystring: { returnTo?: string } }>,
  reply: FastifyReply
) {
  const { returnTo } = request.query;
  const authUrl = authService.getGoogleSignInAuthUrl(returnTo);
  return reply.redirect(authUrl);
}

const connectBodySchema = z.object({
  returnTo: z.string().optional(),
});

/**
 * POST /api/auth/google/gmail-url
 * Returns OAuth URL to grant Gmail scopes for the current user.
 */
export async function createGoogleGmailConnectUrl(
  request: FastifyRequest<{ Body: { returnTo?: string } }>,
  reply: FastifyReply
) {
  const user = request.user;
  if (!user) {
    return reply.status(401).send({ error: 'Not authenticated' });
  }

  const parsed = connectBodySchema.safeParse(request.body ?? {});
  if (!parsed.success) {
    return reply.status(400).send({ error: formatZodError(parsed.error) });
  }

  const url = authService.getGoogleGmailAuthUrl(user.id, parsed.data.returnTo);
  return { url };
}

/**
 * POST /api/auth/google/reconnect-url
 * Returns OAuth URL to refresh all Google permissions for the current user.
 */
export async function createGoogleReconnectUrl(
  request: FastifyRequest<{ Body: { returnTo?: string } }>,
  reply: FastifyReply
) {
  const user = request.user;
  if (!user) {
    return reply.status(401).send({ error: 'Not authenticated' });
  }

  const parsed = connectBodySchema.safeParse(request.body ?? {});
  if (!parsed.success) {
    return reply.status(400).send({ error: formatZodError(parsed.error) });
  }

  const url = authService.getGoogleReconnectAuthUrl(user.id, parsed.data.returnTo);
  return { url };
}

/**
 * GET /api/auth/google/callback
 * Handles OAuth callback, exchanges code for tokens, creates/updates user.
 */
export async function handleGoogleCallback(
  request: FastifyRequest<{ Querystring: { code?: string; error?: string; state?: string } }>,
  reply: FastifyReply
) {
  const parsedQuery = callbackQuerySchema.safeParse(request.query);
  if (!parsedQuery.success) {
    return reply.status(400).send({ error: formatZodError(parsedQuery.error) });
  }

  const { code, error, state } = parsedQuery.data;

  if (error) {
    request.log.error({ error }, 'Google OAuth error');
    try {
      return reply.redirect(authErrorRedirect(error));
    } catch {
      return reply.status(500).send({ error: 'APP_BASE_URL is not configured' });
    }
  }

  if (!code) {
    return reply.status(400).send({ error: 'Missing authorization code' });
  }

  try {
    let statePayload: ReturnType<typeof decodeOAuthState>;
    try {
      statePayload = decodeOAuthState(state);
    } catch {
      return reply.redirect(authErrorRedirect('invalid_state'));
    }
    const user = await authService.handleGoogleCallback(code, statePayload);

    // Non-fatal: default categories should not block sign-in
    try {
      await categoryService.ensureDefaultCategories(user.id);
    } catch (catErr) {
      request.log.error({ err: catErr, userId: user.id }, 'ensureDefaultCategories failed after OAuth');
    }

    const accessToken = await reply.jwtSign(
      { sub: user.id, type: 'access' },
      { expiresIn: ACCESS_TOKEN_EXPIRES_IN }
    );
    const refreshToken = await reply.jwtSign(
      { sub: user.id, type: 'refresh' },
      { expiresIn: REFRESH_TOKEN_EXPIRES_IN }
    );

    reply.setCookie(
      ACCESS_COOKIE_NAME,
      accessToken,
      buildAccessCookieOptions(env.NODE_ENV)
    );
    reply.setCookie(
      REFRESH_COOKIE_NAME,
      refreshToken,
      buildRefreshCookieOptions(env.NODE_ENV)
    );

    const baseUrl = frontendBaseUrl();
    const stateParam = state ? `?state=${encodeURIComponent(state)}` : '';
    return reply.redirect(`${baseUrl}/auth/callback${stateParam}`);
  } catch (err) {
    request.log.error(err, 'Failed to handle Google callback');
    try {
      return reply.redirect(authErrorRedirect('callback_failed'));
    } catch {
      return reply.status(500).send({ error: 'OAuth callback failed and APP_BASE_URL is not configured' });
    }
  }
}

const refreshBodySchema = z.object({
  refreshToken: z.string().min(1).optional(),
});

/**
 * POST /api/auth/refresh
 * Issues a new access token from a refresh token (cookie for web, body for mobile).
 */
export async function refreshToken(
  request: FastifyRequest<{ Body: { refreshToken?: string } }>,
  reply: FastifyReply
) {
  const parsed = refreshBodySchema.safeParse(request.body ?? {});
  if (!parsed.success) {
    return reply.status(400).send({ error: formatZodError(parsed.error) });
  }

  const fromCookie = extractRefreshToken({
    cookies: request.cookies as Record<string, string | undefined>,
  });
  const fromBody = parsed.data.refreshToken;
  const refreshTokenValue = fromCookie ?? fromBody;

  if (!refreshTokenValue) {
    return reply.status(401).send({ error: 'Missing refresh token' });
  }

  try {
    const payload = request.server.jwt.verify<{ sub: string; type?: string }>(
      refreshTokenValue
    );

    if (payload.type !== 'refresh') {
      return reply.status(401).send({ error: 'Invalid refresh token' });
    }

    const accessToken = await reply.jwtSign(
      { sub: payload.sub, type: 'access' },
      { expiresIn: ACCESS_TOKEN_EXPIRES_IN }
    );
    const newRefreshToken = await reply.jwtSign(
      { sub: payload.sub, type: 'refresh' },
      { expiresIn: REFRESH_TOKEN_EXPIRES_IN }
    );

    reply.setCookie(
      ACCESS_COOKIE_NAME,
      accessToken,
      buildAccessCookieOptions(env.NODE_ENV)
    );
    reply.setCookie(
      REFRESH_COOKIE_NAME,
      newRefreshToken,
      buildRefreshCookieOptions(env.NODE_ENV)
    );

    return reply.status(200).send({
      success: true,
      ...(fromBody ? { accessToken, refreshToken: newRefreshToken } : {}),
    });
  } catch (error) {
    request.log.error(error, 'Failed to refresh token');
    return reply.status(401).send({ error: 'Invalid or expired refresh token' });
  }
}

/**
 * POST /api/auth/logout
 * Clears session cookies and revokes Google tokens when session is known.
 */
export async function logout(request: FastifyRequest, reply: FastifyReply) {
  if (request.user) {
    try {
      const dbUser = await prisma.user.findUnique({
        where: { id: request.user.id },
        select: { googleRefreshToken: true },
      });
      if (dbUser?.googleRefreshToken) {
        await authService.revokeGoogleRefreshToken(dbUser.googleRefreshToken);
      }
    } catch (err) {
      request.log.warn({ err, userId: request.user.id }, 'Google token revoke failed on logout');
    }
  }

  const clearOpts = buildClearCookieOptions(env.NODE_ENV);
  reply.clearCookie(ACCESS_COOKIE_NAME, clearOpts);
  reply.clearCookie(REFRESH_COOKIE_NAME, clearOpts);
  return { success: true };
}

/**
 * GET /api/auth/session
 * Lightweight session probe for the web client.
 */
export async function getSession(request: FastifyRequest, _reply: FastifyReply) {
  const user = request.user;
  if (!user) {
    return { authenticated: false };
  }
  return { authenticated: true, userId: user.id };
}

/**
 * GET /api/auth/google/status
 * Check if user has valid Google OAuth tokens.
 */
export async function getGoogleOAuthStatus(
  request: FastifyRequest,
  reply: FastifyReply
) {
  const user = request.user;
  if (!user) {
    return reply.status(401).send({ error: 'Not authenticated' });
  }

  try {
    return await getGoogleConnectionStatus(user.id);
  } catch (error) {
    request.log.error(error, 'Failed to get Google OAuth status');
    return reply.status(500).send({ error: 'Failed to get Google OAuth status' });
  }
}
