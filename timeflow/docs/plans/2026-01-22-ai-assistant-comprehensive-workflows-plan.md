# AI Assistant Comprehensive Workflows Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Deliver a confirmation-first AI assistant that safely converts tasks + inbox into scheduled outcomes with visual previews, clear CTAs, and reversible actions.

**Architecture:** Extend the existing assistant + scheduling services with a strict preview/confirm state machine, visual calendar overlays, and inbox-to-task pipelines. Keep all actions confirm-only, add undo safety, and enforce validation server-side. Add lightweight preference memory and proactive insights across Today/Calendar/Inbox.

**Tech Stack:** Fastify, TypeScript, Prisma, Vitest, Next.js, Tailwind, shared types in `packages/shared`.

---

### Task 1: Define confirm-only action contract (shared types + API guards)

**Files:**
- Modify: `timeflow/packages/shared/src/types/assistant.ts`
- Modify: `timeflow/apps/backend/src/services/assistantService.ts`
- Modify: `timeflow/apps/backend/src/controllers/assistantController.ts`
- Test: `timeflow/apps/backend/src/services/__tests__/assistantService.processMessage.test.ts`

**Step 1: Write the failing test**

```ts
it('never returns auto-apply actions; only confirmable previews', async () => {
  const result = await processMessage('user-1', 'Schedule my tasks.');
  expect(result.message.metadata?.action?.type).not.toBe('apply_schedule');
});
```

**Step 2: Run test to verify it fails**

Run: `pnpm -C timeflow/apps/backend test -- assistantService.processMessage.test.ts`  
Expected: FAIL (auto-apply action or missing guard)

**Step 3: Write minimal implementation**

```ts
// packages/shared/src/types/assistant.ts
export type AssistantAction =
  | { type: 'preview_schedule'; payload: { blocks: ScheduledBlock[] } }
  | { type: 'create_task_draft'; payload: CreateTaskRequest }
  | { type: 'draft_reply'; payload: { subject: string; body: string } };

// assistantService.ts
// Ensure responses only include preview + CTA language, never apply.
```

**Step 4: Run test to verify it passes**

Run: `pnpm -C timeflow/apps/backend test -- assistantService.processMessage.test.ts`  
Expected: PASS

**Step 5: Commit**

```bash
git add timeflow/packages/shared/src/types/assistant.ts \
  timeflow/apps/backend/src/services/assistantService.ts \
  timeflow/apps/backend/src/controllers/assistantController.ts \
  timeflow/apps/backend/src/services/__tests__/assistantService.processMessage.test.ts
git commit -m "feat(ai): enforce confirm-only action contract"
```

---

### Task 2: Harden apply schedule endpoint with explicit preview validation + undo token

**Files:**
- Modify: `timeflow/apps/backend/src/services/scheduleService.ts`
- Modify: `timeflow/apps/backend/src/controllers/scheduleController.ts`
- Modify: `timeflow/apps/backend/src/routes/scheduleRoutes.ts`
- Test: `timeflow/apps/backend/src/services/__tests__/scheduleService.apply.test.ts`

**Step 1: Write the failing test**

```ts
it('rejects invalid blocks and returns an undo token on success', async () => {
  const result = await applyScheduleBlocks('user-1', []);
  expect(result.undoToken).toBeUndefined();
});
```

**Step 2: Run test to verify it fails**

Run: `pnpm -C timeflow/apps/backend test -- scheduleService.apply.test.ts`  
Expected: FAIL (undo token not present or invalid validation flow)

**Step 3: Write minimal implementation**

```ts
// scheduleService.ts
// - Validate blocks before write (reuse validateSchedulePreview).
// - Return { tasksScheduled, habitsScheduled, undoToken }.
// - Persist undoToken in a new table or temp store for rollback.
```

**Step 4: Run test to verify it passes**

Run: `pnpm -C timeflow/apps/backend test -- scheduleService.apply.test.ts`  
Expected: PASS

**Step 5: Commit**

```bash
git add timeflow/apps/backend/src/services/scheduleService.ts \
  timeflow/apps/backend/src/controllers/scheduleController.ts \
  timeflow/apps/backend/src/routes/scheduleRoutes.ts \
  timeflow/apps/backend/src/services/__tests__/scheduleService.apply.test.ts
git commit -m "feat(schedule): validate previews and return undo token"
```

---

### Task 3: Calendar visual preview overlay + confirm CTA

**Files:**
- Modify: `timeflow/apps/web/src/components/SchedulePreviewCard.tsx`
- Modify: `timeflow/apps/web/src/app/assistant/page.tsx`
- Modify: `timeflow/apps/web/src/app/calendar/page.tsx`
- Modify: `timeflow/apps/web/src/lib/api.ts`
- Create: `timeflow/apps/web/src/components/calendar/SchedulePreviewOverlay.tsx`
- Test: `timeflow/apps/web/src/components/calendar/__tests__/SchedulePreviewOverlay.test.tsx`

**Step 1: Write the failing test**

```tsx
render(<SchedulePreviewOverlay blocks={[mockBlock]} />);
expect(screen.getByText(/preview/i)).toBeInTheDocument();
```

**Step 2: Run test to verify it fails**

Run: `pnpm -C timeflow/apps/web test -- SchedulePreviewOverlay.test.tsx`  
Expected: FAIL (component missing)

**Step 3: Write minimal implementation**

```tsx
// SchedulePreviewOverlay.tsx
// Render translucent blocks on the calendar grid with an "Apply" CTA.
```

**Step 4: Run test to verify it passes**

Run: `pnpm -C timeflow/apps/web test -- SchedulePreviewOverlay.test.tsx`  
Expected: PASS

**Step 5: Commit**

```bash
git add timeflow/apps/web/src/components/calendar/SchedulePreviewOverlay.tsx \
  timeflow/apps/web/src/components/calendar/__tests__/SchedulePreviewOverlay.test.tsx \
  timeflow/apps/web/src/components/SchedulePreviewCard.tsx \
  timeflow/apps/web/src/app/assistant/page.tsx \
  timeflow/apps/web/src/app/calendar/page.tsx \
  timeflow/apps/web/src/lib/api.ts
git commit -m "feat(web): add calendar preview overlay + confirm CTA"
```

---

### Task 4: Safe reschedule workflow (assistant → preview → confirm)

**Files:**
- Modify: `timeflow/apps/backend/src/services/assistantService.ts`
- Modify: `timeflow/apps/backend/src/services/scheduleService.ts`
- Modify: `timeflow/apps/web/src/app/assistant/page.tsx`
- Test: `timeflow/apps/backend/src/services/__tests__/assistantService.test.ts`

**Step 1: Write the failing test**

```ts
it('returns a preview only when user asks to reschedule', async () => {
  const result = await processMessage('user-1', 'Move my 2pm task to tomorrow');
  expect(result.suggestions?.blocks?.length).toBeGreaterThan(0);
});
```

**Step 2: Run test to verify it fails**

Run: `pnpm -C timeflow/apps/backend test -- assistantService.test.ts`  
Expected: FAIL

**Step 3: Write minimal implementation**

```ts
// assistantService.ts
// - Include scheduled task IDs in reschedule prompts.
// - Return preview blocks only; never apply.
```

**Step 4: Run test to verify it passes**

Run: `pnpm -C timeflow/apps/backend test -- assistantService.test.ts`  
Expected: PASS

**Step 5: Commit**

```bash
git add timeflow/apps/backend/src/services/assistantService.ts \
  timeflow/apps/backend/src/services/scheduleService.ts \
  timeflow/apps/web/src/app/assistant/page.tsx \
  timeflow/apps/backend/src/services/__tests__/assistantService.test.ts
git commit -m "feat(ai): reschedule preview workflow"
```

---

### Task 5: Daily planning ritual (priority selection + constraint capture)

**Files:**
- Modify: `timeflow/apps/web/src/app/today/page.tsx`
- Modify: `timeflow/apps/backend/src/services/assistantService.ts`
- Create: `timeflow/apps/web/src/components/today/PlanningRitualPanel.tsx`
- Test: `timeflow/apps/web/src/components/today/__tests__/PlanningRitualPanel.test.tsx`

**Step 1: Write the failing test**

```tsx
render(<PlanningRitualPanel />);
expect(screen.getByText(/top priorities/i)).toBeInTheDocument();
```

**Step 2: Run test to verify it fails**

Run: `pnpm -C timeflow/apps/web test -- PlanningRitualPanel.test.tsx`  
Expected: FAIL

**Step 3: Write minimal implementation**

```tsx
// PlanningRitualPanel.tsx
// Collect top 1–3 priorities + time constraints.
```

**Step 4: Run test to verify it passes**

Run: `pnpm -C timeflow/apps/web test -- PlanningRitualPanel.test.tsx`  
Expected: PASS

**Step 5: Commit**

```bash
git add timeflow/apps/web/src/components/today/PlanningRitualPanel.tsx \
  timeflow/apps/web/src/components/today/__tests__/PlanningRitualPanel.test.tsx \
  timeflow/apps/web/src/app/today/page.tsx \
  timeflow/apps/backend/src/services/assistantService.ts
git commit -m "feat(today): add planning ritual flow"
```

---

### Task 6: Task intake → previewed schedule slot (chat + inbox)

**Files:**
- Modify: `timeflow/apps/backend/src/services/assistantService.ts`
- Modify: `timeflow/apps/web/src/app/assistant/page.tsx`
- Modify: `timeflow/apps/web/src/lib/api.ts`
- Test: `timeflow/apps/backend/src/services/__tests__/assistantService.test.ts`

**Step 1: Write the failing test**

```ts
it('creates a task draft and returns a preview slot', async () => {
  const result = await processMessage('user-1', 'Remind me to submit taxes');
  expect(result.message.content.toLowerCase()).toContain('preview');
});
```

**Step 2: Run test to verify it fails**

Run: `pnpm -C timeflow/apps/backend test -- assistantService.test.ts`  
Expected: FAIL

**Step 3: Write minimal implementation**

```ts
// assistantService.ts
// - Detect create-task intent.
// - Create a draft task (not saved) + previewed slot.
```

**Step 4: Run test to verify it passes**

Run: `pnpm -C timeflow/apps/backend test -- assistantService.test.ts`  
Expected: PASS

**Step 5: Commit**

```bash
git add timeflow/apps/backend/src/services/assistantService.ts \
  timeflow/apps/web/src/app/assistant/page.tsx \
  timeflow/apps/web/src/lib/api.ts \
  timeflow/apps/backend/src/services/__tests__/assistantService.test.ts
git commit -m "feat(ai): task intake with previewed slot"
```

---

### Task 7: Inbox AI triage pipeline (draft → confirm → task + schedule)

**Files:**
- Create: `timeflow/apps/backend/src/services/inboxAiService.ts`
- Create: `timeflow/apps/backend/src/controllers/inboxAiController.ts`
- Modify: `timeflow/apps/backend/src/routes/emailRoutes.ts`
- Modify: `timeflow/apps/web/src/app/inbox/page.tsx`
- Create: `timeflow/apps/web/src/components/inbox/InboxAiDraftPanel.tsx`
- Test: `timeflow/apps/backend/src/controllers/__tests__/inboxAiController.test.ts`
- Test: `timeflow/apps/web/src/components/inbox/__tests__/InboxAiDraftPanel.test.tsx`

**Step 1: Write the failing test (backend)**

```ts
it('returns a draft with confirm-only CTA', async () => {
  const res = await draftTaskFromEmail(request, reply);
  expect(reply.send).toHaveBeenCalledWith(
    expect.objectContaining({ draft: expect.any(Object), confirmCta: expect.any(String) })
  );
});
```

**Step 2: Run test to verify it fails**

Run: `pnpm -C timeflow/apps/backend test -- inboxAiController.test.ts`  
Expected: FAIL

**Step 3: Write minimal implementation**

```ts
// inboxAiService.ts
// Return drafts only; never auto-apply.
```

**Step 4: Run test to verify it passes**

Run: `pnpm -C timeflow/apps/backend test -- inboxAiController.test.ts`  
Expected: PASS

**Step 5: Write the failing test (web)**

```tsx
render(<InboxAiDraftPanel isOpen email={mockEmail} onConfirm={vi.fn()} onClose={vi.fn()} />);
expect(screen.getByText(/confirm/i)).toBeInTheDocument();
```

**Step 6: Run test to verify it fails**

Run: `pnpm -C timeflow/apps/web test -- InboxAiDraftPanel.test.tsx`  
Expected: FAIL

**Step 7: Write minimal implementation**

```tsx
// InboxAiDraftPanel.tsx
// Show draft + confirm checkbox + CTA.
```

**Step 8: Run test to verify it passes**

Run: `pnpm -C timeflow/apps/web test -- InboxAiDraftPanel.test.tsx`  
Expected: PASS

**Step 9: Commit**

```bash
git add timeflow/apps/backend/src/services/inboxAiService.ts \
  timeflow/apps/backend/src/controllers/inboxAiController.ts \
  timeflow/apps/backend/src/routes/emailRoutes.ts \
  timeflow/apps/web/src/app/inbox/page.tsx \
  timeflow/apps/web/src/components/inbox/InboxAiDraftPanel.tsx \
  timeflow/apps/backend/src/controllers/__tests__/inboxAiController.test.ts \
  timeflow/apps/web/src/components/inbox/__tests__/InboxAiDraftPanel.test.tsx
git commit -m "feat(inbox): add confirm-only AI triage pipeline"
```

---

### Task 8: Preference memory + editable rules UI

**Files:**
- Modify: `timeflow/apps/backend/src/services/assistantService.ts`
- Modify: `timeflow/apps/backend/prisma/schema.prisma`
- Modify: `timeflow/apps/web/src/app/settings/page.tsx`
- Create: `timeflow/apps/web/src/components/settings/AiPreferencesPanel.tsx`
- Test: `timeflow/apps/web/src/components/settings/__tests__/AiPreferencesPanel.test.tsx`

**Step 1: Write the failing test**

```tsx
render(<AiPreferencesPanel />);
expect(screen.getByText(/deep work/i)).toBeInTheDocument();
```

**Step 2: Run test to verify it fails**

Run: `pnpm -C timeflow/apps/web test -- AiPreferencesPanel.test.tsx`  
Expected: FAIL

**Step 3: Write minimal implementation**

```tsx
// AiPreferencesPanel.tsx
// UI for working blocks, meeting-free hours, and priorities.
```

**Step 4: Run test to verify it passes**

Run: `pnpm -C timeflow/apps/web test -- AiPreferencesPanel.test.tsx`  
Expected: PASS

**Step 5: Commit**

```bash
git add timeflow/apps/web/src/components/settings/AiPreferencesPanel.tsx \
  timeflow/apps/web/src/components/settings/__tests__/AiPreferencesPanel.test.tsx \
  timeflow/apps/web/src/app/settings/page.tsx \
  timeflow/apps/backend/prisma/schema.prisma \
  timeflow/apps/backend/src/services/assistantService.ts
git commit -m "feat(ai): add preference memory + settings UI"
```

---

### Task 9: Proactive insights across Today/Calendar/Inbox

**Files:**
- Create: `timeflow/apps/backend/src/services/insightsService.ts`
- Modify: `timeflow/apps/web/src/app/today/page.tsx`
- Modify: `timeflow/apps/web/src/app/inbox/page.tsx`
- Modify: `timeflow/apps/web/src/app/calendar/page.tsx`
- Test: `timeflow/apps/backend/src/services/__tests__/insightsService.test.ts`

**Step 1: Write the failing test**

```ts
it('summarizes overload days and suggests an action', async () => {
  const insights = await buildInsights('user-1');
  expect(insights[0].cta).toMatch(/preview/i);
});
```

**Step 2: Run test to verify it fails**

Run: `pnpm -C timeflow/apps/backend test -- insightsService.test.ts`  
Expected: FAIL

**Step 3: Write minimal implementation**

```ts
// insightsService.ts
// Generate one daily insight + preview CTA.
```

**Step 4: Run test to verify it passes**

Run: `pnpm -C timeflow/apps/backend test -- insightsService.test.ts`  
Expected: PASS

**Step 5: Commit**

```bash
git add timeflow/apps/backend/src/services/insightsService.ts \
  timeflow/apps/backend/src/services/__tests__/insightsService.test.ts \
  timeflow/apps/web/src/app/today/page.tsx \
  timeflow/apps/web/src/app/inbox/page.tsx \
  timeflow/apps/web/src/app/calendar/page.tsx
git commit -m "feat(insights): add proactive assistant nudges"
```

---

### Task 10: AI regression harness for confirm-only language

**Files:**
- Modify: `timeflow/apps/backend/scripts/aiRegressionUtils.js`
- Modify: `timeflow/apps/backend/src/scripts/aiRegressionUtils.test.ts`
- Modify: `timeflow/apps/backend/scripts/test-ai-prompts.js`
- Modify: `timeflow/apps/backend/scripts/prompts/sprint13-regression.txt`

**Step 1: Write the failing test**

```ts
expect(parsePrompts(raw)).toMatchObject({
  expect: { noAutoApplyLanguage: true }
});
```

**Step 2: Run test to verify it fails**

Run: `pnpm -C timeflow/apps/backend test -- aiRegressionUtils.test.ts`  
Expected: FAIL

**Step 3: Write minimal implementation**

```js
// aiRegressionUtils.js
// Reject auto-apply language ("I applied", "updated your calendar").
```

**Step 4: Run test to verify it passes**

Run: `pnpm -C timeflow/apps/backend test -- aiRegressionUtils.test.ts`  
Expected: PASS

**Step 5: Commit**

```bash
git add timeflow/apps/backend/scripts/aiRegressionUtils.js \
  timeflow/apps/backend/src/scripts/aiRegressionUtils.test.ts \
  timeflow/apps/backend/scripts/test-ai-prompts.js \
  timeflow/apps/backend/scripts/prompts/sprint13-regression.txt
git commit -m "test(ai): enforce confirm-only language in regression"
```

---

**Plan complete and saved to** `docs/plans/2026-01-22-ai-assistant-comprehensive-workflows-plan.md`.

Two execution options:

1. **Subagent-Driven (this session)** — I dispatch a fresh subagent per task, review between tasks, fast iteration  
2. **Parallel Session (separate)** — Open new session with executing-plans, batch execution with checkpoints

**Which approach?**
