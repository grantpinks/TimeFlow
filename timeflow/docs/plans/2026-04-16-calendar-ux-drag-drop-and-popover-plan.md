# Calendar UX Drag/Drop + Popover Reliability Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Make calendar interaction feel intuitive and reliable by fixing popover layering, improving drag/drop accuracy/smoothness, and shipping a persisted drag behavior preference (default: instant schedule + 5s undo).

**Architecture:** Keep `react-big-calendar` + `dnd-kit`, but harden integration boundaries: (1) popover renders in a top-level portal layer, (2) drag logic is source-aware and pointer-robust, (3) scheduling mode is user-configurable via persisted user preferences. Existing schedule APIs remain unchanged; UX flow changes happen in web app state/interaction layer.

**Tech Stack:** Next.js, React, TypeScript, `react-big-calendar`, `@dnd-kit/core`, Framer Motion, shared user types, Fastify + Prisma user preferences endpoint.

---

### Task 1: Add persisted calendar drag behavior preference (Settings-first)

**Files:**
- Modify: `timeflow/packages/shared/src/types/user.ts`
- Modify: `timeflow/apps/backend/prisma/schema.prisma`
- Create: `timeflow/apps/backend/prisma/migrations/<timestamp>_add_calendar_drag_mode/migration.sql`
- Modify: `timeflow/apps/backend/src/controllers/userController.ts`
- Modify: `timeflow/apps/web/src/app/settings/page.tsx`

**Step 1: Add shared preference type**
- Add union type: `calendarDragDropMode?: 'instant' | 'confirm'` to `UserProfile` and `UserPreferencesUpdate`.

**Step 2: Add DB column and migration**
- Add `calendarDragDropMode String @default("instant")` to `User` model in Prisma schema.
- Generate migration SQL.

**Step 3: Wire backend validation + persistence**
- In `preferencesSchema`, add enum validation for `calendarDragDropMode`.
- Include field in `GET /api/user/me` response.
- Include field in PATCH update payload mapping.

**Step 4: Add settings UI control**
- In Settings page, add a Calendar section radio/select:
  - `Instant schedule on drop (recommended)`
  - `Require confirmation before scheduling`
- Initialize from `user` and include in `updatePreferences` payload.

**Step 5: Verify API round-trip**
- Run backend typecheck and a quick manual check that preference persists after reload.

---

### Task 2: Fix event popover layering and clickability over dense events

**Files:**
- Modify: `timeflow/apps/web/src/components/EventDetailPopover.tsx`
- Modify: `timeflow/apps/web/src/app/globals.css`
- Test: `timeflow/apps/web/src/components/__tests__/EventDetailPopover.test.tsx`

**Step 1: Render popover in a portal**
- Use `createPortal(..., document.body)` when open.
- Keep existing positioning logic, but ensure it uses viewport coordinates safely.

**Step 2: Raise popover stacking context**
- Increase popover layer to a top app overlay level (e.g. > calendar event hover layer).
- Ensure no parent overflow clips the popover.

**Step 3: Reduce event z-index interference**
- Tame/remove aggressive `.rbc-event:hover` / `.rbc-selected` z-index escalation that can cover popover controls.

**Step 4: Add regression assertions**
- Add/extend test to verify action controls are interactable when popover is open.

---

### Task 3: Make drag start intentional for existing scheduled events

**Files:**
- Modify: `timeflow/apps/web/src/components/CalendarView.tsx`
- Modify: `timeflow/apps/web/src/app/globals.css` (if needed for handle affordance)

**Step 1: Add dedicated drag handle UI**
- For scheduled task/habit events, render a clear drag handle region/icon.
- Attach `useDraggable` listeners/attributes to handle only (not full card body).

**Step 2: Keep click-to-open behavior stable**
- Event body click should open top event popover directly.
- Drag handle should not trigger popover open.

**Step 3: Improve drag visual smoothness**
- Disable hover scaling/transitions while drag is active.
- Preserve resize affordance behavior for tasks.

---

### Task 4: Improve drop targeting reliability and instant-drop flow

**Files:**
- Modify: `timeflow/apps/web/src/app/calendar/page.tsx`
- Modify: `timeflow/apps/web/src/app/calendar/calendarDragUtils.ts` (if helper needed)
- Test: `timeflow/apps/web/src/app/calendar/__tests__/calendarDragUtils.test.ts`

**Step 1: Robust drop target derivation**
- Keep current slot-based logic, but add fallback when `over` is null or over an event node:
  - derive nearest slot start from pointer coordinates and current calendar view geometry.

**Step 2: Use preference-driven behavior**
- If mode is `instant`: schedule immediately on drop.
- If mode is `confirm`: keep existing preview confirmation flow.

**Step 3: Add 5-second undo for instant mode**
- After successful instant schedule/reschedule, show undo toast.
- Undo action should restore prior state using available APIs:
  - unscheduled task from newly scheduled slot, or
  - move task/habit back to previous time for reschedules.

**Step 4: Keep DnD state cleanup deterministic**
- Always clear active drag/preview state in success/failure/cancel paths.

---

### Task 5: Add/extend tests for critical UX regressions

**Files:**
- Modify: `timeflow/apps/web/src/app/calendar/__tests__/calendar-edit-modal.test.tsx`
- Modify/Create: calendar DnD interaction test file(s) under `timeflow/apps/web/src/app/calendar/__tests__/`
- Modify: `timeflow/apps/web/src/components/__tests__/EventDetailPopover.test.tsx`

**Step 1: Popover layering test coverage**
- Assert popover renders at top layer and remains actionable.

**Step 2: Drag intent coverage**
- Assert dragging requires handle for scheduled events.
- Assert event body click still opens popover.

**Step 3: Instant mode behavior coverage**
- Assert drop triggers scheduling immediately.
- Assert undo control appears and works within 5 seconds.

---

### Task 6: Verification checklist before merge

**Files:**
- N/A (execution + QA)

**Step 1: Automated checks**
- Run targeted tests:
  - `pnpm -C apps/web exec vitest run src/components/__tests__/EventDetailPopover.test.tsx`
  - `pnpm -C apps/web exec vitest run src/app/calendar/__tests__/calendarDragUtils.test.ts`
  - `pnpm -C apps/web exec vitest run src/app/calendar/__tests__/calendar-edit-modal.test.tsx`
- Run web typecheck (acknowledge unrelated existing failures if present).

**Step 2: Manual QA (required)**
- Dense overlap: click event, popover controls fully clickable.
- Scheduled event drag: only handle initiates drag.
- Unscheduled task drop in instant mode: schedules immediately + undo for 5s.
- Switch preference to confirm mode: old preview confirmation flow works.

**Step 3: Analytics sanity**
- Confirm no double-fire of schedule/reschedule tracking events in drag flows.

---

## Out-of-scope for this pass
- Building an overlap event picker list.
- Mobile-specific drag UX redesign.
- Replacing `react-big-calendar`.

## Risk notes
- Portal layering can break click-outside logic if refs are not updated correctly.
- Undo for habit/task reschedules requires accurate pre-drop snapshot; capture this at drag start.
- Coordinate-based fallback drop detection must be throttled to avoid jank.
