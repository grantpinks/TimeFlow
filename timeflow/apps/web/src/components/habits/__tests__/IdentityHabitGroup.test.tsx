/**
 * @vitest-environment jsdom
 */

import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, render, screen, within } from '@testing-library/react';
import type { Habit, Identity, IdentityEvolutionState } from '@timeflow/shared';
import { IdentityHabitGroup } from '../IdentityHabitGroup';

const identity: Identity = {
  id: 'id-1',
  userId: 'u1',
  name: 'Athlete',
  color: '#0d9488',
  icon: '🏃',
  sortOrder: 0,
  isActive: true,
  createdAt: '',
  updatedAt: '',
};

const habits: Habit[] = [
  {
    id: 'h1',
    userId: 'u1',
    title: 'Run',
    frequency: 'daily',
    daysOfWeek: [],
    durationMinutes: 20,
    isActive: true,
    identityId: 'id-1',
    createdAt: '',
    updatedAt: '',
  },
];

const evolution: IdentityEvolutionState = {
  identityId: 'id-1',
  level: 2,
  stage: 'Builder',
  xp: 10,
  xpToNextLevel: 40,
  trialState: 'Active',
  trialActiveDays: 3,
  trialTargetDays: 7,
  trialWindowDays: 14,
  trialCheckpointDays: 5,
  trialStartedAt: null,
  trialEndsAt: null,
  xpThisPeriod: 0,
  xpCapResetAt: null,
};

describe('IdentityHabitGroup', () => {
  afterEach(() => {
    cleanup();
  });

  it('renders stage badge when evolution is provided', () => {
    render(
      <IdentityHabitGroup identity={identity} habits={habits} evolution={evolution}>
        <div>child</div>
      </IdentityHabitGroup>
    );
    const group = screen.getByTestId('identity-habit-group');
    expect(within(group).getByTestId('identity-habit-group-stage-badge').textContent).toContain(
      'Builder'
    );
  });

  it('shows trial progress line for active trial', () => {
    render(
      <IdentityHabitGroup identity={identity} habits={habits} evolution={evolution}>
        <div>child</div>
      </IdentityHabitGroup>
    );
    const group = screen.getByTestId('identity-habit-group');
    expect(within(group).getByTestId('identity-habit-group-trial-line').textContent).toContain(
      'Trial:'
    );
    expect(within(group).getByTestId('identity-habit-group-trial-line').textContent).toContain(
      '3'
    );
    expect(within(group).getByTestId('identity-habit-group-trial-line').textContent).toContain(
      '7'
    );
  });

  it('omits stage badge when evolution is absent', () => {
    render(
      <IdentityHabitGroup identity={identity} habits={habits} evolution={null}>
        <div>child</div>
      </IdentityHabitGroup>
    );
    const group = screen.getByTestId('identity-habit-group');
    expect(within(group).queryByTestId('identity-habit-group-stage-badge')).toBeNull();
    expect(within(group).queryByTestId('identity-habit-group-trial-line')).toBeNull();
  });
});
