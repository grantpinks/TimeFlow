/**
 * User rest / sick days — bridges identity streaks (max per rolling window).
 */

import { DateTime } from 'luxon';
import { prisma } from '../config/prisma.js';
import * as identityEngagementService from './identityEngagementService.js';

const MAX_REST_DAYS_ROLLING_30 = 2;

const REASONS = ['sick', 'travel', 'rest', 'other'] as const;
export type RestDayReason = (typeof REASONS)[number];

export function isValidReason(r: string): r is RestDayReason {
  return (REASONS as readonly string[]).includes(r);
}

export async function listRestDays(userId: string) {
  return prisma.userRestDay.findMany({
    where: { userId },
    orderBy: { localDate: 'desc' },
    take: 120,
  });
}

function rolling30MinLocalDate(timeZone: string): string {
  return DateTime.now().setZone(timeZone).minus({ days: 30 }).toISODate()!;
}

export async function countRestDaysInRolling30(userId: string, timeZone: string): Promise<number> {
  const minDate = rolling30MinLocalDate(timeZone);
  return prisma.userRestDay.count({
    where: {
      userId,
      localDate: { gte: minDate },
    },
  });
}

export async function addRestDay(
  userId: string,
  localDate: string,
  reason: RestDayReason,
  timeZone: string
) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(localDate)) {
    throw new Error('INVALID_DATE');
  }

  const existing = await prisma.userRestDay.findUnique({
    where: { userId_localDate: { userId, localDate } },
  });
  if (existing) {
    return prisma.userRestDay.update({
      where: { id: existing.id },
      data: { reason },
    });
  }

  const count = await countRestDaysInRolling30(userId, timeZone);
  if (count >= MAX_REST_DAYS_ROLLING_30) {
    throw new Error('REST_DAY_LIMIT');
  }

  const row = await prisma.userRestDay.create({
    data: { userId, localDate, reason },
  });

  await identityEngagementService.recomputeAllStreaksForUser(userId);
  return row;
}

export async function deleteRestDay(userId: string, localDate: string) {
  const existing = await prisma.userRestDay.findFirst({
    where: { userId, localDate },
  });
  if (!existing) return false;

  await prisma.userRestDay.delete({ where: { id: existing.id } });
  await identityEngagementService.recomputeAllStreaksForUser(userId);
  return true;
}
