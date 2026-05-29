# Multi-Account Calendar Hub — Design & Two-Sprint Plan

**Date:** 2026-05-25  
**Status:** Approved direction (brainstorm)  
**Decision:** **Option 1 now** (Google login + multi-calendar hub). **Option 2** (Sign in with Apple as equal primary login) is **deferred** until Apple Developer Program enrollment — see `docs/plans/BACKLOG.md`. iCloud CalDAV connect does not require it.

**Related:** `docs/plans/2026-01-05-sprint-22-integrations-expansion.md` (foundation + CalDAV sequencing)

---

## Problem

Workers use multiple emails and calendars (work Gmail, personal iCloud, shared calendars). TimeFlow today is Google-centric: one OAuth login, tokens on `User`, one default calendar, no UI to connect iCloud for the main app, and no Google-style visibility toggles across accounts.

## Goal

1. One **TimeFlow user** can connect **multiple accounts** (Gmail/Google, iCloud/CalDAV, later Outlook).
2. **Merged calendar view** shows events from all **enabled** calendars.
3. **Google Calendar–style sidebar**: per-calendar checkboxes, colors, show/hide without disconnecting.
4. **Smart scheduling** respects busy time from enabled “availability” calendars (v1: same set as visible unless we split later).
5. **Do not break** existing Google-only users.

## Non-goals (explicit)

| Deferred | Why |
|----------|-----|
| Outlook / Microsoft Graph | Separate provider epic |
| CalDAV **write** for tasks/habits | Read-merge first; meetings already have Apple write path |
| Magic-link / password-only signup | Option C; not in these two sprints |
| Second Gmail inbox (full) | Sprint 1 may stub list shape; full dual-Gmail inbox in Sprint 1b or 2 if capacity |
| Todoist / Slack | Sprint 22 sequenced integrations |

---

## Concepts (plain language)

| Term | Meaning |
|------|---------|
| **User** | One person in TimeFlow (`User.id`) |
| **Account** | One connected mailbox/provider (work Google, personal iCloud) |
| **Calendar** | One calendar inside an account |
| **Visibility** | Checkbox: show this calendar on the main calendar view |
| **Availability** | Use this calendar’s events as “busy” for smart schedule (v1: tied to visibility; v2: optional separate toggle) |
| **Write target** | Where TimeFlow creates task/habit events (v1: single default, usually primary Google calendar) |

**Account hub** = many `Account` rows per `User`, each with calendars and per-calendar preferences—not “full Option C” auth on day one.

---

## Architecture overview

```
User (identity, preferences, billing)
  └── Account[] (provider, email, encrypted credentials, sync telemetry)
        └── ConnectedCalendar[] (externalCalendarId, name, color, visible, useForAvailability)
```

**Login (Sprint 1):** Google OAuth → JWT (unchanged entry).  
**Login (Sprint 2):** + Sign in with Apple → same `User` or linked account rules (see Sprint 2).

**Event fetch:** `GET /api/calendar/events` accepts date range; backend loads events from all `ConnectedCalendar` where `visible = true` (or client sends selected IDs), merges, sorts, returns unified list with `accountId`, `calendarId`, `provider`, `color`.

**Migration:** Move `User.google*` token fields → primary Google `Account`. Dual-read during rollout; feature flag optional.

---

## UX: Calendar sidebar (Google-style)

Reference: Google Calendar left panel — grouped lists, colored checkboxes, expand/collapse.

### Sidebar structure (recommended)

```
Accounts & calendars                    [+ Add account]
────────────────────────────────────────
▼ Work — user@company.com
  ☑ Primary                    ● blue
  ☐ Team shared                ● gray
▼ Personal — me@icloud.com
  ☑ Home                       ● green
  ☑ Birthdays                  ● purple
────────────────────────────────────────
[ ] Show only selected (optional v2)
```

- **Checkbox** toggles `visible` (persisted immediately).
- **Color dot** matches event styling on the grid (stable per `ConnectedCalendar`).
- **+ Add account** → Integrations Hub (Google reconnect/add, iCloud CalDAV).
- **Select all / none** per account group (nice-to-have; not blocking v1).

### Calendar page behavior

- Checked calendars → fetch and merge for current view range.
- Unchecked → hidden from grid; v1 also excludes from availability merge.
- TimeFlow-native events (tasks, habits) unchanged; still written to **default write calendar** (Settings).

### Settings → Integrations Hub

Per account: status, last sync, last error (sanitized), Test connection, Disconnect.

**iCloud connect flow:** email + app-specific password → discover → list calendars → user selects which to enable (default all on).

---

## Sprint 1 — Multi-calendar hub (Google login only)

**Theme:** “Connect more calendars, see them together, schedule around all of them—without changing how you sign in.”

### Phase 1.1 — Data model & migration (gate)

- [ ] Prisma: `Account`, `ConnectedCalendar` (names per team convention).
- [ ] Migrate existing Google tokens from `User` → primary `Account` (`provider: google`, `isPrimary: true`).
- [ ] Migrate `AppleCalendarAccount` → `Account` (`provider: apple_caldav`) or alias; remove `@@unique([userId])` on Apple when supporting multiple.
- [ ] `User`: keep `email`, `defaultWriteCalendarId` (or pointer to `ConnectedCalendar`), drop direct token fields after migration verified.
- [ ] Encrypted credentials pattern matches existing Apple/Google storage.

**DoD:** Existing prod-like user signs in with Google; calendar + schedule + Gmail behave as before.

### Phase 1.2 — Account APIs

- [ ] `GET /api/accounts` — list accounts + calendars + visibility flags.
- [ ] `POST /api/accounts/google/connect` — OAuth for **additional** Google account (Sprint 1: optional stretch; minimum: re-migrate primary only).
- [ ] `POST /api/accounts/icloud/connect` — email + app password → discover → store Account.
- [ ] `POST /api/accounts/:id/test` — connection health.
- [ ] `DELETE /api/accounts/:id` — disconnect; revoke where applicable; stop sync immediately.
- [ ] `PATCH /api/calendars/:id` — update `visible`, `color`, `useForAvailability` (if split).

### Phase 1.3 — Merged events & scheduling

- [ ] `googleCalendarService` reads via Account id, not only `User` tokens.
- [ ] `appleCalendarService` wired for **read** in `calendarController.getEvents` (not only meetings).
- [ ] Merge layer: parallel fetch per enabled calendar, normalize to shared DTO, sort by start, dedupe heuristic (same start+end+title → log, don’t duplicate UI).
- [ ] `scheduleService` / smart schedule: union busy intervals from all availability-enabled calendars.
- [ ] Writes: tasks/habits still → `defaultWriteCalendarId` (Google primary unless configured).

### Phase 1.4 — Web UI

- [ ] Settings: **Integrations Hub** (accounts list, connect iCloud, disconnect, errors).
- [ ] Calendar page: **sidebar** with checkboxes + colors (persist toggles).
- [ ] Scheduling links: fix Apple path — require connected iCloud account + calendar picker (replace hardcoded `primary`).
- [ ] Copy: remove “Apple coming soon” where inaccurate; link to Apple app-password help.

### Phase 1.5 — Regression & observability

- [ ] Per-account telemetry: `lastSuccessAt`, `lastErrorAt`, `lastErrorCode`, `lastErrorMessage` (sanitized).
- [ ] Manual + automated regression checklist (below).
- [ ] ADR update: Account hub + Google-primary login for Sprint 1.

### Sprint 1 exit criteria (must all pass)

1. Google-only user: zero perceived regression (login, calendar, smart schedule, Gmail, meetings).
2. User connects iCloud → sees iCloud events on calendar when checkbox on.
3. User unchecks calendar → events disappear; smart schedule ignores that busy time.
4. Disconnect iCloud → no leaked events; scheduling links using Apple show clear error if disconnected.
5. No tokens/passwords in logs.

### Sprint 1 hour estimate (ranges)

| Workstream | Hours |
|------------|-------|
| Schema + migration + dual-read | 12–20 |
| Account + calendar APIs | 16–24 |
| Merge events + schedule busy | 16–24 |
| Integrations Hub + calendar sidebar UI | 20–32 |
| Scheduling links Apple fix | 6–10 |
| QA + regression | 12–16 |
| **Total** | **~82–126** |

---

## Sprint 2 — Sign in with Apple (required)

**Theme:** “iCloud-first users can create a TimeFlow account without Google.”

### Scope

- [ ] Apple Sign In (web + document mobile path): `POST /api/auth/apple/start`, callback, JWT issuance same as Google.
- [ ] User upsert by Apple `sub` + email (handle private relay email).
- [ ] **Account linking:** same email on Google and Apple → merge policy (prefer explicit “Link accounts” vs auto-merge—document in ADR).
- [ ] Post-login onboarding: “Connect your iCloud calendar” (app-specific password step)—reuse Sprint 1 Integrations flow.
- [ ] Login page: **Continue with Google** | **Continue with Apple** (equal prominence).
- [ ] Mobile: Expo Apple authentication aligned with backend.

### Sprint 2 exit criteria

1. New user can sign up with Apple only, connect iCloud, see merged calendar.
2. Existing Google user can link Apple (or vice versa) without duplicate billing/users.
3. Apple login + Google calendar connect works (worker pattern: Apple identity + work Google connection).
4. Security review: nonce/state, token validation, key rotation notes.

### Sprint 2 dependencies

- Sprint 1 `Account` model and Integrations Hub **must be complete**—Apple sign-in should not block on calendar merge work.

### Sprint 2 hour estimate

| Workstream | Hours |
|------------|-------|
| Apple auth backend + JWT | 12–18 |
| Account linking rules + edge cases | 8–14 |
| Web + mobile login UI | 10–16 |
| Onboarding + iCloud connect polish | 6–10 |
| QA (auth matrix) | 10–14 |
| **Total** | **~46–72** |

---

## Regression checklist (both sprints)

Run before each sprint close:

- [ ] `GET /api/auth/google/start` → callback → JWT
- [ ] Token refresh / `GET /api/auth/google/status`
- [ ] `GET /api/calendar/events` (range)
- [ ] Smart schedule + apply schedule
- [ ] Habit calendar events create/update
- [ ] Gmail inbox + sync
- [ ] Meeting booking (Google + Apple link)
- [ ] Stripe/billing still keyed on `User.id`
- [ ] Settings default write calendar

---

## Risk register

| Risk | Mitigation |
|------|------------|
| Migration breaks Google tokens | Dual-read; staged deploy; rollback migration |
| Duplicate events across calendars | Dedupe heuristic + user education |
| iCloud app-password friction | Inline guide, test connection, clear errors |
| Apple private relay email collisions | Linking UI + unique constraint strategy |
| Scope creep (Outlook, 2nd Gmail inbox) | Strict non-goals; Sprint 1b backlog |

---

## Backlog after Sprint 2

- Second Google account (full inbox + calendar)
- Microsoft Outlook (Graph)
- Separate “availability only” vs “visible” toggles
- CalDAV write for tasks (policy + conflicts)
- iOS EventKit → availability snapshots for web (Sprint 22 Option A)

---

## Decision log

| Date | Decision |
|------|----------|
| 2026-05-25 | Sprint 1 = Option 1 (Google login, multi-account calendars, sidebar toggles, iCloud connect). Sprint 2 = Option 2 (Sign in with Apple operational). |

---

## Next steps

1. Architect: break Sprint 1 into CODEX/GEMINI task files with hour estimates.
2. ADR: `Account` model + migration strategy + Apple linking policy (draft in Sprint 1, finalize before Sprint 2).
3. Implementation: use `using-git-worktrees` + `writing-plans` when ready to code.
