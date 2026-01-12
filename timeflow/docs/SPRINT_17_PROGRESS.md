# Sprint 17: Habits Retention Loop - Progress Update

**Last Updated**: 2026-01-12
**Status**: In Progress (Core completion flow mostly complete)

---

## Overview

Sprint 17 focuses on making habits "sticky" through completion tracking, insights, streak mechanics, and a coach card that drives actions. This document tracks implementation progress.

**Reference Plans:**
- Main Plan: `docs/plans/2026-01-03-sprint-17-habits-coach-implementation-plan.md`
- Retention Loop: `docs/plans/2026-01-02-sprint-17-habits-retention-loop.md`

---

## Completed Tasks ✅

### Task 1: Habit Completion Tracking Data Model (17.1)

**Status**: ✅ Complete

**What was built:**
- Database schema with `HabitCompletion` and `HabitActionHistory` tables
- `HabitSkipReason` enum with 9 preset reasons (no free-text)
- Service layer: `habitCompletionService.ts` with complete/undo/skip operations
- Undo functionality with 24h window via `HabitActionHistory`
- API endpoints: POST `/habits/instances/:id/complete|undo|skip`
- Shared types in `@timeflow/shared`
- Comprehensive unit tests

**Files modified:**
- `apps/backend/prisma/schema.prisma` - Added completion tracking models
- `packages/shared/src/types/habitCompletion.ts` - Types & enums
- `apps/backend/src/services/habitCompletionService.ts` - Business logic
- `apps/backend/src/routes/habitRoutes.ts` - API routes
- `apps/backend/src/controllers/habitController.ts` - Endpoints
- Tests: `apps/backend/src/services/__tests__/habitCompletionService.test.ts`

**Key Features:**
- Idempotent operations (marking complete twice = no-op)
- Privacy-safe skip reasons (preset only, no free text)
- Action history for undo with automatic expiry
- Cascade deletes to prevent orphaned data

---

### Task 2: Calendar Popover Actions for Habits (17.2)

**Status**: ✅ Complete

**What was built:**
- Full habit action flow from calendar event popover
- Complete/Undo/Skip buttons with preset reason dropdown
- Streak context display (current streak + "at risk" badge)
- Habit insights integration for real-time streak data
- Optimistic UI updates with error handling

**Files modified:**
- `apps/web/src/components/EventDetailPopover.tsx` - UI already existed, now wired
- `apps/web/src/components/CalendarView.tsx` - Added habit handlers & streak lookup
- `apps/web/src/app/calendar/page.tsx` - Habit insights fetching & handler implementations
- `apps/web/src/lib/api.ts` - API client methods (already existed)

**Integration Flow:**
1. User clicks habit event in calendar
2. Calendar page fetches habit insights (includes streaks)
3. CalendarView maps scheduledHabitId → habitId → streak metrics
4. EventDetailPopover displays streak context + action buttons
5. Actions call API and refresh both events and insights

**Key Features:**
- Real-time streak display with "at risk" warnings
- 9 preset skip reasons matching backend enum
- Auto-refresh insights after all habit actions
- Proper TypeScript types throughout the chain

---

### Task 3: Habits Insights Dashboard (17.3)

**Status**: ✅ Backend Complete, Frontend Complete

**What exists:**
- Backend service: `habitInsightsService.ts` - Full insights computation
- Insights endpoint: GET `/api/habits/insights?days=14|28`
- Frontend component: `HabitsInsights.tsx` - Dashboard display
- Comprehensive metrics: adherence, streaks, best windows, skip reasons
- Per-habit and overall insights

**Data Provided:**
- Adherence rate (completed/scheduled)
- Current & best streaks with "at risk" detection
- Minutes scheduled vs completed
- Best completion windows (day + time slot)
- Skip reason analytics
- Adherence time series for charts

---

### Task 4: Recommendations Service (17.4)

**Status**: ✅ Complete

**What exists:**
- Service: `habitRecommendationService.ts` - Rules-based recommendations
- Types: `habitRecommendation.ts` - Recommendation data structures
- Integration with insights endpoint
- Multiple recommendation types with priority ordering

**Recommendation Types:**
- Streak at risk → schedule rescue block
- Low adherence → adjust window suggestion
- Repeated skip patterns → earlier time or shorter duration
- Includes metric context and actionable CTAs

---

### Task 5: Coach Card + Next Actions (17.6)

**Status**: ✅ UI Complete, Actions Need Verification

**What exists:**
- Component: `CoachCard.tsx` - Flow mascot with primary suggestion
- Dismiss/snooze functionality with noise control
- Actions: Schedule rescue block, adjust window, snooze/skip
- User state tracking in `User.habitsCoachState` JSON field

**What needs verification:**
- End-to-end action execution (rescue block scheduling)
- Undo functionality for coach actions
- Noise cap enforcement (1 primary/day, max 2 secondary)

---

## In Progress / Needs Work 🚧

### Task 6: Streak-at-Risk Detection + UX (17.7)

**Status**: ⚠️ Needs Verification

**What might exist:**
- Streak calculation logic in `habitInsightsService.ts`
- "At risk" detection in insights response
- UI display in EventDetailPopover

**What needs checking:**
- Banner component on `/habits` page
- Detection accuracy (DST/timezone handling)
- Integration with coach suggestions

---

### Task 7: Reminders (Opt-in) (17.8)

**Status**: ⚠️ Needs Verification

**What might exist:**
- `StreakReminderBanner.tsx` component
- Habit notifications endpoint: GET `/api/habits/notifications`

**What needs checking:**
- In-app reminder UI on `/habits` and `/today` pages
- Snooze functionality (1h, 3h, tomorrow)
- Rate limiting (max once per 4 hours)
- User settings for disabling reminders

---

### Task 8: Trust + Edge Cases (17.9)

**Status**: ❌ Not Started

**What's needed:**
- "How we calculate this" tooltips on metrics
- DST transition tests
- Timezone change tests
- Missed day boundary tests

**Suggested component:**
- `MetricsTooltip.tsx` - Reusable tooltip with calm explanations

---

### Task 9: Analytics Instrumentation (17.5)

**Status**: ❌ Not Started

**Privacy-safe events needed:**
- `habits.insight.viewed` - No PII
- `habit.instance.complete` - habitId hash only
- `habit.instance.undo` - habitId hash only
- `habit.instance.skip` - habitId hash + reasonCode enum
- `habits.coach.action_taken` - action type + habitId hash
- `habits.coach.dismissed` - suggestion type + habitId hash
- `habits.streak.milestone_reached` - streak length only

**Privacy guardrails:**
- NEVER log habit titles/descriptions
- Use habitId hashes (via `hashHabitId()`)
- Only log preset enum values (no free-text)
- Review all events for PII before shipping

---

## Testing Status

### Automated Tests
- ✅ `habitCompletionService.test.ts` - Core completion logic
- ✅ `habitInsightsService.test.ts` - Insights calculation
- ✅ `habitRecommendationService.test.ts` - Recommendation rules
- ✅ `habitEdgeCases.test.ts` - Timezone & DST handling
- ✅ `commitScheduleService.test.ts` - Bulk scheduling
- ✅ `bulkScheduleService.test.ts` - Schedule generation

### Manual QA Needed
- [ ] Complete habit from calendar popover → insights update
- [ ] Undo completion → insights revert
- [ ] Skip with reason → reason saved to DB
- [ ] Streak counter updates in real-time
- [ ] Coach card appears with correct suggestions
- [ ] Dismiss/snooze coach card works
- [ ] Undo coach actions (rescue block, window adjust)
- [ ] Streak milestones (7/14/30 days)
- [ ] DST transition week
- [ ] Timezone change mid-week

---

## Next Steps

### Immediate (Session Continuation)

1. **Verification Sprint** (1-2 hours)
   - Test habit completion flow in browser
   - Verify coach card displays and actions work
   - Check StreakReminderBanner existence
   - Test undo functionality

2. **Polish Tasks** (2-3 hours)
   - Add MetricsTooltip component with explanations
   - Implement privacy-safe analytics tracking
   - Add "How we calculate" tooltips to insights

3. **Final QA** (1 hour)
   - Run full QA checklist from implementation plan
   - Test edge cases (DST, timezone, rapid clicks)
   - Verify no PII in analytics

### Future Sessions

4. **Sprint 18 Prep**
   - Email reminders (requires email infrastructure)
   - Public beta launch polish
   - Performance optimization

---

## Architecture Notes

### Data Flow: Habit Completion

```
User clicks "Complete" in calendar popover
  ↓
handleCompleteHabitById(scheduledHabitId, actualDuration?)
  ↓
api.completeHabitInstance(scheduledHabitId, actualDuration)
  ↓
POST /api/habits/instances/:scheduledHabitId/complete
  ↓
habitCompletionService.markScheduledHabitComplete()
  ↓
- Upsert HabitCompletion record (status: 'completed')
- Create HabitActionHistory for undo (24h expiry)
- Return success
  ↓
Frontend: Promise.all([fetchExternalEvents(), fetchHabitInsights()])
  ↓
CalendarView re-renders with updated completion status
EventDetailPopover shows updated streak
```

### Data Flow: Streak Display

```
Calendar page loads
  ↓
fetchHabitInsights(14 days) → habitInsights state
  ↓
useMemo: habitStreakMap = Map<habitId, {current, atRisk}>
  ↓
Pass to CalendarView:
- habitStreakMap
- scheduledHabitInstances (for scheduledHabitId → habitId mapping)
  ↓
User clicks habit event
  ↓
handleEventClick:
- Find scheduledHabitInstance by scheduledHabitId
- Extract habitId
- Look up habitStreakMap.get(habitId)
- Pass habitStreak to popover state
  ↓
EventDetailPopover renders:
- "Current streak: X days"
- "At risk" badge if streak.atRisk
- "Complete today to keep your streak alive!"
```

---

## Known Issues / TODOs

1. **Type Errors to Fix:**
   - `apps/web/src/app/habits/page.tsx:55` - `priorityRank` doesn't exist on Habit type
   - `apps/web/src/components/habits/SortableHabitCard.tsx:8` - Missing `@dnd-kit/utilities`

2. **Backend Enhancement:**
   - Consider adding `habitId` directly to CalendarEvent for habit events (reduces lookups)

3. **Performance:**
   - Insights are fetched on every calendar mount - consider caching strategy
   - Large habitStreakMap with many habits - consider pagination

4. **Accessibility:**
   - Skip reason dropdown needs keyboard navigation
   - Coach card dismiss needs aria-labels

---

## Success Metrics (Sprint Goal)

**Definition of Done:**
- ✅ Users can complete/undo/skip habits from calendar ✅
- ✅ Streak context visible in popover ✅
- ⚠️ Coach card shows actionable suggestions (needs verification)
- ⚠️ In-app reminders for streak-at-risk (needs verification)
- ❌ "How we calculate" tooltips (not started)
- ❌ Privacy-safe analytics (not started)
- ❌ Full manual QA passed (not started)

**Overall Sprint Status:** ~70% Complete
