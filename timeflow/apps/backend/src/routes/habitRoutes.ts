/**
 * Habit Routes
 *
 * Registers habit CRUD endpoints.
 */

import { FastifyInstance } from 'fastify';
import * as habitController from '../controllers/habitController.js';
import { getSchedulingContextHandler, generateBulkScheduleHandler } from '../controllers/habitController.js';
import { requireAuth } from '../middlewares/auth.js';

export async function registerHabitRoutes(server: FastifyInstance) {
  // GET /api/habits/suggestions - Non-committed schedule suggestions for habits
  server.get(
    '/habits/suggestions',
    { preHandler: requireAuth },
    habitController.getHabitSuggestions
  );

  // POST /api/habits/suggestions/accept - Accept a habit suggestion
  server.post(
    '/habits/suggestions/accept',
    { preHandler: requireAuth },
    habitController.acceptHabitSuggestion
  );

  // POST /api/habits/suggestions/reject - Reject a habit suggestion
  server.post(
    '/habits/suggestions/reject',
    { preHandler: requireAuth },
    habitController.rejectHabitSuggestion
  );

  // GET /api/habits - List all habits for user
  server.get(
    '/habits',
    { preHandler: requireAuth },
    habitController.getHabits
  );

  // GET /api/habits/insights - Get habit insights and analytics
  server.get(
    '/habits/insights',
    { preHandler: requireAuth },
    habitController.getHabitInsights
  );

  // GET /api/habits/scheduling-context - Get scheduling context for Flow Coach banner
  server.get(
    '/habits/scheduling-context',
    { preHandler: requireAuth },
    getSchedulingContextHandler
  );

  // POST /api/habits/bulk-schedule - Generate bulk schedule suggestions for a date range
  server.post(
    '/habits/bulk-schedule',
    { preHandler: requireAuth },
    generateBulkScheduleHandler
  );

  // POST /api/habits - Create a new habit
  server.post(
    '/habits',
    { preHandler: requireAuth },
    habitController.createHabit
  );

  // PATCH /api/habits/:id - Update a habit
  server.patch(
    '/habits/:id',
    { preHandler: requireAuth },
    habitController.updateHabit
  );

  // DELETE /api/habits/:id - Delete a habit
  server.delete(
    '/habits/:id',
    { preHandler: requireAuth },
    habitController.deleteHabit
  );

  // POST /api/habits/instances/:scheduledHabitId/complete - Mark habit instance complete
  server.post(
    '/habits/instances/:scheduledHabitId/complete',
    { preHandler: requireAuth },
    habitController.completeHabitInstance
  );

  // POST /api/habits/instances/:scheduledHabitId/undo - Undo habit instance
  server.post(
    '/habits/instances/:scheduledHabitId/undo',
    { preHandler: requireAuth },
    habitController.undoHabitInstance
  );

  // POST /api/habits/instances/:scheduledHabitId/skip - Skip habit instance with reason
  server.post(
    '/habits/instances/:scheduledHabitId/skip',
    { preHandler: requireAuth },
    habitController.skipHabitInstance
  );

  // POST /api/habits/coach/dismiss - Dismiss or snooze a coach suggestion
  server.post(
    '/habits/coach/dismiss',
    { preHandler: requireAuth },
    habitController.dismissCoachSuggestion
  );
}
