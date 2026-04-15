/**
 * User rest-day endpoints
 */

import { FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';
import { formatZodError } from '../utils/errorFormatter.js';
import { prisma } from '../config/prisma.js';
import * as userRestDayService from '../services/userRestDayService.js';

const addSchema = z.object({
  localDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  reason: z.enum(['sick', 'travel', 'rest', 'other']).optional().default('rest'),
});

export async function listRestDays(request: FastifyRequest, reply: FastifyReply) {
  const userId = (request.user as { id: string }).id;
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { timeZone: true } });
  const rows = await userRestDayService.listRestDays(userId);
  const usedInWindow = await userRestDayService.countRestDaysInRolling30(
    userId,
    user?.timeZone ?? 'America/Chicago'
  );
  return reply.send({ restDays: rows, restDaysUsedInRolling30: usedInWindow, restDaysLimit: 2 });
}

export async function addRestDay(request: FastifyRequest, reply: FastifyReply) {
  const userId = (request.user as { id: string }).id;
  const parsed = addSchema.safeParse(request.body);
  if (!parsed.success) {
    return reply.status(400).send({ error: formatZodError(parsed.error) });
  }

  const u = await prisma.user.findUnique({ where: { id: userId }, select: { timeZone: true } });
  const tz = u?.timeZone ?? 'America/Chicago';

  try {
    const row = await userRestDayService.addRestDay(
      userId,
      parsed.data.localDate,
      parsed.data.reason,
      tz
    );
    return reply.status(201).send({ restDay: row });
  } catch (e) {
    const msg = e instanceof Error ? e.message : '';
    if (msg === 'REST_DAY_LIMIT') {
      return reply.status(400).send({
        error: 'You can mark at most 2 rest days in any rolling 30-day window.',
      });
    }
    if (msg === 'INVALID_DATE') {
      return reply.status(400).send({ error: 'Invalid date' });
    }
    throw e;
  }
}

export async function deleteRestDay(
  request: FastifyRequest<{ Querystring: { localDate?: string } }>,
  reply: FastifyReply
) {
  const userId = (request.user as { id: string }).id;
  const localDate = request.query.localDate;
  if (!localDate || !/^\d{4}-\d{2}-\d{2}$/.test(localDate)) {
    return reply.status(400).send({ error: 'localDate query (YYYY-MM-DD) required' });
  }
  const ok = await userRestDayService.deleteRestDay(userId, localDate);
  if (!ok) return reply.status(404).send({ error: 'Not found' });
  return reply.send({ success: true });
}
