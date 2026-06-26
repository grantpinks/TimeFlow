/**
 * @vitest-environment jsdom
 */
import '@testing-library/jest-dom/vitest';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import type { IdentityXpFeedbackEvent } from '@timeflow/shared';

const mocks = vi.hoisted(() => ({
  track: vi.fn(),
  useReducedMotion: vi.fn(() => false),
}));

vi.mock('@/lib/analytics', () => ({
  track: mocks.track,
}));

vi.mock('framer-motion', async () => {
  const actual = await vi.importActual<typeof import('framer-motion')>('framer-motion');
  return {
    ...actual,
    useReducedMotion: () => mocks.useReducedMotion(),
  };
});

import {
  IDENTITY_XP_FEEDBACK_EVENT,
  XpFeedbackProvider,
} from '../XpFeedbackProvider';

function xpEvent(overrides: Partial<IdentityXpFeedbackEvent> = {}): IdentityXpFeedbackEvent {
  return {
    identityId: 'identity-1',
    identityName: 'Athlete',
    source: 'task',
    sourceId: 'task-1',
    xpGranted: 10,
    levelBefore: 2,
    levelAfter: 2,
    stageBefore: 'Seed',
    stageAfter: 'Seed',
    trialStarted: false,
    newUnlocks: [],
    xpToNextLevel: 40,
    dailyCapRemaining: 70,
    ...overrides,
  };
}

function dispatchXp(event: IdentityXpFeedbackEvent) {
  window.dispatchEvent(new CustomEvent(IDENTITY_XP_FEEDBACK_EVENT, { detail: event }));
}

async function advance(ms: number) {
  await act(async () => {
    await vi.advanceTimersByTimeAsync(ms);
  });
}

describe('XpFeedbackProvider', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    mocks.track.mockClear();
    mocks.useReducedMotion.mockReturnValue(false);
    vi.stubEnv('NEXT_PUBLIC_CHARACTER_EVOLUTION_PROGRESS_VISIBILITY', 'true');
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllEnvs();
    cleanup();
  });

  it('renders XP amount and identity name after an eligible completion', async () => {
    render(<XpFeedbackProvider />);

    dispatchXp(xpEvent({ xpGranted: 12, identityName: 'Writer' }));
    await advance(350);

    expect(screen.getByText('You showed up for Writer. +12 XP')).toBeInTheDocument();
    expect(screen.getByRole('status')).toHaveAttribute('aria-live', 'polite');
    expect(mocks.track).toHaveBeenCalledWith('identity_xp_toast_shown', {
      source: 'task',
      variant: 'xp',
    });
  });

  it('renders level-up and stage-change variants', async () => {
    render(<XpFeedbackProvider />);

    dispatchXp(xpEvent({ levelBefore: 2, levelAfter: 3 }));
    await advance(350);
    expect(screen.getByText('Athlete reached Level 3')).toBeInTheDocument();

    dispatchXp(xpEvent({
      identityId: 'identity-2',
      identityName: 'Builder',
      sourceId: 'task-2',
      levelBefore: 4,
      levelAfter: 5,
      stageBefore: 'Seed',
      stageAfter: 'Builder',
    }));
    await advance(350);
    expect(screen.getByText('Builder stage unlocked for Builder')).toBeInTheDocument();
  });

  it('does not render a reward toast for zero XP', async () => {
    render(<XpFeedbackProvider />);

    dispatchXp(xpEvent({ xpGranted: 0 }));
    await advance(350);

    expect(screen.queryByRole('status')).not.toBeInTheDocument();
  });

  it('batches rapid completions into one toast', async () => {
    render(<XpFeedbackProvider />);

    dispatchXp(xpEvent({ sourceId: 'task-1', xpGranted: 10 }));
    dispatchXp(xpEvent({ sourceId: 'task-2', xpGranted: 5, identityName: 'Writer' }));
    await advance(350);

    expect(screen.getByText('2 completions strengthened your identities. +15 XP')).toBeInTheDocument();
  });

  it('auto-dismisses the toast', async () => {
    render(<XpFeedbackProvider />);

    dispatchXp(xpEvent());
    await advance(350);
    expect(screen.getByRole('status')).toBeInTheDocument();

    await advance(4000);
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
  });

  it('uses reduced-motion rendering when requested', async () => {
    mocks.useReducedMotion.mockReturnValue(true);
    render(<XpFeedbackProvider />);

    dispatchXp(xpEvent());
    await advance(350);

    expect(screen.getByRole('status')).toHaveAttribute('data-motion', 'reduced');
  });

  it('clicks through to the progress surface', async () => {
    const onOpenProgress = vi.fn();
    render(<XpFeedbackProvider onOpenProgress={onOpenProgress} />);

    dispatchXp(xpEvent());
    await advance(350);
    fireEvent.click(screen.getByRole('button', { name: /view progress/i }));

    expect(onOpenProgress).toHaveBeenCalledWith('identity-1');
    expect(mocks.track).toHaveBeenCalledWith('identity_xp_toast_clicked', {
      source: 'task',
      variant: 'xp',
    });
  });
});
