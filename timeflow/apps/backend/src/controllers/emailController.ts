/**
 * Email Controller
 *
 * Read-only Gmail inbox access for Today page.
 */

import { FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';
import * as gmailService from '../services/gmailService.js';
import * as emailCategorizationService from '../services/emailCategorizationService.js';
import { GmailRateLimitError } from '../utils/gmailRateLimiter.js';
import { formatZodError } from '../utils/errorFormatter.js';
import * as categoryService from '../services/categoryService.js';
import * as emailExplanationService from '../services/emailExplanationService.js';

const inboxQuerySchema = z.object({
  maxResults: z.coerce.number().int().min(1).max(50).optional(),
  pageToken: z.string().optional(),
});

const sendEmailSchema = z.object({
  to: z.string().email(),
  subject: z.string().min(1),
  body: z.string().min(1),
  inReplyTo: z.string().optional(),
  threadId: z.string().optional(),
});

const searchQuerySchema = z.object({
  q: z.string().min(1),
  maxResults: z.coerce.number().int().min(1).max(50).optional(),
});

const markAsReadSchema = z.object({
  isRead: z.boolean(),
});

export async function getInboxEmails(
  request: FastifyRequest<{ Querystring: { maxResults?: number; pageToken?: string } }>,
  reply: FastifyReply
) {
  const user = request.user;
  if (!user) {
    return reply.status(401).send({ error: 'Not authenticated' });
  }

  const parsed = inboxQuerySchema.safeParse(request.query);
  if (!parsed.success) {
    return reply.status(400).send({ error: formatZodError(parsed.error) });
  }

  try {
    const { maxResults, pageToken } = parsed.data;
    const inbox = await gmailService.getInboxMessages(user.id, { maxResults, pageToken });
    return reply.send(inbox);
  } catch (error) {
    if (error instanceof GmailRateLimitError) {
      return reply
        .status(429)
        .send({ error: 'Gmail rate limit exceeded. Please try again shortly.', retryAfterSeconds: error.retryAfterSeconds });
    }
    request.log.error(error, 'Failed to fetch inbox emails');
    return reply.status(500).send({ error: 'Failed to fetch inbox emails' });
  }
}

export async function getFullEmail(
  request: FastifyRequest<{ Params: { id: string } }>,
  reply: FastifyReply
) {
  const user = request.user;
  if (!user) {
    return reply.status(401).send({ error: 'Not authenticated' });
  }

  try {
    const emailId = request.params.id;
    const email = await gmailService.getFullEmail(user.id, emailId);
    return reply.send(email);
  } catch (error) {
    if (error instanceof GmailRateLimitError) {
      return reply
        .status(429)
        .send({ error: 'Gmail rate limit exceeded. Please try again shortly.', retryAfterSeconds: error.retryAfterSeconds });
    }
    request.log.error(error, 'Failed to fetch email');
    return reply.status(500).send({ error: 'Failed to fetch email' });
  }
}

export async function sendEmail(
  request: FastifyRequest<{ Body: unknown }>,
  reply: FastifyReply
) {
  const user = request.user;
  if (!user) {
    return reply.status(401).send({ error: 'Not authenticated' });
  }

  const parsed = sendEmailSchema.safeParse(request.body);
  if (!parsed.success) {
    return reply.status(400).send({ error: formatZodError(parsed.error) });
  }

  try {
    const result = await gmailService.sendEmail(user.id, parsed.data as any);
    return reply.send(result);
  } catch (error) {
    if (error instanceof GmailRateLimitError) {
      return reply
        .status(429)
        .send({ error: 'Gmail rate limit exceeded. Please try again shortly.', retryAfterSeconds: error.retryAfterSeconds });
    }
    request.log.error(error, 'Failed to send email');
    return reply.status(500).send({ error: 'Failed to send email' });
  }
}

export async function searchEmails(
  request: FastifyRequest<{ Querystring: { q?: string; maxResults?: number } }>,
  reply: FastifyReply
) {
  const user = request.user;
  if (!user) {
    return reply.status(401).send({ error: 'Not authenticated' });
  }

  const parsed = searchQuerySchema.safeParse(request.query);
  if (!parsed.success) {
    return reply.status(400).send({ error: formatZodError(parsed.error) });
  }

  try {
    const { q, maxResults } = parsed.data;
    const results = await gmailService.searchEmails(user.id, q, maxResults);
    return reply.send(results);
  } catch (error) {
    if (error instanceof GmailRateLimitError) {
      return reply
        .status(429)
        .send({ error: 'Gmail rate limit exceeded. Please try again shortly.', retryAfterSeconds: error.retryAfterSeconds });
    }
    request.log.error(error, 'Failed to search emails');
    return reply.status(500).send({ error: 'Failed to search emails' });
  }
}

export async function markEmailAsRead(
  request: FastifyRequest<{ Params: { id: string }; Body: unknown }>,
  reply: FastifyReply
) {
  const user = request.user;
  if (!user) {
    return reply.status(401).send({ error: 'Not authenticated' });
  }

  const parsed = markAsReadSchema.safeParse(request.body);
  if (!parsed.success) {
    return reply.status(400).send({ error: formatZodError(parsed.error) });
  }

  try {
    const emailId = request.params.id;
    await gmailService.markAsRead(user.id, emailId, parsed.data.isRead);
    return reply.send({ success: true });
  } catch (error) {
    if (error instanceof GmailRateLimitError) {
      return reply
        .status(429)
        .send({ error: 'Gmail rate limit exceeded. Please try again shortly.', retryAfterSeconds: error.retryAfterSeconds });
    }
    request.log.error(error, 'Failed to mark email as read');
    return reply.status(500).send({ error: 'Failed to mark email as read' });
  }
}

export async function archiveEmail(
  request: FastifyRequest<{ Params: { id: string } }>,
  reply: FastifyReply
) {
  const user = request.user;
  if (!user) {
    return reply.status(401).send({ error: 'Not authenticated' });
  }

  try {
    const emailId = request.params.id;
    await gmailService.archiveEmail(user.id, emailId);
    return reply.send({ success: true });
  } catch (error) {
    if (error instanceof GmailRateLimitError) {
      return reply
        .status(429)
        .send({ error: 'Gmail rate limit exceeded. Please try again shortly.', retryAfterSeconds: error.retryAfterSeconds });
    }
    request.log.error(error, 'Failed to archive email');
    return reply.status(500).send({ error: 'Failed to archive email' });
  }
}

/**
 * Get email category configurations
 */
export async function getEmailCategories(
  request: FastifyRequest,
  reply: FastifyReply
) {
  const user = request.user;
  if (!user) {
    return reply.status(401).send({ error: 'Not authenticated' });
  }

  try {
    const categories = await categoryService.getEmailCategoryConfigsForUser(user.id);
    return reply.send({ categories });
  } catch (error) {
    request.log.error(error, 'Failed to get email categories');
    return reply.status(500).send({ error: 'Failed to get email categories' });
  }
}

/**
 * Update email category configuration (color, enabled, metadata)
 */
export async function updateEmailCategory(
  request: FastifyRequest<{ Params: { id: string }; Body: Partial<emailCategorizationService.EmailCategoryConfig> }>,
  reply: FastifyReply
) {
  const user = request.user;
  if (!user) {
    return reply.status(401).send({ error: 'Not authenticated' });
  }

  const { id } = request.params;
  const updates = request.body;

  try {
    const category = await categoryService.updateCategoryConfig(user.id, id, updates);
    return reply.send({ category });
  } catch (error) {
    request.log.error(error, 'Failed to update category');
    return reply.status(500).send({ error: 'Failed to update category' });
  }
}

/**
 * Get explanation for email categorization
 */
export async function explainEmailCategory(
  request: FastifyRequest<{ Params: { id: string } }>,
  reply: FastifyReply
) {
  const user = request.user;
  if (!user) {
    return reply.status(401).send({ error: 'Not authenticated' });
  }

  try {
    const emailId = request.params.id;

    // Get the email first
    const email = await gmailService.getFullEmail(user.id, emailId);

    // Get explanation
    const explanation = await emailExplanationService.explainCategorization(user.id, {
      id: email.id,
      threadId: email.threadId,
      from: email.from,
      subject: email.subject,
      snippet: email.snippet,
      labels: email.labels,
      category: (email as any).category || 'other',
    });

    return reply.send({ explanation });
  } catch (error) {
    request.log.error(error, 'Failed to explain email category');
    return reply.status(500).send({ error: 'Failed to explain categorization' });
  }
}
