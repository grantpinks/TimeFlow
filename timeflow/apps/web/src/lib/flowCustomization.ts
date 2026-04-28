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

function labelFor(slug: string, labels: Record<string, string>): string {
  return labels[slug] ?? slug.replace(/_/g, ' ');
}

export function buildPaletteOptions(allowedSlugs: Set<string>): { slug: string; label: string }[] {
  return FLOW_PALETTE_SLUGS.filter((s) => allowedSlugs.has(s)).map((slug) => ({
    slug,
    label: FLOW_PALETTE_LABELS[slug] ?? labelFor(slug, FLOW_PALETTE_LABELS),
  }));
}

const EMOTE_ORDER = ['default', 'wave', 'celebrate', 'dance', 'fire', 'ascend'] as const;
const ANIM_ORDER = ['default', 'basic', 'energetic', 'zen'] as const;
const STAGE_ORDER = ['default', 'seed', 'builder', 'disciplined', 'embodied', 'future_self'] as const;

export function buildEmoteOptions(allowedSlugs: Set<string>): { slug: string; label: string }[] {
  const ordered = EMOTE_ORDER.filter((s) => allowedSlugs.has(s));
  const rest = [...allowedSlugs].filter((s) => !EMOTE_ORDER.includes(s as (typeof EMOTE_ORDER)[number])).sort();
  return [...ordered, ...rest].map((slug) => ({
    slug,
    label: FLOW_EMOTE_LABELS[slug] ?? labelFor(slug, FLOW_EMOTE_LABELS),
  }));
}

export function buildAnimationPackOptions(allowedSlugs: Set<string>): { slug: string; label: string }[] {
  const ordered = ANIM_ORDER.filter((s) => allowedSlugs.has(s));
  const rest = [...allowedSlugs].filter((s) => !ANIM_ORDER.includes(s as (typeof ANIM_ORDER)[number])).sort();
  return [...ordered, ...rest].map((slug) => ({
    slug,
    label: FLOW_ANIMATION_PACK_LABELS[slug] ?? labelFor(slug, FLOW_ANIMATION_PACK_LABELS),
  }));
}

export function buildStageVariantOptions(allowedSlugs: Set<string>): { slug: string; label: string }[] {
  const ordered = STAGE_ORDER.filter((s) => allowedSlugs.has(s));
  const rest = [...allowedSlugs].filter((s) => !STAGE_ORDER.includes(s as (typeof STAGE_ORDER)[number])).sort();
  return [...ordered, ...rest].map((slug) => ({
    slug,
    label: FLOW_STAGE_VARIANT_LABELS[slug] ?? labelFor(slug, FLOW_STAGE_VARIANT_LABELS),
  }));
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
