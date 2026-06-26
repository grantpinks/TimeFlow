import type { FlowCustomizationState, IdentityUnlockItem } from '@timeflow/shared';

/** Client-side shape for Flow companion preferences (mirrors persisted fields). */
export type FlowCustomizationFields = Pick<
  FlowCustomizationState,
  'selectedPalette' | 'selectedEmote' | 'selectedAnimationPack' | 'selectedStageVariant'
>;

export const DEFAULT_FLOW_CUSTOMIZATION: FlowCustomizationFields = {
  selectedPalette: 'default',
  selectedEmote: 'default',
  selectedAnimationPack: 'default',
  selectedStageVariant: 'default',
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
    if (!slug || !ALLOWED_CUSTOMIZATION_SLUGS[key].has(slug)) {
      return DEFAULT_FLOW_CUSTOMIZATION[key];
    }
    return slug;
  };

  return {
    selectedPalette: pick('selectedPalette'),
    selectedEmote: pick('selectedEmote'),
    selectedAnimationPack: pick('selectedAnimationPack'),
    selectedStageVariant: pick('selectedStageVariant'),
  };
}

export function normalizePaletteSlug(slug: string): FlowPaletteSlug {
  const s = slugifyCustomizationValue(slug);
  return (FLOW_PALETTE_SLUGS as readonly string[]).includes(s) ? (s as FlowPaletteSlug) : 'default';
}

const MASCOT_PACK_SLUGS = new Set(['default', 'basic', 'energetic', 'zen']);
const EMOTE_SLUGS = new Set(['default', 'wave', 'celebrate', 'dance', 'fire', 'ascend']);
const STAGE_VARIANT_SLUGS = new Set([
  'default',
  'seed',
  'builder',
  'disciplined',
  'embodied',
  'future_self',
]);
const ALLOWED_CUSTOMIZATION_SLUGS: Record<keyof FlowCustomizationFields, ReadonlySet<string>> = {
  selectedPalette: new Set(FLOW_PALETTE_SLUGS),
  selectedEmote: EMOTE_SLUGS,
  selectedAnimationPack: MASCOT_PACK_SLUGS,
  selectedStageVariant: STAGE_VARIANT_SLUGS,
};

/** Whitelist pack slug for CSS module classes on Flow mascot wrapper. */
export function normalizeMascotPackSlug(pack: string): 'default' | 'basic' | 'energetic' | 'zen' {
  const s = slugifyCustomizationValue(pack);
  return (MASCOT_PACK_SLUGS.has(s) ? s : 'default') as 'default' | 'basic' | 'energetic' | 'zen';
}

const PREFIX_PALETTE = 'flow_palette_';
const PREFIX_EMOTE = 'flow_emote_';
const PREFIX_ANIM = 'flow_anim_';
const PREFIX_STAGE = 'flow_form_';

function suffixAfterPrefix(key: string, prefix: string): string | null {
  if (!key.startsWith(prefix)) return null;
  return slugifyCustomizationValue(key.slice(prefix.length));
}

export function collectUnlockedCustomizationSlugs(unlocks: IdentityUnlockItem[]): {
  palettes: Set<string>;
  emotes: Set<string>;
  animationPacks: Set<string>;
  stageVariants: Set<string>;
} {
  const palettes = new Set<string>();
  const emotes = new Set<string>();
  const animationPacks = new Set<string>();
  const stageVariants = new Set<string>();

  for (const u of unlocks) {
    const p = suffixAfterPrefix(u.unlockKey, PREFIX_PALETTE);
    if (p) palettes.add(p);
    const e = suffixAfterPrefix(u.unlockKey, PREFIX_EMOTE);
    if (e) emotes.add(e);
    const a = suffixAfterPrefix(u.unlockKey, PREFIX_ANIM);
    if (a) animationPacks.add(a);
    const s = suffixAfterPrefix(u.unlockKey, PREFIX_STAGE);
    if (s) stageVariants.add(s);
  }

  return { palettes, emotes, animationPacks, stageVariants };
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
  const slugs = opts?.includeLocked
    ? [...FLOW_PALETTE_SLUGS]
    : FLOW_PALETTE_SLUGS.filter((s) => allowedSlugs.has(s));
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

/** Merge unlocked slugs with defaults that are always available in the picker. */
export function allowedSlugsWithDefaults(
  unlocked: Set<string>,
  field: 'palette' | 'emote' | 'animation' | 'stage'
): Set<string> {
  const next = new Set(unlocked);
  next.add('default');
  if (field === 'animation') {
    // Catalog uses `basic` as starter pack; treat as default-adjacent for UX.
    if (unlocked.has('basic')) next.add('basic');
  }
  return next;
}
