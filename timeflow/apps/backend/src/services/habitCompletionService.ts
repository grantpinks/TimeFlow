/**
 * Habit Completion Service
 * Handles marking habits complete, skipping, and undo operations
 */

import type { HabitCompletion } from '@prisma/client';
import { prisma } from '../config/prisma.js';
import { HabitSkipReason } from '@timeflow/shared';
import * as identityEngagementService from './identityEngagementService.js';

/**
 * Mark a scheduled habit as complete
 * - Idempotent: marking complete twice = no-op (returns existing)
 * - If existing skip → overwrite to completed
 * - Creates HabitActionHistory for undo (24h expiry)
 * @param actualDurationMinutes - Optional actual time spent on the habit
 */
export async function markScheduledHabitComplete(
  userId: string,
  scheduledHabitId: string,
  actualDurationMinutes?: number
): Promise<{
  completion: HabitCompletion;
  identityEngagement: identityEngagementService.RecordCompletionResult | null;
}> {
  // Verify scheduled habit belongs to user
  const scheduledHabit = await prisma.scheduledHabit.findFirst({
    where: { id: scheduledHabitId, userId },
  });

  if (!scheduledHabit) {
    throw new Error('Scheduled habit not found or does not belong to user');
  }

  const alreadyDone = await prisma.habitCompletion.findUnique({
    where: { scheduledHabitId },
  });
  if (alreadyDone?.status === 'completed') {
    return { completion: alreadyDone, identityEngagement: null };
  }

  let recordIdentityEngagement = false;

  // Use transaction for atomicity
  const completion = await prisma.$transaction(async (tx) => {
    // Check if completion already exists
    const existing = await tx.habitCompletion.findUnique({
      where: { scheduledHabitId },
    });

    if (existing) {
      // If was skipped, update to completed and record history
      const previousState = {
        status: existing.status,
        reasonCode: existing.reasonCode,
      };

      const updated = await tx.habitCompletion.update({
        where: { scheduledHabitId },
        data: {
          status: 'completed',
          reasonCode: null,
          completedAt: new Date(),
          actualDurationMinutes: actualDurationMinutes ?? undefined,
        },
      });

      // Create undo history
      await tx.habitActionHistory.create({
        data: {
          userId,
          actionType: 'complete',
          entityId: scheduledHabitId,
          previousState,
          newState: { status: 'completed' },
          expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24h from now
        },
      });

      recordIdentityEngagement = true;
      return updated;
    }

    // Create new completion
    const created = await tx.habitCompletion.create({
      data: {
        userId,
        habitId: scheduledHabit.habitId,
        scheduledHabitId,
        status: 'completed',
        actualDurationMinutes: actualDurationMinutes ?? undefined,
      },
    });

    // Create undo history
    await tx.habitActionHistory.create({
      data: {
        userId,
        actionType: 'complete',
        entityId: scheduledHabitId,
        previousState: null, // Was not completed before
        newState: { status: 'completed' },
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24h from now
      },
    });

    recordIdentityEngagement = true;
    return created;
  });

  let identityEngagement: identityEngagementService.RecordCompletionResult | null = null;
  if (recordIdentityEngagement) {
    const habit = await prisma.habit.findUnique({
      where: { id: scheduledHabit.habitId },
      select: { identityId: true },
    });
    if (habit?.identityId) {
      identityEngagement = await identityEngagementService.recordIdentityCompletion(
        userId,
        habit.identityId
      );
    }
  }

  return { completion, identityEngagement };
}

/**
 * Undo a completed or skipped habit
 * - Checks HabitActionHistory for undo window (< 24h)
 * - Deletes HabitCompletion record
 */
export async function undoScheduledHabitComplete(
  userId: string,
  scheduledHabitId: string
) {
  // Verify scheduled habit belongs to user
  const scheduledHabit = await prisma.scheduledHabit.findFirst({
    where: { id: scheduledHabitId, userId },
  });

  if (!scheduledHabit) {
    throw new Error('Scheduled habit not found or does not belong to user');
  }

  const txResult = await prisma.$transaction(async (tx) => {
    // Find most recent action history for this scheduled habit
    const history = await tx.habitActionHistory.findFirst({
      where: {
        userId,
        entityId: scheduledHabitId,
        expiresAt: { gt: new Date() }, // Not expired
      },
      orderBy: { createdAt: 'desc' },
    });

    if (!history) {
      throw new Error('Undo window expired (>24h) or no action found');
    }

    const completionRow = await tx.habitCompletion.findUnique({
      where: { scheduledHabitId },
    });
    const wasCompleted = completionRow?.status === 'completed';

    // Delete the completion
    await tx.habitCompletion.delete({
      where: { scheduledHabitId },
    });

    // Delete the action history (undo consumed)
    await tx.habitActionHistory.delete({
      where: { id: history.id },
    });

    return { wasCompleted, habitId: scheduledHabit.habitId };
  });

  if (txResult.wasCompleted) {
    const habit = await prisma.habit.findUnique({
      where: { id: txResult.habitId },
      select: { identityId: true },
    });
    if (habit?.identityId) {
      await identityEngagementService.revokeIdentityCompletion(userId, habit.identityId);
    }
  }

  return { success: true };
}

/**
 * Skip a scheduled habit with a reason
 * - Validates reasonCode is from HabitSkipReason enum
 * - If existing completion → overwrite to skipped
 * - Creates HabitActionHistory for undo (24h expiry)
 */
export async function skipScheduledHabit(
  userId: string,
  scheduledHabitId: string,
  reasonCode: HabitSkipReason
) {
  // Validate reasonCode
  if (!Object.values(HabitSkipReason).includes(reasonCode)) {
    throw new Error(`Invalid reason code: ${reasonCode}`);
  }

  // Verify scheduled habit belongs to user
  const scheduledHabit = await prisma.scheduledHabit.findFirst({
    where: { id: scheduledHabitId, userId },
  });

  if (!scheduledHabit) {
    throw new Error('Scheduled habit not found or does not belong to user');
  }

  return await prisma.$transaction(async (tx) => {
    // Check if completion already exists
    const existing = await tx.habitCompletion.findUnique({
      where: { scheduledHabitId },
    });

    if (existing) {
      // Update existing to skipped
      const previousState = {
        status: existing.status,
        reasonCode: existing.reasonCode,
      };

      const updated = await tx.habitCompletion.update({
        where: { scheduledHabitId },
        data: {
          status: 'skipped',
          reasonCode,
          completedAt: new Date(),
        },
      });

      // Create undo history
      await tx.habitActionHistory.create({
        data: {
          userId,
          actionType: 'skip',
          entityId: scheduledHabitId,
          previousState,
          newState: { status: 'skipped', reasonCode },
          expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
        },
      });

      return updated;
    }

    // Create new skip
    const completion = await tx.habitCompletion.create({
      data: {
        userId,
        habitId: scheduledHabit.habitId,
        scheduledHabitId,
        status: 'skipped',
        reasonCode,
      },
    });

    // Create undo history
    await tx.habitActionHistory.create({
      data: {
        userId,
        actionType: 'skip',
        entityId: scheduledHabitId,
        previousState: null,
        newState: { status: 'skipped', reasonCode },
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
      },
    });

    return completion;
  });
}
