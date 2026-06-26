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
  cap: {
    slug: 'cap',
    layer: 'hat',
    src: '/characters/accessories/hats/cap.svg',
    alt: 'Flow cap accessory',
  },
  crown: {
    slug: 'crown',
    layer: 'hat',
    src: '/characters/accessories/hats/crown.svg',
    alt: 'Crown accessory',
  },
  laurel: {
    slug: 'laurel',
    layer: 'hat',
    src: '/characters/accessories/hats/laurel.svg',
    alt: 'Laurel wreath accessory',
  },
  bright_eyes: {
    slug: 'bright_eyes',
    layer: 'eyes',
    src: '/characters/accessories/eyes/bright-eyes.svg',
    alt: 'Bright eyes accessory',
  },
  focus_eyes: {
    slug: 'focus_eyes',
    layer: 'eyes',
    src: '/characters/accessories/eyes/focus-eyes.svg',
    alt: 'Focus eyes accessory',
  },
  future_gaze: {
    slug: 'future_gaze',
    layer: 'eyes',
    src: '/characters/accessories/eyes/future-gaze.svg',
    alt: 'Future gaze accessory',
  },
  spark: {
    slug: 'spark',
    layer: 'aura',
    src: '/characters/accessories/auras/spark.svg',
    alt: 'Spark aura accessory',
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
  sunrise: {
    slug: 'sunrise',
    layer: 'background',
    src: '/characters/accessories/backgrounds/sunrise.svg',
    alt: 'Sunrise field background',
  },
  forest_glow: {
    slug: 'forest_glow',
    layer: 'background',
    src: '/characters/accessories/backgrounds/forest-glow.svg',
    alt: 'Forest glow background',
  },
};

export function resolveAccessoryAsset(accessory: string): CharacterLayerAsset | null {
  const slug = slugifyCustomizationValue(accessory);
  if (accessory.trim() !== slug) return null;
  if (!slug || slug === 'none') return null;
  return ACCESSORY_ASSETS[slug] ?? null;
}
