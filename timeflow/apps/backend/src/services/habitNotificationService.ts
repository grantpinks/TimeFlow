/**
 * Habit Notification Service
 *
 * Handles opt-in notifications for habit streaks and non-adherence.
 * - Streak-at-risk: When a habit streak will break if not completed today
 * - Missed high-priority: When a high-priority habit is missed
 */

import { prisma } from '../config/prisma.js';
import { getHabitInsights } from './habitInsightsService.js';
import { detectMissedHighPriorityHabits } from './habitNonAdherenceService.js';

export interface StreakAtRiskNotification {
  habitId: string;
  habitTitle: string;
  currentStreak: number;
  message: string;
}

export interface MissedHabitNotification {
  habitId: string;
  habitTitle: string;
  priorityRank: number;
  missedBy: number; // minutes
  message: string;
}

/**
 * Get all streak-at-risk notifications for a user
 * Only returns notifications if user has opted in (notifyStreakAtRisk = true)
 */
export async function getStreakAtRiskNotifications(
  userId: string
): Promise<StreakAtRiskNotification[]> {
  // Check if user has opted in
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { notifyStreakAtRisk: true },
  });

  if (!user?.notifyStreakAtRisk) {
    return []; // User hasn't opted in
  }

  // Get insights to find streaks at risk
  const insights = await getHabitInsights(userId, 14);

  const notifications: StreakAtRiskNotification[] = [];

  for (const habit of insights.habits) {
    if (habit.streak.atRisk && habit.streak.current > 0) {
      notifications.push({
        habitId: habit.habitId,
        habitTitle: habit.habitTitle,
        currentStreak: habit.streak.current,
        message: `Your ${habit.streak.current}-day streak for "${habit.habitTitle}" is at risk! Complete it today to keep your momentum going.`,
      });
    }
  }

  return notifications;
}

/**
 * Get all missed high-priority habit notifications for a user
 * Only returns notifications if user has opted in (notifyMissedHighPriority = true)
 * @param priorityThreshold - Only notify for habits with priority <= this value (default: 2 for P1 and P2)
 */
export async function getMissedHighPriorityNotifications(
  userId: string,
  priorityThreshold: number = 2
): Promise<MissedHabitNotification[]> {
  // Check if user has opted in
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { notifyMissedHighPriority: true },
  });

  if (!user?.notifyMissedHighPriority) {
    return []; // User hasn't opted in
  }

  // Detect missed high-priority habits
  const missed = await detectMissedHighPriorityHabits(userId, priorityThreshold);

  const notifications: MissedHabitNotification[] = missed.map((m) => ({
    habitId: m.habitId,
    habitTitle: m.habitTitle,
    priorityRank: m.priorityRank!,
    missedBy: m.missedBy,
    message: `You missed your high-priority habit "${m.habitTitle}" (P${m.priorityRank}). It was scheduled ${formatMissedTime(m.missedBy)} ago.`,
  }));

  return notifications;
}

/**
 * Get all habit notifications for a user (streaks + missed)
 */
export async function getAllHabitNotifications(userId: string): Promise<{
  streakAtRisk: StreakAtRiskNotification[];
  missedHighPriority: MissedHabitNotification[];
}> {
  const [streakAtRisk, missedHighPriority] = await Promise.all([
    getStreakAtRiskNotifications(userId),
    getMissedHighPriorityNotifications(userId),
  ]);

  return {
    streakAtRisk,
    missedHighPriority,
  };
}

/**
 * Update user notification preferences
 */
export async function updateNotificationPreferences(
  userId: string,
  preferences: {
    notifyStreakAtRisk?: boolean;
    notifyMissedHighPriority?: boolean;
  }
): Promise<{ success: boolean }> {
  await prisma.user.update({
    where: { id: userId },
    data: preferences,
  });

  return { success: true };
}

/**
 * Format minutes into human-readable time
 */
function formatMissedTime(minutes: number): string {
  if (minutes < 60) {
    return `${minutes} minute${minutes === 1 ? '' : 's'}`;
  }

  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;

  if (hours < 24) {
    if (remainingMinutes === 0) {
      return `${hours} hour${hours === 1 ? '' : 's'}`;
    }
    return `${hours}h ${remainingMinutes}m`;
  }

  const days = Math.floor(hours / 24);
  const remainingHours = hours % 24;

  if (remainingHours === 0) {
    return `${days} day${days === 1 ? '' : 's'}`;
  }
  return `${days}d ${remainingHours}h`;
}
