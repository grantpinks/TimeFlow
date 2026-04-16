import { describe, expect, it, vi } from 'vitest';

vi.mock('../../config/prisma.js', () => ({
  prisma: {
    conversation: {
      findFirst: vi.fn(),
    },
  },
}));

import { getAssistantHistory, getLatestConversationHistory } from '../conversationService.js';

describe('getAssistantHistory', () => {
  it('returns empty when targeted conversation does not exist', async () => {
    const { prisma } = await import('../../config/prisma.js');
    (prisma as any).conversation.findFirst.mockResolvedValue(null);

    const result = await getAssistantHistory('user-1', 'conv-missing');
    expect(result.messages).toEqual([]);
    expect(result.conversationId).toBeNull();
  });

  it('returns messages and id when conversation matches', async () => {
    const { prisma } = await import('../../config/prisma.js');
    (prisma as any).conversation.findFirst.mockResolvedValue({
      id: 'conv-2',
      messages: [
        { id: 'm1', role: 'user', content: 'Hi', createdAt: new Date('2025-01-01T00:00:00.000Z'), metadata: null },
      ],
    });

    const result = await getAssistantHistory('user-1', 'conv-2');
    expect(result.conversationId).toBe('conv-2');
    expect(result.messages).toHaveLength(1);
    expect(result.messages[0].content).toBe('Hi');
  });
});

describe('getLatestConversationHistory', () => {
  it('returns empty array when no conversation exists', async () => {
    const { prisma } = await import('../../config/prisma.js');
    (prisma as any).conversation.findFirst.mockResolvedValue(null);

    const result = await getLatestConversationHistory('user-1');
    expect(result).toEqual([]);
  });

  it('returns messages ordered oldest to newest', async () => {
    const { prisma } = await import('../../config/prisma.js');
    (prisma as any).conversation.findFirst.mockResolvedValue({
      id: 'conv-1',
      messages: [
        { id: 'm1', role: 'user', content: 'Hi', createdAt: new Date('2025-01-01T00:00:00.000Z'), metadata: null },
        { id: 'm2', role: 'assistant', content: 'Hello', createdAt: new Date('2025-01-01T00:01:00.000Z'), metadata: null },
      ],
    });

    const result = await getLatestConversationHistory('user-1');
    expect(result).toHaveLength(2);
    expect(result[0].content).toBe('Hi');
    expect(result[1].content).toBe('Hello');
  });
});
