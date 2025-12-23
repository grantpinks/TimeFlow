# Sprint 16: Gmail Label Sync (Thread-Level)

**Project**: TimeFlow  
**Duration**: 2 weeks  
**Audience**: Engineering (backend/web), ops, product  
**Status**: Planned (documentation-only)  

---

## Problem / Why This Sprint

TimeFlow already categorizes a user’s Gmail inbox on the TimeFlow Today dashboard. Users want that same organization inside Gmail itself so they can stay in Gmail while still benefiting from TimeFlow’s scheduling assistance.

This sprint adds **real Gmail labels** (created via the Gmail API) and applies them **at the thread level** so conversations stay consistently labeled.

---

## Prerequisites (From Sprint 15: Inbox Foundations)

To make Sprint 16 fully valuable (and avoid users distrusting labels applied inside Gmail), the following should exist first:

- A dedicated Inbox surface (`/inbox`) reachable from `/today`.
- Clear filters, especially **Work vs Personal** (plus deeper category pills).
- A way for users to **correct misclassified** emails/threads and persist an override.
- Some basic measurement of categorization quality (even a small eval set).

See: `docs/SPRINT_15_INBOX_FOUNDATIONS.md`.

---

## Goals

- [ ] Create/ensure Gmail labels for TimeFlow email categories (namespaced like `TimeFlow/Work`).
- [ ] Apply labels at the **thread level** using Gmail API.
- [ ] Background sync for new mail via Gmail **watch + Pub/Sub** (with a safe fallback to sync-on-inbox-fetch).
- [ ] User controls in Settings: enable/disable, per-category label name + color mapping, manual “Sync now”, status/health.

---

## Non‑Goals (Explicitly Out of Scope)

- Modifying Gmail UI via browser extensions or add-ons.
- Bulk labeling the entire mailbox history by default (only new mail, with optional small backfill window).
- Supporting non-Gmail providers.

---

## Key Constraints / Reality Checks

- **Sensitive scope**: label application requires `gmail.modify`. Consumer rollout may require Google OAuth verification and may trigger policy/security review.
- **Label colors**: Gmail supports label colors via the API (`users.labels.create/patch` supports a `color` object), but practically within a constrained palette. The UI must offer a **palette picker** (not arbitrary hex), plus a best‑effort default mapping from TimeFlow colors.
- **Rate limits**: Gmail API quotas and per-user throttling must be respected (especially for background sync). Prefer batching and idempotent updates.

---

## User Experience

### Settings (Web)

Location: `Settings → Email Categories → Gmail Label Sync`

- **Master toggle**: “Sync categories to Gmail labels”
- **Status**: last sync time, watch enabled/expiration, last error (if any)
- **Manual action**: “Sync now”
- **Per category**:
  - enable/disable Gmail sync
  - label name override (default `TimeFlow/<CategoryName>`)
  - **label color picker** (Gmail palette) with preview
  - optional: “Reset to defaults” (restores default names + mapped colors)

#### UI Requirements (Sprint 16)

- **Adjust label names**: user can rename the Gmail label that TimeFlow creates/ensures for each category.
- **Customize label colors**: user can choose a color for each Gmail label from the Gmail-supported palette (store as `{ backgroundColor, textColor }`).
- **Explain limitations**: show helper text “Gmail label colors are limited to Gmail’s palette” so users understand why arbitrary hex isn’t available.

### Gmail

- Users will see a `TimeFlow/*` label group in Gmail’s label sidebar.
- Threads will show applied labels (and Gmail will render them with the configured colors).

---

## Technical Approach (High Level)

### Label naming strategy

- **Namespace**: `TimeFlow/<CategoryName>` (e.g., `TimeFlow/Work`, `TimeFlow/Finance`).
- Use stable category IDs for internal mapping, but store a user-editable label name.

### Thread-level application

- Prefer `users.threads.modify` over per-message labeling.
- Operate idempotently: applying an already-present label should be a no-op.

### Background sync (preferred)

- Use Gmail `users.watch` to publish to a Google Cloud Pub/Sub topic.
- Backend exposes a push endpoint that validates notifications, dedupes by `historyId`, and processes changes via `users.history.list`.

### Fallback sync (if watch isn’t viable)

- On inbox fetch (server-side), opportunistically sync labels for the returned threads only (bounded by a small limit).

---

## Backend Plan (What to Build)

### Data model additions (Prisma)

- Extend existing per-user `EmailCategoryConfig`:
  - `gmailSyncEnabled` (boolean)
  - `gmailLabelId`, `gmailLabelName`
  - `gmailLabelColorBg`, `gmailLabelColorText` (palette values)
- Add `GmailLabelSyncState` (per user):
  - enabled, lastHistoryId, watchExpiration, lastSyncAt, lastErrorAt/lastErrorMessage (optional but recommended)

### Service module

Create `gmailLabelSyncService` with core primitives:

- `ensureLabelsForUser(userId)`
- `applyCategoryLabelToThread(userId, threadId, categoryId)`
- `syncFromHistory(userId, startHistoryId)`
- `syncRecentThreads(userId, threadIds[])` (fallback)

### API endpoints (Fastify)

- `POST /api/email/label-sync/enable`
- `POST /api/email/label-sync/disable`
- `GET /api/email/label-sync/status`
- `POST /api/email/label-sync/run`
- `PATCH /api/email/categories/:id` (extend to include Gmail mapping fields)
- `POST /api/integrations/gmail/push` (Pub/Sub push handler)

### Operational behaviors

- Rate limit aggressively and batch work.
- Dedupe push notifications by `(userId, historyId)` and ignore stale history.
- Implement a watch renewal job (watch expirations are finite).

---

## Frontend Plan (What to Build)

Primary UI already exists for category color customization:
- `timeflow/apps/web/src/app/settings/email-categories/page.tsx`

Extend it to include:
- Gmail label sync controls (master + per-category)
- Sync status + manual sync button
- Per-category Gmail label name + color picker (palette)

---

## Testing & QA Guidance

- Unit tests for:
  - label name normalization
  - color mapping (hex → Gmail palette)
  - idempotent apply logic (no label thrashing)
- Integration tests (mock `googleapis` Gmail client):
  - enable/disable/status/run endpoints
  - push handler idempotency and error handling

---

## Risks & Mitigations

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|------------|
| Google OAuth verification blocks consumer rollout | Medium | High | Start verification early; keep feature behind flag; document scope justification clearly |
| Pub/Sub push not viable in hosting environment | Medium | Medium | Fallback sync-on-inbox-fetch; keep watch optional |
| Quota/rate limits cause degraded sync | Medium | High | Batch, dedupe, strict per-user throttles, small backfill window |
| Label color mismatch vs TimeFlow palette | High | Low | Best-effort mapping + user override UI |

---

## Deliverables

- Roadmap updated with Sprint 16 scheduled after Sprint 15 meeting scheduling and Sprint 14 calendar overhaul.
- Agent-ready implementation guide (see `docs/SPRINT_16_GMAIL_LABEL_SYNC_IMPLEMENTATION_GUIDE.md`).
- Deployment guide updated with Pub/Sub + watch setup steps.

---

## Decision Gate (End of Sprint)

- [ ] Can a consumer user enable sync and see `TimeFlow/*` labels created in Gmail?
- [ ] Are new threads labeled within minutes via watch, or on next inbox fetch via fallback?
- [ ] Are operations safe/idempotent under retries and rate limits?
- [ ] Are docs sufficient for on-call/troubleshooting?

---

**Last Updated**: 2025-12-23


