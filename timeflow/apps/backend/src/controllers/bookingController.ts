/**
 * Booking Controller
 *
 * Handles public meeting booking operations.
 */

import { FastifyRequest, FastifyReply } from 'fastify';
import * as meetingBookingService from '../services/meetingBookingService.js';
import { z } from 'zod';

/**
 * Format Zod validation errors
 */
function formatZodError(error: z.ZodError): string {
  const fieldErrors = error.flatten().fieldErrors;
  const messages: string[] = [];

  for (const [field, errors] of Object.entries(fieldErrors)) {
    if (errors && errors.length > 0) {
      messages.push(`${field}: ${errors.join(', ')}`);
    }
  }

  return messages.length > 0 ? messages.join('; ') : 'Validation failed';
}

const bookMeetingSchema = z.object({
  inviteeName: z.string().min(1),
  inviteeEmail: z.string().email(),
  notes: z.string().optional(),
  // Accept both UTC (Z) and timezone-aware (-06:00) ISO 8601 formats
  startDateTime: z.string().regex(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{3})?(Z|[+-]\d{2}:\d{2})$/, 'Invalid datetime format'),
  durationMinutes: z.number().positive(),
});

const rescheduleMeetingSchema = z.object({
  token: z.string().min(1),
  // Accept both UTC (Z) and timezone-aware (-06:00) ISO 8601 formats
  startDateTime: z.string().regex(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{3})?(Z|[+-]\d{2}:\d{2})$/, 'Invalid datetime format'),
  durationMinutes: z.number().positive(),
});

const cancelMeetingSchema = z.object({
  token: z.string().min(1),
});

/**
 * POST /api/book/:slug
 */
export async function bookMeeting(
  request: FastifyRequest<{ Params: { slug: string } }>,
  reply: FastifyReply
) {
  const { slug } = request.params;

  try {
    // DEBUG: Log what we received
    request.log.info({ body: request.body }, 'Booking request received');

    const data = bookMeetingSchema.parse(request.body);

    const result = await meetingBookingService.bookMeeting(slug, data);

    reply.status(201).send(result);
  } catch (error) {
    if (error instanceof z.ZodError) {
      reply.status(400).send({ error: formatZodError(error) });
    } else if (error instanceof Error) {
      if (error.message.includes('not found') || error.message.includes('inactive')) {
        reply.status(404).send({ error: error.message });
      } else if (error.message.includes('Invalid duration') || error.message.includes('no longer available')) {
        reply.status(400).send({ error: error.message });
      } else {
        throw error;
      }
    } else {
      throw error;
    }
  }
}

/**
 * POST /api/book/:slug/reschedule
 */
export async function rescheduleMeeting(
  request: FastifyRequest<{ Params: { slug: string } }>,
  reply: FastifyReply
) {
  const { slug } = request.params;

  try {
    const data = rescheduleMeetingSchema.parse(request.body);

    const result = await meetingBookingService.rescheduleMeeting(slug, data.token, {
      startDateTime: data.startDateTime,
      durationMinutes: data.durationMinutes,
    });

    reply.send(result);
  } catch (error) {
    if (error instanceof z.ZodError) {
      reply.status(400).send({ error: formatZodError(error) });
    } else if (error instanceof Error) {
      if (error.message.includes('Invalid') || error.message.includes('expired') || error.message.includes('used')) {
        reply.status(400).send({ error: error.message });
      } else if (error.message.includes('not match')) {
        reply.status(403).send({ error: error.message });
      } else {
        throw error;
      }
    } else {
      throw error;
    }
  }
}

/**
 * POST /api/book/:slug/cancel
 */
export async function cancelMeeting(
  request: FastifyRequest<{ Params: { slug: string } }>,
  reply: FastifyReply
) {
  const { slug } = request.params;

  try {
    const data = cancelMeetingSchema.parse(request.body);

    const result = await meetingBookingService.cancelMeeting(slug, data.token);

    reply.send(result);
  } catch (error) {
    if (error instanceof z.ZodError) {
      reply.status(400).send({ error: formatZodError(error) });
    } else if (error instanceof Error) {
      if (error.message.includes('Invalid') || error.message.includes('expired') || error.message.includes('used')) {
        reply.status(400).send({ error: error.message });
      } else if (error.message.includes('not match')) {
        reply.status(403).send({ error: error.message });
      } else {
        throw error;
      }
    } else {
      throw error;
    }
  }
}
