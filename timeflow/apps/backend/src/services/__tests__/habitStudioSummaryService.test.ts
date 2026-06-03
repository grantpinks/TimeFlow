import { describe, it, expect, vi, beforeEach } from 'vitest';

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
    vi.mocked(prisma.user.findUnique).mockResolvedValue({ timeZone: 'UTC' } as any);
    vi.mocked(prisma.habit.findMany).mockResolvedValue([
      { id: 'h1', identityId: 'id-1', frequency: 'daily' },
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

  it('returns one row per active habit and strip counts', async () => {
    const result = await getHabitStudioSummary('user-1');
    expect(result.rows).toHaveLength(1);
    expect(result.rows[0]?.habitId).toBe('h1');
    expect(result.strip.unscheduledWeekCount).toBe(2);
    expect(result.strip.dueTodayCount).toBe(1);
    expect(result.weekProgressByIdentityId['id-1']).toEqual({ completed: 2, target: 4 });
  });
});
