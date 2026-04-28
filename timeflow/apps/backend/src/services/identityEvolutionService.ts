/**
 * Identity Evolution: XP formula, level/stage computation, and mastery trial engine.
 *
 * XP formula (hybrid consistency + volume, capped per day):
 *   - Base XP per qualifying action: 10 XP
 *   - Consistency bonus: streak >= 2 → Math.min(streak, 7) * 2 (capped at +14)
 *   - Diminishing returns: actions 1-3 = full XP, 4-6 = 50%, 7+ = 0
 *   - Hard daily cap: 80 XP per identity per day
 *
 * Level formula: cost to go from level L to L+1 = L * L * 50 XP
 * Stage gates: 5 (Seed→Builder), 10 (Builder→Disciplined), 15 (Disciplined→Embodied), 20 (Embodied→FutureSelf)
 */

import { DateTime } from 'luxon';
import { prisma } from '../config/prisma.js';
import type { IdentityEvolutionState, IdentityStage, IdentityTrialState } from '@timeflow/shared';

export type { IdentityStage, IdentityTrialState };

const BASE_XP = 10;
const DAILY_CAP = 80;
const STAGE_GATE_LEVELS = new Set([5, 10, 15, 20]);

// ── Pure computation helpers ────────────────────────────────────────────────

/**
 * Derives level from cumulative XP.
 * Cost to go from level L to L+1 = L^2 * 50.
 */
export function computeLevel(xp: number): number {
  let level = 1;
  let spent = 0;
  while (true) {
    const costToNext = level * level * 50;
    if (xp < spent + costToNext) break;
    spent += costToNext;
    level++;
  }
  return level;
}

/**
 * Derives stage from level.
 */
export function computeStage(level: number): IdentityStage {
  if (level >= 20) return 'FutureSelf';
  if (level >= 15) return 'Embodied';
  if (level >= 10) return 'Disciplined';
  if (level >= 5) return 'Builder';
  return 'Seed';
}

/**
 * XP remaining until the next level.
 */
export function xpToNextLevel(xp: number): number {
  const level = computeLevel(xp);
  let cumulativeToCurrentLevel = 0;
  for (let l = 1; l < level; l++) {
    cumulativeToCurrentLevel += l * l * 50;
  }
  const costToNextLevel = level * level * 50;
  return cumulativeToCurrentLevel + costToNextLevel - xp;
}

interface TrialConfig {
  windowDays: number;
  targetDays: number;
}

function getTrialConfig(newStage: IdentityStage): TrialConfig {
  switch (newStage) {
    case 'Builder':      return { windowDays: 7,  targetDays: 4  }; // Seed→Builder
    case 'Disciplined':  return { windowDays: 14, targetDays: 10 }; // Builder→Disciplined
    case 'Embodied':     return { windowDays: 14, targetDays: 10 }; // Disciplined→Embodied
    case 'FutureSelf':   return { windowDays: 21, targetDays: 15 }; // Embodied→FutureSelf
    default:             return { windowDays: 0,  targetDays: 0  };
  }
}

// ── Main XP grant entry point ───────────────────────────────────────────────

export interface GrantXpResult {
  xpGranted: number;
  leveledUp: boolean;
  newStage: IdentityStage | null;
  trialStarted: boolean;
}

export async function grantIdentityXp(params: {
  userId: string;
  identityId: string;
  reason: string; // 'task_completed' | 'habit_completed'
  sourceId: string; // taskId or habitInstanceId
  userTimeZone: string;
}): Promise<GrantXpResult> {
  const { userId, identityId, reason, sourceId, userTimeZone } = params;

  const result = await prisma.$transaction(async (tx) => {
    // 1. Load identity
    const identity = await tx.identity.findFirst({
      where: { id: identityId, userId },
      select: {
        xp: true,
        level: true,
        stage: true,
        xpThisPeriod: true,
        xpCapResetAt: true,
        currentStreak: true,
        trialState: true,
        trialWindowDays: true,
        trialTargetDays: true,
        trialActiveDays: true,
        trialCheckpointDays: true,
        trialStartedAt: true,
        trialEndsAt: true,
      },
    });

    if (!identity) {
      return { xpGranted: 0, leveledUp: false, newStage: null, trialStarted: false };
    }

    const nowUtc = DateTime.utc();
    const todayStr = nowUtc.setZone(userTimeZone).toISODate()!;
    const dayStart = DateTime.fromISO(todayStr, { zone: userTimeZone }).startOf('day').toUTC().toJSDate();
    const dayEnd   = DateTime.fromISO(todayStr, { zone: userTimeZone }).endOf('day').toUTC().toJSDate();

    // 2. XP cap reset — rolling 24h window from first action of the day
    let xpThisPeriod = identity.xpThisPeriod;
    let xpCapResetAt = identity.xpCapResetAt;
    const capExpired = !xpCapResetAt || nowUtc.toJSDate() > xpCapResetAt;
    let capChanged = false;
    let newCapResetAt: Date | null = null;
    if (capExpired) {
      xpThisPeriod = 0;
      newCapResetAt = nowUtc.plus({ hours: 24 }).toJSDate();
      xpCapResetAt = newCapResetAt;
      capChanged = true;
    }

    // 3. Count all XP events for this identity today (for diminishing returns)
    const todayEventCount = await tx.identityXpEvent.count({
      where: {
        identityId,
        createdAt: { gte: dayStart, lte: dayEnd },
      },
    });

    // 4. Compute per-action XP with diminishing returns
    // todayEventCount is 0-based index of this (about-to-be-recorded) action
    let baseXp: number;
    if (todayEventCount >= 6) {
      baseXp = 0; // 7th+ action
    } else if (todayEventCount >= 3) {
      baseXp = Math.floor(BASE_XP / 2); // 4th–6th action: 50%
    } else {
      baseXp = BASE_XP; // 1st–3rd action: full
    }

    const streak = identity.currentStreak;
    const consistencyBonus = baseXp > 0 && streak >= 2 ? Math.min(streak, 7) * 2 : 0;
    const rawXp = baseXp + consistencyBonus;
    const capRemaining = Math.max(0, DAILY_CAP - xpThisPeriod);
    const xpGranted = Math.min(rawXp, capRemaining);

    // 5. Persist cap reset even if no XP will be earned (avoids stale xpCapResetAt in DB)
    if (rawXp === 0 && capChanged) {
      await tx.identity.update({
        where: { id: identityId },
        data: { xpThisPeriod: 0, xpCapResetAt: newCapResetAt },
      });
    }

    // 6. Zero-XP early return — still audit-log the event
    if (xpGranted === 0) {
      await tx.identityXpEvent.create({
        data: {
          identityId,
          userId,
          xpAmount: 0,
          reason,
          metadata: { sourceId },
        },
      });
      return { xpGranted: 0, leveledUp: false, newStage: null, trialStarted: false };
    }

    // 7. Accumulate XP
    const newXp = identity.xp + xpGranted;
    const newXpThisPeriod = xpThisPeriod + xpGranted;

    // 8. Recompute level
    const oldLevel = identity.level;
    const newLevel = computeLevel(newXp);
    const leveledUp = newLevel > oldLevel;

    // 9. Detect stage transition
    const oldStage = identity.stage as IdentityStage;
    const newStage = computeStage(newLevel);
    const stageChanged = newStage !== oldStage;

    // 10. Auto-start mastery trial when hitting a stage-gate level
    let trialStarted = false;
    let trialState: IdentityTrialState = identity.trialState as IdentityTrialState;
    let trialWindowDays = identity.trialWindowDays;
    let trialTargetDays = identity.trialTargetDays;
    let trialActiveDays = identity.trialActiveDays;
    let trialCheckpointDays = identity.trialCheckpointDays;
    let trialStartedAt: Date | null = identity.trialStartedAt ?? null;
    let trialEndsAt: Date | null = identity.trialEndsAt ?? null;

    if (leveledUp && STAGE_GATE_LEVELS.has(newLevel) && trialState !== 'Active' && trialState !== 'Passed') {
      const config = getTrialConfig(newStage);
      trialState = 'Active';
      trialWindowDays = config.windowDays;
      trialTargetDays = config.targetDays;
      trialActiveDays = 0;
      trialCheckpointDays = 0;
      trialStartedAt = nowUtc.toJSDate();
      trialEndsAt = nowUtc.plus({ days: config.windowDays }).toJSDate();
      trialStarted = true;
    }

    // 11. Update trial active days — only on first XP-granting action today
    if (trialState === 'Active') {
      const todayPositiveEventCount = await tx.identityXpEvent.count({
        where: {
          identityId,
          xpAmount: { gt: 0 },
          createdAt: { gte: dayStart, lte: dayEnd },
        },
      });
      const isFirstQualifyingActionToday = todayPositiveEventCount === 0;

      if (isFirstQualifyingActionToday) {
        // 12. Soft-fail: detect 3+ consecutive missed days before today
        const lastPositiveEvent = await tx.identityXpEvent.findFirst({
          where: {
            identityId,
            xpAmount: { gt: 0 },
            createdAt: { lt: dayStart },
          },
          orderBy: { createdAt: 'desc' },
        });

        if (lastPositiveEvent) {
          const lastEventDay = DateTime.fromJSDate(lastPositiveEvent.createdAt).setZone(userTimeZone).toISODate()!;
          const todayDt = DateTime.fromISO(todayStr, { zone: userTimeZone });
          const lastDt  = DateTime.fromISO(lastEventDay, { zone: userTimeZone });
          const daysDiff = Math.round(todayDt.diff(lastDt, 'days').days);
          const missedDays = daysDiff - 1; // days between last active day and today

          if (missedDays >= 3) {
            // Soft fail: checkpoint current progress, restart accumulator
            trialCheckpointDays = Math.max(trialCheckpointDays, trialActiveDays);
            trialActiveDays = 0;
            // Trial remains Active — user keeps going from checkpoint
          }
        }

        trialActiveDays = Math.min(trialActiveDays + 1, trialWindowDays);
      }

      // 13. Check trial pass/fail
      if (trialActiveDays >= trialTargetDays) {
        trialState = 'Passed';
      } else if (trialEndsAt && nowUtc.toJSDate() > trialEndsAt) {
        // Window expired — pass if either accumulator or checkpoint reached target
        if (trialActiveDays >= trialTargetDays || trialCheckpointDays >= trialTargetDays) {
          trialState = 'Passed';
        } else {
          trialState = 'Failed';
        }
      }
    }

    // 14. Persist atomically
    await tx.identity.update({
      where: { id: identityId },
      data: {
        xp: newXp,
        xpThisPeriod: newXpThisPeriod,
        xpCapResetAt,
        level: newLevel,
        stage: newStage as any,
        trialState: trialState as any,
        trialWindowDays,
        trialTargetDays,
        trialActiveDays,
        trialCheckpointDays,
        trialStartedAt,
        trialEndsAt,
      },
    });

    // 15. Append XP event record
    await tx.identityXpEvent.create({
      data: {
        identityId,
        userId,
        xpAmount: xpGranted,
        reason,
        metadata: { sourceId },
      },
    });

    // 16. Return summary
    return {
      xpGranted,
      leveledUp,
      newStage: stageChanged ? newStage : null,
      trialStarted,
    };
  });

  return result;
}

// ── DTO builder ─────────────────────────────────────────────────────────────

export async function getEvolutionState(
  userId: string,
  identityId: string
): Promise<IdentityEvolutionState> {
  const identity = await prisma.identity.findFirstOrThrow({
    where: { id: identityId, userId },
    select: {
      xp: true,
      level: true,
      stage: true,
      xpThisPeriod: true,
      xpCapResetAt: true,
      trialState: true,
      trialWindowDays: true,
      trialTargetDays: true,
      trialActiveDays: true,
      trialCheckpointDays: true,
      trialStartedAt: true,
      trialEndsAt: true,
    },
  });

  return {
    identityId,
    level: identity.level,
    stage: identity.stage as IdentityStage,
    xp: identity.xp,
    xpToNextLevel: xpToNextLevel(identity.xp),
    trialState: identity.trialState as IdentityTrialState,
    trialActiveDays: identity.trialActiveDays,
    trialTargetDays: identity.trialTargetDays,
    trialWindowDays: identity.trialWindowDays,
    trialCheckpointDays: identity.trialCheckpointDays,
    trialStartedAt: identity.trialStartedAt?.toISOString() ?? null,
    trialEndsAt: identity.trialEndsAt?.toISOString() ?? null,
    xpThisPeriod: identity.xpThisPeriod,
    xpCapResetAt: identity.xpCapResetAt?.toISOString() ?? null,
  };
}
