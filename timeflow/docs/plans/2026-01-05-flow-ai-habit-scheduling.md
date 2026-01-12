# Flow AI Habit Scheduling Hardening Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Keep Flow AI habit scheduling focused on the single block the user asked to move or create, surface AI-scheduled habits inside the Timeflow calendar, and unify the Timeflow event prefix so all new/corrected events read `TF| …` with optional user overrides.

**Architecture:** The assistant service will decide when the user only wants one habit block or a reschedule change, skipping automatic habit-fill heuristics and only returning the target block so Flow AI is predictable. The calendar UI will combine scheduled habit instances with external events so habits show up natively, and backend helpers will ensure the canonical prefix is applied before pushing to Google Calendar (with a script for migrating legacy events).

**Tech Stack:** Fastify + Prisma + Luxon + Vitest on the backend; Next.js 13 + React hooks + TypeScript on the frontend; shared DTOs live in `@timeflow/shared`.

---

I'm using the writing-plans skill to create the implementation plan.

### Task 1: Focus Flow AI scheduling/reschedule previews on the requested block

**Files:**
- Modify `timeflow/apps/backend/src/services/assistantService.ts:80-120` (intent detectors) and `:960-1145` (processMessage response handling).
- Update `timeflow/apps/backend/src/services/__tests__/assistantService.test.ts` to cover the new detection logic and preview filtering.

**Step 1: Detect focused habit/reschedule intent**
- Add a helper next to `detectRescheduleIntent` that looks for phrases like “schedule 1”, “single event”, “one habit”, or explicit reschedule keywords paired with a habit name. Include message parsing to surface the habit titles from the `habits` context and set `targetedHabitIds`.
- Cover this helper with slices in `assistantService.__test__` so the detection is deterministic.

**Step 2: Guard habit auto-fill/conflict warnings**
- In `processMessage`, derive a boolean `isFocusedHabitRequest` and use it to bypass `fillMissingHabitBlocks` and `applyHabitFrequencyConflicts` when true so the preview stays limited to whatever the LLM already returned.
- Within the same block, filter `schedulePreview.blocks` so only the targeted `habitId`s (and the block whose start is closest to any time mentioned in the message) remain when the user is being precise about a single event.
- Sanity-check that the existing validation/logging still runs for broader requests.

**Step 3: Prompt the LLM for single-block responses when needed**
- Update `buildContextPrompt` so that when `isFocusedHabitRequest` is true (and/or `wantsReschedule`), the instructions explicitly say “only emit the habit blocks that change, not the full week, and highlight how that block shifts.” This will help keep the assistant’s natural-language summary aligned with the sanitized preview.

**Step 4: Test & verify**
- Add Vitest cases under `assistantService.test.ts` that simulate focused requests and verify `fillMissingHabitBlocks` is skipped, conflicts don’t list missing days, and only the targeted block survives sanitization.
- Run `pnpm --filter timeflow test -- assistantService` (or equivalent) to confirm the new tests pass.

### Task 2: Surface Flow AI habit instances in the Timeflow calendar

**Files:**
- Backend: `timeflow/apps/backend/src/controllers/habitController.ts:1-360` and `timeflow/apps/backend/src/routes/habitRoutes.ts` (add new handler/route).
- Frontend: `timeflow/apps/web/src/lib/api.ts:320-520` (new client helper), `timeflow/apps/web/src/app/calendar/page.tsx:40-220` (fetch habits, enrich events), `timeflow/apps/web/src/app/calendar/calendarEventFilters.ts` and `timeflow/apps/web/src/components/CalendarView.tsx:20-260` (treat habit events specially).

**Step 1: Backend route for scheduled habits**
- Implement `GET /api/habits/instances` (query params `from`/`to` with sane defaults) that reads from `ScheduledHabit` joined with `Habit` title and returns `scheduledHabitId`, `habitId`, `title`, `startDateTime`, `endDateTime`, and `eventId` for the date range.
- Register the route in `habitRoutes.ts` so the frontend can call it.

**Step 2: Fetch and merge on the calendar page**
- Add a new API helper `getScheduledHabitInstances(from, to)` and call it alongside `getCalendarEvents`. Cache the data inside a hook/state so it can be refreshed after scheduling/rescheduling.
- Extend `timeflowEventIds` to include `eventId`s from the scheduled habits so `filterExternalEvents` still hides duplicates.
- Create a derived array of habit `CalendarEvent`s (`sourceType: 'habit'`, `sourceId: scheduledHabitId`) and pass them through to `CalendarView` along with the existing `externalEvents` (e.g., via concatenation before memoizing events).

**Step 3: CalendarView + filter adaptations**
- Update `CalendarView` so `CalendarEventItem` marks events as habits when `event.sourceType === 'habit'`, exposes `scheduledHabitId`, and styles them similarly to task events (but maybe with a different accent).
- When selecting/hovering, populate the popover with `isHabit` and `scheduledHabitId` so we can later hook habit actions if desired.
- Ensure `filterExternalEvents` still receives the updated `timeflowEventIds` set so habits do not reappear under the “external events” bucket; add unit tests around this helper if feasible.

**Step 4: Manual verification**
- Run the app (`pnpm --filter apps/web dev`) and verify habits scheduled through Flow AI now show in the calendar week view without needing to toggle anything.
- Confirm rescheduling via Flow AI now updates the visible block (and hat to autop preview) for at least one example habit.

### Task 3: Reset and standardize the TimeFlow prefix

**Files:**
- `timeflow/apps/backend/src/utils/timeflowEventPrefix.ts` and its tests (ensure default `TF|` is enforced).
- `timeflow/apps/backend/scripts/rename-timeflow-events.ts` (better documentation/CLI entry) and optional new backend helper if we expose this via API.
- `timeflow/apps/web/src/app/settings/page.tsx` (verify the “Calendar Event Prefix” section mentions `TF|` and that the toggle persists updates).

**Step 1: Confirm canonical prefix usage**
- Double-check `buildTimeflowEventDetails` and its tests so a `TF|` default is used even when the user leaves the field blank; extend tests if needed to cover edge cases (e.g., `eventPrefixEnabled` false should drop the prefix, old `[TimeFlow` strings are trimmed out).

**Step 2: Provide a migration path for legacy events**
- Refactor `rename-timeflow-events.ts` into a runnable CLI command (update `package.json` with `pnpm rewrite-timeflow-events` or similar) so operators can bulk reapply the `TF|` prefix for all scheduled tasks/habits. Have the script reuse `buildTimeflowEventDetails` for both tasks and habits and log what’s changed.
- Document how to run this command (possibly in `KNOWN_PROBLEMS.md` or a new section in `docs/`) so we can execute it manually when deploying the new prefix.

**Step 3: Post-change verification**
- After running the script (dry-run first), verify that example Google Calendar entries now begin with `TF|` (or the configured prefix) and that users can disable the prefix while keeping the event marker consistent.
- Confirm that existing legacy prefixes are still recognized during filtering (the helper still checks for `[timeflow`, `[habit]`, etc.), so removing them from the calendar view doesn’t break.

**Step 4: Tests & Documentation**
- Run `pnpm --filter timeflow test -- timeflowEventPrefix` to ensure the prefix helpers behave.
- Update docs to mention the new CLI for rewriting prefixes and remind operators to re-run it after changing the default prefix for everyone.

### Plan Next Steps

Plan complete and saved to `docs/plans/2026-01-05-flow-ai-habit-scheduling.md`. Two execution options:
1. **Subagent-Driven (this session)** – continue building each task here while invoking `superpowers:subagent-driven-development` as needed.
2. **Parallel Session (separate)** – open a new session focused on executing this plan with `superpowers:executing-plans`.

Which approach do you prefer? 
