# Sprint 13 Critical Issues - Fix Plan

**Created**: 2025-12-21
**Status**: READY FOR IMPLEMENTATION
**Priority**: P0 - Blocking production readiness

---

## Executive Summary

User testing revealed **5 critical issues** preventing Sprint 13 AI Assistant from functioning correctly:

1. **Mode detection not triggering scheduling mode** - User says "schedule" but stays in conversation mode
2. **No structured output generated** - Even when mode = scheduling, LLM doesn't produce `[STRUCTURED_OUTPUT]`
3. **Conversation history not retained** - Context lost between messages
4. **Wake/sleep constraints not enforced** - Times fetched but not respected by AI
5. **Chat saving UI issue** - 401 auth errors on retrieval (frontend issue)

**Impact**: AI Assistant cannot schedule tasks despite Sprint 13 implementation being complete.

**Estimated Fix Time**: 4-6 hours

---

## Issue Analysis & Root Causes

### Issue 1: Mode Detection Failing ❌ CRITICAL

**Symptom**:
```
User: "I'd like to schedule these tasks tomorrow from 9am-12pm and 1pm-5pm"
Backend Log: [AssistantService] Mode: conversation, Mascot: guiding, Preview: NO
Expected: Mode: scheduling, Preview: YES
```

**Evidence from Logs**:
- Request 1: "I'd like to schedule..." → `conversation` (WRONG)
- Request 2: "can we schedule it" → `conversation` (WRONG)
- Request 3: "can we now schedule these 3 tasks" → `conversation` (WRONG)
- Request 4: "schedule these tasks for tomorrow" → `scheduling` (CORRECT!) but Preview: NO

**Root Cause Hypothesis**:

Looking at `detectMode()` logic:
```typescript
const schedulingKeywords = ['schedule', 'plan my', 'block time', 'organize', ...];
const isSchedulingRequest = schedulingKeywords.some((kw) => lower.includes(kw));

if (isSchedulingRequest && hasUnscheduledTasks) {
  return 'scheduling';
}
```

**Problem**: The condition requires BOTH:
1. Scheduling keywords (✅ user said "schedule" multiple times)
2. `hasUnscheduledTasks` = true

**Likely Issue**: The `hasUnscheduledTasks` boolean is being computed incorrectly OR the variable isn't being passed to `detectMode()` correctly.

**Files to Investigate**:
- `apps/backend/src/services/assistantService.ts:processMessage()` - Where `unscheduledTasksCount` is computed
- Lines 150-170 - Where `detectMode()` is called

**Fix Strategy**:
1. Add debug logging to see actual value of `unscheduledTasksCount` before `detectMode()` call
2. Verify database query returning unscheduled tasks correctly
3. Check if count calculation logic is correct
4. Possibly expand scheduling keywords (user said "I'd like to schedule" which may not match "schedule" alone)

---

### Issue 2: No Structured Output Generated ❌ CRITICAL

**Symptom**:
```
User: "schedule these tasks for tomorrow"
Backend Log: [AssistantService] Mode: scheduling, Mascot: thinking, Preview: NO
Expected: Preview: YES with [STRUCTURED_OUTPUT]
```

**Evidence**:
- Mode correctly detected as `scheduling` in at least one request
- But `parseResponse()` not finding `[STRUCTURED_OUTPUT]` section
- This means LLM response doesn't contain the required JSON block

**Root Cause Hypothesis**:

The `scheduling.txt` prompt may not be clear enough for `llama3.2` model. The prompt requires dual-output format:

```
## Part 2: Structured Output (REQUIRED)

[STRUCTURED_OUTPUT]
```json
{
  "blocks": [...],
  "conflicts": [],
  "reasoning": "...",
  "confidence": "high"
}
```
```

**Possible Reasons LLM Ignores This**:
1. **Model capability**: llama3.2 (3.2B params) may struggle with complex JSON generation
2. **Prompt clarity**: Instructions may be buried in 280-line prompt
3. **Temperature too high**: May cause non-deterministic output that skips structured section
4. **Max tokens**: Response might be cut off before structured output
5. **Prompt doesn't have examples**: No few-shot examples showing expected format

**Fix Strategy**:
1. **Add debug logging**: Log full LLM response to see what it's actually generating
2. **Enhance scheduling.txt prompt**:
   - Move critical `[STRUCTURED_OUTPUT]` requirement to top
   - Add few-shot examples showing complete dual-output
   - Simplify natural language section requirements
   - Make JSON requirement more explicit: "YOU MUST END YOUR RESPONSE WITH..."
3. **Adjust LLM parameters**:
   - Lower temperature (currently may be too high)
   - Increase max_tokens to ensure full response
   - Add stop sequences if needed
4. **Consider model upgrade**: Test with `gpt-oss` (from Sprint 13.3-13.5) which may handle structured output better

**Files to Modify**:
- `apps/backend/src/prompts/scheduling.txt` - Enhance with examples and clearer requirements
- `apps/backend/src/services/assistantService.ts:callLocalLLM()` - Add response logging, adjust params

---

### Issue 3: Conversation History Not Retained ⚠️ HIGH PRIORITY

**Symptom**:
User reports: "not retaining an adjusted plan that we had just made when i asked to schedule it"

**Evidence**:
- Each request shows fresh context building in logs
- `conversationHistory` parameter exists in `processMessage()` but may not be populated
- User's previous messages not visible to LLM in subsequent requests

**Root Cause Hypothesis**:

Looking at `processMessage()` signature:
```typescript
export async function processMessage(
  userId: string,
  message: string,
  conversationHistory?: ChatMessage[]
): Promise<AssistantChatResponse>
```

The `conversationHistory` is **optional** and may not be passed from frontend.

**Verification Needed**:
1. Check frontend code: `apps/web/src/app/assistant/page.tsx`
2. See if it's passing conversation history in API request
3. Check if backend route is extracting it from request body
4. Verify `callLocalLLM()` is using the history correctly

**Fix Strategy**:
1. **Add logging**: Log length of `conversationHistory` array at start of `processMessage()`
2. **Frontend check**: Verify assistant page is building and sending history array
3. **Backend route check**: Verify route extracts history from request body
4. **LLM integration**: Ensure history is formatted correctly for llama3.2 API
5. **Consider saving to DB**: If frontend isn't persisting, retrieve from Conversation/ConversationMessage tables

**Files to Investigate**:
- `apps/web/src/app/assistant/page.tsx` - Frontend conversation state management
- `apps/backend/src/routes/assistant.ts` - Route handler extracting request body
- `apps/backend/src/services/assistantService.ts:callLocalLLM()` - History formatting

---

### Issue 4: Wake/Sleep Times Not Respected ⚠️ MEDIUM PRIORITY

**Symptom**:
User reports: "not retaining my wakeup/bedtimes"

**Evidence**:
- Database shows correct values: `wakeTime: "08:00"`, `sleepTime: "23:00"`
- These are being fetched in `buildContextPrompt()`
- But AI responses don't seem to respect them

**Root Cause Hypothesis**:

The times are likely being included in the context prompt, but:
1. **Format unclear**: May be presented as "08:00" without timezone or explanation
2. **Buried in context**: May be lost among other information
3. **LLM not following constraint**: Model may ignore soft constraints
4. **Timezone confusion**: UTC vs user timezone conversion issues

**Fix Strategy**:
1. **Add logging**: Log the exact context section containing wake/sleep times
2. **Enhance context format**: Make it more prominent and clear
   ```
   **CRITICAL SCHEDULING CONSTRAINTS**:
   - User wakes up at: 8:00 AM EST
   - User goes to bed at: 11:00 PM EST
   - NEVER schedule tasks outside these hours
   ```
3. **Move to prompt template**: Add to `scheduling.txt` as a placeholder that gets filled
4. **Server-side validation**: Already exists in `scheduleValidator.ts` - ensure it's adding warnings

**Files to Modify**:
- `apps/backend/src/services/assistantService.ts:buildContextPrompt()` - Enhance formatting
- `apps/backend/src/prompts/scheduling.txt` - Add explicit wake/sleep constraint section

---

### Issue 5: Chat Saving UI Issue 🔵 FRONTEND ISSUE (Lower Priority)

**Symptom**:
User reports: "chat saving doesn't appear to be working from a UI perspective"

**Evidence from Logs**:
```
✅ INSERT INTO "public"."Conversation" ... (Saves successfully)
✅ {"level":30,"reqId":"req-2y","res":{"statusCode":201} (HTTP 201 Created)

❌ {"level":30,"reqId":"req-3a","res":{"statusCode":401} (401 Unauthorized)
❌ {"type":"FastifyError","message":"No Authorization was found in request.headers"
```

**Root Cause**:
- Backend IS saving conversations correctly (201 Created)
- Subsequent requests to RETRIEVE conversations fail with 401
- Frontend not including auth token in headers
- This is NOT a backend issue - it's a frontend auth token management issue

**Fix Strategy**:
1. **Verify frontend token storage**: Check if JWT is saved to localStorage/sessionStorage
2. **Check API client**: Ensure axios/fetch includes `Authorization: Bearer <token>` header
3. **Token refresh logic**: May need to refresh expired tokens
4. **Route protection**: Verify assistant routes require auth

**Files to Investigate** (Frontend):
- `apps/web/src/app/assistant/page.tsx` - API calls
- `apps/web/src/lib/api.ts` or similar - HTTP client configuration
- Auth context/hooks

**Priority**: Lower than Issues 1-4 since conversations ARE being saved, just not retrieved.

---

## Implementation Plan

### Phase 1: Diagnostics & Logging (1h)

**Goal**: Understand exactly what's happening at runtime

**Tasks**:
1. Add debug logging to `processMessage()`:
   ```typescript
   console.log('[DEBUG] unscheduledTasksCount:', unscheduledTasksCount);
   console.log('[DEBUG] detectMode() input:', { message, hasUnscheduledTasks: unscheduledTasksCount > 0 });
   console.log('[DEBUG] conversationHistory length:', conversationHistory?.length || 0);
   ```

2. Add debug logging to `callLocalLLM()`:
   ```typescript
   console.log('[DEBUG] LLM Request:', { systemPrompt: systemPrompt.substring(0, 100), contextLength: contextPrompt.length });
   console.log('[DEBUG] LLM Response (full):', llmResponse);
   ```

3. Add debug logging to `buildContextPrompt()`:
   ```typescript
   console.log('[DEBUG] Wake/Sleep context:', { wakeTime: user.wakeTime, sleepTime: user.sleepTime, timeZone: user.timeZone });
   ```

4. Test with user's exact scenario:
   - "What tasks do I have?"
   - "I'd like to schedule these tasks tomorrow from 9am-12pm and 1pm-5pm"
   - Capture full logs

**Expected Output**: Clear visibility into:
- Whether `hasUnscheduledTasks` is true/false
- Full LLM response to see if `[STRUCTURED_OUTPUT]` is present
- Whether conversation history is being passed
- How wake/sleep times are formatted in context

---

### Phase 2: Fix Mode Detection (1-2h)

**Goal**: Ensure `detectMode()` correctly identifies scheduling requests

**Tasks**:

1. **Fix Issue: unscheduledTasksCount calculation**

   Current code (estimated):
   ```typescript
   const unscheduledTasks = await prisma.task.findMany({
     where: { userId, scheduledAt: null, completed: false }
   });
   const unscheduledTasksCount = unscheduledTasks.length;
   ```

   Verify this query is correct. May need to check for `scheduledAt: null OR scheduledAt: undefined`.

2. **Expand scheduling keywords**

   Current:
   ```typescript
   const schedulingKeywords = ['schedule', 'plan my', 'block time', 'organize', ...];
   ```

   Add more variations:
   ```typescript
   const schedulingKeywords = [
     'schedule',
     'plan my',
     'block time',
     'organize',
     'i\'d like to schedule', // User's exact phrase
     'can we schedule',
     'let\'s schedule',
     'help me schedule',
     'create a schedule'
   ];
   ```

3. **Make keyword matching more flexible**

   Instead of exact substring match, use stemming or partial matching:
   ```typescript
   const isSchedulingRequest = schedulingKeywords.some((kw) => {
     return lower.includes(kw) || lower.replace(/[^\w\s]/g, '').includes(kw.replace(/[^\w\s]/g, ''));
   });
   ```

4. **Add fallback logic**

   If user asks to schedule but has no unscheduled tasks, don't silently fail:
   ```typescript
   if (isSchedulingRequest && !hasUnscheduledTasks) {
     // Return message: "You don't have any unscheduled tasks. Create some tasks first!"
     return 'conversation'; // But add flag to explain why
   }
   ```

**Test Cases**:
- ✅ "schedule my tasks" → scheduling
- ✅ "I'd like to schedule these tasks tomorrow" → scheduling
- ✅ "can we schedule it" → scheduling
- ✅ "what tasks do I have" → conversation
- ✅ "when am i free" → availability

---

### Phase 3: Fix Structured Output Generation (2-3h)

**Goal**: Ensure llama3.2 generates `[STRUCTURED_OUTPUT]` in scheduling mode

**Tasks**:

1. **Enhance scheduling.txt prompt - Move critical requirement to top**

   New structure:
   ```
   **SCHEDULING MODE**

   🚨 **CRITICAL REQUIREMENT**: Your response MUST have TWO parts:

   1. Natural language explanation (max 200 words)
   2. Structured JSON output (see template below)

   **YOU MUST END YOUR RESPONSE WITH THIS EXACT FORMAT**:

   [STRUCTURED_OUTPUT]
   ```json
   {
     "blocks": [...],
     "conflicts": [],
     "reasoning": "...",
     "confidence": "high"
   }
   ```

   If you do not include the [STRUCTURED_OUTPUT] section, the schedule CANNOT be applied.

   [Rest of prompt...]
   ```

2. **Add few-shot examples**

   Add 2-3 complete examples showing dual-output format:
   ```
   ## Example 1: Simple Scheduling

   User: "Schedule my homework for tomorrow"

   CORRECT RESPONSE:

   ## Your Tuesday Schedule

   I've planned your homework task for tomorrow morning:

   **Morning** (9:00 AM - 11:00 AM):
   • **Complete Math Homework** - 2 hours (HIGH priority)

   Review and apply when ready!

   [STRUCTURED_OUTPUT]
   ```json
   {
     "blocks": [
       {
         "taskId": "ckx123abc",
         "taskTitle": "Complete Math Homework",
         "start": "2025-12-24T14:00:00.000Z",
         "end": "2025-12-24T16:00:00.000Z",
         "priority": 3,
         "dueDate": "2025-12-24T23:59:59.999Z"
       }
     ],
     "conflicts": [],
     "reasoning": "Scheduled during productive morning hours",
     "confidence": "high"
   }
   ```
   ```

3. **Adjust LLM parameters in callLocalLLM()**

   Current (estimated):
   ```typescript
   const response = await ollama.chat({
     model: 'llama3.2',
     messages: [...],
     options: {
       temperature: 0.7, // May be too high
       // max_tokens not set?
     }
   });
   ```

   Adjust:
   ```typescript
   const response = await ollama.chat({
     model: 'llama3.2',
     messages: [...],
     options: {
       temperature: 0.3, // Lower for more deterministic output
       num_predict: 2000, // Ensure enough tokens for full response
       stop: ['[END_RESPONSE]'], // Optional stop sequence
     }
   });
   ```

4. **Test with gpt-oss model (Sprint 13.3-13.5 deliverable)**

   If llama3.2 still fails, try the upgraded model:
   ```typescript
   const response = await ollama.chat({
     model: 'gpt-oss', // Or whatever model name was configured in Sprint 13.4
     // ... rest same
   });
   ```

5. **Improve parseResponse() error handling**

   Add logging when structured output is missing:
   ```typescript
   if (!structuredOutputMatch) {
     console.error('[ERROR] No [STRUCTURED_OUTPUT] found in LLM response');
     console.error('[ERROR] Response preview:', llmResponse.substring(0, 500));
     // Optionally: Return error message to user
   }
   ```

**Test Cases**:
- ✅ Scheduling request → Response contains `[STRUCTURED_OUTPUT]`
- ✅ JSON is valid and parseable
- ✅ Natural language section is under 200 words
- ✅ Schedule preview card appears in UI

---

### Phase 4: Fix Conversation History (1h)

**Goal**: Ensure context is retained across messages

**Tasks**:

1. **Verify frontend is sending history**

   Check `apps/web/src/app/assistant/page.tsx`:
   ```typescript
   const response = await fetch('/api/assistant/chat', {
     method: 'POST',
     body: JSON.stringify({
       message: userMessage,
       conversationHistory: conversationMessages // Is this being sent?
     })
   });
   ```

2. **Verify backend route extracts history**

   Check `apps/backend/src/routes/assistant.ts`:
   ```typescript
   assistantRoutes.post('/chat', async (request, reply) => {
     const { message, conversationHistory } = request.body; // Is this extracted?

     const response = await processMessage(
       request.user.id,
       message,
       conversationHistory // Is this passed?
     );
   });
   ```

3. **If not being sent, retrieve from database**

   Add to `processMessage()`:
   ```typescript
   let history = conversationHistory;

   if (!history || history.length === 0) {
     // Fallback: Retrieve last 10 messages from database
     const conversation = await prisma.conversation.findFirst({
       where: { userId },
       orderBy: { createdAt: 'desc' },
       include: {
         messages: {
           orderBy: { createdAt: 'asc' },
           take: 10
         }
       }
     });

     history = conversation?.messages.map(msg => ({
       role: msg.role,
       content: msg.content
     })) || [];
   }
   ```

4. **Verify callLocalLLM() uses history correctly**

   Ensure history is formatted for Ollama API:
   ```typescript
   const messages = [
     ...(conversationHistory || []).map(msg => ({
       role: msg.role,
       content: msg.content
     })),
     { role: 'user', content: contextPrompt }
   ];

   const response = await ollama.chat({
     model: 'llama3.2',
     messages: messages, // Include full history
     // ...
   });
   ```

**Test Cases**:
- ✅ User asks "What tasks do I have?"
- ✅ User then asks "Schedule them for tomorrow"
- ✅ AI remembers the tasks from previous message
- ✅ AI builds on previous context

---

### Phase 5: Enhance Wake/Sleep Constraint Formatting (30min)

**Goal**: Make wake/sleep times more prominent and clear to LLM

**Tasks**:

1. **Update buildContextPrompt() to highlight constraints**

   Current (estimated):
   ```
   User Wake Time: 08:00
   User Sleep Time: 23:00
   ```

   Enhanced:
   ```
   🚨 **CRITICAL SCHEDULING CONSTRAINTS** 🚨

   - User's Wake Time: 8:00 AM (${user.timeZone})
   - User's Bed Time: 11:00 PM (${user.timeZone})

   ❌ **NEVER schedule tasks outside 8:00 AM - 11:00 PM**
   ❌ **NEVER schedule tasks before wake time or after bed time**

   Valid scheduling window: 8:00 AM to 11:00 PM (15 hours available)
   ```

2. **Add to scheduling.txt prompt**

   Add explicit section:
   ```
   ### Wake/Sleep Hours Constraint

   **CRITICAL**: The user has defined wake and sleep times. These are HARD boundaries.

   - Wake Time: When the user starts their day
   - Sleep Time: When the user goes to bed

   **RULES**:
   - Schedule blocks must be fully within wake/sleep window
   - A task starting at 10:30 PM with 2-hour duration is INVALID if sleep time is 11:00 PM
   - If a task cannot fit before sleep time, suggest next day
   ```

3. **Verify scheduleValidator.ts is checking this**

   Should already have validation (from Sprint 13.6):
   ```typescript
   const blockTime = new Date(block.start).getHours();
   const wakeHour = parseInt(user.wakeTime.split(':')[0]);
   const sleepHour = parseInt(user.sleepTime.split(':')[0]);

   if (blockTime < wakeHour || blockTime >= sleepHour) {
     warnings.push(`⚠️ Outside wake/sleep hours`);
   }
   ```

   Ensure this runs and adds to conflicts array.

**Test Cases**:
- ✅ User has wake: 8AM, sleep: 11PM
- ✅ AI suggests task at 7AM → Validation catches, adds warning
- ✅ AI suggests task at 11PM → Validation catches, adds warning
- ✅ All suggestions within 8AM-11PM window

---

### Phase 6: Frontend Auth Token Fix (Out of Scope)

**Note**: This is a frontend issue, not backend. Recommend separate ticket.

**Minimal Investigation**:
1. Check if JWT is being stored in localStorage
2. Check if API client includes Authorization header
3. Document findings for frontend team

**Not blocking**: Conversations ARE being saved, just not retrieved in UI.

---

## Testing Plan

### Test Scenario 1: Basic Scheduling Flow

**Setup**:
- User has 3 unscheduled tasks:
  1. "Pack Up Room" (HIGH, due Dec 23)
  2. "Study for Finals" (HIGH, due Dec 24)
  3. "Laundry" (MEDIUM, due Dec 25)
- User has wake: 8AM, sleep: 11PM
- User has calendar event: "CS 101 Lecture" Mon 2-4 PM (fixed)

**Test Steps**:
1. User: "What tasks do I have?"
   - Expected: Conversation mode, natural response listing 3 tasks, NO structured output

2. User: "Schedule my tasks for tomorrow"
   - Expected: Scheduling mode detected
   - Expected: LLM generates dual-output (natural + `[STRUCTURED_OUTPUT]`)
   - Expected: Schedule preview card appears in UI
   - Expected: Tasks scheduled around fixed lecture (not during 2-4 PM)
   - Expected: All tasks within 8AM-11PM window
   - Expected: No validation errors

3. User clicks "Apply Schedule"
   - Expected: Tasks saved to database with scheduled times
   - Expected: Google Calendar events created
   - Expected: Success message displayed

### Test Scenario 2: Conversation History

**Test Steps**:
1. User: "I need to study for finals and pack my room"
2. User: "When should I do these?"
3. User: "Schedule them for tomorrow morning"
   - Expected: AI remembers "study for finals" and "pack room" from message 1
   - Expected: Suggests times for both tasks

### Test Scenario 3: Wake/Sleep Enforcement

**Setup**:
- User has wake: 9AM, sleep: 10PM (shorter window)
- User has 4-hour task "Deep Work"

**Test Steps**:
1. User: "Schedule my deep work task for today"
   - Expected: AI suggests time within 9AM-10PM (13-hour window)
   - Expected: If can't fit 4 hours, suggests splitting or next day
   - Expected: No blocks before 9AM or after 10PM

### Test Scenario 4: Mode Transitions

**Test Steps**:
1. User: "When am I free this week?"
   - Expected: Availability mode, shows gaps, NO structured output

2. User: "Schedule my tasks in those gaps"
   - Expected: Switches to scheduling mode
   - Expected: Generates structured output

---

## Success Criteria

**Must Pass Before Sprint 13 Complete**:
- [x] Sprint 13.6 & 13.7 implementation (DONE)
- [ ] Mode detection: `conversation` / `scheduling` / `availability` works 100% of the time
- [ ] Scheduling mode: LLM generates `[STRUCTURED_OUTPUT]` reliably (>95% success rate)
- [ ] Schedule preview card appears when structured output present
- [ ] Tasks scheduled around fixed events (no overlaps)
- [ ] Tasks scheduled within wake/sleep window (or validation warnings appear)
- [ ] Conversation history retained across multi-turn dialogues
- [ ] Apply Schedule button creates calendar events successfully
- [ ] User can complete end-to-end flow: Ask → Schedule → Preview → Apply

**Nice to Have**:
- [ ] Frontend auth token issue resolved (separate ticket OK)
- [ ] Model upgraded to gpt-oss for better reliability
- [ ] Few-shot examples in prompts for consistency

---

## Risk Assessment

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| llama3.2 can't generate structured JSON reliably | Medium | High | Test with gpt-oss model (already available from Sprint 13.4) |
| Mode detection keywords too strict | Medium | High | Expand keyword list + add fuzzy matching |
| Conversation history requires DB retrieval | Low | Medium | Implement DB fallback if frontend doesn't send |
| Wake/sleep constraints too complex for LLM | Low | Medium | Server-side validation already catches violations |
| Frontend auth issue blocks testing | Low | Low | Can test backend directly with Postman/curl |

---

## Files to Modify

**Backend** (7 files):
1. `apps/backend/src/services/assistantService.ts`
   - Add debug logging (Phase 1)
   - Expand scheduling keywords (Phase 2)
   - Fix unscheduledTasksCount logic (Phase 2)
   - Add conversation history fallback (Phase 4)
   - Enhance wake/sleep context formatting (Phase 5)
   - Adjust LLM parameters (Phase 3)

2. `apps/backend/src/prompts/scheduling.txt`
   - Move critical requirement to top (Phase 3)
   - Add few-shot examples (Phase 3)
   - Add wake/sleep constraint section (Phase 5)

3. `apps/backend/src/prompts/base.txt`
   - Possibly enhance if needed after testing

4. `apps/backend/src/routes/assistant.ts`
   - Verify conversationHistory extraction (Phase 4)

5. `apps/backend/src/utils/scheduleValidator.ts`
   - Verify wake/sleep validation working (Phase 5)

6. `apps/backend/src/services/promptManager.ts`
   - No changes expected, but verify prompts loading correctly

7. `apps/backend/src/utils/eventClassifier.ts`
   - No changes expected, verify fixed event classification

**Frontend** (1-2 files - separate ticket):
1. `apps/web/src/app/assistant/page.tsx`
   - Verify sending conversationHistory (Phase 4)
   - Fix auth token issue (Phase 6 - separate ticket)

2. `apps/web/src/lib/api.ts` (or equivalent)
   - Verify Authorization header included (Phase 6)

---

## Rollback Plan

**If fixes introduce regressions**:
```bash
# Restore previous state
git checkout HEAD -- apps/backend/src/services/assistantService.ts
git checkout HEAD -- apps/backend/src/prompts/scheduling.txt
pnpm dev:backend

# Verify Sprint 13.6/13.7 base implementation still works
```

**Safe because**:
- All fixes are isolated to prompt content and service logic
- No database schema changes
- No API contract changes
- No breaking type changes

---

## Time Estimate: 4-6 hours

| Phase | Tasks | Time |
|-------|-------|------|
| Phase 1 | Add diagnostics logging | 1h |
| Phase 2 | Fix mode detection | 1-2h |
| Phase 3 | Fix structured output | 2-3h |
| Phase 4 | Fix conversation history | 1h |
| Phase 5 | Enhance wake/sleep formatting | 30min |
| Phase 6 | Document frontend auth issue | 15min |
| **Total** | | **4-6h** |

**Testing**: Additional 1-2h for comprehensive end-to-end testing

---

## Next Steps

1. **Get user approval** on this fix plan
2. **Begin Phase 1**: Add diagnostic logging
3. **Run test scenario** with user's exact conversation
4. **Analyze logs** to confirm root causes
5. **Implement fixes** in phases 2-5
6. **Test end-to-end** with all 4 test scenarios
7. **Document results** and update KNOWN_ISSUES.md
8. **Mark Sprint 13 tasks complete** once all issues resolved

---

**Last Updated**: 2025-12-21
**Author**: Claude (AI Assistant)
**Status**: READY FOR REVIEW & APPROVAL
