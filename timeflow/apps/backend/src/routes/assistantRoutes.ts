import type { FastifyInstance } from 'fastify';
import { requireAuth } from '../middlewares/auth.js';
import * as assistantController from '../controllers/assistantController.js';

/**
 * Register AI Assistant routes
 */
export async function registerAssistantRoutes(server: FastifyInstance) {
  // POST /api/assistant/chat
  // Process a user message and generate an AI response (LLM calls are expensive)
  server.post(
    '/assistant/chat',
    {
      preHandler: requireAuth,
      config: { rateLimit: { max: 20, timeWindow: '1 minute' } },
    },
    assistantController.chat
  );

  // GET /api/assistant/history
  // Get conversation history for the user (optional, returns empty for MVP)
  server.get(
    '/assistant/history',
    {
      preHandler: requireAuth,
      config: { rateLimit: { max: 60, timeWindow: '1 minute' } },
    },
    assistantController.getHistory
  );
}
