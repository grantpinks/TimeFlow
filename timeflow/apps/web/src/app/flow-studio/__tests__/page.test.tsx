/**
 * @vitest-environment jsdom
 */
import '@testing-library/jest-dom/vitest';
import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';

vi.mock('@/components/Layout', () => ({
  Layout: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

vi.mock('@/hooks/useUser', () => ({
  useUser: () => ({
    user: { identityEvolutionEnabled: true, timeZone: 'America/Chicago' },
    isAuthenticated: true,
  }),
}));

vi.mock('@/hooks/useEvolutionSurface', () => ({
  useEvolutionSurface: () => ({
    mode: 'active',
    states: [
      {
        identityId: 'identity-1',
        level: 3,
        stage: 'Builder',
        xp: 260,
        xpToNextLevel: 140,
        trialState: 'Inactive',
        trialActiveDays: 0,
        trialTargetDays: 4,
        trialWindowDays: 7,
        trialCheckpointDays: 0,
        trialStartedAt: null,
        trialEndsAt: null,
        xpThisPeriod: 40,
        xpCapResetAt: null,
      },
    ],
    loading: false,
    refresh: vi.fn(),
  }),
}));

vi.mock('@/lib/api', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/api')>();
  return {
    ...actual,
    getIdentities: vi.fn(async () => [
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
    ]),
  };
});

vi.mock('@/components/identity-studio/IdentityStudioEvolutionPanel', () => ({
  IdentityStudioEvolutionPanel: () => (
    <section data-testid="identity-studio-evolution-panel">Flow progression studio</section>
  ),
}));

import FlowStudioPage from '../page';

describe('FlowStudioPage', () => {
  it('renders the dedicated Flow Studio route with the evolution panel', async () => {
    render(<FlowStudioPage />);

    expect(await screen.findByText(/Flow Studio/i)).toBeInTheDocument();
    expect(screen.getByTestId('identity-studio-evolution-panel')).toBeInTheDocument();
  });
});
