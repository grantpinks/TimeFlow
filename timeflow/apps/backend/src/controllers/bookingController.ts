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
  startDateTime: z.string().datetime(),
  durationMinutes: z.number().positive(),
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
