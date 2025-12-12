/**
 * Habit Service
 *
 * Business logic for habit CRUD operations.
 * Note: Scheduling integration will come in a future sprint.
 */

import { prisma } from '../config/prisma.js';

export interface CreateHabitInput {
  userId: string;
  title: string;
  description?: string;
  frequency: string; // 'daily' | 'weekly' | 'custom'
  daysOfWeek?: string[]; // ['mon', 'tue', 'wed'] for weekly habits
  preferredTimeOfDay?: string; // 'morning' | 'afternoon' | 'evening'
  durationMinutes?: number;
}

export interface UpdateHabitInput {
  title?: string;
  description?: string;
  frequency?: string;
  daysOfWeek?: string[];
  preferredTimeOfDay?: string;
  durationMinutes?: number;
  isActive?: boolean;
}

/**
 * Get all habits for a user.
 */
export async function getHabits(userId: string) {
  return prisma.habit.findMany({
    where: { userId },
    orderBy: [{ isActive: 'desc' }, { createdAt: 'desc' }],
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
    },
  });
}

/**
 * Update an existing habit.
 */
export async function updateHabit(
  habitId: string,
  userId: string,
  input: UpdateHabitInput
) {
  // Ensure habit belongs to user
  const existing = await prisma.habit.findFirst({
    where: { id: habitId, userId },
  });

  if (!existing) {
    return null;
  }

  return prisma.habit.update({
    where: { id: habitId },
    data: input,
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
