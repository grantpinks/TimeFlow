# Sprint 15 Meeting Scheduling Design

## Goal
Ship scheduling links that let external invitees book, reschedule, and cancel meetings with accurate availability, clear constraints, and safe concurrency. This includes iCloud CalDAV write-back, Google Meet creation, and confirmation emails.

## Scope Decisions (Locked)
- Apple Calendar: iCloud CalDAV with app-specific password.
- Link durations: multiple selectable durations per link.
- Availability: all connected calendars + TimeFlow scheduled items (default blocking).
- Work hours: global (reuse wake/sleep + daily schedule).
- Booking horizon: preset options (14/30/60/90), default 60.
- Buffer times: default 10 minutes before/after.
- Daily cap: per link, default 6, counts only link bookings.
- Google Meet: enabled by default.
- Booking flow: auto-confirm; timezone auto-detect + dropdown; name/email required + optional notes.
- Event title: "Meeting with {InviteeName}".
- Reschedule/cancel tokens: expire in 30 days.
- Flexible events: opt-out "Blocks availability" toggle (shown in task edit + event popover), default true.
- Public confirmation emails: send via Gmail API; no ICS in MVP.

## Architecture Overview
- Backend (Fastify): new Scheduling Links and Meetings services/controllers/routes; new Availability service; new Apple CalDAV service; new email notification utility (Gmail send).
- Data layer (Prisma): add SchedulingLink, Meeting, MeetingActionToken (or equivalent) models; add AppleCalendarAccount for CalDAV credentials; add blocksAvailability flags on ScheduledTask and ScheduledHabit.
- Frontend (Next.js): new Settings sections (Scheduling Links, Meeting Manager); new public pages under /book/[urlSlug] for booking, reschedule, cancel; link creation/edit UI; calendar quick-link to manage links.
- Shared types: add Meeting and SchedulingLink DTOs, availability slot DTOs, and request/response types.

## Data Model (Proposed)
- SchedulingLink
  - id, userId, name, slug (auto-generated), isActive
  - durationsMinutes (int[])
  - bufferBeforeMinutes, bufferAfterMinutes
  - maxBookingHorizonDays (int)
  - dailyCap (int)
  - calendarProvider (google|apple)
  - calendarId (provider id or caldav URL)
  - location (google_meet_on boolean)
  - createdAt, updatedAt
- Meeting
  - id, schedulingLinkId, userId
  - inviteeName, inviteeEmail, notes
  - startDateTime, endDateTime
  - status (scheduled|rescheduled|cancelled)
  - providerEventIds (googleEventId, appleEventUrl)
  - createdAt, updatedAt, rescheduledAt, cancelledAt
- MeetingActionToken
  - id, meetingId, type (reschedule|cancel), tokenHash, expiresAt, usedAt
- AppleCalendarAccount
  - id, userId, email, appPasswordEncrypted
  - baseUrl (https://caldav.icloud.com), principalUrl, calendarHomeUrl
  - createdAt, updatedAt
- ScheduledTask / ScheduledHabit
  - add blocksAvailability boolean (default true)

## Availability Computation
- Fetch events from Google + Apple within requested range.
- Include TimeFlow scheduled tasks/habits; skip those with blocksAvailability = false.
- Normalize all busy intervals to user timezone.
- Apply buffers: expand each busy interval by bufferBefore/After.
- Build free slots from wake/sleep (daily schedule overrides).
- Subtract busy intervals to get open slots.
- Clip by horizon; generate 15-minute granularity slots for each duration.
- Apply per-link daily cap based on Meetings created via that link.

## Booking Flow
1. Public page loads link settings and availability.
2. Invitee selects duration + slot; submits name/email/notes.
3. Backend re-validates slot availability in a transaction.
4. Create Meeting record; create Google + Apple events; attach Google Meet if enabled.
5. Send confirmation email with reschedule/cancel links.

## Reschedule/Cancel Flow
- Validate action token (exists, not expired, not used).
- Reschedule: re-check availability, update Meeting, patch provider events.
- Cancel: mark Meeting cancelled; update provider events (do not delete); send email.

## Error Handling
- Token expired or used: 410 with friendly UI state.
- Slot unavailable: 409 with prompt to choose another slot.
- Calendar provider errors: 502 with retry suggestion.
- Validation errors (bad email, invalid duration): 400 with field errors.

## Testing Strategy
- Unit tests: availability math (buffers, horizon, daily cap), slot generation, token expiry.
- Service tests: booking transaction and conflict prevention, reschedule/cancel status updates.
- Integration tests: Google + Apple event creation stubs; Gmail send stub.
- UI tests: public booking flow, error states, meeting manager filters.

## Notes
- Google busy transparency: for blocksAvailability false, mark events as "transparent" when creating and skip when reading.
- Apple CalDAV transparency: set TRANSP:TRANSPARENT for non-blocking TimeFlow events.
- All new logic must be timezone-safe using Luxon.
