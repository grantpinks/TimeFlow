/**
 * Habit Non-Adherence Detection Service
 *
 * Detects "missed" habit instances based on grace period rules.
 * A habit instance is considered "missed" if:
 * - Its endDateTime has passed + grace period
 * - It has no HabitCompletion record (not completed or skipped)
 */

import { prisma } from '../config/prisma.js';

// Grace period after habit block ends before marking as "missed" (in minutes)
const GRACE_PERIOD_MINUTES = 120; // 2 hours

export interface MissedHabitInstance {
  scheduledHabitId: string;
  habitId: string;
  habitTitle: string;
  priorityRank: number | null;
  startDateTime: Date;
  endDateTime: Date;
  missedBy: number; // minutes past grace period
}

/**
 * Detect all missed habit instances for a user
 * @param userId - User ID to check
 * @param asOfDate - Check as of this date (defaults to now)
 * @returns Array of missed habit instances
 */
export async function detectMissedHabits(
  userId: string,
  asOfDate: Date = new Date()
): Promise<MissedHabitInstance[]> {
  const gracePeriodCutoff = new Date(
    asOfDate.getTime() - GRACE_PERIOD_MINUTES * 60 * 1000
  );

  // Find all scheduled habits that ended before the grace period cutoff
  const scheduledHabits = await prisma.scheduledHabit.findMany({
    where: {
      userId,
      endDateTime: { lt: gracePeriodCutoff },
      // Only check active habits
      habit: { isActive: true },
    },
    include: {
      habit: {
        select: {
          id: true,
          title: true,
          priorityRank: true,
        },
      },
      completions: {
        select: {
          id: true,
          status: true,
        },
      },
    },
  });

  // Filter to only those without a completion
  const missed: MissedHabitInstance[] = scheduledHabits
    .filter((sh) => sh.completions.length === 0)
    .map((sh) => ({
      scheduledHabitId: sh.id,
      habitId: sh.habit.id,
      habitTitle: sh.habit.title,
      priorityRank: sh.habit.priorityRank,
      startDateTime: sh.startDateTime,
      endDateTime: sh.endDateTime,
      missedBy: Math.floor(
        (asOfDate.getTime() - sh.endDateTime.getTime()) / (60 * 1000)
      ),
    }));

  return missed;
}

/**
 * Detect missed high-priority habit instances
 * Only returns habits with priorityRank <= threshold
 * @param userId - User ID to check
 * @param priorityThreshold - Max priority rank to include (default: 2 for P1 and P2)
 * @param asOfDate - Check as of this date (defaults to now)
 */
export async function detectMissedHighPriorityHabits(
  userId: string,
  priorityThreshold: number = 2,
  asOfDate: Date = new Date()
): Promise<MissedHabitInstance[]> {
  const allMissed = await detectMissedHabits(userId, asOfDate);

  return allMissed.filter(
    (m) => m.priorityRank !== null && m.priorityRank <= priorityThreshold
  );
}

/**
 * Detect missed habits for a specific date range
 * Useful for generating daily/weekly reports
 */
export async function detectMissedHabitsInRange(
  userId: string,
  startDate: Date,
  endDate: Date
): Promise<MissedHabitInstance[]> {
  // Find all scheduled habits in the range
  const scheduledHabits = await prisma.scheduledHabit.findMany({
    where: {
      userId,
      endDateTime: {
        gte: startDate,
        lte: endDate,
      },
      habit: { isActive: true },
    },
    include: {
      habit: {
        select: {
          id: true,
          title: true,
          priorityRank: true,
        },
      },
      completions: {
        select: {
          id: true,
          status: true,
        },
      },
    },
  });

  const now = new Date();
  const gracePeriodCutoff = new Date(
    now.getTime() - GRACE_PERIOD_MINUTES * 60 * 1000
  );

  // Filter to only those without completion and past grace period
  const missed: MissedHabitInstance[] = scheduledHabits
    .filter((sh) => {
      const isPastGracePeriod = sh.endDateTime < gracePeriodCutoff;
      const hasNoCompletion = sh.completions.length === 0;
      return isPastGracePeriod && hasNoCompletion;
    })
    .map((sh) => ({
      scheduledHabitId: sh.id,
      habitId: sh.habit.id,
      habitTitle: sh.habit.title,
      priorityRank: sh.habit.priorityRank,
      startDateTime: sh.startDateTime,
      endDateTime: sh.endDateTime,
      missedBy: Math.floor(
        (now.getTime() - sh.endDateTime.getTime()) / (60 * 1000)
      ),
    }));

  return missed;
}

/**
 * Check if a user has any missed high-priority habits today
 * Useful for triggering notifications
 */
export async function hasMissedHighPriorityHabitsToday(
  userId: string,
  priorityThreshold: number = 2
): Promise<boolean> {
  const now = new Date();
  const startOfDay = new Date(now);
  startOfDay.setHours(0, 0, 0, 0);

  const endOfDay = new Date(now);
  endOfDay.setHours(23, 59, 59, 999);

  const missed = await detectMissedHabitsInRange(userId, startOfDay, endOfDay);

  return missed.some(
    (m) => m.priorityRank !== null && m.priorityRank <= priorityThreshold
  );
}
