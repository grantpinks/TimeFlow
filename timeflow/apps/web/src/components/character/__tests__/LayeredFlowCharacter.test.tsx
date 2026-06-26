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
    expect(screen.getByTestId('flow-mascot-accessory')).toHaveAttribute(
      'data-layer',
      'hat'
    );
  });

  it('falls back to the base mascot when no asset is available', () => {
    render(<LayeredFlowCharacter accessory="unknown" palette="ocean" />);

    expect(screen.getByTestId('layered-flow-character')).toBeInTheDocument();
    expect(screen.queryByTestId('flow-mascot-accessory')).toBeNull();
  });

  it('disables aura animation when reduced motion is requested', () => {
    motionMocks.reducedMotion.mockReturnValueOnce(true);
    render(<LayeredFlowCharacter accessory="halo" palette="ocean" />);

    expect(screen.getByTestId('flow-mascot-accessory')).not.toHaveClass('motion-safe:animate-pulse');
  });

  it('renders aura accessories as a background layer behind Flow', () => {
    render(<LayeredFlowCharacter accessory="wings" palette="ocean" />);

    const accessory = screen.getByTestId('flow-mascot-accessory');
    expect(accessory).toHaveAttribute('data-layer', 'aura');
    expect(accessory).toHaveAttribute('data-layer-position', 'behind');
    expect(accessory).not.toHaveClass('bg-white/80');
  });

  it('renders eye accessories as a face overlay instead of a badge', () => {
    render(<LayeredFlowCharacter accessory="bright_eyes" palette="ocean" />);

    const accessory = screen.getByTestId('flow-mascot-accessory');
    expect(accessory).toHaveAttribute('data-layer', 'eyes');
    expect(accessory).toHaveAttribute('data-layer-position', 'front');
    expect(accessory).not.toHaveClass('bg-white/80');
  });
});
