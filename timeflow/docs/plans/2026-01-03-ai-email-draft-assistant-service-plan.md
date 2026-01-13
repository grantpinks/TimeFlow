# AI Email Draft Assistant Service Integration Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Replace the placeholder AI email draft generator with assistant service integration using a dedicated email-draft mode and prompt.

**Architecture:** Add an `email-draft` mode to the assistant service, define a focused system prompt and context builder, and wire the email draft controller to call the assistant pipeline instead of the placeholder. Ensure responses are structured and deterministic where needed, and preserve safe logging requirements.

**Tech Stack:** Node/TypeScript, existing assistantService/promptManager, backend controllers, Vitest/Jest (as used in repo).

---

### Task 1: Define assistant prompt + mode (tests first)

**Files:**
- Modify: `timeflow/apps/backend/src/services/assistantService.ts`
- Modify: `timeflow/apps/backend/src/services/promptManager.ts`
- Create: `timeflow/apps/backend/src/services/__tests__/assistantService.emailDraft.test.ts`

**Step 1: Write failing test**

```typescript
import { describe, expect, it } from 'vitest';
import { runAssistantTask } from '../assistantService';

describe('assistantService email-draft mode', () => {
  it('returns structured email draft output', async () => {
    const result = await runAssistantTask('email-draft', {
      subject: 'Re: Q4 Planning',
      from: 'john@example.com',
      body: 'Can you meet next week?'
    });

    expect(result).toHaveProperty('draftText');
    expect(typeof result.draftText).toBe('string');
    expect(result.draftText.length).toBeGreaterThan(0);
  });
});
```

**Step 2: Run test to verify it fails**

Run: `pnpm -C timeflow/apps/backend test -- assistantService.emailDraft.test.ts`
Expected: FAIL (mode not implemented)

**Step 3: Implement minimal code**

- Add `email-draft` mode to assistant service routing.
- Add prompt template in `promptManager.ts` for email drafting with voice preferences.
- Ensure response parsing returns `{ draftText }` and errors cleanly.

**Step 4: Run test to verify it passes**

Run: `pnpm -C timeflow/apps/backend test -- assistantService.emailDraft.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add timeflow/apps/backend/src/services/assistantService.ts \
  timeflow/apps/backend/src/services/promptManager.ts \
  timeflow/apps/backend/src/services/__tests__/assistantService.emailDraft.test.ts
git commit -m "feat: add assistant email-draft mode"
```

---

### Task 2: Build email draft context (tests first)

**Files:**
- Modify: `timeflow/apps/backend/src/controllers/emailDraftController.ts`
- Create: `timeflow/apps/backend/src/controllers/__tests__/emailDraftContext.test.ts`

**Step 1: Write failing test**

```typescript
import { describe, expect, it } from 'vitest';
import { buildEmailDraftContext } from '../emailDraftController';

describe('buildEmailDraftContext', () => {
  it('maps voice preferences and email fields', () => {
    const ctx = buildEmailDraftContext({
      from: 'john@example.com',
      subject: 'Hello',
      body: 'Hi there',
      voicePreferences: { formality: 7, length: 4, tone: 6 },
      voiceSamples: 'Sample text'
    });

    expect(ctx.voice.formality).toBe(7);
    expect(ctx.email.subject).toBe('Hello');
  });
});
```

**Step 2: Run test to verify it fails**

Run: `pnpm -C timeflow/apps/backend test -- emailDraftContext.test.ts`
Expected: FAIL (helper missing)

**Step 3: Implement minimal code**

- Add `buildEmailDraftContext()` in `emailDraftController.ts` (or shared helper file).
- Ensure the context includes: from/to/subject/body, voice preferences, and voice samples.

**Step 4: Run test to verify it passes**

Run: `pnpm -C timeflow/apps/backend test -- emailDraftContext.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add timeflow/apps/backend/src/controllers/emailDraftController.ts \
  timeflow/apps/backend/src/controllers/__tests__/emailDraftContext.test.ts
git commit -m "feat: build email draft context"
```

---

### Task 3: Replace placeholder draft generation (tests first)

**Files:**
- Modify: `timeflow/apps/backend/src/controllers/emailDraftController.ts`
- Modify: `timeflow/apps/backend/src/services/assistantService.ts`
- Test: reuse or add `timeflow/apps/backend/src/controllers/__tests__/emailDraftController.test.ts`

**Step 1: Write failing test**

```typescript
import { describe, expect, it, vi } from 'vitest';
import { generateEmailDraft } from '../emailDraftController';
import * as assistantService from '../../services/assistantService';

vi.spyOn(assistantService, 'runAssistantTask').mockResolvedValue({ draftText: 'Draft' });

it('uses assistantService instead of placeholder', async () => {
  const result = await generateEmailDraft({ /* minimal valid input */ } as any, {} as any);
  expect(assistantService.runAssistantTask).toHaveBeenCalled();
  expect(result.draftText).toBe('Draft');
});
```

**Step 2: Run test to verify it fails**

Run: `pnpm -C timeflow/apps/backend test -- emailDraftController.test.ts`
Expected: FAIL (placeholder still used)

**Step 3: Implement minimal code**

- Replace `generateDraftWithLLM()` placeholder with `runAssistantTask('email-draft', context)`.
- Preserve existing error handling, determinism, and safe logging.

**Step 4: Run test to verify it passes**

Run: `pnpm -C timeflow/apps/backend test -- emailDraftController.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add timeflow/apps/backend/src/controllers/emailDraftController.ts \
  timeflow/apps/backend/src/services/assistantService.ts \
  timeflow/apps/backend/src/controllers/__tests__/emailDraftController.test.ts
git commit -m "feat: wire email draft generation to assistant service"
```

---

### Task 4: Final verification (after all tasks)

**Step 1: Run backend tests**

Run: `pnpm -C timeflow/apps/backend test`
Expected: PASS

**Step 2: Commit any fixes**

```bash
git status
git add -A
git commit -m "test: fix remaining assistant draft issues"
```
