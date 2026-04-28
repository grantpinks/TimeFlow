import { describe, expect, it } from 'vitest';
import type { IdentityUnlockItem } from '@timeflow/shared';
import {
  allowedSlugsWithDefaults,
  buildPaletteOptions,
  collectUnlockedCustomizationSlugs,
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
    const { palettes } = collectUnlockedCustomizationSlugs([
      { ...baseUnlock, unlockKey: 'flow_palette_ocean', unlockType: 'flow_palette' },
    ]);
    expect(palettes.has('ocean')).toBe(true);
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
});
