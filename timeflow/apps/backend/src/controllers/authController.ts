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
    const statePayload = decodeOAuthState(state);
    const user = await authService.handleGoogleCallback(code, statePayload);

    // Non-fatal: default categories should not block sign-in
    try {
      await categoryService.ensureDefaultCategories(user.id);
    } catch (catErr) {
      request.log.error({ err: catErr, userId: user.id }, 'ensureDefaultCategories failed after OAuth');
    }

    const accessToken = await reply.jwtSign(
      { sub: user.id, type: 'access' },
      { expiresIn: '15m' }
    );
    const refreshToken = await reply.jwtSign(
      { sub: user.id, type: 'refresh' },
      { expiresIn: '7d' }
    );

    const baseUrl = frontendBaseUrl();
    const stateParam = state ? `&state=${encodeURIComponent(state)}` : '';
    return reply.redirect(
      `${baseUrl}/auth/callback?token=${encodeURIComponent(accessToken)}&refreshToken=${encodeURIComponent(
        refreshToken
      )}${stateParam}`
    );
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
  refreshToken: z.string().min(1, 'refreshToken is required'),
});

/**
 * POST /api/auth/refresh
 * Issues a new access token from a refresh token.
 */
export async function refreshToken(
  request: FastifyRequest<{ Body: { refreshToken: string } }>,
  reply: FastifyReply
) {
  const parsed = refreshBodySchema.safeParse(request.body);
  if (!parsed.success) {
    return reply.status(400).send({ error: formatZodError(parsed.error) });
  }

  try {
    const payload = request.server.jwt.verify<{ sub: string; type?: string }>(
      parsed.data.refreshToken
    );

    if (payload.type !== 'refresh') {
      return reply.status(401).send({ error: 'Invalid refresh token' });
    }

    const accessToken = await reply.jwtSign(
      { sub: payload.sub, type: 'access' },
      { expiresIn: '15m' }
    );
    const newRefreshToken = await reply.jwtSign(
      { sub: payload.sub, type: 'refresh' },
      { expiresIn: '7d' }
    );

    return reply.status(200).send({ accessToken, refreshToken: newRefreshToken });
  } catch (error) {
    request.log.error(error, 'Failed to refresh token');
    return reply.status(401).send({ error: 'Invalid or expired refresh token' });
  }
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

  const dbUser = await prisma.user.findUnique({ where: { id: user.id } });
  if (!dbUser) {
    return reply.status(404).send({ error: 'User not found' });
  }

  const hasGoogleAuth = !!(dbUser.googleRefreshToken && dbUser.googleAccessToken);
  const isExpired = dbUser.googleAccessTokenExpiry
    ? new Date(dbUser.googleAccessTokenExpiry) < new Date()
    : true;

  return {
    connected: hasGoogleAuth,
    expired: isExpired,
    needsReauth: hasGoogleAuth && isExpired,
  };
}
