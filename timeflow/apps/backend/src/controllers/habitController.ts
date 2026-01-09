/**
 * Habit Controller
 *
 * Handles HTTP requests for habit CRUD operations.
 */

import { FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';
import { prisma } from '../config/prisma.js';
import * as habitService from '../services/habitService.js';
import * as habitSuggestionService from '../services/habitSuggestionService.js';
import * as habitCompletionService from '../services/habitCompletionService.js';
import * as habitInsightsService from '../services/habitInsightsService.js';
import { getSchedulingContext } from '../services/schedulingContextService.js';
import { generateBulkSchedule } from '../services/bulkScheduleService.js';
import { commitSchedule } from '../services/commitScheduleService.js';
import { formatZodError } from '../utils/errorFormatter.js';
import { HabitSkipReason, type DismissCoachSuggestionRequest } from '@timeflow/shared';

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

const skipHabitSchema = z.object({
  reasonCode: z.nativeEnum(HabitSkipReason),
});

/**
 * POST /api/habits/instances/:scheduledHabitId/complete
 * Marks a scheduled habit instance as complete.
 */
export async function completeHabitInstance(
  request: FastifyRequest<{ Params: { scheduledHabitId: string } }>,
  reply: FastifyReply
) {
  const user = request.user;
  if (!user) {
    return reply.status(401).send({ error: 'Not authenticated' });
  }

  const { scheduledHabitId } = request.params;

  try {
    const completion = await habitCompletionService.markScheduledHabitComplete(
      user.id,
      scheduledHabitId
    );
    return reply.send({
      success: true,
      completion: {
        id: completion.id,
        status: completion.status,
        completedAt: completion.completedAt.toISOString(),
      },
    });
  } catch (error) {
    request.log.error(error, 'Failed to complete habit instance');
    return reply.status(500).send({
      error: error instanceof Error ? error.message : 'Failed to complete habit instance',
    });
  }
}

/**
 * POST /api/habits/instances/:scheduledHabitId/undo
 * Undoes a completed or skipped habit instance.
 */
export async function undoHabitInstance(
  request: FastifyRequest<{ Params: { scheduledHabitId: string } }>,
  reply: FastifyReply
) {
  const user = request.user;
  if (!user) {
    return reply.status(401).send({ error: 'Not authenticated' });
  }

  const { scheduledHabitId } = request.params;

  try {
    const result = await habitCompletionService.undoScheduledHabitComplete(
      user.id,
      scheduledHabitId
    );
    return reply.send(result);
  } catch (error) {
    request.log.error(error, 'Failed to undo habit instance');
    return reply.status(400).send({
      error: error instanceof Error ? error.message : 'Failed to undo habit instance',
    });
  }
}

/**
 * POST /api/habits/instances/:scheduledHabitId/skip
 * Skips a scheduled habit instance with a reason code.
 */
export async function skipHabitInstance(
  request: FastifyRequest<{ Params: { scheduledHabitId: string }; Body: { reasonCode: HabitSkipReason } }>,
  reply: FastifyReply
) {
  const user = request.user;
  if (!user) {
    return reply.status(401).send({ error: 'Not authenticated' });
  }

  const { scheduledHabitId } = request.params;

  const parsed = skipHabitSchema.safeParse(request.body);
  if (!parsed.success) {
    return reply.status(400).send({ error: formatZodError(parsed.error) });
  }

  try {
    const completion = await habitCompletionService.skipScheduledHabit(
      user.id,
      scheduledHabitId,
      parsed.data.reasonCode
    );
    return reply.send({
      success: true,
      completion: {
        id: completion.id,
        status: completion.status,
        reasonCode: completion.reasonCode,
        completedAt: completion.completedAt.toISOString(),
      },
    });
  } catch (error) {
    request.log.error(error, 'Failed to skip habit instance');
    return reply.status(400).send({
      error: error instanceof Error ? error.message : 'Failed to skip habit instance',
    });
  }
}

const habitInsightsQuerySchema = z.object({
  days: z.enum(['14', '28']).optional(),
});

/**
 * GET /api/habits/insights?days=14|28
 * Returns habit insights and analytics for the authenticated user.
 */
export async function getHabitInsights(
  request: FastifyRequest<{ Querystring: { days?: '14' | '28' } }>,
  reply: FastifyReply
) {
  const user = request.user;
  if (!user) {
    return reply.status(401).send({ error: 'Not authenticated' });
  }

  const parsed = habitInsightsQuerySchema.safeParse(request.query);
  if (!parsed.success) {
    return reply.status(400).send({ error: formatZodError(parsed.error) });
  }

  const days = parsed.data.days ? parseInt(parsed.data.days, 10) as 14 | 28 : 14;

  try {
    const insights = await habitInsightsService.getHabitInsights(user.id, days);
    return reply.send(insights);
  } catch (error) {
    request.log.error(error, 'Failed to get habit insights');
    return reply.status(500).send({
      error: error instanceof Error ? error.message : 'Failed to fetch habit insights',
    });
  }
}

const dismissSuggestionSchema = z.object({
  type: z.string(),
  habitId: z.string(),
  snoozedUntil: z.string().optional(),
});

/**
 * POST /api/habits/coach/dismiss
 * Dismisses or snoozes a coach suggestion
 */
export async function dismissCoachSuggestion(
  request: FastifyRequest<{ Body: DismissCoachSuggestionRequest }>,
  reply: FastifyReply
) {
  const user = request.user;
  if (!user) {
    return reply.status(401).send({ error: 'Not authenticated' });
  }

  const parsed = dismissSuggestionSchema.safeParse(request.body);
  if (!parsed.success) {
    return reply.status(400).send({ error: formatZodError(parsed.error) });
  }

  const { type, habitId, snoozedUntil } = parsed.data;

  try {
    // Get current coach state
    const currentUser = await prisma.user.findUnique({ where: { id: user.id } });
    if (!currentUser) {
      return reply.status(404).send({ error: 'User not found' });
    }

    const coachState = (currentUser.habitsCoachState as any) || {
      dismissedSuggestions: [],
      lastPrimarySuggestion: null,
    };

    // Add to dismissed suggestions
    const dismissedEntry = {
      type,
      habitId,
      dismissedAt: new Date().toISOString(),
      snoozedUntil: snoozedUntil || null,
    };

    // Remove any existing dismissed entry for this type/habitId combination
    coachState.dismissedSuggestions = coachState.dismissedSuggestions.filter(
      (d: any) => !(d.type === type && d.habitId === habitId)
    );

    // Add new dismissed entry
    coachState.dismissedSuggestions.push(dismissedEntry);

    // Update user's coach state
    await prisma.user.update({
      where: { id: user.id },
      data: { habitsCoachState: coachState },
    });

    return reply.send({ success: true });
  } catch (error) {
    request.log.error(error, 'Failed to dismiss coach suggestion');
    return reply.status(500).send({
      error: error instanceof Error ? error.message : 'Failed to dismiss suggestion',
    });
  }
}

/**
 * GET /api/habits/scheduling-context
 * Returns scheduling context for the Flow Coach banner.
 */
export async function getSchedulingContextHandler(
  request: FastifyRequest,
  reply: FastifyReply
) {
  try {
    const userId = request.user!.id;
    const context = await getSchedulingContext(userId);
    return reply.code(200).send(context);
  } catch (error) {
    request.log.error(error, 'Error getting scheduling context');
    return reply.code(500).send({ error: 'Failed to get scheduling context' });
  }
}

/**
 * POST /api/habits/bulk-schedule
 * Generates bulk schedule suggestions for a date range.
 */
export async function generateBulkScheduleHandler(
  request: FastifyRequest<{
    Body: {
      dateRangeStart: string;
      dateRangeEnd: string;
      customPrompt?: string;
    };
  }>,
  reply: FastifyReply
) {
  try {
    const userId = request.user!.id;
    const { dateRangeStart, dateRangeEnd, customPrompt } = request.body;

    const result = await generateBulkSchedule({
      userId,
      dateRangeStart,
      dateRangeEnd,
      customPrompt,
    });

    return reply.code(200).send(result);
  } catch (error) {
    request.log.error(error, 'Error generating bulk schedule');
    if (error instanceof Error && error.message.includes('exceed')) {
      return reply.code(400).send({ error: error.message });
    }
    return reply.code(500).send({ error: 'Failed to generate schedule' });
  }
}

export async function commitScheduleHandler(
  request: FastifyRequest<{
    Body: {
      acceptedBlocks: Array<{
        habitId: string;
        startDateTime: string;
        endDateTime: string;
      }>;
    };
  }>,
  reply: FastifyReply
) {
  try {
    const userId = request.user!.id;
    const { acceptedBlocks } = request.body;

    if (!acceptedBlocks || acceptedBlocks.length === 0) {
      return reply.code(400).send({ error: 'No blocks provided' });
    }

    const result = await commitSchedule(userId, acceptedBlocks);

    return reply.code(200).send(result);
  } catch (error) {
    request.log.error(error, 'Error committing schedule');
    return reply.code(500).send({ error: 'Failed to commit schedule' });
  }
}
