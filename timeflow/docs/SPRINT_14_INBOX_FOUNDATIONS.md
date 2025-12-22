# Sprint 14 Add-On: Inbox Foundations (Prep for Sprint 15)

**Purpose**: Make the Gmail inbox experience inside TimeFlow valuable and trustworthy *before* we start applying TimeFlow labels inside Gmail in Sprint 15.

Sprint 15 label sync will only feel “worth it” if users trust the categorization and can quickly filter the inbox (especially **Work vs Personal**).

---

## Current State (What Exists Today)

- Backend can list inbox messages and fetch message metadata (Gmail API).
- Categorization exists, but it’s primarily **heuristics** (labels/domains/keywords), not an LLM classifier.
- Today page shows an Inbox widget with:
  - search
  - “Focused only” mode (de-emphasize promo/low importance)
  - category pill filtering (based on TimeFlow categories)

Key gaps:
- No dedicated full Inbox page (users can’t “live” in email inside TimeFlow).
- No obvious **Work vs Personal** quick filter (even though categories exist).
- Categorization accuracy is not measured, and users can’t correct mislabels.
- Inbox fetch is potentially heavy (N+1 message fetches); rate-limit is in-memory.

---

## User Value Targets (What “Good” Looks Like)

- Users can open a full Inbox experience from Today with one click.
- Users can switch between **All / Work / Personal** instantly (plus deeper category filters).
- Misclassified emails can be corrected; the system learns per-user.
- Performance is good enough for daily usage (fast initial load, bounded API calls).

---

## UX Requirements

### 1) Dedicated Inbox Page

Route: `GET /inbox` (web)

Capabilities:
- Infinite scroll or pagination (pageToken)
- Search (query field)
- Thread-first view (preferred), with message preview
- Bulk actions (later): archive, mark read/unread

Entry point:
- “Open Inbox” button on `/today` Inbox card header.

### 2) Filters

Minimum set:
- Quick toggle: **All / Work / Personal**
- Category pills: Work, Finance, Travel, etc.
- Focus mode: “Focused only” (exclude promotions/low importance)

### 3) User Corrections (Trust Builder)

Add a UI action on an email/thread:
- “Correct category” → pick category
- Optional: “Always treat sender as Work” (sender/domain rule)

Behavior:
- User overrides apply immediately in TimeFlow UI.
- Overrides are consulted **before** heuristic categorization.
- Overrides should be used by Sprint 15 label sync (so Gmail labels reflect user intent).

---

## Backend Requirements

### Performance / Rate Limits

Problems to solve:
- Inbox list currently requires a `list` call + many `get` calls (metadata) → can be slow and rate-limit prone.

Recommended changes:
- Bound concurrency for message metadata fetches.
- Add a small server-side cache (per-user, short TTL) to reduce repeated Gmail calls.
- Move rate limiting from in-memory to a distributed strategy if multi-instance deployment is expected (or keep very conservative limits).

### Override Model

Persist per-user overrides:
- `ThreadCategoryOverride(userId, threadId, categoryId, createdAt)`
- (optional) `SenderCategoryRule(userId, senderDomain, categoryId)`

---

## Quality / Measurement (So We Know It’s Better)

Create a small evaluation set:
- 50–200 emails (anonymized features: sender domain, subject, snippet, Gmail CATEGORY_* labels)
- A label per email: target category

Track:
- Accuracy by category
- Confusion matrix (Work vs Updates overlap is common)
- “User corrections per day” (should decline over time if learning works)

---

## Sprint 14 Task Additions (Suggested)

These correspond to the roadmap’s Sprint 14 “Inbox Foundations” tasks:
- `/inbox` page + Today entry point
- Quick filters (All/Work/Personal) + category pills
- Fetch efficiency + caching + improved rate limit strategy
- User category correction + override persistence
- Define quality targets and an eval set

---

## Dependency on Sprint 15

Sprint 15 should treat Inbox Foundations as a prerequisite:
- Label sync should use **the same category outputs users see in-app**.
- Overrides must be applied consistently in-app *and* when syncing labels to Gmail.

---

**Last Updated**: 2025-12-21


