import { slugifyCustomizationValue } from './flowCustomization';

export type CharacterLayer = 'background' | 'base' | 'eyes' | 'hat' | 'aura';

export const CHARACTER_LAYER_ORDER: CharacterLayer[] = [
  'background',
  'base',
  'eyes',
  'hat',
  'aura',
];

export interface CharacterLayerAsset {
  slug: string;
  layer: CharacterLayer;
  src: string;
  alt: string;
}

const ACCESSORY_ASSETS: Record<string, CharacterLayerAsset> = {
  crown: {
    slug: 'crown',
    layer: 'hat',
    src: '/characters/accessories/hats/crown.svg',
    alt: 'Crown accessory',
  },
  wings: {
    slug: 'wings',
    layer: 'aura',
    src: '/characters/accessories/auras/wings.svg',
    alt: 'Wings accessory',
  },
  halo: {
    slug: 'halo',
    layer: 'aura',
    src: '/characters/accessories/auras/halo.svg',
    alt: 'Halo accessory',
  },
};

export function resolveAccessoryAsset(accessory: string): CharacterLayerAsset | null {
  const slug = slugifyCustomizationValue(accessory);
  if (accessory.trim() !== slug) return null;
  if (!slug || slug === 'none') return null;
  return ACCESSORY_ASSETS[slug] ?? null;
}
