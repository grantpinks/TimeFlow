/**
 * Schedule Routes
 *
 * Registers smart scheduling endpoints.
 */

import { FastifyInstance } from 'fastify';
import * as scheduleController from '../controllers/scheduleController.js';
import { requireAuth } from '../middlewares/auth.js';

export async function registerScheduleRoutes(server: FastifyInstance) {
  // Run smart scheduling (computationally expensive - stricter limit)
  server.post('/schedule', {
    preHandler: requireAuth,
    config: { rateLimit: { max: 10, timeWindow: '1 minute' } },
  }, scheduleController.runSchedule);

  // Apply an AI-generated schedule preview
  server.post(
    '/schedule/apply',
    {
      preHandler: requireAuth,
      config: { rateLimit: { max: 20, timeWindow: '1 minute' } },
    },
    scheduleController.applySchedule
  );

  // Detect calendar conflicts with scheduled tasks
  server.get(
    '/schedule/conflicts',
    { preHandler: requireAuth },
    scheduleController.getScheduleConflicts
  );

  // Reschedule tasks that conflict with calendar changes
  server.post(
    '/schedule/reshuffle',
    {
      preHandler: requireAuth,
      config: { rateLimit: { max: 10, timeWindow: '1 minute' } },
    },
    scheduleController.reshuffleConflicts
  );

  // Manually reschedule a task
  server.patch(
    '/schedule/:taskId',
    {
      preHandler: requireAuth,
      config: { rateLimit: { max: 30, timeWindow: '1 minute' } },
    },
    scheduleController.rescheduleTask
  );
}

