/**
 * Schedule Controller
 *
 * Handles smart scheduling operations.
 */

import { FastifyRequest, FastifyReply } from 'fastify';
import * as scheduleService from '../services/scheduleService.js';

interface ScheduleBody {
  taskIds: string[];
  dateRangeStart: string;
  dateRangeEnd: string;
}

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

  const { taskIds, dateRangeStart, dateRangeEnd } = request.body;

  if (!taskIds || !Array.isArray(taskIds) || taskIds.length === 0) {
    return reply.status(400).send({ error: 'taskIds array is required' });
  }

  if (!dateRangeStart || !dateRangeEnd) {
    return reply.status(400).send({ error: 'dateRangeStart and dateRangeEnd are required' });
  }

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
  const { startDateTime, endDateTime } = request.body;

  if (!startDateTime || !endDateTime) {
    return reply.status(400).send({ error: 'startDateTime and endDateTime are required' });
  }

  try {
    await scheduleService.rescheduleTask(user.id, taskId, startDateTime, endDateTime);
    return { success: true };
  } catch (error) {
    request.log.error(error, 'Reschedule failed');
    return reply.status(500).send({ error: 'Reschedule failed' });
  }
}

