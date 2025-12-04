/**
 * Calendar Controller
 *
 * Handles Google Calendar read operations.
 */

import { FastifyRequest, FastifyReply } from 'fastify';
import * as calendarService from '../services/googleCalendarService.js';
import { z } from 'zod';

const eventQuerySchema = z.object({
  from: z.string().datetime(),
  to: z.string().datetime(),
});

/**
 * GET /api/calendar/events
 * Returns events from the user's Google Calendar within the specified range.
 */
export async function getEvents(
  request: FastifyRequest<{ Querystring: { from: string; to: string } }>,
  reply: FastifyReply
) {
  const user = request.user;
  if (!user) {
    return reply.status(401).send({ error: 'Not authenticated' });
  }

  const parsed = eventQuerySchema.safeParse(request.query);
  if (!parsed.success) {
    return reply.status(400).send({ error: parsed.error.flatten().fieldErrors });
  }

  const { from, to } = parsed.data;

  try {
    const calendarId = user.defaultCalendarId || 'primary';
    const events = await calendarService.getEvents(user.id, calendarId, from, to);
    return events;
  } catch (error) {
    request.log.error(error, 'Failed to fetch calendar events');
    return reply.status(500).send({ error: 'Failed to fetch calendar events' });
  }
}

/**
 * GET /api/calendar/list
 * Returns a list of the user's calendars.
 */
export async function listCalendars(request: FastifyRequest, reply: FastifyReply) {
  const user = request.user;
  if (!user) {
    return reply.status(401).send({ error: 'Not authenticated' });
  }

  try {
    const calendars = await calendarService.listCalendars(user.id);
    return calendars;
  } catch (error) {
    request.log.error(error, 'Failed to list calendars');
    return reply.status(500).send({ error: 'Failed to list calendars' });
  }
}

