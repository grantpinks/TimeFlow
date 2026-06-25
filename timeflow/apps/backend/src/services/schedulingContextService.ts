/**
 * Scheduling Context Service
 *
 * Provides context data for the Flow Coach banner (unscheduled habits, urgency, calendar density)
 */

import { prisma } from '../config/prisma.js';
import { DateTime } from 'luxon';
import { isHabitDueOnDate } from '@timeflow/shared';

export interface SchedulingContext {
  unscheduledHabitsCount: number;
  nextRelevantDay: string; // "tomorrow", "Monday", etc.
  urgentHabits: number; // habits at risk of breaking streaks
  calendarDensity: 'light' | 'moderate' | 'busy';
}

export async function getSchedulingContext(userId: string): Promise<SchedulingContext> {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) {
    throw new Error('User not found');
  }

  const timeZone = user.timeZone || 'UTC';
  const now = DateTime.now().setZone(timeZone);
  const today = now.startOf('day');
  const tomorrow = today.plus({ days: 1 });

  // Count active habits that haven't been scheduled for tomorrow
  const activeHabits = await prisma.habit.findMany({
    where: { userId, isActive: true },
  });

  const scheduledForTomorrow = await prisma.scheduledHabit.findMany({
    where: {
      userId,
      startDateTime: {
        gte: tomorrow.toJSDate(),
        lt: tomorrow.plus({ days: 1 }).toJSDate(),
      },
    },
    select: { habitId: true },
  });

  const dueTomorrowHabits = activeHabits.filter((habit) =>
    isHabitDueOnDate(habit, tomorrow.toJSDate(), timeZone)
  );
  const scheduledTomorrowHabitIds = new Set(scheduledForTomorrow.map((s) => s.habitId));
  const unscheduledHabitsCount = dueTomorrowHabits.filter(
    (habit) => !scheduledTomorrowHabitIds.has(habit.id)
  ).length;

  // Determine next relevant day
  const dayOfWeek = now.weekday; // 1=Monday, 7=Sunday
  let nextRelevantDay = 'this week';
  if (now.hour >= 18) {
    nextRelevantDay = 'tomorrow';
  } else if (dayOfWeek >= 5) {
    // Friday, Saturday, Sunday
    nextRelevantDay = 'next week';
  }

  // Check for urgent habits due today and not completed today
  const completionsToday = await prisma.habitCompletion.findMany({
    where: {
      habit: { userId },
      completedAt: {
        gte: today.toJSDate(),
        lt: tomorrow.toJSDate(),
      },
    },
    select: { habitId: true },
  });

  const completedHabitIds = new Set(completionsToday.map((c) => c.habitId));
  const dueTodayHabits = activeHabits.filter((habit) =>
    isHabitDueOnDate(habit, today.toJSDate(), timeZone)
  );
  const urgentHabits = dueTodayHabits.filter((h) => !completedHabitIds.has(h.id)).length;

  // TODO: Implement calendar density check (requires Google Calendar API call)
  const calendarDensity: 'light' | 'moderate' | 'busy' = 'moderate';

  return {
    unscheduledHabitsCount,
    nextRelevantDay,
    urgentHabits,
    calendarDensity,
  };
}
