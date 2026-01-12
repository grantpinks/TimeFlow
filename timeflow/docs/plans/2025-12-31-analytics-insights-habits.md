# Sprint Plan: Analytics & Insights (Habits-led) — North Star: Habit Consistency

**Last Updated:** 2026-01-09  
**Task Status:** For the current completion status of tasks, please refer to `ARCHITECT_ROADMAP_SPRINT1-17.md`.  

---

## Implementation Guide: What to Work On

This section provides a clear starting point and a logical sequence for completing the remaining tasks in Sprint 17.

### Remaining Tasks & Suggested Order:

1.  **Complete the Data Model (Task 17.1):**
    *   **Action:** Modify `apps/backend/prisma/schema.prisma`.
    *   Add `priorityRank` to the `Habit` model.
    *   Add `actualDurationMinutes` to the `HabitCompletion` model.
    *   Run `pnpm prisma migrate dev` to apply the changes.
    *   **Why:** This is a prerequisite for nearly all other remaining tasks.

2.  **Implement Habit Priority (Task 17.10):**
    *   **Backend:** Create an API endpoint (e.g., `POST /api/habits/reorder`) to update the `priorityRank` of habits.
    *   **Frontend:** Implement a UI on the `/habits` page to allow users to reorder their habits (e.g., using drag-and-drop).

3.  **Implement Actual Duration Capture (Task 17.13):**
    *   **Backend:** Update the `POST /api/habits/instances/:id/complete` endpoint to accept an `actualDurationMinutes` payload.
    *   **Frontend:** In the `EventDetailPopover.tsx` component, add an input field that appears during the habit completion flow to let users enter the actual time spent.

4.  **Wire Up UI Actions (Tasks 17.4, 17.6):**
    *   **Action:** In `HabitsInsights.tsx`, implement the `handleRecommendationAction` function.
    *   Connect the "action" buttons in the `CoachCard` and `Recommendations` components to the appropriate backend API calls (e.g., scheduling a rescue block, adjusting a habit window).

5.  **Implement Non-Adherence & Reminders (Tasks 17.11, 17.12, 17.8):**
    *   **Backend:** Implement the logic to detect "missed" high-priority habits.
    *   **Backend:** Create a service for sending opt-in notifications (in-app or email) for non-adherence and streaks at risk.
    *   **Frontend:** Build the UI in the settings page for users to manage these notification preferences.

6.  **Integrate Actual Duration into Analytics (Tasks 17.14, 17.15):**
    *   **Backend:** Update the `habitInsightsService.ts` to calculate "planned vs. actual" duration deltas.
    *   **Backend:** Add a new recommendation rule for significant planned vs. actual mismatches.
    *   **Frontend:** Update the `HabitsInsights.tsx` dashboard to display these new analytics. Add clear copy explaining how this data improves recommendations.

7.  **Finalize Analytics Instrumentation (Task 17.5):**
    *   **Action:** Review all the newly implemented features and ensure that relevant user interactions are tracked with analytics events, as defined in Section 8 of this plan.

---

**Primary Surface:** Habits page (`/habits`)  
**Secondary Surfaces:** Today (`/today`), Calendar (`/calendar`), Tasks (`/tasks`)  

---

## 1. Goal (What users get)

Help users **build habits consistently** (streaks + adherence) and make better weekly planning decisions using TimeFlow data. The experience should feel **reassuring and actionable**, not judgmental or overwhelming.

Users should be able to answer:
- **Am I doing my habits consistently?**
- **Which habits are slipping, and why?**
- **What time/day works best for each habit?**
- **What is one adjustment I should make next week to improve consistency?**

---

## 2. What data we already have access to (likely)

From the current product surfaces, TimeFlow already has (or can derive):

### 2.1. Calendar events (Google/Apple + TimeFlow-created)
- Start/end timestamps
- Title/description
- AI category + confidence + manual overrides (training signal)
- Overlaps, fragmentation, meeting density

### 2.2. Tasks
- Status: unscheduled/scheduled/completed
- Duration estimates (durationMinutes)
- Due dates, priorities
- Category (and color)
- ScheduledTask blocks with start/end (for tasks on calendar)

### 2.3. Habits
- Habit definitions (frequency, preferred time of day, duration)
- Habit suggestions (proposed/accepted/rejected) and accepted scheduling blocks
 - Scheduled habit instances (calendar blocks) via `ScheduledHabit` records (backend)

### 2.4. Email (if enabled)
- Inbox volume + read/unread
- Categories (focused vs promo)
- Compose/reply actions (if tracked)

### 2.5. App usage (instrumentable)
- Page visits
- Feature usage: Smart Schedule, Categorize Events, drag/drop scheduling, filters/search

---

## 3. Analytics principles (so the data is valuable)

### 3.1. “Answer a question” > “Show a chart”
Every chart must support a decision:
- “I’m spending too much time in meetings → batch meetings / protect focus blocks.”
- “My habit completion drops on Tue/Thu → adjust schedule or duration.”

### 3.2. Focus on deltas + trends
Users care more about:
- Week-over-week change
- Consistency streaks
- Variance and “stress signals” (fragmentation, late-night load)

### 3.3. Put recommendations next to evidence
Each recommendation should show:
- The metric that triggered it
- What to change (one action)
- Expected benefit

### 3.4. Calm framing
Use neutral language:
- “Opportunity” / “pattern” / “tradeoff”
- Avoid “failure” or “you didn’t”

---

## 4. Habits page: Proposed Analytics Modules (MVP → V2)

### 4.1. MVP: “Habits Dashboard” (top of `/habits`) — Consistency First

#### A) Habit Consistency (per habit)
- **Chart**: last 14/28 days “scheduled vs completed” (binary per habit-instance)
- **Metric**: adherence rate (e.g., 8/12 = 67%)
- **Signal**: best day/time windows for each habit (highest completion probability)
- **Streaks**: current streak, best streak, and “last completed” timestamp

#### B) Habit Time Investment (supporting)
- **Chart**: minutes/week by habit (stacked bar)
- **Metric**: total habit minutes scheduled vs completed minutes (shows follow-through). **V2:** Will use `actualDurationMinutes`.

#### C) Stability (supporting)
- **Metric**: schedule stability (how often the habit happens in its “best window”)
- **Metric**: volatility (how often time-of-day shifts week-to-week)

#### D) “Suggested adjustments” (1–3 cards) — explainable, streak-oriented
Examples:
- “Your ‘Check Email’ habit gets scheduled late and often moved. Try moving it to a 20-min block at 10:30am.”
- “Your habit duration may be too long for weekdays. Consider 20 min on weekdays, 40 min weekends.”
 - “You’re consistent on Mon/Wed but miss Thu. Add a lighter ‘minimum viable’ version on Thu.”

### 4.2. V2: “Time Alignment” (Habits vs Priorities) — only if it supports consistency

#### A) Time Allocation by Category (this week)
- **Chart**: donut or stacked bar: `Professional / Personal / Schoolwork / Misc / Meetings`
- **Source**: calendar categorization + scheduled tasks

#### B) “Habit share” of time
- Show habits as a portion of total scheduled time (helps with sustainability)

#### C) “Over-commitment” indicators
- Late-night scheduled blocks
- Too little buffer time
- Too many context switches (fragmentation)

### 4.3. V3: Cohort-style insights (optional)
- “Users like you” comparisons are risky; consider skipping unless you have strong privacy/opt-in.

---

## 5. Cross-app analytics ideas (lightweight + high value, consistency reinforcing)

### 5.1. Today page: “Daily pulse” (small)
- Habits due today: scheduled vs completed
- “Keep the streak alive” prompt (only if a streak is at risk)
- “One adjustment for tomorrow” (single recommendation)

### 5.2. Calendar page: “Week health” (only the parts that affect habit consistency)
- Meeting load (hrs) + meeting fragmentation
- Focus blocks protected (hrs)
- “Most disrupted day” (largest reschedules / highest overlap)
 - Habit collisions: when habits overlap/lose their intended window

### 5.3. Tasks page: “Task realism”
- Estimated vs actual time (if actual becomes trackable later)
- Carryover rate (tasks created vs completed same week)
- “Planning debt”: unscheduled minutes lingering

---

## 6. Metrics we can compute (examples)

### 6.1. Time allocation
- Minutes by category per day/week/month
- Meetings vs focus vs admin
- Unplanned time (free blocks) vs planned time

### 6.2. Fragmentation / stress signals
- Context switches per day (category transitions)
- Avg event duration + % of events under 30 minutes
- Meeting clustering score (are meetings batched?)
- Buffer time between events

### 6.3. Task execution
- Completion rate by category/priority
- Due date risk: tasks scheduled after due date / close to due date
- Reschedule churn: # of times a task block moves

### 6.4. Habit adherence (north star)
- **Instance completion rate**: completed / scheduled per habit
- **Streaks**: current/best streak (definition below)
- **Consistency windows**: completion probability by day-of-week and time-of-day bucket
- **Suggestion funnel**: proposed → accepted → completed (where the drop-off is)
- **Churn**: how often habit blocks are moved/cancelled
- **Planned vs. Actual Duration:** Delta between scheduled minutes and `actualDurationMinutes`.

### 6.5. App usage
- Feature adoption: Smart Schedule, Categorize Events
- Time-to-plan: how quickly user schedules tasks after opening Today
- Engagement loops: habit edits, category training frequency

---

## 7. Recommendations engine (rules-first MVP)

Start with rules-based insights (fast, explainable), then iterate.

### 7.1. Example recommendation rules
- **Over-meeting**: if meetings > X hrs/week → recommend batching + 2 focus blocks
- **Low habit adherence**: if adherence < Y% → recommend shorter duration or different time-of-day
- **Fragmentation**: if > N context switches/day → recommend grouping similar tasks
- **Late scheduling**: if many tasks scheduled after 6pm → suggest earlier blocks or reduce scope
- **Streak at risk**: if habit is usually completed by now but isn’t today → suggest the next best slot + “minimum viable” duration
- **Planned vs. Actual Mismatch**: if `actualDurationMinutes` is consistently much higher/lower than planned duration → recommend adjusting the default duration for the habit.

### 7.2. Recommendation output format
- “What we noticed” (metric)
- “Why it matters” (brief)
- “Try this” (one step)
- “Preview impact” (optional)

---

## 8. Instrumentation plan (what to log)

### 8.1. Event naming convention
`<domain>.<action>.<object>`
Examples:
- `page.view.today`
- `page.view.habits`
- `task.create`
- `task.complete`
- `task.schedule.drag_drop`
- `schedule.smart_run`
- `calendar.categorize_all`
- `habit.create`
- `habit.suggestion.accept`
- `habit.suggestion.reject`
- `habit.instance.complete`
- `habit.instance.uncomplete`
- `habit.instance.skip`
- `habit.instance.reschedule` (if supported)
- `habit.priority.reorder`
- `habit.notification.send`
- `habit.notification.dismiss`

### 8.2. Common properties
- `user_id` (hashed or internal id)
- `timestamp`
- `page`
- `source` (button/menu/shortcut)
- `category_id` (if relevant)
- `duration_minutes` (if relevant)
- `actual_duration_minutes` (if relevant)
- `confidence` (for AI categorization)

### 8.3. Privacy guardrails
- Never log email subjects/bodies, event descriptions, or task titles in analytics by default
- Prefer counts + durations + category ids
- Make analytics exportable and deletable (future)

---

## 9. Habits page UI layout (proposed)

Top-to-bottom:
1) **Habits Dashboard (Insights)**: charts + 1–3 recommendation cards
2) **Your Habits (CRUD)**: existing management list with UI for priority ranking (e.g., drag-and-drop reordering).
3) Optional: “Habit Suggestions” feed (if useful) or link back to Today

Key: analytics should feel like the “headline,” CRUD is still available but secondary.

---

## 10. Deliverables (Sprint)

### 10.1. MVP Deliverables
- Habits page “Insights” section with:
  - Habit adherence chart (14/28d)
  - Minutes/week by habit
  - 1–3 recommendations (rules-based)
- **Habit completion tracking (required for streaks)**
  - Users can mark a scheduled habit instance as complete from:
    - Calendar event popover (preferred)
    - Habits page “Today’s habits” / “Due today” list (backup)
  - Completion state persists and is queryable by date range
- **Actual Duration Capture:** UI in the completion flow to enter `actualDurationMinutes`.
- **Habit Priority:** UI on the habits management page to set `priorityRank`.
- **Non-Adherence Notifications:** Basic opt-in system for notifications on missed high-priority habits.
- Data aggregation endpoints or client-side aggregation (depending on architecture)
- Instrumentation events for:
  - page views
  - habit CRUD
  - habit suggestion accept/reject
  - habit instance complete/uncomplete/skip
  - habit priority changes
  - non-adherence notifications

### 10.2. Nice-to-have
- Time allocation by category (week)
- “+N more” style drill-down modals for charts

---

## 11. Definition of Done (Acceptance)
- Users can open `/habits` and immediately see:
  - at least **2 charts** and **1 recommendation**
  - clear time range switching (e.g., 7d / 28d)
- Users can set a priority for their habits.
- Users can input the actual duration when completing a habit.
- Charts render fast and remain readable in light/dark (when enabled)
- No sensitive content is logged (no titles/subjects in analytics)
- Recommendations are explainable (shows the “why”)

---

## 12. Habit Completion + Streaks (Product + Data Requirements)

This sprint’s north star requires turning scheduled habit blocks into **trackable, completable instances**.

### 12.1. Source of truth for “habit instances”
We already create a `ScheduledHabit` when a suggestion is accepted (and it stores `eventId`, `startDateTime`, `endDateTime`).

**Recommendation (MVP):** Use a separate `HabitCompletion` model to cleanly handle multiple completions, retroactive corrections, and actual duration.

### 12.2. Data model changes (MVP)
Add to `Habit`:
- `priorityRank`: Int (e.g., 1-5, for ordering and notification logic)

Add `HabitCompletion` model:
- `id`: CUID
- `scheduledHabitId`: FK to `ScheduledHabit`
- `status`: "completed" | "skipped"
- `completedAt`: DateTime
- `reasonCode`: String? (for skips)
- `actualDurationMinutes`: Int? (optional, captured on completion)

### 12.3. API endpoints (MVP)
- `GET /api/habits/instances?from=...&to=...` → returns scheduled habit instances in range
- `POST /api/habits/instances/:id/complete` → marks completed (idempotent), optionally accepts `actualDurationMinutes`.
- `POST /api/habits/instances/:id/uncomplete` → reverts completion
- `POST /api/habits/instances/:id/skip` → marks skipped
- `POST /api/habits/reorder` → accepts an array of `habitId`s in the new priority order.

### 12.4. Calendar integration (MVP UX)
In Calendar event popover:
- If event corresponds to a habit instance, show:
  - “Mark complete” / “Undo complete”
  - An optional input field for "Actual time spent" upon clicking "Mark complete".
  - optional “Skip”
  - streak context (“This keeps your 6‑day streak alive”)

Mapping strategy:
- When rendering calendar items, include TimeFlow metadata so habit events can be recognized.
  - Option A: fetch habit instances separately and render them as `isHabit` events (recommended)
  - Option B: detect `[Habit]` prefix from external events (fragile; avoid)

### 12.5. Streak definition (MVP)
Define streak per habit as:
- A “day” counts if at least one instance of the habit scheduled that day is **completed** (or define stricter: “all instances completed”).
- Streak breaks if a scheduled day has no completion and is not explicitly skipped.

### 12.6. Supporting analytics that matter to users (consistency-adjacent)
Add 1–2 of these if low effort:
- **Best window**: completion rate by time-of-day bucket (morning/afternoon/evening)
- **Habit drag**: how often a habit gets pushed later than its preferred time
- **Sustainability**: average scheduled habit minutes/day and variance (too much variance predicts drop-off)

---

## 13. Non-Adherence & Priority (New Scope)

### 13.1. Non-Adherence Detection
- **Definition:** A habit instance is considered "missed" if its `endDateTime` has passed by a defined grace period (e.g., 2 hours) and it has no `HabitCompletion` record.
- **Backend Logic:** A scheduled job (e.g., runs every hour) or a just-in-time check can be used to detect missed instances and update their status accordingly (e.g., a virtual `missed` status, or logging it).

### 13.2. Non-Adherence Notifications
- **Trigger:** When a "missed" habit instance is detected, check its `priorityRank`.
- **Logic:** Only send notifications for high-priority habits (e.g., `priorityRank` 1 or 2).
- **Delivery:**
  - **In-App:** A subtle notification in the app's notification center or a banner on the "Today" page.
  - **Email:** A daily summary of missed high-priority habits, or an immediate email (less desirable due to noise).
- **Opt-In:** All non-adherence notifications must be opt-in, with granular controls in the user's settings page (global toggle and per-habit toggle).

### 13.3. Priority in Coaching
- The "Coach Card" and "Recommendations" should prioritize suggestions for habits with a higher `priorityRank`. For example, a "streak at risk" for a P1 habit is more important than for a P3 habit.


