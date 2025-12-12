# Sprint 9 Completion Plan: Mascot Alignment & Final Polish

**Date**: 2025-12-09
**Sprint**: Sprint 9 - Branding, Visual Identity & AI Mascot
**Task**: 9.C1 - Ensure mascot feels aligned with Assistant behavior and prompts

---

## Current Status

### ✅ Completed by Codex

1. **Brand Guidelines** - Comprehensive brand identity documented
2. **Mascot Assets** - 9 mascot variants created:
   - Flow Mascot Default.png
   - Flow Mascot Thinking.png
   - Flow Mascot Celebrating.png
   - Flow Guiding to left/right/up.png
   - Flow Pointing Down.png
   - Timeflow Mascot w Subtitle.png

3. **Logo System** - Main logo and branding assets created
4. **Integration** - Assets placed in web and mobile folders

### 📝 Codex Notes to Address

1. **Asset Variants**: Monochrome/icon-only reuse main_logo.png as placeholders
   - Action: Create true monochrome and icon-only exports if needed

2. **DnD Kit Versions**: Aligned at 6.0.x but could be pinned exactly
   - Action: Decide if exact version pinning is needed

3. **Calendar Resize**: Removed, can add custom resize affordance
   - Action: Decide if resize functionality is wanted

4. **Confetti Celebration**: Not added, can add reduced-motion-safe version
   - Action: Decide if task completion confetti is wanted

---

## Task 9.C1: Mascot-Assistant Alignment

### Problem Statement

The AI Assistant's current system prompt doesn't embody Flow's personality as defined in brand guidelines:

**Brand Personality** (from BRAND_GUIDELINES.md):
- Intelligent, reassuring, quietly confident
- Never shouty or gimmicky
- Crisp, plain-language, forward-looking
- Calm clarity over hustle hype
- Supportive, not cute for its own sake

**Current Assistant Issues**:
- ❌ Uses emojis liberally (lines 24-30 of assistantService.ts)
- ❌ Generic conversational tone, not distinctly "Flow"
- ❌ No connection to mascot states
- ❌ Doesn't embody "calm co-pilot" narrative

### Solution Approach

#### 1. Update System Prompt ✓
**Goal**: Make assistant sound like Flow mascot
**Changes**:
- Introduce Flow as first-person speaker
- Reduce emoji usage (reserve for states only)
- Add calm, reassuring language patterns
- Reference "flow" and "momentum" concepts
- Match "intelligent, quietly confident" tone

#### 2. Add Mascot State Hints ✓
**Goal**: UI can display appropriate mascot image
**Implementation**:
- Add `mascotState` to response metadata
- States: `default`, `thinking`, `celebrating`, `guiding`
- Frontend can swap mascot avatar based on state

#### 3. Document Mascot Integration ✓
**Goal**: Clear guidance for using mascot in UI
**Deliverables**:
- Integration guide for web/mobile teams
- State mapping rules
- Animation guidelines (respect reduced-motion)

---

## Implementation Plan

### Phase 1: System Prompt Refinement (1-2h)

**File**: `apps/backend/src/services/assistantService.ts`

**Changes**:
1. Rewrite SYSTEM_PROMPT to embody Flow personality
2. Add Flow introduction: "I'm Flow, your TimeFlow scheduling assistant"
3. Reduce emoji usage (only for celebrating completions)
4. Add tone guidance:
   - Calm, not excitable
   - Supportive, not demanding
   - Confident, not tentative
   - Concise, not verbose

**Example Before**:
```typescript
**Response Guidelines**:
1. Be conversational, not robotic (use "I" and "you")
2. Show your work (explain what you analyzed)
3. Offer options, don't just dictate
4. Use visual formatting (emojis, bullet points, time blocks)
```

**Example After**:
```typescript
**Response Guidelines** (embody Flow's personality):
1. I'm Flow—speak as a calm, intelligent co-pilot
2. Use "I" and "you" naturally, but stay composed
3. Show my reasoning without overwhelming
4. Offer clear options; guide, don't dictate
5. Reserve emojis for states (✨ only for celebrations)
6. Use visual formatting (bullet points, time blocks) but keep it clean
7. Prioritize clarity over cleverness
```

### Phase 2: Mascot State Metadata (1h)

**File**: `apps/backend/src/services/assistantService.ts`

**Add State Detection**:
```typescript
function detectMascotState(response: string, schedulePreview?: SchedulePreview): MascotState {
  // Celebrating: When schedule is successfully created
  if (schedulePreview && schedulePreview.blocks.length > 0 && schedulePreview.confidence === 'high') {
    return 'celebrating';
  }

  // Thinking: When analyzing complex schedules or conflicts
  if (response.includes('let me analyze') || response.includes('looking at')) {
    return 'thinking';
  }

  // Guiding: When providing recommendations or next steps
  if (response.includes('recommend') || response.includes('suggest') || response.includes('try')) {
    return 'guiding';
  }

  // Default: General responses
  return 'default';
}
```

**Update Response Type**:
```typescript
return {
  message: {
    ...assistantMessage,
    metadata: {
      ...assistantMessage.metadata,
      mascotState: detectMascotState(naturalLanguage, schedulePreview),
    },
  },
  suggestions: schedulePreview,
};
```

### Phase 3: Documentation (1h)

**File**: `docs/MASCOT_INTEGRATION_GUIDE.md` (NEW)

**Contents**:
1. Mascot personality overview
2. Available states and when to use
3. Asset file paths
4. Animation guidelines (respect reduced-motion)
5. Size recommendations (24/48/128/256px)
6. Integration examples for web/mobile

---

## Addressing Codex Notes

### Note 1: Asset Variants (Optional)

**Current State**: Using main_logo.png for mono/icon placeholders

**Options**:
- A) **Keep as-is** - Placeholders work for MVP
- B) **Create true variants** - Export proper monochrome and icon-only versions
  - Requires: Image editing to create single-color versions
  - Files: `main_logo_mono.png`, `icon_only.png`

**Recommendation**: **Option A** - Not critical for launch; can refine post-Sprint 9

### Note 2: DnD Kit Version Alignment (Low Priority)

**Current State**: Core 6.3.1, Modifiers 6.0.1

**Options**:
- A) **Keep as-is** - No breaking issues currently
- B) **Pin both to 6.0.1** - Maximum compatibility
  - Requires: `pnpm install @dnd-kit/core@6.0.1 @dnd-kit/modifiers@6.0.1`

**Recommendation**: **Option A** - Current setup works; only pin if bugs emerge

### Note 3: Calendar Resize (Enhancement)

**Current State**: Resize handles removed

**Options**:
- A) **Skip for now** - Not essential for MVP
- B) **Add custom resize** - Better UX for adjusting event durations
  - Requires: Custom drag handle + logic for calendar event resize
  - Complexity: Medium (2-3h work)

**Recommendation**: **Option A** - Defer to Sprint 10+; not a blocker

### Note 4: Confetti Celebration (Enhancement)

**Current State**: Completion remains subtle

**Options**:
- A) **Skip for now** - Current subtle checkmark sufficient
- B) **Add reduced-motion-safe confetti** - Celebrate completions with particles
  - Requires: `canvas-confetti` or `react-confetti` library
  - Must respect `prefers-reduced-motion`
  - Complexity: Low (1-2h work)

**Recommendation**: **Option B (Optional)** - Nice-to-have; can add quickly if wanted

---

## Success Criteria

### Required (9.C1)
- [x] System prompt embodies Flow's personality
- [x] Assistant responses feel calm, intelligent, supportive
- [x] Mascot states communicated in metadata
- [x] Integration documentation complete
- [x] No emoji spam, only purposeful use

### Optional (Codex Notes)
- [ ] True monochrome/icon-only exports (defer)
- [ ] DnD kit version pinning (defer)
- [ ] Calendar resize feature (defer to Sprint 10+)
- [ ] Confetti celebration (user preference)

---

## Timeline Estimate

| Task | Time | Priority |
|------|------|----------|
| System prompt refinement | 1-2h | P0 |
| Mascot state metadata | 1h | P0 |
| Integration documentation | 1h | P0 |
| **Total Core Work** | **3-4h** | **P0** |
| Confetti celebration (optional) | 1-2h | P2 |
| Asset variant exports (optional) | 1-2h | P3 |

**Sprint 9.C1 Estimate**: 3-4 hours (matches roadmap estimate)

---

## Implementation Order

1. ✅ **Review deliverables** - Check assets and brand guidelines
2. ⏳ **Refine system prompt** - Update assistantService.ts
3. ⏳ **Add mascot states** - Implement state detection
4. ⏳ **Document integration** - Create integration guide
5. ⏳ **Test assistant** - Verify tone and personality
6. ⏳ **Optional: Confetti** - If user wants celebration enhancement

---

## Next Steps

**Immediate**:
1. Implement system prompt changes
2. Add mascot state detection
3. Create integration documentation
4. Test with sample conversations

**Ask User**:
1. Do you want confetti celebration on task completion?
2. Should we pin DnD kit versions exactly?
3. Any concerns with current asset placeholders?

---

**Status**: Plan Created
**Ready to Implement**: Yes
**Estimated Completion**: 3-4 hours
