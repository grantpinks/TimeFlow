# Flow AI: Ask → Preview → Apply

Internal contract for the **scheduling assistant** (web `/assistant`, `/calendar`, and mobile Flow + Calendar tabs). Same API behavior everywhere.

## 1. Ask

- User sends natural language via **`POST /api/assistant/chat`** (with optional `conversationHistory` and `conversationId`).
- The model may answer conversationally **or** return a **`suggestions`** payload (`SchedulePreview`: blocks, summary, conflicts, confidence).
- **Flow Credits:** one charge per successful chat response (internal LLM retries inside that request do not add charges).

## 2. Preview

- Client surfaces the preview **before** any calendar write: **`SchedulePreviewCard`** (web assistant), **calendar** uses persisted preview (`sessionStorage` / **AsyncStorage**) + modal on mobile calendar.
- User reviews blocks, warnings, and confidence. **Apply** must be disabled when `blocks.length === 0`.
- **No auto-apply:** nothing is written to Google Calendar until the user confirms.

## 3. Apply

- User confirms; client sends **`POST /api/schedule/apply`** with validated task/habit blocks.
- Backend validates IDs and times, then creates/updates calendar events as implemented today.

## Out of scope (separate roadmap)

- Auto-apply without confirmation.
- Arbitrary “edit my whole calendar” without a preview step.
- Gmail-in-chat and agentic tool-calling (not part of this contract).

## References

- Sprint 25 implementation plan: [`docs/plans/2026-04-15-flow-ai-reliability-must-pass-closeout.md`](./plans/2026-04-15-flow-ai-reliability-must-pass-closeout.md)
- Must-pass QA log: [`docs/SPRINT_13_MUST_PASS_RUN.md`](./SPRINT_13_MUST_PASS_RUN.md)
