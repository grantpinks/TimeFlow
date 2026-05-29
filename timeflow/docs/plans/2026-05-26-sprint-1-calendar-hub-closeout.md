# Sprint 1 Closeout — Multi-Account Calendar Hub

**Date:** 2026-05-26  
**Status:** Complete (ready for Sprint 2)  
**Design:** `docs/plans/2026-05-25-multi-account-calendar-hub-design.md`  
**Implementation:** `docs/plans/2026-05-25-multi-account-calendar-hub-implementation-plan.md`  
**ADR:** `timeflow/ARCHITECTURE_DECISIONS.md` — ADR-013

---

## Shipped (Sprint 1 scope)

- [x] `ConnectedAccount` + `ConnectedCalendar` schema; migrations on deploy (`prisma migrate deploy`)
- [x] Google OAuth dual-write + lazy backfill from `User.google*`
- [x] iCloud CalDAV connect (app-specific password, per-user; no global iCloud env)
- [x] Two-step iCloud discovery + regional CalDAV hosts
- [x] Merged external events on `GET /api/calendar/events`
- [x] Smart schedule / apply use `useForAvailability` calendars for busy time
- [x] Calendar sidebar: show/hide events, hide from list (`listedInSidebar`), restore hidden
- [x] Settings: connected accounts, per-calendar toggles, iCloud connect
- [x] Scheduling links: Google + Apple calendar pickers
- [x] iCloud ICS: TZID, folded lines, stable event IDs
- [x] CalDAV calendar dedupe (canonical URL key)
- [x] ADR-013 + contact FAQ updated

---

## Production QA checklist

Run on **production** after deploy. Mark each when verified.

| # | Test | Pass |
|---|------|------|
| 1 | **Google-only regression:** Log in with Google → calendar loads, tasks schedule to default Google calendar | ☐ |
| 2 | **Connect iCloud:** Settings → app-specific password → account shows synced calendars (not 0) | ☐ |
| 3 | **Event time:** iCloud test event appears at correct local time (not crushed at top of grid) | ☐ |
| 4 | **Sidebar visibility:** Uncheck calendar → events disappear; recheck → events return | ☐ |
| 5 | **Hide from list:** Remove duplicate/extra calendar from sidebar (× or Settings) → list stays tidy | ☐ |
| 6 | **Smart schedule:** With iCloud visible, busy blocks on iCloud events are respected | ☐ |
| 7 | **Disconnect iCloud:** Disconnect → stays disconnected after refresh; no ghost calendars | ☐ |
| 8 | **Scheduling link (Apple):** Create link with iCloud calendar → book test slot → event on iCloud | ☐ |
| 9 | **Gmail:** Inbox still loads (Google token path unchanged) | ☐ |

**Env:** Confirm `ENCRYPTION_KEY` has not changed since iCloud connect (or users must reconnect iCloud).

---

## Explicitly deferred (not Sprint 1)

| Item | Target |
|------|--------|
| Sign in with Apple (login) | **Sprint 2** |
| Second Google account / dual-Gmail | Sprint 1b or later |
| `useForAvailability` ≠ `visible` in UI | Optional polish |
| Drop legacy `User.google*` / `AppleCalendarAccount` | Deploy gate 2 (after stability) |
| Outlook | Future epic |

---

## Sprint 2 entry criteria

- [ ] All QA rows above checked on production
- [ ] No P0/P1 open bugs tagged `calendar-hub`
- [ ] Apple Developer Program access confirmed
- [ ] Decision: account linking when Google email = Apple email (merge vs explicit link)
- [ ] Redirect URLs for `APP_BASE_URL` documented for Apple Services ID

**Next plan:** Sprint 2 implementation plan (Sign in with Apple) — to be written before coding.

---

## Key commits (reference)

Sprint 1 landed on `main` including:

- `feat(calendar): add multi-account calendar hub with iCloud and merged views`
- `fix(calendar): correct iCloud CalDAV discovery and event parsing`
- `fix(calendar): parse iCloud event timezones and dedupe CalDAV calendars`
- `feat(calendar): let users hide connected calendars from the sidebar list`
