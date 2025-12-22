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

interface ApplyScheduleBody {
  blocks: Array<{
    taskId?: string;
    habitId?: string;
    title?: string;
    start: string;
    end: string;
  }>;
}

const applyScheduleSchema = z.object({
  blocks: z.array(
    z
      .object({
        taskId: z.string().optional(),
        habitId: z.string().optional(),
        title: z.string().optional(),
        start: z.string().datetime(),
        end: z.string().datetime(),
      })
      .refine(
        (block) =>
          (block.taskId && !block.habitId) || (!block.taskId && block.habitId),
        { message: 'Each block must include either taskId or habitId' }
      )
  ),
});

/**
 * POST /api/schedule/apply
 * Apply an AI-generated schedule preview.
 */
export async function applySchedule(
  request: FastifyRequest<{ Body: ApplyScheduleBody }>,
  reply: FastifyReply
) {
  const user = request.user;
  if (!user) {
    return reply.status(401).send({ error: 'Not authenticated' });
  }

  const parsed = applyScheduleSchema.safeParse(request.body);
  if (!parsed.success) {
    return reply.status(400).send({ error: formatZodError(parsed.error) });
  }

  const { blocks } = parsed.data;

  try {
    const result = await scheduleService.applyScheduleBlocks(user.id, blocks);
    return result;
  } catch (error) {
    request.log.error(error, 'Apply schedule failed');
    if (error instanceof Error && error.message.startsWith('Schedule validation failed')) {
      return reply.status(400).send({ error: error.message });
    }
    return reply.status(500).send({ error: 'Apply schedule failed' });
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

