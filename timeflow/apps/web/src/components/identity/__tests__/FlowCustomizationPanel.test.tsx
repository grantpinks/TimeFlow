/**
 * @vitest-environment jsdom
 */
import '@testing-library/jest-dom/vitest';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { FlowCustomizationState, IdentityUnlockItem } from '@timeflow/shared';

const apiMocks = vi.hoisted(() => ({
  getFlowCustomization: vi.fn(),
  getIdentities: vi.fn(),
  getIdentityUnlocks: vi.fn(),
  updateFlowCustomization: vi.fn(),
}));

vi.mock('@/lib/api', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/api')>();
  return {
    ...actual,
    getFlowCustomization: apiMocks.getFlowCustomization,
    getIdentities: apiMocks.getIdentities,
    getIdentityUnlocks: apiMocks.getIdentityUnlocks,
    updateFlowCustomization: apiMocks.updateFlowCustomization,
  };
});

vi.mock('framer-motion', async () => {
  const actual = await vi.importActual<typeof import('framer-motion')>('framer-motion');
  return {
    ...actual,
    useReducedMotion: () => false,
  };
});

vi.mock('@/hooks/useUser', () => ({
  useUser: () => ({
    user: { identityEvolutionEnabled: true },
    isAuthenticated: true,
    loading: false,
  }),
}));

import { FlowCustomizationPanel } from '../FlowCustomizationPanel';
import { FlowCustomizationProvider } from '../FlowCustomizationProvider';

function baseCustomization(): FlowCustomizationState {
  return {
    userId: 'u1',
    selectedPalette: 'default',
    selectedEmote: 'default',
    selectedAnimationPack: 'default',
    selectedStageVariant: 'default',
    updatedAt: new Date().toISOString(),
  };
}

function mockApis(overrides?: {
  unlocks?: IdentityUnlockItem[];
  customization?: Partial<FlowCustomizationState>;
}) {
  const customization = { ...baseCustomization(), ...overrides?.customization };
  apiMocks.getFlowCustomization.mockResolvedValue(customization);
  apiMocks.getIdentities.mockResolvedValue([{ id: 'id-lead' } as any]);
  apiMocks.getIdentityUnlocks.mockResolvedValue({
    unlocks: overrides?.unlocks ?? [],
  });
  apiMocks.updateFlowCustomization.mockImplementation(async (body: Partial<FlowCustomizationState>) => ({
    ...customization,
    ...body,
    updatedAt: new Date().toISOString(),
  }));
}

function renderPanel() {
  return render(
    <FlowCustomizationProvider>
      <FlowCustomizationPanel evolutionEnabled />
    </FlowCustomizationProvider>
  );
}

describe('FlowCustomizationPanel', () => {
  beforeEach(() => {
    apiMocks.getFlowCustomization.mockReset();
    apiMocks.getIdentities.mockReset();
    apiMocks.getIdentityUnlocks.mockReset();
    apiMocks.updateFlowCustomization.mockReset();
  });

  afterEach(() => {
    cleanup();
  });

  it('does not render when evolution is disabled', () => {
    const { container } = render(<FlowCustomizationPanel evolutionEnabled={false} />);
    expect(container.firstChild).toBeNull();
  });

  it('hides palette options that are not unlocked (except default)', async () => {
    mockApis({
      unlocks: [
        {
          id: '1',
          identityId: 'id-lead',
          userId: 'u1',
          unlockKey: 'flow_palette_default',
          unlockType: 'flow_palette',
          grantedAt: new Date().toISOString(),
          grantedByStage: null,
          grantedByLevel: 1,
        },
      ],
    });

    renderPanel();

    await waitFor(() => {
      expect(document.getElementById('flow-custom-palette')).toBeTruthy();
    });

    const paletteSelect = document.getElementById('flow-custom-palette') as HTMLSelectElement;
    const options = [...paletteSelect.options].map((o) => o.textContent);
    expect(options.some((t) => /ocean/i.test(t ?? ''))).toBe(false);
    expect(options.some((t) => /default/i.test(t ?? ''))).toBe(true);
  });

  it('calls updateFlowCustomization when palette changes', async () => {
    const user = userEvent.setup();
    const oceanUnlock: IdentityUnlockItem = {
      id: '1',
      identityId: 'id-lead',
      userId: 'u1',
      unlockKey: 'flow_palette_ocean',
      unlockType: 'flow_palette',
      grantedAt: new Date().toISOString(),
      grantedByStage: null,
      grantedByLevel: 3,
    };
    mockApis({ unlocks: [oceanUnlock] });

    renderPanel();

    await waitFor(() => {
      const sel = document.getElementById('flow-custom-palette') as HTMLSelectElement;
      expect([...sel.options].some((o) => o.value === 'ocean')).toBe(true);
    });

    await user.selectOptions(document.getElementById('flow-custom-palette')!, 'ocean');

    await waitFor(() => {
      expect(apiMocks.updateFlowCustomization).toHaveBeenCalledWith(
        expect.objectContaining({ selectedPalette: 'ocean' })
      );
    });
  });

  it('merges unlocked cosmetics from all identities (global customization)', async () => {
    const user = userEvent.setup();
    apiMocks.getFlowCustomization.mockResolvedValue(baseCustomization());
    apiMocks.getIdentities.mockResolvedValue([
      { id: 'id-lead' } as any,
      { id: 'id-second' } as any,
    ]);
    apiMocks.getIdentityUnlocks
      .mockResolvedValueOnce({
        unlocks: [
          {
            id: 'u1',
            identityId: 'id-lead',
            userId: 'user-1',
            unlockKey: 'flow_palette_ocean',
            unlockType: 'flow_palette',
            grantedAt: new Date().toISOString(),
            grantedByStage: null,
            grantedByLevel: 3,
          },
        ],
      })
      .mockResolvedValueOnce({
        unlocks: [
          {
            id: 'u2',
            identityId: 'id-second',
            userId: 'user-1',
            unlockKey: 'flow_palette_aurora',
            unlockType: 'flow_palette',
            grantedAt: new Date().toISOString(),
            grantedByStage: 'FutureSelf',
            grantedByLevel: null,
          },
        ],
      });
    apiMocks.updateFlowCustomization.mockImplementation(async (body: Partial<FlowCustomizationState>) => ({
      ...baseCustomization(),
      ...body,
      updatedAt: new Date().toISOString(),
    }));

    renderPanel();

    await waitFor(() => {
      expect(apiMocks.getIdentityUnlocks).toHaveBeenCalledTimes(2);
    });

    const paletteSelect = document.getElementById('flow-custom-palette') as HTMLSelectElement;
    await user.selectOptions(paletteSelect, 'aurora');

    await waitFor(() => {
      expect(apiMocks.updateFlowCustomization).toHaveBeenCalledWith(
        expect.objectContaining({ selectedPalette: 'aurora' })
      );
    });
  });
});
