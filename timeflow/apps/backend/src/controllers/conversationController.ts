import type { FastifyRequest, FastifyReply } from 'fastify';
import * as conversationService from '../services/conversationService.js';

/**
 * Create a new conversation
 * POST /api/conversations
 */
export async function createConversation(
  request: FastifyRequest<{
    Body: { title?: string; messages?: any[] };
  }>,
  reply: FastifyReply
) {
  try {
    const userId = (request.user as any).id;
    const { title, messages } = request.body;

    const conversation = await conversationService.createConversation(userId, title);

    // Add initial messages if provided
    if (messages && messages.length > 0) {
      await conversationService.addMessagesToConversation(conversation.id, userId, messages);
    }

    return reply.code(201).send(conversation);
  } catch (error) {
    console.error('Failed to create conversation:', error);
    return reply.code(500).send({ error: 'Failed to create conversation' });
  }
}

/**
 * Get all conversations for the current user
 * GET /api/conversations
 */
export async function getConversations(request: FastifyRequest, reply: FastifyReply) {
  try {
    const userId = (request.user as any).id;
    const conversations = await conversationService.getUserConversations(userId);

    return reply.send(conversations);
  } catch (error) {
    console.error('Failed to get conversations:', error);
    return reply.code(500).send({ error: 'Failed to get conversations' });
  }
}

/**
 * Get a specific conversation with all messages
 * GET /api/conversations/:id
 */
export async function getConversation(
  request: FastifyRequest<{
    Params: { id: string };
  }>,
  reply: FastifyReply
) {
  try {
    const userId = (request.user as any).id;
    const { id } = request.params;

    const conversation = await conversationService.getConversation(id, userId);
    const messages = conversationService.convertToChatMessages(conversation.messages);

    return reply.send({
      ...conversation,
      messages,
    });
  } catch (error) {
    console.error('Failed to get conversation:', error);
    if (error instanceof Error && error.message === 'Conversation not found') {
      return reply.code(404).send({ error: 'Conversation not found' });
    }
    return reply.code(500).send({ error: 'Failed to get conversation' });
  }
}

/**
 * Update a conversation (title, pinned status)
 * PATCH /api/conversations/:id
 */
export async function updateConversation(
  request: FastifyRequest<{
    Params: { id: string };
    Body: { title?: string; isPinned?: boolean };
  }>,
  reply: FastifyReply
) {
  try {
    const userId = (request.user as any).id;
    const { id } = request.params;
    const data = request.body;

    const conversation = await conversationService.updateConversation(id, userId, data);

    return reply.send(conversation);
  } catch (error) {
    console.error('Failed to update conversation:', error);
    if (error instanceof Error && error.message === 'Conversation not found') {
      return reply.code(404).send({ error: 'Conversation not found' });
    }
    return reply.code(500).send({ error: 'Failed to update conversation' });
  }
}

/**
 * Delete a conversation
 * DELETE /api/conversations/:id
 */
export async function deleteConversation(
  request: FastifyRequest<{
    Params: { id: string };
  }>,
  reply: FastifyReply
) {
  try {
    const userId = (request.user as any).id;
    const { id } = request.params;

    await conversationService.deleteConversation(id, userId);

    return reply.code(204).send();
  } catch (error) {
    console.error('Failed to delete conversation:', error);
    if (error instanceof Error && error.message === 'Conversation not found') {
      return reply.code(404).send({ error: 'Conversation not found' });
    }
    return reply.code(500).send({ error: 'Failed to delete conversation' });
  }
}

/**
 * Add messages to a conversation
 * POST /api/conversations/:id/messages
 */
export async function addMessages(
  request: FastifyRequest<{
    Params: { id: string };
    Body: { messages: any[] };
  }>,
  reply: FastifyReply
) {
  try {
    const userId = (request.user as any).id;
    const { id } = request.params;
    const { messages } = request.body;

    await conversationService.addMessagesToConversation(id, userId, messages);

    return reply.code(201).send({ success: true });
  } catch (error) {
    console.error('Failed to add messages:', error);
    if (error instanceof Error && error.message === 'Conversation not found') {
      return reply.code(404).send({ error: 'Conversation not found' });
    }
    return reply.code(500).send({ error: 'Failed to add messages' });
  }
}
