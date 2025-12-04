/**
 * Auth Routes
 *
 * Registers authentication endpoints.
 */

import { FastifyInstance } from 'fastify';
import * as authController from '../controllers/authController.js';

export async function registerAuthRoutes(server: FastifyInstance) {
  // Start Google OAuth flow
  server.get('/auth/google/start', {
    config: { rateLimit: { max: 30, timeWindow: '1 minute' } },
  }, authController.startGoogleAuth);

  // Handle Google OAuth callback
  server.get('/auth/google/callback', {
    config: { rateLimit: { max: 30, timeWindow: '1 minute' } },
  }, authController.handleGoogleCallback);

  // Refresh JWT
  server.post('/auth/refresh', {
    config: { rateLimit: { max: 60, timeWindow: '5 minutes' } },
  }, authController.refreshToken);
}

