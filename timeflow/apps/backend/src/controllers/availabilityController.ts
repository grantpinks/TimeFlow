/**
 * Availability Controller
 *
 * Handles public availability queries for scheduling links.
 */

import { FastifyRequest, FastifyReply } from 'fastify';
import { prisma } from '../config/prisma.js';
import { buildAvailabilitySlots } from '../services/meetingAvailabilityService.js';
import * as googleCalendarService from '../services/googleCalendarService.js';
import * as appleCalendarService from '../services/appleCalendarService.js';
import { DateTime } from 'luxon';

interface AvailabilityQuery {
  from?: string;
  to?: string;
}

/**
 * Validate availability query parameters
 */
export function validateAvailabilityQuery(query: AvailabilityQuery): { from: string; to: string } {
  if (!query.from) {
    throw new Error('Missing required parameter: from');
  }
  if (!query.to) {
    throw new Error('Missing required parameter: to');
  }

  return {
    from: query.from,
    to: query.to,
  };
}

/**
 * GET /api/availability/:slug
 */
export async function getAvailability(
  request: FastifyRequest<{ Params: { slug: string }; Querystring: AvailabilityQuery }>,
  reply: FastifyReply
) {
  const { slug } = request.params;

  try {
    const { from, to } = validateAvailabilityQuery(request.query);

    // Load scheduling link
    const link = await prisma.schedulingLink.findUnique({
      where: { slug },
      include: { user: true },
    });

    if (!link || !link.isActive) {
      reply.status(404).send({ error: 'Scheduling link not found or inactive' });
      return;
    }

    const user = link.user;

    // Fetch busy events from calendar
    const busyIntervals: Array<{ start: string; end: string }> = [];

    // Google Calendar events
    if (link.calendarProvider === 'google' && user.googleAccessToken) {
      try {
        const events = await googleCalendarService.getEvents(
          user.id,
          link.calendarId,
          from,
          to
        );

        // Filter out transparent events (don't block availability)
        busyIntervals.push(
          ...events
            .filter((e) => e.transparency !== 'transparent')
            .map((e) => ({
              start: e.start,
              end: e.end,
            }))
        );
      } catch (error) {
        // Continue without Google events on error
      }
    }

    // Apple CalDAV events
    if (link.calendarProvider === 'apple') {
      try {
        const events = await appleCalendarService.getEvents(
          user.id,
          link.calendarId,
          from,
          to
        );

        // Filter out transparent events
        busyIntervals.push(
          ...events
            .filter((e) => e.transparency !== 'transparent')
            .map((e) => ({
              start: e.start,
              end: e.end,
            }))
        );
      } catch (error) {
        // Continue without Apple events on error
      }
    }

    // Fetch scheduled tasks/habits that block availability
    const scheduledTasks = await prisma.scheduledTask.findMany({
      where: {
        task: { userId: user.id },
        blocksAvailability: true,
        startDateTime: { gte: new Date(from) },
        endDateTime: { lte: new Date(to) },
      },
    });

    busyIntervals.push(
      ...scheduledTasks.map((t) => ({
        start: t.startDateTime.toISOString(),
        end: t.endDateTime.toISOString(),
      }))
    );

    const scheduledHabits = await prisma.scheduledHabit.findMany({
      where: {
        userId: user.id,
        blocksAvailability: true,
        startDateTime: { gte: new Date(from) },
        endDateTime: { lte: new Date(to) },
      },
    });

    busyIntervals.push(
      ...scheduledHabits.map((h) => ({
        start: h.startDateTime.toISOString(),
        end: h.endDateTime.toISOString(),
      }))
    );

    // Build availability slots
    const slots = buildAvailabilitySlots({
      rangeStart: from,
      rangeEnd: to,
      durationsMinutes: link.durationsMinutes,
      bufferBeforeMinutes: link.bufferBeforeMinutes,
      bufferAfterMinutes: link.bufferAfterMinutes,
      busyIntervals,
      timeZone: user.timeZone,
      wakeTime: user.wakeTime,
      sleepTime: user.sleepTime,
      dailySchedule: user.dailySchedule,
    });

    // Group slots by duration
    const slotsByDuration: Record<number, Array<{ start: string; end: string }>> = {};

    for (const slot of slots) {
      if (!slotsByDuration[slot.durationMinutes]) {
        slotsByDuration[slot.durationMinutes] = [];
      }
      slotsByDuration[slot.durationMinutes].push({
        start: slot.start,
        end: slot.end,
      });
    }

    reply.send({
      link: {
        name: link.name,
        durationsMinutes: link.durationsMinutes,
      },
      slots: slotsByDuration,
    });
  } catch (error) {
    if (error instanceof Error && error.message.includes('Missing required parameter')) {
      reply.status(400).send({ error: error.message });
    } else {
      throw error;
    }
  }
}
