# Sprint 17: Habits Retention Loop (Insights → Action) — Add-on Plan

**Date**: 2026-01-02  
**Sprint**: 17  
**Goal**: Make Habits “sticky” by turning insights into immediate actions and adding a minimal opt-in reminder loop.

---

## Outcomes
- Insights don’t just inform; they **change behavior** with 1-click actions.
- Users feel the metrics are **trustworthy** (clear “why/how calculated” and edge-case robustness).
- Users have an optional, low-noise **streak-at-risk reminder** to bring them back.

---

## Scope

### 1) Insights → Actions (P0)
Add CTA buttons on the Habits Insights cards, e.g.:
- **Schedule a rescue block** (15–30 min) in the next available “best window”
- **Adjust habit window** (shift earlier/later)
- **Snooze/skip with reason** (preset-only, 1 tap, no guilt, improves future coaching)

Acceptance:
- Action is applied with clear confirmation and undo (where feasible).
 - “Snooze/skip reason” is optional, fast (1 tap), and stored privacy-safely (**preset reasons only**; no free-text in v1).

### 1.1) Coach Card (P0)
Top of Habits page shows one “Coach” recommendation at a time with a single primary CTA, chosen from **A/B/D**:
- Schedule rescue block
- Adjust habit window
- Snooze/skip with reason

Acceptance:
- Coach card always offers an actionable CTA (never just a chart).
- Users can dismiss/snooze the suggestion.

### 1.2) Preset “Skip/Snooze Reason” taxonomy (P0)

**Why preset-only**: covers most reasons, keeps data consistent for insights, and avoids collecting sensitive free-text.

**Preset reasons (v1)** (aim: broad coverage, minimal overlap):
- **No time / too busy**
- **Low energy / not feeling well**
- **Schedule changed unexpectedly**
- **Travel / away from routine**
- **Forgot**
- **Not a priority today**
- **Blocked by something** (needs equipment/location/other dependency)
- **Injury / recovery** (or physical limitation)
- **Other** (still preset; no free-text in v1)

**Storage (minimal)**:
- `habitId`
- `instanceId` (or date bucket)
- `reasonCode` (enum string)
- `createdAt`

**Analytics (privacy-safe)**:
- track counts by `reasonCode` and habit type to inform coaching (e.g., if “Forgot” is common → recommend scheduling earlier + reminders).

### 2) Streak-at-risk definition (P0)
Define a deterministic rule (explainable, not “AI magic”), e.g.:
- “At risk” if today is the last day to complete to maintain streak, or if the user has missed X days in the last Y.

Acceptance:
- A banner/label appears only when it’s truly actionable (no spam).

### 3) Minimal reminders (P1)
Opt-in only:
- Email or in-app reminder when streak is at risk
- Easy disable/unsubscribe

Acceptance:
- Users can turn it on/off and see proof it worked (last reminder timestamp).

### 4) Trust & edge cases (P1)
- Add “How we calculate this” tooltips
- Ensure timezone/DST changes do not corrupt streaks

Acceptance:
- Basic tests exist for DST + timezone changes and missed-day transitions.


