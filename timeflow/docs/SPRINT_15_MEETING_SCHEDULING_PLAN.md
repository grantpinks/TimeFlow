# Sprint 15 Plan: Smart Meeting Scheduling & Scheduling Links

**Project**: TimeFlow  
**Duration**: 2 weeks  
**Status**: Planned (documentation-only)  

This plan focuses on shipping booking links that are reliable, customizable, and safe under concurrency. It includes Inbox Foundations work that improves the in-app Gmail experience (prep for Sprint 16 Gmail label sync).

---

## What must be true for Sprint 15 to “feel great”

- Availability is computed accurately across calendars and existing commitments.
- Booking links are customizable so users don’t get meetings outside working hours.
- Booking avoids “too tight” schedules (buffers) and avoids overload (daily cap).
- Booking is safe against race conditions (two people booking the same slot).
- The system understands **Fixed vs Flexible time** so meetings are treated as non-negotiable busy blocks while deep work can move.

---

## Core Constraints to Implement (Requested)

### 1) Work hours (meeting availability window)

**Goal**: Do not offer meeting slots outside the user’s desired work hours.

Recommendation:
- Store work hours per day-of-week (or reuse an existing “work schedule” if already present).
- Availability = work-hours window ∩ true free/busy availability.

### 2) Max booking horizon (max future date range)

**Goal**: Prevent booking too far into the future (e.g., only allow 14/30/60 days).

### 3) Buffer times

**Goal**: Add a buffer before/after meetings (e.g., 10 minutes) to avoid back-to-back overload.

### 4) Daily cap (max meetings per day)

**Goal**: Limit the number of bookable meetings per day.

---

## Fixed vs Flexible Time (Tasks + Availability)

Definitions:
- **Fixed (hard set time)**: cannot be moved automatically (meetings, external events).
- **Busy**: blocks meeting availability and scheduling conflicts.
- **Flexible**: may be moved by scheduler/rescheduler.
- **Not busy**: does *not* block meeting availability (optional, user-controlled; default for “deep work”).

Recommended defaults:
- External calendar events: fixed + busy
- Meetings booked via links: fixed + busy
- Deep work blocks: flexible + not busy (user can opt-in to busy)

---

## Inbox Foundations (Prereq for Sprint 16)

Sprint 16 will apply labels inside Gmail. That only feels valuable if the in-app inbox view has strong filters and users trust the categorization.

See: `docs/SPRINT_15_INBOX_FOUNDATIONS.md`.

---

## Deliverables / Acceptance Criteria

- Booking links are created/managed in Settings.
- Public booking page works reliably and is timezone-safe.
- Availability respects work hours, horizon, buffers, and daily cap.
- Server-side booking enforces constraints to avoid race conditions/double booking.
- Fixed vs Flexible semantics are implemented and respected by scheduler + availability.

---

**Last Updated**: 2025-12-23


