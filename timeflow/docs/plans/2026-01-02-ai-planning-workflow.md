# AI Planning Workflow (Conversation -> Plan -> Schedule)

## Goal
Make Flow feel like a true planning assistant by adding a lightweight planning sub-mode that guides ambiguous requests into clear plans with minimal questions.

## Success Criteria
- Ambiguous planning prompts trigger a short, friendly clarifying question (time + priority).
- Explicit planning prompts produce a draft plan without extra questions.
- Maximum of two question rounds; second round only if information is still missing.
- Plans feel conversational and supportive, not transactional.
- Backwards compatible with existing scheduling/availability modes.

## Scope
In scope:
- Add planning intent detection and planning state in backend assistant service.
- Add a new prompt file for planning responses.
- Extend AI regression harness with planning scenarios.

Out of scope:
- UI changes beyond existing assistant chat.
- New data models for long-term assistant memory.

## Proposed Architecture
Add a planning sub-mode within conversation mode. The intent router stays the same (conversation, scheduling, availability), but conversation can become planning-aware. Planning state is determined in the backend to avoid over-asking and keep behavior consistent across prompt variants.

High-level flow:
1. Detect assistant mode (existing).
2. Detect planning intent within conversation mode.
3. Build planning state (missing time constraints and priority clarity).
4. Ask 1 combined question if missing info, otherwise draft a plan.
5. Allow one additional question round only if still missing info.
6. Draft a plan and request confirmation to schedule.

## Planning State
Planning state is a small JSON block passed to the prompt:
- `missingInfo`: boolean
- `missingTime`: boolean
- `missingPriority`: boolean
- `questionRound`: number (0, 1, 2)
- `allowSecondRound`: boolean
- `assumptions`: string[]

## Behavior Rules
- Ask a combined question (time + priority) when missing info.
- If only one piece is missing, ask only that part.
- If after two rounds info is still missing, draft a plan and state assumptions.
- Always end with a next step: “Want me to schedule this?”

## Backend Changes
1. Add `detectPlanningIntent()` in `assistantService.ts`.
   - Keywords: plan my day, prioritize, what should I do next, realistic plan, etc.
2. Add `getPlanningState()` to determine missing time/priority.
   - Use user tasks, due dates, priority fields, calendar window, and explicit message hints.
3. Add `shouldAskPlanningQuestion()` with two-round budget.
4. Add `planning.txt` prompt and compose via `PromptManager`.

## Prompt Changes
Add `apps/backend/src/prompts/planning.txt`:
- If `missingInfo` true: ask one short combined question.
- If `missingInfo` false: draft a plan with 3-6 steps and a confirmation CTA.
- Maintain friendly tone and compact formatting.

## Data Flow
Context prompt includes:
- Top unscheduled tasks (title, priority, due date, duration)
- Upcoming calendar events
- Work hours window
- Inferred priority cues (urgent due today, high priority with no deadline)
- Planning state JSON

## Error Handling
- If tasks and calendar are empty: ask user to share top 1-3 priorities.
- If LLM response is malformed: fall back to the combined question.
- If user answers only part of the question, ask only the missing piece.

## Testing
- Unit tests for planning intent and planning state logic.
- Extend AI regression harness with planning prompts and expected outcomes.
- Manual verification checklist:
  - Ambiguous -> 1 question -> plan
  - Explicit -> plan without questions
  - Two-round cap enforced

## Rollout
- Ship behind a feature flag or config toggle (optional).
- Monitor assistant logs for question frequency and fallback rates.
- Iterate prompt and heuristics after initial feedback.
