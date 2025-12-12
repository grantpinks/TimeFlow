import type { FastifyRequest, FastifyReply } from 'fastify';
import * as assistantService from '../services/assistantService.js';
import type { AssistantChatRequest } from '@timeflow/shared';
import { z } from 'zod';
import { formatZodError } from '../utils/errorFormatter.js';

/**
 * Request body shape for chat endpoint
 */
interface ChatRequestBody {
  Body: AssistantChatRequest;
}

const chatSchema = z.object({
  message: z.string().trim().min(1, 'Message is required'),
  conversationHistory: z
    .array(
      z.object({
        id: z.string().optional(),
        role: z.enum(['user', 'assistant']),
        content: z.string(),
        timestamp: z.string().datetime().optional(),
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

  const { message, conversationHistory } = parsed.data;

  try {
    const response = await assistantService.processMessage(
      user.id,
      message,
      conversationHistory
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
  // Optional: Return persisted conversation history from DB
  // For MVP: Client manages state, so return empty array
  return reply.status(200).send({ messages: [] });
}
