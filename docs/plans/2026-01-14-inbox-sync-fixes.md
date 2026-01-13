# Inbox Sync & Pagination Fixes Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Whittle the Sprint 16 inbox flows into compliance by (1) paginating `/inbox`, (2) surfacing friendly rate-limit feedback when Gmail rejects a fetch, and (3) honoring the settings-provided Gmail label name (defaulting to `TimeFlow/*`) so synced labels match the documented prefix.

**Architecture:** Keep the client-side inbox page responsible for pagination state so it can append pages without refetching the whole list, while keeping all Gmail sync logic in `gmailLabelSyncService` so label naming remains consistent and migration tooling continues to work.

**Tech Stack:** Next.js (client components) + TypeScript frontend, REST helpers in `timeflow/apps/web/src/lib/api.ts`, and Node backend with Fastify + Prisma for Gmail sync operations.

---

### Task 1: Add inbox pagination

**Files:**
- Modify: `timeflow/apps/web/src/app/inbox/page.tsx`
- Modify: `timeflow/apps/web/src/lib/api.ts`

**Step 1: Thread-aware backend response**
1. Confirm `/api/email/inbox` already returns `nextPageToken`; no code change needed.

**Step 2: Track pagination metadata**
1. Add React state for `nextPageToken`, `loadingMore`, and ideally a `hasMore` derived flag.
2. Refactor `fetchInbox` to accept optional `{ pageToken?, append? }`, use `api.getInboxEmails` with the token, and either replace or append to `emails`.
3. Update `setLoading`/`setRefreshingInbox` logic so the “loading” spinner only clears after the initial fetch, while `loadingMore` handles the “Load more” button state.

**Step 3: Surface the “Load more” UI**
1. Below the existing email list or at the bottom of the left pane, render a button when `nextPageToken` exists that calls `fetchInbox({ pageToken: nextPageToken, append: true })`.
2. Disable the button while `loadingMore` or pending `fetchInbox`, and hide it if the inbox is empty.

**Step 4: Smoke-test manually**
1. Run `pnpm dev` and scroll the inbox; click “Load more” (or simulate second page) and ensure emails append without losing selection.
2. Verify `selectedThreadId` logic doesn’t reset when appending.

---

### Task 2: Show friendly rate-limit feedback on inbox fetch

**Files:**
- Modify: `timeflow/apps/web/src/app/inbox/page.tsx`

**Step 1: Inspect existing failure handling**
1. `fetchInbox` currently swallows the error so update the `catch` block.

**Step 2: Display helpful toast**
1. If the caught `Error`’s message contains `rate limit` or `429`, show `toast.error('Gmail rate limit exceeded. Please try again in a few seconds.');`.
2. Otherwise show `toast.error('Failed to load inbox. Please try again.');`.
3. Keep logging the error for diagnostics.

**Step 3: Manual regression test**
1. Fake a rate-limit response by intercepting `/email/inbox` (DevTools/Mock Service Worker) so the fetch throws that error, and verify the toast appears.
2. Test the normal failure path (e.g., stop backend) to confirm the generic error still fires.

---

### Task 3: Stabilize Gmail label prefixes

**Files:**
- Modify: `timeflow/apps/backend/src/services/gmailLabelSyncService.ts`
- Update docs or known issues if needed (e.g., mention the default `TimeFlow/*` prefix in `docs/KNOWN_PROBLEMS.md` if this behavior changes).

**Step 1: Normalize the desired label name**
1. Compute `baseName = category.name ?? category.categoryId`.
2. If `category.gmailLabelName` is provided and non-empty, use that verbatim after trimming; otherwise, set `labelName = `TimeFlow/${baseName}``.
3. Use `legacyLabelName = `TimeFlow/${baseName}` so we can still detect/rename old labels even when users create custom names.

**Step 2: Respect the new label name when updating Gmail**
1. Replace the existing normalization block with this new logic before the Gmail API calls.
2. Ensure we still update the Prisma record with the eventual `labelName` (the value that actually lives in Gmail) so status displays match reality.

**Step 3: Confirm UI consistency**
1. After syncing, the Gmail label list should show `TimeFlow/<Category>` unless the user typed a fully custom value like `TF|Deep Work`.
2. Optionally note the behavior in docs/known issues so anyone running migrations knows why we now ship `TimeFlow/*` labels by default.

**Step 4: QA**
1. If backend unit tests exist around `createOrUpdateGmailLabel`, add inputs for the new naming behavior.
2. Otherwise run the manual sync flow with `pnpm dev` + authenticated Gmail account to observe the label names (or describe the test steps in the plan/known issues if credentials are unavailable).
