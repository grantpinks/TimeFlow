import { describe, expect, it } from 'vitest';
import type { IdentityUnlockItem } from '@timeflow/shared';
import {
  allowedSlugsWithDefaults,
  buildAccessoryOptions,
  buildPaletteOptions,
  collectUnlockedCustomizationSlugs,
  mergeFlowCustomization,
} from '../flowCustomization';

const baseUnlock: Omit<IdentityUnlockItem, 'unlockKey' | 'unlockType'> = {
  id: '1',
  identityId: 'i1',
  userId: 'u1',
  grantedAt: new Date().toISOString(),
  grantedByStage: null,
  grantedByLevel: 3,
};

describe('flowCustomization helpers', () => {
  it('maps flow_palette_ocean unlock to palette slug ocean', () => {
    const { palettes, accessories } = collectUnlockedCustomizationSlugs([
      { ...baseUnlock, unlockKey: 'flow_palette_ocean', unlockType: 'flow_palette' },
      { ...baseUnlock, unlockKey: 'flow_accessory_crown', unlockType: 'flow_accessory' },
    ]);
    expect(palettes.has('ocean')).toBe(true);
    expect(accessories.has('crown')).toBe(true);
  });

  it('buildPaletteOptions respects allowed slugs', () => {
    const { palettes } = collectUnlockedCustomizationSlugs([
      { ...baseUnlock, unlockKey: 'flow_palette_ocean', unlockType: 'flow_palette' },
    ]);
    const allowed = allowedSlugsWithDefaults(palettes, 'palette');
    const opts = buildPaletteOptions(allowed);
    const values = opts.map((o) => o.slug);
    expect(values).toContain('default');
    expect(values).toContain('ocean');
  });

  it('includes unknown unlocked palette slugs from the backend catalog', () => {
    const { palettes } = collectUnlockedCustomizationSlugs([
      { ...baseUnlock, unlockKey: 'flow_palette_sunset', unlockType: 'flow_palette' },
    ]);
    const allowed = allowedSlugsWithDefaults(palettes, 'palette');
    const opts = buildPaletteOptions(allowed, { includeLocked: true });
    const sunset = opts.find((o) => o.slug === 'sunset');

    expect(sunset).toMatchObject({
      slug: 'sunset',
      label: 'sunset',
      locked: false,
    });
  });

  it('preserves well-formed unknown stored customization values', () => {
    expect(
      mergeFlowCustomization({
        selectedPalette: 'sunset',
        selectedEmote: 'sparkle',
        selectedAnimationPack: 'gentle_bounce',
        selectedStageVariant: 'transcendent',
        selectedAccessory: 'visor',
      })
    ).toEqual({
      selectedPalette: 'sunset',
      selectedEmote: 'sparkle',
      selectedAnimationPack: 'gentle_bounce',
      selectedStageVariant: 'transcendent',
      selectedAccessory: 'visor',
    });
  });

  it('sanitizes malformed stored customization values to defaults', () => {
    expect(
      mergeFlowCustomization({
        selectedPalette: '!!!',
        selectedEmote: '   ',
        selectedAnimationPack: '%$#',
        selectedStageVariant: '',
        selectedAccessory: '!!!',
      })
    ).toEqual({
      selectedPalette: 'default',
      selectedEmote: 'default',
      selectedAnimationPack: 'default',
      selectedStageVariant: 'default',
      selectedAccessory: 'none',
    });
  });

  it('builds accessory options with locked requirements', () => {
    const { accessories } = collectUnlockedCustomizationSlugs([
      { ...baseUnlock, unlockKey: 'flow_accessory_none', unlockType: 'flow_accessory' },
    ]);
    const opts = buildAccessoryOptions(allowedSlugsWithDefaults(accessories, 'accessory'), {
      includeLocked: true,
    });
    const crown = opts.find((o) => o.slug === 'crown');

    expect(crown).toMatchObject({
      slug: 'crown',
      locked: true,
      requirement: 'Disciplined stage',
    });
  });
});
