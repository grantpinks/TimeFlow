# Identity evolution — balancing notes (2026-04-27)

Authoritative implementation lives in `apps/backend/src/services/identityEvolutionService.ts`. This document captures the **first tuning iteration** for product and data review.

## Level / XP curve

- **Per-level cost:** XP to advance from level **L** to **L + 1** is **L² × 50** (e.g. L=1 → 50 XP, L=2 → 200 XP cumulative segment, etc.).
- **Cumulative XP → level:** `computeLevel` sums those costs until cumulative XP no longer covers the next threshold.

## Daily XP and diminishing returns

- **Base XP per qualifying action:** 10 (`BASE_XP`).
- **Hard daily cap:** **80 XP** per identity per rolling cap window (`DAILY_CAP`).
- **Cap window:** `xpThisPeriod` resets when `xpCapResetAt` has passed (24h rolling window from reset assignment on first action after expiry).
- **Diminishing returns (by count of XP events today, local user day):**
  - Actions **1–3:** full base (+ bonus below).
  - Actions **4–6:** base halved (floor).
  - **7+:** 0 base from diminishing rule (still subject to cap).
- **Consistency bonus:** If `baseXp > 0` and `currentStreak >= 2`, add **min(streak, 7) × 2** (max +14). Bonus is included before the daily cap clamp.

## Mastery trials

- Trials start automatically when leveling through **stage gates** at levels **5, 10, 15, 20** (`STAGE_GATE_LEVELS`).
- **Window length and targets** (after stage transition into the new stage):
  - **Builder:** 7-day window, 4 target active days.
  - **Disciplined / Embodied:** 14-day window, 10 target active days.
  - **FutureSelf:** 21-day window, 15 target active days.
- **Pass:** `trialActiveDays >= trialTargetDays` before window end, or on window end if either **active** or **checkpoint** accumulator reached target.
- **Hard fail:** Window ended and neither active nor checkpoint days reached target → `Failed`.

## Soft-fail (checkpoint) rule

- On the **first qualifying XP-granting action of a local day** while trial is `Active`, if the user had **3+ consecutive missed local days** before today since the last positive XP event, we **checkpoint** progress: `trialCheckpointDays = max(trialCheckpointDays, trialActiveDays)`, then **`trialActiveDays` resets to 0**. Trial stays **`Active`** (no full trial reset).
- UI surfaces checkpoint messaging when `trialCheckpointDays > 0` or `trialState === 'CheckpointFailed'` (enum reserved for future / edge flows).

## Tuning knobs (code constants)

| Knob | Location | Default | Effect |
|------|----------|---------|--------|
| `BASE_XP` | `identityEvolutionService.ts` | 10 | Per-action baseline before streak and diminishing rules. |
| `DAILY_CAP` | same | 80 | Max XP per identity per cap period. |
| Diminishing thresholds | same (today event count) | 0–2 full, 3–5 half, 6+ zero base | Anti-spam / anti-cheese feel. |
| Streak bonus cap | `Math.min(streak, 7) * 2` | streak cap 7 | Rewards consistency without runaway XP. |
| `STAGE_GATE_LEVELS` | `Set([5, 10, 15, 20])` | — | When new mastery trials attach to progression. |
| `getTrialConfig` | per `IdentityStage` | window / target pairs above | Trial difficulty curve. |
| Missed-day soft-fail | `missedDays >= 3` | 3 | How strict checkpoint triggers are. |

## Telemetry (web)

PostHog events (session-throttled where noted in `today` / `habits` pages): `identity.evolution.state_loaded`, `identity.evolution.hero_visible`, `identity.evolution.trial_checkpoint_visible`, `identity.evolution.habits_layout_visible`; reserved: `identity.flow_customization.saved` when customization save UI exists.

## Concurrency and read model (2026-04-28)

- **`grantIdentityXp`:** Opens each interactive transaction with `SELECT … FROM "Identity" … FOR UPDATE` on the identity row so concurrent completions for the same identity serialize; XP counts and `Identity.xp` stay consistent with `IdentityXpEvent` rows.
- **Starter unlocks:** New identities get catalog entries for **level 1** and **Seed** via `seedStarterUnlocksForIdentity` inside `createIdentity` (same transaction as `identity.create`). **Existing** identities created before this behavior may have empty `IdentityUnlock` rows until a one-time backfill or the next manual grant.
- **`getEvolutionState`:** If `trialState === Active` and `trialEndsAt` is in the past, the handler persists **Passed** or **Failed** (same rules as the XP path) so the API does not stay stuck on Active with no completions.

## Next balancing pass

- Compare **median time-to-stage** vs. intended week/month cadence after internal dogfood.
- Watch **0-XP event rate** (diminishing + cap) for frustration vs. fairness.
- Validate **trial pass rate** by stage before widening `identityEvolutionEnabled` rollout.
