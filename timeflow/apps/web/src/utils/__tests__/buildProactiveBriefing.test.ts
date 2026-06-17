import { describe, expect, it } from 'vitest';
import { buildProactiveBriefing } from '../buildProactiveBriefing';

describe('buildProactiveBriefing', () => {
  it('prioritizes overdue guidance', () => {
    const line = buildProactiveBriefing({
      goalTracking: {
        overdueCount: 2,
        dueTodayCount: 1,
        dueThisWeekCount: 3,
        upcomingDeadlines: [],
      },
      completion: {
        completedToday: 1,
        completedThisWeek: 5,
        totalActiveTasks: 4,
        completionRate: 20,
      },
    });

    expect(line).toContain('2 overdue');
  });

  it('includes productivity trend and peak time', () => {
    const line = buildProactiveBriefing({
      goalTracking: {
        overdueCount: 0,
        dueTodayCount: 2,
        dueThisWeekCount: 2,
        upcomingDeadlines: [],
      },
      completion: {
        completedToday: 1,
        completedThisWeek: 5,
        totalActiveTasks: 3,
        completionRate: 33,
      },
      productivity: {
        bestTimeOfDay: '9-10',
        mostProductiveDays: ['Tuesday'],
        weeklyTrend: 'up',
        completionByDayOfWeek: {},
      },
      categories: {
        categoryDistribution: [{ categoryName: 'Work', taskCount: 5, hoursSpent: 2 }],
        topCategories: ['Work'],
      },
    });

    expect(line).toContain('due today');
    expect(line).toContain('trend is up');
    expect(line).toContain('peak focus');
  });

  it('returns default prompt when no data', () => {
    const line = buildProactiveBriefing({});
    expect(line).toContain('Ask Flow');
  });
});
