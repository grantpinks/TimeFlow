/**
 * Tasks Controller
 *
 * Handles CRUD operations for tasks.
 */

import { FastifyRequest, FastifyReply } from 'fastify';
import * as tasksService from '../services/tasksService.js';

/**
 * GET /api/tasks
 * Returns all tasks for the authenticated user.
 */
export async function getTasks(
  request: FastifyRequest<{ Querystring: { status?: string } }>,
  reply: FastifyReply
) {
  const user = request.user;
  if (!user) {
    return reply.status(401).send({ error: 'Not authenticated' });
  }

  const { status } = request.query;
  const tasks = await tasksService.getTasks(user.id, status);

  return tasks;
}

interface CreateTaskBody {
  title: string;
  description?: string;
  durationMinutes?: number;
  priority?: number;
  dueDate?: string;
}

/**
 * POST /api/tasks
 * Creates a new task.
 */
export async function createTask(
  request: FastifyRequest<{ Body: CreateTaskBody }>,
  reply: FastifyReply
) {
  const user = request.user;
  if (!user) {
    return reply.status(401).send({ error: 'Not authenticated' });
  }

  const { title, description, durationMinutes, priority, dueDate } = request.body;

  if (!title || title.trim() === '') {
    return reply.status(400).send({ error: 'Title is required' });
  }

  const task = await tasksService.createTask({
    userId: user.id,
    title: title.trim(),
    description,
    durationMinutes,
    priority,
    dueDate: dueDate ? new Date(dueDate) : undefined,
  });

  return reply.status(201).send(task);
}

interface UpdateTaskBody {
  title?: string;
  description?: string;
  durationMinutes?: number;
  priority?: number;
  dueDate?: string;
  status?: string;
}

/**
 * PATCH /api/tasks/:id
 * Updates an existing task.
 */
export async function updateTask(
  request: FastifyRequest<{ Params: { id: string }; Body: UpdateTaskBody }>,
  reply: FastifyReply
) {
  const user = request.user;
  if (!user) {
    return reply.status(401).send({ error: 'Not authenticated' });
  }

  const { id } = request.params;
  const { title, description, durationMinutes, priority, dueDate, status } = request.body;

  const task = await tasksService.updateTask(id, user.id, {
    title,
    description,
    durationMinutes,
    priority,
    dueDate: dueDate ? new Date(dueDate) : undefined,
    status,
  });

  if (!task) {
    return reply.status(404).send({ error: 'Task not found' });
  }

  return task;
}

/**
 * DELETE /api/tasks/:id
 * Deletes a task.
 */
export async function deleteTask(
  request: FastifyRequest<{ Params: { id: string } }>,
  reply: FastifyReply
) {
  const user = request.user;
  if (!user) {
    return reply.status(401).send({ error: 'Not authenticated' });
  }

  const { id } = request.params;
  const deleted = await tasksService.deleteTask(id, user.id);

  if (!deleted) {
    return reply.status(404).send({ error: 'Task not found' });
  }

  return reply.status(204).send();
}

/**
 * POST /api/tasks/:id/complete
 * Marks a task as completed.
 */
export async function completeTask(
  request: FastifyRequest<{ Params: { id: string } }>,
  reply: FastifyReply
) {
  const user = request.user;
  if (!user) {
    return reply.status(401).send({ error: 'Not authenticated' });
  }

  const { id } = request.params;
  const task = await tasksService.completeTask(id, user.id);

  if (!task) {
    return reply.status(404).send({ error: 'Task not found' });
  }

  return task;
}

