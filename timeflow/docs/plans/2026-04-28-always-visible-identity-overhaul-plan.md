# Always-Visible Identity Overhaul Plan (Today + Habits)

**Date:** 2026-04-28  
**Sprint Link:** Sprint 25 (Identity Evolution + Flow Companion System)  
**Owner:** Codex  

## Goal

Make the identity overhaul **always visible** on Today and Habits so users can always see progression, locked rewards, and future unlock paths. Keep mutation paths (selection/use) strictly server-enforced by unlock state.

This removes the current failure mode where the UI appears unchanged when feature flags or state payloads are unavailable.

## Product Direction

- Render new Today and Habits identity surfaces by default for all authenticated users.
- Separate **visibility** from **capability**:
  - Visibility: always on.
  - Capability (select/use cosmetics, active trial interactions): gated by unlock state and backend enforcement.
- Show locked rewards with clear requirements (stage, level, trial) and non-destructive CTA copy.
- Never collapse to legacy shell for normal gating conditions (flag off, 403, empty state).

## UX Modes

Use one render model across Today and Habits:

- `preview` — no live evolution state yet; show roadmap, locked cards, and requirements.
- `active` — live state loaded; show level, trial, progress, unlock inventory.
- `degraded` — API failure/timeouts; show scaffold + retry + safe fallback text.

`preview` and `degraded` still render full overhaul surfaces.

## Component/Contract Plan

### Today

- Keep `FlowEvolutionHero` always mounted.
- In `preview`:
  - Stage ladder (Seed -> FutureSelf), locked trial card, "what unlocks next" cards.
- In `active`:
  - Existing stage/XP/trial panels.
- In `degraded`:
  - Cached/placeholder values + retry action.

### Habits

- Keep identity-grouped layout and progression sidebar always mounted.
- Always show unlock timeline rail:
  - unlocked options as available
  - locked options as visible but disabled with requirement chips.

### Flow Customization

- Keep global panel visible when authenticated.
- Always show available + locked options; locked options include requirement text.
- Backend remains source of truth for selection authorization.

## Data Flow

Create a frontend adapter (hook) that always emits renderable data:

- `useEvolutionSurface()` returns:
  - `mode`
  - normalized identities/stages/trials
  - unlock catalog entries with unlocked flags
  - retry and source metadata (`live`, `cached`, `fallback`).

Inputs:

- `GET /identities/evolution-state`
- `GET /identities/:id/unlocks` aggregated across all identities for global customization
- static unlock catalog map (for locked preview requirements)

## Backend/API Adjustments

- Keep strict enforcement on `POST /identities/flow-customization`.
- For reads, map non-ready states to preview payload behavior at UI layer.
- Optional future endpoint:
  - `GET /identities/evolution-preview` for explicit teaser metadata (requirements by stage/level).

## Implementation Tasks

1. **Render-model adapter:** add `useEvolutionSurface()` with mode derivation.
2. **Today always-visible shell:** remove collapse-to-legacy behavior in non-error cases.
3. **Habits always-visible shell:** always render grouped/sidebar surfaces.
4. **Locked-state inventory UX:** requirement chips and disabled controls for unearned options.
5. **Analytics hooks:** preview visible, locked item viewed, locked action attempted.
6. **Regression tests:** Today/Habits render in `preview` and `degraded`; customization remains server-enforced.

## Acceptance Criteria

- Today and Habits always show overhaul surfaces for authenticated users.
- Users can always see locked rewards and requirements.
- Locked cosmetics remain non-selectable server-side (cannot be bypassed by direct API calls).
- No fallback to old identity banner/list except for catastrophic rendering failure.
- Existing create/edit/reorder habit/task flows remain unchanged.

## Risks and Mitigations

- **Perceived regressions from mode confusion:** enforce a single mode adapter and explicit mode badges in dev.
- **Data mismatch between pages:** centralize normalization in one hook.
- **Over-fetch unlock APIs:** dedupe identity IDs and memoize aggregated unlocks in-session.

## Rollout

1. Ship always-visible shell with preview mode default.
2. Enable active mode where state is available.
3. Monitor conversion from preview -> active and locked-action attempts.
4. Iterate copy and requirement clarity based on telemetry.
