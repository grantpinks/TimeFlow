/**
 * Habit Routes
 *
 * Registers habit CRUD endpoints.
 */

import { FastifyInstance } from 'fastify';
import * as habitController from '../controllers/habitController.js';
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
}
