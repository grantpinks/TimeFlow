/**
 * Tasks Service
 *
 * Business logic for task CRUD operations.
 */

import { prisma } from '../config/prisma.js';

export interface CreateTaskInput {
  userId: string;
  title: string;
  description?: string;
  durationMinutes?: number;
  priority?: number;
  categoryId?: string;
  dueDate?: Date;
  sourceEmailId?: string;
  sourceThreadId?: string;
  sourceEmailProvider?: string;
  sourceEmailUrl?: string;
}

export interface UpdateTaskInput {
  title?: string;
  description?: string;
  durationMinutes?: number;
  priority?: number;
  categoryId?: string;
  dueDate?: Date;
  status?: string;
  sourceEmailId?: string;
  sourceThreadId?: string;
  sourceEmailProvider?: string;
  sourceEmailUrl?: string;
}

/**
 * Get all tasks for a user, optionally filtered by status.
 */
export async function getTasks(userId: string, status?: string) {
  const where: { userId: string; status?: string } = { userId };
  if (status) {
    where.status = status;
  }

  return prisma.task.findMany({
    where,
    include: {
      scheduledTask: true,
      category: true,
    },
    orderBy: [{ dueDate: 'asc' }, { priority: 'asc' }, { createdAt: 'desc' }],
  });
}

/**
 * Get a single task by ID (must belong to user).
 */
export async function getTaskById(taskId: string, userId: string) {
  return prisma.task.findFirst({
    where: { id: taskId, userId },
    include: {
      scheduledTask: true,
      category: true,
    },
  });
}

/**
 * Create a new task.
 */
export async function createTask(input: CreateTaskInput) {
  return prisma.task.create({
    data: {
      userId: input.userId,
      title: input.title,
      description: input.description,
      durationMinutes: input.durationMinutes ?? 30,
      priority: input.priority ?? 2,
      categoryId: input.categoryId,
      dueDate: input.dueDate,
      status: 'unscheduled',
      sourceEmailId: input.sourceEmailId,
      sourceThreadId: input.sourceThreadId,
      sourceEmailProvider: input.sourceEmailProvider,
      sourceEmailUrl: input.sourceEmailUrl,
    },
    include: {
      category: true,
    },
  });
}

/**
 * Update an existing task.
 */
export async function updateTask(
  taskId: string,
  userId: string,
  input: UpdateTaskInput
) {
  // Ensure task belongs to user and get current state
  const existing = await prisma.task.findFirst({
    where: { id: taskId, userId },
    include: { scheduledTask: true },
  });

  if (!existing) {
    return null;
  }

  // Handle calendar sync for status changes
  if (input.status) {
    // If changing from scheduled to unscheduled, delete calendar event
    if (existing.status === 'scheduled' && input.status === 'unscheduled' && existing.scheduledTask) {
      try {
        const { deleteEvent } = await import('./googleCalendarService.js');
        await deleteEvent(
          userId,
          existing.scheduledTask.calendarId,
          existing.scheduledTask.eventId
        );
        console.log(`Deleted calendar event ${existing.scheduledTask.eventId} for unscheduled task ${taskId}`);
      } catch (error) {
        console.error('Failed to delete calendar event on unschedule:', error);
        // Continue with task update even if calendar deletion fails
      }

      // Delete the scheduled task record
      await prisma.scheduledTask.delete({
        where: { taskId },
      });
    }
  }

  // Handle calendar sync for scheduled task updates (when not changing status)
  if (!input.status && existing.status === 'scheduled' && existing.scheduledTask) {
    // Check if any fields that affect the calendar event are being updated
    const needsCalendarUpdate =
      input.title !== undefined ||
      input.description !== undefined ||
      input.durationMinutes !== undefined;

    if (needsCalendarUpdate) {
      try {
        const { updateEvent } = await import('./googleCalendarService.js');

        // Calculate new start/end times if duration changed
        let newStart: string | undefined;
        let newEnd: string | undefined;

        if (input.durationMinutes !== undefined) {
          const startTime = new Date(existing.scheduledTask.startDateTime);
          const endTime = new Date(startTime);
          endTime.setMinutes(endTime.getMinutes() + input.durationMinutes);

          newStart = startTime.toISOString();
          newEnd = endTime.toISOString();
        }

        await updateEvent(
          userId,
          existing.scheduledTask.calendarId,
          existing.scheduledTask.eventId,
          {
            summary: input.title,
            description: input.description,
            start: newStart,
            end: newEnd,
          }
        );
        console.log(`Updated calendar event ${existing.scheduledTask.eventId} for task ${taskId}`);
      } catch (error) {
        console.error('Failed to update calendar event:', error);
        // Continue with task update even if calendar sync fails
      }

      // Update scheduled task end time if duration changed
      if (input.durationMinutes !== undefined) {
        const startTime = new Date(existing.scheduledTask.startDateTime);
        const endTime = new Date(startTime);
        endTime.setMinutes(endTime.getMinutes() + input.durationMinutes);

        await prisma.scheduledTask.update({
          where: { taskId },
          data: { endDateTime: endTime },
        });
      }
    }
  }

  return prisma.task.update({
    where: { id: taskId },
    data: input,
    include: {
      scheduledTask: true,
      category: true,
    },
  });
}

/**
 * Delete a task.
 */
export async function deleteTask(taskId: string, userId: string) {
  const existing = await prisma.task.findFirst({
    where: { id: taskId, userId },
    include: { scheduledTask: true },
  });

  if (!existing) {
    return false;
  }

  // If task is scheduled, delete the Google Calendar event first
  if (existing.scheduledTask) {
    try {
      const { deleteEvent } = await import('./googleCalendarService.js');
      await deleteEvent(
        userId,
        existing.scheduledTask.calendarId,
        existing.scheduledTask.eventId
      );
    } catch (error) {
      // Log but don't fail if calendar event deletion fails
      console.error('Failed to delete calendar event:', error);
    }
  }

  // Delete related scheduled task record
  await prisma.scheduledTask.deleteMany({
    where: { taskId },
  });

  // Delete the task
  await prisma.task.delete({
    where: { id: taskId },
  });

  return true;
}

/**
 * Mark a task as completed.
 */
export async function completeTask(taskId: string, userId: string) {
  const existing = await prisma.task.findFirst({
    where: { id: taskId, userId },
  });

  if (!existing) {
    return null;
  }

  return prisma.task.update({
    where: { id: taskId },
    data: { status: 'completed' },
  });
}
