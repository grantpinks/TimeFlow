# Sprint 14 Extension: AI-Powered Event Categorization

**Project**: TimeFlow
**Status**: Planning
**Priority**: P0 - Core AI Feature
**Created**: 2025-12-26

---

## Problem Statement

Currently, external Google Calendar events display in gray while TimeFlow tasks use category colors. This creates visual inconsistency and doesn't leverage our AI capabilities. Users expect ALL events (both tasks and external calendar events) to be intelligently categorized and color-coded according to their TimeFlow category system.

**User Expectation**: "Our AI should automatically categorize my Google Calendar meetings/events into Professional, Personal, etc. just like it does with tasks."

---

## Core Concept

TimeFlow should use AI to analyze external calendar events and assign them to existing user categories (Professional, Personal, Health, etc.). This creates a unified, color-coded calendar experience where:

- **Tasks**: Already use category colors ✓
- **External Events**: Will be AI-categorized and use category colors (NEW)
- **Visual Consistency**: Everything follows the category legend
- **User Control**: AI suggestions can be overridden

---

## System Architecture

### 1. Database Schema Changes

**New Model: `EventCategorization`**
```prisma
model EventCategorization {
  id            String   @id @default(cuid())
  userId        String
  user          User     @relation(fields: [userId], references: [id], onDelete: Cascade)

  // External event identifiers
  eventId       String   // Google Calendar event ID
  calendarId    String   // Which calendar it's from
  provider      String   // "google" or "apple"

  // Categorization
  categoryId    String
  category      Category @relation(fields: [categoryId], references: [id], onDelete: Cascade)

  // Metadata
  confidence    Float    @default(0.0) // AI confidence score 0-1
  isManual      Boolean  @default(false) // User manually set?
  eventSummary  String   // Cached event title for re-categorization

  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt

  @@unique([userId, eventId, provider])
  @@index([userId, categoryId])
}
```

### 2. Backend Services

**New Service: `eventCategorizationService.ts`**

Key functions:
```typescript
// Analyze event and suggest category
async function categorizeEvent(
  userId: string,
  event: CalendarEvent
): Promise<{ categoryId: string; confidence: number }>

// Bulk categorize all uncategorized events
async function categorizeUserEvents(
  userId: string
): Promise<{ categorized: number; failed: number }>

// Get categorization for specific event
async function getEventCategorization(
  userId: string,
  eventId: string,
  provider: string
): Promise<EventCategorization | null>

// Update/override categorization
async function updateEventCategorization(
  userId: string,
  eventId: string,
  provider: string,
  categoryId: string,
  isManual: boolean
): Promise<EventCategorization>

// Batch get categorizations for display
async function getEventCategorizations(
  userId: string,
  eventIds: string[]
): Promise<Map<string, EventCategorization>>
```

**AI Categorization Logic** (in `assistantService.ts` or new `categorizationAI.ts`):
```typescript
async function categorizeEventWithAI(
  event: CalendarEvent,
  userCategories: Category[]
): Promise<{ categoryId: string; confidence: number }> {
  // Use Claude API to analyze:
  // - Event title
  // - Event description
  // - Event attendees (work emails vs personal)
  // - Day/time patterns (weekday mornings = Professional?)
  //
  // Return best matching category + confidence score
}
```

### 3. API Endpoints

**New Routes**:
```
POST   /api/events/categorize           # Trigger AI categorization for all events
GET    /api/events/:eventId/category    # Get category for specific event
PUT    /api/events/:eventId/category    # Update category (manual override)
POST   /api/events/bulk-categorize      # Categorize multiple events at once
```

### 4. Frontend Integration

**Modified Files**:

`apps/web/src/app/calendar/page.tsx`:
```typescript
// Fetch event categorizations along with events
const [eventCategorizations, setEventCategorizations] = useState<Map<string, string>>();

useEffect(() => {
  async function loadCategorizations() {
    const eventIds = externalEvents.map(e => e.id);
    const cats = await api.getEventCategorizations(eventIds);
    setEventCategorizations(cats);
  }
  if (externalEvents.length > 0) {
    loadCategorizations();
  }
}, [externalEvents]);
```

`apps/web/src/components/CalendarView.tsx`:
```typescript
// Pass categorizations to CalendarView
interface CalendarViewProps {
  // ... existing props
  eventCategorizations?: Map<string, string>; // eventId -> categoryId
  categories: Category[]; // Pass user categories
}

// In events useMemo - attach category info
for (const event of externalEvents) {
  const categoryId = eventCategorizations?.get(event.id);
  const category = categories.find(c => c.id === categoryId);

  calendarEvents.push({
    id: `event-${event.id}`,
    title: event.summary,
    start: new Date(event.start),
    end: new Date(event.end),
    isTask: false,
    categoryColor: category?.color, // NOW HAS COLOR!
  });
}
```

### 5. User Experience Flow

**Initial Setup** (First time user connects Google Calendar):
1. User connects Google Calendar
2. Background job: Categorize all events using AI
3. Show notification: "Categorized 47 events into your categories"

**Ongoing Sync**:
1. New event appears in Google Calendar
2. On next sync, AI categorizes it automatically
3. Event appears on TimeFlow calendar with category color

**Manual Override**:
1. User clicks external event
2. Popover shows: "Professional (AI suggested)" with dropdown
3. User can change to different category
4. System marks as `isManual: true` and won't re-categorize

**Re-categorization**:
- When user adds/modifies categories, offer to re-categorize events
- Background job can periodically improve categorizations
- Low-confidence categorizations can be flagged for user review

---

## Implementation Phases

### Phase 1: Database & Backend (6-8 hours)
**Priority**: P0

- [ ] 1.1 Create `EventCategorization` Prisma model
- [ ] 1.2 Run migration to add table
- [ ] 1.3 Implement `eventCategorizationService.ts` with CRUD functions
- [ ] 1.4 Create AI categorization logic using Claude API
- [ ] 1.5 Add API endpoints for categorization operations

**Files to Create/Modify**:
- `apps/backend/prisma/schema.prisma`
- `apps/backend/src/services/eventCategorizationService.ts`
- `apps/backend/src/services/categorizationAI.ts` (optional, or add to assistantService)
- `apps/backend/src/routes/eventCategorization.ts`

### Phase 2: Frontend Integration (4-6 hours)
**Priority**: P0

- [ ] 2.1 Add API client functions for event categorization
- [ ] 2.2 Fetch categorizations when loading calendar
- [ ] 2.3 Pass categorizations to CalendarView component
- [ ] 2.4 Update event color logic to use category colors for external events
- [ ] 2.5 Update EventDetailPopover to show/edit category

**Files to Modify**:
- `apps/web/src/lib/api.ts`
- `apps/web/src/app/calendar/page.tsx`
- `apps/web/src/components/CalendarView.tsx`
- `apps/web/src/components/EventDetailPopover.tsx`

### Phase 3: Initial Categorization & UX (3-4 hours)
**Priority**: P1

- [ ] 3.1 Add "Categorize Events" button in calendar header
- [ ] 3.2 Show loading state during bulk categorization
- [ ] 3.3 Display success message with categorization results
- [ ] 3.4 Add category dropdown to event popover for manual override
- [ ] 3.5 Visual indicator for AI-suggested vs manual categorizations

### Phase 4: Polish & Optimization (2-3 hours)
**Priority**: P2

- [ ] 4.1 Cache categorizations to reduce API calls
- [ ] 4.2 Background sync: Auto-categorize new events
- [ ] 4.3 Settings: Option to re-categorize all events
- [ ] 4.4 Analytics: Track categorization accuracy
- [ ] 4.5 Handle edge cases (deleted categories, moved events)

---

## AI Categorization Strategy

### Input Analysis

For each external event, analyze:

1. **Event Title**: Keywords/patterns
   - "Team standup" → Professional
   - "Gym" → Health
   - "Dinner with friends" → Personal

2. **Event Description**: Context clues
   - Work-related terminology
   - Personal notes/informal language

3. **Attendees**: Email domains
   - @company.com → Professional
   - Personal emails → Personal

4. **Timing Patterns**:
   - Weekday 9-5 → Professional
   - Evening/weekend → Personal
   - Morning → Health (if keywords match)

5. **Recurrence**:
   - Daily standup → Professional
   - Weekly yoga → Health

### Confidence Scoring

- **High (>0.8)**: Clear keywords + attendees match
- **Medium (0.5-0.8)**: Some signals, needs validation
- **Low (<0.5)**: Ambiguous, suggest "Uncategorized"

### Prompt Template

```
Analyze this calendar event and categorize it into one of the user's categories.

Event Title: {title}
Event Description: {description}
Attendees: {attendees}
Time: {dayOfWeek} at {time}
Recurrence: {recurrence}

Available Categories:
{categories with descriptions}

Return:
1. Best matching category ID
2. Confidence score (0-1)
3. Brief reasoning

Consider:
- Keywords in title/description
- Professional vs personal email domains
- Time of day (work hours vs personal time)
- Recurring patterns
```

---

## Testing Strategy

### Unit Tests
- Event categorization logic with various event types
- Confidence scoring accuracy
- Manual override persistence

### Integration Tests
- End-to-end categorization flow
- Bulk categorization performance
- Category change propagation

### User Acceptance Tests
- Calendar displays all events with correct colors
- Legend accurately represents all categories
- Manual override works correctly
- Re-categorization doesn't break existing overrides

---

## Success Metrics

1. **Categorization Accuracy**: >85% of AI categorizations accepted by users
2. **User Adoption**: >70% of users use AI categorization within first week
3. **Manual Override Rate**: <15% (indicates good AI performance)
4. **Performance**: Bulk categorization completes in <5 seconds for 100 events
5. **Visual Consistency**: 100% of events on calendar have category colors

---

## Risks & Mitigations

| Risk | Impact | Mitigation |
|------|--------|------------|
| AI misclassifies important events | High | Show confidence scores; easy manual override |
| Performance issues with bulk categorization | Medium | Batch processing; background jobs |
| User privacy concerns with AI analysis | High | Clear privacy policy; local processing option |
| Category changes break existing categorizations | Medium | Re-categorization workflow; preserve manual overrides |

---

## Future Enhancements

1. **Learning from Overrides**: AI learns from user corrections
2. **Multi-factor Categorization**: Combine AI + rules + user patterns
3. **Category Suggestions**: AI suggests new categories based on event patterns
4. **Smart Filters**: "Show only Professional events this week"
5. **Cross-platform Sync**: Categorizations work across Google + Apple calendars

---

## Dependencies

- Claude API (for AI categorization)
- Existing category system
- Google Calendar sync infrastructure
- Prisma ORM for database operations

---

**Next Steps**:
1. Review and approve this plan
2. Update Sprint 14 roadmap with new tasks
3. Begin Phase 1 implementation (Database & Backend)
4. Iterate based on user testing feedback
