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
 */
export async function getHabitInsights(
  userId: string,
  days: 14 | 28 = 14
): Promise<HabitInsightsSummary> {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) {
    throw new Error('User not found');
  }

  const userTz = user.timeZone || 'UTC';
  const endDate = new Date();
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
    const minutesCompleted = completed * habit.durationMinutes;

    totalScheduled += scheduled;
    totalCompleted += completed;
    totalMinutesScheduled += minutesScheduled;
    totalMinutesCompleted += minutesCompleted;

    // Calculate streak
    const streak = calculateStreak(habit.id, userId, userTz, scheduledInstances);

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
    generatedAt: new Date().toISOString(),
  };
}

/**
 * Calculate streak metrics for a habit
 * Streak = consecutive days with >= 1 completed instance
 */
function calculateStreak(
  habitId: string,
  userId: string,
  userTz: string,
  scheduledInstances: any[]
): StreakMetrics {
  // Get all completions sorted by date (newest first)
  const completions = scheduledInstances
    .filter((si) => si.completion?.status === 'completed')
    .map((si) => ({
      date: toUserDate(si.startDateTime, userTz),
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

  // Calculate current streak (consecutive days from today backwards)
  const today = toUserDate(new Date(), userTz);
  const completedDates = new Set(completions.map((c) => c.date));

  let currentStreak = 0;
  let checkDate = today;

  // Check if today is completed
  if (completedDates.has(today)) {
    currentStreak = 1;
    checkDate = subtractDays(today, 1);
  } else {
    // Check if yesterday was completed (grace period)
    const yesterday = subtractDays(today, 1);
    if (completedDates.has(yesterday)) {
      currentStreak = 1;
      checkDate = subtractDays(yesterday, 1);
    }
  }

  // Continue streak backwards
  while (completedDates.has(checkDate)) {
    currentStreak++;
    checkDate = subtractDays(checkDate, 1);
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
  const todayCompleted = completedDates.has(today);
  const yesterdayCompleted = completedDates.has(subtractDays(today, 1));
  const atRisk = !todayCompleted && (currentStreak > 0 || yesterdayCompleted);

  return {
    current: currentStreak,
    best: bestStreak,
    lastCompleted,
    atRisk,
  };
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
    const dateStr = toUserDate(si.startDateTime, userTz);
    const stats = series.get(dateStr);
    if (stats) {
      stats.scheduled++;
      if (si.completion?.status === 'completed') {
        stats.completed++;
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
