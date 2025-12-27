# Sprint 15 Meeting Scheduling Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Implement scheduling links with booking/reschedule/cancel, multi-calendar availability (Google + iCloud CalDAV), constraints (work hours, horizon, buffers, daily cap), Google Meet, confirmation emails, and the UI flows.

**Architecture:** Add new Prisma models for scheduling links and meetings, implement provider services (Google + iCloud CalDAV), build an availability engine that merges busy intervals with buffers and constraints, then expose authenticated CRUD and public booking endpoints. UI includes Settings management, Meeting Manager, and public booking pages.

**Tech Stack:** Fastify, Prisma, Luxon, Next.js 14, Tailwind, Gmail API, Google Calendar API, CalDAV (iCloud)

**Skills:** @test-driven-development, @verification-before-completion

**Note:** User requested no separate worktree; work in current workspace.

---

## Task 1: Add shared DTOs for scheduling links, meetings, and availability

**Files:**
- Create: `packages/shared/src/types/meeting.ts`
- Modify: `packages/shared/src/types/index.ts`

**Step 1: Write the failing test**

Create a minimal type export test to ensure new types are exported.

```typescript
import { describe, expect, it } from 'vitest';
import * as types from '../index';

describe('shared types exports', () => {
  it('exports meeting and scheduling link types', () => {
    expect(types).toHaveProperty('Meeting');
    expect(types).toHaveProperty('SchedulingLink');
    expect(types).toHaveProperty('AvailabilitySlot');
  });
});
```

**Step 2: Run test to verify it fails**

Run: `pnpm -C packages/shared test`
Expected: FAIL with missing exports (or no test runner yet).

**Step 3: Write minimal implementation**

Add types in `packages/shared/src/types/meeting.ts`:

```typescript
export interface SchedulingLink {
  id: string;
  userId: string;
  name: string;
  slug: string;
  isActive: boolean;
  durationsMinutes: number[];
  bufferBeforeMinutes: number;
  bufferAfterMinutes: number;
  maxBookingHorizonDays: number;
  dailyCap: number;
  calendarProvider: 'google' | 'apple';
  calendarId: string;
  googleMeetEnabled: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Meeting {
  id: string;
  schedulingLinkId: string;
  userId: string;
  inviteeName: string;
  inviteeEmail: string;
  notes?: string | null;
  startDateTime: string;
  endDateTime: string;
  status: 'scheduled' | 'rescheduled' | 'cancelled';
  googleEventId?: string | null;
  appleEventUrl?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface AvailabilitySlot {
  start: string;
  end: string;
  durationMinutes: number;
}
```

Update `packages/shared/src/types/index.ts` to export them.

**Step 4: Run test to verify it passes**

Run: `pnpm -C packages/shared test`
Expected: PASS (or green if test runner exists).

**Step 5: Commit**

```bash
git add packages/shared/src/types/meeting.ts packages/shared/src/types/index.ts

git commit -m "feat: add shared scheduling link and meeting types"
```

---

## Task 2: Add Prisma models for scheduling links, meetings, tokens, and Apple CalDAV accounts

**Files:**
- Modify: `apps/backend/prisma/schema.prisma`

**Step 1: Write the failing test**

Add a Prisma schema snapshot test in `apps/backend/src/__tests__/schema.test.ts` that asserts model names exist.

```typescript
import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';

it('adds meeting scheduling models', () => {
  const schema = readFileSync('prisma/schema.prisma', 'utf8');
  expect(schema).toContain('model SchedulingLink');
  expect(schema).toContain('model Meeting');
  expect(schema).toContain('model MeetingActionToken');
  expect(schema).toContain('model AppleCalendarAccount');
});
```

**Step 2: Run test to verify it fails**

Run: `pnpm -C apps/backend test src/__tests__/schema.test.ts`
Expected: FAIL because models are missing.

**Step 3: Write minimal implementation**

Add models to `schema.prisma`:

```prisma
model SchedulingLink {
  id                   String   @id @default(cuid())
  userId               String
  name                 String
  slug                 String   @unique
  isActive             Boolean  @default(true)
  durationsMinutes     Int[]
  bufferBeforeMinutes  Int      @default(10)
  bufferAfterMinutes   Int      @default(10)
  maxBookingHorizonDays Int     @default(60)
  dailyCap             Int      @default(6)
  calendarProvider     String
  calendarId           String
  googleMeetEnabled    Boolean  @default(true)
  createdAt            DateTime @default(now())
  updatedAt            DateTime @updatedAt

  user      User     @relation(fields: [userId], references: [id])
  meetings  Meeting[]

  @@index([userId])
}

model Meeting {
  id               String   @id @default(cuid())
  schedulingLinkId String
  userId           String
  inviteeName      String
  inviteeEmail     String
  notes            String?
  startDateTime    DateTime
  endDateTime      DateTime
  status           String   @default("scheduled")
  googleEventId    String?
  appleEventUrl    String?
  createdAt        DateTime @default(now())
  updatedAt        DateTime @updatedAt
  rescheduledAt    DateTime?
  cancelledAt      DateTime?

  schedulingLink SchedulingLink @relation(fields: [schedulingLinkId], references: [id], onDelete: Cascade)
  user           User           @relation(fields: [userId], references: [id])

  @@index([userId])
  @@index([schedulingLinkId])
}

model MeetingActionToken {
  id         String   @id @default(cuid())
  meetingId  String
  type       String
  tokenHash  String   @unique
  expiresAt  DateTime
  usedAt     DateTime?
  createdAt  DateTime @default(now())

  meeting    Meeting  @relation(fields: [meetingId], references: [id], onDelete: Cascade)

  @@index([meetingId])
}

model AppleCalendarAccount {
  id                 String   @id @default(cuid())
  userId             String
  email              String
  appPasswordEncrypted String
  baseUrl            String   @default("https://caldav.icloud.com")
  principalUrl       String?
  calendarHomeUrl    String?
  createdAt          DateTime @default(now())
  updatedAt          DateTime @updatedAt

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@unique([userId])
}
```

Add blocksAvailability flags:

```prisma
model ScheduledTask {
  ...
  blocksAvailability Boolean @default(true)
}

model ScheduledHabit {
  ...
  blocksAvailability Boolean @default(true)
}
```

**Step 4: Run test to verify it passes**

Run: `pnpm -C apps/backend test src/__tests__/schema.test.ts`
Expected: PASS.

**Step 5: Commit**

```bash
git add apps/backend/prisma/schema.prisma apps/backend/src/__tests__/schema.test.ts

git commit -m "feat: add meeting scheduling prisma models"
```

---

## Task 3: Add iCloud CalDAV account service and discovery

**Files:**
- Create: `apps/backend/src/services/appleCalendarService.ts`
- Create: `apps/backend/src/services/__tests__/appleCalendarService.test.ts`

**Step 1: Write the failing test**

Test XML discovery parsing with a fixture response.

```typescript
import { describe, expect, it } from 'vitest';
import { parseCalendarHomeUrl } from '../appleCalendarService';

it('parses calendar-home-set from DAV response', () => {
  const xml = `<?xml version="1.0"?>
  <d:multistatus xmlns:d="DAV:">
    <d:response>
      <d:propstat>
        <d:prop>
          <cal:calendar-home-set xmlns:cal="urn:ietf:params:xml:ns:caldav">
            <d:href>/123456789/calendars/</d:href>
          </cal:calendar-home-set>
        </d:prop>
      </d:propstat>
    </d:response>
  </d:multistatus>`;
  expect(parseCalendarHomeUrl(xml)).toBe('/123456789/calendars/');
});
```

**Step 2: Run test to verify it fails**

Run: `pnpm -C apps/backend test src/services/__tests__/appleCalendarService.test.ts`
Expected: FAIL (function missing).

**Step 3: Write minimal implementation**

Implement `parseCalendarHomeUrl` and `parseCalendarsList` in `appleCalendarService.ts` using `fast-xml-parser`. Add minimal CalDAV discovery:
- `discoverAccount(userId, email, appPassword)`
- Store encrypted app password in `AppleCalendarAccount`

**Step 4: Run test to verify it passes**

Run: `pnpm -C apps/backend test src/services/__tests__/appleCalendarService.test.ts`
Expected: PASS.

**Step 5: Commit**

```bash
git add apps/backend/src/services/appleCalendarService.ts apps/backend/src/services/__tests__/appleCalendarService.test.ts

git commit -m "feat: add apple caldav discovery helpers"
```

---

## Task 4: Add Apple CalDAV event CRUD helpers

**Files:**
- Modify: `apps/backend/src/services/appleCalendarService.ts`
- Modify: `packages/shared/src/types/calendar.ts`
- Create: `apps/backend/src/services/__tests__/appleCalendarEvents.test.ts`

**Step 1: Write the failing test**

Test ICS parsing for TRANSP and event timestamps.

```typescript
import { describe, expect, it } from 'vitest';
import { parseIcsEvent } from '../appleCalendarService';

it('parses transparent events and times from ICS', () => {
  const ics = `BEGIN:VEVENT
DTSTART:20260110T160000Z
DTEND:20260110T170000Z
SUMMARY:TimeFlow Task
TRANSP:TRANSPARENT
END:VEVENT`;
  const event = parseIcsEvent(ics);
  expect(event.start).toBe('2026-01-10T16:00:00.000Z');
  expect(event.end).toBe('2026-01-10T17:00:00.000Z');
  expect(event.transparency).toBe('transparent');
});
```

**Step 2: Run test to verify it fails**

Run: `pnpm -C apps/backend test src/services/__tests__/appleCalendarEvents.test.ts`
Expected: FAIL.

**Step 3: Write minimal implementation**

Add `parseIcsEvent` and `parseIcsEvents` to `appleCalendarService.ts` using `ical.js` or a small parser. Extend `CalendarEvent` type to include:

```typescript
transparency?: 'opaque' | 'transparent';
```

Add functions:
- `listCalendars(userId)`
- `getEvents(userId, calendarUrl, timeMin, timeMax)`
- `createEvent(userId, calendarUrl, event)`
- `updateEvent(userId, calendarUrl, eventUrl, event)`
- `cancelEvent(userId, calendarUrl, eventUrl)` (set STATUS:CANCELLED)

**Step 4: Run test to verify it passes**

Run: `pnpm -C apps/backend test src/services/__tests__/appleCalendarEvents.test.ts`
Expected: PASS.

**Step 5: Commit**

```bash
git add apps/backend/src/services/appleCalendarService.ts apps/backend/src/services/__tests__/appleCalendarEvents.test.ts packages/shared/src/types/calendar.ts

git commit -m "feat: add apple caldav event helpers"
```

---

## Task 5: Build availability engine for scheduling links

**Files:**
- Create: `apps/backend/src/services/meetingAvailabilityService.ts`
- Create: `apps/backend/src/services/__tests__/meetingAvailabilityService.test.ts`

**Step 1: Write the failing test**

Test buffers, horizon clamp, and 15-minute slots.

```typescript
import { describe, expect, it } from 'vitest';
import { buildAvailabilitySlots } from '../meetingAvailabilityService';

it('applies buffers and builds 15-minute slots', () => {
  const slots = buildAvailabilitySlots({
    rangeStart: '2026-01-10T09:00:00.000Z',
    rangeEnd: '2026-01-10T12:00:00.000Z',
    durationsMinutes: [30],
    bufferBeforeMinutes: 10,
    bufferAfterMinutes: 10,
    busyIntervals: [
      { start: '2026-01-10T10:00:00.000Z', end: '2026-01-10T10:30:00.000Z' },
    ],
    timeZone: 'UTC',
    wakeTime: '09:00',
    sleepTime: '17:00',
    dailySchedule: null,
  });
  expect(slots.some((s) => s.start === '2026-01-10T09:00:00.000Z')).toBe(true);
  expect(slots.some((s) => s.start === '2026-01-10T10:00:00.000Z')).toBe(false);
});
```

**Step 2: Run test to verify it fails**

Run: `pnpm -C apps/backend test src/services/__tests__/meetingAvailabilityService.test.ts`
Expected: FAIL.

**Step 3: Write minimal implementation**

Implement `buildAvailabilitySlots` to:
- build free slots from wake/sleep + daily schedule
- convert busy intervals to millis, expand by buffers
- subtract busy intervals
- generate 15-minute grid slots for each duration
- return `AvailabilitySlot[]`

**Step 4: Run test to verify it passes**

Run: `pnpm -C apps/backend test src/services/__tests__/meetingAvailabilityService.test.ts`
Expected: PASS.

**Step 5: Commit**

```bash
git add apps/backend/src/services/meetingAvailabilityService.ts apps/backend/src/services/__tests__/meetingAvailabilityService.test.ts

git commit -m "feat: add availability slot engine for scheduling links"
```

---

## Task 6: Add scheduling link CRUD endpoints

**Files:**
- Create: `apps/backend/src/services/schedulingLinkService.ts`
- Create: `apps/backend/src/controllers/schedulingLinkController.ts`
- Create: `apps/backend/src/routes/schedulingLinkRoutes.ts`
- Modify: `apps/backend/src/server.ts`
- Modify: `apps/web/src/lib/api.ts`

**Step 1: Write the failing test**

Test slug generation helper (pure function).

```typescript
import { describe, expect, it } from 'vitest';
import { generateLinkSlug } from '../schedulingLinkService';

it('generates URL-safe slugs', () => {
  const slug = generateLinkSlug('Team Intro');
  expect(slug).toMatch(/^[a-z0-9-]+$/);
});
```

**Step 2: Run test to verify it fails**

Run: `pnpm -C apps/backend test src/services/__tests__/schedulingLinkService.test.ts`
Expected: FAIL.

**Step 3: Write minimal implementation**

Implement CRUD in `schedulingLinkService.ts` and controllers for:
- `GET /api/scheduling-links`
- `POST /api/scheduling-links`
- `PATCH /api/scheduling-links/:id`
- `POST /api/scheduling-links/:id/pause`
- `POST /api/scheduling-links/:id/resume`
- `DELETE /api/scheduling-links/:id`

Add API client functions in `apps/web/src/lib/api.ts`.

**Step 4: Run test to verify it passes**

Run: `pnpm -C apps/backend test src/services/__tests__/schedulingLinkService.test.ts`
Expected: PASS.

**Step 5: Commit**

```bash
git add apps/backend/src/services/schedulingLinkService.ts apps/backend/src/controllers/schedulingLinkController.ts apps/backend/src/routes/schedulingLinkRoutes.ts apps/backend/src/server.ts apps/web/src/lib/api.ts

git commit -m "feat: add scheduling link CRUD endpoints"
```

---

## Task 7: Availability endpoint for public booking

**Files:**
- Create: `apps/backend/src/controllers/availabilityController.ts`
- Create: `apps/backend/src/routes/availabilityRoutes.ts`
- Modify: `apps/backend/src/server.ts`

**Step 1: Write the failing test**

Add a controller unit test for invalid query handling.

```typescript
import { describe, expect, it } from 'vitest';
import { validateAvailabilityQuery } from '../availabilityController';

it('rejects missing date range', () => {
  expect(() => validateAvailabilityQuery({} as any)).toThrow(/from/);
});
```

**Step 2: Run test to verify it fails**

Run: `pnpm -C apps/backend test src/controllers/__tests__/availabilityController.test.ts`
Expected: FAIL.

**Step 3: Write minimal implementation**

Implement `GET /api/availability/:slug?from=..&to=..` to:
- load link by slug
- load user prefs (wake/sleep/daily schedule)
- fetch busy events from Google + Apple
- fetch scheduled tasks/habits with blocksAvailability = true
- apply constraints via `buildAvailabilitySlots`
- return slots grouped by duration

**Step 4: Run test to verify it passes**

Run: `pnpm -C apps/backend test src/controllers/__tests__/availabilityController.test.ts`
Expected: PASS.

**Step 5: Commit**

```bash
git add apps/backend/src/controllers/availabilityController.ts apps/backend/src/routes/availabilityRoutes.ts apps/backend/src/server.ts

git commit -m "feat: add public availability endpoint"
```

---

## Task 8: Booking endpoint with concurrency checks

**Files:**
- Create: `apps/backend/src/services/meetingBookingService.ts`
- Create: `apps/backend/src/controllers/bookingController.ts`
- Create: `apps/backend/src/routes/bookingRoutes.ts`
- Modify: `apps/backend/src/server.ts`

**Step 1: Write the failing test**

Test slot conflict detection helper.

```typescript
import { describe, expect, it } from 'vitest';
import { isSlotAvailable } from '../meetingBookingService';

it('rejects overlapping slot with existing meeting', () => {
  const ok = isSlotAvailable(
    { start: '2026-01-10T10:00:00.000Z', end: '2026-01-10T10:30:00.000Z' },
    [{ startDateTime: '2026-01-10T10:15:00.000Z', endDateTime: '2026-01-10T10:45:00.000Z' }]
  );
  expect(ok).toBe(false);
});
```

**Step 2: Run test to verify it fails**

Run: `pnpm -C apps/backend test src/services/__tests__/meetingBookingService.test.ts`
Expected: FAIL.

**Step 3: Write minimal implementation**

Implement `POST /api/book/:slug` to:
- validate duration and slot
- re-check availability via `isSlotAvailable`
- use `prisma.$transaction` to create Meeting + MeetingActionTokens
- create provider events (Google + Apple)
- send confirmation email

**Step 4: Run test to verify it passes**

Run: `pnpm -C apps/backend test src/services/__tests__/meetingBookingService.test.ts`
Expected: PASS.

**Step 5: Commit**

```bash
git add apps/backend/src/services/meetingBookingService.ts apps/backend/src/controllers/bookingController.ts apps/backend/src/routes/bookingRoutes.ts apps/backend/src/server.ts

git commit -m "feat: add booking endpoint with conflict checks"
```

---

## Task 9: Reschedule and cancel endpoints with expiring tokens

**Files:**
- Modify: `apps/backend/src/services/meetingBookingService.ts`
- Modify: `apps/backend/src/controllers/bookingController.ts`
- Create: `apps/backend/src/services/__tests__/meetingTokens.test.ts`

**Step 1: Write the failing test**

Test token expiry validation.

```typescript
import { describe, expect, it } from 'vitest';
import { isTokenValid } from '../meetingBookingService';

it('rejects expired tokens', () => {
  const ok = isTokenValid({ expiresAt: new Date('2000-01-01'), usedAt: null });
  expect(ok).toBe(false);
});
```

**Step 2: Run test to verify it fails**

Run: `pnpm -C apps/backend test src/services/__tests__/meetingTokens.test.ts`
Expected: FAIL.

**Step 3: Write minimal implementation**

Add endpoints:
- `POST /api/book/:slug/reschedule`
- `POST /api/book/:slug/cancel`

Validate tokens, update Meeting status, update provider events (cancelled flag, keep record), and send email.

**Step 4: Run test to verify it passes**

Run: `pnpm -C apps/backend test src/services/__tests__/meetingTokens.test.ts`
Expected: PASS.

**Step 5: Commit**

```bash
git add apps/backend/src/services/meetingBookingService.ts apps/backend/src/controllers/bookingController.ts apps/backend/src/services/__tests__/meetingTokens.test.ts

git commit -m "feat: add reschedule and cancel flows with tokens"
```

---

## Task 10: Google Meet creation support

**Files:**
- Modify: `apps/backend/src/services/googleCalendarService.ts`
- Create: `apps/backend/src/services/__tests__/googleCalendarMeet.test.ts`

**Step 1: Write the failing test**

Test request body builder adds conferenceData when enabled.

```typescript
import { describe, expect, it } from 'vitest';
import { buildGoogleEventRequest } from '../googleCalendarService';

it('adds conference data when meet enabled', () => {
  const req = buildGoogleEventRequest({
    summary: 'Meeting',
    start: '2026-01-10T10:00:00.000Z',
    end: '2026-01-10T10:30:00.000Z',
    enableMeet: true,
  });
  expect(req.conferenceData).toBeTruthy();
});
```

**Step 2: Run test to verify it fails**

Run: `pnpm -C apps/backend test src/services/__tests__/googleCalendarMeet.test.ts`
Expected: FAIL.

**Step 3: Write minimal implementation**

Extract `buildGoogleEventRequest` and update `createEvent` to accept `enableMeet` and set `conferenceDataVersion: 1`.

**Step 4: Run test to verify it passes**

Run: `pnpm -C apps/backend test src/services/__tests__/googleCalendarMeet.test.ts`
Expected: PASS.

**Step 5: Commit**

```bash
git add apps/backend/src/services/googleCalendarService.ts apps/backend/src/services/__tests__/googleCalendarMeet.test.ts

git commit -m "feat: add google meet support for bookings"
```

---

## Task 11: Blocks-availability toggle and transparent events

**Files:**
- Modify: `apps/backend/src/services/scheduleService.ts`
- Modify: `apps/backend/src/services/habitSuggestionService.ts`
- Modify: `apps/backend/src/services/googleCalendarService.ts`
- Modify: `apps/backend/src/services/appleCalendarService.ts`
- Modify: `apps/web/src/components/TaskList.tsx`
- Modify: `apps/web/src/components/EventDetailPopover.tsx`
- Modify: `apps/web/src/lib/api.ts`

**Step 1: Write the failing test**

Test that transparent events are excluded from busy intervals.

```typescript
import { describe, expect, it } from 'vitest';
import { filterBusyEvents } from '../meetingAvailabilityService';

it('ignores transparent events', () => {
  const events = [
    { start: '2026-01-10T10:00:00.000Z', end: '2026-01-10T11:00:00.000Z', transparency: 'transparent' },
    { start: '2026-01-10T12:00:00.000Z', end: '2026-01-10T13:00:00.000Z', transparency: 'opaque' },
  ];
  const busy = filterBusyEvents(events);
  expect(busy).toHaveLength(1);
});
```

**Step 2: Run test to verify it fails**

Run: `pnpm -C apps/backend test src/services/__tests__/meetingAvailabilityService.test.ts`
Expected: FAIL.

**Step 3: Write minimal implementation**

- Add `blocksAvailability` UI toggle in Task edit and Event popover.
- Persist to ScheduledTask/ScheduledHabit.
- For google events, set `transparency: 'transparent'` when blocksAvailability is false.
- For Apple CalDAV, set `TRANSP:TRANSPARENT` in ICS.
- In availability engine, ignore transparent events.

**Step 4: Run test to verify it passes**

Run: `pnpm -C apps/backend test src/services/__tests__/meetingAvailabilityService.test.ts`
Expected: PASS.

**Step 5: Commit**

```bash
git add apps/backend/src/services/scheduleService.ts apps/backend/src/services/habitSuggestionService.ts apps/backend/src/services/googleCalendarService.ts apps/backend/src/services/appleCalendarService.ts apps/web/src/components/TaskList.tsx apps/web/src/components/EventDetailPopover.tsx apps/web/src/lib/api.ts

git commit -m "feat: add blocks-availability toggle and transparent events"
```

---

## Task 12: Settings UI - Scheduling Links and Meeting Manager

**Files:**
- Create: `apps/web/src/components/SchedulingLinksPanel.tsx`
- Create: `apps/web/src/components/MeetingManagerPanel.tsx`
- Modify: `apps/web/src/app/settings/page.tsx`
- Modify: `apps/web/src/lib/api.ts`

**Step 1: Write the failing test**

If no frontend test harness exists, request TDD exception from the user before implementing UI. Otherwise, add a minimal component render test.

**Step 2: Run test to verify it fails**

Run: `pnpm -C apps/web test` (or existing web test command).
Expected: FAIL until test harness is ready.

**Step 3: Write minimal implementation**

- Add Scheduling Links list + create/edit modal.
- Add Meeting Manager list with filters (scheduled/rescheduled/cancelled).
- Use API functions for CRUD and list.

**Step 4: Run test to verify it passes**

Run: `pnpm -C apps/web test`.
Expected: PASS or manual QA if exception approved.

**Step 5: Commit**

```bash
git add apps/web/src/components/SchedulingLinksPanel.tsx apps/web/src/components/MeetingManagerPanel.tsx apps/web/src/app/settings/page.tsx apps/web/src/lib/api.ts

git commit -m "feat: add settings UI for scheduling links and meeting manager"
```

---

## Task 13: Public booking, reschedule, and cancel pages

**Files:**
- Create: `apps/web/src/app/book/[urlSlug]/page.tsx`
- Create: `apps/web/src/app/book/[urlSlug]/reschedule/page.tsx`
- Create: `apps/web/src/app/book/[urlSlug]/cancel/page.tsx`
- Modify: `apps/web/src/lib/api.ts`

**Step 1: Write the failing test**

If no frontend test harness exists, request TDD exception from the user before implementing UI. Otherwise, add a minimal page render test.

**Step 2: Run test to verify it fails**

Run: `pnpm -C apps/web test`.
Expected: FAIL until implemented.

**Step 3: Write minimal implementation**

- Booking page: duration selector, calendar grid, timezone dropdown, form (name/email/notes).
- Reschedule page: validate token, show current time, new slots.
- Cancel page: confirm and submit token.
- Show empty states and errors.

**Step 4: Run test to verify it passes**

Run: `pnpm -C apps/web test`.
Expected: PASS or manual QA if exception approved.

**Step 5: Commit**

```bash
git add apps/web/src/app/book/[urlSlug]/page.tsx apps/web/src/app/book/[urlSlug]/reschedule/page.tsx apps/web/src/app/book/[urlSlug]/cancel/page.tsx apps/web/src/lib/api.ts

git commit -m "feat: add public booking, reschedule, and cancel pages"
```

---

## Task 14: Meeting Manager host actions and emails

**Files:**
- Modify: `apps/backend/src/services/meetingBookingService.ts`
- Modify: `apps/backend/src/controllers/schedulingLinkController.ts`
- Modify: `apps/backend/src/services/gmailService.ts`

**Step 1: Write the failing test**

Test email body builder includes reschedule/cancel links.

```typescript
import { describe, expect, it } from 'vitest';
import { buildMeetingEmail } from '../meetingBookingService';

it('includes reschedule and cancel links', () => {
  const body = buildMeetingEmail({
    inviteeName: 'Taylor',
    rescheduleUrl: 'https://x/reschedule',
    cancelUrl: 'https://x/cancel',
  });
  expect(body).toContain('reschedule');
  expect(body).toContain('cancel');
});
```

**Step 2: Run test to verify it fails**

Run: `pnpm -C apps/backend test src/services/__tests__/meetingEmail.test.ts`
Expected: FAIL.

**Step 3: Write minimal implementation**

Add host actions to generate new reschedule/cancel tokens and send email via Gmail API.

**Step 4: Run test to verify it passes**

Run: `pnpm -C apps/backend test src/services/__tests__/meetingEmail.test.ts`
Expected: PASS.

**Step 5: Commit**

```bash
git add apps/backend/src/services/meetingBookingService.ts apps/backend/src/controllers/schedulingLinkController.ts apps/backend/src/services/gmailService.ts

git commit -m "feat: add meeting manager host actions and emails"
```

---

## Task 15: Manual QA checklist

**Files:**
- Modify: `docs/SPRINT_15_MEETING_SCHEDULING_PLAN.md`

**Step 1: Write the failing test**

Not applicable; document manual QA steps and expected results.

**Step 2: Run test to verify it fails**

Not applicable.

**Step 3: Write minimal implementation**

Add a QA checklist:
- booking works for multiple durations
- timezone dropdown changes slots
- buffers and cap enforced
- reschedule/cancel tokens expire after 30 days
- Google Meet link appears in Google event
- Apple events created and cancelled via CalDAV
- transparent TimeFlow events do not block availability

**Step 4: Run test to verify it passes**

Not applicable.

**Step 5: Commit**

```bash
git add docs/SPRINT_15_MEETING_SCHEDULING_PLAN.md

git commit -m "docs: add sprint 15 QA checklist"
```

---

## Completion Checklist

- [ ] Shared types added and exported
- [ ] Prisma models + migration added
- [ ] iCloud CalDAV discovery + event CRUD
- [ ] Availability engine with buffers/horizon/cap
- [ ] Scheduling link CRUD endpoints
- [ ] Public booking, reschedule, cancel endpoints
- [ ] Google Meet enabled by default for bookings
- [ ] Blocks-availability toggle wired and transparent events respected
- [ ] Settings UI + Meeting Manager
- [ ] Public booking pages complete
- [ ] QA checklist documented

---

## Execution Handoff

Plan complete and saved to `docs/plans/2025-12-26-sprint-15-meeting-scheduling-implementation-plan.md`. Two execution options:

1. Subagent-Driven (this session) - I dispatch fresh subagent per task, review between tasks, fast iteration
2. Parallel Session (separate) - Open new session with executing-plans, batch execution with checkpoints

Which approach?
