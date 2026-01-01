# Sprint 16: Inbox MVP (Email Triage) + Email → Task → Schedule + Gmail Label Sync — Scope

**Date**: 2026-01-01  
**Sprint**: 16  
**Primary outcome**: A real, daily-usable **Inbox** inside TimeFlow (thread triage) that users trust, with a differentiated workflow: **turn an email into a task and schedule it**, plus Gmail label sync as an optional extension.

---

## What “Inbox MVP (Email Triage)” means for Sprint 16

### Must-have user flows (v1)
- **Inbox home (`/inbox`)**:
  - fast thread list (infinite scroll or pagination)
  - filters: `All`, `Professional`, `Personal`, plus category pills
  - search (subject/from/snippet; server-backed when possible)
- **Thread detail**
  - open a thread and see the full content (at least the latest message; ideally full thread)
  - attachments visible (download can be deferred)
- **Triage actions**
  - mark read/unread
  - archive/unarchive (at minimum archive)
  - “Open in Gmail” deep link (safe escape hatch)
- **Email → Task → Schedule (differentiator)**
  - create a task from an email (title defaults to subject; link back to email)
  - optionally “Schedule now” using the existing scheduling flow
- **Trust loop**
  - “Correct category” persists (override > rules > heuristics)
  - “Why this label?” is specific and honest (rule match vs heuristic signals)

### Explicitly not required for v1
- composing/replying inside TimeFlow (can be “Open in Gmail”)
- bulk operations / multi-select
- full offline mode
- non-Gmail providers

---

## Repo reality (what already exists)

### Web
- `/inbox` route exists and already has:
  - filters, category pills, search UI
  - “Correct →” flow that writes an override via `createEmailOverride`
  - expandable rows (currently shows snippet, not a real thread detail)

### Backend
- Email API already supports:
  - `GET /api/email/inbox` (message list w/ `threadId`)
  - `GET /api/email/:id` (full message)
  - `GET /api/email/search`
  - `POST /api/email/:id/read` (read/unread)
  - `POST /api/email/:id/archive`
- Gmail service already:
  - provides `threadId` per message
  - infers `isRead` from labels
  - returns categories + importance

---

## Sprint 16 approach (phased, trust-first)

### Phase 0: Inbox MVP (DONE ✅)
**Goal**: Already shipped — do not add new work here.

### Phase A (P0/P1): Differentiator + Gmail Label Sync
**Goal**: Add the differentiated workflow (**Email → Task → Schedule**) and then optionally write TimeFlow categories into Gmail as `TimeFlow/*` labels (trust-first).

**Work**:
- **Email → Task → Schedule (P0)**:
  - add “Create task” (prefilled from email)
  - add “Create + schedule” shortcut that drops the user into the existing scheduling flow
  - store a backlink in the task (at minimum: email `id` + `threadId` + subject)
- **Gmail label sync (P0/P1)** (from existing docs):
  - ensure labels exist (create/patch)
  - apply labels to threads (idempotent)
  - add settings UI: master toggle + per-category mapping + “Sync now” + status
  - safe fallback: bounded sync-on-inbox-fetch (no Pub/Sub dependency)

### Phase B (optional): Background sync (watch + Pub/Sub)
Only if we’re confident about hosting + OAuth verification path; otherwise keep it deferred.

---

## Acceptance Criteria (Sprint 16)

### Inbox MVP
- `/inbox` is fast and usable: list loads quickly, pagination works, and UI doesn’t thrash.
- User can:
  - open a thread row and read full content
  - mark read/unread
  - archive
  - create a task from an email (and optionally schedule it)
  - correct a category and see it persist on refresh
  - understand “Why this label?” (override vs rule vs heuristic)
- Rate limiting surfaces as a friendly message (not silent failure).

### Gmail label sync (if enabled)
- Feature is **off by default** and clearly explained.
- When enabled:
  - Gmail shows `TimeFlow/*` labels
  - “Sync now” works deterministically without duplicates
  - no non-TimeFlow labels are modified

---

## Notes for Sprint 19/20
- **Sprint 19**: subscriptions + entitlements (may gate advanced inbox automation)
- **Sprint 20**: “common integrations” beyond Gmail (Slack/Linear/Jira/etc.)


