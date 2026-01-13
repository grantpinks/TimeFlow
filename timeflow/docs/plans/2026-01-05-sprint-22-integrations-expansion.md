# Sprint 22: Integrations Expansion (Sequenced by Integration)

**Goal:** Expand TimeFlow’s user base by supporting key ecosystems beyond Google, while keeping integration UX consistent and sync behavior safe.

**Important:** This sprint includes multiple integrations, but it is **sequenced**. Each integration has an explicit **“Definition of Done” gate**. We do not start the next integration until the prior one meets its DoD.

---

## Sprint sequencing (recommended order)

1. **Foundation (Account model + Integrations Hub + telemetry)**
2. **Calendar: CalDAV (read-only)**
3. **Calendar: iOS EventKit (read-only)**
4. **Tasks: Todoist (one-way import MVP)**
5. **Comms: Slack (message → task capture MVP)**

---

## Cross-cutting requirements (non-negotiable)

- **Unified `Account` model**: all provider connections are modeled as accounts; tokens/credentials live there.
- **Least privilege**: minimal scopes required to achieve MVP value.
- **Idempotency**: all imports must be safe to re-run; define duplicate prevention keys up-front.
- **Disconnect**: removing an account stops sync immediately; offers options on imported data retention.
- **Observability**: per-account `lastSuccessAt`, `lastErrorAt`, `lastErrorCode`, `lastErrorMessage` (sanitized).
- **User trust UX**: for any write action (now or later), we show a preview/confirmation first.

---

## Integration 0: Foundation (required before any provider)

### Scope
- Implement unified `Account` model + migrate existing Google token data.
- Build **Integrations Hub** UI in Settings (connect/configure/status/disconnect patterns).
- Add sync telemetry fields so we can debug provider failures.

### Definition of Done (DoD)
- Integrations Hub shows: connected providers, last sync time, and last error (sanitized).
- Disconnect stops future sync immediately and revokes tokens where applicable.
- Existing Google integration still works end-to-end after migration to `Account`.

---

## Integration 1: Calendar — CalDAV (read-only)

### User value
- Web + backend scheduling respects calendars outside Google/Microsoft (iCloud, Fastmail, Nextcloud, etc.).

### Flow
1. Settings → Integrations → **Connect CalDAV**
2. Enter server URL + username + app password
3. “Test connection” → list calendars
4. Select calendars included in **Availability**
5. TimeFlow uses these events as “busy blocks” during scheduling (read-only)

### Definition of Done (DoD)
- User can connect and select calendars.
- Events are fetched and merged into scheduling availability.
- Re-fetch is safe/idempotent; errors show in Integrations Hub.

---

## Integration 2: Calendar — iOS EventKit (read-only)

### User value
- Best Apple experience on mobile: users see their real Apple Calendar commitments and schedule around them.

### Flow (mobile)
1. Settings → Integrations → **Connect Apple Calendar**
2. iOS permission prompt (Calendar read)
3. Select calendars included in **Availability**
4. Mobile availability/scheduling respects EventKit events

### Web/back-end interaction (explicitly sequenced decision)
- **Option A (ship in sprint)**: EventKit → backend “availability snapshots” (sanitized busy intervals only) so web scheduling also respects it.
- **Option B (defer)**: EventKit is mobile-only in MVP; Integrations UI communicates that web scheduling only respects backend-connected calendars.

### Definition of Done (DoD)
- iOS can read selected calendars and display/compute availability reliably.
- Clear UX indicates whether EventKit affects web scheduling (A vs B above).
- Disconnect removes EventKit calendar source from mobile availability immediately.

---

## Integration 3: Tasks — Todoist (one-way import MVP)

### User value
- Users keep Todoist as their “capture/source of truth” while TimeFlow becomes the scheduling layer.

### Flow
1. Settings → Integrations → **Connect Todoist**
2. Select projects to sync
3. Preview import (count, fields)
4. Import open tasks into TimeFlow with external IDs
5. Optional later: write-back signals (comments/labels) after we have conflict policies

### Definition of Done (DoD)
- Import is idempotent (no duplicates on re-sync).
- Imported tasks carry provider metadata (provider + externalId + sourceProject).
- Clear policy documented: what happens on Todoist completion/deletion (MVP can be “ignore deletes; only import open tasks”).

---

## Integration 4: Comms — Slack (message → task capture MVP)

### User value
- Convert work messages into scheduled tasks without leaving the place work happens.

### Flow
1. Settings → Integrations → **Connect Slack**
2. Install to workspace; choose DM-only or selected channels for MVP
3. Slack message action → “Create TimeFlow Task” → opens a small modal (title/notes)
4. Task appears in TimeFlow Inbox/Tasks

### Definition of Done (DoD)
- Message→task works end-to-end.
- Minimal required scopes only; documented in Integrations Hub.
- Failures show as actionable errors (misconfigured workspace, revoked token, etc.).

---

## Notes: Why this is “same sprint, sequenced”

- Sequencing keeps quality high: each integration is “done-done” (connect/configure/sync/status/disconnect) before starting the next.
- Shared foundation work prevents each integration from inventing its own UX + data model.
