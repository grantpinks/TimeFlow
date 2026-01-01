# AI Meetings Workflow Design

## Goal
Make Flow handle meeting workflows inside `/assistant` with a conversational, minimal‑question flow that can create scheduling links, draft invite emails, and share booking links safely.

## Success Criteria
- Meeting intent is recognized and routed to a dedicated meetings prompt.
- Flow asks which scheduling link to use; offers to create one inline if none exist.
- Inline link creation asks only for name + duration; uses meeting hours from Settings unless overridden.
- If the user asks to send a meeting request, Flow drafts the email immediately after link selection/creation.
- Never auto‑send emails without explicit confirmation.

## Scope
In scope:
- Dedicated meetings prompt (`meetings.txt`).
- Meeting intent detection and meeting state tracking in backend assistant service.
- Integration with scheduling link APIs and meeting email endpoint.
- Regression prompts and expectation checks.

Out of scope:
- Email workflows (handled in current sprint).
- Advanced NLP for extracting recipients from long threads.
- UI changes beyond `/assistant` chat.

## Architecture
Add a **meetings sub‑mode** parallel to planning. The top‑level router stays (conversation/scheduling/availability), then conversation can branch into **planning** or **meetings** based on intent. Meetings mode uses a dedicated prompt and a backend‑driven state machine to reduce ambiguity.

High‑level flow:
1. Detect base mode (existing).
2. Detect meeting intent; if true, route to `meetings` prompt.
3. Build meeting state (missing link selection, missing creation details, missing recipient).
4. Ask one short question at a time.
5. Draft email or provide booking link based on original intent.

## Meeting State
A lightweight meeting state is attached to the prompt and response metadata:
- `missingLinkSelection: boolean`
- `missingLinkName: boolean`
- `missingLinkDuration: boolean`
- `missingRecipient: boolean`
- `creationRequested: boolean`
- `sendRequested: boolean`
- `questionRound: number` (max 2)
- `assumptions: string[]`

## Behavior Rules
- Always ask which scheduling link to use.
- If no links exist, offer inline creation.
- Inline creation only asks for name + duration. Use meeting hours from Settings unless user overrides.
- If user asked to send invite, draft email right after link selection/creation.
- If Gmail isn’t connected, provide draft + booking link and instruct to connect Gmail.

## Data Passed to Meetings Prompt
- Scheduling links list (id, name, slug, durationMinutes, active, bookingUrl).
- User meeting hours (meetingStartTime, meetingEndTime, time zone).
- Meeting state JSON block.
- User’s current message.

## Error Handling
- Link creation failure → offer retry or Settings link.
- Gmail unavailable → draft email and provide booking link.
- Inactive link chosen → ask to activate or select another.

## Testing
- Unit tests for meeting intent detection and meeting state resolution.
- AI regression prompts for:
  - “Schedule a meeting with Alex” → ask link / offer create
  - “Create a 30‑min meeting link” → ask name
  - “Send a meeting request to alex@company.com” → ask link, then draft
- Harness checks for question presence and no auto‑send language.

## Next Step
Create an implementation plan, then execute with TDD.
