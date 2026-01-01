# AI Meetings Workflow Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add a dedicated meetings workflow in `/assistant` that can create scheduling links, draft meeting invites, and guide users with minimal questions.

**Architecture:** Extend conversation mode with a meetings sub-mode. Add a `meetings.txt` prompt, backend meeting intent detection + meeting state, and deterministic question gating. Integrate with existing scheduling link and meeting email endpoints. Enhance regression harness to assert meeting workflow behaviors.

**Tech Stack:** Fastify backend, TypeScript, Prisma, Vitest, file-based prompts.

---

> Note: The writing-plans skill expects a dedicated worktree, but user requested no worktree. Proceed in current workspace.

### Task 1: Add meeting workflow metadata types

**Files:**
- Modify: `timeflow/packages/shared/src/types/assistant.ts`

**Step 1: Write the failing test**
- Not applicable (types-only change).

**Step 2: Run test to verify it fails**
- Not applicable.

**Step 3: Write minimal implementation**
- Add `MeetingWorkflowState` interface with fields:
  - `missingLinkSelection: boolean`
  - `missingLinkName: boolean`
  - `missingLinkDuration: boolean`
  - `missingRecipient: boolean`
  - `creationRequested: boolean`
  - `sendRequested: boolean`
  - `questionRound: number`
  - `assumptions: string[]`
- Extend `ChatMessage.metadata` with `meetingState?: MeetingWorkflowState`.

**Step 4: Run test to verify it passes**
- Not applicable.

**Step 5: Commit**
```bash
git add timeflow/packages/shared/src/types/assistant.ts
git commit -m "feat: add meeting workflow metadata"
```

### Task 2: Add meetings prompt

**Files:**
- Create: `timeflow/apps/backend/src/prompts/meetings.txt`

**Step 1: Write the failing test**
- Not applicable (prompt file).

**Step 2: Run test to verify it fails**
- Not applicable.

**Step 3: Write minimal implementation**
- Prompt rules:
  - Ask one question at a time based on meeting state.
  - If missing link selection, ask which link or offer to create one.
  - If creating, ask for name + duration only.
  - If send requested and info complete, draft email text and ask for send confirmation.
  - Do not auto-send without confirmation.
  - Keep under 200 words with base formatting rules.

**Step 4: Run test to verify it passes**
- Not applicable.

**Step 5: Commit**
```bash
git add timeflow/apps/backend/src/prompts/meetings.txt
git commit -m "feat: add meetings prompt"
```

### Task 3: Update prompt manager for meetings mode

**Files:**
- Modify: `timeflow/apps/backend/src/services/promptManager.ts`
- Modify: `timeflow/apps/backend/src/services/__tests__/promptManager.test.ts`

**Step 1: Write the failing test**
- Add a test verifying `getPrompt('meetings')` loads the meetings prompt.

**Step 2: Run test to verify it fails**
```bash
cd timeflow/apps/backend
npm test -- --run src/services/__tests__/promptManager.test.ts
```
Expected: FAIL.

**Step 3: Write minimal implementation**
- Add `'meetings'` to `AssistantMode` and `getAvailableModes()`.

**Step 4: Run test to verify it passes**
```bash
cd timeflow/apps/backend
npm test -- --run src/services/__tests__/promptManager.test.ts
```
Expected: PASS.

**Step 5: Commit**
```bash
git add timeflow/apps/backend/src/services/promptManager.ts timeflow/apps/backend/src/services/__tests__/promptManager.test.ts
git commit -m "test: add meetings prompt manager coverage"
```

### Task 4: Add meeting intent + state helpers (TDD)

**Files:**
- Modify: `timeflow/apps/backend/src/services/assistantService.ts`
- Modify: `timeflow/apps/backend/src/services/__tests__/assistantService.test.ts`

**Step 1: Write the failing tests**
- `detectMeetingIntent()` for prompts like:
  - “Schedule a meeting with Alex” => true
  - “Create a meeting link” => true
  - “What tasks do I have?” => false
- `getMeetingState()` for missing link selection / missing creation fields / missing recipient.
- `shouldAskMeetingQuestion()` (max 2 rounds).

**Step 2: Run test to verify it fails**
```bash
cd timeflow/apps/backend
npm test -- --run src/services/__tests__/assistantService.test.ts
```
Expected: FAIL.

**Step 3: Write minimal implementation**
- Implement helpers and export via `__test__`.

**Step 4: Run test to verify it passes**
```bash
cd timeflow/apps/backend
npm test -- --run src/services/__tests__/assistantService.test.ts
```
Expected: PASS.

**Step 5: Commit**
```bash
git add timeflow/apps/backend/src/services/assistantService.ts timeflow/apps/backend/src/services/__tests__/assistantService.test.ts
git commit -m "test: add meeting intent and state helpers"
```

### Task 5: Wire meetings mode into assistant flow

**Files:**
- Modify: `timeflow/apps/backend/src/services/assistantService.ts`

**Step 1: Write the failing test**
- Add tests for meeting mode routing and question selection.

**Step 2: Run test to verify it fails**
```bash
cd timeflow/apps/backend
npm test -- --run src/services/__tests__/assistantService.test.ts
```
Expected: FAIL.

**Step 3: Write minimal implementation**
- Route conversation meeting intent to `meetings` prompt.
- Retrieve scheduling links and meeting hours.
- Build meeting state and include in context prompt.
- If missing info and within question budget, return deterministic question without LLM.

**Step 4: Run test to verify it passes**
```bash
cd timeflow/apps/backend
npm test -- --run src/services/__tests__/assistantService.test.ts
```
Expected: PASS.

**Step 5: Commit**
```bash
git add timeflow/apps/backend/src/services/assistantService.ts timeflow/apps/backend/src/services/__tests__/assistantService.test.ts
git commit -m "feat: add meetings mode flow"
```

### Task 6: Add meeting context prompt block

**Files:**
- Modify: `timeflow/apps/backend/src/services/assistantService.ts`

**Step 1: Write the failing test**
- Assert meeting state and links are included in context prompt.

**Step 2: Run test to verify it fails**
```bash
cd timeflow/apps/backend
npm test -- --run src/services/__tests__/assistantService.test.ts
```
Expected: FAIL.

**Step 3: Write minimal implementation**
- Add `**Scheduling Links**` list and `**Meeting Hours**` to prompt.
- Append `**Meeting State**` JSON block.

**Step 4: Run test to verify it passes**
```bash
cd timeflow/apps/backend
npm test -- --run src/services/__tests__/assistantService.test.ts
```
Expected: PASS.

**Step 5: Commit**
```bash
git add timeflow/apps/backend/src/services/assistantService.ts timeflow/apps/backend/src/services/__tests__/assistantService.test.ts
git commit -m "feat: add meeting context block"
```

### Task 7: Regression prompts for meetings

**Files:**
- Modify: `timeflow/apps/backend/scripts/prompts/sprint13-regression.txt`
- Modify: `timeflow/docs/SPRINT_13_AI_REGRESSION_RUNBOOK.md`

**Step 1: Write the failing test**
- Not applicable (manual harness run).

**Step 2: Run test to verify it fails**
```bash
cd timeflow/apps/backend
node scripts/test-ai-prompts.js
```
Expected: missing meeting prompts.

**Step 3: Write minimal implementation**
- Add meeting prompts with expectations:
  - “Schedule a meeting with Alex” → ask link
  - “Create a meeting link for 30 min calls” → ask name if missing
  - “Send a meeting request to alex@company.com” → ask link, then draft

**Step 4: Run test to verify it passes**
```bash
cd timeflow/apps/backend
node scripts/test-ai-prompts.js
```
Expected: meeting prompts appear and validate.

**Step 5: Commit**
```bash
git add timeflow/apps/backend/scripts/prompts/sprint13-regression.txt timeflow/docs/SPRINT_13_AI_REGRESSION_RUNBOOK.md
git commit -m "docs: add meeting workflow prompts to regression harness"
```

---

## Execution Options
Plan complete and saved to `timeflow/docs/plans/2026-01-02-ai-meetings-workflow-implementation-plan.md`.

Two execution options:
1. Subagent-Driven (this session) — uses superpowers:subagent-driven-development
2. Parallel Session (separate) — uses superpowers:executing-plans

Which approach?
