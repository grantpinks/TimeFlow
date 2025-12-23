# Known Issues & Future Work

### Status Conventions for AI Agents
- Use checkboxes `[ ]` / `[x]` and update `Status:` in the tracking bullets below.
- Status values: `TODO`, `IN_PROGRESS`, `DONE`.
- When a sprint task addressing an issue is completed, flip the checkbox to `[x]` and update `Status:` accordingly.

---

## AI Scheduling Assistant - Needs Refinement

### Issues Identified [ ] 

P0 **MAJOR FIND: Ai Assistant has no ability to update your schedule if you allow it
- Must implement this feature as well as safeguards to ensure that the user can confirm the adjustments before proceeding as well as see a preview VISUALLY of where they would see it in their calendar before confirming to add it to calendar. This should also update backend to show that the task has been scheduled

1. **Stuck in Recommendation Mode**
   - AI generates schedule suggestions but doesn't clearly prompt user to apply them
   - User experience unclear on when/how to transition from planning to scheduling
   - Needs more explicit "Apply Schedule" prompts in AI responses

2. **Exposed Technical Output** [ ]
   - Structured JSON output still appears in some AI responses
   - IDs of tasks appear in responses
   - Backend filtering not catching all cases
   - Need more robust parsing/stripping of technical markers

3. **Better Prompt Engineering Needed**
   - Current prompt doesn't clearly instruct AI on when to generate structured output
   - Need clearer distinction between conversational responses vs. actionable schedules
   - Consider adding explicit "action mode" vs "conversation mode"
   - Model currently hallucinates conclicts and gives uneeded rescheduling advice
   - Model also attempts to recommend moving a set event that is unmovable such as class

### Proposed Solutions / Tracking
- **Enhanced Prompt Template**: Add clear instructions for when to generate actionable schedules
  - [x] Sprint 13 – Tasks 13.6, 13.7 (`assistantSystemPrompt`, action vs conversation modes) — Status: DONE
- **Response Post-Processing**: Server-side stripping of ALL technical markers before sending to client  
  - [ ] Sprint 13 – Task 13.8 (server-side sanitization) — Status: TODO
- **UI State Management**: Better visual indicators when schedule is ready to apply  
  - [ ] Sprint 13 – Tasks 13.11, 13.12 (schedule preview + explicit “Apply Schedule” copy) — Status: TODO
- **Model Upgrade**: Prioritize upgrading to gpt-oss (`9398339cb0d`, via Docker Desktop models) as the primary Assistant model, with `llama3.2` or another option as a fallback, validated via experiments before rollout  
  - [x] Sprint 13 – Tasks 13.3–13.5 (model provider abstraction, gpt-oss evaluation, and rollout) — Status: DONE
- **Explicit Action Triggers**: AI should say "I've prepared a schedule. Click 'Apply Schedule' below to add these to your calendar."  
  - [ ] Sprint 13 – Tasks 13.10–13.13 (apply-schedule action, safeguards, and assistant messaging) — Status: TODO

### Files Affected
- `apps/backend/src/services/assistantService.ts` - Prompt engineering
- `apps/web/src/app/assistant/page.tsx` - UI state management
- `apps/web/src/components/SchedulePreviewCard.tsx` - Preview visualization

---

## Wake/Bedtime Per-Day Constraints

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
  - [ ] Sprint 11 – Task 11.10 (DnD persistence + backend + Google Calendar updates) — Status: TODO
- Habit Suggestion Buttons don't say for what habit it is scheduling and buttons don't actually start a scheduling workflow  
  - [ ] Sprint 11 – Task 11.11 (wire habit suggestion buttons into scheduling workflow with clear labels) — Status: TODO
-


## Task Page
- In Editing a task changes in category don't save and there is also no seperator visually when this category is set.  
  - [ ] Sprint 10 – Task 10.B1 (category persistence) — Status: TODO  
  - [ ] Sprint 10 – Task 10.B2 (visual separator/badge) — Status: TODO
- After A task is complete  
  - (Clarify desired behavior; candidate fit: Sprint 10 polish or Sprint 13 analytics/notifications) — Status: TODO

## AI Assistant Page
- Scrollablility of the conversation is very limited to 1-2 prompts above the current prompt. We need to improve memory of conversation.  
- Chat history retrieval returns 401 even after successful save (frontend auth header missing on retrieval calls).  
  - [ ] Sprint 13 ƒ?" Frontend auth token for assistant history (new ticket) ƒ?" Status: TODO
  - [ ] Sprint 13 – Tasks 13.17, 13.18 (scroll behavior + memory handling) — Status: TODO
- Animations only stay for intial start up of the page. When conversation starts Flow goes into a tiny bubbble next to the chat. I would like the Flow icon to switch to the corresponding mode and stays bouncing and animated in the middle during thinking then pops out with an as an icon when he has a response.  
  - [ ] Sprint 9.5 – mascot states (initial implementation) — Status: DONE  
  - [ ] Sprint 13 – Task 13.19 (refine centered thinking animation + transition back to icon) — Status: TODO

---

*Last Updated: 2025-12-21*
