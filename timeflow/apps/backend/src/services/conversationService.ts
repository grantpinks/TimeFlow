import { prisma } from '../config/prisma.js';
import type { ChatMessage } from '@timeflow/shared';

/**
 * Create a new conversation for a user
 */
export async function createConversation(userId: string, title?: string) {
  return prisma.conversation.create({
    data: {
      userId,
      title: title || null,
    },
  });
}

/**
 * Get all conversations for a user, ordered by most recent
 */
export async function getUserConversations(userId: string) {
  return prisma.conversation.findMany({
    where: { userId },
    include: {
      messages: {
        take: 1,
        orderBy: { createdAt: 'desc' },
      },
      _count: {
        select: { messages: true },
      },
    },
    orderBy: [
      { isPinned: 'desc' },
      { updatedAt: 'desc' },
    ],
  });
}

/**
 * Get a conversation with all its messages
 */
export async function getConversation(conversationId: string, userId: string) {
  const conversation = await prisma.conversation.findFirst({
    where: {
      id: conversationId,
      userId,
    },
    include: {
      messages: {
        orderBy: { createdAt: 'asc' },
      },
    },
  });

  if (!conversation) {
    throw new Error('Conversation not found');
  }

  return conversation;
}

/**
 * Get the most recent conversation history for a user.
 */
export async function getLatestConversationHistory(userId: string): Promise<ChatMessage[]> {
  const conversation = await prisma.conversation.findFirst({
    where: { userId },
    orderBy: { updatedAt: 'desc' },
    include: {
      messages: {
        orderBy: { createdAt: 'asc' },
      },
    },
  });

  if (!conversation) {
    return [];
  }

  return convertToChatMessages(conversation.messages);
}

/**
 * Update conversation title or pinned status
 */
export async function updateConversation(
  conversationId: string,
  userId: string,
  data: { title?: string; isPinned?: boolean }
) {
  // Verify ownership
  const conversation = await prisma.conversation.findFirst({
    where: { id: conversationId, userId },
  });

  if (!conversation) {
    throw new Error('Conversation not found');
  }

  return prisma.conversation.update({
    where: { id: conversationId },
    data: {
      ...(data.title !== undefined ? { title: data.title } : {}),
      ...(data.isPinned !== undefined ? { isPinned: data.isPinned } : {}),
      updatedAt: new Date(),
    },
  });
}

/**
 * Delete a conversation and all its messages
 */
export async function deleteConversation(conversationId: string, userId: string) {
  // Verify ownership
  const conversation = await prisma.conversation.findFirst({
    where: { id: conversationId, userId },
  });

  if (!conversation) {
    throw new Error('Conversation not found');
  }

  await prisma.conversation.delete({
    where: { id: conversationId },
  });
}

/**
 * Add messages to a conversation
 */
export async function addMessagesToConversation(
  conversationId: string,
  userId: string,
  messages: ChatMessage[]
) {
  // Verify ownership
  const conversation = await prisma.conversation.findFirst({
    where: { id: conversationId, userId },
  });

  if (!conversation) {
    throw new Error('Conversation not found');
  }

  // Create messages
  await prisma.conversationMessage.createMany({
    data: messages.map((msg) => ({
      conversationId,
      role: msg.role,
      content: msg.content,
      metadata: (msg.metadata as any) || null,
    })),
  });

  // Update conversation timestamp
  await prisma.conversation.update({
    where: { id: conversationId },
    data: { updatedAt: new Date() },
  });
}

/**
 * Convert stored messages to ChatMessage format
 */
export function convertToChatMessages(messages: any[]): ChatMessage[] {
  return messages.map((msg) => ({
    id: msg.id,
    role: msg.role as 'user' | 'assistant',
    content: msg.content,
    timestamp: msg.createdAt.toISOString(),
    metadata: msg.metadata || undefined,
  }));
}
