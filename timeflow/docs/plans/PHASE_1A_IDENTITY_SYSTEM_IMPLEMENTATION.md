# Phase 1A: Identity Connection System - Implementation Plan

**Sprint**: 18  
**Phase**: 1A (Identity Connection System)  
**Duration**: ~40-50 hours  
**Status**: 🟡 Planning Complete, Ready for Implementation

---

## Executive Summary

Build the foundation for identity-driven productivity by creating a dedicated Identity model, migrating existing habit identity strings, and enabling users to link tasks and habits to their personal identity goals. This phase establishes the core data model and basic UI patterns that later phases will build upon.

---

## Design Decisions (Confirmed)

### Identity Model
- **Hard limit**: 5 identities per user (enforced at API level)
- **Structure**: Dedicated `Identity` table with proper relationships
- **Migration**: Auto-migrate existing habit identity strings into new model
- **Colors**: Curated palette of 8 brand-aligned colors
- **Icons**: Emoji picker (one emoji per identity)

### User Experience
- **Creation Flow**: Show 10 starter identity templates as suggestions
  - Templates: Professional, Personal Growth, Health & Fitness, Creative, Financial Freedom, Relationships & Social, Learning & Knowledge, Mindfulness & Spiritual, Home & Environment, Adventure & Travel
  - Users can customize templates or create from scratch
- **Task Linking**: Optional but encouraged (like categories)
  - Subtle "Link to identity?" prompt for unlinked tasks
  - Email-to-task auto-detects identity with changeable suggestion
- **Progress Display**: 
  - Primary: Today page header with clickable filters
  - Secondary: Habits page
  - Metrics: Show both completion count + time spent (daily focus)

### Technical Approach
- **Progress Calculation**: Count + time-weighted (both metrics)
- **Email Intelligence**: Keyword + pattern-based (AI-powered in Phase 1B)
- **Design Pattern**: Inline badges for tasks, gradient cards for habits
- **Mobile**: Full feature parity (create/edit/delete identities)

---

## Database Schema

### New Table: Identity

```prisma
model Identity {
  id          String   @id @default(cuid())
  userId      String
  name        String   // "Writer", "Athlete", "Leader"
  description String?  // Optional longer description
  color       String   // From curated palette (hex color)
  icon        String   // Emoji character
  sortOrder   Int      @default(0) // For manual reordering
  isActive    Boolean  @default(true)
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
  
  user        User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  tasks       Task[]   // Tasks linked to this identity
  habits      Habit[]  // Habits linked to this identity (future: will replace string field)
  
  @@unique([userId, name]) // Prevent duplicate names per user
  @@index([userId])
  @@index([userId, sortOrder])
}
```

### Updated Table: Task

```prisma
model Task {
  // ... existing fields ...
  identityId String? // Optional FK to Identity
  identity   Identity? @relation(fields: [identityId], references: [id], onDelete: SetNull)
  
  @@index([identityId])
}
```

### Updated Table: Habit (Future - Phase 1A keeps string field for now)

```prisma
model Habit {
  // ... existing fields including identity, longTermGoal, whyStatement ...
  identityId String? // NEW: Optional FK to Identity (for future migration)
  identityModel Identity? @relation(fields: [identityId], references: [id], onDelete: SetNull)
  
  // Keep existing identity string field for backward compatibility during Phase 1A
  identity String? // "Writer", "Athlete" - will deprecate in Phase 1B
  
  @@index([identityId])
}
```

---

## Curated Color Palette

**Brand-Aligned Identity Colors** (8 colors):

1. **Primary Teal** - `#0d9488` (Professional, Productivity)
2. **Deep Blue** - `#2563eb` (Learning, Focus)
3. **Emerald Green** - `#059669` (Health, Wellness)
4. **Amber** - `#d97706` (Creativity, Energy)
5. **Purple** - `#7c3aed` (Spirituality, Mindfulness)
6. **Rose** - `#e11d48` (Relationships, Social)
7. **Indigo** - `#4f46e5` (Leadership, Growth)
8. **Slate** - `#475569` (Personal, Life Admin)

**Frontend constant**:
```typescript
export const IDENTITY_COLORS = [
  { name: 'Teal', hex: '#0d9488', label: 'Professional' },
  { name: 'Blue', hex: '#2563eb', label: 'Learning' },
  { name: 'Green', hex: '#059669', label: 'Health' },
  { name: 'Amber', hex: '#d97706', label: 'Creative' },
  { name: 'Purple', hex: '#7c3aed', label: 'Mindful' },
  { name: 'Rose', hex: '#e11d48', label: 'Social' },
  { name: 'Indigo', hex: '#4f46e5', label: 'Leadership' },
  { name: 'Slate', hex: '#475569', label: 'Personal' },
] as const;
```

---

## Starter Identity Templates

**10 Default Templates** (shown on first identity creation):

```typescript
export const IDENTITY_TEMPLATES = [
  {
    name: 'Professional',
    description: 'Career growth, skills, and work achievements',
    icon: '💼',
    color: '#0d9488',
    suggestedGoal: 'Advance in my career and build valuable skills',
  },
  {
    name: 'Personal Growth',
    description: 'Self-improvement, learning, and life goals',
    icon: '🌱',
    color: '#7c3aed',
    suggestedGoal: 'Become the best version of myself',
  },
  {
    name: 'Health & Fitness',
    description: 'Physical wellness, exercise, and nutrition',
    icon: '💪',
    color: '#059669',
    suggestedGoal: 'Build a strong, healthy body and mind',
  },
  {
    name: 'Creative',
    description: 'Art, writing, music, and creative projects',
    icon: '🎨',
    color: '#d97706',
    suggestedGoal: 'Express myself and create meaningful work',
  },
  {
    name: 'Financial Freedom',
    description: 'Money management, investing, and financial goals',
    icon: '💰',
    color: '#059669',
    suggestedGoal: 'Build wealth and achieve financial independence',
  },
  {
    name: 'Relationships & Social',
    description: 'Family, friends, and meaningful connections',
    icon: '💕',
    color: '#e11d48',
    suggestedGoal: 'Nurture deep, meaningful relationships',
  },
  {
    name: 'Learning & Knowledge',
    description: 'Education, reading, and skill acquisition',
    icon: '📚',
    color: '#2563eb',
    suggestedGoal: 'Become a lifelong learner and master new skills',
  },
  {
    name: 'Mindfulness & Spiritual',
    description: 'Meditation, reflection, and inner peace',
    icon: '🧘',
    color: '#7c3aed',
    suggestedGoal: 'Cultivate inner peace and self-awareness',
  },
  {
    name: 'Home & Environment',
    description: 'Living space, organization, and domestic life',
    icon: '🏡',
    color: '#475569',
    suggestedGoal: 'Create a peaceful, organized living space',
  },
  {
    name: 'Adventure & Travel',
    description: 'Exploration, new experiences, and travel',
    icon: '✈️',
    color: '#d97706',
    suggestedGoal: 'Explore the world and create lasting memories',
  },
] as const;
```

**UX Flow**:
1. User clicks "Create Identity" for the first time
2. Modal shows: "Choose a template or start from scratch"
3. 10 template cards displayed in a scrollable grid (2 columns on mobile, 3-4 on desktop)
4. User can click template (pre-fills form) or "Custom Identity" (blank form)
5. Form allows full customization regardless of starting point

---

## API Endpoints

### Identity CRUD

**POST** `/api/identities`  
Create new identity
```typescript
Body: {
  name: string; // Required, max 50 chars
  description?: string; // Optional, max 200 chars
  color: string; // Hex color from curated palette
  icon: string; // Single emoji character
}
Response: Identity
Errors:
  - 400: Validation error (name too long, invalid color, etc.)
  - 409: Duplicate identity name for user
  - 403: User has reached limit of 5 identities
```

**GET** `/api/identities`  
List all identities for current user
```typescript
Response: Identity[]
Sort: By sortOrder ASC, then createdAt ASC
```

**GET** `/api/identities/:id`  
Get single identity
```typescript
Response: Identity
Errors:
  - 404: Identity not found or doesn't belong to user
```

**PATCH** `/api/identities/:id`  
Update identity
```typescript
Body: {
  name?: string;
  description?: string;
  color?: string;
  icon?: string;
  isActive?: boolean;
}
Response: Identity
Errors:
  - 404: Not found
  - 409: Name conflict
```

**DELETE** `/api/identities/:id`  
Delete identity
```typescript
Response: { success: true }
Notes: 
  - Sets identityId to null on all linked tasks/habits (onDelete: SetNull)
  - Soft delete option: set isActive=false instead of hard delete
Errors:
  - 404: Not found
```

**POST** `/api/identities/reorder`  
Reorder identities
```typescript
Body: {
  identityIds: string[]; // Array of identity IDs in desired order
}
Response: Identity[]
```

### Identity Progress (Phase 1A - Basic version)

**GET** `/api/identities/progress`  
Get today's progress for all identities
```typescript
Response: {
  date: string; // ISO date
  identities: {
    identityId: string;
    name: string;
    color: string;
    icon: string;
    completedCount: number; // Tasks + habits completed today
    totalMinutes: number; // Sum of task durations + habit durations
    inProgressCount: number; // Tasks/habits scheduled for today but not complete
  }[]
}
```

### Task API Updates

**POST** `/api/tasks` & **PATCH** `/api/tasks/:id`  
Add identityId field to request body
```typescript
Body: {
  // ... existing fields ...
  identityId?: string | null; // Optional identity link
}
```

---

## Migration Strategy

### Phase 1A: Automatic Migration on First Settings Visit

**Trigger**: User visits `/settings/identities` for the first time after Phase 1A deployment

**Migration Logic** (`identityMigrationService.ts`):

```typescript
async function migrateHabitIdentitiesToModel(userId: string): Promise<void> {
  // 1. Check if user already has Identity records
  const existingIdentities = await prisma.identity.count({ where: { userId } });
  if (existingIdentities > 0) return; // Already migrated

  // 2. Find unique identity strings from user's habits
  const habits = await prisma.habit.findMany({
    where: { userId, identity: { not: null } },
    select: { identity: true },
  });
  
  const uniqueIdentities = [...new Set(habits.map(h => h.identity).filter(Boolean))];
  
  if (uniqueIdentities.length === 0) return; // No identities to migrate

  // 3. Create Identity records (max 5)
  const identitiesToCreate = uniqueIdentities.slice(0, 5);
  
  const createdIdentities = await Promise.all(
    identitiesToCreate.map((name, index) => {
      const color = IDENTITY_COLORS[index % IDENTITY_COLORS.length].hex;
      const icon = getDefaultIconForName(name); // Smart icon suggestion
      
      return prisma.identity.create({
        data: {
          userId,
          name,
          description: `Migrated from habits`,
          color,
          icon,
          sortOrder: index,
        },
      });
    })
  );

  // 4. Link habits to new Identity records (optional - Phase 1B)
  // For Phase 1A: Keep string field, add FK in Phase 1B
}

function getDefaultIconForName(name: string): string {
  const lowerName = name.toLowerCase();
  if (lowerName.includes('writer') || lowerName.includes('writing')) return '✍️';
  if (lowerName.includes('athlete') || lowerName.includes('fitness') || lowerName.includes('health')) return '💪';
  if (lowerName.includes('leader') || lowerName.includes('professional') || lowerName.includes('career')) return '💼';
  if (lowerName.includes('creative') || lowerName.includes('artist') || lowerName.includes('art')) return '🎨';
  if (lowerName.includes('financial') || lowerName.includes('money') || lowerName.includes('wealth')) return '💰';
  if (lowerName.includes('relationship') || lowerName.includes('social') || lowerName.includes('friend')) return '💕';
  if (lowerName.includes('learning') || lowerName.includes('knowledge') || lowerName.includes('education')) return '📚';
  if (lowerName.includes('mindful') || lowerName.includes('spiritual') || lowerName.includes('meditation')) return '🧘';
  if (lowerName.includes('home') || lowerName.includes('environment') || lowerName.includes('organize')) return '🏡';
  if (lowerName.includes('travel') || lowerName.includes('adventure') || lowerName.includes('explore')) return '✈️';
  if (lowerName.includes('growth') || lowerName.includes('personal')) return '🌱';
  return '⭐'; // Default
}
```

**Frontend Hook** (`/settings/identities` page):
```typescript
useEffect(() => {
  // Check if migration needed
  identityApi.checkMigrationStatus().then(({ needsMigration }) => {
    if (needsMigration) {
      identityApi.runMigration().then(() => {
        // Show success toast: "We've created identities from your habits!"
        refetchIdentities();
      });
    }
  });
}, []);
```

---

## Frontend Components

### 1. Identity Management Page (`/settings/identities`)

**Location**: `apps/web/src/app/settings/identities/page.tsx`

**Features**:
- List all identities with inline edit/delete
- "Create Identity" button (opens modal)
- Drag-to-reorder identities
- Shows count: "3 of 5 identities created"
- Empty state: "Create your first identity to track your goals"

**UI Structure**:
```tsx
<div className="space-y-4">
  <header>
    <h1>My Identities</h1>
    <p className="text-sm text-slate-600">
      {identities.length} of 5 identities created
    </p>
    <Button onClick={openCreateModal}>+ Create Identity</Button>
  </header>
  
  <IdentityList
    identities={identities}
    onReorder={handleReorder}
    onEdit={handleEdit}
    onDelete={handleDelete}
  />
</div>
```

### 2. Identity Card Component

**Component**: `IdentityCard.tsx`

```tsx
interface IdentityCardProps {
  identity: Identity;
  onEdit: (id: string) => void;
  onDelete: (id: string) => void;
  draggable?: boolean;
}

// Displays: Icon | Name | Description | Color Badge | Edit/Delete buttons
```

### 3. Create/Edit Identity Modal

**Component**: `IdentityFormModal.tsx`

**Fields**:
- Name (text input, max 50 chars, required)
- Description (textarea, max 200 chars, optional)
- Icon (emoji picker)
- Color (8-color palette selector)

**First-Time Flow**:
- Show "Choose a template or start from scratch" header
- Display 10 template cards in scrollable grid (2 cols mobile, 3-4 cols desktop)
- "Or create custom identity" button at bottom
- Clicking template pre-fills form (editable)

### 4. Identity Badge Component (Inline)

**Component**: `IdentityBadge.tsx`

```tsx
interface IdentityBadgeProps {
  identity: Identity | null;
  size?: 'sm' | 'md' | 'lg';
  showName?: boolean;
  onClick?: () => void; // For filtering
}

// Renders: [icon] Name (with colored background/border)
// Size sm: Just icon
// Size md: Icon + name
// Size lg: Icon + name + subtle border
```

### 5. Identity Selector Dropdown

**Component**: `IdentitySelector.tsx`

```tsx
interface IdentitySelectorProps {
  value: string | null;
  onChange: (identityId: string | null) => void;
  placeholder?: string;
  allowClear?: boolean;
}

// Dropdown showing all user's identities
// "None" option to unlink
// Shows icon + name + color indicator
```

### 6. Task Form Updates

**Files to modify**:
- `apps/web/src/app/tasks/page.tsx` (Add/Edit task forms)
- `apps/web/src/components/tasks/TaskCard.tsx` (Show identity badge)

**Changes**:
- Add `IdentitySelector` to task creation/edit forms
- Show subtle "Link to identity?" prompt if no identity selected
- Display `IdentityBadge` inline with task title in TaskCard
- Add identity filter dropdown to Tasks page header

### 7. Email → Task Flow Update

**File**: `apps/web/src/app/inbox/page.tsx` or email detail modal

**Enhancement**:
- When creating task from email, run identity suggestion logic
- Show suggested identity in form with "Change" button
- Store pattern (sender → identity) for future suggestions

---

## Email-to-Identity Intelligence (Simple MVP)

**Service**: `identitySuggestionService.ts`

**Strategy**: Keyword + Pattern-Based

```typescript
interface IdentitySuggestion {
  identityId: string;
  confidence: 'high' | 'medium' | 'low';
  reason: string;
}

async function suggestIdentityForEmail(
  email: EmailThread,
  userId: string
): Promise<IdentitySuggestion | null> {
  const identities = await getIdentities(userId);
  
  // 1. Check pattern history (sender → identity)
  const pattern = await getEmailSenderPattern(email.from, userId);
  if (pattern) {
    return {
      identityId: pattern.identityId,
      confidence: 'high',
      reason: `You usually link emails from ${email.from.split('@')[0]} to this identity`,
    };
  }
  
  // 2. Keyword matching in subject/sender
  const keywords = {
    professional: ['work', 'meeting', 'project', 'client', 'proposal', 'career', 'job', 'business'],
    health: ['gym', 'workout', 'doctor', 'health', 'fitness', 'exercise', 'nutrition', 'wellness'],
    creative: ['design', 'art', 'music', 'writing', 'content', 'creative', 'portfolio', 'craft'],
    personal: ['family', 'friend', 'personal', 'growth', 'self-improvement'],
    financial: ['bank', 'investment', 'budget', 'savings', 'money', 'finance', 'wealth', 'retirement'],
    relationships: ['date', 'family', 'friend', 'partner', 'social', 'wedding', 'birthday'],
    learning: ['course', 'class', 'study', 'book', 'education', 'training', 'seminar', 'workshop'],
    mindfulness: ['meditation', 'yoga', 'spiritual', 'mindfulness', 'peace', 'reflection', 'therapy'],
    home: ['home', 'apartment', 'renovation', 'cleaning', 'organize', 'decor', 'maintenance'],
    adventure: ['travel', 'trip', 'vacation', 'flight', 'hotel', 'adventure', 'explore', 'booking'],
  };
  
  const emailText = `${email.subject} ${email.from}`.toLowerCase();
  
  for (const [category, terms] of Object.entries(keywords)) {
    if (terms.some(term => emailText.includes(term))) {
      const matchingIdentity = identities.find(id => 
        id.name.toLowerCase().includes(category)
      );
      if (matchingIdentity) {
        return {
          identityId: matchingIdentity.id,
          confidence: 'medium',
          reason: `Detected "${category}" keywords in email`,
        };
      }
    }
  }
  
  return null; // No suggestion
}

// Store pattern for future suggestions
async function storeEmailPattern(
  senderEmail: string,
  identityId: string,
  userId: string
): Promise<void> {
  // Store in EmailIdentityPattern table (simple key-value cache)
  await prisma.emailIdentityPattern.upsert({
    where: { userId_senderEmail: { userId, senderEmail } },
    update: { identityId, lastUsedAt: new Date() },
    create: { userId, senderEmail, identityId },
  });
}
```

**New Table** (optional, for pattern storage):
```prisma
model EmailIdentityPattern {
  id          String   @id @default(cuid())
  userId      String
  senderEmail String   // Email address or domain
  identityId  String
  lastUsedAt  DateTime @default(now())
  
  @@unique([userId, senderEmail])
  @@index([userId])
}
```

---

## Today Page: Identity Progress Widget

**Component**: `IdentityProgressWidget.tsx`

**Location**: Today page header (below date, above "What's Now" widget)

**Design**:
- Horizontal row of identity progress rings/badges
- Each shows: Icon + name + progress (e.g., "3 tasks, 45min")
- Clickable to filter page by that identity
- Compact on mobile (just icons with tooltip)

```tsx
<div className="flex items-center gap-3 overflow-x-auto pb-2">
  {todayProgress.identities.map(identity => (
    <button
      key={identity.identityId}
      onClick={() => setFilterIdentity(identity.identityId)}
      className={`
        flex items-center gap-2 px-3 py-2 rounded-lg border-2
        transition-all hover:scale-105
        ${isFiltered ? 'ring-2 ring-offset-2' : ''}
      `}
      style={{ 
        borderColor: identity.color,
        backgroundColor: isFiltered ? identity.color + '20' : 'transparent'
      }}
    >
      <span className="text-2xl">{identity.icon}</span>
      <div className="text-left hidden sm:block">
        <p className="text-sm font-semibold text-slate-900">{identity.name}</p>
        <p className="text-xs text-slate-600">
          {identity.completedCount} tasks · {identity.totalMinutes}min
        </p>
      </div>
      {identity.completedCount > 0 && (
        <CheckCircle className="w-4 h-4 text-green-600" />
      )}
    </button>
  ))}
</div>
```

---

## Habits Page: Identity Integration

**Updates to** `apps/web/src/app/habits/page.tsx`:

1. **Add identity filter** to page header
2. **Show identity progress** summary above habits list
3. **Highlight habits** grouped by identity (optional visual grouping)

**Simple approach**:
- Add dropdown filter: "All Identities" or select specific one
- Show small identity progress cards at top (similar to Today page)
- Existing HabitCard component already shows identity badges

---

## Implementation Sequence

### Week 1: Backend Foundation (Tasks 18.4 - 18.6)

**Day 1-2: Database & Migrations**
- [ ] Create Identity model in `schema.prisma`
- [ ] Add identityId FK to Task model
- [ ] Create migration: `npx prisma migrate dev --name add_identity_model`
- [ ] Run migration locally and verify schema

**Day 3-4: Identity CRUD Service & API**
- [ ] Create `identityService.ts` with CRUD operations
- [ ] Add validation logic (5 identity limit, unique names)
- [ ] Create `identityController.ts` with all endpoints
- [ ] Add routes to backend router
- [ ] Test endpoints with Postman/Insomnia

**Day 5: Migration Service**
- [ ] Create `identityMigrationService.ts`
- [ ] Implement habit identity → Identity model migration logic
- [ ] Add migration status endpoint
- [ ] Test migration with sample data

### Week 2: Frontend Core (Tasks 18.7 - 18.10)

**Day 1-2: Shared Types & Components**
- [ ] Update `packages/shared/src/types/identity.ts` with interfaces
- [ ] Create `IDENTITY_COLORS` and `IDENTITY_TEMPLATES` constants
- [ ] Build `IdentityBadge.tsx` component
- [ ] Build `IdentitySelector.tsx` dropdown component

**Day 3-4: Identity Management Page**
- [ ] Create `/settings/identities/page.tsx`
- [ ] Build `IdentityCard.tsx` component
- [ ] Build `IdentityFormModal.tsx` with template selection
- [ ] Implement emoji picker integration
- [ ] Add drag-to-reorder functionality

**Day 5: Task Integration**
- [ ] Update task creation/edit forms with identity selector
- [ ] Add identity badge to `TaskCard.tsx`
- [ ] Add identity filter to Tasks page
- [ ] Add "Link to identity?" subtle prompt

### Week 3: Progress & Polish (Tasks 18.14 - 18.17)

**Day 1-2: Identity Progress**
- [ ] Create `identityProgressService.ts` (calculate daily stats)
- [ ] Add `/api/identities/progress` endpoint
- [ ] Build `IdentityProgressWidget.tsx` component

**Day 3: Today Page Integration**
- [ ] Integrate progress widget into Today page header
- [ ] Add clickable filtering by identity
- [ ] Test responsive behavior on mobile

**Day 4: Habits Page Integration**
- [ ] Add identity progress summary to Habits page
- [ ] Add identity filter dropdown
- [ ] Verify existing identity badges display correctly

**Day 5: Email Intelligence (Basic)**
- [ ] Create `identitySuggestionService.ts`
- [ ] Add keyword + pattern matching logic
- [ ] Integrate into email → task creation flow
- [ ] Add pattern storage on task creation

### Testing & Polish

**Day 6-7: QA & Refinement**
- [ ] End-to-end testing: Create identities → link tasks → view progress
- [ ] Test migration flow with existing habit identities
- [ ] Mobile responsive testing (iOS ratios)
- [ ] Fix any linter errors
- [ ] Polish animations and transitions
- [ ] Update documentation

---

## Acceptance Criteria

### Phase 1A Complete When:

**Backend**:
- [ ] Identity CRUD API fully functional (create, read, update, delete, reorder)
- [ ] 5 identity hard limit enforced at API level
- [ ] Task model has identityId FK and API supports it
- [ ] Migration service auto-creates identities from habit strings
- [ ] Identity progress endpoint returns accurate daily stats

**Frontend - Identity Management**:
- [ ] `/settings/identities` page works: list, create, edit, delete, reorder
- [ ] First-time users see template suggestions
- [ ] Emoji picker and color palette selector work smoothly
- [ ] User cannot create more than 5 identities (clear error message)
- [ ] Migration runs automatically on first visit to settings

**Frontend - Task Integration**:
- [ ] Tasks can be linked to identities via dropdown selector
- [ ] Identity badges display inline on TaskCard
- [ ] Tasks page has identity filter (working filter logic)
- [ ] Subtle "Link to identity?" prompt shows for unlinked tasks
- [ ] Email → task flow suggests identity (basic keyword matching)

**Frontend - Progress Display**:
- [ ] Today page header shows identity progress widget
- [ ] Widget displays: icon, name, completed count, total minutes
- [ ] Clicking identity filters Today page by that identity
- [ ] Habits page shows identity progress summary
- [ ] Habits page has identity filter dropdown

**Mobile**:
- [ ] All identity management features work on mobile
- [ ] Progress widget is responsive (collapses to icons on small screens)
- [ ] Emoji picker works on mobile devices
- [ ] Touch targets are appropriate size (min 44x44px)

**Polish**:
- [ ] No linter errors in modified files
- [ ] Consistent design patterns across all new components
- [ ] Loading states and error handling in place
- [ ] Success toasts for create/edit/delete operations
- [ ] All pages tested on iOS device

---

## Technical Notes

### Performance Considerations

1. **Identity Progress Calculation**: Cache daily progress stats (regenerate every 5min max)
2. **API Calls**: Fetch identities once on app load, store in React Context or Zustand
3. **Real-time Updates**: Refresh progress widget after completing tasks/habits

### Error Handling

**Common Errors**:
- **403**: User at 5 identity limit → Show upgrade prompt or suggest deleting unused identity
- **409**: Duplicate identity name → "You already have an identity named X"
- **400**: Invalid emoji/color → Frontend validation should prevent this

### Security

- All identity endpoints require authentication
- Users can only access their own identities (enforce at service level)
- Validate all input (name length, color hex format, emoji validity)
- Sanitize identity names to prevent XSS

### Future Enhancements (Phase 1B+)

- [ ] AI-powered identity suggestions (analyze email content with LLM)
- [ ] Weekly/monthly identity progress reports
- [ ] Identity streaks (consecutive days advancing identity)
- [ ] Identity milestones and badges (25/50/100 completions)
- [ ] Replace habit.identity string field with habit.identityId FK
- [ ] Identity-based habit grouping on Habits page
- [ ] Share identity progress with accountability partners

---

## Success Metrics

**Track these metrics post-launch**:

1. **Adoption**: % of users who create at least 1 identity (target: 60%+)
2. **Engagement**: % of tasks/habits linked to identities (target: 40%+)
3. **Stickiness**: Daily active users who check identity progress (target: 50%+)
4. **Template Usage**: % using templates vs custom (expect 70% templates, distributed across 10 options)
5. **Template Distribution**: Track which templates are most popular (helps refine offerings)
6. **Migration Success**: % of users with habit identities who complete migration (target: 90%+)

---

## Questions/Blockers

None currently. Ready to begin implementation.

---

**Next Steps**: 
1. Review and approve this plan
2. Begin Week 1: Backend Foundation (Tasks 18.4-18.6)
3. Daily check-ins to unblock issues

