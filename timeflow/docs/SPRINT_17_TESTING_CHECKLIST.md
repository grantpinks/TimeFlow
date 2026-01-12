# Sprint 17: Manual Testing Checklist

**Last Updated**: 2026-01-12
**Status**: Ready for Testing
**Services Running**: Backend (3001), Frontend (3000)

---

## Component Status Summary ✅

All Sprint 17 components are **implemented and integrated**:

| Component | Status | Location | Used In |
|-----------|--------|----------|---------|
| ✅ StreakReminderBanner | Implemented | `apps/web/src/components/habits/StreakReminderBanner.tsx` | HabitsInsights |
| ✅ MetricsTooltip | Implemented | `apps/web/src/components/habits/MetricsTooltip.tsx` | HabitsInsights |
| ✅ HabitCompletion Backend | Complete | `apps/backend/src/services/habitCompletionService.ts` | API Routes |
| ✅ Habit Notifications | Implemented | `apps/backend/src/services/habitNotificationService.ts` | GET /api/habits/notifications |
| ✅ EventDetailPopover | Updated | `apps/web/src/components/EventDetailPopover.tsx` | CalendarView |
| ✅ CoachCard | Implemented | `apps/web/src/components/habits/CoachCard.tsx` | HabitsInsights |

---

## Pre-Testing Setup

### 1. Verify Services Are Running

```bash
# Backend should be on port 3001
curl http://localhost:3001/health

# Frontend should be on port 3000
open http://localhost:3000
```

### 2. Ensure You Have Test Data

You'll need:
- ✅ At least 2-3 active habits
- ✅ Some scheduled habit instances in your calendar
- ✅ At least one habit with a current streak (complete it daily for 3+ days)
- ✅ Google Calendar connected

### 3. Browser DevTools Open

Keep these tabs open:
- **Console** - Watch for errors
- **Network** - Monitor API calls
- **Application > LocalStorage** - Check reminder snooze state

---

## Testing Checklist

### A. Calendar Popover - Habit Completion Flow ⭐ NEW

**Location**: Calendar page → Click any habit event

#### Test 1: Complete a Habit
- [ ] 1. Navigate to `/calendar`
- [ ] 2. Find a scheduled habit event (shows in calendar)
- [ ] 3. Click the habit event
- [ ] 4. EventDetailPopover opens
- [ ] 5. **Verify**: You see "Complete" button
- [ ] 6. **Verify**: Streak context displays (e.g., "Current streak: 5 days")
- [ ] 7. Click "Complete" button
- [ ] 8. **Expected**: Success message appears
- [ ] 9. **Expected**: Popover closes
- [ ] 10. **Expected**: Event updates visually (may show completion indicator)
- [ ] 11. Re-open the same event
- [ ] 12. **Verify**: "Undo" button now appears instead of "Complete"

**What to watch for:**
- Network calls: POST `/api/habits/instances/:id/complete`
- Network calls: GET `/api/habits/insights` (should refresh)
- No console errors

---

#### Test 2: Undo a Completion
- [ ] 1. Complete a habit (follow Test 1)
- [ ] 2. Re-open the same habit event
- [ ] 3. **Verify**: "Undo" button shows
- [ ] 4. Click "Undo"
- [ ] 5. **Expected**: Success message "Habit completion undone"
- [ ] 6. **Expected**: Event reverts to uncompleted state
- [ ] 7. Re-open the event
- [ ] 8. **Verify**: "Complete" button is back

**What to watch for:**
- Network calls: POST `/api/habits/instances/:id/undo`
- Insights refresh after undo

---

#### Test 3: Skip with Reason
- [ ] 1. Open any uncompleted habit event
- [ ] 2. **Verify**: "Skip" button shows
- [ ] 3. Click "Skip"
- [ ] 4. **Expected**: Dropdown shows 9 preset reasons:
  - No time / too busy
  - Low energy / not feeling well
  - Schedule changed unexpectedly
  - Travel / away from routine
  - Forgot
  - Not a priority today
  - Blocked by something
  - Injury / recovery
  - Other
- [ ] 5. Select "Forgot"
- [ ] 6. **Expected**: Success message "Habit skipped"
- [ ] 7. **Expected**: Event marked as skipped
- [ ] 8. Re-open event
- [ ] 9. **Verify**: Shows skip reason + Undo button

**What to watch for:**
- Network calls: POST `/api/habits/instances/:id/skip` with `reasonCode: "FORGOT"`
- No free-text input (privacy-safe)

---

#### Test 4: Streak Context Display
- [ ] 1. Complete a habit for 3 consecutive days (create test streak)
- [ ] 2. On day 4, open the habit event
- [ ] 3. **Verify**: Streak shows "Current streak: 3 days"
- [ ] 4. If the habit is due today and not completed yet:
  - [ ] **Verify**: "At risk" badge appears
  - [ ] **Verify**: Message: "Complete today to keep your streak alive!"

**What to watch for:**
- Streak data comes from GET `/api/habits/insights`
- Mapping: scheduledHabitId → habitId → streak lookup works

---

### B. Habits Page - Insights Dashboard

**Location**: Navigate to `/habits`

#### Test 5: Overall Metrics Display
- [ ] 1. Navigate to `/habits`
- [ ] 2. **Verify**: CoachCard appears at top (Flow mascot with suggestion)
- [ ] 3. **Verify**: Overall adherence percentage shows
- [ ] 4. Hover over the "?" next to "Overall Adherence"
- [ ] 5. **Expected**: MetricsTooltip appears with explanation
- [ ] 6. **Verify**: Tooltip explains: "Adherence = (completions / scheduled) × 100%"
- [ ] 7. **Verify**: Tooltip has calm, reassuring language

**What to watch for:**
- GET `/api/habits/insights?days=14` on page load
- No loading state hangs

---

#### Test 6: Per-Habit Insights
- [ ] 1. Scroll to per-habit section
- [ ] 2. For each habit, **verify**:
  - [ ] Adherence % displays with tooltip
  - [ ] Current streak displays with tooltip
  - [ ] Best window displays (if enough data)
  - [ ] Skip reasons chart (if any skips)
- [ ] 3. Hover over "Best window" tooltip
- [ ] 4. **Expected**: Explains how windows are calculated (min 3 instances)

---

#### Test 7: Streak Reminder Banner ⭐ NEW
- [ ] 1. Create a habit with a streak (complete daily for 3+ days)
- [ ] 2. On the next day, DON'T complete it yet
- [ ] 3. Navigate to `/habits`
- [ ] 4. **Verify**: Red "Streak at Risk!" banner appears at top
- [ ] 5. **Verify**: Shows: "Your X-day streak for [Habit Name] will break..."
- [ ] 6. **Verify**: Two CTA buttons:
  - "Schedule rescue block" (red)
  - "Complete now" (white)
- [ ] 7. Click "Snooze 1h"
- [ ] 8. **Expected**: Banner disappears
- [ ] 9. Refresh page immediately
- [ ] 10. **Expected**: Banner stays hidden (localStorage persists)
- [ ] 11. Clear localStorage: `localStorage.removeItem('streakReminderSnoozedUntil')`
- [ ] 12. Refresh page
- [ ] 13. **Expected**: Banner reappears

**What to watch for:**
- atRiskHabits calculation from insights.habits.filter(h => h.streak.atRisk)
- localStorage keys: `streakReminderSnoozedUntil`, `streakReminderDismissed`

---

#### Test 8: CoachCard Suggestions
- [ ] 1. On `/habits`, look at CoachCard (Flow mascot)
- [ ] 2. **Verify**: Shows one of:
  - "Streak at risk" → Schedule rescue block
  - "Low adherence" → Adjust window or try shorter duration
  - "You're doing great!" (if no issues)
- [ ] 3. Click "Dismiss" (X button)
- [ ] 4. **Expected**: Success message
- [ ] 5. Refresh page
- [ ] 6. **Expected**: Card doesn't reappear for 7 days (or shows different suggestion)

**What to watch for:**
- POST `/api/habits/coach/dismiss` with suggestion details
- User.habitsCoachState updated in database

---

### C. Edge Cases & Error Handling

#### Test 9: Rapid Complete/Undo/Complete
- [ ] 1. Open a habit event
- [ ] 2. Click "Complete" rapidly 3 times
- [ ] 3. **Expected**: Only 1 completion recorded (idempotent)
- [ ] 4. Click "Undo" → "Complete" → "Undo" quickly
- [ ] 5. **Expected**: No race conditions, final state is correct

**What to watch for:**
- Backend returns existing completion on duplicate complete
- Optimistic UI doesn't show incorrect state

---

#### Test 10: Undo Expiry (24-hour window)
- [ ] 1. Complete a habit
- [ ] 2. In database, find HabitActionHistory record
- [ ] 3. Manually update `expiresAt` to 1 hour ago
- [ ] 4. Try to undo the completion
- [ ] 5. **Expected**: Error message: "Undo window expired"

**What to test manually:**
```sql
-- In Prisma Studio or psql
UPDATE "HabitActionHistory"
SET "expiresAt" = NOW() - INTERVAL '1 hour'
WHERE "entityId" = 'scheduled-habit-id-here';
```

---

#### Test 11: Timezone & DST Safety
**Note**: This is hard to test manually. Check automated tests instead.

- [ ] Review test file: `apps/backend/src/services/__tests__/habitEdgeCases.test.ts`
- [ ] **Verify**: Tests for DST transition exist
- [ ] **Verify**: Tests for timezone changes exist
- [ ] Run: `cd apps/backend && pnpm test habitEdgeCases`

---

#### Test 12: Network Errors
- [ ] 1. Open DevTools → Network tab
- [ ] 2. Enable "Offline" mode
- [ ] 3. Try to complete a habit
- [ ] 4. **Expected**: Error toast: "Failed to complete habit"
- [ ] 5. Disable offline mode
- [ ] 6. Retry
- [ ] 7. **Expected**: Success

---

### D. Analytics & Privacy ⚠️ TODO

**Status**: Analytics instrumentation NOT YET IMPLEMENTED

**Required events** (from Sprint 17 plan):
- [ ] `habit.instance.complete` - with habitId hash only
- [ ] `habit.instance.undo` - with habitId hash only
- [ ] `habit.instance.skip` - with habitId hash + reasonCode enum
- [ ] `habits.coach.action_taken` - action type + habitId hash
- [ ] `habits.coach.dismissed` - suggestion type + habitId hash
- [ ] `habits.streak.milestone_reached` - streak length only

**Privacy checks** (when implemented):
- [ ] **NEVER** log habit titles or descriptions
- [ ] Only log preset enum values (no free-text)
- [ ] Use `hashHabitId()` for all habit references
- [ ] Review all events for PII before shipping

---

### E. Performance & UX

#### Test 13: Insights Refresh Performance
- [ ] 1. Complete a habit
- [ ] 2. Measure time until insights update
- [ ] 3. **Expected**: Updates within 2-3 seconds
- [ ] 4. Check Network tab
- [ ] 5. **Verify**: Only 1 GET `/api/habits/insights` call (no duplicates)

---

#### Test 14: Tooltip Accessibility
- [ ] 1. Navigate to `/habits`
- [ ] 2. Tab to a MetricsTooltip "?" button
- [ ] 3. Press Enter
- [ ] 4. **Expected**: Tooltip opens via keyboard
- [ ] 5. Press Escape
- [ ] 6. **Expected**: Tooltip closes

---

#### Test 15: Mobile Responsiveness
- [ ] 1. Open DevTools → Toggle device toolbar
- [ ] 2. Test on iPhone 12 Pro size
- [ ] 3. **Verify**: StreakReminderBanner is readable
- [ ] 4. **Verify**: Skip reason dropdown works on touch
- [ ] 5. **Verify**: Tooltips don't overflow screen

---

## Known Issues to Test Around

### Issue 1: priorityRank Type Error
**File**: `apps/web/src/app/habits/page.tsx:55`
**Error**: `Property 'priorityRank' does not exist on type 'Habit'`

**Workaround for testing**: Ignore for now, doesn't affect habit completion flow.

---

### Issue 2: @dnd-kit/utilities Missing
**File**: `apps/web/src/components/habits/SortableHabitCard.tsx:8`

**Workaround**: Drag-to-reorder may not work, but doesn't block testing.

---

## Success Criteria

Sprint 17 is complete when:

### Must Have ✅
- [x] Complete/Undo/Skip from calendar popover works
- [x] Streak context shows in popover with accurate data
- [x] StreakReminderBanner appears when appropriate
- [x] MetricsTooltip explains calculations clearly
- [x] CoachCard shows actionable suggestions
- [ ] All manual tests pass (run this checklist)
- [ ] No console errors during normal flow
- [ ] Privacy-safe analytics implemented

### Should Have ⚠️
- [ ] Coach card actions work (rescue block scheduling - TODO in code)
- [ ] Undo works within 24h window
- [ ] Edge cases handled gracefully

### Nice to Have
- [ ] Mobile experience is polished
- [ ] Animations are smooth
- [ ] Loading states are pleasant

---

## Bug Reporting Template

If you find issues, report them with this format:

```markdown
**Bug**: [Short description]

**Steps to Reproduce**:
1.
2.
3.

**Expected**: [What should happen]
**Actual**: [What actually happened]

**Console Errors**: [Paste any errors]
**Network Calls**: [Any failed API calls]
**Browser**: [Chrome/Safari/Firefox + version]
```

---

## Next Steps After Testing

1. **If all tests pass:**
   - Update SPRINT_17_PROGRESS.md to 100% complete
   - Create a celebration commit 🎉
   - Move to Sprint 18 planning

2. **If bugs found:**
   - Document in KNOWN_ISSUES.md
   - Prioritize: blocker vs. polish
   - Fix blockers before considering sprint complete

3. **Analytics implementation:**
   - Add privacy-safe tracking to all habit actions
   - Review events list against Sprint 17 plan
   - Add `hashHabitId()` calls where needed

---

## Testing Tips

### Quick Test Data Setup

```javascript
// In browser console on /habits page
// This logs insights data structure for inspection
fetch('/api/habits/insights?days=14', {
  headers: { 'Authorization': 'Bearer YOUR_TOKEN' }
})
.then(r => r.json())
.then(console.log)
```

### Clear Reminder Snooze

```javascript
// In browser console
localStorage.removeItem('streakReminderSnoozedUntil')
localStorage.removeItem('streakReminderDismissed')
location.reload()
```

### Simulate At-Risk Habit

1. Complete a habit daily for 3 days
2. On day 4, don't complete it
3. Visit `/habits` later in the day (after preferredTimeOfDay)
4. Banner should appear

---

**Happy Testing! 🧪**
