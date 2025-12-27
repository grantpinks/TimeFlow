# Sprint 15 Plan: Smart Meeting Scheduling & Scheduling Links

**Project**: TimeFlow  
**Duration**: 2 weeks  
**Status**: Planned (documentation-only)  

This plan focuses on shipping booking links that are reliable, customizable, and safe under concurrency. It includes Inbox Foundations work that improves the in-app Gmail experience (prep for Sprint 16 Gmail label sync).

---

## Scope decisions (confirmed)

- **Booking model**: Standalone scheduling links (Calendly-style).
- **Public flow**: **Book + reschedule + cancel** (MVP).
- **Video conferencing (MVP)**: **Google Meet** auto-generated on the created Google Calendar event.
- **Video conferencing (future)**: **Zoom integration** (OAuth + create unique Zoom meeting per booking) is explicitly deferred.

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

## User-visible UI (must exist to ship)

### 1) Settings → Scheduling Links

Must support:
- **List**: show existing links (name, duration, active/paused, link URL, last booked).
- **Create/Edit**:
  - link name
  - meeting duration(s)
  - **work hours** (per day-of-week)
  - **booking horizon** (e.g., 14/30/60 days)
  - **buffers** (before/after)
  - **daily cap**
  - timezone display (host)
  - **video conferencing**: `Google Meet (on/off)` (MVP); show `Zoom (coming soon)` label
- **Actions**: copy link, pause/resume, delete.

### 1b) Settings → Meeting Manager (Bookings)

Must support:
- **List of bookings** with clear status chips and key details (invitee, time, link used, created/rescheduled timestamps).
- **Filters**:
  - `Scheduled`
  - `Rescheduled`
  - `Cancelled`
- **Actions**:
  - Open details
  - Cancel (marks cancelled; does not delete history)
  - Reschedule (generates token link or initiates reschedule flow)

### 2) Public booking page: `/book/[urlSlug]`

Must support:
- **Timezone-safe slot selection** (viewer timezone with clear “showing times in …”).
- **Empty states**: no availability (offer next available day / widen range).
- **Booking form**: name + email (minimum), optional notes.
- **Confirmation**: “Booked” page and email-safe summary (ICS optional, but state explicitly if not included).

### 3) Public reschedule + cancel pages

Must support (via secure token links):
- `/book/[urlSlug]/reschedule?token=...`
- `/book/[urlSlug]/cancel?token=...`
- Clear success/failure states (expired token, already cancelled, slot no longer available, etc.).

---

## Meeting status semantics (data + UX must agree)

Recommended `Meeting.status` values:
- `scheduled`: booked and active
- `rescheduled`: active, but has been moved at least once (keep history)
- `cancelled`: cancelled by invitee or host; keep record

Cancellation semantics (confirmed):
- **Do not delete** the meeting record.
- **Do not delete** the calendar event; **mark it cancelled** (or update title/description to indicate cancellation) so auditing and user trust remain intact.

---

## Video conferencing

### Google Meet (MVP)

- When a meeting is booked, create the Google Calendar event with Meet conference data so the invite contains a Meet link.
- When rescheduled, preserve the meeting link (or regenerate deterministically if required).
- When cancelled, **mark the calendar event cancelled** (do not hard-delete) and keep the meeting record with `status=cancelled`.

### Zoom (future)

- Deferred to a later sprint: Zoom OAuth + create a unique Zoom meeting per booking (store meetingId/joinUrl; update on reschedule; delete on cancel).

---

## Inbox Foundations (Prereq for Sprint 16)

Sprint 16 will apply labels inside Gmail. That only feels valuable if the in-app inbox view has strong filters and users trust the categorization.

See: `docs/SPRINT_15_INBOX_FOUNDATIONS.md`.

---

## Deliverables / Acceptance Criteria

- Booking links are created/managed in Settings.
- Public booking page works reliably and is timezone-safe.
- Public **reschedule + cancel** flows exist and are token-protected.
- Availability respects work hours, horizon, buffers, and daily cap.
- Server-side booking enforces constraints to avoid race conditions/double booking.
- Fixed vs Flexible semantics are implemented and respected by scheduler + availability.
- Booked events can include **Google Meet** (MVP); **Zoom is documented as future work**.

---

**Last Updated**: 2025-12-23


