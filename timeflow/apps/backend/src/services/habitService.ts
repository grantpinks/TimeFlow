/**
 * Habit Service
 *
 * Business logic for habit CRUD operations.
 */

import { prisma } from '../config/prisma.js';
import type { Prisma } from '@prisma/client';

export interface CreateHabitInput {
  userId: string;
  title: string;
  description?: string;
  frequency: string;
  daysOfWeek?: string[];
  preferredTimeOfDay?: string;
  durationMinutes?: number;
  /** FK to Identity — drives identity progress when habit instances complete */
  identityId?: string | null;
  /** Legacy free-text label; ignored when identityId is set (synced from Identity.name) */
  identity?: string | null;
  longTermGoal?: string | null;
  whyStatement?: string | null;
}

export interface UpdateHabitInput {
  title?: string;
  description?: string;
  frequency?: string;
  daysOfWeek?: string[];
  preferredTimeOfDay?: string;
  durationMinutes?: number;
  isActive?: boolean;
  identityId?: string | null;
  identity?: string | null;
  longTermGoal?: string | null;
  whyStatement?: string | null;
}

/**
 * Get all habits for a user.
 */
export async function getHabits(userId: string) {
  return prisma.habit.findMany({
    where: { userId },
    orderBy: [{ isActive: 'desc' }, { createdAt: 'desc' }],
    include: {
      identityModel: { select: { id: true, name: true, color: true, icon: true } },
    },
  });
}

/**
 * Get a single habit by ID (must belong to user).
 */
export async function getHabitById(habitId: string, userId: string) {
  return prisma.habit.findFirst({
    where: { id: habitId, userId },
  });
}

/**
 * Create a new habit.
 */
export async function createHabit(input: CreateHabitInput) {
  let identityId: string | null = input.identityId ?? null;
  let identityStr: string | null = input.identity?.trim() || null;

  if (identityId) {
    const idRow = await prisma.identity.findFirst({
      where: { id: identityId, userId: input.userId },
      select: { id: true, name: true },
    });
    if (!idRow) {
      throw new Error('INVALID_IDENTITY_ID');
    }
    identityStr = idRow.name;
  } else {
    identityId = null;
  }

  return prisma.habit.create({
    data: {
      userId: input.userId,
      title: input.title,
      description: input.description,
      frequency: input.frequency,
      daysOfWeek: input.daysOfWeek || [],
      preferredTimeOfDay: input.preferredTimeOfDay,
      durationMinutes: input.durationMinutes ?? 30,
      isActive: true,
      identityId,
      identity: identityStr,
      longTermGoal: input.longTermGoal?.trim() || null,
      whyStatement: input.whyStatement?.trim() || null,
    },
    include: {
      identityModel: { select: { id: true, name: true, color: true, icon: true } },
    },
  });
}

/**
 * Update an existing habit.
 */
export async function updateHabit(habitId: string, userId: string, input: UpdateHabitInput) {
  const existing = await prisma.habit.findFirst({
    where: { id: habitId, userId },
  });

  if (!existing) {
    return null;
  }

  const data: Prisma.HabitUpdateInput = {};

  if (input.title !== undefined) data.title = input.title;
  if (input.description !== undefined) data.description = input.description;
  if (input.frequency !== undefined) data.frequency = input.frequency;
  if (input.daysOfWeek !== undefined) data.daysOfWeek = input.daysOfWeek;
  if (input.preferredTimeOfDay !== undefined) data.preferredTimeOfDay = input.preferredTimeOfDay;
  if (input.durationMinutes !== undefined) data.durationMinutes = input.durationMinutes;
  if (input.isActive !== undefined) data.isActive = input.isActive;

  if (input.longTermGoal !== undefined) {
    data.longTermGoal = input.longTermGoal?.trim() || null;
  }
  if (input.whyStatement !== undefined) {
    data.whyStatement = input.whyStatement?.trim() || null;
  }

  if (input.identityId !== undefined) {
    if (input.identityId === null) {
      data.identityId = null;
      data.identity = null;
    } else {
      const idRow = await prisma.identity.findFirst({
        where: { id: input.identityId, userId },
        select: { id: true, name: true },
      });
      if (!idRow) {
        throw new Error('INVALID_IDENTITY_ID');
      }
      data.identityId = idRow.id;
      data.identity = idRow.name;
    }
  } else if (input.identity !== undefined) {
    data.identity = input.identity?.trim() || null;
  }

  return prisma.habit.update({
    where: { id: habitId },
    data,
    include: {
      identityModel: { select: { id: true, name: true, color: true, icon: true } },
    },
  });
}

/**
 * Delete a habit.
 */
export async function deleteHabit(habitId: string, userId: string) {
  const existing = await prisma.habit.findFirst({
    where: { id: habitId, userId },
  });

  if (!existing) {
    return false;
  }

  await prisma.habit.delete({
    where: { id: habitId },
  });

  return true;
}
