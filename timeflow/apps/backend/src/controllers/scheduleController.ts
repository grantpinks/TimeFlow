/**
 * Schedule Controller
 *
 * Handles smart scheduling operations.
 */

import { FastifyRequest, FastifyReply } from 'fastify';
import * as scheduleService from '../services/scheduleService.js';
import { z } from 'zod';
import { formatZodError } from '../utils/errorFormatter.js';

interface ScheduleBody {
  taskIds: string[];
  dateRangeStart: string;
  dateRangeEnd: string;
}

const scheduleRequestSchema = z.object({
  taskIds: z.array(z.string().min(1)).nonempty('taskIds array is required'),
  dateRangeStart: z.string().datetime(),
  dateRangeEnd: z.string().datetime(),
});

/**
 * POST /api/schedule
 * Runs smart scheduling for the specified tasks.
 */
export async function runSchedule(
  request: FastifyRequest<{ Body: ScheduleBody }>,
  reply: FastifyReply
) {
  const user = request.user;
  if (!user) {
    return reply.status(401).send({ error: 'Not authenticated' });
  }

  const parsed = scheduleRequestSchema.safeParse(request.body);
  if (!parsed.success) {
    return reply.status(400).send({ error: formatZodError(parsed.error) });
  }

  const { taskIds, dateRangeStart, dateRangeEnd } = parsed.data;

  try {
    const scheduledBlocks = await scheduleService.scheduleTasksForUser(
      user.id,
      taskIds,
      dateRangeStart,
      dateRangeEnd
    );

    return {
      scheduled: scheduledBlocks.length,
      blocks: scheduledBlocks,
    };
  } catch (error) {
    request.log.error(error, 'Scheduling failed');
    return reply.status(500).send({ error: 'Scheduling failed' });
  }
}

interface RescheduleBody {
  startDateTime: string;
  endDateTime: string;
}

const rescheduleSchema = z.object({
  startDateTime: z.string().datetime(),
  endDateTime: z.string().datetime(),
});

/**
 * PATCH /api/schedule/:taskId
 * Manually reschedules a task.
 */
export async function rescheduleTask(
  request: FastifyRequest<{ Params: { taskId: string }; Body: RescheduleBody }>,
  reply: FastifyReply
) {
  const user = request.user;
  if (!user) {
    return reply.status(401).send({ error: 'Not authenticated' });
  }

  const { taskId } = request.params;

  const parsed = rescheduleSchema.safeParse(request.body);
  if (!parsed.success) {
    return reply.status(400).send({ error: formatZodError(parsed.error) });
  }

  const { startDateTime, endDateTime } = parsed.data;

  try {
    await scheduleService.rescheduleTask(user.id, taskId, startDateTime, endDateTime);
    return { success: true };
  } catch (error) {
    request.log.error(error, 'Reschedule failed');
    return reply.status(500).send({ error: 'Reschedule failed' });
  }
}

