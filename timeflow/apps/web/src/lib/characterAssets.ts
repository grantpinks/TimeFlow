import { slugifyCustomizationValue } from './flowCustomization';
import type { FlowCustomizationFields } from './flowCustomization';

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
  star_visor: {
    slug: 'star_visor',
    layer: 'hat',
    src: '/characters/accessories/hats/star-visor.svg',
    alt: 'Star visor accessory',
  },
  moon_hood: {
    slug: 'moon_hood',
    layer: 'hat',
    src: '/characters/accessories/hats/moon-hood.svg',
    alt: 'Moon hood accessory',
  },
  trophy_circlet: {
    slug: 'trophy_circlet',
    layer: 'hat',
    src: '/characters/accessories/hats/trophy-circlet.svg',
    alt: 'Trophy circlet accessory',
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
  kind_eyes: {
    slug: 'kind_eyes',
    layer: 'eyes',
    src: '/characters/accessories/eyes/kind-eyes.svg',
    alt: 'Kind eyes accessory',
  },
  starry_eyes: {
    slug: 'starry_eyes',
    layer: 'eyes',
    src: '/characters/accessories/eyes/starry-eyes.svg',
    alt: 'Starry eyes accessory',
  },
  laser_focus: {
    slug: 'laser_focus',
    layer: 'eyes',
    src: '/characters/accessories/eyes/laser-focus.svg',
    alt: 'Laser focus accessory',
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
  tide_ring: {
    slug: 'tide_ring',
    layer: 'aura',
    src: '/characters/accessories/auras/tide-ring.svg',
    alt: 'Tide ring accessory',
  },
  ember_orbit: {
    slug: 'ember_orbit',
    layer: 'aura',
    src: '/characters/accessories/auras/ember-orbit.svg',
    alt: 'Ember orbit accessory',
  },
  constellation: {
    slug: 'constellation',
    layer: 'aura',
    src: '/characters/accessories/auras/constellation.svg',
    alt: 'Constellation aura accessory',
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
  night_garden: {
    slug: 'night_garden',
    layer: 'background',
    src: '/characters/accessories/backgrounds/night-garden.svg',
    alt: 'Night garden background',
  },
  aurora_sky: {
    slug: 'aurora_sky',
    layer: 'background',
    src: '/characters/accessories/backgrounds/aurora-sky.svg',
    alt: 'Aurora sky background',
  },
};

export function resolveAccessoryAsset(accessory: string): CharacterLayerAsset | null {
  const slug = slugifyCustomizationValue(accessory);
  if (accessory.trim() !== slug) return null;
  if (!slug || slug === 'none') return null;
  return ACCESSORY_ASSETS[slug] ?? null;
}

export type FlowCosmeticSelection = Pick<
  FlowCustomizationFields,
  'selectedHat' | 'selectedEyes' | 'selectedAura' | 'selectedBackground'
>;

export function resolveFlowCosmeticAssets(selection: FlowCosmeticSelection): CharacterLayerAsset[] {
  return [
    resolveAccessoryAsset(selection.selectedBackground),
    resolveAccessoryAsset(selection.selectedAura),
    resolveAccessoryAsset(selection.selectedHat),
    resolveAccessoryAsset(selection.selectedEyes),
  ].filter((asset): asset is CharacterLayerAsset => asset !== null);
}
