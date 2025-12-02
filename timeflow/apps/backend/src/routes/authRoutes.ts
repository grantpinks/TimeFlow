/**
 * Auth Routes
 *
 * Registers authentication endpoints.
 */

import { FastifyInstance } from 'fastify';
import * as authController from '../controllers/authController.js';

export async function registerAuthRoutes(server: FastifyInstance) {
  // Start Google OAuth flow
  server.get('/auth/google/start', authController.startGoogleAuth);

  // Handle Google OAuth callback
  server.get('/auth/google/callback', authController.handleGoogleCallback);
}

