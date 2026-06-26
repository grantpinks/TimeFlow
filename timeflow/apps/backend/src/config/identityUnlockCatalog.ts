/**
 * Identity Unlock Catalog
 *
 * Single source of truth for every unlockable item in the system.
 * Items are granted either by reaching a specific level or by entering a stage —
 * never both, never neither.
 */

import type { IdentityStage, UnlockType } from '@timeflow/shared';

export interface CatalogEntry {
  unlockKey: string;
  unlockType: UnlockType;
  /** Granted on entering this stage (null if level-based). */
  grantedByStage: IdentityStage | null;
  /** Granted on reaching this level (null if stage-based). */
  grantedByLevel: number | null;
  displayName: string;
  description: string;
}

export const UNLOCK_CATALOG: CatalogEntry[] = [
  // ── Flow Palettes ──────────────────────────────────────────────────────────

  {
    unlockKey: 'flow_palette_default',
    unlockType: 'flow_palette',
    grantedByStage: null,
    grantedByLevel: 1,
    displayName: 'Default',
    description: 'The original Flow palette. Everyone starts here.',
  },
  {
    unlockKey: 'flow_palette_ocean',
    unlockType: 'flow_palette',
    grantedByStage: null,
    grantedByLevel: 3,
    displayName: 'Ocean Breeze',
    description: 'Cool blues and seafoam greens.',
  },
  {
    unlockKey: 'flow_palette_ember',
    unlockType: 'flow_palette',
    grantedByStage: null,
    grantedByLevel: 6,
    displayName: 'Ember',
    description: 'Warm amber and deep crimson tones.',
  },
  {
    unlockKey: 'flow_palette_forest',
    unlockType: 'flow_palette',
    grantedByStage: 'Builder',
    grantedByLevel: null,
    displayName: 'Forest',
    description: 'Lush greens and earthy browns for builders who grow.',
  },
  {
    unlockKey: 'flow_palette_storm',
    unlockType: 'flow_palette',
    grantedByStage: 'Disciplined',
    grantedByLevel: null,
    displayName: 'Storm',
    description: 'Deep purples and electric grays for the disciplined mind.',
  },
  {
    unlockKey: 'flow_palette_gold',
    unlockType: 'flow_palette',
    grantedByStage: 'Embodied',
    grantedByLevel: null,
    displayName: 'Gold',
    description: 'Rich gold and champagne for those who embody their identity.',
  },
  {
    unlockKey: 'flow_palette_aurora',
    unlockType: 'flow_palette',
    grantedByStage: 'FutureSelf',
    grantedByLevel: null,
    displayName: 'Aurora',
    description: 'Iridescent northern-light gradients for your future self.',
  },

  // ── Flow Emotes ────────────────────────────────────────────────────────────

  {
    unlockKey: 'flow_emote_wave',
    unlockType: 'flow_emote',
    grantedByStage: null,
    grantedByLevel: 1,
    displayName: 'Wave',
    description: 'A friendly wave to greet the day.',
  },
  {
    unlockKey: 'flow_emote_celebrate',
    unlockType: 'flow_emote',
    grantedByStage: null,
    grantedByLevel: 5,
    displayName: 'Celebrate',
    description: 'Arms up, it\'s time to celebrate.',
  },
  {
    unlockKey: 'flow_emote_dance',
    unlockType: 'flow_emote',
    grantedByStage: 'Builder',
    grantedByLevel: null,
    displayName: 'Dance',
    description: 'Flow breaks into a victory dance.',
  },
  {
    unlockKey: 'flow_emote_fire',
    unlockType: 'flow_emote',
    grantedByStage: 'Disciplined',
    grantedByLevel: null,
    displayName: 'On Fire',
    description: 'Flames erupt — you\'re on a roll.',
  },
  {
    unlockKey: 'flow_emote_ascend',
    unlockType: 'flow_emote',
    grantedByStage: 'FutureSelf',
    grantedByLevel: null,
    displayName: 'Ascend',
    description: 'Flow rises toward its highest form.',
  },

  // ── Flow Stage Forms ───────────────────────────────────────────────────────

  {
    unlockKey: 'flow_form_seed',
    unlockType: 'flow_stage_form',
    grantedByStage: 'Seed',
    grantedByLevel: null,
    displayName: 'Seedling',
    description: 'The beginning — small but full of potential.',
  },
  {
    unlockKey: 'flow_form_builder',
    unlockType: 'flow_stage_form',
    grantedByStage: 'Builder',
    grantedByLevel: null,
    displayName: 'Builder',
    description: 'Flow takes shape, ready to construct new habits.',
  },
  {
    unlockKey: 'flow_form_disciplined',
    unlockType: 'flow_stage_form',
    grantedByStage: 'Disciplined',
    grantedByLevel: null,
    displayName: 'Disciplined',
    description: 'A focused, sharpened form forged through consistency.',
  },
  {
    unlockKey: 'flow_form_embodied',
    unlockType: 'flow_stage_form',
    grantedByStage: 'Embodied',
    grantedByLevel: null,
    displayName: 'Embodied',
    description: 'Identity and action are fully aligned.',
  },
  {
    unlockKey: 'flow_form_future_self',
    unlockType: 'flow_stage_form',
    grantedByStage: 'FutureSelf',
    grantedByLevel: null,
    displayName: 'Future Self',
    description: 'The ultimate form — who you always knew you could become.',
  },

  // ── Flow Accessories ───────────────────────────────────────────────────────

  {
    unlockKey: 'flow_accessory_none',
    unlockType: 'flow_accessory',
    grantedByStage: null,
    grantedByLevel: 1,
    displayName: 'None',
    description: 'No accessory — clean and unadorned.',
  },
  {
    unlockKey: 'flow_accessory_cap',
    unlockType: 'flow_accessory',
    grantedByStage: null,
    grantedByLevel: 2,
    displayName: 'Flow cap',
    description: 'A starter cap for showing up and building momentum.',
  },
  {
    unlockKey: 'flow_accessory_sunrise',
    unlockType: 'flow_accessory',
    grantedByStage: null,
    grantedByLevel: 2,
    displayName: 'Sunrise field',
    description: 'A warm backdrop for the first visible signs of progress.',
  },
  {
    unlockKey: 'flow_accessory_bright_eyes',
    unlockType: 'flow_accessory',
    grantedByStage: null,
    grantedByLevel: 4,
    displayName: 'Bright eyes',
    description: 'A brighter look for Flow as your habits start to click.',
  },
  {
    unlockKey: 'flow_accessory_focus_eyes',
    unlockType: 'flow_accessory',
    grantedByStage: null,
    grantedByLevel: 7,
    displayName: 'Focus eyes',
    description: 'A focused gaze for sharper routines and clearer priorities.',
  },
  {
    unlockKey: 'flow_accessory_spark',
    unlockType: 'flow_accessory',
    grantedByStage: 'Builder',
    grantedByLevel: null,
    displayName: 'Spark aura',
    description: 'A subtle spark for the moment your identity starts taking shape.',
  },
  {
    unlockKey: 'flow_accessory_forest_glow',
    unlockType: 'flow_accessory',
    grantedByStage: 'Builder',
    grantedByLevel: null,
    displayName: 'Forest glow',
    description: 'A grounded backdrop for steady, rooted progress.',
  },
  {
    unlockKey: 'flow_accessory_crown',
    unlockType: 'flow_accessory',
    grantedByStage: 'Disciplined',
    grantedByLevel: null,
    displayName: 'Crown',
    description: 'A crown for those who rule their routines.',
  },
  {
    unlockKey: 'flow_accessory_laurel',
    unlockType: 'flow_accessory',
    grantedByStage: 'Embodied',
    grantedByLevel: null,
    displayName: 'Laurel wreath',
    description: 'A wreath for consistency that has become part of who you are.',
  },
  {
    unlockKey: 'flow_accessory_wings',
    unlockType: 'flow_accessory',
    grantedByStage: 'Embodied',
    grantedByLevel: null,
    displayName: 'Wings',
    description: 'Wings that carry you beyond your old limits.',
  },
  {
    unlockKey: 'flow_accessory_future_gaze',
    unlockType: 'flow_accessory',
    grantedByStage: 'FutureSelf',
    grantedByLevel: null,
    displayName: 'Future gaze',
    description: 'A forward-looking expression for your highest self.',
  },
  {
    unlockKey: 'flow_accessory_halo',
    unlockType: 'flow_accessory',
    grantedByStage: 'FutureSelf',
    grantedByLevel: null,
    displayName: 'Halo',
    description: 'A radiant halo marking your highest self.',
  },

  // ── Flow Animation Packs ───────────────────────────────────────────────────

  {
    unlockKey: 'flow_anim_basic',
    unlockType: 'flow_animation_pack',
    grantedByStage: null,
    grantedByLevel: 1,
    displayName: 'Basic',
    description: 'The starter set of smooth, essential animations.',
  },
  {
    unlockKey: 'flow_anim_energetic',
    unlockType: 'flow_animation_pack',
    grantedByStage: null,
    grantedByLevel: 8,
    displayName: 'Energetic',
    description: 'Snappy, high-energy motion for momentum builders.',
  },
  {
    unlockKey: 'flow_anim_zen',
    unlockType: 'flow_animation_pack',
    grantedByStage: 'Disciplined',
    grantedByLevel: null,
    displayName: 'Zen',
    description: 'Slow, meditative animations for a disciplined mind.',
  },

  // ── Execution Mechanics ────────────────────────────────────────────────────

  {
    unlockKey: 'mechanic_focus_assist',
    unlockType: 'mechanic',
    grantedByStage: 'Builder',
    grantedByLevel: null,
    displayName: 'Focus Assist',
    description: 'Enable focus mode timer on task sessions.',
  },
  {
    unlockKey: 'mechanic_momentum_shield',
    unlockType: 'mechanic',
    grantedByStage: 'Disciplined',
    grantedByLevel: null,
    displayName: 'Momentum Shield',
    description: 'Protect a streak once per week when you miss a day.',
  },
  {
    unlockKey: 'mechanic_recovery_boost',
    unlockType: 'mechanic',
    grantedByStage: 'Disciplined',
    grantedByLevel: null,
    displayName: 'Recovery Boost',
    description: 'Get 1.5x XP on first completion after a miss.',
  },
  {
    unlockKey: 'mechanic_mastery_preview',
    unlockType: 'mechanic',
    grantedByStage: 'Embodied',
    grantedByLevel: null,
    displayName: 'Mastery Preview',
    description: 'See trial progress with day-by-day breakdown.',
  },
  {
    unlockKey: 'mechanic_legacy_mode',
    unlockType: 'mechanic',
    grantedByStage: 'FutureSelf',
    grantedByLevel: null,
    displayName: 'Legacy Mode',
    description: 'Unlock retrospective habit journaling.',
  },
];

/**
 * Returns all catalog entries that should be awarded for a given level-up
 * or stage transition event. Matches on exact level OR exact stage.
 *
 * Exported for independent unit testing.
 */
export function getUnlocksForEvent(newLevel: number, newStage: IdentityStage): CatalogEntry[] {
  return UNLOCK_CATALOG.filter(
    (entry) => entry.grantedByLevel === newLevel || entry.grantedByStage === newStage
  );
}
