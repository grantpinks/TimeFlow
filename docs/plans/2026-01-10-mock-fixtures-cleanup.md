# Mock & Fixtures Cleanup Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task (per writing-plans instructions).

**Goal:** Document the Flow AI + prefix fixes and clean up backend test mocks so the broader suite runs without the legacy `typedFastifyMocks`/mock hoisting errors.

**Architecture:** The repo already documents Flow AI and prefix work; we’ll add a short summary to `KNOWN_PROBLEMS.md` and highlight remaining infrastructure risks. For the tests, adjust the controller/e2e files so they import the helper with a resolvable path and define assistantService mocks before the hoisted factories run.

**Tech Stack:** Node/TypeScript backend, Vitest for tests, plain Markdown for docs.

---

### Task 1: Document fixes and outstanding issues

**Files:**
- `KNOWN_PROBLEMS.md`

**Steps:**
1. Add a new section that briefly summarizes the Flow AI habit focus + prefix stabilization work so the doc reflects the current behavior.
2. Mention the lingering test infrastructure gaps (Google mocks, stubbed helpers) and note that the controller/e2e fixtures still expect a local `typedFastifyMocks.ts`.
3. Cross-reference the relevant code files so readers know where the fixes landed.

### Task 2: Clean up mocked helpers for controller/e2e tests

**Files:**
- `timeflow/apps/backend/src/__tests__/emailDraft.e2e.test.ts`
- `timeflow/apps/backend/src/controllers/__tests__/emailDraftController.test.ts`
- `timeflow/apps/backend/src/controllers/__tests__/availabilityController.test.ts`
- `timeflow/apps/backend/src/controllers/__tests__/emailThreadAssistController.test.ts`
- `timeflow/apps/backend/src/controllers/__tests__/inboxAiController.test.ts`

**Steps:**
1. Rework `emailDraft.e2e.test.ts` so it provides a stable assistantService mock object before `vi.mock` executes (dropping the hoisted `runAssistantTaskMock` pattern).
2. Update all controller tests to import the helper via `../helpers/typedFastifyMocks.ts` so Vitest can resolve the file during ESM loading.
3. Ensure the tests still use `vi.mocked(assistantService.runAssistantTask)` to control responses.

### Task 3: Verify the backend test suites

**Files/Commands:**
- `timeflow/apps/backend` (Vitest)

**Steps:**
1. Run `pnpm vitest run src/__tests__/emailDraft.e2e.test.ts` to ensure the e2e file no longer crashes on module resolution or hoist issues.
2. Run `pnpm vitest run src/controllers/__tests__/emailDraftController.test.ts src/controllers/__tests__/availabilityController.test.ts src/controllers/__tests__/emailThreadAssistController.test.ts src/controllers/__tests__/inboxAiController.test.ts` to confirm the helper path resolves.
3. Re-run the broader commands (`pnpm --filter @timeflow/backend test -- assistantService` and `pnpm --filter @timeflow/backend test -- timeflowEventPrefix`) to see whether any remaining infrastructures issues persist. Document any continuing failures in `KNOWN_PROBLEMS.md`.

### Task 4: Finish

**Steps:**
1. Update this plan (and the running todo) with the outcomes.
2. If infra blockers remain, highlight them for follow-up.
