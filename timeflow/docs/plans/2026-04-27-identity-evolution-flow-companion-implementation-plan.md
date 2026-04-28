# Identity Evolution + Flow Companion Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build a fully realized 5-stage identity progression system (hybrid XP + mastery trials + mechanical rewards) and overhaul Today/Habits UX around an evolving global Flow mascot.

**Architecture:** Extend the existing identity progress foundation with durable progression state, XP eventing, trial checkpoints, and unlock inventories. Keep progression logic centralized in backend services and expose a compact read model for Today/Habits surfaces. Ship under feature flags with safe fallback to current identity UI.

**Tech Stack:** Prisma/Postgres, Fastify controllers/services, `@timeflow/shared` DTOs, React/Next.js, existing `FlowMascot`, `IdentityDashboardBanner`, habits/today components, Vitest.

---

## Delivery Rules

- Update task status checkboxes in this file and `ARCHITECT_ROADMAP_SPRINT1-17.md` as each task is completed.
- Use small, frequent commits by task group.
- Keep YAGNI boundaries: v1 is **global Flow customization only**; per-identity accents are roadmap-only.
- Keep backward compatibility for current identity progress widgets until rollout is complete.

---

## Milestone Tracker

- [x] **P0 Planning:** Finalize progression model decisions (A + hybrid score + mastery trials + 5 stages + Flow global customization).
- [x] **P1 Data + Domain:** Schema, shared types, progression engine, trial checkpoint logic.
- [x] **P2 API + Events:** Read/write endpoints, completion hooks, XP events, feature flags.
- [x] **P3 Today UX Overhaul:** Flow Evolution Hero + trial status + action surfacing.
- [x] **P4 Habits UX Overhaul:** Identity-grouped habits + contribution + unlock timeline.
- [ ] **P5 Flow Customization:** stage forms, unlockable cosmetics, animation packs (API + unlocks exist; dedicated customization panel still pending).
- [ ] **P6 QA + Rollout:** migration verification, balancing pass, analytics, docs (client evolution events + balancing notes landed; dashboards / full rollout pass still open).

---

## Task Breakdown

### Task 1: Data Model + Shared Contracts

**Files:**
- Modify: `apps/backend/prisma/schema.prisma`
- Create: `apps/backend/prisma/migrations/<timestamp>_identity_evolution_system/migration.sql`
- Modify: `packages/shared/src/types/identity.ts`
- Modify: `packages/shared/src/index.ts` (or equivalent export barrel)

**Implementation steps:**
1. Add identity progression fields/tables:
   - `Identity.level`, `Identity.stage`, `Identity.xp`, `Identity.trialState`, `Identity.trialCheckpoint`
   - `IdentityUnlock` table (cosmetics/animations/mechanics inventory)
   - `IdentityXpEvent` table (auditable XP source stream)
2. Encode stage enum (5 stages: Seed, Builder, Disciplined, Embodied, FutureSelf).
3. Add shared DTOs:
   - `IdentityEvolutionState`
   - `IdentityTrialStatus`
   - `FlowCustomizationState`
   - `IdentityUnlockItem`
4. Add migration with defaults that preserve current identities.

**Acceptance:**
- [ ] Migration applies cleanly on local db.
- [ ] Existing identity APIs still function with added fields.

---

### Task 2: Progression Engine (Hybrid XP + Anti-Cheat + Stage Gates)

**Files:**
- Create: `apps/backend/src/services/identityEvolutionService.ts`
- Modify: `apps/backend/src/services/identityProgressService.ts`
- Modify: `apps/backend/src/services/taskService.ts` (or completion service touchpoint)
- Modify: `apps/backend/src/services/habitService.ts` / instance completion service
- Test: `apps/backend/src/services/__tests__/identityEvolutionService.test.ts`

**Implementation steps:**
1. Implement hybrid XP formula:
   - consistency component + volume component
   - per-identity daily hard cap
   - diminishing returns after threshold
2. Implement level thresholds and stage gate checks.
3. Implement mastery trial engine (behavioral consistency only):
   - window targets (e.g., 4/7, 5/7x2, 10/14, 15/21, 22/28)
   - soft fail checkpoint restart (not full reset)
4. Record every XP grant into `IdentityXpEvent`.

**Acceptance:**
- [ ] Unit tests cover cap, diminishing returns, checkpoint behavior, stage transitions.
- [ ] Completion actions increment XP exactly once per qualifying action.

---

### Task 3: Unlocks + Flow Reward Inventory

**Files:**
- Create: `apps/backend/src/config/identityUnlockCatalog.ts`
- Modify: `apps/backend/src/services/identityEvolutionService.ts`
- Modify: `packages/shared/src/types/identity.ts`
- Test: `apps/backend/src/services/__tests__/identityUnlockCatalog.test.ts`

**Implementation steps:**
1. Define unlock catalog for each stage/level:
   - Flow palettes, emotes, accessories, animation packs, stage forms
   - execution mechanics (Focus Assist, Momentum Shield, Recovery Boost, etc.)
2. Add unlock award logic on level-up and stage evolution.
3. Persist unlocks in `IdentityUnlock`.
4. Return unlock delta in completion/evolution responses for celebratory UI.

**Acceptance:**
- [ ] Unlocks are idempotent (no duplicate inventory records).
- [ ] Stage evolution grants expected major unlocks.

---

### Task 4: API Layer + Feature Flags

**Files:**
- Modify: `apps/backend/src/controllers/identityController.ts`
- Modify: `apps/backend/src/routes/identityRoutes.ts`
- Modify: `apps/web/src/lib/api.ts`
- Modify: `apps/backend/src/controllers/userController.ts` (feature flag preferences)
- Test: `apps/backend/src/controllers/__tests__/identityEvolutionController.test.ts`

**Implementation steps:**
1. Add endpoints:
   - `GET /api/identities/evolution-state`
   - `POST /api/identities/:id/trial/start` (if explicit start needed)
   - `POST /api/identities/:id/flow-customization`
2. Gate all new behavior behind a user/org feature flag.
3. Add API client methods + DTO wiring in web app.
4. Ensure old endpoints still return baseline progress during rollout.

**Acceptance:**
- [ ] API contract tests pass.
- [ ] Flag OFF path fully preserves current UX behavior.

---

### Task 5: Today Page Overhaul (Flow Evolution Hero)

**Files:**
- Modify: `apps/web/src/app/today/page.tsx`
- Modify: `apps/web/src/components/identity/IdentityDashboardBanner.tsx`
- Create: `apps/web/src/components/identity/FlowEvolutionHero.tsx`
- Create: `apps/web/src/components/identity/MasteryTrialCard.tsx`
- Modify: `apps/web/src/components/FlowMascot.tsx`
- Test: `apps/web/src/components/identity/__tests__/FlowEvolutionHero.test.tsx`

**Implementation steps:**
1. Replace/augment current identity banner with Flow Evolution Hero:
   - stage, level, XP bar, next unlock, trial progress
2. Add trial checkpoint UI and explicit “recover from miss” messaging.
3. Add completion micro-feedback hooks (`+XP`, unlocked indicator).
4. Ensure layout remains responsive and does not regress current Today widgets.

**Acceptance:**
- [ ] Today shows evolution/trial state correctly from API read model.
- [ ] Completing qualifying actions updates hero state after refresh/event.

---

### Task 6: Habits Page Overhaul (Identity-Grouped Progression UX)

**Files:**
- Modify: `apps/web/src/app/habits/page.tsx`
- Modify: `apps/web/src/components/habits/HabitCard.tsx`
- Create: `apps/web/src/components/habits/IdentityProgressionSidebar.tsx`
- Create: `apps/web/src/components/habits/IdentityHabitGroup.tsx`
- Test: `apps/web/src/components/habits/__tests__/IdentityHabitGroup.test.tsx`

**Implementation steps:**
1. Group habits by linked identity with stage badge in group header.
2. Show per-habit contribution hints to active trial.
3. Add progression sidebar:
   - next unlock
   - stage countdown
   - trial checklist status
4. Preserve current quick schedule behavior and identity editing flows.

**Acceptance:**
- [ ] Habit grouping and progression metadata render accurately.
- [ ] No regressions in quick schedule, edit, delete, reorder.

---

### Task 7: Flow Customization UX + Animation Sets

**Files:**
- Modify: `apps/web/src/components/FlowMascot.tsx`
- Create: `apps/web/src/components/identity/FlowCustomizationPanel.tsx`
- Modify: `apps/web/src/app/settings/page.tsx` (or identities settings surface)
- Create: `apps/web/src/lib/flowCustomization.ts`
- Test: `apps/web/src/components/identity/__tests__/FlowCustomizationPanel.test.tsx`

**Implementation steps:**
1. Add unlocked-only customization picker (global scope).
2. Wire selected customization to persisted user preference.
3. Add stage-based form variants and animation packs.
4. Add reduced-motion safe fallback paths.

**Acceptance:**
- [ ] Users can only select unlocked options.
- [ ] Flow renders correctly in Today/Habits/banner contexts.

---

### Task 8: Analytics, Balancing, and Hardening

**Files:**
- Modify: `apps/backend/src/services/analyticsService.ts` (or tracking touchpoints) — **skipped:** no server-side analytics service in repo; PostHog remains client-side.
- Modify: `apps/web/src/lib/analytics.ts`
- Create: `docs/plans/2026-04-27-identity-evolution-balancing-notes.md`
- Modify: `timeflow/ARCHITECT_ROADMAP_SPRINT1-17.md` (status updates)

**Implementation steps:**
1. Track progression funnel:
   - [x] Initial web events: evolution state loaded, hero visible (Today), trial checkpoint UI visible (Today), habits evolution layout visible (Habits). Further funnel (XP/day aggregates, stage evolutions) can use PostHog insights on existing completion flows or backend audit tables later.
2. Add initial balancing guardrails and an admin/debug readout.
3. Validate retention/sentiment and tune thresholds.
4. Update roadmap and this plan checkboxes as tasks land.

**Acceptance:**
- [x] Core analytics events are visible in telemetry (PostHog `capture` via typed `track()`).
- [x] Balance notes document first tuning iteration (`2026-04-27-identity-evolution-balancing-notes.md`).

---

## Rollout Plan

1. Dark launch (flag OFF by default).
2. Internal users only (team accounts).
3. 5% cohort rollout.
4. 25% rollout after no severe regressions.
5. 100% rollout + roadmap update.

---

## Deferred (Roadmap) — Hybrid Customization

- Global base Flow + per-identity accent overlays.
- Identity-filter-aware accent transitions.
- Keep out of v1 implementation scope.

