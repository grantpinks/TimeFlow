/**
 * Habit Insights Types
 * Shared types for habit insights and analytics
 */

import type { HabitRecommendation, CoachSuggestions } from './habitRecommendation.js';

/**
 * Streak metrics for a habit
 */
export interface StreakMetrics {
  current: number;        // Current streak in days
  best: number;          // Best/longest streak ever
  lastCompleted: string | null;  // ISO timestamp of last completion
  atRisk: boolean;       // True if streak will break soon (today is last day)
}

/**
 * Best time window for habit completion
 */
export interface BestWindow {
  dayOfWeek: string;     // e.g., "Monday", "Tuesday"
  timeSlot: string;      // e.g., "9am-10am"
  completionRate: number; // 0-1 (e.g., 0.9 = 90% completion rate in this window)
  sampleSize: number;     // Number of instances in this window (for significance)
}

/**
 * Per-habit insights
 */
export interface PerHabitInsights {
  habitId: string;
  habitTitle: string;
  adherenceRate: number;  // 0-1 (e.g., 0.75 = 75% adherence)
  scheduled: number;      // Total instances scheduled in period
  completed: number;      // Total instances completed
  skipped: number;        // Total instances skipped
  minutesScheduled: number;
  minutesCompleted: number;
  plannedVsActualDelta?: number; // Average delta between planned and actual duration (positive = over, negative = under)
  streak: StreakMetrics;
  bestWindow: BestWindow | null;
  adherenceSeries: Array<{
    date: string;         // ISO date (YYYY-MM-DD)
    scheduled: number;    // 0 or 1 for daily habits
    completed: number;    // 0 or 1
  }>;
  skipReasons: Array<{   // Aggregated skip reasons
    reasonCode: string;
    count: number;
  }>;
}

/**
 * Overall habit insights summary
 */
export interface HabitInsightsSummary {
  period: {
    days: 14 | 28;
    startDate: string;   // ISO date
    endDate: string;     // ISO date
  };
  totalHabits: number;
  activeHabits: number;  // Habits with at least 1 scheduled instance in period
  overallAdherence: number; // 0-1 across all habits
  totalMinutesScheduled: number;
  totalMinutesCompleted: number;
  habits: PerHabitInsights[];
  recommendations: HabitRecommendation[]; // All rules-based recommendations
  coachSuggestions: CoachSuggestions;     // Primary + secondary split with noise control
  generatedAt: string;   // ISO timestamp
}
