import { FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';
import { formatZodError } from '../utils/errorFormatter.js';
import * as trainingService from '../services/categoryTrainingService.js';

const trainingSchema = z.object({
  description: z.string().max(500).optional(),
  includeKeywords: z.array(z.string().min(1)).min(1),
  excludeKeywords: z.array(z.string().min(1)).optional(),
  exampleEventIds: z.array(z.string()).optional(),
  exampleEventsSnapshot: z
    .array(
      z.object({
        eventId: z.string(),
        summary: z.string(),
        description: z.string().optional(),
        start: z.string(),
        end: z.string(),
        attendeeDomains: z.array(z.string()).optional(),
        calendarId: z.string().optional(),
        provider: z.string().optional(),
      })
    )
    .optional(),
});

export async function getCategoryTraining(
  request: FastifyRequest<{ Params: { id: string } }>,
  reply: FastifyReply
) {
  const userId = request.user?.id;
  if (!userId) {
    return reply.code(401).send({ error: 'Unauthorized' });
  }

  const profile = await trainingService.getTrainingProfile(userId, request.params.id);
  return reply.send(profile || null);
}

export async function upsertCategoryTraining(
  request: FastifyRequest<{ Params: { id: string }; Body: unknown }>,
  reply: FastifyReply
) {
  const userId = request.user?.id;
  if (!userId) {
    return reply.code(401).send({ error: 'Unauthorized' });
  }

  const parsed = trainingSchema.safeParse(request.body);
  if (!parsed.success) {
    return reply.code(400).send({ error: formatZodError(parsed.error) });
  }

  const profile = await trainingService.upsertTrainingProfile(userId, request.params.id, parsed.data);
  return reply.send(profile);
}
