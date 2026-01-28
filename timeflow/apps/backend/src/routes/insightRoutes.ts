/**
 * Insight Routes
 * 
 * API routes for proactive AI insights
 */

import type { FastifyInstance } from 'fastify';
import { requireAuth } from '../middlewares/auth.js';
import * as insightController from '../controllers/insightController.js';

/**
 * Register Insight routes
 */
export async function registerInsightRoutes(server: FastifyInstance) {
  // GET /api/insights/today
  // Get proactive insights for the Today page
  server.get(
    '/insights/today',
    {
      preHandler: requireAuth,
      config: { rateLimit: { max: 60, timeWindow: '1 minute' } },
    },
    insightController.getTodayInsightsController
  );

  // GET /api/insights/calendar
  // Get proactive insights for the Calendar page
  server.get(
    '/insights/calendar',
    {
      preHandler: requireAuth,
      config: { rateLimit: { max: 60, timeWindow: '1 minute' } },
    },
    insightController.getCalendarInsightsController
  );

  // GET /api/insights/inbox
  // Get proactive insights for the Inbox page
  server.get(
    '/insights/inbox',
    {
      preHandler: requireAuth,
      config: { rateLimit: { max: 60, timeWindow: '1 minute' } },
    },
    insightController.getInboxInsightsController
  );
}
