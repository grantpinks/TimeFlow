# Sprint 1 Closeout — Multi-Account Calendar Hub

**Date:** 2026-05-26  
**Status:** Complete — calendar hub shipped for Google login + iCloud CalDAV  
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

## Production QA

Use **`docs/qa/calendar-hub-production-qa.md`** (not `Backend Log Testing.md`). Run on production after deploy; check all rows before Sprint 2.

---

## Explicitly deferred (not Sprint 1)

| Item | Target |
|------|--------|
| Sign in with Apple (login) | **Deferred** — see `docs/plans/2026-05-26-sprint-2-sign-in-with-apple-outline.md` |
| Second Google account / dual-Gmail | Sprint 1b or later |
| `useForAvailability` ≠ `visible` in UI | Optional polish |
| Drop legacy `User.google*` / `AppleCalendarAccount` | Deploy gate 2 (after stability) |
| Outlook | Future epic |

---

## What’s next (your call)

Sprint 1 is **done in code**. Optional: finish `docs/qa/calendar-hub-production-qa.md` on production when convenient.

**Sign in with Apple** is **deferred** (needs paid Apple Developer Program). iCloud calendars already work via Settings + app-specific password — no Developer account.

When you want to resume Apple login work, see **`docs/plans/BACKLOG.md`** and the Sprint 2 outline.

---

## Key commits (reference)

Sprint 1 landed on `main` including:

- `feat(calendar): add multi-account calendar hub with iCloud and merged views`
- `fix(calendar): correct iCloud CalDAV discovery and event parsing`
- `fix(calendar): parse iCloud event timezones and dedupe CalDAV calendars`
- `feat(calendar): let users hide connected calendars from the sidebar list`
