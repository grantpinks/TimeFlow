/**
 * Schedule Service
 *
 * Orchestrates smart scheduling by calling the scheduling engine
 * and persisting results to the database and Google Calendar.
 */

import {
  scheduleTasks,
  TaskInput,
  CalendarEvent as SchedulerEvent,
  UserPreferences,
  ScheduledBlock,
} from '@timeflow/scheduling';
import { prisma } from '../config/prisma.js';
import * as calendarService from './googleCalendarService.js';

/**
 * Run smart scheduling for the given tasks.
 */
export async function scheduleTasksForUser(
  userId: string,
  taskIds: string[],
  dateRangeStart: string,
  dateRangeEnd: string
): Promise<ScheduledBlock[]> {
  // 1. Fetch user preferences
  const user = await prisma.user.findUnique({
    where: { id: userId },
  });

  if (!user) {
    throw new Error('User not found');
  }

  const calendarId = user.defaultCalendarId || 'primary';

  // 2. Fetch tasks
  const tasks = await prisma.task.findMany({
    where: {
      id: { in: taskIds },
      userId,
    },
  });

  if (tasks.length === 0) {
    return [];
  }

  // 3. Fetch existing calendar events
  const existingEvents = await calendarService.getEvents(
    userId,
    calendarId,
    dateRangeStart,
    dateRangeEnd
  );

  // 4. Prepare inputs for scheduling engine
  const taskInputs: TaskInput[] = tasks.map((t) => ({
    id: t.id,
    durationMinutes: t.durationMinutes,
    priority: t.priority as 1 | 2 | 3,
    dueDate: t.dueDate?.toISOString(),
  }));

  const schedulerEvents: SchedulerEvent[] = existingEvents.map((e) => ({
    id: e.id,
    start: e.start,
    end: e.end,
  }));

  const preferences: UserPreferences = {
    timeZone: user.timeZone || 'UTC',
    wakeTime: user.wakeTime || '08:00',
    sleepTime: user.sleepTime || '23:00',
  };

  // 5. Run scheduling algorithm
  const scheduledBlocks = scheduleTasks(
    taskInputs,
    schedulerEvents,
    preferences,
    dateRangeStart,
    dateRangeEnd
  );

  // 6. Create Google Calendar events and persist ScheduledTask records
  for (const block of scheduledBlocks) {
    const task = tasks.find((t) => t.id === block.taskId);
    if (!task) continue;

    // Create calendar event
    const eventId = await calendarService.createEvent(userId, calendarId, {
      summary: `[TimeFlow] ${task.title}`,
      description: task.description || undefined,
      start: block.start,
      end: block.end,
    });

    // Upsert ScheduledTask record
    await prisma.scheduledTask.upsert({
      where: { taskId: block.taskId },
      update: {
        calendarId,
        eventId,
        startDateTime: new Date(block.start),
        endDateTime: new Date(block.end),
        overflowedDeadline: block.overflowedDeadline || false,
        lastSyncedAt: new Date(),
      },
      create: {
        taskId: block.taskId,
        provider: 'google',
        calendarId,
        eventId,
        startDateTime: new Date(block.start),
        endDateTime: new Date(block.end),
        overflowedDeadline: block.overflowedDeadline || false,
      },
    });

    // Update task status
    await prisma.task.update({
      where: { id: block.taskId },
      data: { status: 'scheduled' },
    });
  }

  return scheduledBlocks;
}

/**
 * Manually reschedule a single task.
 */
export async function rescheduleTask(
  userId: string,
  taskId: string,
  startDateTime: string,
  endDateTime: string
): Promise<void> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
  });

  if (!user) {
    throw new Error('User not found');
  }

  const scheduledTask = await prisma.scheduledTask.findUnique({
    where: { taskId },
    include: { task: true },
  });

  if (!scheduledTask || scheduledTask.task.userId !== userId) {
    throw new Error('Scheduled task not found');
  }

  // Update Google Calendar event
  await calendarService.updateEvent(
    userId,
    scheduledTask.calendarId,
    scheduledTask.eventId,
    {
      start: startDateTime,
      end: endDateTime,
    }
  );

  // Update database record
  await prisma.scheduledTask.update({
    where: { taskId },
    data: {
      startDateTime: new Date(startDateTime),
      endDateTime: new Date(endDateTime),
      lastSyncedAt: new Date(),
    },
  });
}

