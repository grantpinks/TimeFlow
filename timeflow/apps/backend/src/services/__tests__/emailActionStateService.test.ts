import { beforeEach, describe, expect, it, vi } from 'vitest';
import { getActionStateMap, setActionState } from '../emailActionStateService.js';
import { prisma } from '../../config/prisma.js';

vi.mock('../../config/prisma.js', () => ({
  prisma: {
    emailActionState: {
      findMany: vi.fn(),
      upsert: vi.fn(),
      deleteMany: vi.fn(),
    },
  },
}));

describe('emailActionStateService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('builds a threadId -> actionState map', async () => {
    vi.mocked(prisma.emailActionState.findMany).mockResolvedValue([
      { threadId: 't1', actionState: 'needs_reply' },
      { threadId: 't2', actionState: 'read_later' },
    ] as any);

    const result = await getActionStateMap('user-1', ['t1', 't2', 't3']);

    expect(prisma.emailActionState.findMany).toHaveBeenCalledWith({
      where: { userId: 'user-1', threadId: { in: ['t1', 't2', 't3'] } },
      select: { threadId: true, actionState: true },
    });
    expect(result).toEqual({ t1: 'needs_reply', t2: 'read_later' });
  });

  it('clears action state when null is provided', async () => {
    await setActionState('user-1', 't1', null);

    expect(prisma.emailActionState.deleteMany).toHaveBeenCalledWith({
      where: { userId: 'user-1', threadId: 't1' },
    });
  });

  it('upserts action state when provided', async () => {
    await setActionState('user-1', 't1', 'needs_reply');

    expect(prisma.emailActionState.upsert).toHaveBeenCalledWith({
      where: { userId_threadId: { userId: 'user-1', threadId: 't1' } },
      create: { userId: 'user-1', threadId: 't1', actionState: 'needs_reply' },
      update: { actionState: 'needs_reply' },
    });
  });
});
