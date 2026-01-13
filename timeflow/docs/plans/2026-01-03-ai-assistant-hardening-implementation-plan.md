# AI Assistant Hardening (Phase B+) Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Harden AI planning/meeting flows, add inbox AI drafts with confirmation-only actions, and gate regression checks for content quality and safety.

**Architecture:** Keep assistant chat as-is; add a safe debug toggle and inbox-specific AI endpoints that return drafts + confirmation CTAs. Extend regression harness expectations to cover inbox scenarios and enforce “no auto-apply” language.

**Tech Stack:** Fastify, TypeScript, Vitest, Next.js, OpenAI SDK, Node scripts.

---

> Note: writing-plans expects a dedicated worktree, but user requested to stay in the current workspace. Proceed in-place.

### Task 1: Fix meeting flow regression (ReferenceError) and lock it with tests (B1)

**Files:**
- Create: `timeflow/apps/backend/src/services/__tests__/assistantService.processMessage.test.ts`
- Modify: `timeflow/apps/backend/src/services/assistantService.ts`

**Step 1: Write the failing test**

```ts
it('returns a clarifying question when a scheduling link is missing', async () => {
  // mock prisma + calendar + schedulingLinkService
  const result = await processMessage('user-1', 'Schedule a meeting with Alex.');
  expect(result.message.content.toLowerCase()).toContain('scheduling link');
});
```

**Step 2: Run test to verify it fails**

Run: `pnpm -C timeflow/apps/backend test -- assistantService.processMessage.test.ts`  
Expected: FAIL with `ReferenceError: meetingState is not defined`

**Step 3: Write minimal implementation**

```ts
// assistantService.ts
const {
  planningState,
  planningWillAsk,
  meetingState,
  meetingWillAsk,
  meetingContext,
} = await buildContextPrompt(...);
```

**Step 4: Run test to verify it passes**

Run: `pnpm -C timeflow/apps/backend test -- assistantService.processMessage.test.ts`  
Expected: PASS

**Step 5: Commit**

```bash
git add timeflow/apps/backend/src/services/assistantService.ts \
  timeflow/apps/backend/src/services/__tests__/assistantService.processMessage.test.ts
git commit -m "fix(assistant): avoid meetingState reference error"
```

---

### Task 2: Add production-safe AI debug toggle + logging (B3)

**Files:**
- Create: `timeflow/apps/backend/src/utils/aiDebug.ts`
- Create: `timeflow/apps/backend/src/utils/__tests__/aiDebug.test.ts`
- Modify: `timeflow/apps/backend/src/config/env.ts`
- Modify: `timeflow/apps/backend/src/controllers/assistantController.ts`
- Modify: `timeflow/apps/backend/src/services/assistantService.ts`
- Modify: `timeflow/apps/web/src/lib/aiDebug.ts`
- Modify: `timeflow/apps/web/src/lib/api.ts`
- Modify: `timeflow/apps/web/src/app/settings/page.tsx`
- Test: `timeflow/apps/web/src/lib/__tests__/aiDebug.test.ts`

**Step 1: Write the failing test (backend)**

```ts
it('enables debug only when env and header allow it', () => {
  expect(resolveAiDebugFlag(false, 'true')).toBe(false);
  expect(resolveAiDebugFlag(true, 'true')).toBe(true);
  expect(resolveAiDebugFlag(true, 'false')).toBe(false);
});
```

**Step 2: Run test to verify it fails**

Run: `pnpm -C timeflow/apps/backend test -- aiDebug.test.ts`  
Expected: FAIL (module missing)

**Step 3: Write minimal implementation**

```ts
// aiDebug.ts
export function resolveAiDebugFlag(envEnabled: boolean, headerValue?: string | string[]) {
  if (!envEnabled) return false;
  const normalized = Array.isArray(headerValue) ? headerValue[0] : headerValue;
  return normalized === 'true' || normalized === '1';
}
```

Wire in `assistantController.chat`:
- read `x-ai-debug`
- gate with `env.AI_DEBUG_ENABLED === 'true'`
- pass to `processMessage(..., { debugEnabled })`

In `assistantService`:
- add optional `debugEnabled` param
- use it for `formatDebugError(...)`
- add debug-only logging for prompt failures:
  - missing structured output in scheduling
  - JSON parse failure in `parseResponse`

Add env vars in `env.ts`:
- `AI_DEBUG_ENABLED` (default off)
- keep `AI_DEBUG_ERRORS` (legacy) for backwards compatibility, but prefer new flag.

**Step 4: Run test to verify it passes**

Run: `pnpm -C timeflow/apps/backend test -- aiDebug.test.ts`  
Expected: PASS

**Step 5: Write the failing test (web)**

```ts
it('persists the AI debug toggle in localStorage', () => {
  setAiDebugEnabled(true);
  expect(getAiDebugEnabled()).toBe(true);
});
```

**Step 6: Run test to verify it fails**

Run: `pnpm -C timeflow/apps/web test -- aiDebug.test.ts`  
Expected: FAIL (module missing)

**Step 7: Write minimal implementation (web)**

- Add `lib/aiDebug.ts` with `getAiDebugEnabled`, `setAiDebugEnabled`, and `canShowAiDebugToggle` (uses `NEXT_PUBLIC_AI_DEBUG_ENABLED`).
- In `sendChatMessage`, include header `x-ai-debug: true` when toggle enabled.
- Add a small “AI Debugging (Admin)” toggle in Settings, only visible when `canShowAiDebugToggle()` is true.

**Step 8: Run test to verify it passes**

Run: `pnpm -C timeflow/apps/web test -- aiDebug.test.ts`  
Expected: PASS

**Step 9: Commit**

```bash
git add timeflow/apps/backend/src/utils/aiDebug.ts \
  timeflow/apps/backend/src/utils/__tests__/aiDebug.test.ts \
  timeflow/apps/backend/src/config/env.ts \
  timeflow/apps/backend/src/controllers/assistantController.ts \
  timeflow/apps/backend/src/services/assistantService.ts \
  timeflow/apps/web/src/lib/aiDebug.ts \
  timeflow/apps/web/src/lib/api.ts \
  timeflow/apps/web/src/app/settings/page.tsx \
  timeflow/apps/web/src/lib/__tests__/aiDebug.test.ts
git commit -m "feat(ai): add debug toggle gated by env + header"
```

---

### Task 3: Add inbox AI prompt endpoints with draft + confirm only (B4)

**Files:**
- Create: `timeflow/apps/backend/src/services/inboxAiService.ts`
- Create: `timeflow/apps/backend/src/controllers/inboxAiController.ts`
- Modify: `timeflow/apps/backend/src/routes/emailRoutes.ts`
- Create: `timeflow/apps/backend/src/controllers/__tests__/inboxAiController.test.ts`
- Create: `timeflow/apps/backend/src/prompts/inbox-task.txt`
- Create: `timeflow/apps/backend/src/prompts/inbox-label-sync.txt`
- Create: `timeflow/apps/backend/src/prompts/inbox-label-why.txt`
- Modify: `timeflow/apps/backend/src/services/promptManager.ts`
- Modify: `timeflow/apps/web/src/lib/api.ts`
- Modify: `timeflow/apps/web/src/app/inbox/page.tsx`
- Create: `timeflow/apps/web/src/components/inbox/InboxAiDraftPanel.tsx`
- Create: `timeflow/apps/web/src/components/inbox/__tests__/InboxAiDraftPanel.test.tsx`

**Step 1: Write the failing test (backend controller)**

```ts
it('returns a task draft with confirmation CTA', async () => {
  const res = await draftTaskFromEmail(request, reply);
  expect(reply.send).toHaveBeenCalledWith(
    expect.objectContaining({ draft: expect.any(Object), confirmCta: expect.any(String) })
  );
});
```

**Step 2: Run test to verify it fails**

Run: `pnpm -C timeflow/apps/backend test -- inboxAiController.test.ts`  
Expected: FAIL (controller missing)

**Step 3: Write minimal implementation**

- Add `inboxAiService` with three functions:
  - `draftTaskFromEmail(email)` → `{ draft: { title, description, priority, dueDate }, confirmCta }`
  - `draftLabelSync(email, categories)` → `{ draft: { targetLabelId, reason }, confirmCta }`
  - `explainLabel(email, category)` → `{ draft: { explanation }, confirmCta }`
- Use prompt files via `promptManager` and a shared `callInboxLLM` (OpenAI compatible).
- Enforce “draft only” by instruction + JSON schema; never auto-apply.

Add endpoints:
- `POST /email/ai/task-draft`
- `POST /email/ai/label-sync`
- `POST /email/ai/label-explain`

**Step 4: Run test to verify it passes**

Run: `pnpm -C timeflow/apps/backend test -- inboxAiController.test.ts`  
Expected: PASS

**Step 5: Write the failing test (web panel)**

```tsx
render(<InboxAiDraftPanel isOpen email={mockEmail} onConfirm={vi.fn()} onClose={vi.fn()} />);
expect(screen.getByText(/draft/i)).not.toBeNull();
```

**Step 6: Run test to verify it fails**

Run: `pnpm -C timeflow/apps/web test -- InboxAiDraftPanel.test.tsx`  
Expected: FAIL (component missing)

**Step 7: Write minimal implementation (web)**

- Add `InboxAiDraftPanel` to render draft content + confirm checkbox + CTA.
- Update `inbox/page.tsx`:
  - Replace direct `createTaskFromEmail` with AI draft flow.
  - Add actions for label-sync and “Why this label?” to open draft panel.
  - Only execute real actions after user confirmation.

**Step 8: Run test to verify it passes**

Run: `pnpm -C timeflow/apps/web test -- InboxAiDraftPanel.test.tsx`  
Expected: PASS

**Step 9: Commit**

```bash
git add timeflow/apps/backend/src/services/inboxAiService.ts \
  timeflow/apps/backend/src/controllers/inboxAiController.ts \
  timeflow/apps/backend/src/routes/emailRoutes.ts \
  timeflow/apps/backend/src/controllers/__tests__/inboxAiController.test.ts \
  timeflow/apps/backend/src/prompts/inbox-task.txt \
  timeflow/apps/backend/src/prompts/inbox-label-sync.txt \
  timeflow/apps/backend/src/prompts/inbox-label-why.txt \
  timeflow/apps/backend/src/services/promptManager.ts \
  timeflow/apps/web/src/lib/api.ts \
  timeflow/apps/web/src/app/inbox/page.tsx \
  timeflow/apps/web/src/components/inbox/InboxAiDraftPanel.tsx \
  timeflow/apps/web/src/components/inbox/__tests__/InboxAiDraftPanel.test.tsx
git commit -m "feat(inbox): add AI drafts for tasks, label sync, and explanations"
```

---

### Task 4: Extend AI regression harness with inbox expectations (B5)

**Files:**
- Modify: `timeflow/apps/backend/scripts/aiRegressionUtils.js`
- Modify: `timeflow/apps/backend/src/scripts/aiRegressionUtils.test.ts`
- Modify: `timeflow/apps/backend/scripts/test-ai-prompts.js`
- Modify: `timeflow/apps/backend/scripts/prompts/sprint13-regression.txt`

**Step 1: Write the failing tests**

```ts
expect(parsePrompts(raw)).toMatchObject({
  expect: { draft: true, confirmCta: true, noAutoApplyLanguage: true }
});
```

**Step 2: Run test to verify it fails**

Run: `pnpm -C timeflow/apps/backend test -- aiRegressionUtils.test.ts`  
Expected: FAIL (tokens unsupported)

**Step 3: Write minimal implementation**

- Add expectation tokens: `draft=`, `confirm_cta=`, `no_auto_apply_language=`.
- Extend evaluator to:
  - confirm `draft` exists in response payload
  - confirm CTA ends in a question
  - reject auto‑apply language (“I applied”, “I’ve updated”, “Labels have been set”)
- Update `test-ai-prompts.js` to:
  - surface `draft` and `confirmCta` fields when present
  - fail the run if any expectations fail
- Add inbox prompts at the end of `sprint13-regression.txt` with expectations.

**Step 4: Run test to verify it passes**

Run: `pnpm -C timeflow/apps/backend test -- aiRegressionUtils.test.ts`  
Expected: PASS

**Step 5: Commit**

```bash
git add timeflow/apps/backend/scripts/aiRegressionUtils.js \
  timeflow/apps/backend/src/scripts/aiRegressionUtils.test.ts \
  timeflow/apps/backend/scripts/test-ai-prompts.js \
  timeflow/apps/backend/scripts/prompts/sprint13-regression.txt
git commit -m "test(ai): add inbox expectations to regression harness"
```

---

### Task 5: Add CI gate script for AI regression checks (B2)

**Files:**
- Modify: `timeflow/apps/backend/package.json`
- Modify: `timeflow/package.json`
- Modify: `timeflow/docs/SPRINT_13_AI_REGRESSION_RUNBOOK.md`

**Step 1: Write the failing test**

Add a new unit test to `aiRegressionUtils.test.ts` that asserts `shouldFailRun(summary)` returns true when `failed > 0`.

**Step 2: Run test to verify it fails**

Run: `pnpm -C timeflow/apps/backend test -- aiRegressionUtils.test.ts`  
Expected: FAIL (helper missing)

**Step 3: Write minimal implementation**

- Export `shouldFailRun(summary)` from `aiRegressionUtils.js`
- In `test-ai-prompts.js`, call it and `process.exit(1)` when failing.
- Add scripts:
  - backend: `"ai:regression": "AI_REGRESSION_PROMPTS=./scripts/prompts/sprint13-regression.txt node scripts/test-ai-prompts.js"`
  - root: `"ai:regression": "pnpm -C apps/backend ai:regression"`
- Document in runbook with OpenAI config note.

**Step 4: Run test to verify it passes**

Run: `pnpm -C timeflow/apps/backend test -- aiRegressionUtils.test.ts`  
Expected: PASS

**Step 5: Commit**

```bash
git add timeflow/apps/backend/package.json \
  timeflow/package.json \
  timeflow/apps/backend/scripts/aiRegressionUtils.js \
  timeflow/apps/backend/src/scripts/aiRegressionUtils.test.ts \
  timeflow/apps/backend/scripts/test-ai-prompts.js \
  timeflow/docs/SPRINT_13_AI_REGRESSION_RUNBOOK.md
git commit -m "chore(ai): add regression gate script"
```

---

### Task 6: Verify email categorization hardening status (BH1)

**Files:**
- Review: `timeflow/apps/backend/src/services/emailCategorizationService.ts`
- Review: `timeflow/apps/backend/src/services/__tests__/emailCategorizationService.test.ts`
- Review: `timeflow/docs/plans/2026-01-02-ai-email-categorization-hardening-implementation-plan.md`

**Step 1: Run existing tests to confirm rules already harden categories**

Run: `pnpm -C timeflow/apps/backend test -- emailCategorizationService`  
Expected: PASS

**Step 2: Only if gaps remain, add missing rule tests + minimal rules**

- Add 1–2 tests per category that fail.
- Update rules to pass.

**Step 3: Commit (if changed)**

```bash
git add timeflow/apps/backend/src/services/emailCategorizationService.ts \
  timeflow/apps/backend/src/services/__tests__/emailCategorizationService.test.ts
git commit -m "test(email): extend categorization hardening coverage"
```

---

### Task 7: Documentation updates

**Files:**
- Modify: `timeflow/docs/SPRINT_16_PLAN.md`
- Modify: `timeflow/ARCHITECT_ROADMAP_SPRINT1-17.md`

**Step 1: Update status for B1–B5 (and BH1 if needed)**

**Step 2: Commit**

```bash
git add timeflow/docs/SPRINT_16_PLAN.md timeflow/ARCHITECT_ROADMAP_SPRINT1-17.md
git commit -m "docs: update Sprint 16 AI hardening status"
```

---

**Plan complete and saved to** `timeflow/docs/plans/2026-01-03-ai-assistant-hardening-implementation-plan.md`.

Two execution options:
1. Subagent-Driven (this session) — use superpowers:subagent-driven-development
2. Parallel Session (separate) — use superpowers:executing-plans

Which approach?
