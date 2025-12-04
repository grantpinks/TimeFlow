/**
 * Auth Controller
 *
 * Handles authentication endpoints for Google OAuth2.
 */

import { FastifyRequest, FastifyReply } from 'fastify';
import * as authService from '../services/authService.js';
import { env } from '../config/env.js';
import { z } from 'zod';
import { formatZodError } from '../utils/errorFormatter.js';

const callbackQuerySchema = z.object({
  code: z.string().optional(),
  error: z.string().optional(),
});

/**
 * GET /api/auth/google/start
 * Redirects user to Google OAuth2 consent screen.
 */
export async function startGoogleAuth(
  _request: FastifyRequest,
  reply: FastifyReply
) {
  const authUrl = authService.getGoogleAuthUrl();
  return reply.redirect(authUrl);
}

/**
 * GET /api/auth/google/callback
 * Handles OAuth callback, exchanges code for tokens, creates/updates user.
 */
export async function handleGoogleCallback(
  request: FastifyRequest<{ Querystring: { code?: string; error?: string } }>,
  reply: FastifyReply
) {
  const parsedQuery = callbackQuerySchema.safeParse(request.query);
  if (!parsedQuery.success) {
    return reply.status(400).send({ error: formatZodError(parsedQuery.error) });
  }

  const { code, error } = parsedQuery.data;

  if (error) {
    request.log.error({ error }, 'Google OAuth error');
    return reply.redirect(`${env.APP_BASE_URL}/auth/error?error=${error}`);
  }

  if (!code) {
    return reply.status(400).send({ error: 'Missing authorization code' });
  }

  try {
    const user = await authService.handleGoogleCallback(code);
    const accessToken = await reply.jwtSign(
      { sub: user.id, type: 'access' },
      { expiresIn: '15m' }
    );
    const refreshToken = await reply.jwtSign(
      { sub: user.id, type: 'refresh' },
      { expiresIn: '7d' }
    );

    // Redirect to frontend with tokens (MVP: query params; future: HttpOnly cookies)
    const baseUrl = env.APP_BASE_URL || '';
    return reply.redirect(
      `${baseUrl}/auth/callback?token=${encodeURIComponent(accessToken)}&refreshToken=${encodeURIComponent(
        refreshToken
      )}`
    );
  } catch (err) {
    request.log.error(err, 'Failed to handle Google callback');
    return reply.redirect(`${env.APP_BASE_URL}/auth/error?error=callback_failed`);
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
    const payload = await request.jwtVerify<{ sub: string; type?: string }>({
      token: parsed.data.refreshToken,
    });

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

