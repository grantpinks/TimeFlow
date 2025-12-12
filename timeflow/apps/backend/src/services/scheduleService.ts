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
    dailySchedule: user.dailySchedule as any || null,
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
 * Handles both already-scheduled tasks (update) and unscheduled tasks (create schedule).
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

  const calendarId = user.defaultCalendarId || 'primary';

  // Fetch task with existing scheduled task (if any)
  const task = await prisma.task.findFirst({
    where: { id: taskId, userId },
    include: { scheduledTask: true },
  });

  if (!task) {
    throw new Error('Task not found');
  }

  if (task.scheduledTask) {
    // Task is already scheduled - update existing schedule
    await calendarService.updateEvent(
      userId,
      task.scheduledTask.calendarId,
      task.scheduledTask.eventId,
      {
        start: startDateTime,
        end: endDateTime,
      }
    );

    await prisma.scheduledTask.update({
      where: { taskId },
      data: {
        startDateTime: new Date(startDateTime),
        endDateTime: new Date(endDateTime),
        lastSyncedAt: new Date(),
      },
    });
  } else {
    // Task is unscheduled - create new schedule
    const eventId = await calendarService.createEvent(userId, calendarId, {
      summary: `[TimeFlow] ${task.title}`,
      description: task.description || undefined,
      start: startDateTime,
      end: endDateTime,
    });

    await prisma.scheduledTask.create({
      data: {
        taskId,
        provider: 'google',
        calendarId,
        eventId,
        startDateTime: new Date(startDateTime),
        endDateTime: new Date(endDateTime),
        overflowedDeadline: false,
      },
    });

    // Update task status to scheduled
    await prisma.task.update({
      where: { id: taskId },
      data: { status: 'scheduled' },
    });
  }
}

