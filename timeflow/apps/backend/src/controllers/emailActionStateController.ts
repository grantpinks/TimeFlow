import { FastifyReply, FastifyRequest } from 'fastify';
import { z } from 'zod';
import { setActionState } from '../services/emailActionStateService.js';
import { formatZodError } from '../utils/errorFormatter.js';
import type { EmailActionState } from '@timeflow/shared';

const actionStateSchema = z.object({
  actionState: z.enum(['needs_reply', 'read_later']).nullable(),
});

export async function updateEmailActionState(
  request: FastifyRequest<{ Params: { threadId: string }; Body: unknown }>,
  reply: FastifyReply
) {
  const user = request.user;
  if (!user) {
    return reply.status(401).send({ error: 'Not authenticated' });
  }

  const threadId = request.params.threadId;
  if (!threadId) {
    return reply.status(400).send({ error: 'threadId is required' });
  }

  const parsed = actionStateSchema.safeParse(request.body);
  if (!parsed.success) {
    return reply.status(400).send({ error: formatZodError(parsed.error) });
  }

  const actionState = parsed.data.actionState as EmailActionState | null;
  const updated = await setActionState(user.id, threadId, actionState);

  return reply.send({ success: true, actionState: updated });
}
