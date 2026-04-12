import { FastifyReply, FastifyRequest } from 'fastify';
import { z } from 'zod';
import { runThreadAssistTask } from '../services/assistantService.js';
import * as usageTrackingService from '../services/usageTrackingService.js';
import { formatZodError } from '../utils/errorFormatter.js';

const threadMessageSchema = z.object({
  id: z.string().min(1),
  from: z.string().min(1),
  subject: z.string().min(1),
  receivedAt: z.string().min(1),
  body: z.string().min(1),
});

const threadAssistSchema = z.object({
  threadId: z.string().min(1),
  messages: z.array(threadMessageSchema).min(1),
});

function buildThreadContext(messages: Array<z.infer<typeof threadMessageSchema>>): string {
  const trimmed = messages.slice(-5);
  const parts = trimmed.map((message, index) => {
    return [
      `Message ${index + 1}:`,
      `From: ${message.from}`,
      `Subject: ${message.subject}`,
      `Received: ${message.receivedAt}`,
      `Body: ${message.body}`,
    ].join('\n');
  });

  return `Email thread context:\n\n${parts.join('\n\n---\n\n')}`;
}

export async function summarizeEmailThread(
  request: FastifyRequest<{ Body: unknown }>,
  reply: FastifyReply
) {
  const user = request.user;
  if (!user) {
    return reply.status(401).send({ error: 'Not authenticated' });
  }

  const parsed = threadAssistSchema.safeParse(request.body);
  if (!parsed.success) {
    return reply.status(400).send({ error: formatZodError(parsed.error) });
  }

  const { threadId, messages } = parsed.data;
  const contextPrompt = buildThreadContext(messages);

  const creditCheck = await usageTrackingService.hasCreditsAvailable(user.id, 'EMAIL_THREAD_SUMMARY');
  if (!creditCheck.allowed) {
    return reply.status(402).send({
      error: creditCheck.reason || 'Insufficient Flow Credits for thread summary',
      code: 'INSUFFICIENT_CREDITS',
      creditsRemaining: creditCheck.creditsRemaining ?? 0,
    });
  }

  try {
    const result = await runThreadAssistTask('email-summary', { contextPrompt });
    const tracking = await usageTrackingService.trackUsage(user.id, 'EMAIL_THREAD_SUMMARY', {
      threadId,
    });
    if (!tracking.success) {
      request.log.warn({ userId: user.id, threadId }, 'Thread summary usage tracking failed');
    }
    return reply.send({
      threadId,
      summary: 'summary' in result ? result.summary : '',
      creditsRemaining: tracking.success ? tracking.creditsRemaining : undefined,
    });
  } catch (error) {
    console.error('[EmailThreadAssist] Summary failed', {
      userId: user.id,
      threadId,
      error: error instanceof Error ? error.message : String(error),
    });
    return reply.status(500).send({ error: 'Failed to summarize thread.' });
  }
}

export async function extractTasksFromThread(
  request: FastifyRequest<{ Body: unknown }>,
  reply: FastifyReply
) {
  const user = request.user;
  if (!user) {
    return reply.status(401).send({ error: 'Not authenticated' });
  }

  const parsed = threadAssistSchema.safeParse(request.body);
  if (!parsed.success) {
    return reply.status(400).send({ error: formatZodError(parsed.error) });
  }

  const { threadId, messages } = parsed.data;
  const contextPrompt = buildThreadContext(messages);

  const creditCheck = await usageTrackingService.hasCreditsAvailable(user.id, 'EMAIL_THREAD_TASKS');
  if (!creditCheck.allowed) {
    return reply.status(402).send({
      error: creditCheck.reason || 'Insufficient Flow Credits for task extraction',
      code: 'INSUFFICIENT_CREDITS',
      creditsRemaining: creditCheck.creditsRemaining ?? 0,
    });
  }

  try {
    const result = await runThreadAssistTask('email-tasks', { contextPrompt });
    const tracking = await usageTrackingService.trackUsage(user.id, 'EMAIL_THREAD_TASKS', {
      threadId,
    });
    if (!tracking.success) {
      request.log.warn({ userId: user.id, threadId }, 'Thread tasks usage tracking failed');
    }
    return reply.send({
      threadId,
      tasks: 'tasks' in result ? result.tasks : [],
      creditsRemaining: tracking.success ? tracking.creditsRemaining : undefined,
    });
  } catch (error) {
    console.error('[EmailThreadAssist] Task extraction failed', {
      userId: user.id,
      threadId,
      error: error instanceof Error ? error.message : String(error),
    });
    return reply.status(500).send({ error: 'Failed to extract tasks.' });
  }
}
