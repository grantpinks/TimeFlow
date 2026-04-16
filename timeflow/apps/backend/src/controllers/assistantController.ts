import type { FastifyRequest, FastifyReply } from 'fastify';
import * as assistantService from '../services/assistantService.js';
import * as conversationService from '../services/conversationService.js';
import * as usageTrackingService from '../services/usageTrackingService.js';
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
    // Determine credit cost based on message complexity
    // Simple queries: "what's on my calendar today?" -> SIMPLE_AI_COMMAND (1 credit)
    // Complex queries: "schedule all my tasks" -> COMPLEX_AI_COMMAND (5 credits)
    const isComplexQuery =
      message.toLowerCase().includes('schedule') ||
      message.toLowerCase().includes('plan') ||
      message.toLowerCase().includes('optimize') ||
      message.toLowerCase().includes('reschedule') ||
      message.toLowerCase().includes('suggest');

    const action = isComplexQuery ? 'COMPLEX_AI_COMMAND' : 'SIMPLE_AI_COMMAND';

    // Check if user has enough credits
    const creditCheck = await usageTrackingService.hasCreditsAvailable(user.id, action);

    if (!creditCheck.allowed) {
      return reply.status(402).send({
        error: creditCheck.reason || 'Insufficient Flow Credits',
        code: 'INSUFFICIENT_CREDITS',
        creditsRemaining: creditCheck.creditsRemaining || 0,
      });
    }

    // Process the message (may call the LLM more than once internally, e.g. scheduling retry)
    const response = await assistantService.processMessage(
      user.id,
      message,
      conversationHistory as ChatMessage[] | undefined,
      conversationId,
      { debugEnabled }
    );

    // Flow Credits: exactly one charge per successful POST /assistant/chat — not per internal LLM call.
    const trackingResult = await usageTrackingService.trackUsage(user.id, action, {
      messageLength: message.length,
      conversationId,
      hasSchedulePreview: !!response.schedulePreview,
    });

    if (!trackingResult.success) {
      request.log.warn({ userId: user.id }, 'Failed to track usage but message was processed');
    }

    // Include credit info in response
    return reply.status(200).send({
      ...response,
      credits: {
        used: usageTrackingService.CREDIT_COSTS[action],
        remaining: trackingResult.creditsRemaining,
      },
    });
  } catch (error) {
    request.log.error(error, 'Assistant chat failed');
    return reply.status(500).send({
      error: 'Failed to process message. Please try again.'
    });
  }
}

/**
 * GET /api/assistant/history
 * Query: optional `conversationId` — load that thread; omit for latest conversation.
 * Response includes `conversationId` so clients can pass it on chat for DB history fallback.
 */
export async function getHistory(request: FastifyRequest, reply: FastifyReply) {
  const user = request.user;
  if (!user) {
    return reply.status(401).send({ error: 'Not authenticated' });
  }

  const q = request.query as { conversationId?: string } | undefined;
  const conversationId =
    typeof q?.conversationId === 'string' && q.conversationId.trim()
      ? q.conversationId.trim()
      : undefined;

  const { messages, conversationId: resolvedId } = await conversationService.getAssistantHistory(
    user.id,
    conversationId
  );
  return reply.status(200).send({ messages, conversationId: resolvedId });
}
