/**
 * Tasks Controller
 *
 * Handles CRUD operations for tasks.
 */

import { FastifyRequest, FastifyReply } from 'fastify';
import * as tasksService from '../services/tasksService.js';
import { z } from 'zod';

const TASK_STATUS_VALUES = ['unscheduled', 'scheduled', 'completed'] as const;

/**
 * Format Zod validation errors into a readable error message.
 */
function formatZodError(error: z.ZodError): string {
  const fieldErrors = error.flatten().fieldErrors;
  const messages: string[] = [];

  for (const [field, errors] of Object.entries(fieldErrors)) {
    if (errors && errors.length > 0) {
      messages.push(`${field}: ${errors.join(', ')}`);
    }
  }

  return messages.length > 0 ? messages.join('; ') : 'Validation failed';
}

/**
 * Flexible date validator that accepts:
 * - ISO datetime strings (2025-12-04T17:00:00Z)
 * - Plain date strings (2025-12-04)
 * Converts plain dates to ISO datetime at start of day.
 */
const flexibleDateString = z
  .string()
  .refine(
    (val) => {
      // Check if it's a valid ISO datetime
      if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(val)) {
        return !isNaN(Date.parse(val));
      }
      // Check if it's a valid YYYY-MM-DD date
      if (/^\d{4}-\d{2}-\d{2}$/.test(val)) {
        return !isNaN(Date.parse(val));
      }
      return false;
    },
    { message: 'Invalid date format. Use YYYY-MM-DD or ISO datetime' }
  )
  .transform((val) => {
    // If it's already ISO datetime, return as-is
    if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(val)) {
      return val;
    }
    // Convert YYYY-MM-DD to ISO datetime at start of day
    return `${val}T00:00:00.000Z`;
  });

const createTaskSchema = z.object({
  title: z.string().trim().min(1, 'Title is required'),
  description: z.string().optional(),
  durationMinutes: z.coerce.number().int().positive().max(24 * 60).optional(),
  priority: z.coerce.number().int().min(1).max(3).optional(),
  dueDate: flexibleDateString.optional(),
});

const tasksQuerySchema = z.object({
  status: z.enum(TASK_STATUS_VALUES).optional(),
});

const updateTaskSchema = z
  .object({
    title: z.string().trim().min(1).optional(),
    description: z.string().optional(),
    durationMinutes: z.coerce.number().int().positive().max(24 * 60).optional(),
    priority: z.coerce.number().int().min(1).max(3).optional(),
    dueDate: flexibleDateString.optional(),
    status: z.enum(TASK_STATUS_VALUES).optional(),
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: 'At least one field must be provided',
  });

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

  const parsedQuery = tasksQuerySchema.safeParse(request.query);
  if (!parsedQuery.success) {
    return reply.status(400).send({ error: formatZodError(parsedQuery.error) });
  }

  const { status } = parsedQuery.data;
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

  const parsed = createTaskSchema.safeParse(request.body);
  if (!parsed.success) {
    return reply.status(400).send({ error: formatZodError(parsed.error) });
  }

  const { title, description, durationMinutes, priority, dueDate } = parsed.data;

  const task = await tasksService.createTask({
    userId: user.id,
    title,
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

  const parsed = updateTaskSchema.safeParse(request.body);
  if (!parsed.success) {
    return reply.status(400).send({ error: formatZodError(parsed.error) });
  }

  const { title, description, durationMinutes, priority, dueDate, status } = parsed.data;

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

