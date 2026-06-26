/**
 * @vitest-environment jsdom
 */
import '@testing-library/jest-dom/vitest';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import type { Identity, IdentityEvolutionState } from '@timeflow/shared';
import { IdentityStudioProgressSheet } from '../IdentityStudioProgressSheet';

const identity: Identity = {
  id: 'identity-1',
  userId: 'user-1',
  name: 'Athlete',
  color: '#0d9488',
  icon: '🏃',
  sortOrder: 0,
  isActive: true,
  createdAt: '',
  updatedAt: '',
};

const evolution: IdentityEvolutionState = {
  identityId: 'identity-1',
  level: 4,
  stage: 'Seed',
  xp: 900,
  xpToNextLevel: 600,
  trialState: 'NotStarted',
  trialActiveDays: 0,
  trialTargetDays: 0,
  trialWindowDays: 0,
  trialCheckpointDays: 0,
  trialStartedAt: null,
  trialEndsAt: null,
  xpThisPeriod: 20,
  xpCapResetAt: null,
};

describe('IdentityStudioProgressSheet', () => {
  beforeEach(() => {
    Object.defineProperty(window, 'matchMedia', {
      configurable: true,
      writable: true,
      value: vi.fn().mockImplementation((query: string) => ({
        matches: false,
        media: query,
        onchange: null,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        addListener: vi.fn(),
        removeListener: vi.fn(),
        dispatchEvent: vi.fn(),
      })),
    });
  });

  afterEach(() => {
    cleanup();
  });

  it('renders progress details for the focused identity when open', () => {
    render(
      <IdentityStudioProgressSheet
        open
        onClose={vi.fn()}
        surfaceMode="active"
        evolutionStates={[evolution]}
        identities={[identity]}
        timeZone="America/Chicago"
        focusedIdentityId="identity-1"
      />
    );

    expect(screen.getByRole('dialog', { name: /progress details/i })).toBeInTheDocument();
    expect(screen.getByText('Progress Details')).toBeInTheDocument();
    expect(screen.getAllByText('Athlete').length).toBeGreaterThan(0);
    expect(screen.getByText(/Stage Seed, level 4/i)).toBeInTheDocument();
  });

  it('closes when Escape is pressed', () => {
    const onClose = vi.fn();
    render(
      <IdentityStudioProgressSheet
        open
        onClose={onClose}
        surfaceMode="active"
        evolutionStates={[evolution]}
        identities={[identity]}
        timeZone="America/Chicago"
        focusedIdentityId="identity-1"
      />
    );

    fireEvent.keyDown(document, { key: 'Escape' });

    expect(onClose).toHaveBeenCalled();
  });
});
