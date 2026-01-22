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
import * as categoryTrainingService from '../services/categoryTrainingService.js';

const getCategorizationsSchema = z.object({
  eventIds: z.array(z.string()),
  provider: z.string().optional().default('google'),
  eventSummaries: z.record(z.string()).optional(),
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

  const { eventIds, provider, eventSummaries } = parsed.data;

  try {
    const categorizations = await eventCategorizationService.getEventCategorizations(
      user.id,
      eventIds,
      provider
    );

    if (eventSummaries && Object.keys(eventSummaries).length > 0) {
      const trainingProfiles = await categoryTrainingService.getTrainingProfiles(user.id);
      const normalizeTitle = (value: string) =>
        value.toLowerCase().replace(/\s+/g, ' ').trim();
      const exactTitleOverrides = new Map<string, string>();
      for (const profile of trainingProfiles) {
        const snapshots = Array.isArray(profile.exampleEventsSnapshot)
          ? profile.exampleEventsSnapshot
          : [];
        for (const example of snapshots) {
          if (!example.summary) continue;
          const normalized = normalizeTitle(example.summary);
          if (!normalized) continue;
          if (exactTitleOverrides.has(normalized)) {
            continue;
          }
          exactTitleOverrides.set(normalized, profile.categoryId);
        }
      }

      const categories = await categoryService.getCategories(user.id);
      const categoryLookup = new Map(categories.map((category) => [category.id, category]));

      for (const eventId of eventIds) {
        const existing = categorizations.get(eventId);
        if (existing?.isManual) {
          continue;
        }
        const summary = eventSummaries[eventId];
        if (!summary) continue;
        const normalized = normalizeTitle(summary);
        const overrideCategoryId = normalized ? exactTitleOverrides.get(normalized) : undefined;
        if (!overrideCategoryId) continue;
        if (existing && existing.categoryId === overrideCategoryId) {
          continue;
        }

        const category = categoryLookup.get(overrideCategoryId);
        if (!category) continue;

        categorizations.set(eventId, {
          categoryId: category.id,
          categoryName: category.name,
          categoryColor: category.color,
          confidence: 1.0,
          isManual: true,
        });
      }
    }

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

    const trainingProfiles = await categoryTrainingService.getTrainingProfiles(user.id);
    const trainingContexts = Object.fromEntries(
      trainingProfiles.map((profile) => {
        const categoryName =
          userCategories.find((cat) => cat.id === profile.categoryId)?.name || '';
        const snapshots = Array.isArray(profile.exampleEventsSnapshot)
          ? profile.exampleEventsSnapshot
          : [];
        return [
          profile.categoryId,
          {
            categoryId: profile.categoryId,
            name: categoryName,
            includeKeywords: profile.includeKeywords || [],
            excludeKeywords: profile.excludeKeywords || [],
            description: profile.description || undefined,
            examples: snapshots.map((example) => ({
              summary: example.summary,
              description: example.description,
            })),
          },
        ];
      })
    );

    const normalizeTitle = (value: string) =>
      value.toLowerCase().replace(/\s+/g, ' ').trim();
    const exactTitleOverrides = new Map<string, string>();
    for (const profile of trainingProfiles) {
      const snapshots = Array.isArray(profile.exampleEventsSnapshot)
        ? profile.exampleEventsSnapshot
        : [];
      for (const example of snapshots) {
        if (!example.summary) continue;
        const normalized = normalizeTitle(example.summary);
        if (!normalized) continue;
        if (exactTitleOverrides.has(normalized)) {
          continue;
        }
        exactTitleOverrides.set(normalized, profile.categoryId);
      }
    }

    const existingCategorizations = await eventCategorizationService.getEventCategorizations(
      user.id,
      allEvents.map((event) => event.id).filter((id): id is string => Boolean(id)),
      'google'
    );
    const exactMatchCategorizations = [];
    for (const event of allEvents) {
      const normalized = normalizeTitle(event.summary || '');
      const overrideCategoryId = normalized ? exactTitleOverrides.get(normalized) : undefined;
      if (overrideCategoryId) {
        const existing = event.id ? existingCategorizations.get(event.id) : undefined;
        if (existing?.isManual) {
          continue;
        }
        if (existing?.categoryId === overrideCategoryId) {
          continue;
        }
        exactMatchCategorizations.push({
          eventId: event.id,
          calendarId,
          provider: 'google',
          categoryId: overrideCategoryId,
          eventSummary: event.summary,
          confidence: 1.0,
          isManual: true,
        });
      }
    }

    if (exactMatchCategorizations.length > 0) {
      console.log(
        '[categorizeAllEvents] Applying exact-title overrides:',
        exactMatchCategorizations.length
      );
      await eventCategorizationService.batchUpsertCategorizations(
        user.id,
        exactMatchCategorizations
      );
    }

    // Filter to uncategorized events only after applying exact-title overrides
    const uncategorized = await eventCategorizationService.getUncategorizedEvents(
      user.id,
      allEvents
    );
    console.log('[categorizeAllEvents] Uncategorized events:', uncategorized.length);

    if (uncategorized.length === 0) {
      return {
        categorized: exactMatchCategorizations.length,
        total: allEvents.length,
        uncategorizedCount: 0,
        message: exactMatchCategorizations.length > 0
          ? `Applied ${exactMatchCategorizations.length} exact-title overrides`
          : 'All events are already categorized',
      };
    }

    const exactMatchIds = new Set(exactMatchCategorizations.map((cat) => cat.eventId));
    const remainingForAi = uncategorized.filter((event) => !exactMatchIds.has(event.id));

    // Categorize remaining with AI
    console.log('[categorizeAllEvents] Starting AI categorization...');
    const aiResults = await aiCategorizationService.batchCategorizeEvents(
      remainingForAi,
      userCategories,
      trainingContexts
    );
    console.log('[categorizeAllEvents] AI categorization complete:', aiResults.size);

    // Save AI categorizations to database
    const categorizationsToSave = [];
    for (const [eventId, result] of aiResults.entries()) {
      const event = remainingForAi.find((e) => e.id === eventId);
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
    if (categorizationsToSave.length > 0) {
      await eventCategorizationService.batchUpsertCategorizations(
        user.id,
        categorizationsToSave
      );
    }

    console.log('[categorizeAllEvents] Categorization complete!');
    const totalCategorized = exactMatchCategorizations.length + categorizationsToSave.length;
    return {
      categorized: totalCategorized,
      total: allEvents.length,
      uncategorizedCount: uncategorized.length,
      message: `Successfully categorized ${totalCategorized} events`,
    };
  } catch (error) {
    console.error('[categorizeAllEvents] ERROR:', error);
    request.log.error(error, 'Failed to categorize events');
    return reply.status(500).send({ error: 'Failed to categorize events' });
  }
}

const trainingExampleSchema = z.object({
  eventId: z.string(),
  summary: z.string(),
  description: z.string().optional(),
  start: z.string(),
  end: z.string(),
  attendeeDomains: z.array(z.string()).optional(),
  calendarId: z.string().optional(),
  provider: z.string().optional(),
});

const updateCategorizationSchema = z.object({
  categoryId: z.string(),
  train: z.boolean().optional(),
  example: trainingExampleSchema.optional(),
  eventSummary: z.string().optional(),
});

/**
 * PUT /api/events/:eventId/categorization
 * Update event categorization (manual override)
 */
export async function updateEventCategorization(
  request: FastifyRequest<{
    Params: { eventId: string };
    Body: {
      categoryId: string;
      train?: boolean;
      example?: z.infer<typeof trainingExampleSchema>;
      eventSummary?: string;
    };
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
  const { categoryId, train, example, eventSummary } = parsed.data;
  const provider = request.query.provider || 'google';

  try {
    const updated = await eventCategorizationService.updateEventCategorization(
      user.id,
      eventId,
      provider,
      categoryId,
      { eventSummary }
    );

    if (train && example) {
      try {
        await categoryTrainingService.addTrainingExample(user.id, categoryId, example);
      } catch (error) {
        request.log.error(error, 'Failed to save training example');
      }
    }

    return updated;
  } catch (error) {
    if (error instanceof Error && error.message.includes('not found')) {
      const summary = eventSummary || example?.summary;
      const calendarId = example?.calendarId || user.defaultCalendarId || 'primary';
      if (!summary) {
        return reply.status(404).send({ error: error.message });
      }

      try {
        const created = await eventCategorizationService.upsertEventCategorization(
          user.id,
          eventId,
          calendarId,
          provider,
          categoryId,
          summary,
          { confidence: 1.0, isManual: true }
        );

        if (train && example) {
          try {
            await categoryTrainingService.addTrainingExample(user.id, categoryId, example);
          } catch (trainError) {
            request.log.error(trainError, 'Failed to save training example');
          }
        }

        return created;
      } catch (createError) {
        request.log.error(createError, 'Failed to create event categorization');
        return reply.status(500).send({ error: 'Failed to update event categorization' });
      }
    }

    request.log.error(error, 'Failed to update event categorization');
    return reply.status(500).send({ error: 'Failed to update event categorization' });
  }
}

/**
 * DELETE /api/events/:eventId/categorization
 * Delete event categorization (reset to uncategorized)
 */
export async function deleteEventCategorization(
  request: FastifyRequest<{
    Params: { eventId: string };
    Querystring: { provider?: string };
  }>,
  reply: FastifyReply
) {
  const user = request.user;
  if (!user) {
    return reply.status(401).send({ error: 'Not authenticated' });
  }

  const { eventId } = request.params;
  const provider = request.query.provider || 'google';

  try {
    await eventCategorizationService.deleteEventCategorization(user.id, eventId, provider);
    return { success: true };
  } catch (error) {
    if (error instanceof Error && error.message.includes('not found')) {
      return reply.status(404).send({ error: error.message });
    }
    request.log.error(error, 'Failed to delete event categorization');
    return reply.status(500).send({ error: 'Failed to delete event categorization' });
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
