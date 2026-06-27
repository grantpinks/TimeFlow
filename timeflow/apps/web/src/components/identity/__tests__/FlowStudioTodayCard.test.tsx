/**
 * @vitest-environment jsdom
 */
import '@testing-library/jest-dom/vitest';
import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import type { IdentityDayProgress, IdentityEvolutionState } from '@timeflow/shared';
import { FlowStudioTodayCard } from '../FlowStudioTodayCard';

const identities: IdentityDayProgress[] = [
  {
    identityId: 'identity-1',
    name: 'Professional',
    icon: '💼',
    color: '#0d9488',
    completedCount: 2,
    totalMinutes: 45,
    inProgressCount: 0,
    currentStreak: 3,
    completionCountTotal: 24,
  },
] as IdentityDayProgress[];

const evolutionStates: IdentityEvolutionState[] = [
  {
    identityId: 'identity-1',
    level: 4,
    stage: 'Builder',
    xp: 320,
    xpToNextLevel: 180,
    trialState: 'Active',
    trialActiveDays: 2,
    trialTargetDays: 4,
    trialWindowDays: 7,
    trialCheckpointDays: 0,
    trialStartedAt: null,
    trialEndsAt: null,
    xpThisPeriod: 60,
    xpCapResetAt: null,
  },
];

afterEach(cleanup);

describe('FlowStudioTodayCard', () => {
  it('renders a lightweight Flow Studio summary with CTA', () => {
    render(
      <FlowStudioTodayCard
        identities={identities}
        evolutionStates={evolutionStates}
        evolutionMode="active"
        evolutionFeatureEnabled
        loading={false}
      />
    );

    expect(screen.getAllByText(/Flow Studio/i).length).toBeGreaterThan(0);
    expect(screen.getByText(/Professional/i)).toBeInTheDocument();
    expect(screen.getByText(/Level 4/i)).toBeInTheDocument();
    expect(screen.getByText(/2 completions/i)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /open flow studio/i })).toHaveAttribute(
      'href',
      '/flow-studio'
    );
  });

  it('keeps Today lightweight while linking to identity habit planning', () => {
    render(
      <FlowStudioTodayCard
        identities={identities}
        evolutionStates={evolutionStates}
        evolutionMode="active"
        evolutionFeatureEnabled
        loading={false}
      />
    );

    expect(screen.getByText(/Identity habit planning/i)).toBeInTheDocument();
    expect(screen.getByText(/Open Identity Studio to plan and schedule/i)).toBeInTheDocument();
    expect(screen.queryByText(/scheduling identity-linked habits without loading reward previews here/i)).not.toBeInTheDocument();
    expect(screen.getByRole('link', { name: /plan identity habits/i })).toHaveAttribute(
      'href',
      '/habits'
    );
  });
});
