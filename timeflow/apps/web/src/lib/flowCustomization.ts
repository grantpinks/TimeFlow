import type { FlowCustomizationState, IdentityUnlockItem } from '@timeflow/shared';

/** Client-side shape for Flow companion preferences (mirrors persisted fields). */
export type FlowCustomizationFields = Pick<
  FlowCustomizationState,
  | 'selectedPalette'
  | 'selectedEmote'
  | 'selectedAnimationPack'
  | 'selectedStageVariant'
  | 'selectedHat'
  | 'selectedEyes'
  | 'selectedAura'
  | 'selectedBackground'
>;

export const DEFAULT_FLOW_CUSTOMIZATION: FlowCustomizationFields = {
  selectedPalette: 'default',
  selectedEmote: 'default',
  selectedAnimationPack: 'default',
  selectedStageVariant: 'default',
  selectedHat: 'none',
  selectedEyes: 'none',
  selectedAura: 'none',
  selectedBackground: 'none',
};

/** Allowed mascot palette slugs (matches unlock catalog suffixes + default). */
export const FLOW_PALETTE_SLUGS = [
  'default',
  'ocean',
  'ember',
  'forest',
  'storm',
  'gold',
  'aurora',
] as const;

export type FlowPaletteSlug = (typeof FLOW_PALETTE_SLUGS)[number];

export type FlowCustomizationOption = {
  slug: string;
  label: string;
  locked?: boolean;
  requirement?: string;
};

export type FlowCosmeticSlot = 'hat' | 'eyes' | 'aura' | 'background';

export function slugifyCustomizationValue(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '_')
    .replace(/[^a-z0-9_]/g, '');
}

export function mergeFlowCustomization(
  partial: Partial<FlowCustomizationState> | null | undefined
): FlowCustomizationFields {
  const pick = (key: keyof FlowCustomizationFields): string => {
    const raw = partial?.[key];
    if (raw == null || String(raw).trim() === '') {
      return DEFAULT_FLOW_CUSTOMIZATION[key];
    }
    const slug = slugifyCustomizationValue(String(raw));
    return slug || DEFAULT_FLOW_CUSTOMIZATION[key];
  };
  const legacyAccessory = slugifyCustomizationValue(String(partial?.selectedAccessory ?? ''));
  const legacySlot = accessorySlotForSlug(legacyAccessory);
  const pickSlot = (key: keyof FlowCustomizationFields, slot: FlowCosmeticSlot): string => {
    const value = pick(key);
    if (value !== DEFAULT_FLOW_CUSTOMIZATION[key]) return value;
    return legacySlot === slot ? legacyAccessory : DEFAULT_FLOW_CUSTOMIZATION[key];
  };

  return {
    selectedPalette: pick('selectedPalette'),
    selectedEmote: pick('selectedEmote'),
    selectedAnimationPack: pick('selectedAnimationPack'),
    selectedStageVariant: pick('selectedStageVariant'),
    selectedHat: pickSlot('selectedHat', 'hat'),
    selectedEyes: pickSlot('selectedEyes', 'eyes'),
    selectedAura: pickSlot('selectedAura', 'aura'),
    selectedBackground: pickSlot('selectedBackground', 'background'),
  };
}

export function normalizePaletteSlug(slug: string): FlowPaletteSlug {
  const s = slugifyCustomizationValue(slug);
  return (FLOW_PALETTE_SLUGS as readonly string[]).includes(s) ? (s as FlowPaletteSlug) : 'default';
}

const MASCOT_PACK_SLUGS = new Set(['default', 'basic', 'energetic', 'zen']);
/** Whitelist pack slug for CSS module classes on Flow mascot wrapper. */
export function normalizeMascotPackSlug(pack: string): 'default' | 'basic' | 'energetic' | 'zen' {
  const s = slugifyCustomizationValue(pack);
  return (MASCOT_PACK_SLUGS.has(s) ? s : 'default') as 'default' | 'basic' | 'energetic' | 'zen';
}

const PREFIX_PALETTE = 'flow_palette_';
const PREFIX_EMOTE = 'flow_emote_';
const PREFIX_ANIM = 'flow_anim_';
const PREFIX_STAGE = 'flow_form_';
const PREFIX_ACCESSORY = 'flow_accessory_';

function suffixAfterPrefix(key: string, prefix: string): string | null {
  if (!key.startsWith(prefix)) return null;
  return slugifyCustomizationValue(key.slice(prefix.length));
}

export function collectUnlockedCustomizationSlugs(unlocks: IdentityUnlockItem[]): {
  palettes: Set<string>;
  emotes: Set<string>;
  animationPacks: Set<string>;
  stageVariants: Set<string>;
  hats: Set<string>;
  eyes: Set<string>;
  auras: Set<string>;
  backgrounds: Set<string>;
} {
  const palettes = new Set<string>();
  const emotes = new Set<string>();
  const animationPacks = new Set<string>();
  const stageVariants = new Set<string>();
  const hats = new Set<string>();
  const eyes = new Set<string>();
  const auras = new Set<string>();
  const backgrounds = new Set<string>();

  for (const u of unlocks) {
    const p = suffixAfterPrefix(u.unlockKey, PREFIX_PALETTE);
    if (p) palettes.add(p);
    const e = suffixAfterPrefix(u.unlockKey, PREFIX_EMOTE);
    if (e) emotes.add(e);
    const a = suffixAfterPrefix(u.unlockKey, PREFIX_ANIM);
    if (a) animationPacks.add(a);
    const s = suffixAfterPrefix(u.unlockKey, PREFIX_STAGE);
    if (s) stageVariants.add(s);
    const accessory = suffixAfterPrefix(u.unlockKey, PREFIX_ACCESSORY);
    const slot = accessorySlotForSlug(accessory ?? '');
    if (slot === 'hat') hats.add(accessory!);
    if (slot === 'eyes') eyes.add(accessory!);
    if (slot === 'aura') auras.add(accessory!);
    if (slot === 'background') backgrounds.add(accessory!);
  }

  return { palettes, emotes, animationPacks, stageVariants, hats, eyes, auras, backgrounds };
}

export const FLOW_PALETTE_LABELS: Record<string, string> = {
  default: 'Default',
  ocean: 'Ocean',
  ember: 'Ember',
  forest: 'Forest',
  storm: 'Storm',
  gold: 'Gold',
  aurora: 'Aurora',
};

export const FLOW_EMOTE_LABELS: Record<string, string> = {
  default: 'Default',
  wave: 'Wave',
  celebrate: 'Celebrate',
  dance: 'Dance',
  fire: 'On fire',
  ascend: 'Ascend',
};

export const FLOW_ANIMATION_PACK_LABELS: Record<string, string> = {
  default: 'Default',
  basic: 'Basic',
  energetic: 'Energetic',
  zen: 'Zen',
};

export const FLOW_STAGE_VARIANT_LABELS: Record<string, string> = {
  default: 'Default',
  seed: 'Seedling',
  builder: 'Builder',
  disciplined: 'Disciplined',
  embodied: 'Embodied',
  future_self: 'Future self',
};

export const FLOW_ACCESSORY_LABELS: Record<string, string> = {
  none: 'None',
  cap: 'Flow cap',
  crown: 'Crown',
  laurel: 'Laurel wreath',
  star_visor: 'Star visor',
  moon_hood: 'Moon hood',
  trophy_circlet: 'Trophy circlet',
  bright_eyes: 'Bright eyes',
  focus_eyes: 'Focus eyes',
  future_gaze: 'Future gaze',
  kind_eyes: 'Kind eyes',
  starry_eyes: 'Starry eyes',
  laser_focus: 'Laser focus',
  spark: 'Spark aura',
  wings: 'Wings',
  halo: 'Halo',
  tide_ring: 'Tide ring',
  ember_orbit: 'Ember orbit',
  constellation: 'Constellation aura',
  sunrise: 'Sunrise field',
  forest_glow: 'Forest glow',
  night_garden: 'Night garden',
  aurora_sky: 'Aurora sky',
};

const FLOW_PALETTE_REQUIREMENTS: Record<string, string> = {
  default: 'Available by default',
  ocean: 'Level 3',
  ember: 'Level 6',
  forest: 'Builder stage',
  storm: 'Disciplined stage',
  gold: 'Embodied stage',
  aurora: 'Future self stage',
};

const FLOW_EMOTE_REQUIREMENTS: Record<string, string> = {
  default: 'Available by default',
  wave: 'Level 1',
  celebrate: 'Level 5',
  dance: 'Builder stage',
  fire: 'Disciplined stage',
  ascend: 'Future self stage',
};

const FLOW_ANIMATION_REQUIREMENTS: Record<string, string> = {
  default: 'Available by default',
  basic: 'Level 1',
  energetic: 'Level 8',
  zen: 'Disciplined stage',
};

const FLOW_STAGE_REQUIREMENTS: Record<string, string> = {
  default: 'Available by default',
  seed: 'Seed stage',
  builder: 'Builder stage',
  disciplined: 'Disciplined stage',
  embodied: 'Embodied stage',
  future_self: 'Future self stage',
};

const FLOW_ACCESSORY_REQUIREMENTS: Record<string, string> = {
  none: 'Available by default',
  cap: 'Level 2',
  crown: 'Disciplined stage',
  laurel: 'Embodied stage',
  star_visor: 'Level 9',
  moon_hood: 'Disciplined stage',
  trophy_circlet: 'Embodied stage',
  bright_eyes: 'Level 4',
  focus_eyes: 'Level 7',
  future_gaze: 'Future self stage',
  kind_eyes: 'Level 5',
  starry_eyes: 'Builder stage',
  laser_focus: 'Future self stage',
  spark: 'Builder stage',
  wings: 'Embodied stage',
  halo: 'Future self stage',
  tide_ring: 'Builder stage',
  ember_orbit: 'Disciplined stage',
  constellation: 'Future self stage',
  sunrise: 'Level 2',
  forest_glow: 'Builder stage',
  night_garden: 'Embodied stage',
  aurora_sky: 'Future self stage',
};

const HAT_ORDER = ['none', 'cap', 'crown', 'laurel', 'star_visor', 'moon_hood', 'trophy_circlet'] as const;
const EYES_ORDER = [
  'none',
  'bright_eyes',
  'focus_eyes',
  'future_gaze',
  'kind_eyes',
  'starry_eyes',
  'laser_focus',
] as const;
const AURA_ORDER = [
  'none',
  'spark',
  'wings',
  'halo',
  'tide_ring',
  'ember_orbit',
  'constellation',
] as const;
const BACKGROUND_ORDER = ['none', 'sunrise', 'forest_glow', 'night_garden', 'aurora_sky'] as const;

const ACCESSORY_SLOT_ORDER: Record<FlowCosmeticSlot, readonly string[]> = {
  hat: HAT_ORDER,
  eyes: EYES_ORDER,
  aura: AURA_ORDER,
  background: BACKGROUND_ORDER,
};

export function accessorySlotForSlug(slug: string): FlowCosmeticSlot | null {
  const s = slugifyCustomizationValue(slug);
  if (!s || s === 'none') return null;
  for (const [slot, order] of Object.entries(ACCESSORY_SLOT_ORDER) as Array<
    [FlowCosmeticSlot, readonly string[]]
  >) {
    if (order.includes(s)) return slot;
  }
  if (/(eyes?|gaze|focus)/.test(s)) return 'eyes';
  if (/(aura|orbit|ring|wings?|halo|spark|constellation)/.test(s)) return 'aura';
  if (/(background|field|glow|garden|sky)/.test(s)) return 'background';
  return 'hat';
}

function labelFor(slug: string, labels: Record<string, string>): string {
  return labels[slug] ?? slug.replace(/_/g, ' ');
}

function optionFor(
  slug: string,
  allowedSlugs: Set<string>,
  labels: Record<string, string>,
  requirements: Record<string, string>
): FlowCustomizationOption {
  const locked = !allowedSlugs.has(slug);
  const requirement = requirements[slug];
  return {
    slug,
    label: locked && requirement
      ? `${labelFor(slug, labels)} (Locked - ${requirement})`
      : labelFor(slug, labels),
    locked,
    requirement,
  };
}

export function buildPaletteOptions(
  allowedSlugs: Set<string>,
  opts?: { includeLocked?: boolean }
): FlowCustomizationOption[] {
  const ordered = FLOW_PALETTE_SLUGS.filter((s) => allowedSlugs.has(s));
  const rest = [...allowedSlugs]
    .filter((s) => !FLOW_PALETTE_SLUGS.includes(s as (typeof FLOW_PALETTE_SLUGS)[number]))
    .sort();
  const slugs = opts?.includeLocked
    ? [...FLOW_PALETTE_SLUGS, ...rest]
    : [...ordered, ...rest];
  return slugs.map((slug) =>
    optionFor(slug, allowedSlugs, FLOW_PALETTE_LABELS, FLOW_PALETTE_REQUIREMENTS)
  );
}

const EMOTE_ORDER = ['default', 'wave', 'celebrate', 'dance', 'fire', 'ascend'] as const;
const ANIM_ORDER = ['default', 'basic', 'energetic', 'zen'] as const;
const STAGE_ORDER = ['default', 'seed', 'builder', 'disciplined', 'embodied', 'future_self'] as const;

export function buildEmoteOptions(
  allowedSlugs: Set<string>,
  opts?: { includeLocked?: boolean }
): FlowCustomizationOption[] {
  const ordered = EMOTE_ORDER.filter((s) => allowedSlugs.has(s));
  const rest = [...allowedSlugs].filter((s) => !EMOTE_ORDER.includes(s as (typeof EMOTE_ORDER)[number])).sort();
  const slugs = opts?.includeLocked ? [...EMOTE_ORDER, ...rest] : [...ordered, ...rest];
  return slugs.map((slug) =>
    optionFor(slug, allowedSlugs, FLOW_EMOTE_LABELS, FLOW_EMOTE_REQUIREMENTS)
  );
}

export function buildAnimationPackOptions(
  allowedSlugs: Set<string>,
  opts?: { includeLocked?: boolean }
): FlowCustomizationOption[] {
  const ordered = ANIM_ORDER.filter((s) => allowedSlugs.has(s));
  const rest = [...allowedSlugs].filter((s) => !ANIM_ORDER.includes(s as (typeof ANIM_ORDER)[number])).sort();
  const slugs = opts?.includeLocked ? [...ANIM_ORDER, ...rest] : [...ordered, ...rest];
  return slugs.map((slug) =>
    optionFor(slug, allowedSlugs, FLOW_ANIMATION_PACK_LABELS, FLOW_ANIMATION_REQUIREMENTS)
  );
}

export function buildStageVariantOptions(
  allowedSlugs: Set<string>,
  opts?: { includeLocked?: boolean }
): FlowCustomizationOption[] {
  const ordered = STAGE_ORDER.filter((s) => allowedSlugs.has(s));
  const rest = [...allowedSlugs].filter((s) => !STAGE_ORDER.includes(s as (typeof STAGE_ORDER)[number])).sort();
  const slugs = opts?.includeLocked ? [...STAGE_ORDER, ...rest] : [...ordered, ...rest];
  return slugs.map((slug) =>
    optionFor(slug, allowedSlugs, FLOW_STAGE_VARIANT_LABELS, FLOW_STAGE_REQUIREMENTS)
  );
}

export function buildAccessoryOptions(
  slot: FlowCosmeticSlot,
  allowedSlugs: Set<string>,
  opts?: { includeLocked?: boolean }
): FlowCustomizationOption[] {
  const order = ACCESSORY_SLOT_ORDER[slot];
  const ordered = order.filter((s) => allowedSlugs.has(s));
  const rest = [...allowedSlugs]
    .filter((s) => !order.includes(s))
    .sort();
  const slugs = opts?.includeLocked ? [...order, ...rest] : [...ordered, ...rest];
  return slugs.map((slug) =>
    optionFor(slug, allowedSlugs, FLOW_ACCESSORY_LABELS, FLOW_ACCESSORY_REQUIREMENTS)
  );
}

/** Merge unlocked slugs with defaults that are always available in the picker. */
export function allowedSlugsWithDefaults(
  unlocked: Set<string>,
  field: 'palette' | 'emote' | 'animation' | 'stage' | 'accessory'
): Set<string> {
  const next = new Set(unlocked);
  next.add(field === 'accessory' ? 'none' : 'default');
  if (field === 'animation') {
    // Catalog uses `basic` as starter pack; treat as default-adjacent for UX.
    if (unlocked.has('basic')) next.add('basic');
  }
  return next;
}
