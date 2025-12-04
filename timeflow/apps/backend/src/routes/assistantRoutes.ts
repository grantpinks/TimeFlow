import type { FastifyInstance } from 'fastify';
import { requireAuth } from '../middlewares/auth.js';
import * as assistantController from '../controllers/assistantController.js';

/**
 * Register AI Assistant routes
 */
export async function registerAssistantRoutes(server: FastifyInstance) {
  // POST /api/assistant/chat
  // Process a user message and generate an AI response
  server.post(
    '/assistant/chat',
    { preHandler: requireAuth },
    assistantController.chat
  );

  // GET /api/assistant/history
  // Get conversation history for the user (optional, returns empty for MVP)
  server.get(
    '/assistant/history',
    { preHandler: requireAuth },
    assistantController.getHistory
  );
}
