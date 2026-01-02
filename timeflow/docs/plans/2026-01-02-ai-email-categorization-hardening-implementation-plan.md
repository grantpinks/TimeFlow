# AI Email Categorization Hardening Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Improve email categorization accuracy (Newsletter, Travel, Work/Professional, Personal, Updates), add AI fallback for low-confidence cases, and add a Needs Response flag with a filter toggle.

**Architecture:** Keep rules-first categorization with confidence scoring. Only invoke AI when confidence is low or ambiguous. Add Needs Response as a separate flag computed with rules and AI fallback, and expose it in the inbox UI as a filter toggle.

**Tech Stack:** Fastify (backend), TypeScript, OpenAI SDK, React/Next.js, Vitest.

---

### Task 1: Add rule confidence scoring for email categorization

**Files:**
- Modify: `timeflow/apps/backend/src/services/emailCategorizationService.ts`
- Test: `timeflow/apps/backend/src/services/__tests__/emailCategorizationService.test.ts`

**Step 1: Write the failing test**

```ts
it('returns a higher confidence for domain or strong keyword matches', () => {
  const result = scoreEmailCategory({
    from: 'newsletter@morningbrew.com',
    subject: 'Today\'s edition',
    snippet: 'View in browser and unsubscribe',
    labels: [],
  });

  expect(result.category).toBe('newsletter');
  expect(result.confidence).toBeGreaterThan(0.7);
});
```

**Step 2: Run test to verify it fails**

Run: `pnpm -C timeflow/apps/backend test -- emailCategorizationService`
Expected: FAIL with "scoreEmailCategory is not a function" or missing confidence.

**Step 3: Write minimal implementation**

```ts
export function scoreEmailCategory(email: Pick<EmailMessage, 'from' | 'subject' | 'snippet' | 'labels'>) {
  const category = categorizeEmail(email);
  const confidence = deriveConfidence(email, category);
  return { category, confidence };
}
```

**Step 4: Run test to verify it passes**

Run: `pnpm -C timeflow/apps/backend test -- emailCategorizationService`
Expected: PASS

**Step 5: Commit**

```bash
git add timeflow/apps/backend/src/services/emailCategorizationService.ts timeflow/apps/backend/src/services/__tests__/emailCategorizationService.test.ts
git commit -m "feat: add confidence scoring for email categorization"
```

---

### Task 2: Harden rule signals for Newsletter, Travel, Work, Personal, Updates

**Files:**
- Modify: `timeflow/apps/backend/src/services/emailCategorizationService.ts`
- Test: `timeflow/apps/backend/src/services/__tests__/emailCategorizationService.test.ts`

**Step 1: Write the failing tests**

```ts
it('categorizes Morning Brew as newsletter', () => {
  const category = categorizeEmail({
    from: 'Morning Brew <newsletter@morningbrew.com>',
    subject: 'Today\'s edition',
    snippet: 'View in browser - unsubscribe',
    labels: [],
  });
  expect(category).toBe('newsletter');
});

it('categorizes hotel reservation confirmation as travel', () => {
  const category = categorizeEmail({
    from: 'reservations@marriott.com',
    subject: 'Your reservation confirmation',
    snippet: 'Confirmation number and check-in details',
    labels: [],
  });
  expect(category).toBe('travel');
});

it('categorizes coffee chat invite as work', () => {
  const category = categorizeEmail({
    from: 'Jane Doe <jane@company.com>',
    subject: 'Coffee chat next week?',
    snippet: 'Would love to connect and find time to chat',
    labels: [],
  });
  expect(category).toBe('work');
});
```

**Step 2: Run test to verify it fails**

Run: `pnpm -C timeflow/apps/backend test -- emailCategorizationService`
Expected: FAIL with mismatched categories.

**Step 3: Write minimal implementation**

- Expand category domain lists and keywords in `EMAIL_CATEGORIES`.
- Add phrase patterns (edition, view in browser, reservation number, interview, coffee chat).

**Step 4: Run test to verify it passes**

Run: `pnpm -C timeflow/apps/backend test -- emailCategorizationService`
Expected: PASS

**Step 5: Commit**

```bash
git add timeflow/apps/backend/src/services/emailCategorizationService.ts timeflow/apps/backend/src/services/__tests__/emailCategorizationService.test.ts
git commit -m "feat: harden email categorization rules"
```

---

### Task 3: Add AI email categorization fallback service

**Files:**
- Create: `timeflow/apps/backend/src/services/aiEmailCategorizationService.ts`
- Modify: `timeflow/apps/backend/src/services/emailCategorizationService.ts`
- Test: `timeflow/apps/backend/src/services/__tests__/aiEmailCategorizationService.test.ts`

**Step 1: Write the failing test**

```ts
it('returns a category from AI output when confidence is high', async () => {
  const result = await categorizeEmailWithAI({
    from: 'news@unknown.com',
    subject: 'Daily brief',
    snippet: 'View in browser',
  });

  expect(result.categoryId).toBe('newsletter');
  expect(result.confidence).toBeGreaterThan(0.7);
});
```

**Step 2: Run test to verify it fails**

Run: `pnpm -C timeflow/apps/backend test -- aiEmailCategorizationService`
Expected: FAIL with "categorizeEmailWithAI is not a function".

**Step 3: Write minimal implementation**

- Add an email-focused AI categorizer using OpenAI SDK.
- Prompt includes sender, domain, subject, snippet, and category options.
- Return JSON `{ categoryId, confidence, reasoning }`.

**Step 4: Run test to verify it passes**

Run: `pnpm -C timeflow/apps/backend test -- aiEmailCategorizationService`
Expected: PASS

**Step 5: Commit**

```bash
git add timeflow/apps/backend/src/services/aiEmailCategorizationService.ts timeflow/apps/backend/src/services/__tests__/aiEmailCategorizationService.test.ts timeflow/apps/backend/src/services/emailCategorizationService.ts
git commit -m "feat: add AI fallback for email categorization"
```

---

### Task 4: Wire AI fallback into Gmail fetch path

**Files:**
- Modify: `timeflow/apps/backend/src/services/gmailService.ts`
- Test: `timeflow/apps/backend/src/services/__tests__/gmailService.test.ts`

**Step 1: Write the failing test**

```ts
it('uses AI fallback when rule confidence is low', async () => {
  const message = { from: 'unknown@unknown.com', subject: 'Daily brief', snippet: 'View in browser' };
  const result = await scoreEmailCategoryWithFallback(message);
  expect(result.category).toBe('newsletter');
});
```

**Step 2: Run test to verify it fails**

Run: `pnpm -C timeflow/apps/backend test -- gmailService`
Expected: FAIL with missing fallback behavior.

**Step 3: Write minimal implementation**

- Add `scoreEmailCategoryWithFallback` to combine rule scoring and AI when needed.
- Use the function in `mapMessage` and `getFullEmail`.

**Step 4: Run test to verify it passes**

Run: `pnpm -C timeflow/apps/backend test -- gmailService`
Expected: PASS

**Step 5: Commit**

```bash
git add timeflow/apps/backend/src/services/gmailService.ts timeflow/apps/backend/src/services/__tests__/gmailService.test.ts
git commit -m "feat: wire AI fallback into email categorization"
```

---

### Task 5: Add Needs Response rules and tests

**Files:**
- Modify: `timeflow/apps/backend/src/services/emailCategorizationService.ts`
- Test: `timeflow/apps/backend/src/services/__tests__/emailCategorizationService.test.ts`

**Step 1: Write the failing test**

```ts
it('flags reply-needed emails using rules', () => {
  const result = detectNeedsResponse({
    from: 'jane@company.com',
    subject: 'Can we meet next week?',
    snippet: 'Let me know what times work',
  });
  expect(result.needsResponse).toBe(true);
  expect(result.confidence).toBeGreaterThan(0.6);
});
```

**Step 2: Run test to verify it fails**

Run: `pnpm -C timeflow/apps/backend test -- emailCategorizationService`
Expected: FAIL with missing function.

**Step 3: Write minimal implementation**

- Add `detectNeedsResponse` with keyword patterns and question detection.
- Return `{ needsResponse, confidence }`.

**Step 4: Run test to verify it passes**

Run: `pnpm -C timeflow/apps/backend test -- emailCategorizationService`
Expected: PASS

**Step 5: Commit**

```bash
git add timeflow/apps/backend/src/services/emailCategorizationService.ts timeflow/apps/backend/src/services/__tests__/emailCategorizationService.test.ts
git commit -m "feat: add needs-response rule detector"
```

---

### Task 6: Add AI fallback for Needs Response

**Files:**
- Modify: `timeflow/apps/backend/src/services/aiEmailCategorizationService.ts`
- Test: `timeflow/apps/backend/src/services/__tests__/aiEmailCategorizationService.test.ts`

**Step 1: Write the failing test**

```ts
it('returns needsResponse true when AI is confident', async () => {
  const result = await detectNeedsResponseWithAI({
    from: 'alice@company.com',
    subject: 'Quick question',
    snippet: 'Could you reply by EOD?',
  });

  expect(result.needsResponse).toBe(true);
  expect(result.confidence).toBeGreaterThan(0.7);
});
```

**Step 2: Run test to verify it fails**

Run: `pnpm -C timeflow/apps/backend test -- aiEmailCategorizationService`
Expected: FAIL with missing function.

**Step 3: Write minimal implementation**

- Add a small AI prompt for needs-response classification.
- Only accept AI when confidence >= 0.7.

**Step 4: Run test to verify it passes**

Run: `pnpm -C timeflow/apps/backend test -- aiEmailCategorizationService`
Expected: PASS

**Step 5: Commit**

```bash
git add timeflow/apps/backend/src/services/aiEmailCategorizationService.ts timeflow/apps/backend/src/services/__tests__/aiEmailCategorizationService.test.ts
git commit -m "feat: add AI fallback for needs-response"
```

---

### Task 7: Expose Needs Response in shared types and API responses

**Files:**
- Modify: `timeflow/packages/shared/src/types/email.ts`
- Modify: `timeflow/apps/backend/src/services/gmailService.ts`
- Test: `timeflow/apps/backend/src/services/__tests__/gmailService.test.ts`

**Step 1: Write the failing test**

```ts
it('includes needsResponse on full email payload', async () => {
  const email = await getFullEmail('user-id', 'email-id');
  expect(email.needsResponse).toBeDefined();
});
```

**Step 2: Run test to verify it fails**

Run: `pnpm -C timeflow/apps/backend test -- gmailService`
Expected: FAIL with missing field.

**Step 3: Write minimal implementation**

- Add `needsResponse?: boolean` to `EmailMessage` and `FullEmailMessage`.
- Set the field from the detector output in `gmailService`.

**Step 4: Run test to verify it passes**

Run: `pnpm -C timeflow/apps/backend test -- gmailService`
Expected: PASS

**Step 5: Commit**

```bash
git add timeflow/packages/shared/src/types/email.ts timeflow/apps/backend/src/services/gmailService.ts timeflow/apps/backend/src/services/__tests__/gmailService.test.ts
git commit -m "feat: expose needs-response flag in email payload"
```

---

### Task 8: Add inbox UI badge and filter toggle

**Files:**
- Modify: `timeflow/apps/web/src/app/inbox/page.tsx`
- Modify: `timeflow/apps/web/src/components/EmailViewer.tsx`

**Step 1: Write the failing test**

If no UI test harness exists, add a minimal manual QA checklist in the plan and skip automated UI tests.

**Step 2: Implement UI changes**

- Add a filter toggle for Needs Reply.
- Show a badge on list items and in the reading pane header.

**Step 3: Manual verification**

- Load inbox with a known reply-needed email and confirm badge + filter.

**Step 4: Commit**

```bash
git add timeflow/apps/web/src/app/inbox/page.tsx timeflow/apps/web/src/components/EmailViewer.tsx
git commit -m "feat: add needs-reply badge and filter"
```

---

### Task 9: Add eval set and regression tests

**Files:**
- Create: `timeflow/apps/backend/src/services/__tests__/emailCategorizationEvalSet.ts`
- Modify: `timeflow/apps/backend/src/services/__tests__/emailCategorizationService.test.ts`

**Step 1: Write the failing test**

```ts
it('passes the email categorization eval set', () => {
  const failures = runEmailEvalSet();
  expect(failures).toEqual([]);
});
```

**Step 2: Run test to verify it fails**

Run: `pnpm -C timeflow/apps/backend test -- emailCategorizationService`
Expected: FAIL with list of mismatches.

**Step 3: Write minimal implementation**

- Add an eval set with expected categories and needs-response flags.
- Update rules or thresholds to reduce mismatches.

**Step 4: Run test to verify it passes**

Run: `pnpm -C timeflow/apps/backend test -- emailCategorizationService`
Expected: PASS

**Step 5: Commit**

```bash
git add timeflow/apps/backend/src/services/__tests__/emailCategorizationEvalSet.ts timeflow/apps/backend/src/services/__tests__/emailCategorizationService.test.ts
git commit -m "test: add email categorization eval set"
```

---

### Task 10: Analytics and logging (privacy-safe)

**Files:**
- Modify: `timeflow/apps/backend/src/services/gmailService.ts`
- Modify: `timeflow/apps/backend/src/utils/analytics.ts` (or existing analytics helper)

**Step 1: Write the failing test**

```ts
it('emits analytics without raw email content', () => {
  const payload = buildCategorizationAnalytics({
    category: 'newsletter',
    needsResponse: false,
    usedAi: true,
  });
  expect(payload).not.toHaveProperty('subject');
  expect(payload).not.toHaveProperty('snippet');
});
```

**Step 2: Run test to verify it fails**

Run: `pnpm -C timeflow/apps/backend test -- analytics`
Expected: FAIL with missing helper.

**Step 3: Write minimal implementation**

- Emit counters and booleans only (no raw content).

**Step 4: Run test to verify it passes**

Run: `pnpm -C timeflow/apps/backend test -- analytics`
Expected: PASS

**Step 5: Commit**

```bash
git add timeflow/apps/backend/src/services/gmailService.ts timeflow/apps/backend/src/utils/analytics.ts
git commit -m "feat: add privacy-safe email categorization analytics"
```

---

### Task 11: Documentation updates

**Files:**
- Modify: `timeflow/ARCHITECT_ROADMAP_SPRINT1-17.md`
- Modify: `timeflow/docs/SPRINT_16_PLAN.md`
- Modify: `timeflow/docs/plans/2026-01-02-ai-email-categorization-hardening-design.md`

**Step 1: Update docs**

- Add Phase B+ tasks to roadmap.
- Link to design and plan docs from Sprint 16 plan.

**Step 2: Commit**

```bash
git add timeflow/ARCHITECT_ROADMAP_SPRINT1-17.md timeflow/docs/SPRINT_16_PLAN.md timeflow/docs/plans/2026-01-02-ai-email-categorization-hardening-design.md timeflow/docs/plans/2026-01-02-ai-email-categorization-hardening-implementation-plan.md
git commit -m "docs: plan AI email categorization hardening"
```
