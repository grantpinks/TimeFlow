/**
 * User Routes
 *
 * Registers user profile and preferences endpoints.
 */

import { FastifyInstance } from 'fastify';
import * as userController from '../controllers/userController.js';
import { requireAuth } from '../middlewares/auth.js';

export async function registerUserRoutes(server: FastifyInstance) {
  // Get current user
  server.get('/user/me', { preHandler: requireAuth }, userController.getMe);

  // Update preferences
  server.patch(
    '/user/preferences',
    { preHandler: requireAuth },
    userController.updatePreferences
  );
}

