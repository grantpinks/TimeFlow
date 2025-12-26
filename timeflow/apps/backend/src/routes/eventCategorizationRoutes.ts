/**
 * Event Categorization Routes
 *
 * AI-powered categorization of external calendar events
 */

import { FastifyInstance } from 'fastify';
import * as eventCategorizationController from '../controllers/eventCategorizationController.js';
import { requireAuth } from '../middlewares/auth.js';

export async function registerEventCategorizationRoutes(server: FastifyInstance) {
  // Get categorizations for events
  server.post(
    '/events/categorizations',
    { preHandler: requireAuth },
    eventCategorizationController.getEventCategorizations
  );

  // Categorize all uncategorized events
  server.post(
    '/events/categorize-all',
    { preHandler: requireAuth },
    eventCategorizationController.categorizeAllEvents
  );

  // Update event categorization (manual override)
  server.put(
    '/events/:eventId/categorization',
    { preHandler: requireAuth },
    eventCategorizationController.updateEventCategorization
  );

  // Get categorization stats
  server.get(
    '/events/categorization-stats',
    { preHandler: requireAuth },
    eventCategorizationController.getCategorizationStats
  );
}
