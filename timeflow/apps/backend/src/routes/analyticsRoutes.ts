/**
 * Analytics Routes
 *
 * Registers analytics endpoints for task insights and metrics.
 */

import { FastifyInstance } from 'fastify';
import * as analyticsController from '../controllers/analyticsController.js';
import { requireAuth } from '../middlewares/auth.js';

export async function registerAnalyticsRoutes(server: FastifyInstance) {
  // Goal tracking - overdue, due today, upcoming deadlines
  server.get(
    '/tasks/goal-tracking',
    { preHandler: requireAuth },
    analyticsController.getGoalTracking
  );

  // Completion metrics - completion rate, active tasks
  server.get(
    '/tasks/completion-metrics',
    { preHandler: requireAuth },
    analyticsController.getCompletionMetrics
  );

  // Time insights - scheduled hours, average duration, time by category
  server.get(
    '/tasks/time-insights',
    { preHandler: requireAuth },
    analyticsController.getTimeInsights
  );

  // Productivity trends - best time, productive days, weekly trend
  server.get(
    '/tasks/productivity-trends',
    { preHandler: requireAuth },
    analyticsController.getProductivityTrends
  );

  // Streak tracking - current and longest streak
  server.get(
    '/tasks/streak',
    { preHandler: requireAuth },
    analyticsController.getStreak
  );

  // Category breakdown - task distribution by category
  server.get(
    '/tasks/category-breakdown',
    { preHandler: requireAuth },
    analyticsController.getCategoryBreakdown
  );
}
