/**
 * Event Categorization Controller
 *
 * Handles AI-powered categorization of external calendar events
 */

import { FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';
import { formatZodError } from '../utils/errorFormatter.js';
import * as eventCategorizationService from '../services/eventCategorizationService.js';
import * as aiCategorizationService from '../services/aiCategorizationService.js';
import * as calendarService from '../services/googleCalendarService.js';
import * as categoryService from '../services/categoryService.js';

const getCategorizationsSchema = z.object({
  eventIds: z.array(z.string()),
  provider: z.string().optional().default('google'),
});

/**
 * POST /api/events/categorizations
 * Get categorizations for a list of event IDs
 */
export async function getEventCategorizations(
  request: FastifyRequest<{ Body: { eventIds: string[]; provider?: string } }>,
  reply: FastifyReply
) {
  const user = request.user;
  if (!user) {
    return reply.status(401).send({ error: 'Not authenticated' });
  }

  const parsed = getCategorizationsSchema.safeParse(request.body);
  if (!parsed.success) {
    return reply.status(400).send({ error: formatZodError(parsed.error) });
  }

  const { eventIds, provider } = parsed.data;

  try {
    const categorizations = await eventCategorizationService.getEventCategorizations(
      user.id,
      eventIds,
      provider
    );

    // Convert Map to object for JSON response
    return Object.fromEntries(categorizations);
  } catch (error) {
    request.log.error(error, 'Failed to get event categorizations');
    return reply.status(500).send({ error: 'Failed to get event categorizations' });
  }
}

/**
 * POST /api/events/categorize-all
 * Categorize all uncategorized events using AI
 */
export async function categorizeAllEvents(
  request: FastifyRequest,
  reply: FastifyReply
) {
  const user = request.user;
  if (!user) {
    return reply.status(401).send({ error: 'Not authenticated' });
  }

  try {
    console.log('[categorizeAllEvents] Starting categorization for user:', user.id);

    // Get user's categories
    const userCategories = await categoryService.getCategories(user.id);
    console.log('[categorizeAllEvents] Found categories:', userCategories.length);

    if (userCategories.length === 0) {
      return reply.status(400).send({
        error: 'No categories found. Please create categories first.'
      });
    }

    // Get all events from the last 3 months and next month
    const now = new Date();
    const startDate = new Date(now.getFullYear(), now.getMonth() - 3, 1);
    const endDate = new Date(now.getFullYear(), now.getMonth() + 2, 0);
    console.log('[categorizeAllEvents] Date range:', { startDate, endDate });

    const calendarId = user.defaultCalendarId || 'primary';
    console.log('[categorizeAllEvents] Fetching events from calendar:', calendarId);

    const allEvents = await calendarService.getEvents(
      user.id,
      calendarId,
      startDate.toISOString(),
      endDate.toISOString()
    );
    console.log('[categorizeAllEvents] Found events:', allEvents.length);

    // Clean up stale categorizations (events deleted from Google Calendar)
    const currentEventIds = allEvents.map(e => e.id);
    const deletedCount = await eventCategorizationService.cleanupStaleCategorizations(
      user.id,
      currentEventIds
    );
    if (deletedCount > 0) {
      console.log('[categorizeAllEvents] Cleaned up', deletedCount, 'stale categorizations');
    }

    // Filter to uncategorized events only
    const uncategorized = await eventCategorizationService.getUncategorizedEvents(
      user.id,
      allEvents
    );
    console.log('[categorizeAllEvents] Uncategorized events:', uncategorized.length);

    if (uncategorized.length === 0) {
      return {
        categorized: 0,
        total: allEvents.length,
        message: 'All events are already categorized',
      };
    }

    // Categorize with AI
    console.log('[categorizeAllEvents] Starting AI categorization...');
    const aiResults = await aiCategorizationService.batchCategorizeEvents(
      uncategorized,
      userCategories
    );
    console.log('[categorizeAllEvents] AI categorization complete:', aiResults.size);

    // Save categorizations to database
    const categorizationsToSave = [];
    for (const [eventId, result] of aiResults.entries()) {
      const event = uncategorized.find((e) => e.id === eventId);
      if (event) {
        categorizationsToSave.push({
          eventId: event.id,
          calendarId,
          provider: 'google',
          categoryId: result.categoryId,
          eventSummary: event.summary,
          confidence: result.confidence,
          isManual: false,
        });
      }
    }

    console.log('[categorizeAllEvents] Saving categorizations:', categorizationsToSave.length);
    await eventCategorizationService.batchUpsertCategorizations(
      user.id,
      categorizationsToSave
    );

    console.log('[categorizeAllEvents] Categorization complete!');
    return {
      categorized: categorizationsToSave.length,
      total: allEvents.length,
      uncategorizedCount: uncategorized.length,
      message: `Successfully categorized ${categorizationsToSave.length} events`,
    };
  } catch (error) {
    console.error('[categorizeAllEvents] ERROR:', error);
    request.log.error(error, 'Failed to categorize events');
    return reply.status(500).send({ error: 'Failed to categorize events' });
  }
}

const updateCategorizationSchema = z.object({
  categoryId: z.string(),
});

/**
 * PUT /api/events/:eventId/categorization
 * Update event categorization (manual override)
 */
export async function updateEventCategorization(
  request: FastifyRequest<{
    Params: { eventId: string };
    Body: { categoryId: string };
    Querystring: { provider?: string };
  }>,
  reply: FastifyReply
) {
  const user = request.user;
  if (!user) {
    return reply.status(401).send({ error: 'Not authenticated' });
  }

  const parsed = updateCategorizationSchema.safeParse(request.body);
  if (!parsed.success) {
    return reply.status(400).send({ error: formatZodError(parsed.error) });
  }

  const { eventId } = request.params;
  const { categoryId } = parsed.data;
  const provider = request.query.provider || 'google';

  try {
    const updated = await eventCategorizationService.updateEventCategorization(
      user.id,
      eventId,
      provider,
      categoryId
    );

    return updated;
  } catch (error) {
    request.log.error(error, 'Failed to update event categorization');
    if (error instanceof Error && error.message.includes('not found')) {
      return reply.status(404).send({ error: error.message });
    }
    return reply.status(500).send({ error: 'Failed to update event categorization' });
  }
}

/**
 * GET /api/events/categorization-stats
 * Get categorization statistics for the user
 */
export async function getCategorizationStats(
  request: FastifyRequest,
  reply: FastifyReply
) {
  const user = request.user;
  if (!user) {
    return reply.status(401).send({ error: 'Not authenticated' });
  }

  try {
    const stats = await eventCategorizationService.getCategorizationStats(user.id);
    return stats;
  } catch (error) {
    request.log.error(error, 'Failed to get categorization stats');
    return reply.status(500).send({ error: 'Failed to get categorization stats' });
  }
}
