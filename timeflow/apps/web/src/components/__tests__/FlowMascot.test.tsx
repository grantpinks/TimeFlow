/**
 * @vitest-environment jsdom
 */
import '@testing-library/jest-dom/vitest';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { FlowMascot } from '../FlowMascot';

const customizationMocks = vi.hoisted(() => ({
  customization: {
    selectedPalette: 'ocean',
    selectedAnimationPack: 'default',
    selectedAccessory: 'crown',
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
  afterEach(() => {
    cleanup();
  });

  it('renders the equipped accessory outside the customization panel', () => {
    render(<FlowMascot size="md" expression="happy" />);

    expect(screen.getByTestId('flow-mascot-accessory')).toHaveAttribute('data-layer', 'hat');
    expect(screen.getByTestId('flow-mascot-accessory')).toHaveAttribute(
      'aria-label',
      'Crown accessory'
    );
  });

  it('allows callers to suppress the accessory layer', () => {
    render(<FlowMascot size="md" expression="happy" accessory="none" />);

    expect(screen.queryByTestId('flow-mascot-accessory')).toBeNull();
  });
});
