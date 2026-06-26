/**
 * @vitest-environment jsdom
 */
import '@testing-library/jest-dom/vitest';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { LayeredFlowCharacter } from '../LayeredFlowCharacter';

const motionMocks = vi.hoisted(() => ({
  reducedMotion: vi.fn(() => false),
}));

vi.mock('framer-motion', async () => {
  const actual = await vi.importActual<typeof import('framer-motion')>('framer-motion');
  return {
    ...actual,
    useReducedMotion: motionMocks.reducedMotion,
  };
});

describe('LayeredFlowCharacter', () => {
  afterEach(() => {
    cleanup();
  });

  it('renders the accessory layer above the base mascot', () => {
    render(<LayeredFlowCharacter accessory="crown" palette="ocean" />);

    expect(screen.getByTestId('layered-flow-character')).toBeInTheDocument();
    expect(screen.getByTestId('flow-character-accessory')).toHaveAttribute(
      'data-layer',
      'hat'
    );
  });

  it('falls back to the base mascot when no asset is available', () => {
    render(<LayeredFlowCharacter accessory="unknown" palette="ocean" />);

    expect(screen.getByTestId('layered-flow-character')).toBeInTheDocument();
    expect(screen.queryByTestId('flow-character-accessory')).toBeNull();
  });

  it('disables aura animation when reduced motion is requested', () => {
    motionMocks.reducedMotion.mockReturnValueOnce(true);
    render(<LayeredFlowCharacter accessory="halo" palette="ocean" />);

    expect(screen.getByTestId('flow-character-accessory')).not.toHaveClass('motion-safe:animate-pulse');
  });
});
