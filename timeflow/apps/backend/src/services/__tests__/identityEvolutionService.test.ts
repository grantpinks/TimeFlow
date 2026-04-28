/**
 * identityEvolutionService tests
 *
 * Covers: computeLevel, computeStage, xpToNextLevel, daily XP cap,
 * diminishing returns, streak bonus, trial auto-start, soft-fail
 * checkpoint, trial pass/fail, and getEvolutionState DTO assembly.
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';
import { prisma } from '../../config/prisma.js';
import {
  computeLevel,
  computeStage,
  xpToNextLevel,
  grantIdentityXp,
  getEvolutionState,
} from '../identityEvolutionService.js';

// ── Mock Prisma ──────────────────────────────────────────────────────────────

vi.mock('../../config/prisma.js', () => ({
  prisma: {
    identity: {
      findFirst: vi.fn(),
      findFirstOrThrow: vi.fn(),
      update: vi.fn(),
    },
    identityXpEvent: {
      count: vi.fn(),
      findFirst: vi.fn(),
      create: vi.fn(),
    },
    $transaction: vi.fn(),
  },
}));

// ── Helpers ──────────────────────────────────────────────────────────────────

const USER_ID = 'user-1';
const IDENTITY_ID = 'identity-1';
const TZ = 'America/Chicago';

/** Minimal identity record returned by findFirst */
function makeIdentity(overrides: Partial<{
  xp: number;
  level: number;
  stage: string;
  xpThisPeriod: number;
  xpCapResetAt: Date | null;
  currentStreak: number;
  trialState: string;
  trialWindowDays: number;
  trialTargetDays: number;
  trialActiveDays: number;
  trialCheckpointDays: number;
  trialStartedAt: Date | null;
  trialEndsAt: Date | null;
}> = {}) {
  return {
    xp: 0,
    level: 1,
    stage: 'Seed',
    xpThisPeriod: 0,
    xpCapResetAt: null,
    currentStreak: 0,
    trialState: 'NotStarted',
    trialWindowDays: 0,
    trialTargetDays: 0,
    trialActiveDays: 0,
    trialCheckpointDays: 0,
    trialStartedAt: null,
    trialEndsAt: null,
    ...overrides,
  };
}

beforeEach(() => {
  vi.clearAllMocks();

  // Default: transaction resolves the array
  (prisma.$transaction as any).mockImplementation((ops: Promise<any>[]) =>
    Promise.all(ops)
  );
  // Default: update and create return empty objects
  (prisma.identity.update as any).mockResolvedValue({});
  (prisma.identityXpEvent.create as any).mockResolvedValue({ id: 'evt-1' });
  // Default: no events today, no prior events
  (prisma.identityXpEvent.count as any).mockResolvedValue(0);
  (prisma.identityXpEvent.findFirst as any).mockResolvedValue(null);
});

// ── computeLevel ─────────────────────────────────────────────────────────────

describe('computeLevel', () => {
  it('returns level 1 at 0 XP', () => {
    expect(computeLevel(0)).toBe(1);
  });

  it('returns level 1 just below the level-2 threshold (49 XP)', () => {
    expect(computeLevel(49)).toBe(1);
  });

  it('returns level 2 at exactly 50 XP', () => {
    expect(computeLevel(50)).toBe(2);
  });

  it('returns level 2 just below the level-3 threshold (249 XP)', () => {
    // Level 3 requires 50 + 200 = 250 cumulative
    expect(computeLevel(249)).toBe(2);
  });

  it('returns level 3 at exactly 250 XP', () => {
    expect(computeLevel(250)).toBe(3);
  });

  it('returns level 3 just below level-4 threshold (699 XP)', () => {
    // Level 4 requires 250 + 450 = 700 cumulative
    expect(computeLevel(699)).toBe(3);
  });

  it('returns level 4 at exactly 700 XP', () => {
    expect(computeLevel(700)).toBe(4);
  });

  it('returns level 5 at 1500 XP (700 + 800)', () => {
    // Level 5: 700 + 4^2*50 = 700 + 800 = 1500
    expect(computeLevel(1500)).toBe(5);
  });

  it('returns level 10 at the correct cumulative threshold', () => {
    // Cumulative XP to reach level 10: sum of L^2*50 for L=1..9
    let cum = 0;
    for (let l = 1; l <= 9; l++) cum += l * l * 50;
    expect(computeLevel(cum)).toBe(10);
    expect(computeLevel(cum - 1)).toBe(9);
  });
});

// ── computeStage ─────────────────────────────────────────────────────────────

describe('computeStage', () => {
  it.each([
    [1, 'Seed'],
    [4, 'Seed'],
    [5, 'Builder'],
    [9, 'Builder'],
    [10, 'Disciplined'],
    [14, 'Disciplined'],
    [15, 'Embodied'],
    [19, 'Embodied'],
    [20, 'FutureSelf'],
    [99, 'FutureSelf'],
  ])('level %i → stage %s', (level, expected) => {
    expect(computeStage(level)).toBe(expected);
  });
});

// ── xpToNextLevel ─────────────────────────────────────────────────────────────

describe('xpToNextLevel', () => {
  it('returns 50 at 0 XP (level 1, cost to level 2 = 50)', () => {
    expect(xpToNextLevel(0)).toBe(50);
  });

  it('returns 1 at 49 XP', () => {
    expect(xpToNextLevel(49)).toBe(1);
  });

  it('returns 200 at 50 XP (level 2, cost to level 3 = 200)', () => {
    expect(xpToNextLevel(50)).toBe(200);
  });

  it('returns 450 at 250 XP (level 3, cost to level 4 = 450)', () => {
    expect(xpToNextLevel(250)).toBe(450);
  });
});

// ── Diminishing returns & streak bonus (via grantIdentityXp) ─────────────────

describe('grantIdentityXp — XP formula', () => {
  it('grants full 10 XP for the first action (no streak)', async () => {
    (prisma.identity.findFirst as any).mockResolvedValue(makeIdentity());
    (prisma.identityXpEvent.count as any).mockResolvedValue(0); // todayEventCount

    const result = await grantIdentityXp({
      userId: USER_ID, identityId: IDENTITY_ID,
      reason: 'task_completed', sourceId: 'task-1', userTimeZone: TZ,
    });

    expect(result.xpGranted).toBe(10);
  });

  it('adds streak bonus when streak >= 2', async () => {
    (prisma.identity.findFirst as any).mockResolvedValue(makeIdentity({ currentStreak: 3 }));
    (prisma.identityXpEvent.count as any).mockResolvedValue(0);

    const result = await grantIdentityXp({
      userId: USER_ID, identityId: IDENTITY_ID,
      reason: 'task_completed', sourceId: 'task-1', userTimeZone: TZ,
    });

    // base 10 + min(3,7)*2 = 10 + 6 = 16
    expect(result.xpGranted).toBe(16);
  });

  it('caps streak bonus at streak=7 (+14 max)', async () => {
    (prisma.identity.findFirst as any).mockResolvedValue(makeIdentity({ currentStreak: 30 }));
    (prisma.identityXpEvent.count as any).mockResolvedValue(0);

    const result = await grantIdentityXp({
      userId: USER_ID, identityId: IDENTITY_ID,
      reason: 'task_completed', sourceId: 'task-1', userTimeZone: TZ,
    });

    // base 10 + min(30,7)*2 = 10 + 14 = 24
    expect(result.xpGranted).toBe(24);
  });

  it('does not give streak bonus when streak < 2', async () => {
    (prisma.identity.findFirst as any).mockResolvedValue(makeIdentity({ currentStreak: 1 }));
    (prisma.identityXpEvent.count as any).mockResolvedValue(0);

    const result = await grantIdentityXp({
      userId: USER_ID, identityId: IDENTITY_ID,
      reason: 'task_completed', sourceId: 'task-1', userTimeZone: TZ,
    });

    expect(result.xpGranted).toBe(10);
  });

  it('applies 50% diminishing returns on 4th action (index 3)', async () => {
    (prisma.identity.findFirst as any).mockResolvedValue(makeIdentity());
    // 3 events already today → this is the 4th action (index 3)
    (prisma.identityXpEvent.count as any).mockResolvedValue(3);

    const result = await grantIdentityXp({
      userId: USER_ID, identityId: IDENTITY_ID,
      reason: 'task_completed', sourceId: 'task-1', userTimeZone: TZ,
    });

    expect(result.xpGranted).toBe(5); // 50% of 10
  });

  it('applies 50% diminishing returns on 6th action (index 5)', async () => {
    (prisma.identity.findFirst as any).mockResolvedValue(makeIdentity());
    (prisma.identityXpEvent.count as any).mockResolvedValue(5);

    const result = await grantIdentityXp({
      userId: USER_ID, identityId: IDENTITY_ID,
      reason: 'task_completed', sourceId: 'task-1', userTimeZone: TZ,
    });

    expect(result.xpGranted).toBe(5);
  });

  it('grants 0 XP for 7th+ action (index 6)', async () => {
    (prisma.identity.findFirst as any).mockResolvedValue(makeIdentity());
    (prisma.identityXpEvent.count as any).mockResolvedValue(6);

    const result = await grantIdentityXp({
      userId: USER_ID, identityId: IDENTITY_ID,
      reason: 'task_completed', sourceId: 'task-1', userTimeZone: TZ,
    });

    expect(result.xpGranted).toBe(0);
  });

  it('does not add streak bonus when base XP is 0', async () => {
    (prisma.identity.findFirst as any).mockResolvedValue(makeIdentity({ currentStreak: 7 }));
    (prisma.identityXpEvent.count as any).mockResolvedValue(6); // 7th+ action

    const result = await grantIdentityXp({
      userId: USER_ID, identityId: IDENTITY_ID,
      reason: 'task_completed', sourceId: 'task-1', userTimeZone: TZ,
    });

    expect(result.xpGranted).toBe(0);
  });

  it('enforces hard daily cap of 80 XP', async () => {
    // xpThisPeriod = 75, xpCapResetAt in the future → 5 remaining
    const futureReset = new Date(Date.now() + 10 * 60 * 60 * 1000);
    (prisma.identity.findFirst as any).mockResolvedValue(
      makeIdentity({ xpThisPeriod: 75, xpCapResetAt: futureReset })
    );
    (prisma.identityXpEvent.count as any).mockResolvedValue(0);

    const result = await grantIdentityXp({
      userId: USER_ID, identityId: IDENTITY_ID,
      reason: 'task_completed', sourceId: 'task-1', userTimeZone: TZ,
    });

    // Would earn 10, capped at 5
    expect(result.xpGranted).toBe(5);
  });

  it('returns xpGranted = 0 and records event when daily cap is fully exhausted', async () => {
    const futureReset = new Date(Date.now() + 10 * 60 * 60 * 1000);
    (prisma.identity.findFirst as any).mockResolvedValue(
      makeIdentity({ xpThisPeriod: 80, xpCapResetAt: futureReset })
    );
    (prisma.identityXpEvent.count as any).mockResolvedValue(0);

    const result = await grantIdentityXp({
      userId: USER_ID, identityId: IDENTITY_ID,
      reason: 'task_completed', sourceId: 'task-1', userTimeZone: TZ,
    });

    expect(result.xpGranted).toBe(0);
    expect(prisma.identityXpEvent.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ xpAmount: 0 }) })
    );
    // No identity update when xpGranted is 0
    expect(prisma.identity.update).not.toHaveBeenCalled();
  });

  it('resets xpThisPeriod when the 24h window has expired', async () => {
    const expiredReset = new Date(Date.now() - 1000); // 1s in the past
    (prisma.identity.findFirst as any).mockResolvedValue(
      makeIdentity({ xpThisPeriod: 80, xpCapResetAt: expiredReset })
    );
    (prisma.identityXpEvent.count as any).mockResolvedValue(0);

    const result = await grantIdentityXp({
      userId: USER_ID, identityId: IDENTITY_ID,
      reason: 'task_completed', sourceId: 'task-1', userTimeZone: TZ,
    });

    // After reset, xpThisPeriod = 0, cap remaining = 80, so earns full 10 XP
    expect(result.xpGranted).toBe(10);
  });
});

// ── Level-up detection ────────────────────────────────────────────────────────

describe('grantIdentityXp — level-up detection', () => {
  it('detects level-up when XP crosses a threshold', async () => {
    // At 45 XP, level=1. Adding 10 → 55 XP, level=2
    (prisma.identity.findFirst as any).mockResolvedValue(makeIdentity({ xp: 45, level: 1 }));
    (prisma.identityXpEvent.count as any).mockResolvedValue(0);

    const result = await grantIdentityXp({
      userId: USER_ID, identityId: IDENTITY_ID,
      reason: 'task_completed', sourceId: 'task-1', userTimeZone: TZ,
    });

    expect(result.leveledUp).toBe(true);
  });

  it('reports no level-up when XP does not cross a threshold', async () => {
    (prisma.identity.findFirst as any).mockResolvedValue(makeIdentity({ xp: 0, level: 1 }));
    (prisma.identityXpEvent.count as any).mockResolvedValue(0);

    const result = await grantIdentityXp({
      userId: USER_ID, identityId: IDENTITY_ID,
      reason: 'task_completed', sourceId: 'task-1', userTimeZone: TZ,
    });

    // 10 XP, still level 1 (need 50 for level 2)
    expect(result.leveledUp).toBe(false);
    expect(result.newStage).toBeNull();
  });
});

// ── Trial auto-start on stage gate ───────────────────────────────────────────

describe('grantIdentityXp — trial auto-start', () => {
  it('auto-starts Seed→Builder trial when leveling up to 5', async () => {
    // Identity at XP just below level-5 threshold, needs 10 more XP to hit level 5
    // Cumulative to level 5: 1500. We need identity.xp + 10 >= 1500, so xp = 1490
    (prisma.identity.findFirst as any).mockResolvedValue(
      makeIdentity({ xp: 1490, level: 4, stage: 'Seed', trialState: 'NotStarted' })
    );
    (prisma.identityXpEvent.count as any).mockResolvedValue(0);

    const result = await grantIdentityXp({
      userId: USER_ID, identityId: IDENTITY_ID,
      reason: 'task_completed', sourceId: 'task-1', userTimeZone: TZ,
    });

    expect(result.leveledUp).toBe(true);
    expect(result.trialStarted).toBe(true);
    expect(result.newStage).toBe('Builder');

    // Check that identity.update was called with trial fields.
    // trialActiveDays = 1 because this same action is also the first qualifying day.
    expect(prisma.identity.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          trialState: 'Active',
          trialWindowDays: 7,
          trialTargetDays: 4,
          trialActiveDays: 1,
        }),
      })
    );
  });

  it('does not restart a trial if one is already Active', async () => {
    (prisma.identity.findFirst as any).mockResolvedValue(
      makeIdentity({ xp: 1490, level: 4, stage: 'Seed', trialState: 'Active' })
    );
    (prisma.identityXpEvent.count as any).mockResolvedValue(0);

    const result = await grantIdentityXp({
      userId: USER_ID, identityId: IDENTITY_ID,
      reason: 'task_completed', sourceId: 'task-1', userTimeZone: TZ,
    });

    expect(result.trialStarted).toBe(false);
  });

  it('auto-starts Builder→Disciplined trial at level 10 with correct config', async () => {
    // Cumulative XP to level 10
    let cum = 0;
    for (let l = 1; l <= 9; l++) cum += l * l * 50; // 1+4+9+16+25+36+49+64+81 * 50 = 285*50 = 14250
    const xpJustBelow = cum - 10; // needs exactly 10 XP to hit level 10

    (prisma.identity.findFirst as any).mockResolvedValue(
      makeIdentity({ xp: xpJustBelow, level: 9, stage: 'Builder', trialState: 'NotStarted' })
    );
    (prisma.identityXpEvent.count as any).mockResolvedValue(0);

    const result = await grantIdentityXp({
      userId: USER_ID, identityId: IDENTITY_ID,
      reason: 'task_completed', sourceId: 'task-1', userTimeZone: TZ,
    });

    expect(result.trialStarted).toBe(true);
    expect(result.newStage).toBe('Disciplined');
    expect(prisma.identity.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          trialWindowDays: 14,
          trialTargetDays: 10,
        }),
      })
    );
  });
});

// ── Trial active days & pass ──────────────────────────────────────────────────

describe('grantIdentityXp — trial active days and pass', () => {
  it('increments trialActiveDays on first qualifying action of the day', async () => {
    const trialEndsAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days away
    (prisma.identity.findFirst as any).mockResolvedValue(
      makeIdentity({
        trialState: 'Active',
        trialActiveDays: 2,
        trialTargetDays: 4,
        trialWindowDays: 7,
        trialEndsAt,
      })
    );
    // todayEventCount (all) = 0 for diminishing returns, positive count = 0 for trial
    (prisma.identityXpEvent.count as any).mockResolvedValue(0);

    await grantIdentityXp({
      userId: USER_ID, identityId: IDENTITY_ID,
      reason: 'task_completed', sourceId: 'task-1', userTimeZone: TZ,
    });

    expect(prisma.identity.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ trialActiveDays: 3 }),
      })
    );
  });

  it('detects trial pass when trialActiveDays reaches trialTargetDays', async () => {
    const trialEndsAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    (prisma.identity.findFirst as any).mockResolvedValue(
      makeIdentity({
        trialState: 'Active',
        trialActiveDays: 3,
        trialTargetDays: 4,
        trialWindowDays: 7,
        trialEndsAt,
      })
    );
    (prisma.identityXpEvent.count as any).mockResolvedValue(0);

    await grantIdentityXp({
      userId: USER_ID, identityId: IDENTITY_ID,
      reason: 'task_completed', sourceId: 'task-1', userTimeZone: TZ,
    });

    expect(prisma.identity.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          trialActiveDays: 4,
          trialState: 'Passed',
        }),
      })
    );
  });

  it('does not double-increment trialActiveDays for second action on same day', async () => {
    const trialEndsAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    (prisma.identity.findFirst as any).mockResolvedValue(
      makeIdentity({
        trialState: 'Active',
        trialActiveDays: 2,
        trialTargetDays: 4,
        trialWindowDays: 7,
        trialEndsAt,
      })
    );

    // For diminishing returns (all events): 1 event already today
    // For trial positive check: 1 positive event already today → NOT first qualifying action
    (prisma.identityXpEvent.count as any)
      .mockResolvedValueOnce(1)  // first call: todayEventCount (all)
      .mockResolvedValueOnce(1); // second call: todayPositiveEventCount

    await grantIdentityXp({
      userId: USER_ID, identityId: IDENTITY_ID,
      reason: 'task_completed', sourceId: 'task-1', userTimeZone: TZ,
    });

    // trialActiveDays should NOT change (not first qualifying action today)
    expect(prisma.identity.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ trialActiveDays: 2 }),
      })
    );
  });
});

// ── Soft-fail checkpoint behavior ─────────────────────────────────────────────

describe('grantIdentityXp — soft-fail (3+ consecutive missed days)', () => {
  it('triggers soft fail when 3 consecutive days were missed', async () => {
    const trialEndsAt = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000);
    (prisma.identity.findFirst as any).mockResolvedValue(
      makeIdentity({
        trialState: 'Active',
        trialActiveDays: 5,
        trialCheckpointDays: 0,
        trialTargetDays: 10,
        trialWindowDays: 14,
        trialEndsAt,
      })
    );

    // First positive event today (todayPositiveEventCount = 0)
    (prisma.identityXpEvent.count as any)
      .mockResolvedValueOnce(0)  // todayEventCount
      .mockResolvedValueOnce(0); // todayPositiveEventCount

    // Last qualifying event was 4 days ago (3 missed days between then and today)
    const fourDaysAgo = new Date(Date.now() - 4 * 24 * 60 * 60 * 1000);
    (prisma.identityXpEvent.findFirst as any).mockResolvedValue({
      id: 'evt-old',
      createdAt: fourDaysAgo,
    });

    await grantIdentityXp({
      userId: USER_ID, identityId: IDENTITY_ID,
      reason: 'task_completed', sourceId: 'task-1', userTimeZone: TZ,
    });

    // Soft fail: checkpoint = 5, activeDays reset to 0, then increment to 1
    expect(prisma.identity.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          trialCheckpointDays: 5,
          trialActiveDays: 1, // reset to 0, then +1 for today
          trialState: 'Active', // still active
        }),
      })
    );
  });

  it('does NOT trigger soft fail when only 2 consecutive days were missed', async () => {
    const trialEndsAt = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000);
    (prisma.identity.findFirst as any).mockResolvedValue(
      makeIdentity({
        trialState: 'Active',
        trialActiveDays: 3,
        trialCheckpointDays: 0,
        trialTargetDays: 10,
        trialWindowDays: 14,
        trialEndsAt,
      })
    );

    (prisma.identityXpEvent.count as any)
      .mockResolvedValueOnce(0)
      .mockResolvedValueOnce(0);

    // Last qualifying event was 3 days ago → 2 missed days
    const threeDaysAgo = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000);
    (prisma.identityXpEvent.findFirst as any).mockResolvedValue({
      id: 'evt-old',
      createdAt: threeDaysAgo,
    });

    await grantIdentityXp({
      userId: USER_ID, identityId: IDENTITY_ID,
      reason: 'task_completed', sourceId: 'task-1', userTimeZone: TZ,
    });

    // No soft fail, trialActiveDays increments normally
    expect(prisma.identity.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          trialCheckpointDays: 0, // unchanged
          trialActiveDays: 4,    // was 3, now 4
        }),
      })
    );
  });

  it('keeps the higher checkpoint when soft fail occurs again', async () => {
    const trialEndsAt = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000);
    (prisma.identity.findFirst as any).mockResolvedValue(
      makeIdentity({
        trialState: 'Active',
        trialActiveDays: 2,
        trialCheckpointDays: 5, // prior checkpoint from previous soft fail
        trialTargetDays: 10,
        trialWindowDays: 14,
        trialEndsAt,
      })
    );

    (prisma.identityXpEvent.count as any)
      .mockResolvedValueOnce(0)
      .mockResolvedValueOnce(0);

    const fourDaysAgo = new Date(Date.now() - 4 * 24 * 60 * 60 * 1000);
    (prisma.identityXpEvent.findFirst as any).mockResolvedValue({
      id: 'evt-old',
      createdAt: fourDaysAgo,
    });

    await grantIdentityXp({
      userId: USER_ID, identityId: IDENTITY_ID,
      reason: 'task_completed', sourceId: 'task-1', userTimeZone: TZ,
    });

    // checkpoint stays at max(5, 2) = 5; activeDays resets to 0 then +1 = 1
    expect(prisma.identity.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          trialCheckpointDays: 5,
          trialActiveDays: 1,
        }),
      })
    );
  });

  it('sets trial to Failed when window expires and neither counter reached target', async () => {
    const trialEndsAt = new Date(Date.now() - 1000); // expired 1s ago
    (prisma.identity.findFirst as any).mockResolvedValue(
      makeIdentity({
        trialState: 'Active',
        trialActiveDays: 3,
        trialCheckpointDays: 2,
        trialTargetDays: 10,
        trialWindowDays: 14,
        trialEndsAt,
      })
    );
    (prisma.identityXpEvent.count as any)
      .mockResolvedValueOnce(0)
      .mockResolvedValueOnce(0);
    (prisma.identityXpEvent.findFirst as any).mockResolvedValue(null);

    await grantIdentityXp({
      userId: USER_ID, identityId: IDENTITY_ID,
      reason: 'task_completed', sourceId: 'task-1', userTimeZone: TZ,
    });

    expect(prisma.identity.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ trialState: 'Failed' }),
      })
    );
  });
});

// ── Identity not found ────────────────────────────────────────────────────────

describe('grantIdentityXp — edge cases', () => {
  it('returns zero result when identity not found', async () => {
    (prisma.identity.findFirst as any).mockResolvedValue(null);

    const result = await grantIdentityXp({
      userId: USER_ID, identityId: IDENTITY_ID,
      reason: 'task_completed', sourceId: 'task-1', userTimeZone: TZ,
    });

    expect(result).toEqual({
      xpGranted: 0, leveledUp: false, newStage: null, trialStarted: false,
    });
    expect(prisma.identity.update).not.toHaveBeenCalled();
  });
});

// ── getEvolutionState DTO assembly ────────────────────────────────────────────

describe('getEvolutionState', () => {
  it('assembles the full IdentityEvolutionState DTO', async () => {
    const trialStartedAt = new Date('2026-04-01T00:00:00Z');
    const trialEndsAt    = new Date('2026-04-08T00:00:00Z');
    const xpCapResetAt   = new Date('2026-04-02T12:00:00Z');

    (prisma.identity.findFirstOrThrow as any).mockResolvedValue({
      xp: 55,
      level: 2,
      stage: 'Seed',
      xpThisPeriod: 30,
      xpCapResetAt,
      trialState: 'Active',
      trialWindowDays: 7,
      trialTargetDays: 4,
      trialActiveDays: 2,
      trialCheckpointDays: 0,
      trialStartedAt,
      trialEndsAt,
    });

    const state = await getEvolutionState(USER_ID, IDENTITY_ID);

    expect(state).toEqual({
      identityId: IDENTITY_ID,
      level: 2,
      stage: 'Seed',
      xp: 55,
      xpToNextLevel: xpToNextLevel(55),  // 250 - 55 = 195
      trialState: 'Active',
      trialWindowDays: 7,
      trialTargetDays: 4,
      trialActiveDays: 2,
      trialCheckpointDays: 0,
      trialStartedAt: trialStartedAt.toISOString(),
      trialEndsAt: trialEndsAt.toISOString(),
      xpThisPeriod: 30,
      xpCapResetAt: xpCapResetAt.toISOString(),
    });
  });

  it('returns null for trialStartedAt and trialEndsAt when not set', async () => {
    (prisma.identity.findFirstOrThrow as any).mockResolvedValue({
      xp: 0,
      level: 1,
      stage: 'Seed',
      xpThisPeriod: 0,
      xpCapResetAt: null,
      trialState: 'NotStarted',
      trialWindowDays: 0,
      trialTargetDays: 0,
      trialActiveDays: 0,
      trialCheckpointDays: 0,
      trialStartedAt: null,
      trialEndsAt: null,
    });

    const state = await getEvolutionState(USER_ID, IDENTITY_ID);

    expect(state.trialStartedAt).toBeNull();
    expect(state.trialEndsAt).toBeNull();
    expect(state.xpCapResetAt).toBeNull();
    expect(state.xpToNextLevel).toBe(50); // 50 - 0 = 50
  });
});
