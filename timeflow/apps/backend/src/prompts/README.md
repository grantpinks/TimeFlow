# AI Assistant Prompts

This directory contains the file-based prompt system for the TimeFlow AI Assistant.

**Sprint 13.6 & 13.7**: Implemented mode-based prompts with fixed event respect.

---

## Files

### `base.txt`
**Shared personality and formatting rules** used across all modes.

Contains:
- Flow's identity and communication style
- Markdown formatting requirements
- Response structure templates
- Scannability rules (200 words max, bold headings, bullet points)
- Timezone handling instructions

This prompt is composed with mode-specific prompts to create the complete system prompt.

### `conversation.txt`
**Q&A mode** - Information only, no scheduling actions.

Used when:
- User asks questions about tasks, schedules, or deadlines
- Default mode for general queries

Behavior:
- Answers questions naturally
- Explains priorities, due dates, and commitments
- **Does NOT** generate `[STRUCTURED_OUTPUT]` or schedule blocks
- Suggests using scheduling mode when appropriate

### `scheduling.txt`
**Action mode** - Generate schedule blocks with fixed event respect.

Used when:
- User explicitly asks to schedule tasks ("schedule my tasks")
- Keywords: "schedule", "plan my", "block time", "organize"

Behavior:
- Generates **dual-output format**: Natural language + `[STRUCTURED_OUTPUT]`
- Respects **FIXED events** (classes, appointments, meetings)
- Never suggests moving fixed events
- Works around fixed time slots
- Validates against wake/sleep hours
- Sorts by due date (ASC) then priority (DESC)

Critical constraints:
- **NEVER schedule overlapping FIXED events**
- **NEVER suggest moving FIXED events**
- Only TimeFlow-created tasks are movable
- Complete JSON structure with ISO 8601 timestamps

### `availability.txt`
**Time gap analysis** - Show free time without scheduling.

Used when:
- User asks "when am I free?"
- Keywords: "available", "free time", "open slots", "when can i"

Behavior:
- Shows time gaps ≥ 30 minutes
- Prioritizes near-term days (today, tomorrow first)
- Adds context (what's before/after gaps)
- **Does NOT** generate `[STRUCTURED_OUTPUT]`
- Suggests scheduling mode if user wants to book time

---

## Mode Detection

The `detectMode()` function in `assistantService.ts` chooses the appropriate mode:

```typescript
function detectMode(
  userMessage: string,
  hasUnscheduledTasks: boolean
): 'conversation' | 'scheduling' | 'availability'
```

**Logic**:
1. **Availability mode**: If message contains "when am i free", "available", etc.
2. **Scheduling mode**: If message contains "schedule", "plan my", etc. (scheduling requests are not gated on task count)
3. **Conversation mode**: Default for all other queries

---

## Prompt Composition

The `PromptManager` class composes prompts:

```typescript
const promptManager = new PromptManager();
const systemPrompt = promptManager.getPrompt('scheduling');
// Returns: base.txt content + scheduling.txt content
```

**Benefits**:
- Single source of truth for shared rules (`base.txt`)
- Mode-specific behavior isolated in separate files
- Easy to update without code changes
- Cached for performance

---

## Event Classification (Sprint 13.7)

The `eventClassifier.ts` utility separates calendar events:

**FIXED Events** (immovable):
- Events with `[FIXED]` metadata
- Meetings with multiple attendees
- Events with keywords: class, lecture, appointment, interview, flight, meeting, etc.
- Examples: "CS 101 Lecture", "Dentist Appointment", "Team Meeting"

**MOVABLE Events** (can be rescheduled):
- TimeFlow-created tasks (default `TF|` prefix)
- Personal events without attendees
- Examples: "TF| Homework", "Personal Study Time"

The scheduling and availability prompts receive classified events in their context:

```
**FIXED Events (CANNOT move)**:
These are immovable commitments (classes, appointments, meetings). Work AROUND them.

- Dec 21, 2:00 PM - 4:00 PM: CS 101 Lecture [FIXED: Contains keyword "lecture"]
- Dec 21, 5:00 PM - 6:00 PM: Team Meeting [FIXED: Meeting with attendees]

**MOVABLE Events** (can be rescheduled if needed):
- Dec 21, 9:00 AM - 10:00 AM: TF| Morning Workout
```

---

## Server-Side Validation

The `scheduleValidator.ts` utility validates AI-generated schedules:

**Checks**:
1. ❌ **No overlap with FIXED events** (critical error)
2. ⚠️ **Within wake/sleep hours** (warning)
3. ❌ **Valid task IDs** (error)
4. ❌ **Valid ISO 8601 timestamps** (error)
5. ❌ **No conflicts between blocks** (error)

**Result**:
- Validation errors/warnings added to `conflicts` array
- Confidence lowered if issues found (`high` → `medium` → `low`)
- User sees conflicts in schedule preview card

---

## Dual-Output Format (Scheduling Mode Only)

Scheduling mode requires **two outputs**:

### Part 1: Natural Language (user-facing)
```markdown
## Your Monday Schedule

I've planned **3 tasks** around your CS 101 Lecture:

**Morning** (9:00 AM - 11:00 AM):
• **Pack Up Room** - 30 min (HIGH priority)

**Afternoon** (2:00 PM - 4:00 PM):
Your **CS 101 Lecture** is fixed during this time.

**Evening** (4:30 PM - 6:30 PM):
• **Study for Finals** - 2 hours (HIGH priority)

Review and apply when ready!
```

### Part 2: Structured Output (system-only)
```
[STRUCTURED_OUTPUT]
```json
{
  "blocks": [
    {
      "taskId": "ckx123",
      "taskTitle": "Pack Up Room",
      "start": "2025-12-23T15:00:00.000Z",
      "end": "2025-12-23T15:30:00.000Z",
      "priority": 3,
      "dueDate": "2025-12-23T23:59:59.999Z"
    }
  ],
  "conflicts": [],
  "summary": "Scheduled around the fixed CS lecture at 2-4 PM.",
  "confidence": "high"
}
```
```

**Critical Rules**:
- Natural language: Max 200 words, bold headings, 12-hour format
- Structured output: Valid JSON with UTC ISO 8601 timestamps
- **NEVER** show JSON or code blocks in natural language section
- If there are zero unscheduled tasks, return empty `blocks` and include a conflict explaining no tasks are available

---

## Example User Flows

### 1. Conversation Mode
**User**: "What tasks do I have?"

**AI Response**:
- Natural language only
- Lists tasks with priorities/due dates
- No `[STRUCTURED_OUTPUT]`
- Suggests scheduling if needed

### 2. Scheduling Mode
**User**: "Schedule my tasks for tomorrow"

**Flow**:
1. Mode detection → `scheduling`
2. Context includes FIXED/MOVABLE events
3. AI generates dual-output (NL + JSON)
4. Server validates schedule
5. Conflicts added if validation fails
6. Schedule preview card shows to user

### 3. Availability Mode
**User**: "When am I free this week?"

**AI Response**:
- Shows time gaps by day
- Prioritizes today/tomorrow
- Adds context (before/after events)
- No `[STRUCTURED_OUTPUT]`

---

## Updating Prompts

**To update prompts**:
1. Edit the `.txt` files directly
2. Restart backend server (prompts are cached on startup)
3. Test with different user queries

**To add a new mode**:
1. Create `new-mode.txt` in this directory
2. Add mode to `AssistantMode` type in `promptManager.ts`
3. Update `detectMode()` logic in `assistantService.ts`
4. Update `buildContextPrompt()` if needed

---

## Testing

**Manual testing scenarios**:

### Fixed Event Respect
```
Setup:
- Create task "Homework" (2 hours, HIGH priority)
- Add calendar event "CS 101 Lecture" (Mon 2-4 PM)

Test:
User: "Schedule my homework for Monday"

Expected:
- AI suggests times OUTSIDE 2-4 PM window
- Validation passes (no overlap with fixed event)
- Schedule preview shows high confidence
```

### Decline Moving Fixed Events
```
Test:
User: "Move my CS lecture to 3 PM"

Expected:
- AI declines: "I can't reschedule your CS 101 Lecture as it's a fixed commitment (class)"
- No `[STRUCTURED_OUTPUT]` generated
```

### Mode Transitions
```
Test:
1. User: "What tasks do I have?" → conversation mode
2. User: "Schedule them for tomorrow" → scheduling mode

Expected:
- First response: Natural language only
- Second response: Dual-output with schedule preview
```

---

## Architecture Benefits

✅ **Separation of concerns**: Prompts isolated from code
✅ **Mode-specific behavior**: Clear boundaries between conversation/scheduling/availability
✅ **Event classification**: AI knows what can/cannot be moved
✅ **Server-side validation**: Safety net for AI mistakes
✅ **Maintainability**: Update prompts without code changes
✅ **Testability**: Easy to test different modes independently

---

## Related Files

- `../services/promptManager.ts` - Prompt loading and composition
- `../services/assistantService.ts` - Mode detection and LLM calls
- `../utils/eventClassifier.ts` - Fixed vs movable event logic
- `../utils/scheduleValidator.ts` - Server-side validation
- `../../packages/shared/src/types/assistant.ts` - SchedulePreview type
- `../../packages/shared/src/types/calendar.ts` - CalendarEvent type

---

**Last Updated**: Sprint 13 (Tasks 13.6 & 13.7)
**Implementation**: December 2025
