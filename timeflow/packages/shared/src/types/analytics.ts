/**
 * Analytics Types
 *
 * Response types for task analytics endpoints used in Flow Analytics Panel
 */

export interface GoalTrackingResponse {
  overdueCount: number;
  dueTodayCount: number;
  dueThisWeekCount: number;
  upcomingDeadlines: Array<{
    id: string;
    title: string;
    dueDate: string;
    priority: 1 | 2 | 3;
  }>;
}

export interface CompletionMetricsResponse {
  completedToday: number;
  completedThisWeek: number;
  totalActiveTasks: number;
  completionRate: number; // percentage 0-100
}

export interface TimeInsightsResponse {
  totalScheduledHours: number; // rounded to 1 decimal
  averageTaskDuration: number; // in minutes
  timeByCategory: Record<string, number>; // category name -> hours
}

export interface ProductivityTrendsResponse {
  bestTimeOfDay: string; // e.g., "9-11" or "N/A"
  mostProductiveDays: string[]; // Top 3 days of week
  weeklyTrend: 'up' | 'down' | 'stable';
  completionByDayOfWeek: Record<string, number>;
}

export interface StreakResponse {
  currentStreak: number;
  longestStreak: number;
  lastCompletionDate: string | null;
  streakActive: boolean;
}

export interface CategoryBreakdownResponse {
  categoryDistribution: Array<{
    categoryName: string;
    taskCount: number;
    hoursSpent: number;
  }>;
  topCategories: string[]; // Top 3 by task count
}
