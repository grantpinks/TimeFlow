/**
 * Auth Controller
 *
 * Handles authentication endpoints for Google OAuth2.
 */

import { FastifyRequest, FastifyReply } from 'fastify';
import * as authService from '../services/authService.js';
import { env } from '../config/env.js';
import { z } from 'zod';

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
    return reply.status(400).send({ error: parsedQuery.error.flatten().fieldErrors });
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
    const token = authService.generateToken(user.id);

    // Redirect to frontend with token
    // TODO: Use proper cookie/session or return token in a secure way
    return reply.redirect(`${env.APP_BASE_URL}/auth/callback?token=${token}`);
  } catch (err) {
    request.log.error(err, 'Failed to handle Google callback');
    return reply.redirect(`${env.APP_BASE_URL}/auth/error?error=callback_failed`);
  }
}

