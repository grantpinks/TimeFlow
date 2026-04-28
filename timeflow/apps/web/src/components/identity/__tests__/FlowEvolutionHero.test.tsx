/**
 * @vitest-environment jsdom
 */

import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import type { IdentityEvolutionState } from '@timeflow/shared';

const useReducedMotionMock = vi.fn(() => false);

vi.mock('framer-motion', async () => {
  const mod = await vi.importActual<typeof import('framer-motion')>('framer-motion');
  return {
    ...mod,
    useReducedMotion: () => useReducedMotionMock(),
  };
});

vi.mock('next/image', () => ({
  default: function MockImage(props: Record<string, unknown>) {
    const { priority: _priority, ...rest } = props;
    return <img {...rest} alt={String(rest.alt ?? '')} />;
  },
}));

import { FlowEvolutionHero, levelProgressRatio } from '../FlowEvolutionHero';

const BASE: IdentityEvolutionState = {
  identityId: 'id-1',
  level: 3,
  stage: 'Builder',
  xp: 200,
  xpToNextLevel: 250,
  trialState: 'Active',
  trialActiveDays: 2,
  trialTargetDays: 4,
  trialWindowDays: 7,
  trialCheckpointDays: 0,
  trialStartedAt: '2026-04-20T12:00:00.000Z',
  trialEndsAt: '2026-04-28T12:00:00.000Z',
  xpThisPeriod: 40,
  xpCapResetAt: null,
};

describe('levelProgressRatio', () => {
  it('derives in-level progress from xp and xpToNextLevel', () => {
    const L = 3;
    const cost = L * L * 50;
    const s = { ...BASE, level: L, xpToNextLevel: 100 };
    const expected = (cost - 100) / cost;
    expect(levelProgressRatio(s)).toBeCloseTo(expected, 5);
  });
});

describe('FlowEvolutionHero', () => {
  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
    useReducedMotionMock.mockReturnValue(false);
  });

  it('renders stage, level, and XP progress bar for mock evolution state', () => {
    render(
      <FlowEvolutionHero
        evolution={BASE}
        identityName="Morning Athlete"
        nextUnlockLabel={null}
        timeZone="America/Chicago"
      />
    );

    expect(screen.getByTestId('flow-evolution-hero')).toBeTruthy();
    expect(screen.getByText('Leading identity')).toBeTruthy();
    expect(screen.getByText('Morning Athlete')).toBeTruthy();
    expect(screen.getByText('Builder')).toBeTruthy();
    expect(screen.getByText(/Level 3/)).toBeTruthy();
    expect(screen.getByLabelText('Experience toward next level')).toBeTruthy();
  });

  it('shows checkpoint copy when trialCheckpointDays > 0', () => {
    const ev = { ...BASE, trialCheckpointDays: 2, trialState: 'Active' as const };
    render(
      <FlowEvolutionHero
        evolution={ev}
        identityName="Test"
        timeZone="UTC"
      />
    );
    expect(
      screen.getByText(/You missed a few days — your progress is saved at a checkpoint/)
    ).toBeTruthy();
  });

  it('shows checkpoint copy when trialState is CheckpointFailed', () => {
    const ev = { ...BASE, trialState: 'CheckpointFailed' as const, trialCheckpointDays: 0 };
    render(
      <FlowEvolutionHero
        evolution={ev}
        identityName="Test"
        timeZone="UTC"
      />
    );
    expect(
      screen.getByText(/You missed a few days — your progress is saved at a checkpoint/)
    ).toBeTruthy();
  });

  it('respects reduced motion (renders when useReducedMotion is true)', () => {
    useReducedMotionMock.mockReturnValue(true);
    const { container } = render(
      <FlowEvolutionHero evolution={BASE} identityName="Test" timeZone="UTC" />
    );
    expect(container.querySelector('[data-testid="flow-evolution-hero"]')).toBeTruthy();
  });
});
