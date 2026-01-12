# Flow AI Habit Scheduling Reliability Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** eliminate the internal server error when Flow AI applies habit schedules, keep the assistant’s previews focused on the single block the user asked to move/create, surface AI-scheduled habits in the calendar view, and stabilize the TF| prefix + migration story without regressing existing flows.

**Architecture:** refine assistantService so it recognizes focused habit/reschedule requests, sanitizes schedulePreview to a single block, and feeds only that block into the UI; the calendar page will merge the dedicated scheduled-habit API (and the existing calendar merge) so the UI renders Flow AI habits alongside external events while honoring the TF| prefix; documentation/tests will describe the new guardrails and any remaining issues.

**Tech Stack:** Fastify + Prisma + Luxon + Vitest on the backend; Next.js 13 + React hooks + TypeScript + React Big Calendar on the frontend; shared DTOs in `@timeflow/shared`.

---

I'm using the writing-plans skill to create the implementation plan.

### Task 1: Root-cause the focused habit scheduling failure & guard the preview

**Files:**
- `timeflow/apps/backend/src/services/assistantService.ts:1268-1345` (flow that parses assistant responses and sanitizes schedulePreview)
- `timeflow/apps/backend/src/services/__tests__/assistantService.test.ts` (coverage for schedulePreview filtering)
- `timeflow/apps/web/src/app/assistant/page.tsx:350-420` (schedule preview UI + Flow AI call)
- `timeflow/apps/web/src/components/SchedulePreviewCard.tsx:1-140` (renders preview blocks)

**Step 1: Write the failing test.**
Add a Vitest case inside `assistantService.test.ts` that simulates “reschedule Deep Work to 1pm Monday” (reuse `parseResponse` helpers) and asserts `schedulePreview.blocks` only contains the targeted block and that helper logs a `scheduledHabitInstances` payload (or undefined guard) so we reproduce the ReferenceError.

**Step 2: Run the suite to document failure.**
Command: `pnpm --filter timeflow test -- assistantService --runInBand`
Expected: the new test fails because schedulePreview still emits the full-week blocks or `scheduledHabitInstances` reference is undefined.

**Step 3: Implement the minimal fix.**
- In `assistantService.ts`, derive `focusedHabitId`/`focusedTaskId` when the user asks for “1 event,” skip `fillMissingHabitBlocks` when focused, and call `filterSchedulePreviewForFocusedHabits(schedulePreview, focusedIds)` to remove every block except the one whose ID/time matches the request.
- Make `filterSchedulePreviewForFocusedHabits` export a sanitized preview + `scheduledHabitInstances` metadata so the client can unwrap it without referencing an undefined global.
- Guard the client-side preview rendering (assistant page / SchedulePreviewCard) so it gracefully handles missing `scheduledHabitInstances`.

**Step 4: Run the test again.**
Command: `pnpm --filter timeflow test -- assistantService --runInBand`
Expected: Pass.

**Step 5: Commit this section before continuing.**
`git commit -am "fix: focus Flow AI habit previews on single block"`

### Task 2: Ensure calendar view renders Flow AI habit instances without missing global variables

**Files:**
- `timeflow/apps/backend/src/controllers/calendarController.ts:60-140` (merges tasks + habits into calendar events)
- `timeflow/apps/backend/src/routes/calendarRoutes.ts` (ensures filter is hooked)
- `timeflow/apps/web/src/app/calendar/page.tsx:85-160` (calls `api.getCalendarEvents` and builds `timeflowEventIds`)
- `timeflow/apps/web/src/app/calendar/calendarEventFilters.ts:1-45` (prefix + legacy filters)
- `timeflow/apps/web/src/app/calendar/__tests__/?` (new test to assert habits survive the filter, referencing `schedulePreview` metadata if needed)

**Step 1: Add failing test for filtering habits.**
Create a unit test under `timeflow/apps/web/src/app/calendar/__tests__/calendarEventFilters.test.ts` that feeds a mix of habit events (`sourceType: 'habit'`, summary `[TimeFlow Habit]`) and external events, then ensures filtering keeps the habit events even when `timeflowEventIds` contains their Google IDs.

**Step 2: Run the browser-targeted test.**
Command: `pnpm --filter timeflow test -- calendarEventFilters`
Expected: fails because habit events are still filtered out due to missing guard or because `sourceType` not defined.

**Step 3: Update the code that hydrates the page.**
- In `calendarController.getEvents`, ensure every habit event includes `sourceType: 'habit'`, `sourceId: scheduledHabitId`, and the TF| prefix is normalized via `buildTimeflowEventDetails`.
- In `calendar/page.tsx`, call `api.getScheduledHabitInstances` when the user requests a narrower window even if `getCalendarEvents` already returns habits, and merge the result with `externalEvents` before filtering so the UI never references an undefined `scheduledHabitInstances` variable.
- Update `filterExternalEvents` so it early-returns `true` for `sourceType === 'habit'` even when the event summary still starts with legacy strings and add a safeguard `const scheduledIds = scheduledHabitInstances ?? []`.

**Step 4: Re-run the calendar filter test plus the Flow AI suite.**
Commands:
```
pnpm --filter timeflow test -- calendarEventFilters
pnpm --filter timeflow test -- assistantService --runInBand
```
Expected: Both pass.

**Step 5: Commit calendar fixes.**
`git commit -am "feat: surface Flow AI habits in calendar view safely"`

### Task 3: Stabilize the TF| prefix + migration story

**Files:**
- `timeflow/apps/backend/src/utils/timeflowEventPrefix.ts:1-120` (core helper that builds event summary + description)
- `timeflow/apps/backend/scripts/rename-timeflow-events.ts` (new script alias)
- `timeflow/apps/web/src/app/settings/page.tsx:80-160` (prefix toggles)
- `KNOWN_PROBLEMS.md` (document remaining risks)

**Step 1: Write failing prefix tests.**
Add/adjust Vitest cases under `timeflow/apps/backend/src/utils/__tests__/timeflowEventPrefix.test.ts` that cover both the default TF| prefix + habit marker and the user-toggled prefix disabled case; also assert legacy `[TimeFlow` strings are stripped (new test scaffolding may already exist).

**Step 2: Run prefix tests.**
Command: `pnpm --filter timeflow test -- timeflowEventPrefix`
Expected: fails until we update the helper/migration script.

**Step 3: Implement the TF| enforcement + script.**
- Update `buildTimeflowEventDetails` to default to `TF|` (or the user’s custom prefix) and to prevent existing `[TimeFlow Habit]` strings from leaking into `summary`.
- Adjust `rename-timeflow-events.ts` so it can be invoked via `pnpm --filter @timeflow/backend rewrite-timeflow-events -- [--dry-run]` (add entry to `timeflow/apps/backend/package.json` scripts). The script should call `buildTimeflowEventDetails` and reapply the prefix to every scheduled habit/task event for the authenticated service account (log results).
- Reflect the TF| prefix toggle on `apps/web/src/app/settings/page.tsx` (show current prefix, allow disabling) and update `KNOWN_PROBLEMS.md` with a note about rerunning the rewrite script after prefix changes.

**Step 4: Re-run prefix tests + document script.**
```
pnpm --filter timeflow test -- timeflowEventPrefix
```
Expected: tests pass and `KNOWN_PROBLEMS.md` now explains the migration step + outstanding calendar sync behavior.

**Step 5: Commit prefix stabilization.**
`git commit -am "chore: standardize TimeFlow prefix and migration script"`

### Task 4: Harden the Flow AI Manage Habits quick scheduler and token flow

**Files:**
- `timeflow/apps/web/src/app/habits/page.tsx:320-380` (Manage Habits section that renders the Flow Scheduling banner)
- `timeflow/apps/web/src/components/habits/FlowSchedulingBanner.tsx:1-220` (UI + scheduling API calls that currently use the wrong token key and schedule all habits)
- `timeflow/apps/web/src/lib/api.ts:1-220` (shared request helper that can refresh tokens and should expose scheduling helpers)
- `timeflow/apps/backend/src/controllers/habitController.ts:520-580` (bulk schedule handler that will need to forward the optional habit filter)
- `timeflow/apps/backend/src/services/bulkScheduleService.ts:1-80` (generateBulkSchedule needs a `habitIds` filter and tests to prove it)
- `timeflow/apps/backend/src/services/__tests__/bulkScheduleService.test.ts:1-180` (validate habit filtering and error handling)

**Step 1: Add failing coverage for selective habit scheduling.**
Extend `bulkScheduleService.test.ts` with a case that passes `habitIds` when calling `generateBulkSchedule` and asserts only the requested habits are returned; also cover the edge case where `habitIds` is empty or contains unknown IDs so the service throws cleanly (this mirrors the Flow AI quick scheduler constraints).

**Step 2: Update backend flow to honor habit filters.**
- Change `BulkScheduleRequest` to include `habitIds?: string[]`, filter the fetched habits and scheduler inputs so that only matching habits participate in `suggestHabitBlocks`, and throw a user-friendly error when none of the requested habits are active.
- Update `generateBulkScheduleHandler` to forward the optional `habitIds` from `request.body`.
- Ensure the service still returns the same response shape (`BulkScheduleResponse`) so the frontend does not need to change parsing.

**Step 3: Rebuild the Flow AI Manage Habits card.**
- Have `HabitsPage` pass the current `habits` array down to `FlowSchedulingBanner` so it can render the habit toggles alongside the scheduling controls.
- Refactor `FlowSchedulingBanner` to:
  - Render a multi-select control (checkbox chips or toggle list) labeled “Schedule these habits” with “Select all / clear” shortcuts; default every active habit to selected.
  - Keep the selected IDs in component state, display the count of selected habits, and disable quick scheduling when the list is empty.
  - Replace the manual `fetch` calls with wrappers from `lib/api.ts` (e.g., new `getSchedulingContext`, `generateBulkSchedule`, `commitBulkSchedule`) so every request goes through the centralized `request` helper that adds `Authorization: Bearer timeflow_token` and retries with refresh tokens.
  - Include the selected habit IDs (and `customPrompt` if future-proofed) in the `/habits/bulk-schedule` payload.
  - Update error handling to call `clearAuthToken()` and surface a “Please sign in again” message when we still see 401/invalid-token responses despite the refresh attempt.

**Step 4: Re-run targeted tests + manual flows.**
```
pnpm --filter timeflow test -- bulkScheduleService
pnpm --filter timeflow test -- assistantService --runInBand
```
Confirm the new coverage passes and that the Flow Scheduling banner can refresh the auth token (or guides the user to re-login) and still produces suggestions even when only one habit is selected.

**Step 5: Commit the quick scheduler + auth fix.**
`git commit -am "feat: let Flow AI quick scheduler target specific habits"`

### Task 5: Wrap-up documentation + verification

**Files:**
- `KNOWN_PROBLEMS.md` (add Flow AI notes, script instructions, outstanding typedFastify warnings)
- `docs/plans/2026-01-10-mock-fixtures-cleanup.md` & `docs/plans/2026-01-11-flow-ai-habit-reliability-plan.md` (reference new context)
- `timeflow/apps/backend/src/__tests__/emailDraft.e2e.test.ts` etc. (ensure mock cleanup touches referenced tests)

**Step 1:** Document what changed + remaining issues (Flow AI focus, prefix, calendar coverage) in `KNOWN_PROBLEMS.md` with file references, note that tests citing `typedFastifyMocks` still need stabilization.

**Step 2:** Run the broader backend suite to confirm no regressions.
Commands:
```
pnpm --filter timeflow test -- assistantService timeflowEventPrefix calendarEventFilters
pnpm --filter timeflow test -- --runInBand
```
Expected: passes.

**Step 3:** Update `docs/plans/2026-01-10-mock-fixtures-cleanup.md` (or create follow-up doc) describing the mock adjustments + Flow AI plan, and record that `scheduledHabitInstances` guard is pending.

**Step 4:** Wrap up: summarize work in session notes, confirm plan saved to `docs/plans/2026-01-11-flow-ai-habit-reliability-plan.md`, and decide whether to continue via subagent or new session (`superpowers:subagent-driven-development` vs `superpowers:executing-plans`).

**Step 5:** Push or share artifacts if requested.
