# Sprint 16.B9 — Inbox AI Thread Assist Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Ship end-to-end **Summarize**, **Extract tasks**, and **Create tasks** on `/inbox` thread detail, with **Flow Credits enforcement**, **bounded LLM usage**, and clear **limit-hit UX**—then use the follow-on section to sequence Sprint 17 habits work and Sprint 18 identity/email polish.

**Architecture:** Backend routes `POST /api/email/ai/thread-summary` and `POST /api/email/ai/thread-tasks` already exist (`emailThreadAssistController.ts` → `runThreadAssistTask` in `assistantService.ts`). **Gap:** no credits, no dedicated max-token cap for these modes, no web UI, and no bulk “create these tasks” flow. Reuse **`usageTrackingService`** (same pattern as `emailDraftController.generateEmailDraft`) and existing **`api.createTask`** / task types from `@timeflow/shared`.

**Tech Stack:** Fastify, Vitest, Prisma (user credits), Next.js `/inbox`, React, existing `track()` analytics where appropriate.

**References:** Roadmap task **16.B9**; design notes in `docs/plans/2026-01-01-sprint-17-inbox-actions-ai.md` (B: AI summaries + extracted tasks).

---

## Current state (audit)

| Layer | Status |
|-------|--------|
| Routes | Registered in `apps/backend/src/routes/emailRoutes.ts` (`/email/ai/thread-summary`, `/email/ai/thread-tasks`) |
| Controller | `summarizeEmailThread`, `extractTasksFromThread` — Zod body, last 5 messages in prompt |
| LLM | `runThreadAssistTask` uses `callLocalLLM` with **global** `LLM_MAX_TOKENS` (often 4000) — **too high for cost control** |
| Credits | **Not** checked in thread assist; email draft uses `EMAIL_DRAFT` (15 credits) |
| Web | **No** callers; inbox page has thread detail but no thread-assist UI |

---

## Phase 1 — Backend: credits + limits + responses

### Task 1: Credit actions and costs

**Files:**
- Modify: `apps/backend/src/services/usageTrackingService.ts` (`CREDIT_COSTS`, document in header comment)
- Modify: Prisma not required if reusing existing `flowCreditsUsed` fields

**Steps:**
1. Add two `UsageAction` keys, e.g. `EMAIL_THREAD_SUMMARY` and `EMAIL_THREAD_TASKS` (or a single `EMAIL_THREAD_ASSIST` if you prefer one bucket—**two keys** better matches “summarize is cheaper than extract”).
2. Pick costs aligned with `EMAIL_SUMMARY` (10) / `COMPLEX_AI_COMMAND` (5)—e.g. **5** for summary, **10** for task extraction (tune against `PRICING_MODEL.md` if present).

**Verify:** TypeScript compiles; `UsageAction` usages exhaustive.

---

### Task 2: Enforce credits in `emailThreadAssistController`

**Files:**
- Modify: `apps/backend/src/controllers/emailThreadAssistController.ts`
- Reference: `apps/backend/src/controllers/emailDraftController.ts` (pattern: `hasCreditsAvailable` → early 402/403 with `code`, then `trackUsage` on success)

**Steps:**
1. Before `runThreadAssistTask`, call `hasCreditsAvailable(user.id, '<ACTION>')`.
2. If not allowed, return **402** or **429** with JSON: `{ error: string, code: 'INSUFFICIENT_CREDITS', creditsRemaining?: number }` (match existing client patterns if any).
3. On successful LLM response, call `trackUsage(user.id, '<ACTION>', { threadId, mode: 'summary' | 'tasks' })` — **no email body in metadata**.
4. If LLM throws after debit decision: either refund (if you deducted optimistically) or **deduct only after success** (preferred: check credits, run LLM, then `trackUsage`).

**Verify:** Unit tests mock `usageTrackingService` and assert 402 when `allowed: false`.

---

### Task 3: Cap tokens for thread-assist modes only

**Files:**
- Modify: `apps/backend/src/services/assistantService.ts` — `callLocalLLM` branch for `email-summary` / `email-tasks`

**Steps:**
1. For `mode === 'email-summary' | 'email-tasks'`, set `max_tokens` to a **hard cap** (e.g. **512** summary, **1024** tasks JSON) via local constants or `env.LLM_THREAD_ASSIST_MAX_TOKENS` with safe defaults.
2. Keep other modes on existing `LLM_MAX_TOKENS` behavior.

**Verify:** No regression for scheduling/chat modes; optional unit test on request body shape if you extract a small helper.

---

### Task 4: Structured error handling + task array bounds

**Files:**
- Modify: `apps/backend/src/services/assistantService.ts` — `runThreadAssistTask` / `parseJsonResponse`
- Modify: prompts in `promptManager` for `email-tasks` (ensure “**at most 5 tasks**”)

**Steps:**
1. Clamp extracted `tasks` array to **length 1–5** server-side; strip empty titles.
2. On JSON parse failure, return 500 with generic message (no raw LLM dump to client).

**Verify:** Controller test with malformed LLM output mocked at service boundary.

---

### Task 5: Backend tests

**Files:**
- Modify: `apps/backend/src/controllers/__tests__/emailThreadAssistController.test.ts`

**Steps:**
1. Mock `usageTrackingService`; add cases: insufficient credits → 402/429; success → `trackUsage` called once.
2. Run: `pnpm -C apps/backend test -- emailThreadAssistController` (or project equivalent).

---

## Phase 2 — Shared types + API client

### Task 6: Shared request/response types (optional but recommended)

**Files:**
- Modify: `packages/shared/src/...` (where email/API types live)

**Steps:**
1. Export `ThreadAssistMessage`, `ThreadSummaryResponse`, `ThreadTasksResponse` for web + backend alignment.

---

### Task 7: Web `api` helpers

**Files:**
- Modify: `apps/web/src/lib/api.ts`

**Steps:**
1. `postThreadSummary(threadId, messages)` → `POST /email/ai/thread-summary`
2. `postThreadTasks(threadId, messages)` → `POST /email/ai/thread-tasks`
3. Map `INSUFFICIENT_CREDITS` to thrown error with `code` for UI.

**Verify:** No raw `/api` path duplication—use same base URL pattern as other email routes.

---

## Phase 3 — Frontend UX (thread detail)

### Task 8: `ThreadAssistPanel` component

**Files:**
- Create: `apps/web/src/components/inbox/ThreadAssistPanel.tsx`
- Reference: `InboxAiDraftPanel.tsx` for loading/error/toast patterns

**UX spec:**
1. Section title: **“AI thread assist”** (or match Inbox tone).
2. Buttons: **Summarize** | **Extract tasks** (disabled when `loadingThread` or no `threadMessages.length`).
3. **Summarize:** show result in a compact card (markdown optional plain text); “Copy” optional.
4. **Extract tasks:** list 1–5 items with title + details; primary **Create all** and per-row **Create** (calls `createTask` with `sourceEmailId` / thread backlink if product already supports—follow existing “email → task” fields from inbox).
5. **Limit hit:** toast or inline alert: “Not enough Flow Credits. Summary uses X credits…” + link to **Settings / billing** if route exists.
6. **Analytics:** `track('inbox_thread_assist', { action: 'summary' | 'tasks' | 'create_tasks' })` (no PII).

---

### Task 9: Wire `inbox/page.tsx`

**Files:**
- Modify: `apps/web/src/app/inbox/page.tsx`

**Steps:**
1. Build `messages` payload from `threadMessages` (map to `{ id, from, subject, receivedAt, body }`; truncate body client-side if needed, e.g. 8k chars total thread to protect backend—**document** limit).
2. Render `ThreadAssistPanel` in thread detail column (below category / above or beside `DraftPanel`—avoid clutter; collapsible OK).
3. State: `threadAssistLoading`, `summaryText`, `extractedTasks`, errors.

---

### Task 10: Frontend tests

**Files:**
- Create: `apps/web/src/components/inbox/__tests__/ThreadAssistPanel.test.tsx`

**Steps:**
1. Mock `api.postThreadSummary` / `postThreadTasks`; assert button disables, error on credit code, list renders.

---

### Task 11: E2E or smoke (optional P2)

**Steps:** Manual QA checklist in PR: open thread → summarize → extract → create one task → verify task in Tasks list with backlink.

---

## Phase 4 — Documentation + roadmap

### Task 12: Update docs

**Files:**
- Modify: `ARCHITECT_ROADMAP_SPRINT1-17.md` — set **16.B9** to ✅ when shipped
- Modify: `KNOWN_ISSUES.md` only if you discover new follow-ups

---

## Verification (before claiming done)

Run from repo `timeflow/`:

```bash
pnpm -C apps/backend test
pnpm -C apps/web build
```

Confirm: credits decrement on success; insufficient credits never calls LLM.

---

## Follow-on work (after 16.B9) — order suggested

Use this as the **continuation backlog** (your “then the others”):

| Priority | Track | Item |
|----------|-------|------|
| 1 | Sprint 17 | **Actual duration UI** on habit complete (backend exists per roadmap)—wire popover + insights |
| 2 | Sprint 17 | **Streak-at-risk / missed** notification UX (prefs surfaces; backend partial) |
| 3 | Sprint 18 | **Inbox/email visual pass** + **18.13** identity-relevant email badges |
| 4 | KNOWN_ISSUES | Task **category save on edit** (10.B1), Assistant **apply-schedule / preview** items if still reproducible |
| 5 | Sprint 16 QA | **Gmail label sync** manual QA with connected account (Phase A verification) |

**Suggested next session after 16.B9 ships:** pick **Sprint 17 actual-duration UX** (habits) or **task category bugfix** for fastest user-visible impact.

---

## Commit discipline

- Commit after Phase 1 (backend + tests), then Phase 2–3 (web), then docs.
- Message example: `feat(inbox): thread assist UI + Flow Credits for summarize/extract tasks`
