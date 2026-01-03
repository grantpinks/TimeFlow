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
  server.get(
    '/user/email-accounts',
    { preHandler: requireAuth },
    userController.getEmailAccounts
  );

  // Update preferences
  server.patch(
    '/user/preferences',
    { preHandler: requireAuth },
    userController.updatePreferences
  );
}
