# Sprint 13 AI Ruthless QA - Key Flows

Date: 2025-12-24
Tester: Codex
Scope: daily plan, rescheduling, availability queries, apply schedule, regression harness, API smoke

## Test Setup (Baseline)

- User: grantpinks@gmail.com
- Backend: http://localhost:3001
- LLM config: `LLM_ENDPOINT`/`LLM_MODEL` only; `LLM_MODEL` is not set in `.env`, so the backend defaults to `llama3.2` (see `apps/backend/src/services/assistantService.ts`). `OPENAI_*` vars are not consumed by the backend, so results are not for gpt-4o.
- Seed data (current): 6 tasks (3 unscheduled QA Seed tasks with due dates; 3 scheduled tasks on Dec 23), 2 habits (not scheduled).

## Runs (Baseline)

- AI regression: `apps/backend/scripts/reports/ai-regression-2025-12-24T07-07-26-428Z.json`
  - Summary: 23 turns, 16 previews, 4 previews with blocks > 0.
- Offline eval: `apps/backend/scripts/reports/ai-offline-eval-2025-12-24T07-07-32-178Z.json`
- API smoke: `/api/user/me` 200, `/api/tasks` 200, `/api/assistant/history` 200.

## Critical Issues (Baseline)

1) P0 - Scheduling previews are empty for most scheduling prompts.
   - Evidence: regression report above. 12/16 preview responses had 0 blocks.
   - Impact: apply schedule is blocked; scheduling flow often fails.
   - Affected prompts include:
     - "Schedule my tasks for tomorrow."
     - "I'd like to schedule these tasks tomorrow from 9am-12pm and 1pm-5pm."
     - "Help me schedule my homework and laundry for today."
     - "Schedule my tasks but keep evenings free."

2) P0 - Rescheduling requests do not return previews and hallucinate task metadata.
   - Evidence: Prompt "Move Reply to emails to 8 PM today." returned natural language only (no `suggestions`), included a due date that does not exist, and referenced unrelated calendar context ("Flight to Fort Myers").
   - Impact: rescheduling cannot be applied; output is untrusted.

3) P1 - Daily plan mixes past scheduled tasks and misses/garbles current tasks.
   - Evidence: "Give me my daily plan for today" included Dec 23 scheduled tasks as "already scheduled and taken care of" for Dec 24. It also recommended "QA Seed task ()" with an empty title.
   - Impact: daily plan is inaccurate and confusing.

4) P1 - Schedule preview JSON persists after apply (reported by user).
   - Evidence: user report; not re-tested in this pass.
   - Impact: UX shows stale preview after schedule is applied.

5) P0 - OpenAI model not actually wired.
   - Evidence: assistant uses `LLM_MODEL`/`LLM_ENDPOINT` only; `OPENAI_MODEL` is unused and `LLM_MODEL` is unset, so the default `llama3.2` model runs. Regression results are not from gpt-4o.
   - Impact: QA results do not validate the intended model.

6) P2 - Availability results contain odd-minute boundaries.
   - Evidence: availability response listed Dec 27 slots as "5:57 PM" and "8:59 PM" boundaries.
   - Impact: UX quality issue; likely timezone or rounding inconsistency.

## Apply Schedule Coverage (Baseline)

- Apply schedule endpoint was not invoked during this QA run to avoid mutating live user data. Blocking issue: scheduling previews often contain 0 blocks.

## Post gpt-4o Run (2025-12-24)

### Test Setup

- LLM config: `LLM_PROVIDER="openai"`, `LLM_ENDPOINT="https://api.openai.com/v1/chat/completions"`, `OPENAI_MODEL="gpt-4o"` (backend now uses OpenAI).

### Runs

- AI regression: `apps/backend/scripts/reports/ai-regression-2025-12-24T07-43-27-136Z.json`
  - Summary: 23 turns, 16 previews, 15 previews with blocks > 0.
- Offline eval: `apps/backend/scripts/reports/ai-offline-eval-2025-12-24T07-43-31-293Z.json`
- API smoke: `/api/user/me` 200, `/api/tasks` 200, `/api/assistant/history` 200.

### Resolved in gpt-4o Run

- OpenAI model wiring (regression now hits gpt-4o).
- Scheduling previews no longer empty for most scheduling prompts.
- Daily plan no longer shows past scheduled tasks or missing titles in the latest run.
- Rescheduling now returns schedule previews (e.g., "Move Reply to emails to 8 PM today." yields blocks).
- Availability slots rounded to 5-minute boundaries to avoid odd-minute times (e.g., 5:55 PM / 9:00 PM).
- Schedule preview cleared after apply to prevent stale previews (pending UI verification).
