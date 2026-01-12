import { FastifyReply, FastifyRequest } from 'fastify';
import { z } from 'zod';
import { runThreadAssistTask } from '../services/assistantService.js';
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

  try {
    const result = await runThreadAssistTask('email-summary', { contextPrompt });
    return reply.send({ threadId, summary: (result as any).summary || '' });
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

  try {
    const result = await runThreadAssistTask('email-tasks', { contextPrompt });
    return reply.send({ threadId, tasks: (result as any).tasks || [] });
  } catch (error) {
    console.error('[EmailThreadAssist] Task extraction failed', {
      userId: user.id,
      threadId,
      error: error instanceof Error ? error.message : String(error),
    });
    return reply.status(500).send({ error: 'Failed to extract tasks.' });
  }
}
