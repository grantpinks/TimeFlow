# TF| Prefix Stabilization Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Make Timeflow habit/task summaries and migrations consistently use `TF|` (or a user-configurable prefix) while providing tooling to bulk rewrite legacy `[TimeFlow Habit]` events.

**Architecture:** Relax the prefix helper so it sanitizes legacy strings, honors the user’s toggle/custom value, and stays in sync between the backend services, rename script, and calendar APIs. Migration tooling should reuse the same helper so every cron job or script writes consistent summaries/descriptions.

**Tech Stack:** TypeScript (Node/tsx) for backend, Vitest for unit tests, pnpm workspace scripts for tooling.

---

### Task 1: Harden `buildTimeflowEventDetails` and its tests

**Files:**
- Modify: `timeflow/apps/backend/src/utils/timeflowEventPrefix.ts`
- Modify: `timeflow/apps/backend/src/utils/__tests__/timeflowEventPrefix.test.ts`

**Step 1: Update normalization logic**
1. Add a sanitizer that strips legacy prefixes such as `[TimeFlow Habit]`, `[TimeFlow Event]`, `[Habit]`, or any stray `TimeFlow` substring from incoming `title` so we can reuse legacy events when rewriting.
2. Ensure `buildSummary` defaults to `TF|` when `prefix` is empty and respects `prefixEnabled === false`.
3. Ensure `description` still contains the `TimeFlow Event` marker and no duplicate markers are emitted.

**Step 2: Extend tests**
1. Add test vectors that show legacy titles are rewritten to `TF| Habit: Deep Work`, that disabling the prefix drops `TF|`, and that empty/whitespace prefixes fall back to `TF|`.
2. Confirm the description marker is appended exactly once even when the description already mentioned “TimeFlow”.
3. Run: `pnpm --filter @timeflow/backend test timeflow/apps/backend/src/utils/__tests__/timeflowEventPrefix.test.ts` (expect pass).

**Step 3: Run full backend unit suite**
1. `pnpm --filter @timeflow/backend test` to ensure no regressions elsewhere. Expect all tests to pass; fix any failures before moving on.

### Task 2: Stabilize the migration CLI/tooling

**Files:**
- Modify: `timeflow/apps/backend/scripts/rename-timeflow-events.ts`
- Modify: `timeflow/apps/backend/package.json`
- Test/Document: `KNOWN_PROBLEMS.md`

**Step 1: Reuse the sanitized helper during rewrites**
1. Make the script import the updated `buildTimeflowEventDetails` and apply it for both tasks and habits (already the case, but double-check the summary/description ignore old `[TimeFlow Habit]` strings).
2. Ensure the script logs when each event is updated and explicitly states `TF|` (or the user’s prefix) in the output, including counts of renames per user.

**Step 2: Expose a pnpm command**
1. Add a script entry such as `"rewrite-timeflow-events": "tsx scripts/rename-timeflow-events.ts"` (if missing or rename to prefer `rewrite` name, keep alias for backward compatibility).
2. Document the command usage in `KNOWN_PROBLEMS.md` with dry-run instructions (e.g., `pnpm --filter @timeflow/backend rewrite-timeflow-events -- --dry-run`) and mention the `TF|` prefix enforcement.

**Step 3: Smoke-test the script**
1. If feasible with existing dev credentials, run `pnpm --filter @timeflow/backend rewrite-timeflow-events -- --dry-run` and confirm output mentions the new prefix.
2. Otherwise, run in a mocked/local environment (possibly a subset of fixtures) and note in the plan that manual verification is still required.
3. **Outstanding:** Our current sandbox doesn’t expose the production Google tokens, so the real rewrite needs to be run outside this session—record that in `KNOWN_PROBLEMS.md` (see Task 3) and revisit once the credentialed environment is available.

### Task 3: Document and align UI/known-issues

**Files:**
- Modify: `docs/KNOWN_PROBLEMS.md`
- Reference: `timeflow/apps/web/src/app/settings/page.tsx`

**Step 1: Note the prefix control**
1. Update `KNOWN_PROBLEMS.md` (or another docs file) to mention the new `TF|` default, the toggle for disabling prefixes, and the migration script so operators can fix legacy data.

**Step 2: Verify settings page behavior**
1. Confirm the settings page (`eventPrefixEnabled` toggle + input) still trim values and send the right defaults (only minor text changes may be needed once backend behavior changed).
2. No code change may be necessary, but document any verified assumptions in `KNOWN_PROBLEMS.md`.

**Step 3: Summarize progress**
1. After implementing, gather test results (`pnpm --filter @timeflow/backend test`) and script verification logs.
2. Add a short section to `docs/PLANS` (or this plan) summarizing what’s complete and what still needs manual verification.
