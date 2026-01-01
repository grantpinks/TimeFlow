# AI Planning Workflow Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add a planning-aware assistant flow that asks minimal clarifying questions and drafts friendly plans for ambiguous requests.

**Architecture:** Keep the existing mode router (conversation/scheduling/availability) and introduce a planning sub-mode inside conversation. Backend logic tracks missing info (time + priority) and question rounds, then selects either a planning prompt or a draft plan. Planning state is stored in message metadata to keep the conversation coherent.

**Tech Stack:** Fastify backend, TypeScript, Prisma, Vitest, file-based prompts.

---

> Note: The writing-plans skill expects a dedicated worktree, but user requested no worktree. Proceed in current workspace.

### Task 1: Add shared planning metadata types

**Files:**
- Modify: `timeflow/packages/shared/src/types/assistant.ts`

**Step 1: Write the failing test**
- Not applicable (types-only change).

**Step 2: Run test to verify it fails**
- Not applicable.

**Step 3: Write minimal implementation**
- Add a `PlanningState` interface with fields:
  - `missingInfo: boolean`
  - `missingTime: boolean`
  - `missingPriority: boolean`
  - `questionRound: number`
  - `allowSecondRound: boolean`
  - `assumptions: string[]`
- Extend `ChatMessage.metadata` to include `planningState?: PlanningState`.

**Step 4: Run test to verify it passes**
- Not applicable.

**Step 5: Commit**
```bash
git add timeflow/packages/shared/src/types/assistant.ts
git commit -m "feat: add planning state metadata"
```

### Task 2: Add the planning prompt file

**Files:**
- Create: `timeflow/apps/backend/src/prompts/planning.txt`

**Step 1: Write the failing test**
- Not applicable (prompt file).

**Step 2: Run test to verify it fails**
- Not applicable.

**Step 3: Write minimal implementation**
- Add a concise planning prompt that:
  - Checks `planningState.missingInfo`.
  - If missing, asks one combined question (time + priority) or only the missing piece.
  - If not missing, drafts a 3–6 step plan and ends with “Want me to schedule this?”.
  - Keeps response under 200 words and follows base format rules.

**Step 4: Run test to verify it passes**
- Not applicable.

**Step 5: Commit**
```bash
git add timeflow/apps/backend/src/prompts/planning.txt
git commit -m "feat: add planning prompt"
```

### Task 3: Extend prompt manager for planning mode

**Files:**
- Modify: `timeflow/apps/backend/src/services/promptManager.ts`

**Step 1: Write the failing test**
- Add a small unit test (new file) verifying `getPrompt('planning')` loads the planning prompt.
- Create: `timeflow/apps/backend/src/services/__tests__/promptManager.test.ts`

**Step 2: Run test to verify it fails**
```bash
cd timeflow/apps/backend
npm test -- --run tests/services/__tests__/promptManager.test.ts
```
Expected: FAIL (planning mode not supported yet).

**Step 3: Write minimal implementation**
- Update `AssistantMode` to include `'planning'`.
- Update `getAvailableModes()` to include `'planning'`.
- Ensure `getPrompt('planning')` works with the new prompt file.

**Step 4: Run test to verify it passes**
```bash
cd timeflow/apps/backend
npm test -- --run tests/services/__tests__/promptManager.test.ts
```
Expected: PASS.

**Step 5: Commit**
```bash
git add timeflow/apps/backend/src/services/promptManager.ts timeflow/apps/backend/src/services/__tests__/promptManager.test.ts
git commit -m "test: add planning prompt manager coverage"
```

### Task 4: Add planning intent + state helpers (TDD)

**Files:**
- Modify: `timeflow/apps/backend/src/services/assistantService.ts`
- Modify: `timeflow/apps/backend/src/services/__tests__/assistantService.test.ts`

**Step 1: Write the failing tests**
Add tests for:
- `detectPlanningIntent()` with prompts like:
  - “My day feels chaotic—can you help me plan today?” => true
  - “What’s the weather?” => false
- `getPlanningState()` with scenarios:
  - Missing both time + priority
  - Missing time only (explicit priority)
  - Missing priority only (explicit time)
- `shouldAskPlanningQuestion()` respecting 2-round limit

**Step 2: Run test to verify it fails**
```bash
cd timeflow/apps/backend
npm test -- --run tests/services/__tests__/assistantService.test.ts
```
Expected: FAIL (functions not defined or behavior incorrect).

**Step 3: Write minimal implementation**
- Implement helpers:
  - `detectPlanningIntent(message: string): boolean`
  - `getPlanningState({ message, tasks, calendarEvents, userPrefs, previousState }): PlanningState`
  - `shouldAskPlanningQuestion(state: PlanningState): boolean`
- Export helpers in `__test__`.

**Step 4: Run test to verify it passes**
```bash
cd timeflow/apps/backend
npm test -- --run tests/services/__tests__/assistantService.test.ts
```
Expected: PASS.

**Step 5: Commit**
```bash
git add timeflow/apps/backend/src/services/assistantService.ts timeflow/apps/backend/src/services/__tests__/assistantService.test.ts
git commit -m "test: add planning intent/state helpers"
```

### Task 5: Wire planning mode into the assistant flow

**Files:**
- Modify: `timeflow/apps/backend/src/services/assistantService.ts`

**Step 1: Write the failing test**
- Add tests or integration-style checks for:
  - Conversation + planning intent routes to planning prompt
  - `planningState.questionRound` increments when missing info

**Step 2: Run test to verify it fails**
```bash
cd timeflow/apps/backend
npm test -- --run tests/services/__tests__/assistantService.test.ts
```
Expected: FAIL.

**Step 3: Write minimal implementation**
- In `handleAssistantMessage`:
  - If `mode === 'conversation'` and `detectPlanningIntent(message)` true, set `effectiveMode = 'planning'`.
  - Retrieve previous `planningState` from conversation history (last assistant message metadata).
  - Build new planning state (increment question round if asking).
  - Use `promptManager.getPrompt('planning')` and pass `effectiveMode` to `callLocalLLM`.
  - Store `planningState` in response metadata.
- Ensure planning uses a conversation-like temperature.

**Step 4: Run test to verify it passes**
```bash
cd timeflow/apps/backend
npm test -- --run tests/services/__tests__/assistantService.test.ts
```
Expected: PASS.

**Step 5: Commit**
```bash
git add timeflow/apps/backend/src/services/assistantService.ts timeflow/apps/backend/src/services/__tests__/assistantService.test.ts
git commit -m "feat: add planning mode flow"
```

### Task 6: Add planning context block to the prompt

**Files:**
- Modify: `timeflow/apps/backend/src/services/assistantService.ts`

**Step 1: Write the failing test**
- Add a unit test that `buildContextPrompt(..., 'planning', ...)` includes `Planning State` JSON.

**Step 2: Run test to verify it fails**
```bash
cd timeflow/apps/backend
npm test -- --run tests/services/__tests__/assistantService.test.ts
```
Expected: FAIL.

**Step 3: Write minimal implementation**
- Update `buildContextPrompt` to:
  - Accept `mode: 'planning'`.
  - Include task list, calendar events, and working hours.
  - Append a `**Planning State**` JSON block.

**Step 4: Run test to verify it passes**
```bash
cd timeflow/apps/backend
npm test -- --run tests/services/__tests__/assistantService.test.ts
```
Expected: PASS.

**Step 5: Commit**
```bash
git add timeflow/apps/backend/src/services/assistantService.ts timeflow/apps/backend/src/services/__tests__/assistantService.test.ts
git commit -m "feat: add planning context to prompt"
```

### Task 7: Extend AI regression prompts

**Files:**
- Modify: `timeflow/apps/backend/scripts/prompts/sprint13-regression.txt`
- Modify: `timeflow/docs/SPRINT_13_AI_REGRESSION_RUNBOOK.md`

**Step 1: Write the failing test**
- Not applicable (scripted manual run).

**Step 2: Run test to verify it fails**
```bash
cd timeflow/apps/backend
node scripts/test-ai-prompts.js
```
Expected: No planning prompts included yet.

**Step 3: Write minimal implementation**
- Add 6 planning prompts that cover:
  - Ambiguous plan request
  - Priority‑only response
  - Time‑only response
  - Explicit plan request
- Update runbook with expected outcomes and examples.

**Step 4: Run test to verify it passes**
```bash
cd timeflow/apps/backend
node scripts/test-ai-prompts.js
```
Expected: Report includes new planning prompts.

**Step 5: Commit**
```bash
git add timeflow/apps/backend/scripts/prompts/sprint13-regression.txt timeflow/docs/SPRINT_13_AI_REGRESSION_RUNBOOK.md
git commit -m "docs: add planning prompts to regression harness"
```

---

## Execution Options
Plan complete and saved to `timeflow/docs/plans/2026-01-02-ai-planning-workflow-implementation-plan.md`.

Two execution options:
1. Subagent-Driven (this session) — uses superpowers:subagent-driven-development
2. Parallel Session (separate) — uses superpowers:executing-plans

Which approach?
