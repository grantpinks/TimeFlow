/**
 * @vitest-environment jsdom
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { IdentityXpFeedbackEvent } from '@timeflow/shared';

const mocks = vi.hoisted(() => ({
  emitIdentityXpFeedback: vi.fn(),
}));

vi.mock('../identityXpFeedback', () => ({
  emitIdentityXpFeedback: mocks.emitIdentityXpFeedback,
}));

import { completeHabitInstance, completeTask } from '../api';

const identityXp: IdentityXpFeedbackEvent = {
  identityId: 'identity-1',
  identityName: 'Athlete',
  source: 'task',
  sourceId: 'task-1',
  xpGranted: 10,
  levelBefore: 1,
  levelAfter: 1,
  stageBefore: 'Seed',
  stageAfter: 'Seed',
  trialStarted: false,
  newUnlocks: [],
  xpToNextLevel: 40,
  dailyCapRemaining: 70,
};

describe('API XP feedback emission', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    mocks.emitIdentityXpFeedback.mockClear();
  });

  it('emits task XP feedback from the complete-task response', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({
        id: 'task-1',
        title: 'Run',
        status: 'completed',
        identityEngagement: {
          milestoneUnlocked: null,
          currentStreak: 1,
          completionCountTotal: 2,
          identityXp,
        },
      }),
    }));

    await completeTask('task-1');

    expect(mocks.emitIdentityXpFeedback).toHaveBeenCalledWith(identityXp);
  });

  it('emits habit XP feedback from the complete-habit response', async () => {
    const habitXp = { ...identityXp, source: 'habit' as const, sourceId: 'scheduled-habit-1' };
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({
        success: true,
        completion: {
          id: 'completion-1',
          status: 'completed',
          completedAt: new Date().toISOString(),
        },
        identityEngagement: {
          milestoneUnlocked: null,
          currentStreak: 1,
          completionCountTotal: 2,
          identityXp: habitXp,
        },
      }),
    }));

    await completeHabitInstance('scheduled-habit-1');

    expect(mocks.emitIdentityXpFeedback).toHaveBeenCalledWith(habitXp);
  });
});
