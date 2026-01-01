/**
 * Email Category Override Routes
 */

import { FastifyInstance } from 'fastify';
import { requireAuth } from '../middlewares/auth.js';
import * as emailOverrideController from '../controllers/emailOverrideController.js';

export async function registerEmailOverrideRoutes(server: FastifyInstance) {
  // Get all overrides for the authenticated user
  server.get('/email/overrides', { preHandler: requireAuth }, emailOverrideController.getOverrides);

  // Create or update an override
  server.post('/email/overrides', { preHandler: requireAuth }, emailOverrideController.createOverride);

  // Delete an override
  server.delete('/email/overrides/:id', { preHandler: requireAuth }, emailOverrideController.deleteOverride);
}
