# Identity Studio (Habits Inside) — Design

**Date:** 2026-06-01  
**Status:** Implemented (Sprint 28, 2026-06-01)  
**Implementation plan:** [`2026-06-01-identity-studio-habits-implementation-plan.md`](./2026-06-01-identity-studio-habits-implementation-plan.md)  
**Roadmap:** Sprint 28 in `ARCHITECT_ROADMAP_SPRINT1-17.md`  
**Route:** `/habits` (unchanged URL; rebranded experience)  
**Nav label:** **Identity Studio** (habits are the mechanism inside, not the product name)

**Related plans:**
- `docs/plans/2026-04-28-always-visible-identity-overhaul-plan.md`
- `docs/plans/2026-05-23-identity-panel-redesign.md` (Today execution surface)
- `docs/plans/2026-01-04-bulk-habit-scheduling-design.md`
- `docs/plans/2026-01-03-sprint-17-habits-coach-implementation-plan.md`

---

## Problem

The `/habits` page grew from a “simple CRUD” note into a long vertical stack: coach hero, notification prefs, full insights dashboard, scheduling banner, identity filter widget, inline add/edit forms, and heavy `HabitCard` rows. The file comment and UX no longer match.

Users experience:

- **Low signal density** — many panels compete before the habit list.
- **Unclear primary job** — is this admin, coaching, scheduling, or identity progression?
- **Weak link to Today** — execution and completions live on Today; Habits feels isolated.
- **Stale row data** — `HabitCard` still uses mock completion/schedule status in places.

Product intent (validated in brainstorm): **C (identity studio) + A (light command center)** — identities are built *through* habits; the page should feel like a studio, with just enough “what needs attention now” to be actionable.

---

## Goal

Redesign `/habits` as **Identity Studio**: a compact, identity-first surface where:

1. **Identities are the organizing principle** — habits are listed under the identity they build.
2. **Default view is scannable** — stacked identity sections (studio wall), not an endless admin scroll.
3. **Focus mode** — rail selection collapses peer sections while keeping context (header + 2 habit previews).
4. **Daily utility without duplicating Today** — a thin action strip routes to Today, schedule, or Flow.
5. **Habits remain first-class content** — creation, edit, reorder, and scheduling stay on this page; they are not moved to a separate “Habits app.”

## Non-goals

| Deferred | Why |
|----------|-----|
| Replacing Today’s timeline or habit completion UX | Today remains execution; studio defines and maintains |
| Full habit analytics dashboard on load | Insights move to on-demand drawer |
| New backend identity/habit models | Reuse `Identity`, `Habit`, evolution APIs, insights endpoints |
| Mobile-native separate app tab structure | Responsive web only in this epic |
| Renaming URL `/habits` → `/studio` | Avoid broken links/bookmarks unless explicitly migrated later |

---

## Product framing

| Layer | User mental model |
|-------|-------------------|
| **Identity Studio** | “Who am I becoming? What habits support each identity? How are they progressing?” |
| **Habits (inside)** | Concrete behaviors: frequency, duration, schedule, priority order |
| **Today** | “What do I do right now?” — complete, earn XP, see timeline |
| **Calendar** | “When is it on the grid?” — visual time |

**Tagline (page subtitle):** e.g. *“Build your identities through the habits that shape them.”*

**Navigation:** Sidebar item **Identity Studio** → `/habits`. Optional tooltip on first visit: “Your habits live here, organized by identity.”

---

## Layout architecture

Hybrid **(3) stacked sections + (1) focus via rail**:

```
┌──────────────────────────────────────────────────────────────────┐
│ Identity Studio                    [+ Habit]  [Manage identities]│
│ Build your identities through habits…                            │
├──────────────────────────────────────────────────────────────────┤
│ ACTION STRIP: 3 due today · 1 at risk · Schedule 4 unplaced    │
├────────────┬─────────────────────────────────────────────────────┤
│ IDENTITY   │  ┌─ Athlete ─────────────────────────────────────┐ │
│ RAIL       │  │ stage · trial · 4 habits · 2/4 this week        │ │
│ All        │  │ [habit row][habit row]…                       │ │
│ Athlete ●  │  └───────────────────────────────────────────────┘ │
│ Creator    │  ┌─ Creator (collapsed preview) ─────────────────┐ │
│ …          │  │ header + 2 preview rows + “+2 more”           │ │
│ Unassigned │  └───────────────────────────────────────────────┘ │
│            │  (lg) optional evolution summary sidebar ──────► │
└────────────┴─────────────────────────────────────────────────────┘
```

### Identity rail

- Pills: **All**, each `Identity`, **Unassigned** (habits without `identityId`).
- Each pill shows: icon, short name, habit count, optional pulse (e.g. due today / at risk).
- **All:** every section expanded (full studio wall).
- **Select identity:** scroll target into view; **expand** that section; **collapse** peers per preview rules below.
- **Tap same identity again:** return to **All** (expand all).

Reuse/adapt: `IdentityProgressWidget` data for pill badges; evolution stage from `useEvolutionSurface` / `IdentityEvolutionState`.

### Stacked identity sections

Reuse `IdentityHabitGroup` with visual tightening:

- Header: one row — color strip, icon, name, stage/trial badge, `N habits · X/Y this week` (or consistency mini-stat).
- Body: list of `HabitRow` components (new).
- Footer (expanded only): `+ Add habit to {name}`.

**Unassigned** section always last; copy encourages linking: “Link habits to an identity to track progression on Today.”

### Collapsed peer sections (choice **B**)

When rail focuses one identity, non-focused sections show:

1. **Header only** (identity metadata + counts)
2. **Up to 2 habit rows** (same `HabitRow`, optional `compact` variant)
3. **`+N more`** control — expands **that section only** without changing rail focus

### Action strip (mix of A)

Single horizontal bar under page title (not three separate banners):

| Signal | Source (existing where possible) | CTA |
|--------|----------------------------------|-----|
| Due today | `HabitsDueSoonWidget` logic / habit notifications | `/today?identity={id}` or all |
| Streak at risk | `getHabitNotifications` | Row schedule rescue or Today |
| Unscheduled this week | habits without upcoming blocks | Bulk schedule / Assistant prefilled prompt |

Replace standalone: `FlowSchedulingBanner`, always-visible `StreakReminderBanner` / `MissedHighPriorityBanner` on page load (content can feed strip + Insights drawer).

### Evolution sidebar (desktop)

- **lg+:** Right column — `IdentityProgressionSidebar` scoped to **focused identity**; when **All**, show compact multi-identity summary (trials active, next stage-up).
- **Mobile:** No third column; stage/trial in section header; **Progress** opens bottom sheet (evolution + XP + next unlock).

### Mobile

- Identity rail → **horizontal sticky scroller** under action strip.
- Same collapse/preview rules; touch targets ≥ 44px on row actions.
- Add habit → full-screen sheet.

---

## Habit row (`HabitRow` — new component)

Replace default list rendering of bloated `HabitCard` for studio list. Keep `HabitCard` or scheduling primitives only where needed (popover/slot picker).

**Target height:** ~52px desktop; ~56px mobile.

```
[status]  Title                    meta              streak   next        [⋯]
          Morning run              Daily · 30m · AM   🔥 12    Today 7a    Schedule▾
```

| Column | Rules |
|--------|--------|
| Status | `done_today` \| `scheduled` \| `open` \| `at_risk` — **real API data** (Phase 3) |
| Title | `habit.title` |
| Meta | frequency, duration, preferred time-of-day |
| Streak | Show if `> 0` or at risk; hide otherwise |
| Next | Next calendar occurrence or “Not scheduled” |
| Actions | Schedule → `TimeSlotPicker` in popover; ⋯ menu → Edit sheet, Delete, Move to identity |

**Not on default row:** inline `IdentitySelector` (section implies identity), long description, why/goal text, gradient card chrome.

**Reorder:** Drag handle within **expanded** section only; `priorityRank` persisted via existing reorder API.

**Move identity:** ⋯ → “Move to…” → identity picker (updates `identityId`).

---

## Add / edit habits

### Create

- Header **`+ Habit`**; if rail has focused identity, pre-fill `identityId`.
- Per-section **`+ Add to {Identity}`** at section footer.
- **Sheet / modal** (not inline page form):
  - **Step 1 (required):** title, frequency, days (if weekly), duration, time-of-day, identity (pre-filled).
  - **Step 2 (collapsed):** description, long-term goal, why statement.
- Remove from page scroll: current inline `Panel` add form in `habits/page.tsx`.

### Edit

- ⋯ → **Edit** opens same sheet with habit loaded.
- Notification prefs: per-habit toggles in sheet **or** link to Settings → Habit Notifications (remove inline `HabitNotificationPrefs` block from page).

---

## Insights & Flow coach

| Current | New |
|---------|-----|
| Flow coach hero (`FlowMascot` gradient panel) | First-visit coachmark only, or first item in Insights drawer |
| `HabitsInsights` on page load | **Insights drawer** — global (header) or per-identity (section link) |
| `CoachCard` + `Recommendations` | Inside drawer; filtered by `identityId` when opened from section |
| `HabitNotificationPrefs` | Settings + edit sheet |

Drawer sections: adherence summary, recommendations, streak/missed (scoped), link “Open on Today.”

---

## Integration with Today & Calendar

| Studio action | Behavior |
|---------------|----------|
| “N due today” | Navigate to Today with optional `identity` query |
| Complete habit | **Not** on studio list in v1 — user completes on Today |
| Schedule row | Existing `commit-schedule` / slot picker |
| “Schedule all for {identity}” | Action strip → bulk flow or Assistant with `Schedule {identity} habits for this week` |

**Today page:** No structural change required; ensure `?identity=` filter is honored when linked from studio (verify existing `identityFilter` on Today).

**Analytics:** Extend events with `surface: 'identity_studio'`, `layout: 'stacked_focus'`, `identity_id` (hashed where needed).

---

## Data & API requirements

### Phase 1–2 (mostly frontend)

- Group habits by `identityId` (existing page logic).
- Rail focus/collapse state (client only).
- Sheet CRUD via existing `useHabits` / `api` helpers.

### Phase 3 (row truth)

| Field | Source |
|-------|--------|
| completedToday | habit completions API / Today parity |
| scheduledForToday, next start | calendar events or habit schedule endpoints |
| currentStreak, streakAtRisk | `getHabitInsights` / notifications |
| week progress `X/Y` | `GET /api/habits/consistency` per identity (reuse Identity Panel work) or insights summary |

**Remove** mock status object in `HabitCard` when `HabitRow` owns status.

### Optional new endpoint (if consistency per identity is N+1)

- `GET /api/identities/:id/habit-status?date=` — batch status for all habits under identity for studio rows.  
- **Alternative:** single `GET /api/habits/studio-summary` returning grouped row DTOs.  
- Decision during implementation plan — prefer extending existing insights/consistency endpoints before new surface.

---

## Component map

| Component | Action |
|-----------|--------|
| `apps/web/src/app/habits/page.tsx` | Orchestrator: rail, strip, sections, focus state; shrink from ~970 lines |
| `IdentityStudioRail` (new) | Rail pills, All/focus, scroll-into-view |
| `IdentityStudioSection` (new) | Wraps `IdentityHabitGroup` + collapse/preview logic |
| `HabitRow` (new) | Compact list row |
| `HabitEditSheet` (new) | Add/edit modal |
| `IdentityStudioActionStrip` (new) | Aggregates due/at-risk/unscheduled |
| `IdentityStudioInsightsDrawer` (new) | Hosts slimmed `HabitsInsights` |
| `IdentityHabitGroup` | Tighter styles; delegate body to `HabitRow` |
| `IdentityProgressionSidebar` | Scope to focused identity; summary when All |
| `HabitCard` | Deprecate for studio list; keep scheduling sub-UI if extracted |
| `SortableHabitCard` | Wrap `HabitRow` + dnd handle |
| `Layout.tsx` | Nav label: `Identity Studio`, href `/habits` |

---

## Visual & density guidelines

- **Section header:** `py-2.5 px-3`, single-line title, no large gradient panels on default load.
- **Section container:** light border, subtle identity color accent (left strip only) — reduce `rounded-2xl` + heavy shadows from current groups.
- **Spacing between sections:** `gap-3` not `gap-6`.
- **Typography:** Page title `Identity Studio`; section titles `text-sm font-semibold`.
- **Theme:** Follow `docs/THEME_AND_SHORTCUTS.md` tokens; no new one-off gradient heroes.

---

## Phased rollout

### Phase 1 — Structure & branding (ship first)

- [ ] Nav + page header rebrand to Identity Studio; subtitle about habits.
- [ ] Remove/hide on load: coach hero, inline notification prefs, full `HabitsInsights`.
- [ ] Add `IdentityStudioRail` + stacked sections (always expanded) — refactor `habits/page.tsx` layout.
- [ ] Action strip shell (static placeholders OK if data wired in Phase 3).

**DoD:** Page loads faster visually; identities + habits readable in one scroll; no regression to CRUD.

### Phase 2 — Density & focus hybrid

- [ ] `HabitRow` + `HabitEditSheet`; remove inline add form.
- [ ] Rail focus: scroll-into-view, collapse peers with **2-row preview + `+N more`**.
- [ ] Drag reorder within section; `+ Add to {identity}`.
- [ ] Insights drawer (relocate `HabitsInsights`).

**DoD:** Add/edit habit via sheet; focus mode matches spec; list ~50% less vertical space per habit.

### Phase 3 — Live status & strip CTAs

- [ ] Wire row status, streaks, next scheduled from APIs.
- [ ] Action strip live counts + working links to Today / schedule / assistant.
- [ ] Remove `HabitCard` mock status; delete or narrow `HabitCard` usage.

**DoD:** Strip and rows reflect real day; user can act without opening Today first.

### Phase 4 — Polish

- [ ] Move habit across identities from ⋯ menu.
- [ ] Evolution sidebar summary when All; mobile Progress sheet.
- [ ] First-visit coachmark; analytics events; empty states per identity.
- [ ] Update tests: `IdentityHabitGroup`, habits page integration, new rail/focus tests.

---

## Success metrics

| Metric | Target |
|--------|--------|
| Time to first habit visible (LCP perception) | Fewer panels above fold |
| Habits page bounce without action | Decrease after Phase 2 |
| Clicks to Today from studio | Increase (intentional routing) |
| Habit create completion rate | Maintain or improve (shorter step 1) |
| Support burden “where do I manage habits?” | Decrease via clear Studio framing |

---

## Risks & mitigations

| Risk | Mitigation |
|------|------------|
| Users miss coach/insights | Drawer badge when recommendations exist |
| Focus mode confuses “where did habits go?” | `+N more` + collapsed previews always show 2 rows |
| Breaking drag-and-drop | Keep `@dnd-kit` per section; test reorder |
| N+1 API calls for row status | Batch endpoint or studio-summary in Phase 3 plan |
| Nav rename confusion | One release note; subtitle mentions habits |

---

## Open decisions (resolve in implementation plan)

1. **Batch status API** — extend consistency vs new `studio-summary` (recommend: one batched call per page load).
2. **Assistant deep link** — query param contract for pre-filled scheduling prompts.
3. **Whether `HabitCard` is deleted or only used in calendar sidebar** — audit usages before delete.

---

## Implementation

See **[`2026-06-01-identity-studio-habits-implementation-plan.md`](./2026-06-01-identity-studio-habits-implementation-plan.md)** (Phases 1–4, Tasks 1.1–4.5).

**User confirmation captured:** Layout = stacked sections (3) + rail focus (1); collapsed peers = header + 2 preview rows + `+N more` (B); product name = **Identity Studio** with habits inside; nav label **Identity Studio** → `/habits`.
