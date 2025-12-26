# Sprint 13 Must Pass Flow Run

Date: 2025-12-26
Tester: Codex
Backend: http://localhost:4000
Model: OPENAI_MODEL=gpt-4o-mini (apps/backend/.env)
User: grantpinks@gmail.com

## Preconditions

- Backend running.
- User has 1 unscheduled task: "Pack for Florida" (60 min, due 2025-12-26).
- Calendar includes a fixed event labeled "Flight to Fort Myers" at 5:57 PM (per assistant context).

## Flow Steps and Results

1) Ask: "What's my daily plan for today?"
   - Result: OK. Conversation response returned with a daily plan.
   - Preview: none (expected).

2) Schedule: "Schedule my tasks for today."
   - Result: FAIL. Schedule preview returned with 0 blocks.
   - Conflicts: Task cannot be scheduled due to fixed event at 5:57 PM.
   - Issue: There appears to be available time earlier in the day, but preview is empty.

3) Schedule (alt): "Schedule my tasks for tomorrow morning."
   - Result: PARTIAL. Schedule preview returned with 3 blocks.
   - Conflicts: Invalid task IDs for "Check Email" and "Stretch".
   - Issue: LLM invented tasks/habits and labeled them as taskId.

4) Apply schedule (using blocks from step 3).
   - Result: FAIL. /api/schedule/apply returned 400:
     "Schedule validation failed: Unknown task IDs: cmjmhirlh000hehdy8w30upzy, cmjmhj9pa000jehdyns7auo35"
   - Flow blocked.

5) Assistant history:
   - /api/assistant/history returns 0 messages (not persisted).

## Must Pass Status

- Ask -> Schedule -> Preview -> Apply: FAIL (preview empty or invalid IDs; apply blocked).
- History persistence: FAIL.

## Critical Issues to Fix

- Scheduling preview empty for "today" despite available time; conflicts reference fixed event.
- LLM generates invalid task IDs for habits; schedule preview should use habitId or only existing tasks.
- Assistant history endpoint returns empty; persistence missing.
