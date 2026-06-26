import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

vi.mock('../../config/prisma.js', () => ({
  prisma: {
    user: { findUnique: vi.fn() },
    habit: { findMany: vi.fn() },
    habitCompletion: { findMany: vi.fn() },
    scheduledHabit: { findMany: vi.fn() },
  },
}));

vi.mock('../habitInsightsService.js', () => ({
  getHabitInsights: vi.fn(),
}));

vi.mock('../schedulingContextService.js', () => ({
  getSchedulingContext: vi.fn(),
}));

import { prisma } from '../../config/prisma.js';
import { getHabitInsights } from '../habitInsightsService.js';
import { getSchedulingContext } from '../schedulingContextService.js';
import { getHabitStudioSummary } from '../habitStudioSummaryService.js';

describe('getHabitStudioSummary', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-06-25T15:00:00.000Z')); // Thursday
    vi.mocked(prisma.user.findUnique).mockResolvedValue({ timeZone: 'UTC' } as any);
    vi.mocked(prisma.habit.findMany).mockResolvedValue([
      { id: 'h1', identityId: 'id-1', frequency: 'daily', daysOfWeek: [] },
    ] as any);
    vi.mocked(prisma.habitCompletion.findMany).mockResolvedValue([]);
    vi.mocked(prisma.scheduledHabit.findMany).mockResolvedValue([]);
    vi.mocked(getSchedulingContext).mockResolvedValue({
      unscheduledHabitsCount: 2,
      nextRelevantDay: 'tomorrow',
      urgentHabits: 1,
      calendarDensity: 'moderate',
    });
    vi.mocked(getHabitInsights).mockResolvedValue({
      habits: [
        {
          habitId: 'h1',
          habitTitle: 'Run',
          adherenceRate: 0.5,
          scheduled: 4,
          completed: 2,
          skipped: 0,
          minutesScheduled: 60,
          minutesCompleted: 30,
          streak: { current: 3, best: 5, lastCompleted: null, atRisk: false },
          bestWindow: null,
          adherenceSeries: [],
          skipReasons: [],
        },
      ],
    } as any);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('returns one row per active habit and strip counts', async () => {
    const result = await getHabitStudioSummary('user-1');
    expect(result.rows).toHaveLength(1);
    expect(result.rows[0]?.habitId).toBe('h1');
    expect(result.strip.unscheduledWeekCount).toBe(2);
    expect(result.strip.dueTodayCount).toBe(1);
    expect(result.weekProgressByIdentityId['id-1']).toEqual({ completed: 2, target: 4 });
  });

  it('counts weekly and custom habits as due only on configured local days', async () => {
    vi.mocked(prisma.habit.findMany).mockResolvedValue([
      { id: 'daily', identityId: null, frequency: 'daily', daysOfWeek: [] },
      { id: 'weekly-due', identityId: null, frequency: 'weekly', daysOfWeek: ['thu'] },
      { id: 'weekly-off', identityId: null, frequency: 'weekly', daysOfWeek: ['fri'] },
      { id: 'custom-due', identityId: null, frequency: 'custom', daysOfWeek: ['thu'] },
      { id: 'custom-off', identityId: null, frequency: 'custom', daysOfWeek: ['fri'] },
    ] as any);
    vi.mocked(getHabitInsights).mockResolvedValue({
      habits: [],
    } as any);

    const result = await getHabitStudioSummary('user-1');

    expect(result.strip.dueTodayCount).toBe(3);
  });

  it('treats an at-risk habit scheduled today as scheduled instead of needing protection', async () => {
    vi.mocked(prisma.scheduledHabit.findMany).mockResolvedValue([
      { habitId: 'h1', startDateTime: new Date('2026-06-25T14:00:00.000Z') },
    ] as any);
    vi.mocked(getHabitInsights).mockResolvedValue({
      habits: [
        {
          habitId: 'h1',
          habitTitle: 'Run',
          adherenceRate: 0.5,
          scheduled: 4,
          completed: 2,
          skipped: 0,
          minutesScheduled: 60,
          minutesCompleted: 30,
          streak: { current: 3, best: 5, lastCompleted: null, atRisk: true },
          bestWindow: null,
          adherenceSeries: [],
          skipReasons: [],
        },
      ],
    } as any);

    const result = await getHabitStudioSummary('user-1');

    expect(result.rows[0]?.status).toBe('scheduled');
    expect(result.rows[0]?.streakAtRisk).toBe(true);
    expect(result.strip.dueTodayCount).toBe(0);
    expect(result.strip.atRiskCount).toBe(0);
    expect(prisma.scheduledHabit.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          startDateTime: expect.objectContaining({
            gte: new Date('2026-06-25T00:00:00.000Z'),
          }),
        }),
      })
    );
  });
});
