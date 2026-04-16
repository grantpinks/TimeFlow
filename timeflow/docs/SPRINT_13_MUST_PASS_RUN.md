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

---

## Sprint 25 follow-up — env snapshot and re-run (2026-04-16)

**Canonical QA model (locked):** `gpt-4o` via OpenAI (`OPENAI_MODEL=gpt-4o`, `LLM_PROVIDER=openai`, `OPENAI_API_KEY` set). Documented in [`LOCAL_LLM_SETUP.md`](../../LOCAL_LLM_SETUP.md) and [`apps/backend/README.md`](../../apps/backend/README.md).

**Engineering fixes landed (re-test against this baseline):**

| Area | Change |
|------|--------|
| Schedule / IDs | `validateSchedulePreview` validates `habitId`; available-window context for fixed events; stricter scheduling prompts. |
| Sanitization | `sanitizeAssistantContent` hardened (Phase B). |
| Web UX | Apply wired; preview persistence to calendar; friendly apply errors. |
| Mobile | Flow + Calendar tabs; AsyncStorage preview; history + `conversationId` on chat. |
| History | `GET /api/assistant/history?conversationId=` + `conversationId` in response; web/mobile hydrate; DB fallback when history omitted but `conversationId` set. |
| Flow Credits | Single `trackUsage` per `POST /api/assistant/chat` (`assistantController.credits.test.ts`). |

**Manual re-run checklist (sign-off requires human tester with `gpt-4o`):**

1. Set `OPENAI_MODEL=gpt-4o` and restart backend.
2. Repeat steps 1–5 above (same preconditions).
3. Record PASS/FAIL per step in a new subsection or update the tables below.

**Automated status:** Prior failure modes above are **addressed in code** as of Sprint 25; **official PASS** still requires a fresh run with `gpt-4o` and updated step results.

### Placeholder result table (fill in after re-run)

| Step | Result |
|------|--------|
| 1 Daily plan | _pending_ |
| 2 Schedule today | _pending_ |
| 3 Schedule tomorrow | _pending_ |
| 4 Apply | _pending_ |
| 5 History | _pending_ |

**Must Pass Status (post re-run):** PENDING — awaiting `gpt-4o` run.
