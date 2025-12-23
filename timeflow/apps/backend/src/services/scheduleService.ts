/**
 * Schedule Service
 *
 * Orchestrates smart scheduling by calling the scheduling engine
 * and persisting results to the database and Google Calendar.
 */

import crypto from 'node:crypto';
import {
  scheduleTasks,
  TaskInput,
  CalendarEvent as SchedulerEvent,
  UserPreferences,
  ScheduledBlock,
} from '@timeflow/scheduling';
import type { ApplyScheduleBlock, ApplyScheduleResponse, SchedulePreview } from '@timeflow/shared';
import { prisma } from '../config/prisma.js';
import * as calendarService from './googleCalendarService.js';
import { separateFixedAndMovable } from '../utils/eventClassifier.js';
import {
  hasTimeOverlap,
  isWithinWakeHours,
  validateSchedulePreview,
  type UserPreferences as ValidationPreferences,
} from '../utils/scheduleValidator.js';

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
    dailySchedule: user.dailyScheduleConstraints || user.dailySchedule || null,
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
 * Apply AI-generated schedule blocks for tasks and habits.
 */
export async function applyScheduleBlocks(
  userId: string,
  blocks: ApplyScheduleBlock[]
): Promise<ApplyScheduleResponse> {
  if (!blocks || blocks.length === 0) {
    return { tasksScheduled: 0, habitsScheduled: 0 };
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
  });

  if (!user) {
    throw new Error('User not found');
  }

  const calendarId = user.defaultCalendarId || 'primary';

  const normalizedBlocks = blocks
    .map((block) => {
      if ('taskId' in block && block.taskId) {
        return {
          type: 'task',
          id: block.taskId,
          start: block.start,
          end: block.end,
          title: null,
        };
      }
      if ('habitId' in block && block.habitId) {
        return {
          type: 'habit',
          id: block.habitId,
          start: block.start,
          end: block.end,
          title: block.title ?? null,
        };
      }
      return {
        type: 'unknown',
        id: '',
        start: block.start,
        end: block.end,
        title: null,
      };
    })
    .sort((a, b) => {
      return (
        a.type.localeCompare(b.type) ||
        a.id.localeCompare(b.id) ||
        a.start.localeCompare(b.start) ||
        a.end.localeCompare(b.end) ||
        (a.title ?? '').localeCompare(b.title ?? '')
      );
    });

  const requestHash = crypto
    .createHash('sha256')
    .update(JSON.stringify(normalizedBlocks))
    .digest('hex');

  const existingApplied = await prisma.appliedSchedule.findUnique({
    where: {
      userId_requestHash: {
        userId,
        requestHash,
      },
    },
    select: {
      tasksScheduled: true,
      habitsScheduled: true,
    },
  });

  if (existingApplied) {
    return {
      tasksScheduled: existingApplied.tasksScheduled,
      habitsScheduled: existingApplied.habitsScheduled,
    };
  }

  const taskBlocks = blocks.filter(
    (block): block is { taskId: string; start: string; end: string } => 'taskId' in block
  );
  const habitBlocks = blocks.filter(
    (block): block is { habitId: string; start: string; end: string; title?: string } =>
      'habitId' in block
  );

  const taskIds = Array.from(new Set(taskBlocks.map((block) => block.taskId)));
  const habitIds = Array.from(new Set(habitBlocks.map((block) => block.habitId)));

  if (taskIds.length > 0) {
    const tasks = await prisma.task.findMany({
      where: {
        id: { in: taskIds },
        userId,
      },
      select: { id: true },
    });

    if (tasks.length !== taskIds.length) {
      const foundIds = new Set(tasks.map((task) => task.id));
      const missing = taskIds.filter((id) => !foundIds.has(id));
      throw new Error(`Schedule validation failed: Unknown task IDs: ${missing.join(', ')}`);
    }

    const duplicateTaskIds = taskBlocks.reduce((acc, block) => {
      acc[block.taskId] = (acc[block.taskId] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    const duplicates = Object.entries(duplicateTaskIds)
      .filter(([, count]) => count > 1)
      .map(([id]) => id);
    if (duplicates.length > 0) {
      throw new Error(`Schedule validation failed: Duplicate task blocks: ${duplicates.join(', ')}`);
    }
  }

  let habitMap = new Map<string, { id: string; title: string }>();
  if (habitIds.length > 0) {
    const habits = await prisma.habit.findMany({
      where: {
        id: { in: habitIds },
        userId,
      },
      select: { id: true, title: true },
    });

    if (habits.length !== habitIds.length) {
      const foundIds = new Set(habits.map((habit) => habit.id));
      const missing = habitIds.filter((id) => !foundIds.has(id));
      throw new Error(`Schedule validation failed: Unknown habit IDs: ${missing.join(', ')}`);
    }

    habitMap = new Map(habits.map((habit) => [habit.id, habit]));
  }

  const parsedDates = blocks.map((block) => ({
    start: new Date(block.start),
    end: new Date(block.end),
  }));
  if (parsedDates.some((date) => Number.isNaN(date.start.getTime()) || Number.isNaN(date.end.getTime()))) {
    throw new Error('Schedule validation failed: One or more block timestamps are invalid');
  }

  const rangeStart = new Date(Math.min(...parsedDates.map((date) => date.start.getTime())));
  const rangeEnd = new Date(Math.max(...parsedDates.map((date) => date.end.getTime())));

  const calendarEvents = await calendarService.getEvents(
    userId,
    calendarId,
    rangeStart.toISOString(),
    rangeEnd.toISOString()
  );

  const existingEventKeys = new Set(
    calendarEvents.map((event) => `${event.summary}|${event.start}|${event.end}`)
  );

  const scheduledHabitKeys = new Set<string>();
  if (habitIds.length > 0) {
    const scheduledHabits = await prisma.scheduledHabit.findMany({
      where: {
        userId,
        habitId: { in: habitIds },
        startDateTime: {
          gte: rangeStart,
          lte: rangeEnd,
        },
      },
      select: {
        habitId: true,
        startDateTime: true,
        endDateTime: true,
      },
    });

    scheduledHabits.forEach((habit) => {
      scheduledHabitKeys.add(
        `${habit.habitId}|${habit.startDateTime.toISOString()}|${habit.endDateTime.toISOString()}`
      );
    });
  }

  const userPrefs: ValidationPreferences = {
    wakeTime: user.wakeTime || '08:00',
    sleepTime: user.sleepTime || '23:00',
    timeZone: user.timeZone || 'UTC',
    dailySchedule: user.dailyScheduleConstraints || user.dailySchedule || null,
  };

  if (taskBlocks.length > 0) {
    const preview: SchedulePreview = {
      blocks: taskBlocks.map((block) => ({
        taskId: block.taskId,
        start: block.start,
        end: block.end,
      })),
      summary: '',
      conflicts: [],
      confidence: 'high',
    };

    const validation = validateSchedulePreview(preview, calendarEvents, userPrefs, taskIds);
    const validationIssues = [...validation.errors, ...validation.warnings];
    if (validationIssues.length > 0) {
      throw new Error(`Schedule validation failed: ${validationIssues.join(' | ')}`);
    }
  }

  if (habitBlocks.length > 0) {
    const { fixed: fixedEvents } = separateFixedAndMovable(calendarEvents);
    const habitErrors: string[] = [];

    habitBlocks.forEach((block) => {
      const startDate = new Date(block.start);
      const endDate = new Date(block.end);
      if (Number.isNaN(startDate.getTime()) || Number.isNaN(endDate.getTime())) {
        habitErrors.push(`Invalid habit block time for ${block.habitId}`);
        return;
      }
      if (startDate >= endDate) {
        habitErrors.push(`Habit ${block.habitId} has start time after end time`);
        return;
      }
      const wakeCheck = isWithinWakeHours(block.start, block.end, userPrefs);
      if (!wakeCheck.valid) {
        const reason = wakeCheck.reason || 'violates wake/sleep constraints';
        habitErrors.push(`Habit ${block.habitId}: ${reason}`);
      }
      for (const event of fixedEvents) {
        if (hasTimeOverlap(block.start, block.end, event.start, event.end)) {
          habitErrors.push(`Habit ${block.habitId} overlaps fixed event: ${event.summary}`);
        }
      }
    });

    if (habitErrors.length > 0) {
      throw new Error(`Schedule validation failed: ${habitErrors.join(' | ')}`);
    }
  }

  // Ensure blocks don't overlap each other.
  const flatBlocks = blocks.map((block) => ({
    id: 'taskId' in block ? block.taskId : block.habitId,
    start: block.start,
    end: block.end,
  }));
  for (let i = 0; i < flatBlocks.length; i += 1) {
    for (let j = i + 1; j < flatBlocks.length; j += 1) {
      if (hasTimeOverlap(flatBlocks[i].start, flatBlocks[i].end, flatBlocks[j].start, flatBlocks[j].end)) {
        throw new Error('Schedule validation failed: Overlapping blocks in applied schedule');
      }
    }
  }

  let tasksScheduled = 0;
  for (const block of taskBlocks) {
    await rescheduleTask(userId, block.taskId, block.start, block.end);
    tasksScheduled += 1;
  }

  let habitsScheduled = 0;
  const seenHabitKeys = new Set<string>();
  for (const block of habitBlocks) {
    const habitTitle = block.title || habitMap.get(block.habitId)?.title;
    if (!habitTitle) {
      continue;
    }
    const startIso = new Date(block.start).toISOString();
    const endIso = new Date(block.end).toISOString();
    const habitKey = `${block.habitId}|${startIso}|${endIso}`;
    if (scheduledHabitKeys.has(habitKey) || seenHabitKeys.has(habitKey)) {
      continue;
    }
    const summary = `[TimeFlow Habit] ${habitTitle}`;
    const eventKey = `${summary}|${block.start}|${block.end}`;
    if (existingEventKeys.has(eventKey)) {
      seenHabitKeys.add(habitKey);
      continue;
    }
    const eventId = await calendarService.createEvent(userId, calendarId, {
      summary,
      description: 'Scheduled habit from TimeFlow',
      start: block.start,
      end: block.end,
    });
    await prisma.scheduledHabit.create({
      data: {
        habitId: block.habitId,
        userId,
        provider: 'google',
        calendarId,
        eventId,
        startDateTime: new Date(block.start),
        endDateTime: new Date(block.end),
      },
    });
    habitsScheduled += 1;
    existingEventKeys.add(eventKey);
    scheduledHabitKeys.add(habitKey);
    seenHabitKeys.add(habitKey);
  }

  await prisma.appliedSchedule.create({
    data: {
      userId,
      requestHash,
      blocks: normalizedBlocks,
      tasksScheduled,
      habitsScheduled,
    },
  });

  return { tasksScheduled, habitsScheduled };
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

