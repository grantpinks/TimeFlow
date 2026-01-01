# Sprint 15 Meeting Scheduling QA Checklist

Use this checklist to validate the end-to-end scheduling links experience before declaring Sprint 15 complete.

## Core flows
- Create scheduling link in Settings; verify durations, buffers, horizon, daily cap, and calendar selection persist.
- Public booking: select slots in multiple time zones; ensure buffers and daily cap are enforced and slot disappears after booking.
- Booking confirmation email includes reschedule/cancel links; Google Meet link present when enabled.
- Reschedule via token link preserves constraints and updates calendar event.
- Cancel via token link marks meeting cancelled (record retained) and calendar event set to `cancelled`.

## Availability correctness
- Horizon enforcement: requesting availability beyond link horizon clamps results.
- Daily cap: no more than configured meetings per day; cap respected in availability and booking.
- Busy sources: existing meetings, blocking tasks/habits, and opaque external events remove slots; transparent events do not block.
- Work hours/meeting hours and blocked days respected; per-day meeting schedule overrides global hours.

## Calendar integrations
- Google: create/update/cancel events succeed; cancelled events remain with `status=cancelled`; Meet link added when enabled.
- Apple CalDAV: account discovery succeeds; calendars list; events create/update/cancel over CalDAV; TRANSP respected for availability.

## Host controls
- Meeting Manager: filters scheduled/rescheduled/cancelled correctly; host cancel triggers calendar cancel and invitee email.
- Scheduling Link pause/resume removes/adds slots publicly; delete removes public access.

## Tokens and safety
- Reschedule/cancel tokens expire after 30 days and cannot be reused; invalid tokens return user-friendly errors.
- Booking concurrency: overlapping bookings rejected; blockers (tasks/habits) prevent double-booking.

## UI/UX polish
- Public pages (`/book/[slug]`, `/book/[slug]/reschedule`, `/book/[slug]/cancel`) render on mobile/desktop and show clear empty/error states.
- Settings panels show last updates, shareable link, and handle API errors gracefully.
