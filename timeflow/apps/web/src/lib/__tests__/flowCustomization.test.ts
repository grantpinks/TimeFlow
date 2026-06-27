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
    const { palettes, hats, eyes, auras, backgrounds } = collectUnlockedCustomizationSlugs([
      { ...baseUnlock, unlockKey: 'flow_palette_ocean', unlockType: 'flow_palette' },
      { ...baseUnlock, unlockKey: 'flow_accessory_crown', unlockType: 'flow_accessory' },
      { ...baseUnlock, unlockKey: 'flow_accessory_bright_eyes', unlockType: 'flow_accessory' },
      { ...baseUnlock, unlockKey: 'flow_accessory_spark', unlockType: 'flow_accessory' },
      { ...baseUnlock, unlockKey: 'flow_accessory_sunrise', unlockType: 'flow_accessory' },
    ]);
    expect(palettes.has('ocean')).toBe(true);
    expect(hats.has('crown')).toBe(true);
    expect(eyes.has('bright_eyes')).toBe(true);
    expect(auras.has('spark')).toBe(true);
    expect(backgrounds.has('sunrise')).toBe(true);
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
        selectedHat: 'visor',
        selectedEyes: 'starry_eyes',
        selectedAura: 'tide_ring',
        selectedBackground: 'aurora_sky',
      })
    ).toEqual({
      selectedPalette: 'sunset',
      selectedEmote: 'sparkle',
      selectedAnimationPack: 'gentle_bounce',
      selectedStageVariant: 'transcendent',
      selectedHat: 'visor',
      selectedEyes: 'starry_eyes',
      selectedAura: 'tide_ring',
      selectedBackground: 'aurora_sky',
    });
  });

  it('maps legacy selectedAccessory into the matching cosmetic slot', () => {
    expect(
      mergeFlowCustomization({
        selectedAccessory: 'spark',
      })
    ).toMatchObject({
      selectedHat: 'none',
      selectedEyes: 'none',
      selectedAura: 'spark',
      selectedBackground: 'none',
    });
  });

  it('sanitizes malformed stored customization values to defaults', () => {
    expect(
      mergeFlowCustomization({
        selectedPalette: '!!!',
        selectedEmote: '   ',
        selectedAnimationPack: '%$#',
        selectedStageVariant: '',
        selectedHat: '!!!',
        selectedEyes: '!!!',
        selectedAura: '!!!',
        selectedBackground: '!!!',
      })
    ).toEqual({
      selectedPalette: 'default',
      selectedEmote: 'default',
      selectedAnimationPack: 'default',
      selectedStageVariant: 'default',
      selectedHat: 'none',
      selectedEyes: 'none',
      selectedAura: 'none',
      selectedBackground: 'none',
    });
  });

  it('builds hat options with locked requirements', () => {
    const { hats } = collectUnlockedCustomizationSlugs([
      { ...baseUnlock, unlockKey: 'flow_accessory_none', unlockType: 'flow_accessory' },
    ]);
    const opts = buildAccessoryOptions('hat', allowedSlugsWithDefaults(hats, 'accessory'), {
      includeLocked: true,
    });
    const crown = opts.find((o) => o.slug === 'crown');

    expect(crown).toMatchObject({
      slug: 'crown',
      locked: true,
      requirement: 'Disciplined stage',
    });
  });

  it('offers a deeper reward catalog across cosmetic slots', () => {
    const hatValues = buildAccessoryOptions('hat', allowedSlugsWithDefaults(new Set(), 'accessory'), {
      includeLocked: true,
    }).map((o) => o.slug);
    const eyeValues = buildAccessoryOptions('eyes', allowedSlugsWithDefaults(new Set(), 'accessory'), {
      includeLocked: true,
    }).map((o) => o.slug);
    const auraValues = buildAccessoryOptions('aura', allowedSlugsWithDefaults(new Set(), 'accessory'), {
      includeLocked: true,
    }).map((o) => o.slug);
    const backgroundValues = buildAccessoryOptions(
      'background',
      allowedSlugsWithDefaults(new Set(), 'accessory'),
      {
        includeLocked: true,
      }
    ).map((o) => o.slug);

    expect(hatValues).toEqual(
      expect.arrayContaining([
        'cap',
        'crown',
        'laurel',
        'star_visor',
        'moon_hood',
        'trophy_circlet',
      ])
    );
    expect(eyeValues).toEqual(
      expect.arrayContaining([
        'bright_eyes',
        'focus_eyes',
        'future_gaze',
        'kind_eyes',
        'starry_eyes',
        'laser_focus',
      ])
    );
    expect(auraValues).toEqual(
      expect.arrayContaining([
        'spark',
        'wings',
        'halo',
        'tide_ring',
        'ember_orbit',
        'constellation',
      ])
    );
    expect(backgroundValues).toEqual(
      expect.arrayContaining([
        'sunrise',
        'forest_glow',
        'night_garden',
        'aurora_sky',
      ])
    );
    expect(hatValues.length + eyeValues.length + auraValues.length + backgroundValues.length).toBeGreaterThanOrEqual(26);
  });
});
