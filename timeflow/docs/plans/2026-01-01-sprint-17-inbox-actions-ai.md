# Sprint 17 Add-On: Inbox Action States + AI Assist (Follow-on to Sprint 16)

**Date**: 2026-01-01  
**Sprint**: 17  
**Purpose**: After Sprint 16 ships a stable Inbox MVP + Email → Task → Schedule, Sprint 17 adds two differentiators:
- **C)** Action-state inbox (`NeedsReply`, `ReadLater`, optional `NeedsAction`) + aging nudges
- **B)** AI summaries + extracted tasks (cost-controlled)

---

## Preconditions (must be true before starting)
- Sprint 16 Inbox is stable (thread list/detail, read/unread, archive, search).
- Email → Task → Schedule is used successfully by real users (at least a few per week).
- AI cost controls exist (or Sprint 18’s quota system is ready to reuse).

---

## C: Action-State Inbox (P0)

### UX (v1)
- Add a second filter row / “Queues”:
  - `All`
  - `Needs Reply`
  - `Read Later`
  - (optional) `Needs Action`
- Each thread can be assigned **one** action-state (mutually exclusive).
- Fast toggles from list rows and thread detail.
- Clear “remove state” / reset to none.

### Data model
- Store per-user action state at **thread** granularity:
  - `userId`
  - `threadId`
  - `actionState` enum
  - timestamps (`createdAt`, `updatedAt`)

### Aging nudges (P1)
- “Needs Reply older than X days”
- “Unread important older than X days”
- These should be **UI-only** at first (no notifications) to reduce support risk.

---

## B: AI Summaries + Extracted Tasks (P1)

### UX (v1)
- In thread detail:
  - “Summarize” (short)
  - “Extract tasks” (returns 1–5 tasks)
- “Create tasks” button that writes tasks into TimeFlow and optionally opens schedule preview.

### Safety + cost controls (must-have)
- Hard per-user request cap (daily + monthly)
- Hard max tokens per request
- Clear UX when limit is hit
- No sensitive content logging; redact/avoid storing raw email body in analytics

---

## Acceptance Criteria (Sprint 17 add-on)
- Users can maintain a lightweight action-queue workflow entirely inside `/inbox`.
- AI features are reliable, fast enough, and **cannot** exceed configured quotas.
- Extracted tasks can be created and scheduled without breaking core scheduling flows.


