/**
 * Calendar Routes
 *
 * Registers Google Calendar read endpoints.
 */

import { FastifyInstance } from 'fastify';
import * as calendarController from '../controllers/calendarController.js';
import { requireAuth } from '../middlewares/auth.js';

export async function registerCalendarRoutes(server: FastifyInstance) {
  // Get events in date range
  server.get(
    '/calendar/events',
    { preHandler: requireAuth },
    calendarController.getEvents
  );

  // List user's calendars
  server.get(
    '/calendar/list',
    { preHandler: requireAuth },
    calendarController.listCalendars
  );
}

