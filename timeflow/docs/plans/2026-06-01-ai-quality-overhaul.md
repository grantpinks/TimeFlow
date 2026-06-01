# AI Quality Overhaul Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Transform Flow from a terse scheduling bot into a concise executive-coach assistant that gives rich, narrative daily briefings and context-aware suggestion chips.

**Architecture:** Four independent tracks that can be executed sequentially. Tracks 1–2 are backend prompt/context changes. Track 3 is a frontend dynamic chip change. Track 4 is a new "daily briefing" intent that wires all tracks together. No new API endpoints needed — the existing `/assistant/chat` route handles everything.

**Tech Stack:** TypeScript (Fastify backend, Next.js frontend), text prompt files (`src/prompts/*.txt`), `assistantService.ts` for context injection and intent detection, `assistant/page.tsx` for frontend chips.

---

## Track 1: Prompt Rewrites

### Task 1.1: Rewrite `base.txt` — remove 200-word cap, add executive-coach personality

**Files:**
- Modify: `timeflow/apps/backend/src/prompts/base.txt`

**Step 1: Read the current file**

Open `timeflow/apps/backend/src/prompts/base.txt`. Note that line 4 says "Maximum response length: 200 words total". This cap is the primary reason rich responses get truncated.

**Step 2: Replace the file contents entirely**

Replace with:

```
I'm Flow, your TimeFlow scheduling assistant. I cut through noise and surface what matters — with the directness of an executive coach and the efficiency of a great assistant.

**RESPONSE LENGTH RULES**:
- Match length to complexity: simple questions get 1-3 sentences; daily briefings can use up to 400 words
- Never pad. Never hedge. Never repeat yourself.
- If a list is cleaner than prose, use a list. If prose flows better, use prose.

**FORMATTING**:
- Use markdown: ## headings, **bold** for times/priorities, bullet points for lists
- Add blank lines before and after lists for readability
- Use 12-hour time format ("9:00 AM", not "09:00")
- NEVER use generic section labels like "Key Points" or "Summary"

**MY CAPABILITIES**:
- Read your Google Calendar (next 7 days of events)
- See all your tasks: priority, due dates, estimated durations
- Know your habits: frequency, preferred times, completion status
- Identify conflicts, overdue items, and deadline pressure
- Recommend what to do next and why

**COMMUNICATION STYLE**:
- Direct and specific — "You have 3 hours free from 10 AM–1 PM" not "you have some free time in the morning"
- Surfaces what matters without being asked — if something is overdue or a collision exists, say so
- One clear recommendation per response; don't list five options and punt the decision back
- Use "I" and "you" naturally
- No filler phrases ("Great question!", "Of course!", "Certainly!")

**SCHEDULING RULES** (when recommending schedules):
- Prioritize by priority level: HIGH (1) before MEDIUM (2) before LOW (3)
- Respect due dates — earliest deadlines schedule first
- Habits: respect frequency (daily/weekly) and preferred time of day
- Never overlap existing calendar events
- All blocks must start AND end within wake/sleep hours
- Flag tasks that will miss deadlines even if scheduled

**HABIT TIME WINDOWS**:
- morning = wake time through noon
- afternoon = noon through 5 PM
- evening = 5 PM through sleep time
```

**Step 3: There is no test to run for prompt files** — we verify visually after Task 4.3 (integration test). Skip to commit.

**Step 4: Commit**

```bash
git add timeflow/apps/backend/src/prompts/base.txt
git commit -m "feat(ai): rewrite base prompt — remove 200-word cap, add executive-coach voice"
```

---

### Task 1.2: Rewrite `availability.txt` — teach it to give narrative daily briefings

**Files:**
- Modify: `timeflow/apps/backend/src/prompts/availability.txt`

**Context:** "What does my day look like?" routes to `availability` mode (line 929–930 of `assistantService.ts`). The current `availability.txt` is good at listing free slots but never produces a narrative briefing that includes tasks, habits, and priorities — it only shows free time.

**Step 1: Read the current file**

Open `timeflow/apps/backend/src/prompts/availability.txt`. It is 345 lines and handles many query patterns well. We are adding a new section for **daily briefing** queries at the top.

**Step 2: Prepend a DAILY BRIEFING section before the existing content**

Insert this block at the very top of `availability.txt`, before "**AVAILABILITY MODE**":

```
**DAILY BRIEFING MODE** (triggers: "what does my day look like", "what's my day look like", "how does my day look", "morning briefing", "today overview", "what's today look like", "run me through my day", "walk me through my day")

When the user asks for a daily overview, produce a **narrative briefing**, not just a free-time list. Structure:

1. **Opening sentence** — one sharp line that sets the tone for the day (e.g., "You have a focused morning with 4 hours of clear time, then a meeting-heavy afternoon.")
2. **Committed time** — list today's calendar events with start/end times
3. **Priorities** — list any tasks due today or marked URGENT, or the top 1-2 highest-priority unscheduled tasks
4. **Habits today** — list any habits scheduled or due today
5. **Your biggest free block** — one line identifying the largest open window and what it's good for
6. **One recommendation** — a single direct suggestion (e.g., "I'd use that 10 AM–1 PM block for [top task] — it's your highest-focus window.")

**Tone**: Confident, direct. You've reviewed their day; you're briefing them like an assistant who already did the analysis.

**Length**: 150–350 words for a daily briefing. Don't truncate it to fit a shorter limit — a morning brief should feel complete.

**If today is empty** (no events, no tasks due, no habits): Say so plainly and pivot to the week — "Today is clear. Your next commitment is [X] on [day]."

---
```

**Step 3: Commit**

```bash
git add timeflow/apps/backend/src/prompts/availability.txt
git commit -m "feat(ai): add narrative daily briefing pattern to availability mode"
```

---

### Task 1.3: Rewrite `conversation.txt` — richer examples, remove boilerplate CTA

**Files:**
- Modify: `timeflow/apps/backend/src/prompts/conversation.txt`

**Context:** Conversation mode handles questions like "what tasks do I have?", "what should I focus on?", "am I behind on anything?". Currently it has 56 lines with thin examples and always ends with "Would you like me to schedule...?"

**Step 1: Replace the file contents entirely**

```
**CONVERSATION MODE**

Answer questions about tasks, schedule, habits, priorities, and workload. You have full context — use it.

**RULES**:
1. Never generate [STRUCTURED_OUTPUT] or modify schedules in this mode
2. Be specific with data from context — cite actual task names, times, due dates
3. Don't end every message with "Would you like me to schedule?" — only suggest scheduling when it's genuinely the right next step
4. If something is overdue or a deadline is at risk, say so unprompted

**RESPONSE LENGTH**:
- Simple factual question (1 task, 1 date) → 1-3 sentences
- Priority review or workload question → 100-200 words
- "What should I focus on?" or multi-part question → up to 250 words

---

**EXAMPLES**

User: "What tasks do I have?"

## Your Tasks

You have **4 unscheduled tasks**:

- **Fix login bug** (45 min) — HIGH priority, due tomorrow
- **Write quarterly report** (2 hrs) — HIGH priority, due Friday
- **Update team docs** (30 min) — MEDIUM priority, no due date
- **Research new tools** (1 hr) — LOW priority, no due date

The login bug and quarterly report are your time-sensitive items. Want me to schedule them?

---

User: "What should I focus on right now?"

## Focus Recommendation

**Fix login bug** — it's HIGH priority and due tomorrow. At 45 minutes, it fits in almost any gap you have today.

After that, **Write quarterly report** is your next most urgent item (due Friday, 2 hours). You'll want to start it today if you haven't.

---

User: "Am I behind on anything?"

## Deadline Check

Yes — **Fix login bug** was due yesterday and hasn't been scheduled. That's your most urgent item.

Everything else is on track: your next deadline is the quarterly report on Friday, which you still have time for.

---

User: "How's my week looking?"

## This Week

**Today**: [summarize today's calendar and tasks due]
**Tomorrow**: [next key commitment or deadline]
**Rest of week**: [flag any pressure points]

Your busiest day is [day] with [X hours] of commitments. You have the most open time on [day].

---

**Remember**: In conversation mode, you inform and advise — you don't take scheduling actions. Be direct and specific; don't hedge or pad.
```

**Step 2: Commit**

```bash
git add timeflow/apps/backend/src/prompts/conversation.txt
git commit -m "feat(ai): rewrite conversation mode — richer examples, drop boilerplate CTA"
```

---

## Track 2: Context Enrichment for Daily Briefings

### Task 2.1: Add `detectDailyBriefingIntent` function

**Files:**
- Modify: `timeflow/apps/backend/src/services/assistantService.ts` (near line 345 where `detectDailyPlanIntent` lives)

**Context:** When a user asks "what does my day look like?", we want to inject a richer `TODAY_SUMMARY` section into the context prompt. First we need to detect that intent.

**Step 1: Write a test**

Open `timeflow/apps/backend/src/services/__tests__/assistantService.test.ts`. Add these test cases near the existing `detectDailyPlanIntent` tests (search for that function name):

```typescript
describe('detectDailyBriefingIntent', () => {
  it('detects "what does my day look like"', () => {
    expect(detectDailyBriefingIntent('what does my day look like')).toBe(true);
  });
  it('detects "whats my today look like"', () => {
    expect(detectDailyBriefingIntent("what's my today look like")).toBe(true);
  });
  it('detects "run me through my day"', () => {
    expect(detectDailyBriefingIntent('run me through my day')).toBe(true);
  });
  it('returns false for unrelated query', () => {
    expect(detectDailyBriefingIntent('when am I free tomorrow')).toBe(false);
  });
});
```

Note: `detectDailyBriefingIntent` is not exported yet — you will need to export it after adding it, or test it via the public `processMessage` path. Prefer exporting it for testability.

**Step 2: Run the test to confirm it fails**

```bash
cd timeflow/apps/backend
pnpm test -- --testPathPattern="assistantService.test" 2>&1 | tail -20
```

Expected: FAIL — `detectDailyBriefingIntent is not a function`

**Step 3: Add the function to `assistantService.ts`**

Find the `detectDailyPlanIntent` function (around line 345). Immediately after it, add:

```typescript
/**
 * Detect if the user wants a rich narrative daily briefing.
 * These queries route to availability mode but deserve a more complete response.
 */
export function detectDailyBriefingIntent(userMessage: string): boolean {
  const lower = userMessage.toLowerCase();
  const dailyBriefingPhrases = [
    'what does my day look like',
    "what's my day look like",
    'whats my day look like',
    'what does today look like',
    "what's today look like",
    'whats today look like',
    'how does my day look',
    'run me through my day',
    'walk me through my day',
    'morning briefing',
    'today overview',
    'overview of my day',
    'brief me on today',
    'brief me on my day',
    "what's my today look like",
    'whats my today look like',
  ];
  return dailyBriefingPhrases.some((phrase) => lower.includes(phrase));
}
```

**Step 4: Run the test to confirm it passes**

```bash
cd timeflow/apps/backend
pnpm test -- --testPathPattern="assistantService.test" 2>&1 | tail -20
```

Expected: PASS

**Step 5: Commit**

```bash
git add timeflow/apps/backend/src/services/assistantService.ts timeflow/apps/backend/src/services/__tests__/assistantService.test.ts
git commit -m "feat(ai): add detectDailyBriefingIntent for richer context injection"
```

---

### Task 2.2: Inject `TODAY_SUMMARY` block into context when daily briefing is detected

**Files:**
- Modify: `timeflow/apps/backend/src/services/assistantService.ts` (around line 1936 where `dailyPlanRequest` context is injected)

**Context:** When `detectDailyBriefingIntent` returns true, we want to inject a pre-computed `TODAY_SUMMARY` section that tells the AI exactly what's happening today — committed hours, free hours, overdue items — so it doesn't have to compute this from raw lists.

**Step 1: Add a helper function `buildTodaySummaryBlock`**

Find the block at line ~1936 (`if (dailyPlanRequest)`). Above that block, add a new helper function. Search for a good place near other `build*` helpers (search for `buildFixedEventsContext`). Add after that block:

```typescript
/**
 * Build a pre-computed TODAY_SUMMARY block for daily briefing queries.
 * This gives the LLM synthesized data rather than making it compute it from raw lists.
 */
function buildTodaySummaryBlock(
  calendarEvents: any[],
  scheduledTasks: { title: string; scheduledTask: { startDateTime: Date; endDateTime: Date } | null }[],
  unscheduledTasks: { title: string; priority: number; dueDate: Date | null }[],
  wakeTime: string,
  sleepTime: string,
  timeZone: string,
  now: Date
): string {
  const todayStart = new Date(now);
  todayStart.setHours(0, 0, 0, 0);
  const todayEnd = new Date(now);
  todayEnd.setHours(23, 59, 59, 999);

  // Filter to today's events
  const todayEvents = calendarEvents.filter((e) => {
    const eventStart = new Date(e.start);
    return eventStart >= todayStart && eventStart <= todayEnd;
  });

  // Compute committed minutes from calendar events
  const committedMinutes = todayEvents.reduce((sum, e) => {
    const durationMs = new Date(e.end).getTime() - new Date(e.start).getTime();
    return sum + durationMs / 60000;
  }, 0);
  const committedHours = (committedMinutes / 60).toFixed(1);

  // Wake/sleep as total available minutes
  const [wakeH, wakeM] = wakeTime.split(':').map(Number);
  const [sleepH, sleepM] = sleepTime.split(':').map(Number);
  const totalAvailableMinutes = (sleepH * 60 + sleepM) - (wakeH * 60 + wakeM);
  const freeMinutes = Math.max(0, totalAvailableMinutes - committedMinutes);
  const freeHours = (freeMinutes / 60).toFixed(1);

  // Overdue tasks (due date is in the past)
  const overdue = unscheduledTasks.filter(
    (t) => t.dueDate && new Date(t.dueDate) < now
  );

  // Tasks due today
  const dueToday = unscheduledTasks.filter((t) => {
    if (!t.dueDate) return false;
    const d = new Date(t.dueDate);
    return d >= todayStart && d <= todayEnd;
  });

  let block = `**TODAY_SUMMARY** (pre-computed for your briefing response):\n`;
  block += `- Committed time today: ${committedHours} hours (${todayEvents.length} calendar events)\n`;
  block += `- Estimated free time today: ${freeHours} hours\n`;

  if (overdue.length > 0) {
    const titles = overdue.map((t) => `${t.title} (${t.priority === 1 ? 'HIGH' : t.priority === 2 ? 'MEDIUM' : 'LOW'})`).join(', ');
    block += `- ⚠️ OVERDUE tasks: ${titles}\n`;
  } else {
    block += `- No overdue tasks\n`;
  }

  if (dueToday.length > 0) {
    const titles = dueToday.map((t) => t.title).join(', ');
    block += `- Tasks due today: ${titles}\n`;
  } else {
    block += `- No tasks due today\n`;
  }

  block += `\nUse this data in your briefing. Do not re-list all 7 days of calendar events — focus on today.\n\n`;
  return block;
}
```

**Step 2: Call `buildTodaySummaryBlock` when daily briefing intent is detected**

Find the `if (dailyPlanRequest)` block at line ~1936. After it, add:

```typescript
  // Inject pre-computed TODAY_SUMMARY for daily briefing queries
  if (detectDailyBriefingIntent(userMessage)) {
    prompt += buildTodaySummaryBlock(
      calendarEvents,
      scheduledTasks,
      unscheduledTasks,
      user.wakeTime,
      user.sleepTime,
      user.timeZone,
      now
    );
  }
```

**Step 3: Run the full test suite to confirm nothing is broken**

```bash
cd timeflow/apps/backend
pnpm test 2>&1 | tail -30
```

Expected: All existing tests pass. No new failures.

**Step 4: Commit**

```bash
git add timeflow/apps/backend/src/services/assistantService.ts
git commit -m "feat(ai): inject TODAY_SUMMARY context block for daily briefing queries"
```

---

## Track 3: Dynamic Pre-Prompt Chips

### Task 3.1: Replace static `quickActions` with time-of-day dynamic chips

**Files:**
- Modify: `timeflow/apps/web/src/app/assistant/page.tsx` (around line 511 where `quickActions` is defined)

**Context:** Currently `quickActions` is a hardcoded array of 6 strings. We want it to change based on the hour of day, producing chips that feel relevant to where the user is in their day.

**Step 1: Read the current `quickActions` definition and usage**

Open `timeflow/apps/web/src/app/assistant/page.tsx`. Find line 511. Note how `quickActions` is rendered around line 780 — it maps over the array and renders each as a button.

**Step 2: Replace the static definition with a dynamic function**

Find and replace the static `quickActions` array (lines ~511–518) with:

```typescript
  // Dynamic chips based on time of day
  const quickActions = useMemo(() => {
    const hour = new Date().getHours();
    const isMorning = hour >= 5 && hour < 12;
    const isAfternoon = hour >= 12 && hour < 17;
    const isEvening = hour >= 17 || hour < 5;

    if (isMorning) {
      return [
        "What does my day look like?",
        "Set my priorities for today",
        "What habits do I have today?",
        "Schedule my high priority tasks",
        "What's due today?",
        "Walk me through my day",
      ];
    }

    if (isAfternoon) {
      return [
        "How am I tracking today?",
        "What should I focus on next?",
        "Schedule my remaining tasks",
        "Do I have time for a 2-hour block this afternoon?",
        "Am I behind on anything?",
        "What's my busiest day this week?",
      ];
    }

    // Evening
    return [
      "Plan tomorrow's schedule",
      "What did I not finish today?",
      "Reschedule what I missed today",
      "What's due tomorrow?",
      "When am I free tomorrow?",
      "Optimize my week",
    ];
  }, []);
```

**Step 3: Add `useMemo` import if not already present**

Check the imports at the top of `assistant/page.tsx`. If `useMemo` is not already imported from React, add it:

```typescript
import { useState, useRef, useEffect, useCallback, useMemo } from 'react';
```

**Step 4: Verify the UI still renders**

```bash
cd timeflow/apps/web
pnpm dev 2>&1 &
# open http://localhost:3000/assistant and verify chips render based on current time of day
```

**Step 5: Commit**

```bash
git add timeflow/apps/web/src/app/assistant/page.tsx
git commit -m "feat(ai): replace static quick-action chips with time-of-day dynamic suggestions"
```

---

## Track 4: Integration Verification

### Task 4.1: Also update `FlowAIAssistantPanel.tsx` quick actions (panel version)

**Files:**
- Modify: `timeflow/apps/web/src/components/ai/FlowAIAssistantPanel.tsx` (around line 69 where another `quickActions` array lives)

**Context:** There are two places where quick action chips are defined — the main assistant page and the slide-in panel. Both need to be updated.

**Step 1: Find and replace the static quickActions in the panel**

Open `timeflow/apps/web/src/components/ai/FlowAIAssistantPanel.tsx`. Find lines 69–94 (the `quickActions` array). Replace with the same time-of-day dynamic version, using `useMemo`:

```typescript
  const quickActions: QuickAction[] = useMemo(() => {
    const hour = new Date().getHours();
    const isMorning = hour >= 5 && hour < 12;
    const isAfternoon = hour >= 12 && hour < 17;

    if (isMorning) {
      return [
        { id: 'daily-brief', icon: '🌅', label: "What's my day look like?", prompt: "What does my day look like?" },
        { id: 'priorities', icon: '🎯', label: 'Set priorities', prompt: 'What should I prioritize today?' },
        { id: 'schedule', icon: '📅', label: 'Schedule tasks', prompt: 'Schedule my high priority tasks.' },
        { id: 'habits', icon: '🔁', label: 'Habits today', prompt: 'What habits do I have today?' },
      ];
    }

    if (isAfternoon) {
      return [
        { id: 'tracking', icon: '📊', label: 'How am I tracking?', prompt: 'How am I tracking today against my plan?' },
        { id: 'next-focus', icon: '⚡', label: 'What next?', prompt: 'What should I focus on next?' },
        { id: 'remaining', icon: '📅', label: 'Schedule remaining', prompt: 'Schedule my remaining unscheduled tasks.' },
        { id: 'behind', icon: '⚠️', label: 'Am I behind?', prompt: 'Am I behind on anything today?' },
      ];
    }

    return [
      { id: 'plan-tomorrow', icon: '📅', label: 'Plan tomorrow', prompt: "Plan tomorrow's schedule." },
      { id: 'missed', icon: '🔄', label: 'What did I miss?', prompt: "What tasks did I not finish today?" },
      { id: 'due-tomorrow', icon: '🎯', label: "Due tomorrow", prompt: "What's due tomorrow?" },
      { id: 'week', icon: '📊', label: 'Optimize week', prompt: 'Help me optimize my week.' },
    ];
  }, []);
```

Add `useMemo` to the React import at the top of the file if not present.

**Step 2: Commit**

```bash
git add timeflow/apps/web/src/components/ai/FlowAIAssistantPanel.tsx
git commit -m "feat(ai): update panel quick-action chips to time-of-day dynamic suggestions"
```

---

### Task 4.2: Manual smoke test

Run the app locally and test the following queries:

```bash
cd timeflow
pnpm dev
```

Open `http://localhost:3000/assistant`

**Test 1 — Daily briefing (primary fix)**
Ask: "What does my day look like?"
Expected: A narrative response (100–350 words) with: opening line, today's events, task priorities, habits today, biggest free block, one recommendation.
NOT expected: A one-line vague answer about timeslots.

**Test 2 — Availability query (should still work)**
Ask: "When am I free today?"
Expected: The existing availability response format (time slots listed).

**Test 3 — Task question (conversation mode)**
Ask: "What tasks do I have?"
Expected: A specific list of actual tasks with priorities and due dates.

**Test 4 — Chip rendering**
If testing in the morning (before noon), chips should include "What does my day look like?" and "Set my priorities for today".

**Test 5 — Follow-up**
After the daily briefing, ask "Schedule my high priority tasks"
Expected: Routing to scheduling mode with a STRUCTURED_OUTPUT block.

---

### Task 4.3: Run the full backend test suite

```bash
cd timeflow/apps/backend
pnpm test 2>&1 | tail -30
```

Expected: All tests pass. Fix any failures before proceeding.

---

### Task 4.4: Final commit and push

```bash
cd timeflow
git log --oneline -8
git push
```

Verify all 7+ commits from this sprint are present in the log.

---

## Summary of Changes

| File | Change |
|------|--------|
| `src/prompts/base.txt` | Removed 200-word cap; added executive-coach personality |
| `src/prompts/availability.txt` | Added daily briefing pattern at top |
| `src/prompts/conversation.txt` | Richer examples, removed boilerplate CTA |
| `src/services/assistantService.ts` | Added `detectDailyBriefingIntent`, `buildTodaySummaryBlock`, context injection |
| `apps/web/src/app/assistant/page.tsx` | Dynamic time-of-day chips |
| `apps/web/src/components/ai/FlowAIAssistantPanel.tsx` | Dynamic time-of-day chips in panel |

## What Success Looks Like

- "What does my day look like?" returns a 150–300 word narrative briefing, not a one-liner
- The response references actual calendar events, task names, habits, and a recommendation
- Chip suggestions change based on whether it's morning, afternoon, or evening
- All existing tests still pass
- No regressions to scheduling or availability modes
