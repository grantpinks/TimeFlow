/**
 * Habit Controller
 *
 * Handles HTTP requests for habit CRUD operations.
 */

import { FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';
import * as habitService from '../services/habitService.js';
import * as habitSuggestionService from '../services/habitSuggestionService.js';
import { formatZodError } from '../utils/errorFormatter.js';

const createHabitSchema = z.object({
  title: z.string().trim().min(1, 'Title is required').max(100, 'Title too long'),
  description: z.string().optional(),
  frequency: z.enum(['daily', 'weekly', 'custom']),
  daysOfWeek: z.array(z.string()).optional(),
  preferredTimeOfDay: z.enum(['morning', 'afternoon', 'evening']).optional(),
  durationMinutes: z.coerce.number().int().positive().max(24 * 60).optional(),
});

const updateHabitSchema = z.object({
  title: z.string().trim().min(1).max(100).optional(),
  description: z.string().optional(),
  frequency: z.enum(['daily', 'weekly', 'custom']).optional(),
  daysOfWeek: z.array(z.string()).optional(),
  preferredTimeOfDay: z.enum(['morning', 'afternoon', 'evening']).optional(),
  durationMinutes: z.coerce.number().int().positive().max(24 * 60).optional(),
  isActive: z.boolean().optional(),
});

const habitSuggestionQuerySchema = z.object({
  from: z.string().optional(),
  to: z.string().optional(),
});

/**
 * GET /api/habits
 * Returns all habits for the authenticated user.
 */
export async function getHabits(
  request: FastifyRequest,
  reply: FastifyReply
) {
  const user = request.user;
  if (!user) {
    return reply.status(401).send({ error: 'Not authenticated' });
  }

  const habits = await habitService.getHabits(user.id);
  return habits;
}

/**
 * POST /api/habits
 * Creates a new habit.
 */
export async function createHabit(
  request: FastifyRequest,
  reply: FastifyReply
) {
  const user = request.user;
  if (!user) {
    return reply.status(401).send({ error: 'Not authenticated' });
  }

  const parsed = createHabitSchema.safeParse(request.body);
  if (!parsed.success) {
    return reply.status(400).send({ error: formatZodError(parsed.error) });
  }

  const habit = await habitService.createHabit({
    userId: user.id,
    ...(parsed.data as any),
  });

  return reply.status(201).send(habit);
}

/**
 * PATCH /api/habits/:id
 * Updates an existing habit.
 */
export async function updateHabit(
  request: FastifyRequest<{ Params: { id: string } }>,
  reply: FastifyReply
) {
  const user = request.user;
  if (!user) {
    return reply.status(401).send({ error: 'Not authenticated' });
  }

  const { id } = request.params;

  const parsed = updateHabitSchema.safeParse(request.body);
  if (!parsed.success) {
    return reply.status(400).send({ error: formatZodError(parsed.error) });
  }

  const habit = await habitService.updateHabit(id, user.id, parsed.data);

  if (!habit) {
    return reply.status(404).send({ error: 'Habit not found' });
  }

  return habit;
}

/**
 * DELETE /api/habits/:id
 * Deletes a habit.
 */
export async function deleteHabit(
  request: FastifyRequest<{ Params: { id: string } }>,
  reply: FastifyReply
) {
  const user = request.user;
  if (!user) {
    return reply.status(401).send({ error: 'Not authenticated' });
  }

  const { id } = request.params;
  const deleted = await habitService.deleteHabit(id, user.id);

  if (!deleted) {
    return reply.status(404).send({ error: 'Habit not found' });
  }

  return reply.status(204).send();
}

/**
 * GET /api/habits/suggestions
 * Returns non-committed scheduling suggestions for active habits.
 */
export async function getHabitSuggestions(
  request: FastifyRequest<{ Querystring: { from?: string; to?: string } }>,
  reply: FastifyReply
) {
  const user = request.user;
  if (!user) {
    return reply.status(401).send({ error: 'Not authenticated' });
  }

  const parsed = habitSuggestionQuerySchema.safeParse(request.query);
  if (!parsed.success) {
    return reply.status(400).send({ error: formatZodError(parsed.error) });
  }

  const now = new Date();
  const defaultFrom = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
  const defaultTo = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 7).toISOString();

  const from = parsed.data.from || defaultFrom;
  const to = parsed.data.to || defaultTo;

  if (isNaN(Date.parse(from)) || isNaN(Date.parse(to))) {
    return reply.status(400).send({ error: 'Invalid date range' });
  }

  try {
    const suggestions = await habitSuggestionService.getHabitSuggestionsForUser(user.id, from, to);
    return reply.send({ suggestions });
  } catch (error) {
    request.log.error(error, 'Failed to get habit suggestions');
    return reply.status(500).send({ error: 'Failed to fetch habit suggestions' });
  }
}

const acceptSuggestionSchema = z.object({
  habitId: z.string(),
  start: z.string(),
  end: z.string(),
});

/**
 * POST /api/habits/suggestions/accept
 * Accepts a habit suggestion and creates a scheduled habit + calendar event.
 */
export async function acceptHabitSuggestion(
  request: FastifyRequest,
  reply: FastifyReply
) {
  const user = request.user;
  if (!user) {
    return reply.status(401).send({ error: 'Not authenticated' });
  }

  const parsed = acceptSuggestionSchema.safeParse(request.body);
  if (!parsed.success) {
    return reply.status(400).send({ error: formatZodError(parsed.error) });
  }

  try {
    const scheduledHabit = await habitSuggestionService.acceptSuggestion(
      user.id,
      parsed.data.habitId,
      parsed.data.start,
      parsed.data.end
    );
    return reply.status(201).send(scheduledHabit);
  } catch (error) {
    request.log.error(error, 'Failed to accept habit suggestion');
    return reply.status(500).send({
      error: error instanceof Error ? error.message : 'Failed to accept suggestion'
    });
  }
}

const rejectSuggestionSchema = z.object({
  habitId: z.string(),
  start: z.string(),
});

/**
 * POST /api/habits/suggestions/reject
 * Rejects a habit suggestion (no persistence needed, just acknowledgment).
 */
export async function rejectHabitSuggestion(
  request: FastifyRequest,
  reply: FastifyReply
) {
  const user = request.user;
  if (!user) {
    return reply.status(401).send({ error: 'Not authenticated' });
  }

  const parsed = rejectSuggestionSchema.safeParse(request.body);
  if (!parsed.success) {
    return reply.status(400).send({ error: formatZodError(parsed.error) });
  }

  // Rejection is just a client-side state update - no backend persistence needed
  return reply.send({ success: true });
}
