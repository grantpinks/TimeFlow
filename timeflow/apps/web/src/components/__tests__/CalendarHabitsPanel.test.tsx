/**
 * @vitest-environment jsdom
 */

import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { CalendarHabitsPanel } from '../CalendarHabitsPanel';
import type { Habit, StudioSummaryResponse } from '@timeflow/shared';

function habit(overrides: Partial<Habit>): Habit {
  return {
    id: overrides.id ?? 'habit-1',
    userId: 'user-1',
    title: overrides.title ?? 'Habit',
    description: null,
    frequency: 'daily',
    daysOfWeek: [],
    preferredTimeOfDay: 'morning',
    durationMinutes: 30,
    isActive: true,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    ...overrides,
  };
}

describe('CalendarHabitsPanel', () => {
  it('surfaces actionable habit status instead of a flat list', () => {
    const habits = [
      habit({ id: 'risk', title: 'Run' }),
      habit({ id: 'scheduled', title: 'Study', durationMinutes: 60 }),
      habit({ id: 'done', title: 'Pray', durationMinutes: 5 }),
      habit({ id: 'open', title: 'Clean Up' }),
    ];
    const summary: StudioSummaryResponse = {
      rows: [
        {
          habitId: 'risk',
          status: 'at_risk',
          currentStreak: 6,
          streakAtRisk: true,
          nextStart: null,
          completedToday: false,
        },
        {
          habitId: 'scheduled',
          status: 'scheduled',
          currentStreak: 2,
          streakAtRisk: false,
          nextStart: '2026-06-24T18:00:00.000Z',
          completedToday: false,
        },
        {
          habitId: 'done',
          status: 'done_today',
          currentStreak: 10,
          streakAtRisk: false,
          nextStart: null,
          completedToday: true,
        },
        {
          habitId: 'open',
          status: 'open',
          currentStreak: 0,
          streakAtRisk: false,
          nextStart: null,
          completedToday: false,
        },
      ],
      strip: {
        dueTodayCount: 2,
        atRiskCount: 1,
        unscheduledWeekCount: 3,
      },
      weekProgressByIdentityId: {},
    };

    render(<CalendarHabitsPanel habits={habits} studioSummary={summary} timeZone="UTC" />);

    expect(screen.getByText('still due')).toBeTruthy();
    expect(screen.getByText('at risk')).toBeTruthy();
    expect(screen.getByText('need slots')).toBeTruthy();
    expect(screen.getByText('Protect streak')).toBeTruthy();
    expect(screen.getByText('Scheduled today')).toBeTruthy();
    expect(screen.getAllByText('Done today').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Needs a slot').length).toBeGreaterThan(0);
    expect(screen.getByText('6-day streak')).toBeTruthy();
    expect(screen.getByText('Scheduled 6:00 PM')).toBeTruthy();
  });

  it('does not show Invalid Date when a scheduled habit has a bad next start', () => {
    const summary: StudioSummaryResponse = {
      rows: [
        {
          habitId: 'scheduled',
          status: 'scheduled',
          currentStreak: 0,
          streakAtRisk: false,
          nextStart: 'not-a-date',
          completedToday: false,
        },
      ],
      strip: {
        dueTodayCount: 1,
        atRiskCount: 0,
        unscheduledWeekCount: 1,
      },
      weekProgressByIdentityId: {},
    };

    render(
      <CalendarHabitsPanel
        habits={[habit({ id: 'scheduled', title: 'Study' })]}
        studioSummary={summary}
        timeZone="UTC"
      />
    );

    expect(screen.queryByText(/Invalid Date/)).toBeNull();
    expect(screen.getAllByText('Needs a slot').length).toBeGreaterThan(0);
  });

  it('renders habit suggestion controls inside the habits panel', () => {
    const onToggle = vi.fn();

    render(
      <CalendarHabitsPanel
        habits={[habit({ id: 'open', title: 'Clean Up' })]}
        showHabitRecommendations={true}
        habitSuggestionsLoading={true}
        onToggleHabitRecommendations={onToggle}
      />
    );

    expect(screen.getByText('Calendar suggestions')).toBeTruthy();
    expect(screen.getByText('Syncing slots')).toBeTruthy();

    fireEvent.click(screen.getByLabelText('Show habit suggestions'));

    expect(onToggle).toHaveBeenCalledWith(false);
  });
});
