/**
 * Email Category Override Controller
 *
 * Handles API endpoints for managing user email category overrides.
 */

import { FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';
import * as emailOverrideService from '../services/emailOverrideService.js';
import { formatZodError } from '../utils/errorFormatter.js';
import type {} from '../types/context.js';

const createOverrideSchema = z.object({
  overrideType: z.enum(['sender', 'domain', 'threadId']),
  overrideValue: z.string().min(1, 'Override value is required'),
  categoryName: z.string().min(1, 'Category name is required'),
  reason: z.string().optional(),
});

/**
 * GET /api/email/overrides
 * Get all email category overrides for the authenticated user
 */
export async function getOverrides(
  request: FastifyRequest,
  reply: FastifyReply
) {
  const user = request.user;
  if (!user) {
    return reply.status(401).send({ error: 'Not authenticated' });
  }

  try {
    const overrides = await emailOverrideService.getUserOverrides(user.id);
    reply.send({ overrides });
  } catch (error) {
    request.log.error({ error }, 'Failed to fetch email overrides');
    reply.status(500).send({ error: 'Failed to fetch email overrides' });
  }
}

/**
 * POST /api/email/overrides
 * Create or update an email category override
 */
export async function createOverride(
  request: FastifyRequest,
  reply: FastifyReply
) {
  const user = request.user;
  if (!user) {
    return reply.status(401).send({ error: 'Not authenticated' });
  }

  const validation = createOverrideSchema.safeParse(request.body);
  if (!validation.success) {
    return reply.status(400).send({
      error: 'Invalid input',
      details: formatZodError(validation.error),
    });
  }

  const { overrideType, overrideValue, categoryName, reason } = validation.data;

  try {
    const override = await emailOverrideService.upsertOverride({
      userId: user.id,
      overrideType,
      overrideValue: overrideValue.toLowerCase(), // Normalize to lowercase
      categoryName,
      reason,
    });

    reply.status(201).send({ override });
  } catch (error) {
    request.log.error({ error }, 'Failed to create email override');
    reply.status(500).send({ error: 'Failed to create email override' });
  }
}

/**
 * DELETE /api/email/overrides/:id
 * Delete an email category override
 */
export async function deleteOverride(
  request: FastifyRequest<{ Params: { id: string } }>,
  reply: FastifyReply
) {
  const user = request.user;
  if (!user) {
    return reply.status(401).send({ error: 'Not authenticated' });
  }

  const { id } = request.params;

  try {
    await emailOverrideService.deleteOverride(user.id, id);
    reply.status(204).send();
  } catch (error) {
    request.log.error({ error, overrideId: id }, 'Failed to delete email override');
    reply.status(500).send({ error: 'Failed to delete email override' });
  }
}
