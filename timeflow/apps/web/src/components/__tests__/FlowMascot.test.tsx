/**
 * @vitest-environment jsdom
 */
import '@testing-library/jest-dom/vitest';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { FlowMascot } from '../FlowMascot';

const customizationMocks = vi.hoisted(() => ({
  customization: {
    selectedPalette: 'ocean',
    selectedAnimationPack: 'default',
    selectedHat: 'crown',
    selectedEyes: 'bright_eyes',
    selectedAura: 'spark',
    selectedBackground: 'sunrise',
  },
}));

vi.mock('@/components/identity/FlowCustomizationProvider', () => ({
  useFlowCustomization: () => ({
    customization: customizationMocks.customization,
    loading: false,
    refresh: vi.fn(),
  }),
}));

describe('FlowMascot', () => {
  beforeEach(() => {
    customizationMocks.customization = {
      selectedPalette: 'ocean',
      selectedAnimationPack: 'default',
      selectedHat: 'crown',
      selectedEyes: 'bright_eyes',
      selectedAura: 'spark',
      selectedBackground: 'sunrise',
    };
  });

  afterEach(() => {
    cleanup();
  });

  it('renders equipped cosmetic slots outside the customization panel', () => {
    render(<FlowMascot size="md" expression="happy" />);

    const layers = screen.getAllByTestId('flow-mascot-accessory');
    expect(layers.map((layer) => layer.getAttribute('data-layer'))).toEqual([
      'background',
      'aura',
      'hat',
      'eyes',
    ]);
  });

  it('allows callers to suppress the accessory layer', () => {
    render(<FlowMascot size="md" expression="happy" showAccessory={false} />);

    expect(screen.queryByTestId('flow-mascot-accessory')).toBeNull();
  });

  it('normalizes stale legacy customization context before resolving cosmetic layers', () => {
    customizationMocks.customization = {
      selectedPalette: 'ocean',
      selectedAnimationPack: 'default',
      selectedAccessory: 'spark',
    } as any;

    render(<FlowMascot size="md" expression="happy" />);

    expect(screen.getByTestId('flow-mascot-accessory')).toHaveAttribute('data-layer', 'aura');
  });
});
