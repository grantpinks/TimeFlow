/**
 * Scheduling Link Routes
 *
 * Registers scheduling link CRUD endpoints.
 */

import { FastifyInstance } from 'fastify';
import * as schedulingLinkController from '../controllers/schedulingLinkController.js';
import { requireAuth } from '../middlewares/auth.js';

export async function registerSchedulingLinkRoutes(server: FastifyInstance) {
  // Get all scheduling links
  server.get('/scheduling-links', { preHandler: requireAuth }, schedulingLinkController.getSchedulingLinks);

  // Create scheduling link
  server.post('/scheduling-links', { preHandler: requireAuth }, schedulingLinkController.createSchedulingLink);

  // Update scheduling link
  server.patch('/scheduling-links/:id', { preHandler: requireAuth }, schedulingLinkController.updateSchedulingLink);

  // Pause scheduling link
  server.post('/scheduling-links/:id/pause', { preHandler: requireAuth }, schedulingLinkController.pauseSchedulingLink);

  // Resume scheduling link
  server.post('/scheduling-links/:id/resume', { preHandler: requireAuth }, schedulingLinkController.resumeSchedulingLink);

  // Delete scheduling link
  server.delete('/scheduling-links/:id', { preHandler: requireAuth }, schedulingLinkController.deleteSchedulingLink);
}
