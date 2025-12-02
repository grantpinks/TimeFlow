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
  dueDate?: Date;
}

export interface UpdateTaskInput {
  title?: string;
  description?: string;
  durationMinutes?: number;
  priority?: number;
  dueDate?: Date;
  status?: string;
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
    include: { scheduledTask: true },
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
      dueDate: input.dueDate,
      status: 'unscheduled',
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
  // Ensure task belongs to user
  const existing = await prisma.task.findFirst({
    where: { id: taskId, userId },
  });

  if (!existing) {
    return null;
  }

  return prisma.task.update({
    where: { id: taskId },
    data: input,
  });
}

/**
 * Delete a task.
 */
export async function deleteTask(taskId: string, userId: string) {
  const existing = await prisma.task.findFirst({
    where: { id: taskId, userId },
  });

  if (!existing) {
    return false;
  }

  // Delete related scheduled task first if exists
  await prisma.scheduledTask.deleteMany({
    where: { taskId },
  });

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

