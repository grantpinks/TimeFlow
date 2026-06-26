import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { prisma } from '../../config/prisma.js';
import { grantIdentityXp } from '../identityEvolutionService.js';
import { recordIdentityCompletion } from '../identityEngagementService.js';

vi.mock('../../config/prisma.js', () => ({
  prisma: {
    user: {
      findUnique: vi.fn(),
    },
    userRestDay: {
      findMany: vi.fn(),
    },
    task: {
      count: vi.fn(),
    },
    habitCompletion: {
      count: vi.fn(),
    },
    identity: {
      findFirst: vi.fn(),
      update: vi.fn(),
    },
  },
}));

vi.mock('../identityEvolutionService.js', () => ({
  grantIdentityXp: vi.fn(),
}));

describe('recordIdentityCompletion XP feedback', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(prisma.user.findUnique).mockResolvedValue({ timeZone: 'America/Chicago' } as any);
    vi.mocked(prisma.userRestDay.findMany).mockResolvedValue([]);
    vi.mocked(prisma.task.count)
      .mockResolvedValueOnce(1 as any)
      .mockResolvedValueOnce(1 as any)
      .mockResolvedValue(0 as any);
    vi.mocked(prisma.habitCompletion.count).mockResolvedValue(0 as any);
    vi.mocked(prisma.identity.findFirst)
      .mockResolvedValueOnce({
        id: 'identity-1',
        name: 'Athlete',
        milestoneTier: 0,
        completionCountTotal: 4,
        isActive: true,
      } as any)
      .mockResolvedValueOnce({ longestStreak: 2 } as any);
    vi.mocked(prisma.identity.update)
      .mockResolvedValueOnce({ completionCountTotal: 5 } as any)
      .mockResolvedValueOnce({} as any);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('returns normalized identity XP feedback when completion grants XP', async () => {
    vi.mocked(grantIdentityXp).mockResolvedValue({
      xpGranted: 14,
      leveledUp: true,
      newStage: null,
      trialStarted: false,
      newUnlocks: ['flow_palette_ocean'],
      levelBefore: 2,
      levelAfter: 3,
      stageBefore: 'Seed',
      stageAfter: 'Seed',
      xpToNextLevel: 120,
      dailyCapRemaining: 66,
    } as any);

    const result = await recordIdentityCompletion('user-1', 'identity-1', {
      reason: 'task_completed',
      sourceId: 'task-1',
    });

    expect(result.identityXp).toEqual({
      identityId: 'identity-1',
      identityName: 'Athlete',
      source: 'task',
      sourceId: 'task-1',
      xpGranted: 14,
      levelBefore: 2,
      levelAfter: 3,
      stageBefore: 'Seed',
      stageAfter: 'Seed',
      trialStarted: false,
      newUnlocks: ['flow_palette_ocean'],
      xpToNextLevel: 120,
      dailyCapRemaining: 66,
    });
  });

  it('does not fail completion when XP feedback cannot be granted', async () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    vi.mocked(grantIdentityXp).mockRejectedValue(new Error('XP unavailable'));

    const result = await recordIdentityCompletion('user-1', 'identity-1', {
      reason: 'habit_completed',
      sourceId: 'scheduled-habit-1',
    });

    expect(result).toMatchObject({
      milestoneUnlocked: null,
      currentStreak: 1,
      completionCountTotal: 5,
      identityXp: null,
    });
    expect(errorSpy).toHaveBeenCalledWith('XP grant failed', expect.any(Error));
  });
});
