# Inbox → Meeting Scheduler Integration Implementation Plan

> **For Codex:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** From an email thread in `/inbox`, a user can start a “meeting scheduling” workflow by sending a scheduling link reply (draft/preview/confirm/send), using existing Scheduling Links and Gmail draft/send infrastructure.

**Architecture:** Reuse existing Scheduling Links (`/scheduling-links`) and the deterministic Gmail workflow (`/email/draft/preview` → `/email/drafts`) so meeting replies are safe, previewable, and thread-aware. Add a new Inbox-side panel that composes a scheduling-link reply and optionally uses the existing AI draft system to polish the text.

**Tech Stack:** Next.js (web), React, Vitest + Testing Library, Fastify backend, Gmail service, Prisma (only if we add optional workflow state later).

---

## Desired UX (MVP)

### Where it lives
- Inbox reading pane action bar gains a new CTA: **“Schedule Meeting”** (or “Send Scheduling Link”).

### Flow
1. User opens a thread in `/inbox`.
2. Clicks **Schedule Meeting**.
3. A right-side panel opens:
   - Choose an existing **Scheduling Link** (or create one).
   - Prefilled subject: `Re: <original subject>`
   - Prefilled message template that includes the booking URL.
   - Optional: “Use AI to polish message” (uses existing `/email/draft/ai` w/ additionalContext).
4. User clicks **Preview** (calls `/email/draft/preview`).
5. User confirms checkbox.
6. User clicks **Send** or **Create Gmail Draft** (calls `/email/drafts`).
7. After success:
   - Show success state + “View in Gmail” link (when drafting).
   - Optionally update queue/actionState for the thread (default: set to `read_later` so it’s tracked).

---

## Scope decisions (explicit)

### MVP is “reply with scheduling link”
- We are **not** auto-detecting “needs meeting” with ML in MVP (button is manual).
- We are **not** creating an event automatically from the email (invitee books via link).
- We are **not** adding a new inbox state like `waiting_on_booking` in MVP unless requested.

### Threading behavior
- Use existing approach already used by DraftPanel: pass `threadId` and `inReplyTo` to `/email/drafts`.
  - Note: this uses Gmail message IDs, not RFC `Message-ID`. We keep behavior consistent with current code.

---

## Task 1: Add “Schedule Meeting” button to Inbox thread action bar (failing test first)

**Files:**
- Modify: `timeflow/apps/web/src/app/inbox/page.tsx`
- Modify: `timeflow/apps/web/src/app/inbox/__tests__/InboxPageDraftButton.test.tsx`

**Step 1: Write failing test**

Add an assertion that the button exists:

```ts
expect(await screen.findByRole('button', { name: /schedule meeting/i })).not.toBeNull();
```

Expected: FAIL (button not present).

**Step 2: Run test to verify it fails**

Run:
```bash
pnpm -C timeflow/apps/web test
```

Expected: FAIL with missing “Schedule Meeting”.

**Step 3: Minimal implementation**
- In the `ReadingPane` action bar (same row as “Draft Reply with AI”), add a new button labeled **Schedule Meeting**.
- For now, clicking it can be a no-op (or open a placeholder panel state).

**Step 4: Run test to verify it passes**

Run:
```bash
pnpm -C timeflow/apps/web test
```

Expected: PASS.

---

## Task 2: Implement `MeetingLinkReplyPanel` (compose → preview → send/draft)

**Files:**
- Create: `timeflow/apps/web/src/components/inbox/MeetingLinkReplyPanel.tsx`
- Modify: `timeflow/apps/web/src/app/inbox/page.tsx`
- Modify: `timeflow/apps/web/src/lib/api.ts` (only if missing small helper types)

**Key implementation details:**
- Panel is opened from Inbox reading pane with the **latest message** in the thread (already computed in `ReadingPane` as `latestMessage`).
- Fetch active scheduling links via `api.getSchedulingLinks()`.
- Compute booking URL using `window.location.origin` + `/book/${slug}`.
- Default subject:
  - If the latest message subject begins with `Re:` keep it; else prefix `Re:`.
- Default “to”:
  - Parse from `latestMessage.from` using the same regex used elsewhere: `/\<(.+?)\>/`.

**Panel states (suggested):**
- `compose` (choose link + edit message)
- `previewing` (loading)
- `preview` (render HTML preview + confirm checkbox)
- `sending` (loading)
- `success` / `error`

**Preview/send plumbing (reused endpoints):**
- Call `api.generateEmailPreview({ draftText, to, subject, inReplyTo: latestMessage.id, threadId: latestMessage.threadId })`
- Call `api.createOrSendDraft({ action: 'send' | 'create_draft', htmlPreview, textPreview, determinismToken, to, subject, inReplyTo, threadId, confirmed: true })`

**Step 1: Write failing tests (panel open/close)**
- Add new test file:
  - Create: `timeflow/apps/web/src/app/inbox/__tests__/InboxPageScheduleMeeting.test.tsx`
- Mock:
  - `api.getSchedulingLinks` to return 1 link
  - `api.generateEmailPreview` and `api.createOrSendDraft`
- Test:
  - Click “Schedule Meeting”
  - Expect panel/modal heading like “Schedule Meeting Reply” and a link selector

**Step 2: Implement minimal panel + wiring**
- In `InboxPage`, add state:
  - `meetingPanelOpen`, `meetingEmail` (the latest FullEmailMessage), etc.
- Pass an `onOpenMeetingScheduler` callback to `ReadingPane`.
- Render `<MeetingLinkReplyPanel ... />` at bottom of `InboxPage` similar to `DraftPanel`.

**Step 3: Add preview and send tests**
- Preview test:
  - Fill message body
  - Click Preview
  - Expect `api.generateEmailPreview` called with correct `threadId` / `inReplyTo`
- Send test:
  - Check confirmation checkbox
  - Click Send
  - Expect `api.createOrSendDraft` called with determinism token returned from preview

**Step 4: Run web tests**

Run:
```bash
pnpm -C timeflow/apps/web test
```

Expected: PASS.

---

## Task 3: Add “Create link” from within the panel (reuse `CreateLinkModal`)

**Files:**
- Modify: `timeflow/apps/web/src/components/inbox/MeetingLinkReplyPanel.tsx`
- Reuse existing: `timeflow/apps/web/src/components/CreateLinkModal.tsx`

**Step 1: UX**
- If user has 0 links, show an empty state with CTA **“Create scheduling link”**.
- Otherwise show a secondary action “+ Create new link”.

**Step 2: Wiring**
- Open `CreateLinkModal`, on success refresh links list and auto-select the new link.

**Step 3: Tests**
- Mock `api.createSchedulingLink` and ensure the panel refreshes the link list.

---

## Task 4: Update Inbox workflow after sending (queue/state)

**Files:**
- Modify: `timeflow/apps/web/src/app/inbox/page.tsx`
- Use existing endpoint: `api.updateEmailActionState(threadId, actionState)`

**Behavior (MVP):**
- After successful send/draft creation, set thread queue to `read_later` (or clear `needs_reply`).

**Step 1: Test**
- After successful send, assert `api.updateEmailActionState` was called with thread id and `read_later`.

**Step 2: Implement**
- Update local state optimistically (mirroring existing `handleUpdateActionState`) and call API.

---

## Task 5 (Optional but recommended): AI-polish for scheduling replies

**Goal:** One-click “Polish with AI” that rewrites the meeting-link message in the user’s writing voice without changing the booking URL.

**Approach (no backend changes):**
- Call `api.generateEmailDraft({ emailId: latestMessage.id, additionalContext: "Write a reply that asks to schedule a meeting. Include this exact booking link: <url> ... DO NOT alter the link." })`
- Replace the panel’s message body with the returned `draftText`.

**Files:**
- Modify: `timeflow/apps/web/src/components/inbox/MeetingLinkReplyPanel.tsx`

**Tests:**
- Ensure the AI call includes the booking URL and that the resulting draft preserves the URL.

---

## Backend changes (only if needed)

MVP can ship with **zero new backend endpoints**, because we reuse:
- `/scheduling-links` (already exists)
- `/email/draft/preview` + `/email/drafts` (already exists)

If we later need better templates or thread-safe headers, we can add:
- A backend endpoint that builds an HTML template and returns both HTML+text previews.
- A thread-aware reply helper that extracts RFC `Message-ID` from Gmail headers.

---

## Verification checklist (run before claiming “done”)

**Web tests:**
```bash
pnpm -C timeflow/apps/web test
```

Expected: PASS.

**Manual web smoke test (local):**
- Open `/inbox`
- Select a thread
- Click “Schedule Meeting”
- Choose link → Preview → Send
- Confirm the sent email appears in the same Gmail thread


