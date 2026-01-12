/**
 * Habit Insights Service
 * Computes adherence, streaks, best windows, and analytics for habits
 */

import { prisma } from '../config/prisma.js';
import type {
  HabitInsightsSummary,
  PerHabitInsights,
  BestWindow,
  StreakMetrics,
} from '@timeflow/shared';
import * as habitRecommendationService from './habitRecommendationService.js';

/**
 * Get habit insights for a user
 * @param asOfDate - Optional date to use as "today" for analysis (mainly for testing)
 */
export async function getHabitInsights(
  userId: string,
  days: 14 | 28 = 14,
  asOfDate?: Date
): Promise<HabitInsightsSummary> {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) {
    throw new Error('User not found');
  }

  const userTz = user.timeZone || 'UTC';
  const endDate = asOfDate || new Date();
  const startDate = new Date(endDate);
  startDate.setDate(startDate.getDate() - days);

  // Get all habits for user
  const habits = await prisma.habit.findMany({
    where: { userId },
    include: {
      scheduledHabits: {
        where: {
          startDateTime: {
            gte: startDate,
            lte: endDate,
          },
        },
        include: {
          completion: true,
        },
      },
    },
  });

  const habitInsights: PerHabitInsights[] = [];
  let totalScheduled = 0;
  let totalCompleted = 0;
  let totalMinutesScheduled = 0;
  let totalMinutesCompleted = 0;

  for (const habit of habits) {
    const scheduledInstances = habit.scheduledHabits;
    const scheduled = scheduledInstances.length;

    if (scheduled === 0) {
      // Skip habits with no scheduled instances in this period
      continue;
    }

    const completed = scheduledInstances.filter(
      (si) => si.completion?.status === 'completed'
    ).length;
    const skipped = scheduledInstances.filter(
      (si) => si.completion?.status === 'skipped'
    ).length;

    const adherenceRate = scheduled > 0 ? completed / scheduled : 0;
    const minutesScheduled = scheduled * habit.durationMinutes;

    // Calculate actual minutes completed (use actualDurationMinutes if available, otherwise planned duration)
    const minutesCompleted = scheduledInstances
      .filter((si) => si.completion?.status === 'completed')
      .reduce((sum, si) => {
        const actualDuration = si.completion?.actualDurationMinutes;
        return sum + (actualDuration ?? habit.durationMinutes);
      }, 0);

    // Calculate planned vs actual delta (average difference across completed instances)
    const completedWithActualDuration = scheduledInstances.filter(
      (si) => si.completion?.status === 'completed' && si.completion?.actualDurationMinutes != null
    );
    const plannedVsActualDelta = completedWithActualDuration.length > 0
      ? completedWithActualDuration.reduce((sum, si) => {
          const delta = si.completion!.actualDurationMinutes! - habit.durationMinutes;
          return sum + delta;
        }, 0) / completedWithActualDuration.length
      : undefined;

    totalScheduled += scheduled;
    totalCompleted += completed;
    totalMinutesScheduled += minutesScheduled;
    totalMinutesCompleted += minutesCompleted;

    // Calculate streak
    const streak = calculateStreak(
      habit.id,
      userId,
      userTz,
      scheduledInstances,
      endDate,
      habit.frequency,
      habit.daysOfWeek
    );

    // Calculate best window
    const bestWindow = calculateBestWindow(scheduledInstances, userTz);

    // Build adherence series (daily)
    const adherenceSeries = buildAdherenceSeries(
      scheduledInstances,
      startDate,
      endDate,
      userTz
    );

    // Aggregate skip reasons
    const skipReasons = aggregateSkipReasons(scheduledInstances);

    habitInsights.push({
      habitId: habit.id,
      habitTitle: habit.title,
      adherenceRate,
      scheduled,
      completed,
      skipped,
      minutesScheduled,
      minutesCompleted,
      plannedVsActualDelta,
      streak,
      bestWindow,
      adherenceSeries,
      skipReasons,
    });
  }

  const overallAdherence =
    totalScheduled > 0 ? totalCompleted / totalScheduled : 0;

  // Generate recommendations based on insights
  const allRecommendations = habitRecommendationService.generateRecommendations(habitInsights);

  // Filter out dismissed recommendations
  const recommendations = habitRecommendationService.filterDismissedRecommendations(
    allRecommendations,
    user.habitsCoachState
  );

  // Create coach suggestions with primary/secondary split and noise control
  const coachSuggestions = habitRecommendationService.createCoachSuggestions(
    recommendations,
    user.habitsCoachState
  );

  return {
    period: {
      days,
      startDate: startDate.toISOString().split('T')[0],
      endDate: endDate.toISOString().split('T')[0],
    },
    totalHabits: habits.length,
    activeHabits: habitInsights.length,
    overallAdherence,
    totalMinutesScheduled,
    totalMinutesCompleted,
    habits: habitInsights,
    recommendations,
    coachSuggestions,
    generatedAt: new Date().toISOString(),
  };
}

/**
 * Calculate streak metrics for a habit
 * Streak = consecutive days with >= 1 completed instance
 * @param asOfDate - The date to use as "today" for streak calculation
 * @param frequency - Habit frequency (daily, weekly, custom)
 * @param daysOfWeek - Days of week when habit is scheduled (for weekly habits)
 */
function calculateStreak(
  habitId: string,
  userId: string,
  userTz: string,
  scheduledInstances: any[],
  asOfDate: Date,
  frequency: string,
  daysOfWeek: string[]
): StreakMetrics {
  // Get all completions sorted by date (newest first)
  // Use completedAt to determine which day the completion counts for (handles 11:59pm vs 12:01am)
  const completions = scheduledInstances
    .filter((si) => si.completion?.status === 'completed')
    .map((si) => ({
      date: toUserDate(si.completion.completedAt, userTz),
      completedAt: si.completion.completedAt,
    }))
    .sort((a, b) => b.completedAt.getTime() - a.completedAt.getTime());

  if (completions.length === 0) {
    return {
      current: 0,
      best: 0,
      lastCompleted: null,
      atRisk: false,
    };
  }

  const lastCompleted = completions[0].completedAt.toISOString();
  const referenceDate = new Date(
    Math.max(asOfDate.getTime(), completions[0].completedAt.getTime())
  );

  // Calculate current streak (consecutive days ending at the last completion)
  const today = toUserDate(referenceDate, userTz);
  const completedDates = new Set(completions.map((c) => c.date));
  const lastCompletedDate = completions[0].date;

  let currentStreak = 0;
  let streakDate = lastCompletedDate;

  while (completedDates.has(streakDate)) {
    currentStreak++;
    streakDate = subtractDays(streakDate, 1);
  }

  // Calculate best streak (longest consecutive sequence ever)
  let bestStreak = currentStreak;
  let tempStreak = 0;
  const allDatesOrdered = Array.from(completedDates).sort();

  for (let i = 0; i < allDatesOrdered.length; i++) {
    if (i === 0) {
      tempStreak = 1;
    } else {
      const prevDate = allDatesOrdered[i - 1];
      const currDate = allDatesOrdered[i];
      const daysDiff = dateDiffInDays(prevDate, currDate);

      if (daysDiff === 1) {
        tempStreak++;
      } else {
        bestStreak = Math.max(bestStreak, tempStreak);
        tempStreak = 1;
      }
    }
  }
  bestStreak = Math.max(bestStreak, tempStreak);

  // Determine if streak is at risk
  // At risk if: not completed today AND (current streak > 0 OR yesterday was completed)
  // BUT ONLY if today is a scheduled day for this habit
  const todayCompleted = completedDates.has(today);
  const yesterdayCompleted = completedDates.has(subtractDays(today, 1));

  // Check if today should be scheduled based on habit frequency
  const isTodayScheduled = isHabitScheduledForDate(referenceDate, frequency, daysOfWeek, userTz);

  // Only mark at risk if today is actually a scheduled day
  const atRisk = isTodayScheduled && !todayCompleted && (currentStreak > 0 || yesterdayCompleted);

  return {
    current: currentStreak,
    best: bestStreak,
    lastCompleted,
    atRisk,
  };
}

/**
 * Check if a habit should be scheduled on a given date based on its frequency
 */
function isHabitScheduledForDate(
  date: Date,
  frequency: string,
  daysOfWeek: string[],
  userTz: string
): boolean {
  // Daily habits are scheduled every day
  if (frequency === 'daily') {
    return true;
  }

  // Weekly habits are only scheduled on specified days
  if (frequency === 'weekly' && daysOfWeek.length > 0) {
    const dayOfWeek = date.toLocaleDateString('en-US', {
      weekday: 'short',
      timeZone: userTz
    }).toLowerCase(); // 'mon', 'tue', etc.

    return daysOfWeek.includes(dayOfWeek);
  }

  // For custom frequency or unknown, assume it's scheduled (conservative approach)
  return true;
}

/**
 * Calculate best time window for habit completion
 * Groups by day-of-week + hour bucket, finds highest completion rate
 */
function calculateBestWindow(
  scheduledInstances: any[],
  userTz: string
): BestWindow | null {
  if (scheduledInstances.length < 3) {
    return null; // Not enough data for significance
  }

  // Group by day-of-week and hour bucket
  const windowStats: Map<
    string,
    { scheduled: number; completed: number }
  > = new Map();

  for (const si of scheduledInstances) {
    const startInUserTz = toUserDateTime(si.startDateTime, userTz);
    const dayOfWeek = startInUserTz.toLocaleDateString('en-US', {
      weekday: 'long',
      timeZone: userTz,
    });
    const hour = startInUserTz.getHours();
    const timeSlot = `${hour}:00-${hour + 1}:00`;
    const key = `${dayOfWeek}|${timeSlot}`;

    if (!windowStats.has(key)) {
      windowStats.set(key, { scheduled: 0, completed: 0 });
    }

    const stats = windowStats.get(key)!;
    stats.scheduled++;
    if (si.completion?.status === 'completed') {
      stats.completed++;
    }
  }

  // Find window with highest completion rate (min 3 instances)
  let bestWindow: BestWindow | null = null;
  let bestRate = 0;

  for (const [key, stats] of windowStats.entries()) {
    if (stats.scheduled < 3) continue; // Require significance

    const rate = stats.completed / stats.scheduled;
    if (rate > bestRate) {
      bestRate = rate;
      const [dayOfWeek, timeSlot] = key.split('|');
      bestWindow = {
        dayOfWeek,
        timeSlot,
        completionRate: rate,
        sampleSize: stats.scheduled,
      };
    }
  }

  return bestWindow;
}

/**
 * Build daily adherence series for charts
 */
function buildAdherenceSeries(
  scheduledInstances: any[],
  startDate: Date,
  endDate: Date,
  userTz: string
): Array<{ date: string; scheduled: number; completed: number }> {
  const series: Map<string, { scheduled: number; completed: number }> = new Map();

  // Initialize all dates in range with 0
  let currentDate = new Date(startDate);
  while (currentDate <= endDate) {
    const dateStr = toUserDate(currentDate, userTz);
    series.set(dateStr, { scheduled: 0, completed: 0 });
    currentDate.setDate(currentDate.getDate() + 1);
  }

  // Fill in actual data
  for (const si of scheduledInstances) {
    // Use startDateTime for scheduled count (when it was scheduled)
    const scheduledDateStr = toUserDate(si.startDateTime, userTz);
    const scheduledStats = series.get(scheduledDateStr);
    if (scheduledStats) {
      scheduledStats.scheduled++;
    }

    // Use completedAt for completed count (when it was actually completed)
    // This handles boundary cases like completing at 12:01am = next day
    if (si.completion?.status === 'completed') {
      const completedDateStr = toUserDate(si.completion.completedAt, userTz);
      const completedStats = series.get(completedDateStr);
      if (completedStats) {
        completedStats.completed++;
      }
    }
  }

  return Array.from(series.entries())
    .map(([date, stats]) => ({ date, ...stats }))
    .sort((a, b) => a.date.localeCompare(b.date));
}

/**
 * Aggregate skip reasons
 */
function aggregateSkipReasons(
  scheduledInstances: any[]
): Array<{ reasonCode: string; count: number }> {
  const reasonCounts: Map<string, number> = new Map();

  for (const si of scheduledInstances) {
    if (si.completion?.status === 'skipped' && si.completion.reasonCode) {
      const code = si.completion.reasonCode;
      reasonCounts.set(code, (reasonCounts.get(code) || 0) + 1);
    }
  }

  return Array.from(reasonCounts.entries())
    .map(([reasonCode, count]) => ({ reasonCode, count }))
    .sort((a, b) => b.count - a.count);
}

// Helper functions for date manipulation in user's timezone

function toUserDate(date: Date, userTz: string): string {
  return date.toLocaleDateString('en-CA', { timeZone: userTz }); // YYYY-MM-DD format
}

function toUserDateTime(date: Date, userTz: string): Date {
  return new Date(date.toLocaleString('en-US', { timeZone: userTz }));
}

function subtractDays(dateStr: string, days: number): string {
  const date = new Date(dateStr + 'T00:00:00');
  date.setDate(date.getDate() - days);
  return date.toISOString().split('T')[0];
}

function dateDiffInDays(date1Str: string, date2Str: string): number {
  const d1 = new Date(date1Str);
  const d2 = new Date(date2Str);
  const diffTime = d2.getTime() - d1.getTime();
  return Math.round(diffTime / (1000 * 60 * 60 * 24));
}
