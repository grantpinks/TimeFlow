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
