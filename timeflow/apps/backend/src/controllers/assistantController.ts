import type { FastifyRequest, FastifyReply } from 'fastify';
import * as assistantService from '../services/assistantService.js';
import * as conversationService from '../services/conversationService.js';
import type { AssistantChatRequest, ChatMessage } from '@timeflow/shared';
import { z } from 'zod';
import { formatZodError } from '../utils/errorFormatter.js';
import { env } from '../config/env.js';
import { resolveAiDebugFlag } from '../utils/aiDebug.js';

/**
 * Request body shape for chat endpoint
 */
interface ChatRequestBody {
  Body: AssistantChatRequest;
}

const chatSchema = z.object({
  message: z.string().trim().min(1, 'Message is required'),
  conversationId: z.string().min(1).optional(),
  conversationHistory: z
    .array(
      z.object({
        id: z.string(),
        role: z.enum(['user', 'assistant']),
        content: z.string(),
        timestamp: z.string(),
        metadata: z.record(z.any()).optional(),
      })
    )
    .optional(),
});

/**
 * POST /api/assistant/chat
 * Process a user message and generate an AI response
 */
export async function chat(
  request: FastifyRequest<ChatRequestBody>,
  reply: FastifyReply
) {
  const user = request.user!; // Guaranteed by requireAuth middleware
  const parsed = chatSchema.safeParse(request.body);
  if (!parsed.success) {
    return reply.status(400).send({ error: formatZodError(parsed.error) });
  }

  const { message, conversationHistory, conversationId } = parsed.data;
  const debugEnabled = resolveAiDebugFlag(
    env.AI_DEBUG_ENABLED === 'true',
    request.headers['x-ai-debug']
  );

  try {
    const response = await assistantService.processMessage(
      user.id,
      message,
      conversationHistory as ChatMessage[] | undefined,
      conversationId,
      { debugEnabled }
    );

    return reply.status(200).send(response);
  } catch (error) {
    request.log.error(error, 'Assistant chat failed');
    return reply.status(500).send({
      error: 'Failed to process message. Please try again.'
    });
  }
}

/**
 * GET /api/assistant/history
 * Get conversation history for the user
 *
 * For MVP: Returns empty array (client manages state)
 * For Phase 2: Will fetch from database
 */
export async function getHistory(
  request: FastifyRequest,
  reply: FastifyReply
) {
  const user = request.user;
  if (!user) {
    return reply.status(401).send({ error: 'Not authenticated' });
  }

  const messages = await conversationService.getLatestConversationHistory(user.id);
  return reply.status(200).send({ messages });
}
