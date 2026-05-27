# Multi-Account Calendar Hub — Sprint 1 Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Let Google-login users connect iCloud (and keep Google), toggle calendars like Google Calendar, merge events on the calendar page, and use all visible calendars for smart-schedule busy time—without breaking existing Google-only flows.

**Architecture:** Introduce `ConnectedAccount` + `ConnectedCalendar` Prisma models; migrate `User.google*` and `AppleCalendarAccount` into accounts; add `accountTokenResolver` for dual-read; new `mergedCalendarService` fans out to Google/Apple readers; web Integrations Hub + calendar sidebar persist visibility.

**Tech Stack:** Fastify, Prisma, PostgreSQL, googleapis, CalDAV (`appleCalendarService`), Next.js 14, `@timeflow/shared`, Vitest/Jest e2e.

**Design doc:** `docs/plans/2026-05-25-multi-account-calendar-hub-design.md`  
**Sprint 2 (Apple sign-in):** See [Sprint 2 outline](#sprint-2-outline-sign-in-with-apple--separate-plan) at end of this doc (full plan TBD after Sprint 1 ships).

---

## What we need from you (before / during sprint)

| Item | When | Why |
|------|------|-----|
| **iCloud test account** + app-specific password | Sprint 1 Week 1 | CalDAV connect QA (store in local `.env` only; never commit) |
| **Second Google account** (optional) | Sprint 1b / backlog | Dual-Gmail is out of scope for Sprint 1 MVP |
| **Confirm production `ENCRYPTION_KEY`** is stable | Before merge to `main` | Re-encrypting tokens breaks if key changes |
| **Apple Developer account** (Services ID, key, team ID) | Before Sprint 2 | Sign in with Apple — not needed for Sprint 1 |
| **5–10 min manual QA** after production deploy | Each phase gate | Regression checklist below |

You do **not** need to change Vercel/Render config for Sprint 1 unless new env vars are added (none required beyond existing `ENCRYPTION_KEY`, Google OAuth).

---

## Database migrations (production deploy only)

**Do not run `prisma migrate dev` manually for this sprint** unless you are debugging locally with a personal database.

TimeFlow already applies migrations on every backend deploy:

- `apps/backend/start.sh` runs `prisma migrate deploy` (uses `DIRECT_URL` when set for Supabase DDL).
- Merging migration files to `main` → Render deploy → schema updates automatically.

**Workflow for this feature:**

1. Commit migration SQL under `apps/backend/prisma/migrations/<timestamp>_*/migration.sql`.
2. Implement code with **dual-read** (`ConnectedAccount` + legacy `User.google*` / `AppleCalendarAccount`) so production stays safe before and after deploy.
3. Merge to `main` when ready; verify Render logs show `✅ Migrations complete!`.
4. QA on production (or preview if you use a preview env with the same migrate-on-deploy pattern).

**Data backfill** (copying existing Google/Apple rows into `ConnectedAccount`) must ship in the same deploy window—either:

- SQL in the migration file (`INSERT … SELECT`), and/or
- **Lazy backfill** on login / first calendar fetch (recommended fallback if API seeding is fragile).

No separate manual production migration step.

---

## Phase map

| Phase | Gate |
|-------|------|
| **0** | Schema + migration + backfill; Google login still works |
| **1** | Account APIs + iCloud connect |
| **2** | Merged events + schedule busy time |
| **3** | Web UI (Integrations + sidebar) |
| **4** | Scheduling links Apple picker + polish |
| **5** | Regression + ADR |

Execute phases in order. Do not start UI until Phase 2 API returns merged events in tests.

---

## Task 0: ADR draft (30 min)

**Files:**
- Create: `timeflow/ARCHITECTURE_DECISIONS.md` (append section)

**Content:** ADR-00X — Connected Account Hub  
- `ConnectedAccount` providers: `google`, `apple_caldav`  
- Tokens on account, not `User`  
- Sprint 1 login remains Google-only  
- `defaultCalendarId` on `User` → later `defaultWriteConnectedCalendarId` (nullable FK)  
- Apple linking policy: “deferred to Sprint 2”

**Commit:** `docs: ADR connected account hub (sprint 1)`

---

## Task 1: Prisma schema — `ConnectedAccount` + `ConnectedCalendar`

**Files:**
- Modify: `timeflow/apps/backend/prisma/schema.prisma`

**Step 1: Add enums and models**

```prisma
enum ConnectedAccountProvider {
  google
  apple_caldav
}

model ConnectedAccount {
  id                    String                   @id @default(cuid())
  userId                String
  provider              ConnectedAccountProvider
  providerAccountId     String                   // googleId or icloud email
  email                 String
  displayName           String?
  isPrimary             Boolean                  @default(false)

  // Google OAuth (encrypted refresh; access in plaintext with expiry)
  googleAccessToken         String?
  googleAccessTokenExpiry   DateTime?
  googleRefreshToken        String?                // encrypted via crypto.ts

  // Apple CalDAV
  caldavBaseUrl             String?
  caldavPrincipalUrl        String?
  caldavCalendarHomeUrl     String?
  caldavAppPasswordEncrypted String?

  // Sync telemetry
  lastSuccessAt           DateTime?
  lastErrorAt             DateTime?
  lastErrorCode           String?
  lastErrorMessage        String?                // sanitized, no secrets

  createdAt               DateTime                 @default(now())
  updatedAt               DateTime                 @updatedAt

  user                    User                     @relation(fields: [userId], references: [id], onDelete: Cascade)
  calendars               ConnectedCalendar[]

  @@unique([userId, provider, providerAccountId])
  @@index([userId])
}

model ConnectedCalendar {
  id                  String            @id @default(cuid())
  connectedAccountId  String
  externalCalendarId  String            // Google calendar id or CalDAV href
  name                String
  color               String?           // hex, e.g. #3b82f6
  visible             Boolean           @default(true)
  useForAvailability  Boolean           @default(true)
  isPrimary           Boolean           @default(false) // write target candidate
  createdAt           DateTime          @default(now())
  updatedAt           DateTime          @updatedAt

  account             ConnectedAccount  @relation(fields: [connectedAccountId], references: [id], onDelete: Cascade)

  @@unique([connectedAccountId, externalCalendarId])
  @@index([connectedAccountId])
}
```

**Step 2: Add relation on `User`**

```prisma
connectedAccounts ConnectedAccount[]
```

**Step 3: Keep `User.google*` and `AppleCalendarAccount` for now** (removed in Task 8 after dual-read works).

**Step 4: Commit migration folder** (deploy applies it; do not require local `migrate dev`)

- Folder: `prisma/migrations/20260525120000_add_connected_account_hub/migration.sql`
- Local codegen only: `pnpm prisma generate` (no DB required)

**Expected:** On next production deploy, `migrate deploy` creates tables; no data loss.

**Commit:** `feat(db): connected account and calendar models`

---

## Task 2: Backfill (deploy-safe — no manual prod script)

**Preferred:** Lazy backfill in `accountTokenService` / `connectedAccountService`:

- On first authenticated request after deploy, if user has no `ConnectedAccount` but has `User.google*` or `AppleCalendarAccount`, create rows idempotently.
- Calendar list seeding: on first `GET /connected-accounts` or first calendar fetch, sync calendars from provider if account has zero `ConnectedCalendar` rows.

**Optional:** SQL backfill in a second migration for Google token **columns only** (no Google API calls in SQL):

```sql
INSERT INTO "ConnectedAccount" (...)
SELECT ... FROM "User" WHERE "googleId" IS NOT NULL
ON CONFLICT DO NOTHING;
```

Apple calendar rows may still need lazy CalDAV list on first connect/sync.

**Tests:**
- Create: `timeflow/apps/backend/src/services/__tests__/connectedAccountBackfill.test.ts` (unit test lazy backfill with mocked prisma)

**Commit:** `feat: lazy backfill connected accounts on first use`

---

## Task 3: `accountTokenService` — dual-read resolver

**Files:**
- Create: `timeflow/apps/backend/src/services/accountTokenService.ts`
- Create: `timeflow/apps/backend/src/services/__tests__/accountTokenService.test.ts`

**API:**

```typescript
export type GoogleTokenContext = {
  connectedAccountId: string;
  accessToken: string;
  refreshToken: string | null;
  accessTokenExpiry: Date | null;
};

export async function getPrimaryGoogleAccount(userId: string): Promise<ConnectedAccount | null>;
export async function getGoogleTokenContext(userId: string, connectedAccountId?: string): Promise<GoogleTokenContext>;
export async function getAppleCaldavContext(userId: string, connectedAccountId: string): Promise<{ email; password; baseUrl; calendarHomeUrl }>;
```

**Dual-read rule:** If `ConnectedAccount` exists for primary Google → use it; else fall back to `User.google*`.

**Step 1: Failing unit test** — user with only `User.google*` still resolves tokens.

**Step 2: Implement minimal resolver.**

**Step 3: Run tests**

```bash
cd timeflow/apps/backend
pnpm test src/services/__tests__/accountTokenService.test.ts
```

**Commit:** `feat: account token resolver with user fallback`

---

## Task 4: Refactor `googleCalendarService` to use resolver

**Files:**
- Modify: `timeflow/apps/backend/src/services/googleCalendarService.ts` (all `prisma.user.findUnique` token reads)

**Pattern:** Replace direct `User` token fetch with `getGoogleTokenContext(userId, connectedAccountId?)`. On refresh, write tokens back to `ConnectedAccount` **and** `User` (dual-write) until Task 8.

**Tests:**
- Modify: `timeflow/apps/backend/src/services/__tests__/googleCalendarCancel.test.ts` (mocks)
- Run existing calendar-related tests:

```bash
cd timeflow/apps/backend
pnpm test src/services/__tests__/googleCalendar
```

**Commit:** `refactor: google calendar service uses connected account tokens`

---

## Task 5: Refactor `appleCalendarService` to use `ConnectedAccount`

**Files:**
- Modify: `timeflow/apps/backend/src/services/appleCalendarService.ts`

**Changes:**
- `discoverAccount` → upsert `ConnectedAccount` (remove `@@unique([userId])` behavior by allowing multiple; for MVP keep one icloud per email via `@@unique([userId, provider, providerAccountId])`).
- `getEvents(userId, calendarId, ...)` → resolve account by `ConnectedCalendar.externalCalendarId` or pass `connectedAccountId`.
- Deprecate direct `prisma.appleCalendarAccount` reads; dual-read `AppleCalendarAccount` if no `ConnectedAccount` yet.

**Tests:**
- Extend: `timeflow/apps/backend/src/services/__tests__/appleCalendarService.test.ts`

**Commit:** `refactor: apple caldav service uses connected accounts`

---

## Task 6: Account routes + controller

**Files:**
- Create: `timeflow/apps/backend/src/routes/connectedAccountRoutes.ts`
- Create: `timeflow/apps/backend/src/controllers/connectedAccountController.ts`
- Create: `timeflow/apps/backend/src/services/connectedAccountService.ts`
- Modify: `timeflow/apps/backend/src/server.ts` — `registerConnectedAccountRoutes`

**Endpoints:**

| Method | Path | Purpose |
|--------|------|---------|
| GET | `/api/connected-accounts` | List accounts + nested calendars |
| POST | `/api/connected-accounts/icloud` | Body: `{ email, appPassword }` → discover + list + save |
| POST | `/api/connected-accounts/:id/test` | Health check |
| DELETE | `/api/connected-accounts/:id` | Disconnect (delete account + calendars) |
| PATCH | `/api/connected-calendars/:id` | `{ visible?, color?, useForAvailability? }` |
| POST | `/api/connected-accounts/:id/sync-calendars` | Re-fetch calendar list from provider |

**Zod schemas** in controller; `requireAuth` on all.

**Step 1: E2E test** — `connectedAccountRoutes.e2e.test.ts`  
- Authenticated user connects icloud (mock CalDAV with `vi.mock` fetch).  
- GET returns calendars.  
- PATCH toggles `visible`.

**Step 2: Implement routes.**

**Step 3: Run**

```bash
cd timeflow/apps/backend
pnpm test src/__tests__/connectedAccountRoutes.e2e.test.ts
```

**Commit:** `feat(api): connected account and icloud connect routes`

---

## Task 7: `mergedCalendarService`

**Files:**
- Create: `timeflow/apps/backend/src/services/mergedCalendarService.ts`
- Create: `timeflow/apps/backend/src/services/__tests__/mergedCalendarService.test.ts`

**API:**

```typescript
export async function getMergedExternalEvents(
  userId: string,
  from: string,
  to: string,
  options?: { calendarIds?: string[] } // ConnectedCalendar.id; default: visible=true
): Promise<CalendarEvent[]>;
```

**Logic:**

1. Load `ConnectedCalendar` where `visible === true` (or filter by ids).
2. Group by `ConnectedAccount.provider`.
3. `Promise.all` fetch:
   - Google: `googleCalendarService.getEvents` per calendar
   - Apple: `appleCalendarService.getEvents`
4. Map each event with metadata:

```typescript
{
  ...event,
  sourceType: 'external',
  connectedAccountId,
  connectedCalendarId,
  calendarColor: calendar.color,
  provider: 'google' | 'apple',
}
```

5. Sort by `start`. Dedupe: same `start`+`end`+`summary` → keep one, `console.debug` duplicate.

**Commit:** `feat: merged calendar event service`

---

## Task 8: Wire `calendarController` + `scheduleService`

**Files:**
- Modify: `timeflow/apps/backend/src/controllers/calendarController.ts` — `getEvents` uses `mergedCalendarService` instead of single `defaultCalendarId` fetch
- Modify: `timeflow/apps/backend/src/services/scheduleService.ts` — busy intervals from `getMergedExternalEvents` (availability calendars: `useForAvailability && visible`)
- Modify: `timeflow/apps/backend/src/controllers/calendarController.ts` — `listCalendars` returns all calendars from all accounts with `connectedAccountId`, `connectedCalendarId`, `color`, `visible`

**Writes unchanged:** `createEvent` / habit flows still use `User.defaultCalendarId` → resolve to primary Google `ConnectedCalendar`.

**Tests:**
- Modify or create: `calendarController.e2e.test.ts` with two mocked provider responses.

```bash
cd timeflow/apps/backend
pnpm test src/__tests__/calendar
```

**Commit:** `feat: calendar and schedule use merged connected calendars`

---

## Task 9: Shared types + API client

**Files:**
- Modify: `timeflow/packages/shared/src/types/calendar.ts`

```typescript
export interface CalendarEvent {
  // ...existing
  connectedAccountId?: string;
  connectedCalendarId?: string;
  calendarColor?: string;
  provider?: 'google' | 'apple';
}

export interface ConnectedCalendarDto {
  id: string;
  connectedAccountId: string;
  externalCalendarId: string;
  name: string;
  color: string | null;
  visible: boolean;
  useForAvailability: boolean;
  isPrimary: boolean;
}

export interface ConnectedAccountDto {
  id: string;
  provider: 'google' | 'apple_caldav';
  email: string;
  displayName: string | null;
  isPrimary: boolean;
  lastSuccessAt: string | null;
  lastErrorAt: string | null;
  lastErrorMessage: string | null;
  calendars: ConnectedCalendarDto[];
}
```

- Modify: `timeflow/apps/web/src/lib/api.ts` — add `getConnectedAccounts`, `connectIcloudAccount`, `patchConnectedCalendar`, `deleteConnectedAccount`, `testConnectedAccount`

**Build shared package:**

```bash
cd timeflow/packages/shared && pnpm build
```

**Commit:** `feat(shared): connected account DTOs and api helpers`

---

## Task 10: Integrations Hub (Settings)

**Files:**
- Create: `timeflow/apps/web/src/components/integrations/IntegrationsHub.tsx`
- Create: `timeflow/apps/web/src/components/integrations/ConnectIcloudModal.tsx`
- Modify: `timeflow/apps/web/src/app/settings/page.tsx` — new section “Calendars & accounts”

**ConnectIcloudModal UX:**
1. Email + app-specific password
2. Link: Apple help — generate app password
3. Submit → `connectIcloudAccount` → show calendar list on success
4. Error states: invalid password, 2FA not enabled, network

**IntegrationsHub:**
- Card per `ConnectedAccount`: email, provider badge, last sync/error, Test, Disconnect
- “Connect iCloud calendar” button

**Commit:** `feat(web): integrations hub with icloud connect`

---

## Task 11: Calendar sidebar (Google-style toggles)

**Files:**
- Create: `timeflow/apps/web/src/components/calendar/CalendarAccountsSidebar.tsx`
- Modify: `timeflow/apps/web/src/app/calendar/page.tsx` — layout: sidebar + existing `CalendarView`

**Behavior:**
- On mount: `getConnectedAccounts()`
- Checkbox → `patchConnectedCalendar({ visible })` → refetch `getCalendarEvents`
- Color dot from `calendar.color` (fallback palette by index)
- Group headers: account email
- Collapse/expand per account (local state)

**Event styling:**
- Modify: `timeflow/apps/web/src/components/CalendarView.tsx` (or event prop mapper) — border/background tint using `calendarColor` for `sourceType === 'external'`

**Commit:** `feat(web): calendar sidebar visibility toggles`

---

## Task 12: Scheduling links — Apple calendar picker

**Files:**
- Modify: `timeflow/apps/web/src/components/CreateLinkModal.tsx`
- Modify: `timeflow/apps/web/src/components/SchedulingLinksPanel.tsx` (if calendar hardcoded)

**Logic:**
- If `calendarProvider === 'apple'`: require `getConnectedAccounts()` with `apple_caldav`; populate dropdown from that account’s calendars (`externalCalendarId` as value).
- If no Apple account: CTA “Connect iCloud in Settings” with link.

**Commit:** `fix(web): scheduling links apple calendar picker`

---

## Task 13: Copy + contact page

**Files:**
- Modify: `timeflow/apps/web/src/app/contact/page.tsx` — remove “Apple coming soon” if inaccurate
- Optional: `timeflow/apps/web/src/app/settings/page.tsx` — default write calendar still from Google list

**Commit:** `docs(web): update calendar integration copy`

---

## Task 14: Remove dual-write / legacy tables (deploy gate 2 only)

**Only after staging verification:**

**Files:**
- Modify: `schema.prisma` — remove `User.google*`, drop `AppleCalendarAccount` model
- Migration: drop columns/table
- Remove fallback reads in `accountTokenService`

**Do not run in same PR as initial launch** — use second deploy.

**Commit:** `chore(db): remove legacy user google and apple calendar account columns`

---

## Task 15: Regression pass

**Automated:**

```bash
cd timeflow
pnpm test
```

**Manual checklist** (staging, your iCloud test account):

- [ ] Login with Google → calendar loads
- [ ] Connect iCloud → events appear
- [ ] Uncheck one iCloud calendar → events hide
- [ ] Smart schedule → respects iCloud busy time when visible
- [ ] Disconnect iCloud → events gone; schedule ignores
- [ ] Gmail inbox still works
- [ ] Create scheduling link with Apple provider + real calendar id
- [ ] Book meeting on Apple link (existing flow)

---

## File touch summary

| Area | Primary files |
|------|----------------|
| DB | `apps/backend/prisma/schema.prisma`, migrations |
| Token resolver | `services/accountTokenService.ts` |
| Google | `services/googleCalendarService.ts`, `services/authService.ts`, `services/gmailService.ts` (grep `googleRefreshToken`) |
| Apple | `services/appleCalendarService.ts` |
| Merge | `services/mergedCalendarService.ts` |
| API | `routes/connectedAccountRoutes.ts`, `controllers/connectedAccountController.ts` |
| Calendar API | `controllers/calendarController.ts`, `services/scheduleService.ts` |
| Shared | `packages/shared/src/types/calendar.ts` |
| Web | `lib/api.ts`, `app/settings/page.tsx`, `app/calendar/page.tsx`, `components/calendar/CalendarAccountsSidebar.tsx`, `components/integrations/*` |

**Also grep before Task 14:**

```bash
rg "googleRefreshToken|googleAccessToken|AppleCalendarAccount" timeflow/apps/backend/src
```

Every hit must use `accountTokenService` or `ConnectedAccount`.

---

## Sprint 2 outline (Sign in with Apple — separate plan)

**Prerequisite:** Sprint 1 deployed and stable.

| Task | Summary |
|------|---------|
| S2-1 | Apple Developer: Services ID, key, domain verification |
| S2-2 | `POST /api/auth/apple/start`, callback, JWT same shape as Google |
| S2-3 | `User.appleId` + linking policy ADR |
| S2-4 | Login page: Google + Apple buttons |
| S2-5 | Post-Apple onboarding → Integrations iCloud connect |
| S2-6 | Mobile Expo Apple auth |
| S2-7 | Auth matrix QA |

**You provide for Sprint 2:** Apple Developer Program access, Services ID redirect URLs for `APP_BASE_URL`, decision on auto-merge vs explicit link when emails match.

---

## Execution options

**Plan saved to:** `docs/plans/2026-05-25-multi-account-calendar-hub-implementation-plan.md`

1. **Subagent-driven (this session)** — implement task-by-task with review between tasks.  
2. **Parallel session** — new chat + `executing-plans` in a git worktree (`using-git-worktrees`).

Reply with **1** or **2** when ready to start coding.
