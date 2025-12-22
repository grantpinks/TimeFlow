# Sprint 14 Plan: Smart Meeting Scheduling & Scheduling Links

**Project**: TimeFlow  
**Duration**: 2 weeks  
**Status**: Planned (documentation-only)  

This plan focuses on shipping booking links that are reliable, customizable, and safe under concurrency. It also includes Inbox Foundations work that improves the in-app Gmail experience (prep for Sprint 15 Gmail label sync).

---

## What must be true for Sprint 14 to “feel great”

- The system computes availability accurately across calendars and existing commitments.
- Booking links are customizable so users don’t get meetings outside working hours.
- The booking flow avoids “too tight” schedules (buffers) and avoids overload (daily cap).
- Booking is safe against race conditions (two people booking the same slot).
- The system understands **Fixed vs Flexible time** so meetings are treated as non-negotiable busy blocks while deep work can move.

---

## Core Constraints to Implement (Requested)

### 1) Work hours (meeting availability window)

**Goal**: Do not offer meeting slots outside the user’s desired work hours.

Recommendation:
- Store work hours per day-of-week (or reuse existing per-day schedule constraints if product wants a single unified concept).
- Availability = work-hours window ∩ true free/busy availability.

### 2) Max booking horizon (date range far in the future)

**Goal**: User chooses how far ahead people can book (e.g., 14, 30, 60, 90 days).

Rules:
- Clamp all availability queries to `[now, now + maxAdvanceDays]`.
- Surface a clear UI message if a user navigates outside the range.

### 3) Buffer times between meetings and other events

**Goal**: Avoid “back-to-back” bookings and prevent near-collisions.

Model:
- `bufferBeforeMinutes`
- `bufferAfterMinutes`

Semantics:
- When computing availability, expand each busy block:
  - busyStart’ = busyStart − bufferBefore
  - busyEnd’ = busyEnd + bufferAfter
- Apply buffers around both:
  - existing meetings booked via scheduling link
  - external calendar events
  - (optional) scheduled tasks/habits if included in availability

### 4) Limit number of meetings per day

**Goal**: Prevent overbooking and support “deep work” days.

Rule:
- `maxMeetingsPerDay` (integer; 0 means no meetings via booking links)

Counting policy (must be decided):
- Count only meetings booked via TimeFlow link (simpler v1), or
- Count all calendar events matching “meeting-like” heuristics (more complex; can be v2).

---

## Fixed vs Flexible Time (Scheduling + Availability)

This is the “busy / hard set time” requirement:

- **Hard set time (non-reschedulable)**: the block must not be moved by the scheduler/rescheduler.
- **Busy (blocks time)**: the block should remove availability for booking and should be treated as a scheduling conflict.

### Recommended defaults

- **External calendar meetings/events**: `hardSetTime = true`, `busy = true`
- **Scheduled meetings created via booking links**: `hardSetTime = true`, `busy = true`
- **Deep work session (planned focus block)**: `hardSetTime = false`, `busy = false` (movable; does not prevent booking)

### UI requirements (so users can control it)

Add controls anywhere a user creates/edits a time block (tasks and/or scheduled blocks):

- **Fixed time (non-reschedulable)**: checkbox/toggle (maps to `hardSetTime`)
- **Blocks my calendar (busy)**: checkbox/toggle (maps to `busy`)

Defaults:
- If the user is creating a “meeting” style block (or a booked meeting): default to **Fixed + Busy**
- If the user is creating a “deep work” block: default to **Flexible + Not Busy**

UX copy guidance (recommended):
- “Fixed time: TimeFlow won’t move this block.”
- “Busy: Don’t let others book meetings over this time.”

### Where to store it

Suggested:
- Add flags on `Task` and/or `ScheduledTask` so TimeFlow-controlled blocks can be either fixed or flexible.
- For external calendar events, treat them as hard+busy by default in availability computation.

### Availability semantics

`GET /api/availability/[urlSlug]` should:
- treat all external events as busy (with buffers)
- treat TimeFlow “busy” blocks as busy (with buffers)
- ignore TimeFlow “non-busy” flexible blocks (unless user explicitly opts in later)

### Scheduler semantics

Scheduling and rescheduling should:
- never move `hardSetTime = true` blocks
- allow moving `hardSetTime = false` blocks
- treat `busy = true` blocks as conflicts

---

## UX Requirements

### Scheduling Link Settings (where user configures constraints)

Within “Scheduling Links” management UI:
- Work hours (per day-of-week)
- Max advance days
- Buffer before/after (minutes)
- Max meetings per day

### Booking Page UX (external user)

The booking page should:
- only show valid times
- display the user’s timezone + visitor timezone selector
- show “No availability in this range” with next available range (if any)

---

## Backend Requirements (Implementation Guidance)

### Data model (suggested)

Add fields to `SchedulingLink` (preferred for link-specific constraints):
- `workHours` (JSON per day-of-week, timezone aware)
- `maxAdvanceDays` (int)
- `bufferBeforeMinutes` (int)
- `bufferAfterMinutes` (int)
- `maxMeetingsPerDay` (int)

Alternative (user-level defaults):
- Add defaults on `User` and allow per-link overrides.

### Availability endpoint

`GET /api/availability/[urlSlug]` must:
- clamp to maxAdvanceDays
- build work-hours windows
- fetch free/busy blocks
- apply buffers
- enforce maxMeetingsPerDay (based on selected counting policy)
- return only safe, bookable slots (never private event details)

### Booking endpoint safety

At booking time:
- re-check slot is still available (server-side)
- enforce constraints again (never trust the client)
- create event atomically with conflict detection
- return a friendly error if slot became unavailable

---

## Dependencies / Related Work

### Inbox Foundations (prep for Sprint 15)

To make Sprint 15 Gmail label sync valuable, Sprint 14 should also complete Inbox Foundations tasks.

See: `docs/SPRINT_14_INBOX_FOUNDATIONS.md`.

---

## Acceptance Criteria (Sprint 14)

- Work hours are enforced in availability and booking (no outside-hours slots).
- Booking horizon is enforced (no bookable slots beyond maxAdvanceDays).
- Buffers are enforced (no bookings too close to adjacent events).
- Daily cap is enforced (can’t exceed maxMeetingsPerDay).
- Booking is race-safe (double-book attempts do not create conflicts).
- Scheduling Link settings UI exposes all constraint controls.

---

**Last Updated**: 2025-12-21


