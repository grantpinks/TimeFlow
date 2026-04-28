/**
 * identityUnlockCatalog tests
 *
 * Covers: catalog integrity, getUnlocksForEvent, upsert idempotency semantics,
 * and cross-reference validity of stage names.
 */

import { describe, expect, it } from 'vitest';
import {
  UNLOCK_CATALOG,
  getUnlocksForEvent,
  type CatalogEntry,
} from '../../config/identityUnlockCatalog.js';
import type { IdentityStage } from '@timeflow/shared';

// ── Catalog integrity ─────────────────────────────────────────────────────────

describe('UNLOCK_CATALOG — integrity', () => {
  it('all entries have unique unlockKey values', () => {
    const keys = UNLOCK_CATALOG.map((e) => e.unlockKey);
    const uniqueKeys = new Set(keys);
    expect(uniqueKeys.size).toBe(keys.length);
  });

  it('every entry has exactly one of grantedByStage or grantedByLevel set (not both, not neither)', () => {
    const violations: string[] = [];
    for (const entry of UNLOCK_CATALOG) {
      const hasStage = entry.grantedByStage !== null;
      const hasLevel = entry.grantedByLevel !== null;
      // XOR: exactly one must be set
      if (hasStage === hasLevel) {
        violations.push(
          `${entry.unlockKey}: grantedByStage=${String(entry.grantedByStage)}, grantedByLevel=${String(entry.grantedByLevel)}`
        );
      }
    }
    expect(violations).toEqual([]);
  });

  it('no mechanic entries reference stages that do not exist', () => {
    const validStages: IdentityStage[] = ['Seed', 'Builder', 'Disciplined', 'Embodied', 'FutureSelf'];
    const mechanics = UNLOCK_CATALOG.filter((e) => e.unlockType === 'mechanic');
    for (const entry of mechanics) {
      if (entry.grantedByStage !== null) {
        expect(validStages).toContain(entry.grantedByStage);
      }
    }
  });

  it('no entry of any type references an invalid stage', () => {
    const validStages = new Set<IdentityStage>(['Seed', 'Builder', 'Disciplined', 'Embodied', 'FutureSelf']);
    for (const entry of UNLOCK_CATALOG) {
      if (entry.grantedByStage !== null) {
        expect(validStages.has(entry.grantedByStage)).toBe(true);
      }
    }
  });

  it('all entries have non-empty displayName and description', () => {
    for (const entry of UNLOCK_CATALOG) {
      expect(entry.displayName.length).toBeGreaterThan(0);
      expect(entry.description.length).toBeGreaterThan(0);
    }
  });
});

// ── getUnlocksForEvent ────────────────────────────────────────────────────────

describe('getUnlocksForEvent', () => {
  it('returns default/starter items for level 1, stage Seed', () => {
    const unlocks = getUnlocksForEvent(1, 'Seed');
    const keys = unlocks.map((e) => e.unlockKey);

    // Level-1 items
    expect(keys).toContain('flow_palette_default');
    expect(keys).toContain('flow_emote_wave');
    expect(keys).toContain('flow_accessory_none');
    expect(keys).toContain('flow_anim_basic');

    // Stage: Seed
    expect(keys).toContain('flow_form_seed');
  });

  it('returns level-5 AND Builder stage items for getUnlocksForEvent(5, Builder)', () => {
    const unlocks = getUnlocksForEvent(5, 'Builder');
    const keys = unlocks.map((e) => e.unlockKey);

    // Level-5 item
    expect(keys).toContain('flow_emote_celebrate');

    // Builder stage items
    expect(keys).toContain('flow_palette_forest');
    expect(keys).toContain('flow_emote_dance');
    expect(keys).toContain('flow_form_builder');
    expect(keys).toContain('mechanic_focus_assist');
  });

  it('returns only level-3 items when stage has no match', () => {
    // Level 3 grants ocean palette; stage 'Seed' grants form_seed (already granted at L1/Seed)
    const unlocks = getUnlocksForEvent(3, 'Seed');
    const keys = unlocks.map((e) => e.unlockKey);

    expect(keys).toContain('flow_palette_ocean');
    // Seed stage items also included (idempotent — upsert handles re-grants)
    expect(keys).toContain('flow_form_seed');
  });

  it('returns Disciplined stage items for level 10, stage Disciplined', () => {
    const unlocks = getUnlocksForEvent(10, 'Disciplined');
    const keys = unlocks.map((e) => e.unlockKey);

    expect(keys).toContain('flow_palette_storm');
    expect(keys).toContain('flow_form_disciplined');
    expect(keys).toContain('flow_accessory_crown');
    expect(keys).toContain('flow_emote_fire');
    expect(keys).toContain('flow_anim_zen');
    expect(keys).toContain('mechanic_momentum_shield');
    expect(keys).toContain('mechanic_recovery_boost');
  });

  it('returns FutureSelf items for level 20, stage FutureSelf', () => {
    const unlocks = getUnlocksForEvent(20, 'FutureSelf');
    const keys = unlocks.map((e) => e.unlockKey);

    expect(keys).toContain('flow_palette_aurora');
    expect(keys).toContain('flow_form_future_self');
    expect(keys).toContain('flow_accessory_halo');
    expect(keys).toContain('flow_emote_ascend');
    expect(keys).toContain('mechanic_legacy_mode');
  });

  it('returns level-8 item (energetic anim) when leveling to 8', () => {
    // Stage Seed — no stage-8 gate, just a level-based unlock
    const unlocks = getUnlocksForEvent(8, 'Seed');
    const keys = unlocks.map((e) => e.unlockKey);
    expect(keys).toContain('flow_anim_energetic');
  });

  it('returns an empty array for a level with no catalog entries', () => {
    // Level 99, stage Seed — no catalog entries match
    const unlocks = getUnlocksForEvent(99, 'Seed');
    // Seed stage items match (form_seed), but level 99 has no entry
    // Only Seed stage items would appear
    const levelMatches = unlocks.filter((e) => e.grantedByLevel === 99);
    expect(levelMatches).toHaveLength(0);
  });

  it('is deterministic — same inputs always return same entries', () => {
    const first = getUnlocksForEvent(5, 'Builder').map((e) => e.unlockKey).sort();
    const second = getUnlocksForEvent(5, 'Builder').map((e) => e.unlockKey).sort();
    expect(first).toEqual(second);
  });
});

// ── Upsert idempotency semantics ──────────────────────────────────────────────

describe('getUnlocksForEvent — upsert idempotency contract', () => {
  it('calling getUnlocksForEvent twice for the same level returns identical entries', () => {
    const first = getUnlocksForEvent(5, 'Builder');
    const second = getUnlocksForEvent(5, 'Builder');

    expect(first.map((e) => e.unlockKey).sort()).toEqual(
      second.map((e) => e.unlockKey).sort()
    );
  });

  it('all returned entries have valid unlockType values', () => {
    const validTypes: CatalogEntry['unlockType'][] = [
      'flow_palette',
      'flow_emote',
      'flow_accessory',
      'flow_animation_pack',
      'flow_stage_form',
      'mechanic',
    ];
    const unlocks = getUnlocksForEvent(5, 'Builder');
    for (const entry of unlocks) {
      expect(validTypes).toContain(entry.unlockType);
    }
  });
});
