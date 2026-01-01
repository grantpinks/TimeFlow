# Sprint 15 Meeting Scheduling Gap Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Finish Sprint 15 by replacing stubs, enforcing booking constraints, hardening concurrency, and updating documentation/QA so scheduling links ship confidently.  
**Architecture:** Keep existing Fastify/Prisma/Next.js structure. Replace CalDAV stubs with real HTTP calls + crypto, strengthen availability/booking logic (horizon, daily cap, busy sources), and align calendar semantics (cancel vs delete). TDD-driven small steps; reuse existing tests directories.  
**Tech Stack:** Fastify, Prisma, Vitest, Luxon, node-fetch/undici, fast-xml-parser, CalDAV, Google Calendar API, Next.js 14.

---

### Task 1: Enforce horizon + daily cap in availability engine

**Files:**
- Modify: `timeflow/apps/backend/src/services/meetingAvailabilityService.ts`
- Modify: `timeflow/apps/backend/src/services/__tests__/meetingAvailabilityService.test.ts`

**Step 1: Write the failing test**

Add cases that:
- Clamp slots to `maxBookingHorizonDays`.
- Enforce `dailyCap` per day across durations (e.g., only first N slots per day survive).

**Step 2: Run test to verify it fails**

Run: `pnpm -C timeflow/apps/backend test src/services/__tests__/meetingAvailabilityService.test.ts`
Expected: FAIL for missing horizon/dailyCap handling.

**Step 3: Write minimal implementation**

- Accept `maxBookingHorizonDays` and `dailyCap` in params.
- Clamp `rangeEnd` to `rangeStart + horizon`.
- After generating slots, group by day and truncate to `dailyCap` per day (keep earliest by start).

**Step 4: Run test to verify it passes**

Run: `pnpm -C timeflow/apps/backend test src/services/__tests__/meetingAvailabilityService.test.ts`
Expected: PASS.

**Step 5: Commit**

```bash
git add timeflow/apps/backend/src/services/meetingAvailabilityService.ts timeflow/apps/backend/src/services/__tests__/meetingAvailabilityService.test.ts
git commit -m "feat: enforce horizon and daily cap in availability slots"
```

---

### Task 2: Apply horizon/daily-cap in availability API

**Files:**
- Modify: `timeflow/apps/backend/src/controllers/availabilityController.ts`
- Modify: `timeflow/apps/backend/src/controllers/__tests__/availabilityController.test.ts` (create if missing)

**Step 1: Write the failing test**

Add controller-level tests (mock prisma/services) that:
- Reject `to` beyond horizon with a 400 or clamp result to horizon.
- Return at most `dailyCap` slots per day.

**Step 2: Run test to verify it fails**

Run: `pnpm -C timeflow/apps/backend test src/controllers/__tests__/availabilityController.test.ts`
Expected: FAIL because controller does not pass cap/horizon or validate.

**Step 3: Write minimal implementation**

- Validate `from/to` duration against `link.maxBookingHorizonDays`; clamp `to` when necessary.
- Pass `maxBookingHorizonDays` and `dailyCap` into `buildAvailabilitySlots`.
- Surface meaningful errors when horizon exceeded.

**Step 4: Run test to verify it passes**

Run: `pnpm -C timeflow/apps/backend test src/controllers/__tests__/availabilityController.test.ts`
Expected: PASS.

**Step 5: Commit**

```bash
git add timeflow/apps/backend/src/controllers/availabilityController.ts timeflow/apps/backend/src/controllers/__tests__/availabilityController.test.ts
git commit -m "feat: enforce horizon and cap in availability API"
```

---

### Task 3: Strengthen booking concurrency + constraints

**Files:**
- Modify: `timeflow/apps/backend/src/services/meetingBookingService.ts`
- Modify: `timeflow/apps/backend/src/services/__tests__/meetingBookingService.test.ts`
- Modify: `timeflow/apps/backend/src/services/__tests__/meetingTokens.test.ts` (if token semantics touched)

**Step 1: Write the failing test**

Add tests that:
- Reject bookings beyond `maxBookingHorizonDays`.
- Reject when day already has `dailyCap` scheduled meetings (status scheduled/rescheduled) regardless of link duration.
- Reject when overlapping with scheduled tasks/habits that `blocksAvailability` is true (mock prisma).
- Keep existing overlap test for meetings.

**Step 2: Run test to verify it fails**

Run: `pnpm -C timeflow/apps/backend test src/services/__tests__/meetingBookingService.test.ts`
Expected: FAIL for missing checks.

**Step 3: Write minimal implementation**

- Before booking, fetch count of meetings for that link date (excluding cancelled) and enforce `dailyCap`.
- Enforce horizon vs link.
- Pull blocking scheduledTasks/scheduledHabits in range and include in conflict detection.
- Keep transaction boundaries; ensure error messages are user-friendly.

**Step 4: Run test to verify it passes**

Run: `pnpm -C timeflow/apps/backend test src/services/__tests__/meetingBookingService.test.ts`
Expected: PASS.

**Step 5: Commit**

```bash
git add timeflow/apps/backend/src/services/meetingBookingService.ts timeflow/apps/backend/src/services/__tests__/meetingBookingService.test.ts
git commit -m "feat: enforce cap, horizon, and blockers during booking"
```

---

### Task 4: CalDAV discovery and event CRUD (replace stubs)

**Files:**
- Modify: `timeflow/apps/backend/src/services/appleCalendarService.ts`
- Add: `timeflow/apps/backend/src/services/__tests__/appleCalendarHttp.test.ts`
- Add: `timeflow/apps/backend/src/services/__tests__/__fixtures__/caldav-discovery.xml` (if helpful)

**Step 1: Write the failing test**

Use `nock` (or undici mock) to assert:
- `discoverAccount` issues PROPFIND to base URL, parses principal + calendar-home-set, stores encrypted password.
- `listCalendars` issues PROPFIND on calendar home, returns displayName/url.
- `getEvents` issues REPORT with time range and parses VEVENTs, preserving TRANSP.
- `createEvent`/`updateEvent`/`cancelEvent` send PUT with ICS body; `cancel` sets `STATUS:CANCELLED`.

**Step 2: Run test to verify it fails**

Run: `pnpm -C timeflow/apps/backend test src/services/__tests__/appleCalendarHttp.test.ts`
Expected: FAIL (stubs).

**Step 3: Write minimal implementation**

- Use `fetch`/`undici` with basic auth (email:appPassword).
- Build XML bodies for PROPFIND/REPORT; reuse `fast-xml-parser` for responses.
- Generate ICS strings for create/update with TRANSP mapping.
- Persist principalUrl/calendarHomeUrl in Prisma account.

**Step 4: Run test to verify it passes**

Run: `pnpm -C timeflow/apps/backend test src/services/__tests__/appleCalendarHttp.test.ts`
Expected: PASS.

**Step 5: Commit**

```bash
git add timeflow/apps/backend/src/services/appleCalendarService.ts timeflow/apps/backend/src/services/__tests__/appleCalendarHttp.test.ts
git commit -m "feat: implement apple caldav discovery and event CRUD"
```

---

### Task 5: Calendar cancel semantics (Google/Apple)

**Files:**
- Modify: `timeflow/apps/backend/src/services/googleCalendarService.ts`
- Modify: `timeflow/apps/backend/src/services/meetingBookingService.ts`
- Modify: `timeflow/apps/backend/src/controllers/meetingController.ts`
- Add: `timeflow/apps/backend/src/services/__tests__/googleCalendarCancel.test.ts`

**Step 1: Write the failing test**

Add tests asserting:
- `cancelMeeting` uses Google Calendar update with `status: 'cancelled'` (not delete) and preserves event.
- Apple `cancelEvent` writes ICS with `STATUS:CANCELLED`.

**Step 2: Run test to verify it fails**

Run: `pnpm -C timeflow/apps/backend test src/services/__tests__/googleCalendarCancel.test.ts`
Expected: FAIL (current code deletes).

**Step 3: Write minimal implementation**

- Add `cancelEvent` helper in google service to patch event `status: 'cancelled'` (conference data retained).
- Update host + token cancel flows to call cancel (not delete) for both providers.

**Step 4: Run test to verify it passes**

Run: `pnpm -C timeflow/apps/backend test src/services/__tests__/googleCalendarCancel.test.ts`
Expected: PASS.

**Step 5: Commit**

```bash
git add timeflow/apps/backend/src/services/googleCalendarService.ts timeflow/apps/backend/src/services/meetingBookingService.ts timeflow/apps/backend/src/controllers/meetingController.ts timeflow/apps/backend/src/services/__tests__/googleCalendarCancel.test.ts
git commit -m "fix: cancel meetings by marking events cancelled"
```

---

### Task 6: Documentation + QA checklist updates

**Files:**
- Modify: `timeflow/docs/SPRINT_15_MEETING_SCHEDULING_PLAN.md`
- Modify: `timeflow/docs/FEATURES_IN_PROGRESS.md`
- Add: `timeflow/docs/SPRINT_15_MEETING_SCHEDULING_QA.md`

**Step 1: Write/update docs (no tests)**

- Update Sprint 15 plan status to “In progress/Implementation” and note completed pieces (models, APIs, UI) vs remaining (CalDAV, constraints, cancellation semantics).
- Update Features in Progress to reflect implementation underway.
- Add QA checklist covering booking/reschedule/cancel, buffers, horizon, daily cap, transparent events, Google Meet link, Apple event create/update/cancel, tokens expiry, host cancel/reschedule from Meeting Manager.

**Step 2: Commit**

```bash
git add timeflow/docs/SPRINT_15_MEETING_SCHEDULING_PLAN.md timeflow/docs/FEATURES_IN_PROGRESS.md timeflow/docs/SPRINT_15_MEETING_SCHEDULING_QA.md
git commit -m "docs: update sprint 15 status and QA checklist"
```

---

## Completion Checklist

- [ ] Availability engine enforces horizon and daily cap
- [ ] Availability API clamps/validates horizon and cap
- [ ] Booking enforces horizon, daily cap, and blockers (meetings + tasks/habits)
- [ ] CalDAV discovery/events implemented with tests
- [ ] Calendar cancel semantics fixed for Google/Apple
- [ ] Sprint 15 docs and QA checklist updated

---

Plan complete and saved to `docs/plans/2025-12-30-sprint-15-gap-plan.md`. Two execution options:

1. Subagent-Driven (this session) - I dispatch fresh subagent per task, review between tasks, fast iteration
2. Parallel Session (separate) - Open new session with executing-plans, batch execution with checkpoints

Which approach?***
