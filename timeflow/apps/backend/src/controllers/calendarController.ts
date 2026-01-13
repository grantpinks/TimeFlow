/**
 * Calendar Controller
 *
 * Handles Google Calendar read operations.
 */

import { FastifyRequest, FastifyReply } from 'fastify';
import * as calendarService from '../services/googleCalendarService.js';
import { z } from 'zod';
import { formatZodError } from '../utils/errorFormatter.js';
import { buildTimeflowEventDetails } from '../utils/timeflowEventPrefix.js';

const eventQuerySchema = z.object({
  from: z.string().datetime(),
  to: z.string().datetime(),
});

/**
 * GET /api/calendar/events
 * Returns events from the user's Google Calendar within the specified range,
 * enriched with task and habit source information and completion status.
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
    return reply.status(400).send({ error: formatZodError(parsed.error) });
  }

  const { from, to } = parsed.data;

  try {
    const calendarId = user.defaultCalendarId || 'primary';

    // Fetch Google Calendar events (external events)
    const googleEvents = await calendarService.getEvents(user.id, calendarId, from, to);

    // Fetch scheduled tasks with completion status
    const {prisma} = await import('../config/prisma.js');
    const scheduledTasks = await prisma.scheduledTask.findMany({
      where: {
        task: { userId: user.id },
        startDateTime: { gte: from },
        endDateTime: { lte: to },
      },
      include: {
        task: {
          select: {
            id: true,
            title: true,
            description: true,
            status: true,
          },
        },
      },
    });

    // Fetch scheduled habits with completion status
    const scheduledHabits = await prisma.scheduledHabit.findMany({
      where: {
        habit: { userId: user.id },
        startDateTime: { gte: from },
        endDateTime: { lte: to },
      },
      include: {
        habit: {
          select: {
            id: true,
            title: true,
            description: true,
          },
        },
        completion: {
          select: {
            status: true,
          },
        },
      },
    });

    // Convert tasks to calendar events
    const taskEvents = scheduledTasks.map((st) => ({
      id: st.eventId,
      summary: st.task.title,
      description: st.task.description || undefined,
      start: st.startDateTime.toISOString(),
      end: st.endDateTime.toISOString(),
      sourceType: 'task' as const,
      sourceId: st.task.id,
      isCompleted: st.task.status === 'completed',
    }));

    // Convert habits to calendar events
    const habitEvents = scheduledHabits.map((sh) => {
      const habitDetails = buildTimeflowEventDetails({
        title: sh.habit.title,
        kind: 'habit',
        prefixEnabled: user.eventPrefixEnabled,
        prefix: user.eventPrefix,
        description: sh.habit.description || undefined,
      });
      return {
        id: sh.eventId,
        summary: habitDetails.summary,
        description: habitDetails.description,
        start: sh.startDateTime.toISOString(),
        end: sh.endDateTime.toISOString(),
        sourceType: 'habit' as const,
        sourceId: sh.id, // Use scheduledHabit ID for completion API
        isCompleted: sh.completion?.status === 'completed',
      };
    });

    // Mark Google Calendar events as external
    const externalEvents = googleEvents.map((event) => ({
      ...event,
      sourceType: 'external' as const,
    }));

    // Merge and return all events
    return [...externalEvents, ...taskEvents, ...habitEvents];
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

const habitEventsSchema = z.object({
  events: z.array(
    z.object({
      habitId: z.string(),
      title: z.string(),
      start: z.string().datetime(),
      end: z.string().datetime(),
    })
  ),
});

/**
 * POST /api/calendar/create-habit-events
 * Creates calendar events for scheduled habits.
 */
export async function createHabitEvents(
  request: FastifyRequest<{ Body: { events: Array<{ habitId: string; title: string; start: string; end: string }> } }>,
  reply: FastifyReply
) {
  const user = request.user;
  if (!user) {
    return reply.status(401).send({ error: 'Not authenticated' });
  }

  const parsed = habitEventsSchema.safeParse(request.body);
  if (!parsed.success) {
    return reply.status(400).send({ error: formatZodError(parsed.error) });
  }

  const { events } = parsed.data;

  try {
    const calendarId = user.defaultCalendarId || 'primary';
    const createdEvents = [];

    for (const event of events) {
      const habitEvent = buildTimeflowEventDetails({
        title: event.title,
        kind: 'habit',
        prefixEnabled: user.eventPrefixEnabled,
        prefix: user.eventPrefix,
        description: 'Scheduled habit from TimeFlow',
      });
      const calendarEvent = await calendarService.createEvent(
        user.id,
        calendarId,
        {
          summary: habitEvent.summary,
          description: habitEvent.description,
          start: event.start,
          end: event.end,
        }
      );
      createdEvents.push(calendarEvent);
    }

    return {
      success: true,
      created: createdEvents.length,
      events: createdEvents,
    };
  } catch (error) {
    request.log.error(error, 'Failed to create habit events');
    return reply.status(500).send({ error: 'Failed to create habit events' });
  }
}
