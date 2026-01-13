# AI Email Draft Frontend Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Implement the AI Email Draft frontend workflow (DraftPanel + trigger button + writing-voice settings) to match Sprint 16 Phase B+ requirements with tests.

**Architecture:** Enhance the existing DraftPanel state machine to cover setup/generate/edit/preview/success/error flows, add reply-all logic and determinism-safe preview/send flow, and connect the thread detail trigger button. Update writing-voice settings page behaviors for save UX and toasts. Add focused component tests via Vitest/Testing Library.

**Tech Stack:** Next.js (App Router), React, TypeScript, Tailwind, Vitest, Testing Library, framer-motion.

---

### Task 1: DraftPanel helpers for reply-all + determinism safety (tests first)

**Files:**
- Create: `timeflow/apps/web/src/components/inbox/draftPanelUtils.ts`
- Create: `timeflow/apps/web/src/components/inbox/__tests__/draftPanelUtils.test.ts`

**Step 1: Write the failing tests**

```typescript
import { describe, expect, it } from 'vitest';
import { buildReplyAllRecipients, shouldShowReplyAll } from '../draftPanelUtils';

describe('draftPanelUtils', () => {
  it('dedupes recipients and excludes user email', () => {
    const result = buildReplyAllRecipients({
      from: 'Sender <sender@example.com>',
      replyTo: 'reply@example.com',
      to: 'Me <me@example.com>, Other <other@example.com>',
      cc: 'cc@example.com, ME@EXAMPLE.COM',
      userEmails: ['me@example.com'],
    });

    expect(result.to).toBe('reply@example.com');
    expect(result.cc).toBe('other@example.com, cc@example.com');
  });

  it('shows reply-all toggle only when multiple recipients exist', () => {
    expect(
      shouldShowReplyAll({ to: 'one@example.com', cc: undefined })
    ).toBe(false);

    expect(
      shouldShowReplyAll({ to: 'a@example.com, b@example.com', cc: undefined })
    ).toBe(true);
  });
});
```

**Step 2: Run tests to verify they fail**

Run: `pnpm -C timeflow/apps/web test -- draftPanelUtils.test.ts`
Expected: FAIL (module not found)

**Step 3: Write minimal implementation**

```typescript
export function buildReplyAllRecipients(params: {
  from: string;
  replyTo?: string;
  to?: string;
  cc?: string;
  userEmails: string[];
}) {
  // Minimal parsing and dedupe; use replyTo or from for primary "to"
}

export function shouldShowReplyAll(params: { to?: string; cc?: string }) {
  // Return true when >1 unique recipient across to/cc
}
```

**Step 4: Run tests to verify pass**

Run: `pnpm -C timeflow/apps/web test -- draftPanelUtils.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add timeflow/apps/web/src/components/inbox/draftPanelUtils.ts \
  timeflow/apps/web/src/components/inbox/__tests__/draftPanelUtils.test.ts
git commit -m "test: add draft panel reply-all helpers"
```

---

### Task 2: DraftPanel state machine + preview workflow (tests first)

**Files:**
- Modify: `timeflow/apps/web/src/components/inbox/DraftPanel.tsx`
- Create: `timeflow/apps/web/src/components/inbox/__tests__/DraftPanel.test.tsx`

**Step 1: Write failing tests for primary states**

```typescript
/**
 * @vitest-environment jsdom
 */
import { describe, expect, it, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { DraftPanel } from '../DraftPanel';
import * as api from '@/lib/api';

vi.mock('@/lib/api');

const baseEmail = {
  id: 'email-1',
  threadId: 'thread-1',
  from: 'Sender <sender@example.com>',
  subject: 'Hello',
  receivedAt: new Date().toISOString(),
  importance: 'normal',
  body: 'Test',
  to: 'Me <me@example.com>',
  cc: 'Other <other@example.com>',
};

describe('DraftPanel', () => {
  it('renders generate state and calls generate on click', async () => {
    (api.getWritingVoice as any).mockResolvedValue({ formality: 5, length: 5, tone: 5, voiceSamples: null, aiDraftsGenerated: 0 });
    (api.generateEmailDraft as any).mockResolvedValue({ draftText: 'Hi', to: 'sender@example.com', subject: 'Re: Hello', metadata: { generatedAt: '', modelUsed: '' } });

    render(<DraftPanel isOpen email={baseEmail as any} onClose={() => {}} />);
    fireEvent.click(screen.getByText('Generate Draft'));

    await waitFor(() => expect(api.generateEmailDraft).toHaveBeenCalled());
  });

  it('requires preview before send', async () => {
    (api.getWritingVoice as any).mockResolvedValue({ formality: 5, length: 5, tone: 5, voiceSamples: null, aiDraftsGenerated: 0 });
    (api.generateEmailDraft as any).mockResolvedValue({ draftText: 'Hi', to: 'sender@example.com', subject: 'Re: Hello', metadata: { generatedAt: '', modelUsed: '' } });
    (api.generateEmailPreview as any).mockResolvedValue({ htmlPreview: '<p>Hi</p>', textPreview: 'Hi', determinismToken: 'token', previewedAt: '' });

    render(<DraftPanel isOpen email={baseEmail as any} onClose={() => {}} />);
    fireEvent.click(screen.getByText('Generate Draft'));
    await screen.findByText('Preview Draft →');
    fireEvent.click(screen.getByText('Preview Draft →'));
    await screen.findByText('Send from TimeFlow');
    expect(screen.getByText('Send from TimeFlow')).toBeDisabled();
  });
});
```

**Step 2: Run tests to verify they fail**

Run: `pnpm -C timeflow/apps/web test -- DraftPanel.test.tsx`
Expected: FAIL (missing text/state)

**Step 3: Implement minimal DraftPanel changes**

Update `DraftPanel.tsx` to:
- Align state names with spec: `setup | generating | editable | preview | success | error`
- Add reply-all toggle in preview when `shouldShowReplyAll(...)` returns true
- Ensure determinism token invalidates on draft edits after preview
- Add quick refine buttons (shorter, more formal, warmer) in editable state
- Add character counter
- Replace success auto-close with success screen actions (view Gmail, close, draft another)
- Add error state UI with retry and cancel
- Keep AbortController for cancel generation

**Step 4: Run tests to verify pass**

Run: `pnpm -C timeflow/apps/web test -- DraftPanel.test.tsx`
Expected: PASS

**Step 5: Commit**

```bash
git add timeflow/apps/web/src/components/inbox/DraftPanel.tsx \
  timeflow/apps/web/src/components/inbox/__tests__/DraftPanel.test.tsx
git commit -m "feat: complete draft panel workflow states"
```

---

### Task 3: DraftPanel reply-all toggle integration (tests first)

**Files:**
- Modify: `timeflow/apps/web/src/components/inbox/DraftPanel.tsx`
- Modify: `timeflow/apps/web/src/app/inbox/page.tsx`

**Step 1: Write failing test for reply-all toggle**

```typescript
// In DraftPanel.test.tsx
it('includes cc when reply-all toggle is enabled', async () => {
  (api.getWritingVoice as any).mockResolvedValue({ formality: 5, length: 5, tone: 5, voiceSamples: null, aiDraftsGenerated: 0 });
  (api.generateEmailDraft as any).mockResolvedValue({ draftText: 'Hi', to: 'sender@example.com', subject: 'Re: Hello', metadata: { generatedAt: '', modelUsed: '' } });
  (api.generateEmailPreview as any).mockResolvedValue({ htmlPreview: '<p>Hi</p>', textPreview: 'Hi', determinismToken: 'token', previewedAt: '' });

  render(<DraftPanel isOpen email={baseEmail as any} userEmails={['me@example.com']} onClose={() => {}} />);
  fireEvent.click(screen.getByText('Generate Draft'));
  await screen.findByText('Preview Draft →');
  fireEvent.click(screen.getByText('Preview Draft →'));
  await screen.findByLabelText('Reply all');
  fireEvent.click(screen.getByLabelText('Reply all'));
  fireEvent.click(screen.getByText('Preview Draft →'));

  await waitFor(() => expect(api.generateEmailPreview).toHaveBeenCalledWith(expect.objectContaining({ cc: expect.stringContaining('other@example.com') })));
});
```

**Step 2: Run tests to verify they fail**

Run: `pnpm -C timeflow/apps/web test -- DraftPanel.test.tsx`
Expected: FAIL (missing prop / toggle / cc behavior)

**Step 3: Implement minimal changes**

Update:
- `DraftPanel.tsx` to accept `userEmails?: string[]`
- `DraftPanel.tsx` to use `buildReplyAllRecipients` and toggle to set `cc`
- `inbox/page.tsx` to pass user email(s) into DraftPanel

**Step 4: Run tests to verify pass**

Run: `pnpm -C timeflow/apps/web test -- DraftPanel.test.tsx`
Expected: PASS

**Step 5: Commit**

```bash
git add timeflow/apps/web/src/components/inbox/DraftPanel.tsx \
  timeflow/apps/web/src/app/inbox/page.tsx
git commit -m "feat: add reply-all toggle and cc computation"
```

---

### Task 4: AI Draft button placement audit (tests first if changed)

**Files:**
- Modify (if needed): `timeflow/apps/web/src/app/inbox/page.tsx`
- Test (if needed): `timeflow/apps/web/src/app/inbox/__tests__/InboxPageDraftButton.test.tsx`

**Step 1: Add test if button changes are required**

```typescript
/**
 * @vitest-environment jsdom
 */
import { render, screen } from '@testing-library/react';
import InboxPage from '../page';

// Mock data to render thread detail
// Expect "Draft Reply with AI" button present
```

**Step 2: Run test to verify fail**

Run: `pnpm -C timeflow/apps/web test -- InboxPageDraftButton.test.tsx`
Expected: FAIL (if not present)

**Step 3: Implement minimal changes**

Ensure the button exists next to reply/forward actions and triggers DraftPanel.

**Step 4: Run tests**

Run: `pnpm -C timeflow/apps/web test -- InboxPageDraftButton.test.tsx`
Expected: PASS

**Step 5: Commit**

```bash
git add timeflow/apps/web/src/app/inbox/page.tsx \
  timeflow/apps/web/src/app/inbox/__tests__/InboxPageDraftButton.test.tsx
git commit -m "test: validate AI draft button placement"
```

---

### Task 5: Writing Voice settings page UX updates (tests first)

**Files:**
- Modify: `timeflow/apps/web/src/app/settings/writing-voice/page.tsx`
- Create: `timeflow/apps/web/src/app/settings/__tests__/writingVoice.test.tsx`

**Step 1: Write failing test for save UX**

```typescript
/**
 * @vitest-environment jsdom
 */
import { describe, expect, it, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import WritingVoiceSettingsPage from '../writing-voice/page';
import * as api from '@/lib/api';

vi.mock('@/lib/api');

it('saves and shows success feedback', async () => {
  (api.getWritingVoice as any).mockResolvedValue({ formality: 5, length: 5, tone: 5, voiceSamples: null, aiDraftsGenerated: 0 });
  (api.updateWritingVoice as any).mockResolvedValue({ success: true, profile: { formality: 5, length: 5, tone: 5, voiceSamples: null, aiDraftsGenerated: 0 } });

  render(<WritingVoiceSettingsPage />);
  await screen.findByText('Writing & Voice');
  fireEvent.click(screen.getByText('Save Preferences'));
  await waitFor(() => expect(screen.getByText(/saved/i)).not.toBeNull());
});
```

**Step 2: Run tests to verify fail**

Run: `pnpm -C timeflow/apps/web test -- writingVoice.test.tsx`
Expected: FAIL (missing toast or text)

**Step 3: Implement minimal changes**

Update `writing-voice/page.tsx`:
- Use toast notifications for save success/error (or ensure visible inline message)
- Clarify “Save on blur” behavior: choose explicit save only or implement onBlur with debounce

**Step 4: Run tests to verify pass**

Run: `pnpm -C timeflow/apps/web test -- writingVoice.test.tsx`
Expected: PASS

**Step 5: Commit**

```bash
git add timeflow/apps/web/src/app/settings/writing-voice/page.tsx \
  timeflow/apps/web/src/app/settings/__tests__/writingVoice.test.tsx
git commit -m "feat: finalize writing voice settings UX"
```

---

### Task 6: Final verification (after all tasks)

**Files:**
- Modify: none

**Step 1: Run web tests**

Run: `pnpm -C timeflow/apps/web test`
Expected: PASS

**Step 2: Commit any fixes**

```bash
git status
git add -A
git commit -m "test: fix remaining draft workflow issues"
```

