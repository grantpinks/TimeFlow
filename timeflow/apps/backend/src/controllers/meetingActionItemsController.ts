/**
 * POST /api/calendar/meetings/extract-action-items
 * AI-suggested follow-up tasks from a meeting, with identity tags (18.33).
 */

import { FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';
import { formatZodError } from '../utils/errorFormatter.js';
import * as identityService from '../services/identityService.js';
import * as meetingActionItemsService from '../services/meetingActionItemsService.js';

const bodySchema = z.object({
  summary: z.string().trim().min(1),
  description: z.string().optional(),
  start: z.string().min(1),
  end: z.string().min(1),
  attendees: z.array(z.object({ email: z.string().min(1) })).optional(),
});

export async function extractMeetingActionItems(
  request: FastifyRequest<{ Body: z.infer<typeof bodySchema> }>,
  reply: FastifyReply
) {
  const user = request.user;
  if (!user) {
    return reply.status(401).send({ error: 'Not authenticated' });
  }

  const parsed = bodySchema.safeParse(request.body ?? {});
  if (!parsed.success) {
    return reply.status(400).send({ error: formatZodError(parsed.error) });
  }

  const { summary, description, start, end, attendees } = parsed.data;
  const attendeeEmails = (attendees ?? [])
    .map((a) => a.email.trim())
    .filter(Boolean);

  try {
    const identities = await identityService.getIdentities(user.id);
    const identityOptions: meetingActionItemsService.IdentityForExtraction[] = identities.map(
      (i) => ({
        id: i.id,
        name: i.name,
        icon: i.icon,
      })
    );

    const items = await meetingActionItemsService.extractMeetingActionItems({
      meetingTitle: summary,
      meetingDescription: description,
      startIso: start,
      endIso: end,
      attendeeEmails,
      identities: identityOptions,
    });

    return reply.send({ items });
  } catch (err) {
    request.log.error(err, 'extractMeetingActionItems failed');
    const message = err instanceof Error ? err.message : 'Failed to extract action items';
    const status = message.includes('OPENAI_API_KEY') ? 503 : 500;
    return reply.status(status).send({ error: message });
  }
}
