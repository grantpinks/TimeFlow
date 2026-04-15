/**
 * Analytics Controller
 *
 * Provides task analytics endpoints for the Flow Analytics Panel
 */

import type { FastifyRequest, FastifyReply } from 'fastify';
import { prisma } from '../config/prisma.js';
import type {
  GoalTrackingResponse,
  CompletionMetricsResponse,
  TimeInsightsResponse,
  ProductivityTrendsResponse,
  StreakResponse,
  CategoryBreakdownResponse
} from '@timeflow/shared';

interface AuthenticatedRequest extends FastifyRequest {
  user?: { id: string };
}

/**
 * GET /api/tasks/goal-tracking
 * Returns overdue count, due today, due this week, and upcoming deadlines
 */
export async function getGoalTracking(
  req: AuthenticatedRequest,
  res: FastifyReply
): Promise<void> {
  try {
    const userId = req.user?.id;
    if (!userId) {
      res.code(401).send({ error: 'Unauthorized' });
      return;
    }

    const now = new Date();
    const todayStart = new Date(now);
    todayStart.setHours(0, 0, 0, 0);
    const todayEnd = new Date(now);
    todayEnd.setHours(23, 59, 59, 999);

    const weekFromNow = new Date(now);
    weekFromNow.setDate(weekFromNow.getDate() + 7);

    // Fetch all active tasks
    const tasks = await prisma.task.findMany({
      where: {
        userId,
        status: { in: ['unscheduled', 'scheduled'] }
      },
      select: {
        id: true,
        title: true,
        dueDate: true,
        priority: true
      }
    });

    // Calculate overdue count
    const overdueCount = tasks.filter(
      t => t.dueDate && new Date(t.dueDate) < now
    ).length;

    // Calculate due today count
    const dueTodayCount = tasks.filter(t => {
      if (!t.dueDate) return false;
      const dueDate = new Date(t.dueDate);
      return dueDate >= todayStart && dueDate <= todayEnd;
    }).length;

    // Calculate due this week count
    const dueThisWeekCount = tasks.filter(t => {
      if (!t.dueDate) return false;
      const dueDate = new Date(t.dueDate);
      return dueDate >= now && dueDate <= weekFromNow;
    }).length;

    // Get upcoming deadlines (next 3)
    const upcomingDeadlines = tasks
      .filter(t => t.dueDate && new Date(t.dueDate) >= now)
      .sort((a, b) => {
        const dateA = new Date(a.dueDate!).getTime();
        const dateB = new Date(b.dueDate!).getTime();
        return dateA - dateB;
      })
      .slice(0, 3)
      .map(t => ({
        id: t.id,
        title: t.title,
        dueDate: t.dueDate!,
        priority: t.priority as 1 | 2 | 3
      }));

    const response: GoalTrackingResponse = {
      overdueCount,
      dueTodayCount,
      dueThisWeekCount,
      upcomingDeadlines
    };

    res.send(response);
  } catch (error) {
    console.error('[analyticsController] getGoalTracking error:', error);
    res.code(500).send({ error: 'Failed to fetch goal tracking data' });
  }
}

/**
 * GET /api/tasks/completion-metrics?range=today|week|month
 * Returns completion statistics for specified time range
 */
export async function getCompletionMetrics(
  req: AuthenticatedRequest,
  res: FastifyReply
): Promise<void> {
  try {
    const userId = req.user?.id;
    if (!userId) {
      res.code(401).send({ error: 'Unauthorized' });
      return;
    }

    const range = (req.query as { range?: string }).range || 'today';
    if (!['today', 'week', 'month'].includes(range)) {
      res.code(400).send({ error: 'Invalid range. Must be today, week, or month' });
      return;
    }

    const now = new Date();
    let startDate: Date;

    switch (range) {
      case 'today':
        startDate = new Date(now);
        startDate.setHours(0, 0, 0, 0);
        break;
      case 'week':
        startDate = new Date(now);
        startDate.setDate(startDate.getDate() - 7);
        break;
      case 'month':
        startDate = new Date(now);
        startDate.setMonth(startDate.getMonth() - 1);
        break;
      default:
        startDate = new Date(now);
        startDate.setHours(0, 0, 0, 0);
    }

    // Count completed tasks in range
    const completed = await prisma.task.count({
      where: {
        userId,
        status: 'completed',
        updatedAt: { gte: startDate }
      }
    });

    // Count total tasks created in range
    const total = await prisma.task.count({
      where: {
        userId,
        createdAt: { gte: startDate }
      }
    });

    // Count active tasks
    const totalActiveTasks = await prisma.task.count({
      where: {
        userId,
        status: { in: ['unscheduled', 'scheduled'] }
      }
    });

    // Calculate completion rate
    const completionRate = total > 0 ? Math.round((completed / total) * 100) : 0;

    const response: CompletionMetricsResponse = {
      completedToday: range === 'today' ? completed : 0,
      completedThisWeek: range === 'week' ? completed : 0,
      totalActiveTasks,
      completionRate
    };

    res.send(response);
  } catch (error) {
    console.error('[analyticsController] getCompletionMetrics error:', error);
    res.code(500).send({ error: 'Failed to fetch completion metrics' });
  }
}

/**
 * GET /api/tasks/time-insights
 * Returns time-related insights: total scheduled hours, average duration, time by category
 */
export async function getTimeInsights(
  req: AuthenticatedRequest,
  res: FastifyReply
): Promise<void> {
  try {
    const userId = req.user?.id;
    if (!userId) {
      res.code(401).send({ error: 'Unauthorized' });
      return;
    }

    // Fetch scheduled tasks with category
    const tasks = await prisma.task.findMany({
      where: {
        userId,
        status: 'scheduled',
        scheduledTask: { isNot: null }
      },
      select: {
        durationMinutes: true,
        category: {
          select: {
            name: true
          }
        }
      }
    });

    // Calculate total scheduled hours
    const totalMinutes = tasks.reduce((sum, t) => sum + t.durationMinutes, 0);
    const totalScheduledHours = Math.round((totalMinutes / 60) * 10) / 10;

    // Calculate average duration
    const averageTaskDuration = tasks.length > 0
      ? Math.round(totalMinutes / tasks.length)
      : 0;

    // Calculate time by category
    const timeByCategory: Record<string, number> = {};
    tasks.forEach(task => {
      const categoryName = task.category?.name || 'Uncategorized';
      const hours = task.durationMinutes / 60;
      timeByCategory[categoryName] = (timeByCategory[categoryName] || 0) + hours;
    });

    // Round category hours to 1 decimal
    Object.keys(timeByCategory).forEach(key => {
      timeByCategory[key] = Math.round(timeByCategory[key] * 10) / 10;
    });

    const response: TimeInsightsResponse = {
      totalScheduledHours,
      averageTaskDuration,
      timeByCategory
    };

    res.send(response);
  } catch (error) {
    console.error('[analyticsController] getTimeInsights error:', error);
    res.code(500).send({ error: 'Failed to fetch time insights' });
  }
}

/**
 * GET /api/tasks/productivity-trends?days=7
 * Returns productivity trends: best time of day, productive days, weekly trend
 */
export async function getProductivityTrends(
  req: AuthenticatedRequest,
  res: FastifyReply
): Promise<void> {
  try {
    const userId = req.user?.id;
    if (!userId) {
      res.code(401).send({ error: 'Unauthorized' });
      return;
    }

    const days = parseInt((req.query as { days?: string }).days || '7');
    if (isNaN(days) || days < 1 || days > 365) {
      res.code(400).send({ error: 'Invalid days parameter. Must be 1-365' });
      return;
    }

    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    // Fetch completed tasks in range
    const completedTasks = await prisma.task.findMany({
      where: {
        userId,
        status: 'completed',
        updatedAt: { gte: startDate }
      },
      select: {
        updatedAt: true
      }
    });

    // Calculate completion by hour
    const hourCounts: Record<number, number> = {};
    completedTasks.forEach(task => {
      const hour = new Date(task.updatedAt).getHours();
      hourCounts[hour] = (hourCounts[hour] || 0) + 1;
    });

    // Find best time of day
    const bestHourEntry = Object.entries(hourCounts).sort((a, b) => b[1] - a[1])[0];
    const bestTimeOfDay = bestHourEntry
      ? `${bestHourEntry[0]}-${parseInt(bestHourEntry[0]) + 1}`
      : 'N/A';

    // Calculate completion by day of week
    const completionByDayOfWeek: Record<string, number> = {};
    completedTasks.forEach(task => {
      const dayName = new Date(task.updatedAt).toLocaleDateString('en-US', { weekday: 'long' });
      completionByDayOfWeek[dayName] = (completionByDayOfWeek[dayName] || 0) + 1;
    });

    // Find most productive days (top 3)
    const mostProductiveDays = Object.entries(completionByDayOfWeek)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([day]) => day);

    // Calculate weekly trend
    const midpoint = Math.floor(completedTasks.length / 2);
    const firstHalf = completedTasks.slice(0, midpoint).length;
    const secondHalf = completedTasks.slice(midpoint).length;

    let weeklyTrend: 'up' | 'down' | 'stable';
    if (secondHalf > firstHalf * 1.1) {
      weeklyTrend = 'up';
    } else if (secondHalf < firstHalf * 0.9) {
      weeklyTrend = 'down';
    } else {
      weeklyTrend = 'stable';
    }

    const response: ProductivityTrendsResponse = {
      bestTimeOfDay,
      mostProductiveDays,
      weeklyTrend,
      completionByDayOfWeek
    };

    res.send(response);
  } catch (error) {
    console.error('[analyticsController] getProductivityTrends error:', error);
    res.code(500).send({ error: 'Failed to fetch productivity trends' });
  }
}

/**
 * GET /api/tasks/streak
 * Returns current and longest task completion streak
 */
export async function getStreak(
  req: AuthenticatedRequest,
  res: FastifyReply
): Promise<void> {
  try {
    const userId = req.user?.id;
    if (!userId) {
      res.code(401).send({ error: 'Unauthorized' });
      return;
    }

    // Fetch all completed tasks
    const completedTasks = await prisma.task.findMany({
      where: {
        userId,
        status: 'completed'
      },
      select: {
        updatedAt: true
      },
      orderBy: {
        updatedAt: 'desc'
      }
    });

    if (completedTasks.length === 0) {
      const response: StreakResponse = {
        currentStreak: 0,
        longestStreak: 0,
        lastCompletionDate: null,
        streakActive: false
      };
      res.send(response);
      return;
    }

    // Create set of completion dates (normalized to date only)
    const completionDates = new Set<number>();
    completedTasks.forEach(task => {
      const date = new Date(task.updatedAt);
      date.setHours(0, 0, 0, 0);
      completionDates.add(date.getTime());
    });

    // Calculate current streak
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    // Check if streak is active (completion today or yesterday)
    const streakActive = completionDates.has(today.getTime()) ||
                        completionDates.has(yesterday.getTime());

    let currentStreak = 0;
    if (streakActive) {
      let checkDate = new Date(today);
      // If no completion today, start from yesterday
      if (!completionDates.has(today.getTime())) {
        checkDate = new Date(yesterday);
      }

      while (completionDates.has(checkDate.getTime())) {
        currentStreak++;
        checkDate.setDate(checkDate.getDate() - 1);
      }
    }

    // Calculate longest streak (simplified - scan all dates)
    let longestStreak = currentStreak;
    const sortedDates = Array.from(completionDates).sort((a, b) => a - b);

    let tempStreak = 1;
    for (let i = 1; i < sortedDates.length; i++) {
      const prevDate = new Date(sortedDates[i - 1]);
      const currDate = new Date(sortedDates[i]);
      const dayDiff = Math.floor((currDate.getTime() - prevDate.getTime()) / (1000 * 60 * 60 * 24));

      if (dayDiff === 1) {
        tempStreak++;
        longestStreak = Math.max(longestStreak, tempStreak);
      } else {
        tempStreak = 1;
      }
    }

    const response: StreakResponse = {
      currentStreak,
      longestStreak,
      lastCompletionDate: completedTasks[0].updatedAt.toISOString(),
      streakActive
    };

    res.send(response);
  } catch (error) {
    console.error('[analyticsController] getStreak error:', error);
    res.code(500).send({ error: 'Failed to fetch streak data' });
  }
}

/**
 * GET /api/tasks/category-breakdown
 * Returns task distribution by category
 */
export async function getCategoryBreakdown(
  req: AuthenticatedRequest,
  res: FastifyReply
): Promise<void> {
  try {
    const userId = req.user?.id;
    if (!userId) {
      res.code(401).send({ error: 'Unauthorized' });
      return;
    }

    // Fetch active tasks with categories
    const tasks = await prisma.task.findMany({
      where: {
        userId,
        status: { in: ['unscheduled', 'scheduled'] }
      },
      select: {
        durationMinutes: true,
        category: {
          select: {
            name: true
          }
        }
      }
    });

    // Calculate category statistics
    const categoryStats: Record<string, { taskCount: number; hoursSpent: number }> = {};

    tasks.forEach(task => {
      const categoryName = task.category?.name || 'Uncategorized';
      if (!categoryStats[categoryName]) {
        categoryStats[categoryName] = { taskCount: 0, hoursSpent: 0 };
      }
      categoryStats[categoryName].taskCount++;
      categoryStats[categoryName].hoursSpent += task.durationMinutes / 60;
    });

    // Round hours to 1 decimal
    Object.keys(categoryStats).forEach(key => {
      categoryStats[key].hoursSpent = Math.round(categoryStats[key].hoursSpent * 10) / 10;
    });

    // Create category distribution array
    const categoryDistribution = Object.entries(categoryStats).map(([name, stats]) => ({
      categoryName: name,
      taskCount: stats.taskCount,
      hoursSpent: stats.hoursSpent
    }));

    // Get top 3 categories by task count
    const topCategories = categoryDistribution
      .sort((a, b) => b.taskCount - a.taskCount)
      .slice(0, 3)
      .map(c => c.categoryName);

    const response: CategoryBreakdownResponse = {
      categoryDistribution,
      topCategories
    };

    res.send(response);
  } catch (error) {
    console.error('[analyticsController] getCategoryBreakdown error:', error);
    res.code(500).send({ error: 'Failed to fetch category breakdown' });
  }
}
