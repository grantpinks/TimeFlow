/**
 * @vitest-environment jsdom
 */
import '@testing-library/jest-dom/vitest';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import type { Identity, IdentityEvolutionState } from '@timeflow/shared';

const upcomingMocks = vi.hoisted(() => ({
  data: {
    identityId: 'identity-1',
    xpToNextLevel: 80,
    sessionsNeeded: 8,
    upcoming: [
      {
        unlockKey: 'flow_accessory_cap',
        unlockType: 'flow_accessory',
        displayName: 'Flow cap',
        description: 'A starter cap for showing up.',
        grantedByLevel: 2,
        grantedByStage: null,
      },
      {
        unlockKey: 'flow_accessory_bright_eyes',
        unlockType: 'flow_accessory',
        displayName: 'Bright eyes',
        description: 'A brighter look for Flow.',
        grantedByLevel: 4,
        grantedByStage: null,
      },
    ],
  },
}));

vi.mock('@/hooks/useUpcomingUnlocks', () => ({
  useUpcomingUnlocks: () => ({
    data: upcomingMocks.data,
    loading: false,
    refresh: vi.fn(),
  }),
}));

vi.mock('@/components/identity/FlowCustomizationPanel', () => ({
  FlowCustomizationPanel: () => (
    <section aria-label="Flow customization">Flow companion look</section>
  ),
}));

vi.mock('framer-motion', async () => {
  const actual = await vi.importActual<typeof import('framer-motion')>('framer-motion');
  return {
    ...actual,
    useReducedMotion: () => true,
  };
});

import { IdentityStudioEvolutionPanel } from '../IdentityStudioEvolutionPanel';

const identities: Identity[] = [
  {
    id: 'identity-1',
    userId: 'user-1',
    name: 'Professional',
    description: null,
    color: '#0d9488',
    icon: '💼',
    sortOrder: 0,
    isActive: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
] as Identity[];

const evolution: IdentityEvolutionState = {
  identityId: 'identity-1',
  level: 2,
  stage: 'Seed',
  xp: 120,
  xpToNextLevel: 80,
  trialState: 'Inactive',
  trialActiveDays: 0,
  trialTargetDays: 4,
  trialWindowDays: 7,
  trialCheckpointDays: 0,
  trialStartedAt: null,
  trialEndsAt: null,
  xpThisPeriod: 40,
  xpCapResetAt: null,
};

describe('IdentityStudioEvolutionPanel', () => {
  afterEach(() => {
    cleanup();
  });

  it('shows progression stats, future unlock previews, and Flow customization', () => {
    render(
      <IdentityStudioEvolutionPanel
        evolutionEnabled
        isAuthenticated
        surfaceMode="active"
        evolutionStates={[evolution]}
        identities={identities}
        loading={false}
        timeZone="America/Chicago"
        onRefresh={vi.fn()}
      />
    );

    expect(screen.getByTestId('identity-studio-evolution-panel')).toBeInTheDocument();
    expect(screen.getAllByText(/Professional/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Level 2/i).length).toBeGreaterThan(0);
    expect(screen.getByText(/Future unlock previews/i)).toBeInTheDocument();
    expect(screen.getByText('Flow cap')).toBeInTheDocument();
    expect(screen.getByText('Bright eyes')).toBeInTheDocument();
    expect(screen.getByText(/Flow companion look/i)).toBeInTheDocument();
  });
});
