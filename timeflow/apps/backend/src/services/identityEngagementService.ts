/**
 * Identity milestones (25/50/100), per-identity streaks, completion counts.
 * Rest/sick days bridge streaks without requiring completions on those days.
 */

import { DateTime } from 'luxon';
import { prisma } from '../config/prisma.js';

export type MilestoneTier = 0 | 25 | 50 | 100;

function tierFromCompletionCount(total: number): MilestoneTier {
  if (total >= 100) return 100;
  if (total >= 50) return 50;
  if (total >= 25) return 25;
  return 0;
}

function getDayUtcRange(localDateStr: string, timeZone: string): { start: Date; end: Date } {
  const start = DateTime.fromISO(localDateStr, { zone: timeZone }).startOf('day');
  const end = DateTime.fromISO(localDateStr, { zone: timeZone }).endOf('day');
  return { start: start.toUTC().toJSDate(), end: end.toUTC().toJSDate() };
}

async function dayHasIdentityCompletion(
  userId: string,
  identityId: string,
  localDateStr: string,
  timeZone: string
): Promise<boolean> {
  const { start, end } = getDayUtcRange(localDateStr, timeZone);

  const taskCount = await prisma.task.count({
    where: {
      userId,
      identityId,
      status: 'completed',
      updatedAt: { gte: start, lte: end },
    },
  });
  if (taskCount > 0) return true;

  const habitCount = await prisma.habitCompletion.count({
    where: {
      userId,
      status: 'completed',
      completedAt: { gte: start, lte: end },
      habit: { identityId },
    },
  });
  return habitCount > 0;
}

/**
 * Walk backward from today (or yesterday if today is still empty) until streak breaks.
 */
export async function recomputeStreakForIdentity(
  userId: string,
  identityId: string,
  timeZone: string
): Promise<number> {
  const restRows = await prisma.userRestDay.findMany({
    where: { userId },
    select: { localDate: true },
  });
  const restSet = new Set(restRows.map((r) => r.localDate));

  let end = DateTime.now().setZone(timeZone);
  const todayStr = end.toISODate()!;
  const hasTodayCompletion = await dayHasIdentityCompletion(userId, identityId, todayStr, timeZone);
  if (!hasTodayCompletion && !restSet.has(todayStr)) {
    end = end.minus({ days: 1 });
  }

  /** A day counts if it has an identity completion OR is marked rest (bridge). Run must include ≥1 completion. */
  let streak = 0;
  let d = end;
  let sawCompletion = false;

  for (let i = 0; i < 400; i++) {
    const dStr = d.toISODate()!;
    const hasComp = await dayHasIdentityCompletion(userId, identityId, dStr, timeZone);
    const isRest = restSet.has(dStr);
    if (!hasComp && !isRest) break;
    if (hasComp) sawCompletion = true;
    streak++;
    d = d.minus({ days: 1 });
  }

  if (!sawCompletion) streak = 0;

  const identity = await prisma.identity.findFirst({
    where: { id: identityId, userId },
    select: { longestStreak: true },
  });
  const longest = Math.max(identity?.longestStreak ?? 0, streak);

  await prisma.identity.update({
    where: { id: identityId },
    data: { currentStreak: streak, longestStreak: longest },
  });

  return streak;
}

export interface RecordCompletionResult {
  milestoneUnlocked: MilestoneTier | null;
  currentStreak: number;
  completionCountTotal: number;
}

/**
 * Call when a task or habit instance completes and counts toward an identity.
 */
export async function recordIdentityCompletion(
  userId: string,
  identityId: string
): Promise<RecordCompletionResult> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { timeZone: true },
  });
  const tz = user?.timeZone ?? 'America/Chicago';

  const before = await prisma.identity.findFirst({
    where: { id: identityId, userId },
    select: { milestoneTier: true, completionCountTotal: true },
  });
  if (!before) {
    return { milestoneUnlocked: null, currentStreak: 0, completionCountTotal: 0 };
  }

  const tierBefore = tierFromCompletionCount(before.completionCountTotal);
  const newTotal = before.completionCountTotal + 1;
  const newTierLevel = tierFromCompletionCount(newTotal);

  const updated = await prisma.identity.update({
    where: { id: identityId },
    data: {
      completionCountTotal: newTotal,
      milestoneTier: Math.max(before.milestoneTier, newTierLevel),
    },
    select: { completionCountTotal: true },
  });

  const streak = await recomputeStreakForIdentity(userId, identityId, tz);

  const milestoneUnlocked: MilestoneTier | null =
    newTierLevel > tierBefore ? (newTierLevel as MilestoneTier) : null;

  return {
    milestoneUnlocked,
    currentStreak: streak,
    completionCountTotal: updated.completionCountTotal,
  };
}

/**
 * Call when a completion is revoked (task un-completed or habit undo).
 */
export async function revokeIdentityCompletion(userId: string, identityId: string): Promise<void> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { timeZone: true },
  });
  const tz = user?.timeZone ?? 'America/Chicago';

  const identity = await prisma.identity.findFirst({
    where: { id: identityId, userId },
    select: { completionCountTotal: true },
  });
  if (!identity) return;

  const nextTotal = Math.max(0, identity.completionCountTotal - 1);
  const newTier = tierFromCompletionCount(nextTotal);

  await prisma.identity.update({
    where: { id: identityId },
    data: {
      completionCountTotal: nextTotal,
      milestoneTier: newTier,
    },
  });

  await recomputeStreakForIdentity(userId, identityId, tz);
}

/**
 * Recompute streaks for all identities for a user (e.g. after rest day add/remove).
 */
export async function recomputeAllStreaksForUser(userId: string): Promise<void> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { timeZone: true },
  });
  const tz = user?.timeZone ?? 'America/Chicago';
  const identities = await prisma.identity.findMany({
    where: { userId, isActive: true },
    select: { id: true },
  });

  for (const { id } of identities) {
    await recomputeStreakForIdentity(userId, id, tz);
  }
}
