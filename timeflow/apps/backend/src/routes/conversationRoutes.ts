import type { FastifyInstance } from 'fastify';
import * as conversationController from '../controllers/conversationController.js';
import { requireAuth } from '../middlewares/auth.js';

export async function registerConversationRoutes(server: FastifyInstance) {
  // Create a new conversation
  server.post('/conversations', { preHandler: requireAuth }, conversationController.createConversation);

  // Get all conversations
  server.get('/conversations', { preHandler: requireAuth }, conversationController.getConversations);

  // Get a specific conversation
  server.get('/conversations/:id', { preHandler: requireAuth }, conversationController.getConversation);

  // Update a conversation
  server.patch('/conversations/:id', { preHandler: requireAuth }, conversationController.updateConversation);

  // Delete a conversation
  server.delete('/conversations/:id', { preHandler: requireAuth }, conversationController.deleteConversation);

  // Add messages to a conversation
  server.post('/conversations/:id/messages', { preHandler: requireAuth }, conversationController.addMessages);
}
