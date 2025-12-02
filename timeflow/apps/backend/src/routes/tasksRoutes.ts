/**
 * Task Routes
 *
 * Registers task CRUD endpoints.
 */

import { FastifyInstance } from 'fastify';
import * as tasksController from '../controllers/tasksController.js';
import { requireAuth } from '../middlewares/auth.js';

export async function registerTaskRoutes(server: FastifyInstance) {
  // Get all tasks
  server.get('/tasks', { preHandler: requireAuth }, tasksController.getTasks);

  // Create task
  server.post('/tasks', { preHandler: requireAuth }, tasksController.createTask);

  // Update task
  server.patch('/tasks/:id', { preHandler: requireAuth }, tasksController.updateTask);

  // Delete task
  server.delete('/tasks/:id', { preHandler: requireAuth }, tasksController.deleteTask);

  // Complete task
  server.post(
    '/tasks/:id/complete',
    { preHandler: requireAuth },
    tasksController.completeTask
  );
}

