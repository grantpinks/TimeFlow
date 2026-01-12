# Sprint 17 Habits Coach Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Ship Sprint 17’s Habits “Coach + Next Actions” experience, including habit completion tracking, insights dashboard, streak-at-risk UX + reminders, and privacy-safe analytics.

**Architecture:** Extend existing habit scheduling data (`Habit`, `ScheduledHabit`) with completion tracking; add backend aggregation endpoints for insights; update `/habits` to be an Insights-first surface with a Coach Card that drives actions (rescue block, adjust window, snooze/skip w/ preset reasons) with undo/dismiss + noise caps.

**Tech Stack:** Fastify + Prisma + Postgres, Next.js (app router), Tailwind, `@timeflow/scheduling`, Vitest.

---

## Timeline & Dependencies (7-day sprint)

**Day 1-2: Data Foundation (16-18h)**
- Task 1: Completion tracking model + endpoints (8-10h)
  - Critical path: Must complete before all other tasks

**Day 2-3: UI Integration (8-10h)**
- Task 2: Calendar popover actions (6-8h)
  - Depends on: Task 1 complete
  - Can start: Once Task 1 Step 4 complete (endpoints ready)

**Day 3-4: Insights Backend (12-14h)**
- Task 3: Insights dashboard backend + frontend (10-12h)
  - Depends on: Task 1 complete
  - Can parallelize: Frontend UI while backend endpoints build
- Task 3 Step 4: Comprehensive testing (2-4h)
  - Depends on: Task 3 Step 2 complete

**Day 4-5: Recommendations & Coach (10-14h)**
- Task 4: Recommendations service (4-6h)
  - Depends on: Task 3 Step 2 complete (insights service)
  - Can parallelize: With Task 5 Step 1
- Task 5: Coach card + actions (6-8h)
  - Depends on: Task 4 complete for recommendation integration
  - Critical: A/B/D actions must work end-to-end

**Day 5-6: Retention Features (10-12h)**
- Task 6: Streak-at-risk UX (3-4h)
  - Depends on: Task 3 complete (streak calculation)
- Task 7: In-app reminders (4-5h)
  - Depends on: Task 6 complete
- Task 8: Trust + edge cases (4-6h)
  - Can parallelize: With Tasks 6-7

**Day 6-7: Polish & Verification (6-8h)**
- Task 9: Analytics instrumentation (3-4h)
  - Can parallelize: Throughout sprint as features complete
- Final verification: Automated + manual QA (4h)

**Critical Path:**
Task 1 → Task 2 → Task 3 → Task 5 (must be sequential)

**Parallel Work Opportunities:**
- Task 4, 6, 7, 8, 9 can start after Task 3 Step 2 complete
- Frontend work can often run parallel to backend implementation

---

## Context (existing code you will extend)

**Backend:**
- Habits CRUD: `timeflow/apps/backend/src/routes/habitRoutes.ts`, `.../controllers/habitController.ts`, `.../services/habitService.ts`
- Habit suggestions + scheduling to Google Calendar: `timeflow/apps/backend/src/services/habitSuggestionService.ts` (creates `ScheduledHabit`)
- Prisma models: `timeflow/apps/backend/prisma/schema.prisma` includes `Habit`, `ScheduledHabit`

**Web:**
- Habits page today is CRUD-only: `timeflow/apps/web/src/app/habits/page.tsx`
- Habits hook: `timeflow/apps/web/src/hooks/useHabits.ts`
- API client: `timeflow/apps/web/src/lib/api.ts` already has `/habits` CRUD + suggestions accept/reject.

**Roadmap tasks to cover (must include):**
- 17.1–17.9 in `timeflow/ARCHITECT_ROADMAP_SPRINT1-17.md`

---

## Task 1: Add habit completion tracking data model (Roadmap 17.1)

**Files:**
- Modify: `timeflow/apps/backend/prisma/schema.prisma`
- Create migration via Prisma
- Create: `timeflow/packages/shared/src/types/habitCompletion.ts`
- Modify: `timeflow/packages/shared/src/index.ts`
- Modify/create: `timeflow/apps/backend/src/services/habitCompletionService.ts`
- Modify: `timeflow/apps/backend/src/routes/habitRoutes.ts`
- Modify: `timeflow/apps/backend/src/controllers/habitController.ts`
- Test: `timeflow/apps/backend/src/services/__tests__/habitCompletionService.test.ts`

**Step 0: Add shared types**

Create `timeflow/packages/shared/src/types/habitCompletion.ts`:
```typescript
export enum HabitSkipReason {
  NO_TIME = 'NO_TIME',                    // "No time / too busy"
  LOW_ENERGY = 'LOW_ENERGY',              // "Low energy / not feeling well"
  SCHEDULE_CHANGED = 'SCHEDULE_CHANGED',  // "Schedule changed unexpectedly"
  TRAVEL = 'TRAVEL',                      // "Travel / away from routine"
  FORGOT = 'FORGOT',                      // "Forgot"
  NOT_PRIORITY = 'NOT_PRIORITY',          // "Not a priority today"
  BLOCKED = 'BLOCKED',                    // "Blocked by something"
  INJURY_RECOVERY = 'INJURY_RECOVERY',    // "Injury / recovery"
  OTHER = 'OTHER',                        // "Other"
}

export interface HabitCompletionRequest {
  scheduledHabitId: string;
}

export interface HabitCompletionResponse {
  success: boolean;
  completion: {
    id: string;
    status: 'completed' | 'skipped';
    completedAt: string;
  };
}

export interface HabitSkipRequest {
  scheduledHabitId: string;
  reasonCode: HabitSkipReason;
}

export interface HabitUndoRequest {
  scheduledHabitId: string;
}
```

Update `timeflow/packages/shared/src/index.ts` to export these types.

**Step 1: Write failing test for completion upsert**

Create `habitCompletionService.test.ts` with a test that:
- creates a user + habit + scheduledHabit
- marks scheduledHabit complete
- un-completes it
- asserts DB state changes as expected

Run:
```bash
cd timeflow/apps/backend
pnpm test -- --run habitCompletionService
```
Expected: FAIL (service/model missing).

**Step 2: Add Prisma models**

In `schema.prisma`, add:

```prisma
model HabitCompletion {
  id               String         @id @default(cuid())
  userId           String
  habitId          String
  scheduledHabitId String         @unique
  status           String         // 'completed' | 'skipped'
  reasonCode       String?        // Required if skipped; from HabitSkipReason enum
  completedAt      DateTime       @default(now())
  createdAt        DateTime       @default(now())
  updatedAt        DateTime       @updatedAt

  habit            Habit          @relation(fields: [habitId], references: [id], onDelete: Cascade)
  scheduledHabit   ScheduledHabit @relation(fields: [scheduledHabitId], references: [id], onDelete: Cascade)
  user             User           @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@index([userId, habitId])
  @@index([scheduledHabitId])
}

model HabitActionHistory {
  id            String   @id @default(cuid())
  userId        String
  actionType    String   // 'complete' | 'skip' | 'reschedule_block' | 'adjust_window'
  entityId      String   // scheduledHabitId or habitId
  previousState Json?    // For undo
  newState      Json
  createdAt     DateTime @default(now())
  expiresAt     DateTime // Undo available for 24h

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@index([userId, createdAt])
  @@index([expiresAt])
}
```

Also update `User` model to add:
```prisma
model User {
  // ... existing fields
  habitsCoachState      Json?              // { dismissedSuggestions: [{type, habitId, dismissedAt, snoozedUntil}], lastPrimarySuggestion: {...} }
  habitCompletions      HabitCompletion[]
  habitActionHistory    HabitActionHistory[]
}
```

And update `Habit` and `ScheduledHabit` models:
```prisma
model Habit {
  // ... existing fields
  completions HabitCompletion[]
}

model ScheduledHabit {
  // ... existing fields
  completion HabitCompletion?
}
```

**Rationale:**
- `HabitCompletion` ties to `ScheduledHabit` (calendar-first UX)
- `@unique` on scheduledHabitId ensures one completion per scheduled instance
- `HabitActionHistory` enables undo with 24h expiry
- `User.habitsCoachState` JSON stores dismiss/snooze state (MVP approach; can migrate to table in V2)

Run migration:
```bash
cd timeflow/apps/backend
pnpm prisma migrate dev -n "habit-completion-tracking"
pnpm prisma generate
```

**Step 3: Implement minimal service**

Create `habitCompletionService.ts` with functions:
- `markScheduledHabitComplete(userId, scheduledHabitId)`
  - If existing skip → overwrite to completed
  - Create HabitActionHistory for undo (24h expiry)
  - Idempotent: marking complete twice = no-op (return existing)
- `undoScheduledHabitComplete(userId, scheduledHabitId)`
  - Check HabitActionHistory for undo window (< 24h)
  - Restore previousState from history
  - Delete HabitCompletion record
- `skipScheduledHabit(userId, scheduledHabitId, reasonCode)`
  - Validate reasonCode is from HabitSkipReason enum
  - If existing completion → overwrite to skipped
  - Create HabitActionHistory for undo (24h expiry)

**Edge case handling:**
- ScheduledHabit deleted but completion exists → onDelete: Cascade handles cleanup
- Completion action after undo window expired → return error with clear message
- Race conditions → use Prisma transactions for atomicity

**Step 4: Expose endpoints**

Add endpoints to `registerHabitRoutes`:
- `POST /habits/instances/:scheduledHabitId/complete`
- `POST /habits/instances/:scheduledHabitId/undo`
- `POST /habits/instances/:scheduledHabitId/skip` (body: `{ reasonCode }`)

Controller should validate:
- scheduledHabit belongs to user
- skip reasonCode is valid HabitSkipReason enum value (NO_TIME, LOW_ENERGY, SCHEDULE_CHANGED, TRAVEL, FORGOT, NOT_PRIORITY, BLOCKED, INJURY_RECOVERY, OTHER)

**Step 5: Run tests**

```bash
cd timeflow/apps/backend
pnpm test
```
Expected: PASS.

**Step 6: Commit**

```bash
git add timeflow/apps/backend/prisma/schema.prisma timeflow/apps/backend/prisma/migrations timeflow/apps/backend/src timeflow/packages/shared
git commit -m "feat(habits): add completion tracking for scheduled habits"
```

**Rollback plan:**
If deployment fails, rollback migration:
```bash
cd timeflow/apps/backend
pnpm prisma migrate resolve --rolled-back habit-completion-tracking
```
Note: Safe if no production data yet. After production launch, coordinate data migration carefully.

---

## Task 2: Calendar popover actions for habits (Roadmap 17.2)

**Goal:** From the calendar event popover, user can complete/undo/skip a habit instance with streak context.

**Files:**
- Locate/modify popover component used by calendar: `timeflow/apps/web/src/app/calendar/page.tsx` and associated components
- Add API methods: `timeflow/apps/web/src/lib/api.ts`
- Add UI + state: calendar popover component file(s)

**Step 1: Find popover component**

Search for the event detail popover and where habit events are rendered. Confirm how `ScheduledHabit` events are identified (title prefix `[Habit]` and/or metadata).

**Step 2: Write API client calls**

In `api.ts`, add:
- `completeHabitInstance(scheduledHabitId)` → POST /habits/instances/:id/complete
- `undoHabitInstance(scheduledHabitId)` → POST /habits/instances/:id/undo
- `skipHabitInstance(scheduledHabitId, reasonCode)` → POST /habits/instances/:id/skip

Also add (for later tasks):
- `getHabitInsights(days: 14 | 28)` → GET /api/habits/insights?days=X
- `scheduleRescueBlock(habitId, windowStart)` → POST /habits/:id/rescue-block
- `adjustHabitWindow(habitId, newPreferredTime)` → PUT /habits/:id/window
- `dismissCoachSuggestion(suggestionId)` → POST /habits/coach/dismiss
- `snoozeCoachSuggestion(suggestionId, snoozedUntil)` → POST /habits/coach/snooze

**Step 3: Implement popover UI**

Add to calendar event popover:
- Complete / Undo button
- "Skip" button → opens preset reasons dropdown:
  - No time / too busy
  - Low energy / not feeling well
  - Schedule changed unexpectedly
  - Travel / away from routine
  - Forgot
  - Not a priority today
  - Blocked by something
  - Injury / recovery
  - Other
- Show streak context (current streak + "at risk" if relevant; stub at first, then wire to insights endpoint in Task 4)

**State management patterns:**
- Optimistic UI for complete/undo (instant toggle, revert on error)
- Loading state for skip (shows preset reasons after API confirms)
- Error toast for all failures with retry CTA
- Refetch insights after any completion action (or update locally via optimistic cache)

**Step 4: QA**

Manual QA:
- complete toggles immediately (optimistic if safe)
- undo works
- skip writes reason code
- errors show friendly text

Commit with message:
```bash
git commit -m "feat(calendar): complete/undo/skip habit instances from popover"
```

---

## Task 3: Habits Insights dashboard (Roadmap 17.3)

**Goal:** `/habits` becomes insights-first (not CRUD-first). Add adherence + minutes/week + streak displays.

**Files:**
- Modify: `timeflow/apps/web/src/app/habits/page.tsx`
- Create: `timeflow/apps/web/src/components/habits/*` (Insights, charts, CoachCard)
- Add API endpoint: `timeflow/apps/backend/src/routes/habitRoutes.ts`
- Add controller/service: `timeflow/apps/backend/src/controllers/habitController.ts`, `.../services/habitInsightsService.ts`

**Step 1: Define backend response shape**

Create a shared response type in `@timeflow/shared`:
- Create: `timeflow/packages/shared/src/types/habitInsights.ts` exporting:
  - `HabitInsightsSummary`
  - `PerHabitInsights` (adherence series, streaks, best window)
  - `BestWindow` (dayOfWeek, timeSlot, completionRate)
  - `StreakMetrics` (current, best, lastCompleted, atRisk)

Update exports in `timeflow/packages/shared/src/index.ts`.

**Step 2: Add backend endpoint**

Add:
- `GET /api/habits/insights?days=14|28`

Create `habitInsightsService.ts` to compute:
- Scheduled habit instances from `ScheduledHabit` in date range
- Completion states from `HabitCompletion` table
- Adherence = completed / scheduled per habit
- Minutes/week scheduled vs completed
- **Best window calculation (rules-based MVP):**
  1. Group completions by day-of-week + hour bucket (e.g., "Mon 9am-10am")
  2. Calculate completion rate per bucket: completed / scheduled
  3. "Best window" = bucket with highest completion rate (min 3 instances for significance)
  4. If no data: use preferredTimeOfDay from Habit definition
- **Streak calculation:**
  - Streak = consecutive days with >= 1 completed habit instance
  - Use user's timezone for "day" boundaries
  - "At risk" = today is last day to complete AND no completions yet AND time < habit's preferredTimeOfDay + 2h
  - DST handling: normalize all times to user TZ before day bucketing

**Step 3: Update `/habits` UI layout**

Top-to-bottom:
- Coach Card (Task 5)
- Insights modules (charts + per-habit rows)
- CRUD management list (existing, but secondary)

**Step 4: Add comprehensive backend tests**

Create test files:
- `habitInsightsService.test.ts` (adherence calculation, streak logic, best window)
- `habitRecommendationService.test.ts` (recommendation rules - add in Task 4)
- `habitCompletion.integration.test.ts` (complete → insights update end-to-end)
- `habitEdgeCases.test.ts` (timezone changes, DST transitions, missed days)

Test cases:
- Adherence: 8/12 completed = 67%
- Streaks: 7 consecutive days, broken by skip, resumed
- Best window: Mon 9am has 90% completion vs Tue 2pm 50%
- At risk: habit due today, no completion yet, time < deadline
- Timezone: user changes from PST to EST mid-week, streaks preserved
- DST: spring forward transition, completion on boundary day counts correctly
- Empty states: no habits, habits without schedules

**Step 5: Manual QA**

Confirm:
- no habits → friendly empty state
- habits w/o scheduled instances → shows "schedule habits to see insights"
- scheduled + completed → charts update
- adherence % matches manual count
- streak counter updates in real-time

---

## Task 4: Recommendations cards (Roadmap 17.4)

**Goal:** 1–3 explainable recommendation cards tied to metrics (best window, streak at risk, duration too long).

**Files:**
- Create: `timeflow/apps/backend/src/services/habitRecommendationService.ts`
- Modify: `habitInsightsService.ts` to include recommendations
- Web: `timeflow/apps/web/src/components/habits/Recommendations.tsx`

**Rules-first MVP (required):**
- streak at risk → recommend rescue block in best window
- low adherence → recommend adjusting window
- repeated skip reasons “No time” → recommend “minimum viable” rescue block + earlier suggestion

Each card must include:
- What we noticed (metric)
- Why it matters
- One action CTA (wired in Task 5)

---

## Task 5: Coach Card + Next Actions (Roadmap 17.6) — actions A/B/D only

**Goal:** Top of Habits page feels like a coach with a single primary CTA; actions limited to:
- **A** schedule rescue block
- **B** adjust habit window
- **D** snooze/skip with preset reason codes

Also required:
- **Undo**
- **Dismiss**
- **Noise control** (max 1 primary + 2 secondary per day)

**Files:**
- Web: `timeflow/apps/web/src/components/habits/CoachCard.tsx`
- Backend: `habitInsightsService.ts` should return the coach suggestion(s) deterministically

**Step 1: Implement deterministic suggestion selection**

Coach suggestion priority (first match wins):
1. **Streak at risk today** (any habit) → primary: "Schedule rescue block"
2. **Repeated skip reasons** "FORGOT" or "NO_TIME" (>2 in last 7 days) → primary: "Adjust to earlier window" or "Schedule rescue block"
3. **Low adherence** (<50% last 14 days) → secondary: "Try shorter duration" or "Adjust window"
4. **Default:** "Keep going" (encouragement only, no CTA)

**Step 2: Dismiss / snooze**

Use `User.habitsCoachState` JSON field (already added in Task 1, Step 2):
```typescript
{
  dismissedSuggestions: [
    { type: 'streak_at_risk', habitId: 'abc', dismissedAt: '2026-01-03T10:00:00Z', snoozedUntil: null }
  ],
  lastPrimarySuggestion: {
    type: 'streak_at_risk',
    habitId: 'abc',
    timestamp: '2026-01-03T09:00:00Z'
  }
}
```

**Step 3: Undo**

Undo behavior uses `HabitActionHistory` (added in Task 1, Step 2):
- Scheduled a rescue block → delete ScheduledHabit + restore previousState
- Adjusted a window → revert Habit.preferredTimeOfDay to previousState
- Skipped → delete HabitCompletion record
- Undo available for 24h only (check expiresAt)

**Step 4: Noise caps**

Enforcement in `habitInsightsService`:
- Check `User.habitsCoachState.lastPrimarySuggestion.timestamp`
- If last primary was < 24h ago → demote current to secondary or skip
- Never repeat dismissed suggestion for 7 days (filter by dismissedAt)
- Server returns `{ primary: Suggestion | null, secondary: Suggestion[] }` (max 1 primary + 2 secondary)

---

## Task 6: Streak-at-risk detection + UX (Roadmap 17.7)

**Goal:** Show a banner when a streak is at risk and give an immediate CTA (schedule rescue block).

Implement in:
- insights response
- coach selection logic
- calendar popover streak context

---

## Task 7: Reminders (opt-in) (Roadmap 17.8)

**Goal:** Minimal, privacy-safe in-app reminder when streak is at risk.

**Implementation (in-app only for MVP):**

**Step 1:** Add banner component to `/habits` and `/today` pages
- Show when streak at risk (from insights endpoint)
- Clear CTA: "Schedule rescue block" or "Complete now"
- Dismissible with snooze options (1h, 3h, tomorrow)

**Step 2:** Add user setting in User model
```prisma
model User {
  // ... existing fields
  settings Json? // { showStreakReminders: true }
}
```

**Step 3:** Track last reminder shown to prevent spam
- Store in `User.habitsCoachState.lastReminderShown`
- Only show once per 4 hours max

**Step 4:** Defer to Sprint 18
- Email reminders (requires email infrastructure from public beta launch)

---

## Task 8: Trust + edge cases (Roadmap 17.9)

**Goal:** Tooltips and tests for DST/timezone/missed day transitions.

**Backend tests:**
- Create Vitest cases for:
  - user timezone changes mid-week
  - DST transition week
  - completion recorded at boundary times

**Frontend:**
- Add “How we calculate streaks/adherence” tooltip copy with calm framing.

---

## Task 9: Instrumentation + privacy guardrails (Roadmap 17.5)

**Backend/Frontend**
- Add events (privacy-safe, no sensitive content):
  - `page.view.habits` (timestamp only)
  - `habits.insight.viewed` (days filter: 14 or 28)
  - `habit.instance.complete` (habitId hash, no title)
  - `habit.instance.undo` (habitId hash)
  - `habit.instance.skip` (habitId hash, `reasonCode` only)
  - `habits.recommendation.viewed` (recommendation type, habitId hash)
  - `habits.recommendation.action_taken` (recommendation type, action taken, habitId hash)
  - `habits.coach.action_taken` (`actionType`: rescue_block | adjust_window | snooze_skip)
  - `habits.coach.dismissed` (suggestion type, habitId hash)
  - `habits.coach.undo` (action type undone)
  - `habits.streak.milestone_reached` (streak length: 7 | 14 | 30 | 100)

**Privacy guardrails:**
- NEVER log habit titles, descriptions, or user notes
- Use habitId hashes or opaque IDs only
- reasonCode is preset enum only (no free-text)
- All analytics events reviewed for PII before shipping

---

## Final verification (must run)

**Automated tests:**
```bash
cd timeflow
pnpm -r test
pnpm -r lint
```

**Manual QA checklist:**

Core completion flow:
- [ ] Complete habit from calendar popover → insights update immediately
- [ ] Undo completion → insights revert
- [ ] Skip with reason "FORGOT" → reason saved to DB
- [ ] Complete habit that was already skipped → overwrites to completed

Insights dashboard:
- [ ] No habits → friendly empty state shown
- [ ] Habits but no scheduled instances → "schedule habits to see insights" message
- [ ] Scheduled + completed habits → adherence % matches manual count
- [ ] Streak counter updates in real-time after completion
- [ ] Best window shows correct day/time based on completion history

Coach card:
- [ ] Streak at risk → banner shows with "Schedule rescue block" CTA
- [ ] Skip "FORGOT" 3 times → coach suggests earlier window
- [ ] Low adherence (<50%) → coach suggests shorter duration or adjust window
- [ ] Dismiss coach card → doesn't reappear for 7 days
- [ ] Snooze coach card → reappears after snooze period

Actions:
- [ ] Schedule rescue block → creates ScheduledHabit in best window
- [ ] Adjust habit window → updates Habit.preferredTimeOfDay
- [ ] Undo rescue block → deletes ScheduledHabit
- [ ] Undo window adjustment → reverts to previous time
- [ ] Undo expires after 24h → error message shown

Streaks:
- [ ] Complete habits for 7 consecutive days → see 7-day streak
- [ ] Miss a day → streak resets to 0
- [ ] Streak milestone (7/14/30 days) → analytics event fires

Edge cases:
- [ ] User changes timezone → streaks don't corrupt
- [ ] DST transition week → completion tracking works correctly
- [ ] Multiple browsers/tabs → optimistic updates resolve correctly
- [ ] Rapid complete/undo/complete → no race conditions

Privacy:
- [ ] Analytics events contain no habit titles/descriptions
- [ ] Only reasonCode enums logged (no free-text)
- [ ] habitId hashed in all analytics events


