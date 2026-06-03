# Identity Studio (Habits Inside) — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Rebrand `/habits` as **Identity Studio** — identity-first stacked sections, rail focus with 2-row collapsed previews, compact habit rows, sheet CRUD, action strip + insights drawer, live row status via batched API.

**Architecture:** New studio components under `apps/web/src/components/identity-studio/`; slim `habits/page.tsx` orchestrator; reuse `IdentityHabitGroup`, evolution hooks, `getHabitInsights` / notifications; add `GET /api/habits/studio-summary` to avoid N+1 consistency calls. Today deep-links via `?identity=` (add if missing).

**Tech Stack:** Next.js 14 App Router, React, Tailwind, `@dnd-kit`, Framer Motion (existing), Vitest + Testing Library, Fastify backend, `@timeflow/shared` DTOs.

**Design doc:** [`2026-06-01-identity-studio-habits-design.md`](./2026-06-01-identity-studio-habits-design.md)  
**Roadmap:** `ARCHITECT_ROADMAP_SPRINT1-17.md` — **Sprint 28**

---

## Reference: Key files

| File | Role |
|------|------|
| `apps/web/src/app/habits/page.tsx` | Page orchestrator (shrink) |
| `apps/web/src/components/Layout.tsx` | Nav label → Identity Studio |
| `apps/web/src/components/habits/IdentityHabitGroup.tsx` | Section chrome (tighten) |
| `apps/web/src/components/habits/HabitCard.tsx` | Legacy card; mock status — narrow usage |
| `apps/web/src/components/habits/SortableHabitCard.tsx` | DnD wrapper — retarget to `HabitRow` |
| `apps/web/src/components/habits/HabitsInsights.tsx` | Move into drawer |
| `apps/web/src/components/today/HabitsDueSoonWidget.tsx` | Reference for due-today logic |
| `apps/web/src/lib/api.ts` | Client API + new `getStudioSummary` |
| `apps/backend/src/routes/habitRoutes.ts` | Register `studio-summary` |
| `apps/backend/src/services/habitInsightsService.ts` | Insights data reuse |
| `packages/shared/src/types/habit.ts` (or identity) | `StudioSummary` DTO |

---

## Locked decisions

| # | Decision |
|---|----------|
| 1 | **Batch API:** `GET /api/habits/studio-summary` — one call per page load (habits + per-habit status + strip counts). |
| 2 | **Nav:** Label **Identity Studio**, href `/habits` unchanged. |
| 3 | **`HabitCard`:** Keep file for calendar sidebar / legacy; studio list uses `HabitRow` only. |
| 4 | **Assistant link:** `/assistant?prompt=` URL-encoded bulk schedule (Phase 3). |
| 5 | **Today filter:** `/today?identity={id}` sets `identityFilter` on mount (Phase 3). |

---

## Phase 1 — Structure & branding

**Sprint tasks:** 28.1–28.5  
**DoD:** Studio layout visible; no coach hero / inline insights / inline prefs on load; CRUD still works via existing inline form until Phase 2.

### Task 1.1: Nav and page header rebrand

**Files:**
- Modify: `apps/web/src/components/Layout.tsx`
- Modify: `apps/web/src/app/habits/page.tsx`

**Step 1:** In `Layout.tsx`, change nav item `label: 'Habits'` → `'Identity Studio'` (keep `href: '/habits'`).

**Step 2:** In `page.tsx`, update `SectionHeader`:
- `title="Identity Studio"`
- `subtitle="Build your identities through the habits that shape them."`
- Remove outdated file comment (“Simple CRUD… future sprint”).

**Step 3:** Run web build:

```bash
cd timeflow && pnpm --filter @timeflow/web build
```

Expected: PASS

**Step 4:** Commit

```bash
git add apps/web/src/components/Layout.tsx apps/web/src/app/habits/page.tsx
git commit -m "feat(studio): rebrand Habits nav and page header to Identity Studio"
```

---

### Task 1.2: Remove heavy panels from default page load

**Files:**
- Modify: `apps/web/src/app/habits/page.tsx`

**Step 1:** Delete or gate behind `false` / remove imports:
- Flow coach hero block (`FlowMascot` gradient panel, ~lines 628–656)
- `<HabitNotificationPrefs />` inline block
- `<HabitsInsights />` on page load

**Step 2:** Add header action placeholder: `Insights` button (disabled or `onClick` → `console` until Task 2.4 wires drawer).

**Step 3:** Manual check: load `/habits` — identities + habit list visible without scrolling past banners.

**Step 4:** Commit

```bash
git commit -m "feat(studio): hide coach hero, inline insights, and notification prefs on load"
```

---

### Task 1.3: `IdentityStudioRail` component

**Files:**
- Create: `apps/web/src/components/identity-studio/IdentityStudioRail.tsx`
- Create: `apps/web/src/components/identity-studio/__tests__/IdentityStudioRail.test.tsx`
- Create: `apps/web/src/components/identity-studio/types.ts`

**Step 1:** Write failing test — clicking identity calls `onFocusChange(id)`, clicking same id again calls `onFocusChange(null)` (All).

```tsx
import { render, screen, fireEvent } from '@testing-library/react';
import { IdentityStudioRail } from '../IdentityStudioRail';

const identities = [
  { id: 'id-1', name: 'Athlete', icon: '🏃', color: '#0ea5e9' },
] as any[];

it('focuses identity then clears on second click', () => {
  const onFocusChange = vi.fn();
  render(
    <IdentityStudioRail
      identities={identities}
      unassignedCount={0}
      focusedIdentityId={null}
      onFocusChange={onFocusChange}
    />
  );
  fireEvent.click(screen.getByRole('button', { name: /athlete/i }));
  expect(onFocusChange).toHaveBeenCalledWith('id-1');
  // ... second click → null
});
```

**Step 2:** Run test — expect FAIL.

```bash
cd timeflow/apps/web && pnpm exec vitest run src/components/identity-studio/__tests__/IdentityStudioRail.test.tsx
```

**Step 3:** Implement rail: pills **All**, each identity (icon + name + count), **Unassigned** if count > 0. Props: `focusedIdentityId`, `onFocusChange`, `habitCountByIdentityId`, optional `pulseByIdentityId`.

**Step 4:** Test PASS; commit.

---

### Task 1.4: `IdentityStudioSection` + wire page layout

**Files:**
- Create: `apps/web/src/components/identity-studio/IdentityStudioSection.tsx`
- Create: `apps/web/src/components/identity-studio/IdentityStudioPageLayout.tsx`
- Modify: `apps/web/src/app/habits/page.tsx`

**Step 1:** `IdentityStudioSection` props:
- `identity`, `habits`, `evolution`, `expansion: 'full' | 'collapsed-preview' | 'collapsed-header'`
- `previewRowCount = 2`
- `onExpandSection` when user clicks `+N more`
- `sectionRef` for scroll-into-view

**Step 2:** Collapsed-preview mode: render header + first 2 children + `+{n} more` button.

**Step 3:** `IdentityStudioPageLayout`: grid with rail (desktop left), main stack, optional right slot for sidebar.

**Step 4:** Refactor `page.tsx` to use layout + rail; state:
```ts
const [focusedIdentityId, setFocusedIdentityId] = useState<string | null>(null);
const [expandedSectionKeys, setExpandedSectionKeys] = useState<Set<string>>(new Set());
```
- `focusedIdentityId === null` → all sections `full`
- focused id → that section `full`, others `collapsed-preview` unless key in `expandedSectionKeys`

**Step 5:** `useEffect` on focus: `sectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })`

**Step 6:** Commit.

---

### Task 1.5: Tighten `IdentityHabitGroup` styles

**Files:**
- Modify: `apps/web/src/components/habits/IdentityHabitGroup.tsx`
- Modify: `apps/web/src/components/habits/__tests__/IdentityHabitGroup.test.tsx`

**Step 1:** Reduce padding/shadow: `rounded-xl`, `py-2.5 px-3` header, `gap-3` body.

**Step 2:** Add optional `compact` prop — smaller header typography.

**Step 3:** Update tests if class names asserted; run:

```bash
cd timeflow/apps/web && pnpm exec vitest run src/components/habits/__tests__/IdentityHabitGroup.test.tsx
```

**Step 4:** Commit.

---

### Task 1.6: Action strip shell

**Files:**
- Create: `apps/web/src/components/identity-studio/IdentityStudioActionStrip.tsx`
- Modify: `apps/web/src/app/habits/page.tsx`

**Step 1:** Strip UI with three slots: `dueToday`, `atRisk`, `unscheduled` (numbers hardcoded `—` or `0` until Phase 3).

**Step 2:** Place below page header, above rail/sections.

**Step 3:** Commit Phase 1 complete.

---

## Phase 2 — Density & focus

**Sprint tasks:** 28.6–28.12  
**DoD:** `HabitRow` + sheet CRUD; insights drawer; no inline add form; focus/collapse behavior tested.

### Task 2.1: `HabitRow` component

**Files:**
- Create: `apps/web/src/components/identity-studio/HabitRow.tsx`
- Create: `apps/web/src/components/identity-studio/__tests__/HabitRow.test.tsx`
- Create: `apps/web/src/components/identity-studio/HabitRowMenu.tsx`

**Step 1:** Test renders title, meta (`Daily · 30m`), hides streak when 0.

**Step 2:** Implement row columns per design; `variant?: 'default' | 'compact'`.

**Step 3:** `HabitRowMenu`: Edit, Delete, Move to identity (Move stub OK until Phase 4).

**Step 4:** Extract schedule trigger — reuse `TimeSlotPicker` from `components/habits/TimeSlotPicker.tsx` in popover.

**Step 5:** Commit.

---

### Task 2.2: `SortableHabitRow` (replace card in list)

**Files:**
- Create: `apps/web/src/components/identity-studio/SortableHabitRow.tsx`
- Modify: `apps/web/src/components/habits/SortableHabitCard.tsx` — deprecate or re-export wrapper

**Step 1:** Copy dnd pattern from `SortableHabitCard.tsx` but render `HabitRow` + drag handle.

**Step 2:** Wire `page.tsx` `renderHabitRow` to `SortableHabitRow`.

**Step 3:** Restrict `DndContext` to **one section at a time** (one context per expanded group) OR single context with items only from expanded section — prefer **per-section** context to avoid cross-group drag bugs.

**Step 4:** Commit.

---

### Task 2.3: `HabitEditSheet`

**Files:**
- Create: `apps/web/src/components/identity-studio/HabitEditSheet.tsx`
- Modify: `apps/web/src/app/habits/page.tsx`

**Step 1:** Sheet with Step 1 fields: title, frequency, days, duration, time-of-day, `IdentitySelector`.

**Step 2:** Collapsible Step 2: description, longTermGoal, whyStatement.

**Step 3:** Props: `open`, `mode: 'create' | 'edit'`, `initialIdentityId`, `habit?`, `onSave`, `onClose`.

**Step 4:** Remove inline add `Panel` and inline edit UI from `page.tsx`; header `+ Habit` opens sheet with `initialIdentityId = focusedIdentityId`.

**Step 5:** Section footer `+ Add to {name}` opens sheet with identity pre-filled.

**Step 6:** Manual test create/edit/delete; commit.

---

### Task 2.4: `IdentityStudioInsightsDrawer`

**Files:**
- Create: `apps/web/src/components/identity-studio/IdentityStudioInsightsDrawer.tsx`
- Modify: `apps/web/src/components/habits/HabitsInsights.tsx`
- Modify: `apps/web/src/app/habits/page.tsx`

**Step 1:** Add prop to `HabitsInsights`: `filterIdentityId?: string | null`.

**Step 2:** Drawer: slide-over; hosts `HabitsInsights`; badge on header when recommendations exist (use existing insights fetch on drawer open only).

**Step 3:** Per-section link “Insights” passes `filterIdentityId`.

**Step 4:** Remove `FlowSchedulingBanner` from page — strip replaces in Phase 3.

**Step 5:** Commit.

---

### Task 2.5: Focus mode integration tests

**Files:**
- Create: `apps/web/src/components/identity-studio/__tests__/IdentityStudioSection.test.tsx`

**Step 1:** Test collapsed-preview shows 2 rows and `+N more`.

**Step 2:** Test `+N more` calls `onExpandSection` without changing focus.

**Step 3:** Run web habit-related tests:

```bash
cd timeflow/apps/web && pnpm exec vitest run src/components/identity-studio src/components/habits/__tests__/IdentityHabitGroup.test.tsx
```

**Step 4:** Commit Phase 2.

---

## Phase 3 — Live status & action strip

**Sprint tasks:** 28.13–28.18  
**DoD:** Rows and strip use real data; Today `?identity=` works.

### Task 3.1: Shared `StudioSummary` DTO

**Files:**
- Modify: `packages/shared/src/types/habit.ts` (or add `packages/shared/src/types/studio.ts` + export from index)

**Step 1:** Add types:

```typescript
export type HabitRowStatus = 'done_today' | 'scheduled' | 'open' | 'at_risk';

export interface StudioHabitRowStatus {
  habitId: string;
  status: HabitRowStatus;
  currentStreak: number;
  streakAtRisk: boolean;
  nextStart: string | null; // ISO
  completedToday: boolean;
}

export interface StudioSummaryResponse {
  rows: StudioHabitRowStatus[];
  strip: {
    dueTodayCount: number;
    atRiskCount: number;
    unscheduledWeekCount: number;
  };
  weekProgressByIdentityId: Record<string, { completed: number; target: number }>;
}
```

**Step 2:** Build shared package if needed: `pnpm --filter @timeflow/shared build`

**Step 3:** Commit.

---

### Task 3.2: `habitStudioSummaryService` + route

**Files:**
- Create: `apps/backend/src/services/habitStudioSummaryService.ts`
- Create: `apps/backend/src/services/__tests__/habitStudioSummaryService.test.ts`
- Modify: `apps/backend/src/routes/habitRoutes.ts`
- Modify: `apps/backend/src/controllers/habitController.ts` (or inline handler)

**Step 1:** Write failing test: user with 2 habits returns `rows.length === 2` and `strip` counts.

**Step 2:** Implement service:
- Load user habits (active)
- Reuse completion logic from `habitInsightsService` / notifications for streak + at risk
- Calendar/habit events for `nextStart` and `dueTodayCount` (same rules as `HabitsDueSoonWidget` + unscheduled heuristic from insights)
- `weekProgressByIdentityId` from completion counts vs expected frequency in 7d window

**Step 3:** Register `GET /api/habits/studio-summary` authenticated.

**Step 4:** Run backend tests:

```bash
cd timeflow/apps/backend && pnpm exec vitest run src/services/__tests__/habitStudioSummaryService.test.ts
```

**Step 5:** Commit.

---

### Task 3.3: Frontend `getStudioSummary` + hook

**Files:**
- Modify: `apps/web/src/lib/api.ts`
- Create: `apps/web/src/hooks/useStudioSummary.ts`

**Step 1:** `getStudioSummary(): Promise<StudioSummaryResponse>`

**Step 2:** Hook: fetch on mount + refetch on window focus; map `rows` by `habitId` for `HabitRow`.

**Step 3:** Pass status into `HabitRow` from page.

**Step 4:** Commit.

---

### Task 3.4: Wire action strip CTAs

**Files:**
- Modify: `apps/web/src/components/identity-studio/IdentityStudioActionStrip.tsx`
- Modify: `apps/web/src/app/today/page.tsx`

**Step 1:** Due today → `Link href="/today"` or `/today?identity=${focusedIdentityId}` when focused.

**Step 2:** At risk → open insights drawer filtered OR schedule rescue for first at-risk habit.

**Step 3:** Unscheduled → `Link href="/assistant?prompt=Schedule%20my%20habits%20for%20this%20week"` (encodeURIComponent).

**Step 4:** Today page: read `useSearchParams().get('identity')` on mount → `setIdentityFilter(id)` if valid.

**Step 5:** Test Today filter manually; commit.

---

### Task 3.5: Section header week progress

**Files:**
- Modify: `apps/web/src/components/identity-studio/IdentityStudioSection.tsx`
- Modify: `apps/web/src/components/habits/IdentityHabitGroup.tsx`

**Step 1:** Display `completed/target` from `weekProgressByIdentityId[identityId]`.

**Step 2:** Commit Phase 3.

---

## Phase 4 — Polish

**Sprint tasks:** 28.19–28.23

### Task 4.1: Move habit across identities

**Files:**
- Modify: `apps/web/src/components/identity-studio/HabitRowMenu.tsx`
- Use: `updateHabit` from `useHabits`

**Step 1:** “Move to…” submenu lists identities; call `updateHabit(id, { identityId })`.

**Step 2:** Commit.

---

### Task 4.2: Evolution sidebar scoping + mobile Progress sheet

**Files:**
- Modify: `apps/web/src/components/habits/IdentityProgressionSidebar.tsx`
- Create: `apps/web/src/components/identity-studio/IdentityStudioProgressSheet.tsx`
- Modify: `apps/web/src/components/identity-studio/IdentityStudioPageLayout.tsx`

**Step 1:** Sidebar accepts `focusedIdentityId`; when null show multi-identity summary (trials count, next stage).

**Step 2:** Mobile: hide sidebar column; section header “Progress” opens sheet with same content.

**Step 3:** Commit.

---

### Task 4.3: First-visit coachmark + analytics

**Files:**
- Create: `apps/web/src/components/identity-studio/IdentityStudioCoachmark.tsx`
- Modify: `apps/web/src/lib/analytics.ts`
- Modify: `apps/web/src/app/habits/page.tsx`

**Step 1:** localStorage key `tf_studio_coachmark_seen`; one-time tooltip near rail.

**Step 2:** Add events: `studio.view`, `studio.focus_identity`, `studio.insights_open`, `studio.today_link` with hashed identity id.

**Step 3:** Commit.

---

### Task 4.4: Empty states per identity

**Files:**
- Modify: `apps/web/src/components/identity-studio/IdentityStudioSection.tsx`

**Step 1:** Zero habits: copy + `+ Add habit to {name}` CTA.

**Step 2:** Commit.

---

### Task 4.5: Final QA + doc update

**Files:**
- Modify: `docs/plans/2026-06-01-identity-studio-habits-design.md` (status → Implemented)
- Modify: `ARCHITECT_ROADMAP_SPRINT1-17.md` (Sprint 28 checkboxes)

**Step 1:** Run verification:

```bash
cd timeflow/apps/web && pnpm exec vitest run src/components/identity-studio
cd timeflow/apps/backend && pnpm exec vitest run src/services/__tests__/habitStudioSummaryService.test.ts
pnpm --filter @timeflow/web build
pnpm --filter @timeflow/backend build
```

**Step 2:** Manual QA checklist:
- [ ] Nav says Identity Studio
- [ ] Rail focus + 2-row preview + `+N more`
- [ ] Create/edit habit via sheet
- [ ] Insights drawer opens; not on initial load
- [ ] Strip counts match reality
- [ ] `/today?identity=` filters Today

**Step 3:** Commit; close Sprint 28 in roadmap.

---

## Execution handoff

**Plan saved:** `docs/plans/2026-06-01-identity-studio-habits-implementation-plan.md`

**Execution options:**

1. **Subagent-driven (this session)** — one task at a time with review  
2. **Parallel session** — new worktree + `executing-plans` skill  

**Recommended order:** Phase 1 → 2 → 3 → 4 (ship Phase 1–2 as first PR if needed).
