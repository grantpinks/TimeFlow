/**
 * Scheduling Link Controller
 *
 * Handles CRUD operations for scheduling links.
 */

import { FastifyRequest, FastifyReply } from 'fastify';
import * as schedulingLinkService from '../services/schedulingLinkService.js';
import { z } from 'zod';
import type {} from '../types/context.js';

/**
 * Format Zod validation errors
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

const createSchedulingLinkSchema = z.object({
  name: z.string().min(1),
  durationsMinutes: z.array(z.number().positive()).min(1),
  bufferBeforeMinutes: z.number().min(0).optional(),
  bufferAfterMinutes: z.number().min(0).optional(),
  maxBookingHorizonDays: z.number().positive().optional(),
  dailyCap: z.number().positive().optional(),
  calendarProvider: z.enum(['google', 'apple']),
  calendarId: z.string().min(1),
  googleMeetEnabled: z.boolean().optional(),
});

const updateSchedulingLinkSchema = z.object({
  name: z.string().min(1).optional(),
  durationsMinutes: z.array(z.number().positive()).min(1).optional(),
  bufferBeforeMinutes: z.number().min(0).optional(),
  bufferAfterMinutes: z.number().min(0).optional(),
  maxBookingHorizonDays: z.number().positive().optional(),
  dailyCap: z.number().positive().optional(),
  calendarProvider: z.enum(['google', 'apple']).optional(),
  calendarId: z.string().min(1).optional(),
  googleMeetEnabled: z.boolean().optional(),
});

/**
 * GET /api/scheduling-links
 */
export async function getSchedulingLinks(request: FastifyRequest, reply: FastifyReply) {
  const user = request.user;
  if (!user) {
    return reply.status(401).send({ error: 'Not authenticated' });
  }

  const links = await schedulingLinkService.getSchedulingLinks(user.id);
  reply.send(links);
}

/**
 * POST /api/scheduling-links
 */
export async function createSchedulingLink(request: FastifyRequest, reply: FastifyReply) {
  const user = request.user;
  if (!user) {
    return reply.status(401).send({ error: 'Not authenticated' });
  }

  try {
    const data = createSchedulingLinkSchema.parse(request.body);
    const link = await schedulingLinkService.createSchedulingLink(user.id, data);
    reply.status(201).send(link);
  } catch (error) {
    if (error instanceof z.ZodError) {
      reply.status(400).send({ error: formatZodError(error) });
    } else {
      throw error;
    }
  }
}

/**
 * PATCH /api/scheduling-links/:id
 */
export async function updateSchedulingLink(request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) {
  const user = request.user;
  if (!user) {
    return reply.status(401).send({ error: 'Not authenticated' });
  }

  const { id } = request.params;

  try {
    const data = updateSchedulingLinkSchema.parse(request.body);
    const link = await schedulingLinkService.updateSchedulingLink(id, user.id, data);

    if (!link) {
      reply.status(404).send({ error: 'Scheduling link not found' });
      return;
    }

    reply.send(link);
  } catch (error) {
    if (error instanceof z.ZodError) {
      reply.status(400).send({ error: formatZodError(error) });
    } else {
      throw error;
    }
  }
}

/**
 * POST /api/scheduling-links/:id/pause
 */
export async function pauseSchedulingLink(request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) {
  const user = request.user;
  if (!user) {
    return reply.status(401).send({ error: 'Not authenticated' });
  }

  const { id } = request.params;

  const success = await schedulingLinkService.pauseSchedulingLink(id, user.id);

  if (!success) {
    reply.status(404).send({ error: 'Scheduling link not found' });
    return;
  }

  reply.send({ success: true });
}

/**
 * POST /api/scheduling-links/:id/resume
 */
export async function resumeSchedulingLink(request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) {
  const user = request.user;
  if (!user) {
    return reply.status(401).send({ error: 'Not authenticated' });
  }

  const { id } = request.params;

  const success = await schedulingLinkService.resumeSchedulingLink(id, user.id);

  if (!success) {
    reply.status(404).send({ error: 'Scheduling link not found' });
    return;
  }

  reply.send({ success: true });
}

/**
 * DELETE /api/scheduling-links/:id
 */
export async function deleteSchedulingLink(request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) {
  const user = request.user;
  if (!user) {
    return reply.status(401).send({ error: 'Not authenticated' });
  }

  const { id } = request.params;

  const success = await schedulingLinkService.deleteSchedulingLink(id, user.id);

  if (!success) {
    reply.status(404).send({ error: 'Scheduling link not found' });
    return;
  }

  reply.status(204).send();
}
