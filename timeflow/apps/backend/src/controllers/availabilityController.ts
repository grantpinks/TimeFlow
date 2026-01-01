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
    const requestedFrom = from;
    const requestedTo = to;

    // Clamp to booking horizon if configured
    const horizonEnd =
      link.maxBookingHorizonDays && link.maxBookingHorizonDays > 0
        ? DateTime.fromISO(requestedFrom, { zone: user.timeZone })
            .plus({ days: link.maxBookingHorizonDays })
            .endOf('day')
            .toISO()
        : null;

    const effectiveTo =
      horizonEnd && DateTime.fromISO(requestedTo) > DateTime.fromISO(horizonEnd)
        ? horizonEnd
        : requestedTo;

    // Fetch busy events from calendar
    const busyIntervals: Array<{ start: string; end: string }> = [];

    // Google Calendar events
    if (link.calendarProvider === 'google' && user.googleAccessToken) {
      try {
        const events = await googleCalendarService.getEvents(
          user.id,
          link.calendarId,
          requestedFrom,
          effectiveTo
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
          requestedFrom,
          effectiveTo
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
        startDateTime: { gte: new Date(requestedFrom) },
        endDateTime: { lte: new Date(effectiveTo) },
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
        startDateTime: { gte: new Date(requestedFrom) },
        endDateTime: { lte: new Date(effectiveTo) },
      },
    });

    busyIntervals.push(
      ...scheduledHabits.map((h) => ({
        start: h.startDateTime.toISOString(),
        end: h.endDateTime.toISOString(),
      }))
    );

    // DEBUG: Log meeting preferences and busy intervals (guard for tests without logger)
    if (request.log && typeof request.log.info === 'function') {
      request.log.info({
        meetingStartTime: user.meetingStartTime,
        meetingEndTime: user.meetingEndTime,
        blockedDaysOfWeek: user.blockedDaysOfWeek,
        wakeTime: user.wakeTime,
        sleepTime: user.sleepTime,
        busyIntervalsCount: busyIntervals.length,
        busyIntervals: busyIntervals.slice(0, 5), // Log first 5
      }, 'Meeting preferences for availability calculation');
    }

    // Build availability slots
    const slots = buildAvailabilitySlots({
      rangeStart: requestedFrom,
      rangeEnd: effectiveTo,
      durationsMinutes: link.durationsMinutes,
      bufferBeforeMinutes: link.bufferBeforeMinutes,
      bufferAfterMinutes: link.bufferAfterMinutes,
      busyIntervals,
      timeZone: user.timeZone,
      wakeTime: user.wakeTime,
      sleepTime: user.sleepTime,
      dailySchedule: user.dailySchedule,

      // Pass meeting preferences
      meetingStartTime: user.meetingStartTime,
      meetingEndTime: user.meetingEndTime,
      blockedDaysOfWeek: user.blockedDaysOfWeek,
      dailyMeetingSchedule: user.dailyMeetingSchedule,
      maxBookingHorizonDays: link.maxBookingHorizonDays,
      dailyCap: link.dailyCap,
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
