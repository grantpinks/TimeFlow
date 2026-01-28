/**
 * Insight Controller
 * 
 * Handles requests for AI-generated proactive insights across different surfaces
 */

import type { FastifyRequest, FastifyReply } from 'fastify';
import { getTodayInsights, getCalendarInsights, getInboxInsights } from '../services/insightService.js';
import { parseISO } from 'date-fns';

/**
 * GET /api/insights/today
 * Get proactive insights for the Today page
 */
export async function getTodayInsightsController(req: FastifyRequest, reply: FastifyReply) {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return reply.status(401).send({ error: 'Unauthorized' });
    }

    const insights = await getTodayInsights(userId);
    return reply.status(200).send({ insights });
  } catch (error) {
    console.error('[InsightController] Error fetching today insights:', error);
    return reply.status(500).send({ error: 'Failed to fetch insights' });
  }
}

/**
 * GET /api/insights/calendar
 * Get proactive insights for the Calendar page
 * Query params: date (ISO string, optional, defaults to today)
 */
export async function getCalendarInsightsController(req: FastifyRequest, reply: FastifyReply) {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return reply.status(401).send({ error: 'Unauthorized' });
    }

    const query = req.query as { date?: string };
    const dateParam = query.date;
    const viewDate = dateParam ? parseISO(dateParam) : new Date();

    const insights = await getCalendarInsights(userId, viewDate);
    return reply.status(200).send({ insights });
  } catch (error) {
    console.error('[InsightController] Error fetching calendar insights:', error);
    return reply.status(500).send({ error: 'Failed to fetch insights' });
  }
}

/**
 * GET /api/insights/inbox
 * Get proactive insights for the Inbox page
 */
export async function getInboxInsightsController(req: FastifyRequest, reply: FastifyReply) {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return reply.status(401).send({ error: 'Unauthorized' });
    }

    const insights = await getInboxInsights(userId);
    return reply.status(200).send({ insights });
  } catch (error) {
    console.error('[InsightController] Error fetching inbox insights:', error);
    return reply.status(500).send({ error: 'Failed to fetch insights' });
  }
}
