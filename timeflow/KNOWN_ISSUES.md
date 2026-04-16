# Known Issues & Future Work

### Status Conventions for AI Agents
- Use checkboxes `[ ]` / `[x]` and update `Status:` in the tracking bullets below.
- Status values: `TODO`, `IN_PROGRESS`, `DONE`.
- When a sprint task addressing an issue is completed, flip the checkbox to `[x]` and update `Status:` accordingly.

---

## AI Scheduling Assistant - Needs Refinement

**Sprint 25 (A–F) is implemented** — see [`docs/plans/2026-04-15-flow-ai-reliability-must-pass-closeout.md`](./docs/plans/2026-04-15-flow-ai-reliability-must-pass-closeout.md). **Product contract:** [`docs/FLOW_AI_CONTRACT.md`](./docs/FLOW_AI_CONTRACT.md) (Ask → Preview → Apply).

### Issues Identified [x]

**P0 (schedule updates + safeguards)** — Addressed for **confirm-only apply**: user sees a **preview** (web + mobile), then **Apply** runs `POST /api/schedule/apply`; tasks show as scheduled after success. Auto-apply and broader “edit any calendar event by voice” remain future scope.

1. **Stuck in Recommendation Mode** [x]
   - Sprint 25 Phase C: explicit Apply on preview card, preview persistence to calendar, copy and disabled Apply when empty.
   - Residual polish: stronger CTA wording in every model response (optional).

2. **Exposed Technical Output** [x]
   - Sprint 25 Phase B: `sanitizeAssistantContent` hardening + golden tests (markers, fences, IDs, timestamps).

3. **Better Prompt Engineering Needed** [x] (core); polish remains
   - Sprint 25 Phase A: scheduling prompts (IDs, fixed events vs free windows), `habitId` / `taskId` validation, available-window context.
   - Residual: fewer hallucinated conflicts; immovable events — monitor in QA.

### Proposed Solutions / Tracking
- **Enhanced Prompt Template**: Add clear instructions for when to generate actionable schedules
  - [x] Sprint 13 – Tasks 13.6, 13.7 (`assistantSystemPrompt`, action vs conversation modes) — Status: DONE
- **Response Post-Processing**: Server-side stripping of ALL technical markers before sending to client  
  - [x] Sprint 13 – Task 13.8 (server-side sanitization) — Status: DONE (Sprint 25 Phase B)
- **UI State Management**: Better visual indicators when schedule is ready to apply  
  - [x] Sprint 13 – Tasks 13.11, 13.12 (schedule preview + explicit “Apply Schedule” copy) — Status: DONE (Sprint 25 Phase C)
- **Model Upgrade**: Prioritize upgrading to gpt-oss (`9398339cb0d`, via Docker Desktop models) as the primary Assistant model, with `llama3.2` or another option as a fallback, validated via experiments before rollout  
  - [x] Sprint 13 – Tasks 13.3–13.5 (model provider abstraction, gpt-oss evaluation, and rollout) — Status: DONE
- **Explicit Action Triggers**: AI should say "I've prepared a schedule. Click 'Apply Schedule' below to add these to your calendar."  
  - [x] Sprint 13 – Tasks 13.10–13.13 (apply-schedule action, safeguards, and assistant messaging) — Status: DONE (Sprint 25 Phase C + backend validation)

### Sprint 13 Must-Pass QA Follow-ups (2025-12-26) — Sprint 25 status
- [x] Schedule preview empty for “schedule today” / fixed events — Phase A + available-window context. Status: DONE (re-verify with `gpt-4o` per `docs/SPRINT_13_MUST_PASS_RUN.md`)
- [x] Invalid task/habit IDs in previews — Phase A validator + sanitization. Status: DONE (re-verify with `gpt-4o`)
- [ ] End-to-end must-pass **sign-off** Ask → Preview → Apply — code ready; **human run** with `OPENAI_MODEL=gpt-4o` still required. Status: PENDING RE-RUN
- [x] Assistant history — `GET /api/assistant/history` + web/mobile hydration + `conversationId`. Status: DONE
- [x] QA model documentation — `gpt-4o` documented (`LOCAL_LLM_SETUP.md`, backend README). Status: DONE
- Reference: `docs/SPRINT_13_MUST_PASS_FIX_RECOMMENDATIONS.md`

### Files Affected
- `apps/backend/src/services/assistantService.ts` - Prompt engineering
- `apps/web/src/app/assistant/page.tsx` - UI state management
- `apps/web/src/components/SchedulePreviewCard.tsx` - Preview visualization
- `docs/FLOW_AI_CONTRACT.md` - Ask → Preview → Apply contract

---

## Wake/Bedtime Per-Day Constraints - FIXED

### Current State
- Single wake/sleep time for all days of the week
- No weekend vs. weekday differentiation

### Proposed Enhancement
- Per-day schedule constraints (different wake/sleep times for each day)
- Compact UI in settings for day-specific configuration
- Database schema: `userSchedule` JSON field or new `DailySchedule` table

### Implementation Plan / Tracking
1. Add `dailyScheduleConstraints` JSON field to User model - DONE (Sprint 13 Task 13.26)
2. Create settings UI with day-of-week selector - DONE (Sprint 13 Task 13.27)
3. Update scheduling algorithm and Assistant logic to check day-specific constraints (including weekends) - DONE (Sprint 13 Task 13.27)
4. Migrate existing users: copy wake/sleepTime to all days - DONE (Sprint 13 Task 13.26)


## Known UI Issues

## Today Page
- DND Tasks into calendar doesn't stay in calendar or update anything. Must implement  
  - [x] Sprint 11 – Task 11.10 (DnD persistence + backend + Google Calendar updates) — Status: DONE
- Calendar drag-and-drop reschedule now fails with a “reschedule error” (DnD flow broken)  
  - [x] Investigate regression + fix reschedule endpoint/flow (client → API → Google Calendar) — Status: DONE
- Habit Suggestion Buttons don't say for what habit it is scheduling and buttons don't actually start a scheduling workflow  
  - [ ] Sprint 11 – Task 11.11 (wire habit suggestion buttons into scheduling workflow with clear labels) — Status: TODO
-

## Calendar Page
- There is no color coding sync for Timeflow and Google Calendar events. While there is color categorization in Timeflow there is zero difference in color in Google Calendar.

## Task Page
- In Editing a task changes in category don't save and there is also no seperator visually when this category is set.  
  - [ ] Sprint 10 – Task 10.B1 (category persistence) — Status: TODO  
  - [ ] Sprint 10 – Task 10.B2 (visual separator/badge) — Status: TODO
- After A task is complete  
  - (Clarify desired behavior; candidate fit: Sprint 10 polish or Sprint 13 analytics/notifications) — Status: TODO

## AI Assistant Page
- Scrollablility of the conversation is very limited to 1-2 prompts above the current prompt. We need to improve memory of conversation.  
- Chat history retrieval returns 401 even after successful save (frontend auth header missing on retrieval calls).  
  - [x] Sprint 25 — Authenticated `GET /api/assistant/history` + load on assistant mount (same Bearer pattern as other API calls). Status: DONE
  - [ ] Sprint 13 – Tasks 13.17, 13.18 (scroll behavior + memory handling) — Status: TODO
- Animations only stay for intial start up of the page. When conversation starts Flow goes into a tiny bubbble next to the chat. I would like the Flow icon to switch to the corresponding mode and stays bouncing and animated in the middle during thinking then pops out with an as an icon when he has a response.  
  - [ ] Sprint 9.5 – mascot states (initial implementation) — Status: DONE  
  - [ ] Sprint 13 – Task 13.19 (refine centered thinking animation + transition back to icon) — Status: TODO

---

*Last Updated: 2026-04-16*
