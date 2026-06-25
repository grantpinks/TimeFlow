/**
 * Batched status for Identity Studio rows and action strip.
 */

import { DateTime } from 'luxon';
import { prisma } from '../config/prisma.js';
import { isHabitDueOnDate, type HabitRowStatus, type StudioSummaryResponse } from '@timeflow/shared';
import { getHabitInsights } from './habitInsightsService.js';
import { getSchedulingContext } from './schedulingContextService.js';

export async function getHabitStudioSummary(userId: string): Promise<StudioSummaryResponse> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { timeZone: true },
  });
  if (!user) {
    throw new Error('User not found');
  }

  const timeZone = user.timeZone || 'UTC';
  const now = DateTime.now().setZone(timeZone);
  const todayStart = now.startOf('day');
  const todayEnd = todayStart.plus({ days: 1 });
  const weekEnd = todayStart.plus({ days: 7 });

  const [habits, insights, schedulingContext, completionsToday, upcomingScheduled] =
    await Promise.all([
      prisma.habit.findMany({
        where: { userId, isActive: true },
        select: { id: true, identityId: true, frequency: true, daysOfWeek: true },
      }),
      getHabitInsights(userId, 14),
      getSchedulingContext(userId),
      prisma.habitCompletion.findMany({
        where: {
          habit: { userId },
          completedAt: { gte: todayStart.toJSDate(), lt: todayEnd.toJSDate() },
        },
        select: { habitId: true },
      }),
      prisma.scheduledHabit.findMany({
        where: {
          userId,
          startDateTime: { gte: now.toJSDate(), lt: weekEnd.toJSDate() },
        },
        orderBy: { startDateTime: 'asc' },
        select: { habitId: true, startDateTime: true },
      }),
    ]);

  const completedTodayIds = new Set(completionsToday.map((c) => c.habitId));
  const nextByHabit = new Map<string, string>();
  for (const s of upcomingScheduled) {
    if (!nextByHabit.has(s.habitId)) {
      nextByHabit.set(s.habitId, s.startDateTime.toISOString());
    }
  }

  const insightByHabit = new Map(insights.habits.map((h) => [h.habitId, h]));

  let dueTodayCount = 0;
  let atRiskCount = 0;

  const rows = habits.map((habit) => {
    const insight = insightByHabit.get(habit.id);
    const completedToday = completedTodayIds.has(habit.id);
    const streakAtRisk = insight?.streak.atRisk ?? false;
    const currentStreak = insight?.streak.current ?? 0;
    const nextStart = nextByHabit.get(habit.id) ?? null;

    let status: HabitRowStatus = 'open';
    if (completedToday) {
      status = 'done_today';
    } else if (streakAtRisk) {
      status = 'at_risk';
      atRiskCount += 1;
    } else if (nextStart) {
      const nextDt = DateTime.fromJSDate(new Date(nextStart), { zone: timeZone });
      if (nextDt >= todayStart && nextDt < todayEnd) {
        status = 'scheduled';
      }
    }

    if (isHabitDueOnDate(habit, todayStart.toJSDate(), timeZone) && !completedToday) {
      dueTodayCount += 1;
    }

    return {
      habitId: habit.id,
      status,
      currentStreak,
      streakAtRisk,
      nextStart,
      completedToday,
    };
  });

  const weekProgressByIdentityId: Record<string, { completed: number; target: number }> =
    {};

  for (const habit of habits) {
    const key = habit.identityId ?? '__none__';
    if (!weekProgressByIdentityId[key]) {
      weekProgressByIdentityId[key] = { completed: 0, target: 0 };
    }
    const insight = insightByHabit.get(habit.id);
    weekProgressByIdentityId[key].completed += insight?.completed ?? 0;
    weekProgressByIdentityId[key].target += Math.max(insight?.scheduled ?? 0, 1);
  }

  return {
    rows,
    strip: {
      dueTodayCount,
      atRiskCount,
      unscheduledWeekCount: schedulingContext.unscheduledHabitsCount,
    },
    weekProgressByIdentityId,
  };
}
