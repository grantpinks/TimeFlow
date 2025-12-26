# Sprint 13 Must-Pass Fix Recommendations

Date: 2025-12-26
Author: Codex
Audience: Claude (implementation handoff)

## Quick Summary

The Sprint 13 must-pass flow failed at scheduling and apply. The assistant produced either an empty preview or a preview containing invalid task IDs, which then caused /api/schedule/apply to fail. Assistant history persistence is also missing (endpoint returns empty).

## Test Setup

- Backend: http://localhost:4000
- Model: OPENAI_MODEL=gpt-4o-mini (apps/backend/.env)
- User: grantpinks@gmail.com
- Data: 1 unscheduled task ("Pack for Florida", 60 min, due 2025-12-26), fixed event "Flight to Fort Myers" at 5:57 PM.
- Note: Prisma on Windows required DATABASE_URL with sslmode=disable for query tools.

## Must-Pass Flow Results

1) Ask: "What's my daily plan for today?"
   - Result: OK (conversation response returned).
   - Preview: none (expected).

2) Schedule: "Schedule my tasks for today."
   - Result: FAIL. Preview returned with 0 blocks.
   - Conflicts: "Task 'Pack for Florida' cannot be scheduled due to fixed event: Flight to Fort Myers at 5:57 PM."
   - Issue: There appears to be available time earlier in the day; preview should not be empty.

3) Schedule (alt): "Schedule my tasks for tomorrow morning."
   - Result: PARTIAL. Preview returned with 3 blocks.
   - Conflicts: Invalid task IDs for "Check Email" and "Stretch."
   - Issue: LLM invented tasks/habits and labeled them as taskId.

4) Apply schedule (using blocks from step 3).
   - Result: FAIL. /api/schedule/apply returned 400:
     "Schedule validation failed: Unknown task IDs: cmjmhirlh000hehdy8w30upzy, cmjmhj9pa000jehdyns7auo35"
   - Flow blocked.

5) Assistant history:
   - /api/assistant/history returns 0 messages (not persisted).

## Primary Issues and Recommendations

### 1) Invalid IDs in schedule preview
Impact: Apply fails; preview is untrusted.
Evidence: Preview contained taskId values not present in DB.

Recommended fixes:
- Prompt: explicitly instruct the LLM to ONLY use task IDs from the provided task list; for habits, use habitId and only if habits are listed.
- Server-side guard: filter out blocks whose taskId/habitId do not exist for the user before returning suggestions. Add a conflict entry for each filtered block so the UI can explain why items were dropped.
- Optionally: if filtered blocks become empty, return a warning and prompt user to add tasks or clarify.

### 2) Empty preview for "schedule today"
Impact: Must-pass flow fails even with a single unscheduled task.
Evidence: Preview had 0 blocks with a conflict about a fixed event.

Recommended fixes:
- Prompt: clarify that tasks should be scheduled in any available slot before fixed events, not blocked by fixed events unless overlapping.
- Due date normalization: when a task due date is provided as a date-only string, consider interpreting it as end-of-day in the user's timezone rather than midnight UTC. Midnight UTC can mark tasks as overdue too early and may bias LLM reasoning.
  - Candidate change: in task date parsing, set YYYY-MM-DD to "T23:59:59.999Z" (or local timezone end-of-day).
- Add a backend validation note to the preview when a task is overdue but still schedulable; avoid instructing the LLM that no time exists without evidence.

### 3) Assistant history persistence missing
Impact: "Conversation history retained across multi-turn dialogues" remains unmet.
Evidence: /api/assistant/history returns empty array.

Recommended fixes:
- Implement persistence in assistantController.getHistory by reading conversation messages from the database.
- Ensure assistantService stores user/assistant turns to the conversation table (or an equivalent store) on each message.
- Confirm frontend sends conversationId and uses history fallback correctly.

### 4) Model mismatch (gpt-4o requested, gpt-4o-mini configured)
Impact: QA results do not fully validate the intended model.
Evidence: apps/backend/.env sets OPENAI_MODEL=gpt-4o-mini.

Recommended fix:
- Update OPENAI_MODEL to gpt-4o and re-run the must-pass flow.

## Suggested Verification Steps

1) Re-run must-pass flow:
   - Ask -> Schedule -> Preview -> Apply
   - Confirm preview blocks > 0 and apply returns success.
2) Verify no invalid IDs in suggestions.
3) Confirm /api/assistant/history returns persisted messages.
4) Capture updated results in docs/SPRINT_13_MUST_PASS_RUN.md.

## Related Files

- apps/backend/src/services/assistantService.ts
- apps/backend/src/prompts/scheduling.txt
- apps/backend/src/controllers/assistantController.ts
- apps/backend/src/services/scheduleService.ts
- apps/backend/src/controllers/tasksController.ts
- docs/SPRINT_13_MUST_PASS_RUN.md
