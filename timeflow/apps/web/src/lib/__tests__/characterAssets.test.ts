import { describe, expect, it } from 'vitest';
import {
  CHARACTER_LAYER_ORDER,
  resolveAccessoryAsset,
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
});
