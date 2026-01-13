# Backend Type Safety Cleanup Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Resolve the `@typescript-eslint/no-unsafe-*` lint violations in the backend tests and utilities so `pnpm -r lint` can finish without compromising any existing behavior.

**Architecture:** Align the controller tests and utility helpers with stronger TypeScript contracts by introducing shared typed Fastify mocks, eliminating `any`/`error` parameters, and centralizing safe parsing logic. This keeps the runtime unchanged while satisfying the linter.

**Tech Stack:** Fastify, Jest (with Vitest-style mocks), Luxon, TypeScript 5.x, ESLint with `typescript-eslint` rules.

---

### Task 1: Typed Fastify mocks for controller/unit tests

**Files:**
- Create: `apps/backend/src/__tests__/helpers/typedFastifyMocks.ts`
- Modify: `apps/backend/src/controllers/__tests__/availabilityController.test.ts`
- Modify: `apps/backend/src/controllers/__tests__/emailDraftController.test.ts`
- Modify: `apps/backend/src/__tests__/gmailSyncRoutes.e2e.test.ts`
- Modify: `apps/backend/src/__tests__/emailInbox.e2e.test.ts`

**Step 1: Capture the current lint signal**

```
pnpm -C apps/backend lint --src --ext .ts apps/backend/src/controllers/__tests__/availabilityController.test.ts
```

Expected: `@typescript-eslint/no-unsafe-*` errors referencing the mocked Fastify req/res objects.

**Step 2: Implement typed helpers**

```
cat <<'EOF' > apps/backend/src/__tests__/helpers/typedFastifyMocks.ts
// stub out typed FastifyRequest/FastifyReply builders that align with our handlers
EOF
```

In the helper, export functions that return `MockedFunction<FastifyRequest<...>>` and `Partial<FastifyReply<...>>` objects with typed `.params`, `.query`, `.body`, `.statusCode`, `.send`, etc. The implementation simply uses typed jest mocks instead of `any`.

**Step 3: Wire the helper into each test**

Update the listed test files to import the new helper and replace direct `any` mocks with the typed variants, ensuring every controller invocation uses strongly typed `.body`, `.query`, and `.statusCode` flow.

**Step 4: Ensure lint now passes for those files**

```
pnpm -C apps/backend lint --src --ext .ts apps/backend/src/controllers/__tests__/availabilityController.test.ts apps/backend/src/controllers/__tests__/emailDraftController.test.ts
```

Expected: `no-unsafe-*` errors disappear for those files.

**Step 5: Commit**

```
git add apps/backend/src/__tests__/helpers/typedFastifyMocks.ts apps/backend/src/controllers/__tests__/availabilityController.test.ts apps/backend/src/controllers/__tests__/emailDraftController.test.ts apps/backend/src/__tests__/gmailSyncRoutes.e2e.test.ts apps/backend/src/__tests__/emailInbox.e2e.test.ts
git commit -m "chore: add typed Fastify mocks for backend tests"
```

### Task 2: Eliminate `error`/`any` handling inside core utilities

**Files:**
- Modify: `apps/backend/src/utils/availability.ts`
- Modify: `apps/backend/src/utils/dateUtils.ts`
- Modify: `apps/backend/src/utils/icsGenerator.ts`

**Step 1: Record the failing lint output**

```
pnpm -C apps/backend lint --src --ext .ts apps/backend/src/utils/availability.ts apps/backend/src/utils/dateUtils.ts apps/backend/src/utils/icsGenerator.ts
```

Expected: `@typescript-eslint/no-unsafe-assignment`/`no-unsafe-call` showing the use of `error` typed values coming from Luxon parsing.

**Step 2: Introduce a `safeDateTime` helper**

Add (or expand) an internal helper that parses input while narrowing the result to `DateTime | null`, asserts `isValid`, and exposes typed getters, so the rest of the utils never operate on plain `error` values.

**Step 3: Update utilities to use safe helper**

Modify `availability.ts`, `dateUtils.ts`, and `icsGenerator.ts` so they call the helper, check for `null`, perform only typed `DateTime` operations, and eliminate `as any`/`error` usages. Keep the existing business logic (hours, increments, ICS formatting).

**Step 4: Verify lint clears**

```
pnpm -C apps/backend lint --src --ext .ts apps/backend/src/utils/availability.ts apps/backend/src/utils/dateUtils.ts apps/backend/src/utils/icsGenerator.ts
```

Expected: The previous `no-unsafe-*` errors vanish for each file.

**Step 5: Commit**

```
git add apps/backend/src/utils/availability.ts apps/backend/src/utils/dateUtils.ts apps/backend/src/utils/icsGenerator.ts
git commit -m "chore: tighten Luxon utility typings"
```

### Task 3: Restore full backend lint

**Files:**
- No code changes; lint verification only.

**Step 1: Run backend lint**

```
pnpm -C apps/backend lint
```

Expected: no remaining `@typescript-eslint/*` errors reported for the backend (coverage now quiet).

**Step 2: Run recursive lint**

```
pnpm lint
```

Expected: passes up to the web/frontend errors currently outstanding.

**Step 3: Commit if needed**

```
git commit -am "chore: confirm backend lint passes"
```

