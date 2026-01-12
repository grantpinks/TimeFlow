/**
 * Habit Notifications Types
 *
 * Types for opt-in habit notifications (streak-at-risk and missed high-priority habits)
 */

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
  missedBy: number; // minutes past grace period
  message: string;
}

export interface HabitNotificationsResponse {
  streakAtRisk: StreakAtRiskNotification[];
  missedHighPriority: MissedHabitNotification[];
}
