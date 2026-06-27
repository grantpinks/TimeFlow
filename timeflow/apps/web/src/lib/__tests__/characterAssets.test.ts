import { describe, expect, it } from 'vitest';
import {
  CHARACTER_LAYER_ORDER,
  resolveAccessoryAsset,
  resolveFlowCosmeticAssets,
} from '../characterAssets';

describe('characterAssets', () => {
  it('maps known accessories to safe public asset paths', () => {
    expect(resolveAccessoryAsset('crown')).toMatchObject({
      slug: 'crown',
      layer: 'hat',
      src: '/characters/accessories/hats/crown.svg',
      alt: 'Crown accessory',
    });
    expect(resolveAccessoryAsset('sunrise')).toMatchObject({
      slug: 'sunrise',
      layer: 'background',
      src: '/characters/accessories/backgrounds/sunrise.svg',
    });
    expect(resolveAccessoryAsset('bright_eyes')).toMatchObject({
      slug: 'bright_eyes',
      layer: 'eyes',
      src: '/characters/accessories/eyes/bright-eyes.svg',
    });
    expect(resolveAccessoryAsset('aurora_sky')).toMatchObject({
      slug: 'aurora_sky',
      layer: 'background',
      src: '/characters/accessories/backgrounds/aurora-sky.svg',
    });
  });

  it('falls back for none or unknown accessories', () => {
    expect(resolveAccessoryAsset('none')).toBeNull();
    expect(resolveAccessoryAsset('../crown')).toBeNull();
  });

  it('keeps deterministic layer ordering', () => {
    expect(CHARACTER_LAYER_ORDER).toEqual([
      'background',
      'base',
      'eyes',
      'hat',
      'aura',
    ]);
  });

  it('resolves composed cosmetic slots in render order', () => {
    const assets = resolveFlowCosmeticAssets({
      selectedHat: 'star_visor',
      selectedEyes: 'starry_eyes',
      selectedAura: 'constellation',
      selectedBackground: 'aurora_sky',
    });

    expect(assets.map((asset) => asset.layer)).toEqual([
      'background',
      'aura',
      'hat',
      'eyes',
    ]);
    expect(assets.map((asset) => asset.slug)).toEqual([
      'aurora_sky',
      'constellation',
      'star_visor',
      'starry_eyes',
    ]);
  });
});
