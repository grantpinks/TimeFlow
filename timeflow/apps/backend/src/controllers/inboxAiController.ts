import type { FastifyRequest, FastifyReply } from 'fastify';
import { getFullEmail } from '../services/gmailService.js';
import * as categoryService from '../services/categoryService.js';
import * as inboxAiService from '../services/inboxAiService.js';

interface DraftRequestBody {
  emailId: string;
}

export async function draftTaskFromEmail(
  request: FastifyRequest<{ Body: DraftRequestBody }>,
  reply: FastifyReply
) {
  const userId = request.user?.id;
  if (!userId) {
    return reply.status(401).send({ error: 'Unauthorized' });
  }
  const { emailId } = request.body || {};
  if (!emailId) {
    return reply.status(400).send({ error: 'emailId is required' });
  }

  const email = await getFullEmail(userId, emailId);
  if (!email) {
    return reply.status(404).send({ error: 'Email not found' });
  }

  const result = await inboxAiService.draftTaskFromEmail(email);
  return reply.send(result);
}

export async function draftLabelSync(
  request: FastifyRequest<{ Body: DraftRequestBody }>,
  reply: FastifyReply
) {
  const userId = request.user?.id;
  if (!userId) {
    return reply.status(401).send({ error: 'Unauthorized' });
  }
  const { emailId } = request.body || {};
  if (!emailId) {
    return reply.status(400).send({ error: 'emailId is required' });
  }

  const email = await getFullEmail(userId, emailId);
  if (!email) {
    return reply.status(404).send({ error: 'Email not found' });
  }

  const categories = await categoryService.getEmailCategoryConfigsForUser(userId);
  const result = await inboxAiService.draftLabelSync(
    email,
    categories.map((category) => ({ id: category.id, name: category.name }))
  );
  return reply.send(result);
}

export async function draftLabelExplanation(
  request: FastifyRequest<{ Body: DraftRequestBody }>,
  reply: FastifyReply
) {
  const userId = request.user?.id;
  if (!userId) {
    return reply.status(401).send({ error: 'Unauthorized' });
  }
  const { emailId } = request.body || {};
  if (!emailId) {
    return reply.status(400).send({ error: 'emailId is required' });
  }

  const email = await getFullEmail(userId, emailId);
  if (!email) {
    return reply.status(404).send({ error: 'Email not found' });
  }

  const categories = await categoryService.getEmailCategoryConfigsForUser(userId);
  const categoryName =
    categories.find((category) => category.id === email.category)?.name || 'Other';

  const result = await inboxAiService.draftLabelExplanation(email, categoryName);
  return reply.send(result);
}
