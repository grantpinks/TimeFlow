/**
 * Habit Recommendation Types
 * Types for rules-based habit improvement recommendations
 */

/**
 * Recommendation type
 */
export type RecommendationType =
  | 'streak_at_risk'
  | 'low_adherence'
  | 'repeated_skip_no_time'
  | 'repeated_skip_forgot'
  | 'duration_too_long';

/**
 * Recommendation action type
 */
export type RecommendationAction =
  | 'schedule_rescue_block'
  | 'adjust_window'
  | 'reduce_duration'
  | 'move_to_best_window';

/**
 * Individual habit recommendation
 */
export interface HabitRecommendation {
  type: RecommendationType;
  habitId: string;
  habitTitle: string;

  // What we noticed
  metric: {
    label: string;          // e.g., "3-day streak at risk"
    value: string | number; // e.g., "3 days" or 45
    context?: string;       // e.g., "Last completed yesterday"
  };

  // Why it matters
  insight: string;          // e.g., "Your streak will break if you skip today"

  // Suggested action
  action: {
    type: RecommendationAction;
    label: string;          // e.g., "Schedule rescue block"
    payload?: any;          // Action-specific data (window time, duration, etc.)
  };

  // Priority for sorting
  priority: number;         // 1 = highest, 3 = lowest
}

/**
 * Recommendations response (included in HabitInsightsSummary)
 */
export interface HabitRecommendations {
  recommendations: HabitRecommendation[];
  count: number;
}
