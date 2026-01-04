# Bulk Habit Scheduling Feature - Design Document

**Date**: 2026-01-04
**Feature**: Flow Coach Bulk Scheduling Banner
**Goal**: Enable users to quickly schedule a week's worth of habits with intelligent suggestions and interactive customization.

---

## Problem Statement

Users find it tedious to schedule habits one-by-one using the individual "Quick Schedule" buttons. Scheduling a week of habits (12+ events) takes too long and disrupts flow. We need a faster way to bulk-schedule habits that:
- Respects existing calendar commitments
- Provides intelligent time slot suggestions
- Allows quick customization before committing
- Feels trustworthy and transparent

---

## Solution Overview

**Flow Coach Bulk Scheduling Banner** - A collapsible component at the top of the Habits page that:
1. Shows context-aware prompts in collapsed state
2. Expands to reveal quick time range selection ("Tomorrow", "This Week", etc.)
3. Generates smart habit block suggestions using existing scheduling engine
4. Displays interactive calendar preview with drag-and-drop customization
5. Commits accepted blocks to Google Calendar with real-time progress and cancellation support

---

## Component Architecture

### FlowSchedulingBanner Component States

**1. Collapsed State**
- Flow mascot + context-aware message
- Minimal height (~60px)
- Examples:
  - "You have 5 unscheduled habits for tomorrow"
  - "3 habits at risk of breaking streaks - schedule them now?"
  - "Ready to plan next week? 12 habits waiting"
  - "Your Monday looks light - want to schedule some habits?"
- Expand/collapse chevron icon
- Subtle animation on state changes

**Context Message Priority Logic:**
1. Streak at risk (highest priority)
2. Tomorrow focus (if today is evening or unscheduled habits for tomorrow)
3. Week planning (if it's Friday/Saturday/Sunday)
4. Opportunity nudge (if calendar has light days ahead)
5. Default fallback

**2. Expanded - Prompt State**
- Quick action chips: "Tomorrow" | "Next 3 Days" | "This Week" | "Next 2 Weeks"
- Optional text input: "Or tell Flow: 'Skip Monday, I'm traveling'"
- Clicking chip auto-generates schedule
- Loading animation: "Flow is finding the best times..." with thinking mascot

**3. Expanded - Preview State**
- Smart calendar view (auto-selects day/3-day/week based on range, max 1 week)
- Interactive drag-and-drop for suggested habit blocks
- Action bar: "Accept All" | "Cancel"
- Individual block controls: Remove (X) and drag handle

---

## Data Flow & API Design

### API Endpoints

#### 1. GET `/api/habits/scheduling-context`
Returns context data for collapsed banner message.

**Response:**
```typescript
{
  unscheduledHabitsCount: number;
  nextRelevantDay: string; // "tomorrow", "Monday", etc.
  urgentHabits: number; // habits at risk of breaking streaks
  calendarDensity: "light" | "moderate" | "busy"; // for next few days
}
```

#### 2. POST `/api/habits/bulk-schedule`
Generates schedule suggestions for specified date range.

**Request:**
```typescript
{
  dateRangeStart: string; // ISO date
  dateRangeEnd: string;   // ISO date
  customPrompt?: string;  // "Skip Monday, I'm traveling"
}
```

**Response:**
```typescript
{
  suggestions: Array<{
    id: string; // temp ID for frontend tracking
    habitId: string;
    habitTitle: string;
    startDateTime: string;
    endDateTime: string;
    date: string;
    dayOfWeek: string;
  }>;
  conflictWarnings?: Array<{
    suggestionId: string;
    reason: string;
  }>;
}
```

**Backend Logic:**
- Reuses existing `habitSuggestionService.getHabitSuggestionsForUser()`
- New: `customPrompt` parsing (v1: simple keyword detection, v2: AI-powered)
- Validates date range doesn't exceed 14 days

#### 3. POST `/api/habits/commit-schedule`
Commits accepted habit blocks to Google Calendar.

**Request:**
```typescript
{
  acceptedBlocks: Array<{
    habitId: string;
    startDateTime: string; // may be modified by drag-drop
    endDateTime: string;
  }>;
}
```

**Response:** (Streaming or batch with progress updates)
```typescript
{
  jobId: string; // for cancellation support
  progress: Array<{
    habitId: string;
    status: "pending" | "creating" | "created" | "failed";
    eventId?: string;
    error?: string;
  }>;
}
```

**Backend Implementation:**
- Process 5-10 events concurrently (don't overwhelm Google API)
- Rate limiting: Max 10 requests/second to Google Calendar API
- Store job state in Redis/database for cancellation support
- Return created event IDs for rollback capability

#### 4. POST `/api/habits/cancel-schedule-job`
Cancels in-flight calendar event creation.

**Request:**
```typescript
{
  jobId: string;
}
```

**Response:**
```typescript
{
  cancelled: boolean;
  summary: {
    totalBlocks: number;
    createdBlocks: number;
    cancelledBlocks: number;
    createdEventIds: string[]; // for optional rollback
  };
}
```

---

## UI/UX Design

### Calendar Preview Visual Design

**Suggested Habit Blocks (Not Yet Accepted):**
- Border: `2px dashed #3B82F6` (blue)
- Background: `rgba(59, 130, 246, 0.1)` (light blue tint)
- Icon: Small habit icon
- Label: Habit title + time
- Drag handle: 6-dot grip icon on left
- Remove button: Small X on top-right (hover to show)

**Existing Calendar Events (Cannot Modify):**
- Current solid styling from calendar
- Slightly dimmed/grayed to de-emphasize
- No drag handle

**Conflict State (When Dragged to Occupied Slot):**
- Border: `2px solid #EF4444` (red)
- Background: `rgba(239, 68, 68, 0.1)` (red tint)
- Warning icon overlay
- Tooltip: "Conflicts with [Event Name]"

**Legend (Always Visible at Top):**
```
┌─────────────────────────────────────────────┐
│ [□ Dashed Blue] Suggested habits (drag to adjust) │
│ [■ Solid Gray] Your scheduled events        │
└─────────────────────────────────────────────┘
```

### Drag-and-Drop Behavior

**Interaction Rules:**
- Snaps to 15-minute increments
- Shows ghost preview while dragging
- Preserves duration (can't resize in v1, just move)
- If dropped on conflict: block turns red, doesn't commit, shows warning
- If dropped on free slot: updates position, re-validates against all events

**Validation During Drag:**
- New time is within user's wake/sleep bounds
- New time doesn't conflict with existing event
- New time is still within the selected date range
- Duration fits in the dropped slot

### Action Bar & Progress Modal

**Action Bar (Bottom of Preview):**
```
┌──────────────────────────────────────────────────┐
│  [Cancel]              [Accept All (12 blocks)]  │
└──────────────────────────────────────────────────┘
```

**Progress Modal (During Commit):**
```
Creating your schedule...
━━━━━━━━━━░░░░░░░░░░ 7/12 events created

[Cancel Scheduling]
```

**Success State:**
```
✓ 12 habits scheduled!
[View in Calendar →]
```

**Cancellation State:**
```
⚠ Scheduling cancelled
Created 4 of 12 events
[Undo Created Events] [Keep Partial Schedule]
```

---

## Error Handling & Edge Cases

### Error Scenarios

**1. No Available Time Slots**
- Message: "Flow couldn't find open slots for all habits. Try a longer time range or adjust your calendar."
- Show partial schedule if some habits fit
- Highlight which habits couldn't be scheduled

**2. Google Calendar API Failure**
- Specific error: "Calendar connection lost. Please try again."
- Mark which events failed vs succeeded
- Offer "Retry Failed Events" button
- Don't leave partial state unclear

**3. Conflicts After Drag**
- Block turns red with warning icon
- Doesn't snap into place
- Tooltip explains conflict
- User must drag to valid slot or remove block

**4. Mid-Scheduling Cancellation**
- Immediately stop creating new events
- Summary: "Cancelled. Created 4 of 12 events."
- Offer "Undo Created Events" button
- Update habit status to reflect actual state

**5. Custom Prompt Not Understood**
- v1: Warning "Couldn't understand custom prompt, using default schedule"
- Still generate schedule without custom constraint
- Future: AI-powered parsing with confirmation

**6. Timezone/DST Edge Cases**
- All times normalized to user's timezone
- Validate start/end times are logical across DST boundaries

**7. Habit Modified During Scheduling**
- Use snapshot of habit state at generation time
- Warn if change detected during commit

### Pre-Flight Validation

**Before showing preview:**
- At least 1 active habit exists
- Selected date range is future (not past)
- User has valid Google Calendar token
- Date range doesn't exceed 14 days

**Before committing:**
- Re-check all conflicts (calendar might have changed)
- Verify each habit still exists and is active
- Confirm Google Calendar is still accessible

---

## Database Schema Changes

### New Table: SchedulingJob

```sql
CREATE TABLE SchedulingJob {
  id              String    @id @default(cuid())
  userId          String
  status          String    -- "in_progress" | "completed" | "cancelled" | "failed"
  totalBlocks     Int
  completedBlocks Int
  createdEventIds String[]  -- for rollback capability
  errorMessage    String?
  createdAt       DateTime  @default(now())
  updatedAt       DateTime  @updatedAt

  user User @relation(fields: [userId], references: [id])

  @@index([userId, createdAt])
}
```

**Purpose:** Track in-progress bulk scheduling jobs for cancellation and rollback support.

---

## Performance Considerations

### Frontend Optimization
- **Calendar rendering**: Use virtualization if week view shows 100+ events
- **Drag performance**: Throttle collision detection to 60fps using requestAnimationFrame
- **Progress updates**: WebSocket or polling (100ms intervals) for real-time progress bar
- **Optimistic UI**: Show "scheduling..." state immediately, don't wait for server

### Backend Optimization
- **Batch event creation**: Process 5-10 events concurrently
- **Rate limiting**: Max 10 requests/second to Google Calendar API
- **Suggestion caching**: Cache results for 60 seconds (calendar unlikely to change rapidly)
- **Context caching**: Cache unscheduled habit count, refresh on habit CRUD operations

### Performance Targets
- Suggestion generation: <2s for 1 week range
- Calendar render: <500ms for 7-day view
- Event creation: ~500ms per event (5-10 concurrent = 1-2s total for 12 events)
- Cancellation latency: <200ms response time

---

## Testing Strategy

### Unit Tests
- Context message generation: Test all priority paths
- Date range calculation: Test "Tomorrow", "This Week", "Next 2 Weeks" logic
- Conflict detection: Test drag validation against various overlaps
- Bulk scheduling logic: Test with various calendar densities

### Integration Tests
- Full flow: Generate → Modify → Commit → Verify calendar events
- Cancellation: Start commit → Cancel mid-process → Verify partial state
- Error recovery: Simulate API failures, verify graceful handling
- Timezone handling: Test scheduling across DST boundaries

### E2E Tests (Critical Paths)
1. **Happy path**: Expand → Click "This Week" → Accept all → Verify 12+ events created
2. **Customization path**: Generate → Drag 3 blocks → Remove 2 → Accept → Verify correct events
3. **Cancellation path**: Accept → Cancel mid-process → Verify partial commit + undo works
4. **Error path**: Expire token → Try commit → See error → Refresh → Retry successfully

---

## Success Metrics

### User Engagement
- % of users who expand the banner (target: 60%+)
- % who accept at least 1 suggestion (target: 40%+)
- Average blocks scheduled per use (target: 8+)
- % who use drag-to-customize (target: 20%+)

### Quality Metrics
- % of schedules accepted without modification (target: 50%+ means good suggestions)
- Cancellation rate during commit (target: <5%)
- Conflict rate after drag (target: <10% of drags result in conflict)
- Time to generate suggestions (target: <2s for 1 week)

### Reliability
- Calendar event creation success rate (target: 99%+)
- API error rate (target: <1%)
- Rollback success rate on cancellation (target: 100%)

---

## Implementation Phases

### Phase 1: Core Banner & Context (1-2 days)
- FlowSchedulingBanner component (collapsed/expanded states)
- Context API endpoint
- Context-aware messaging logic
- Basic expand/collapse animation

### Phase 2: Schedule Generation (1-2 days)
- Quick action chips UI
- Bulk schedule API endpoint
- Integration with existing habitSuggestionService
- Loading states and error handling

### Phase 3: Calendar Preview (2-3 days)
- Smart calendar view (day/3-day/week auto-selection)
- Visual distinction for suggested vs existing events
- Legend component
- Day-by-day accordion integration

### Phase 4: Drag-and-Drop (2-3 days)
- Drag-and-drop functionality
- Conflict detection and validation
- Visual feedback (ghost preview, red conflicts)
- Individual block removal

### Phase 5: Commit & Progress (1-2 days)
- Commit schedule API endpoint
- SchedulingJob database table
- Progress modal with real-time updates
- Cancellation support

### Phase 6: Testing & Polish (1-2 days)
- Unit and integration tests
- E2E critical path tests
- Performance optimization
- Error handling refinement
- Analytics instrumentation

**Total Estimate: 8-14 days**

---

## Future Enhancements (Out of Scope for v1)

- AI-powered custom prompt parsing ("Skip Monday, I'm traveling")
- Habit block resizing (change duration directly in calendar)
- Multi-week view (beyond 1 week)
- Habit priority weighting (schedule high-priority habits first)
- Smart rescheduling suggestions when conflicts arise
- Recurring bulk scheduling (auto-schedule every Sunday for the week ahead)
- Collaboration features (suggest habits for shared calendars)

---

## Open Questions & Decisions

1. **WebSocket vs Polling for Progress Updates?**
   - Decision: Start with polling (100ms intervals), migrate to WebSocket if performance issues arise

2. **Redis vs Database for Job State?**
   - Decision: Use database (PostgreSQL) for simplicity, add Redis if scale requires it

3. **Custom Prompt Parsing Complexity?**
   - Decision: v1 uses simple keyword detection ("skip Monday"), v2 can add AI if needed

4. **Rollback Strategy on Cancellation?**
   - Decision: Offer "Undo Created Events" button, don't auto-rollback (user might want partial schedule)

---

## Acceptance Criteria

**This feature is complete when:**

✅ Users can expand the banner and see context-aware messaging
✅ Users can select "Tomorrow", "This Week", etc. and see habit suggestions
✅ Calendar preview shows suggested blocks vs existing events with clear visual distinction
✅ Users can drag habit blocks to new time slots with conflict detection
✅ Users can remove individual suggested blocks
✅ "Accept All" creates all calendar events with real-time progress
✅ Users can cancel mid-process with partial state clearly shown
✅ All error scenarios are handled gracefully with clear messaging
✅ Unit, integration, and E2E tests pass
✅ Performance targets are met (<2s suggestion generation, 99%+ creation success)
✅ Analytics instrumentation is in place for success metrics

---

**Design Status**: ✅ Validated
**Next Step**: Implementation Planning & Worktree Setup
