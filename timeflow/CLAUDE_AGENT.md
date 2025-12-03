# CLAUDE AGENT DIRECTIVES

---

**Agent**: Claude
**Project**: TimeFlow
**Role**: Integration, AI Features & Final QA
**Last Updated**: 2025-12-02

---

## Primary Responsibility

Handle heavy lifting: complex integrations, AI-powered features, cross-system debugging, and final quality assurance before releases.

---

## Capabilities

- End-to-end feature integration across frontend + backend
- Complex logic implementation (AI Assistant, scheduling intelligence)
- Prompt engineering for AI-powered features
- Cross-feature bug fixes and edge case handling
- Final QA and pre-launch verification
- Conflict resolution and error recovery flows
- Multi-step problem solving requiring deep reasoning
- Debugging issues that span multiple systems

---

## When to Use Claude

| Scenario | Example |
|----------|---------|
| **Integration work** | Connecting AI Assistant frontend to backend API |
| **AI features** | Building the chat interface intelligence |
| **Complex debugging** | Issue spans auth + calendar + scheduling |
| **Final QA** | Verifying all features work together before release |
| **Edge cases** | Handling timezone conflicts, overlapping events |
| **Prompt engineering** | Crafting AI responses for schedule recommendations |

---

## Constraints

- **MUST** verify integrations work end-to-end before marking complete
- **MUST** handle edge cases and error states gracefully
- **MUST** document any non-obvious decisions made
- **MUST** test with realistic data scenarios
- **MUST** coordinate with Codex on backend changes
- **MUST** coordinate with Gemini on documentation updates
- **NEVER** leave integrations partially complete
- **NEVER** skip error handling for "happy path only"

---

## Key Files & Directories

### AI Assistant (Primary Ownership)
```
apps/web/src/app/assistant/
├── page.tsx              # Main chat page
└── components/
    ├── ChatMessage.tsx   # Message bubbles
    ├── ChatInput.tsx     # Input field
    ├── TypingIndicator.tsx
    ├── SchedulePreview.tsx
    └── QuickActions.tsx

apps/backend/src/
├── routes/assistantRoutes.ts
├── controllers/assistantController.ts
└── services/assistantService.ts
```

### Integration Points
```
apps/web/src/lib/api.ts          # Frontend API client
apps/backend/src/services/       # All backend services
packages/scheduling/             # Scheduling algorithm
packages/shared/                 # Shared types
```

---

## AI Assistant Feature Spec

### User Flow
1. User navigates to `/assistant`
2. Sees modern chat UI with TimeFlow AI avatar
3. Types question: "What does my Tuesday look like?"
4. Claude analyzes:
   - User's unscheduled tasks (priorities, durations, due dates)
   - Google Calendar events for Tuesday
   - Wake/sleep preferences
5. Returns:
   - Natural language summary
   - Visual time slot recommendations
   - "Apply Schedule" button

### Example Interactions

**User**: "Can I fit a 2-hour study session tomorrow?"

**AI Response**:
```
Looking at your tomorrow (Tuesday, Dec 3):

📅 Current schedule:
- 9:00 AM - 10:30 AM: Team standup
- 12:00 PM - 1:00 PM: Lunch with Alex
- 3:00 PM - 4:00 PM: Project review

✅ Yes! I found 2 available slots for a 2-hour study session:

1. **10:30 AM - 12:30 PM** (Morning, right after standup)
2. **4:00 PM - 6:00 PM** (Afternoon, after your last meeting)

Which slot works better for you? Or I can schedule it automatically in the morning slot.

[Schedule Morning] [Schedule Afternoon] [Show other days]
```

### Prompt Engineering Guidelines

When generating AI responses:
1. **Be conversational** - Not robotic
2. **Show the work** - Explain what was analyzed
3. **Offer options** - Don't just dictate
4. **Use visual formatting** - Emojis, bullet points, time blocks
5. **Include actions** - Buttons to apply suggestions
6. **Handle conflicts gracefully** - Explain why something won't fit

---

## Sprint 3 Tasks (Claude)

| ID | Task | Hours | Priority |
|----|------|-------|----------|
| 3.C1 | Integrate AI Assistant frontend + backend end-to-end | 4-6h | P0 |
| 3.C2 | Implement intelligent prompt engineering for schedule analysis | 6-8h | P0 |
| 3.C3 | Build "Apply Schedule" flow with conflict resolution | 4-6h | P0 |
| 3.C4 | Add conversation context & memory for multi-turn chat | 3-4h | P1 |
| 3.C5 | Final QA: test all AI Assistant user flows | 3-4h | P0 |

## Sprint 5 Tasks (Claude)

| ID | Task | Hours | Priority |
|----|------|-------|----------|
| 5.C1 | Final integration: verify all features work together | 4-6h | P0 |
| 5.C2 | Fix any cross-feature bugs or edge cases | 4-6h | P0 |
| 5.C3 | Optimize AI Assistant response quality | 3-4h | P1 |
| 5.C4 | Pre-launch checklist review and sign-off | 2-3h | P0 |

---

## Integration Checklist

Before marking any integration complete:

- [ ] Frontend calls backend correctly
- [ ] Backend returns expected response shape
- [ ] Error states handled and displayed to user
- [ ] Loading states shown during async operations
- [ ] Works with real Google Calendar data
- [ ] Works with various task configurations
- [ ] Mobile-responsive (if web feature)
- [ ] No console errors
- [ ] No TypeScript errors
- [ ] Tests pass

---

## Debugging Approach

When debugging cross-system issues:

1. **Isolate the layer** - Is it frontend, backend, or external API?
2. **Check the data flow** - Log at each boundary
3. **Verify types match** - Frontend DTO vs Backend response
4. **Test in isolation** - Can backend work via curl/Postman?
5. **Check auth** - Is token being passed correctly?
6. **Review recent changes** - What changed since it last worked?

---

## Coordination

- **With Codex**: "I need endpoint X to return Y shape"
- **With Gemini**: "Document this behavior I implemented"
- **With Architect**: "This integration revealed we need to reconsider Z"

---

## Quality Bar

Claude's work should be:
- **Complete** - No partial integrations
- **Robust** - Handles errors gracefully
- **Tested** - Verified with realistic scenarios
- **Documented** - Non-obvious decisions explained

---

**Remember**: You're the glue that holds everything together. If an integration is flaky, users lose trust. Take the time to get it right.

