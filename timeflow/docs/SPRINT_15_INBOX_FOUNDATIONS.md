# Sprint 15 Addendum: Inbox Foundations (Prep for Sprint 16 Gmail Label Sync)

**Project**: TimeFlow  
**Duration**: Parallel workstream inside Sprint 15  
**Status**: Planned (documentation-only)  

---

## Why this matters

Sprint 16 will mirror TimeFlow’s inbox organization inside Gmail via real Gmail labels. That will only feel valuable (and not creepy/untrustworthy) if the in-app inbox experience is:

- fast and reliable
- clearly filterable (especially Professional vs Personal)
- correctable by the user (easy “fix mistakes” loop)
- transparent (“why was this labeled?”)

---

## Current Observations

- Inbox currently exists primarily as a Today-page experience; it needs a dedicated home.
- Categorization is heuristic-based and will sometimes be wrong; users need a correction mechanism.
- Professional/Personal is a high-signal filter that should exist even if other categories are present.

---

## UX Requirements

- Dedicated inbox page: `/inbox`
  - search
  - pagination/infinite scroll
  - thread view (not just individual messages)
- Quick filters:
  - `All`, `Professional`, `Personal`
  - category pill strip (Finance, Travel, Work, etc.)
- User correction:
  - “Correct category” on a thread
  - persist override
  - apply override before heuristics and before Gmail label sync
- Transparency:
  - “Why this label?” explanation (rule match vs heuristic signal)

---

## Backend Requirements

- Efficient inbox fetch (avoid N+1 patterns; bound concurrency; caching where safe).
- Override model stored per user:
  - by sender/domain and/or by thread/message id
  - clear precedence rules (override > rule > heuristic)
- Simple quality measurement:
  - small eval set
  - track correction rate
  - track “unknown/uncertain” rate

---

## Acceptance Criteria

- `/inbox` page exists and is reachable from `/today`.
- Professional vs Personal filter exists and works.
- Users can correct a category and see it stick on refresh.
- “Why this label?” is visible for at least the primary category assignment.

---

**Last Updated**: 2025-12-23


