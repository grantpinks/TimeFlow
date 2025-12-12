/**
 * Auth Routes
 *
 * Registers authentication endpoints.
 */

import { FastifyInstance } from 'fastify';
import * as authController from '../controllers/authController.js';
import { requireAuth } from '../middlewares/auth.js';

export async function registerAuthRoutes(server: FastifyInstance) {
  // Start Google OAuth flow
  server.get('/auth/google/start', {
    config: { rateLimit: { max: 30, timeWindow: '1 minute' } },
  }, authController.startGoogleAuth);

  // Handle Google OAuth callback
  server.get('/auth/google/callback', {
    config: { rateLimit: { max: 30, timeWindow: '1 minute' } },
  }, authController.handleGoogleCallback);

  // Check Google OAuth status
  server.get('/auth/google/status', {
    preHandler: requireAuth,
    config: { rateLimit: { max: 60, timeWindow: '1 minute' } },
  }, authController.getGoogleOAuthStatus);

  // Refresh JWT
  server.post('/auth/refresh', {
    config: { rateLimit: { max: 60, timeWindow: '5 minutes' } },
  }, authController.refreshToken);
}

