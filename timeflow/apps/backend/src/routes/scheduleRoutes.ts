/**
 * Schedule Routes
 *
 * Registers smart scheduling endpoints.
 */

import { FastifyInstance } from 'fastify';
import * as scheduleController from '../controllers/scheduleController.js';
import { requireAuth } from '../middlewares/auth.js';

export async function registerScheduleRoutes(server: FastifyInstance) {
  // Run smart scheduling
  server.post('/schedule', { preHandler: requireAuth }, scheduleController.runSchedule);

  // Manually reschedule a task
  server.patch(
    '/schedule/:taskId',
    { preHandler: requireAuth },
    scheduleController.rescheduleTask
  );
}

