# Sprint 16 Phase A: Gmail Label Sync Design

**Date**: 2026-01-01
**Status**: Design Complete, Ready for Implementation
**Type**: Manual sync only (no Pub/Sub)

---

## Summary

Enable TimeFlow users to sync their email categories to actual Gmail labels. Phase A focuses on manual sync ("Sync Now" button) with user control over scope and settings, providing value without the complexity of real-time background sync.

---

## Key Decisions

### Sync Trigger
**Decision**: Manual "Sync Now" button only
**Rationale**: Safest path for Phase A. Users have full control, reduces blast radius, allows validation before auto-sync.

### Backfill Scope
**Decision**: Last 7 days OR 100 threads (whichever is less), user-configurable
**Options**:
- Days: 1, 7, 14, 30
- Max threads: 50, 100, 250, 500

**Rationale**: Prevents runaway syncs while covering typical use cases. Follows Sprint 16 requirement for "bounded backfill policy."

### Color Mapping
**Decision**: Auto-map TimeFlow hex colors to nearest Gmail palette color, with manual override
**Rationale**: "Just works" out of the box, but users can customize if they don't like auto-mapping.

### UI Location
**Decision**: Extend existing `/settings/email-categories` page
**Rationale**: Gmail labels mirror TimeFlow categories, so configure them together in one place.

### Label Deletion Behavior
**Decision**: Respect user deletions from Gmail, don't recreate
**Rationale**: Respect user intent, don't fight them. If deleted in Gmail, disable that category's sync and show info badge.

### Escape Hatch
**Decision**: "Remove All TimeFlow Labels" button to restore pre-TimeFlow state
**Rationale**: If sync goes wrong or user changes mind, provide clean way to undo everything.

---

## Data Model

### EmailCategoryConfig (Extended)

```prisma
model EmailCategoryConfig {
  id          String   @id @default(cuid())
  userId      String
  categoryId  String
  color       String?
  enabled     Boolean  @default(true)
  name        String?
  description String?
  emoji       String?

  // NEW: Gmail Label Sync fields
  gmailSyncEnabled      Boolean  @default(false)
  gmailLabelId          String?  // Gmail's label ID (e.g., "Label_123")
  gmailLabelName        String?  // Custom name (default: "TimeFlow/{categoryName}")
  gmailLabelColorBg     String?  // Gmail palette background color
  gmailLabelColorText   String?  // Gmail palette text color

  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
  user        User     @relation(fields: [userId], references: [id])

  @@unique([userId, categoryId])
  @@index([userId])
}
```

### GmailLabelSyncState (New)

```prisma
model GmailLabelSyncState {
  id               String    @id @default(cuid())
  userId           String    @unique
  enabled          Boolean   @default(false)
  lastSyncAt       DateTime?
  lastErrorAt      DateTime?
  lastErrorMessage String?

  // Backfill settings (user-configurable)
  backfillDays     Int       @default(7)
  backfillMaxThreads Int     @default(100)

  createdAt        DateTime  @default(now())
  updatedAt        DateTime  @updatedAt
  user             User      @relation(fields: [userId], references: [id])
}
```

### User Model Update

Add relation:
```prisma
model User {
  // ... existing fields ...
  gmailLabelSyncState GmailLabelSyncState?
}
```

---

## Backend Architecture

### New Service: `gmailLabelSyncService.ts`

**Location**: `apps/backend/src/services/gmailLabelSyncService.ts`

#### Core Functions

**Label Management:**

```typescript
// Ensure all TimeFlow category labels exist in Gmail
async function ensureLabelsForUser(userId: string): Promise<void>
  - Fetch user's EmailCategoryConfigs
  - For each category with gmailSyncEnabled=true:
    - Check if gmailLabelId exists
    - If not, create label via Gmail API (users.labels.create)
    - If yes, verify it still exists in Gmail (404 = user deleted it)
    - If deleted: clear gmailLabelId, disable gmailSyncEnabled, continue
    - Update EmailCategoryConfig with gmailLabelId
  - Auto-map colors using nearest Gmail palette color if not set

// Map hex color to nearest Gmail palette color
function mapToGmailColor(hexColor: string): { backgroundColor: string, textColor: string }
  - Parse Gmail's standard palette
  - Calculate color distance (RGB Euclidean distance)
  - Return nearest match with appropriate text color for contrast

// Gmail color palette (based on screenshot)
const GMAIL_PALETTE = [
  // Background and text color pairs
  { bg: '#000000', text: '#ffffff' },
  { bg: '#434343', text: '#ffffff' },
  // ... (all Gmail palette colors from screenshot)
]
```

**Label Syncing:**

```typescript
// Main sync function - applies labels to threads
async function syncLabelsForUser(userId: string): Promise<SyncResult>
  - Get GmailLabelSyncState for limits (backfillDays, backfillMaxThreads)
  - Fetch recent threads from Gmail:
    - Use query: `-in:spam -in:trash newer_than:{backfillDays}d`
    - Max results: backfillMaxThreads
  - For each thread:
    - Get first message metadata to determine category
    - Check EmailCategoryOverride table first (user corrections)
    - Categorize using emailCategorizationService.categorizeEmail()
    - Find corresponding EmailCategoryConfig
    - If gmailSyncEnabled=true: apply label, remove other TimeFlow/* labels
  - Update lastSyncAt timestamp
  - Return stats: { threadsProcessed, labelsApplied, errors: Array<{threadId, error}> }

// Apply category label to a single thread
async function applyLabelToThread(
  userId: string,
  threadId: string,
  categoryId: string
): Promise<void>
  - Get EmailCategoryConfig for category
  - Use Gmail API users.threads.modify:
    - addLabelIds: [gmailLabelId]
    - removeLabelIds: [all other TimeFlow/* gmailLabelIds for this user]
  - Idempotent: if label already applied, no-op

// Remove all TimeFlow labels from Gmail
async function removeAllLabelsForUser(userId: string): Promise<number>
  - Get all user's EmailCategoryConfigs with gmailLabelId
  - For each: delete label via Gmail API (users.labels.delete)
  - Clear gmailLabelId and set gmailSyncEnabled=false
  - Disable master sync in GmailLabelSyncState
  - Return count of labels removed
```

**Thread-Level Rules:**
- One TimeFlow category per thread (remove old TimeFlow labels before applying new)
- Never touch non-TimeFlow labels
- Respect user overrides from EmailCategoryOverride table
- Idempotent operations (applying same label twice is safe)

#### Error Handling

**Gmail Label Deleted by User:**
- Detection: 404 on users.labels.get or users.threads.modify
- Action: Clear gmailLabelId, set gmailSyncEnabled=false
- UI: Show badge "Label was removed from Gmail" in Settings

**Gmail API Rate Limiting:**
- Gmail quotas: 250 units/user/second, 1 billion/day
- Each thread.modify costs 5 units
- Max 50 threads per sync call by default
- On 429 error: Store error message, show "Rate limit reached. Try again later."

**OAuth Token Expiration:**
- Use existing gmailService.getGmailClient() which auto-refreshes
- If refresh fails: Clear error with actionable message

**Partial Sync Failures:**
- Track per-thread errors
- Continue processing even if some threads fail
- Return detailed stats: threadsProcessed, threadsSucceeded, threadsFailed, errors[]

---

## API Endpoints

### New Routes: `gmailLabelSyncRoutes.ts`

**Location**: `apps/backend/src/routes/gmailLabelSyncRoutes.ts`

```typescript
// Master sync control
POST   /api/gmail-label-sync/enable
  Request: {}
  Response: { success: true, syncState: GmailLabelSyncState }
  Action:
    - Create GmailLabelSyncState if doesn't exist
    - Set enabled=true
    - Return state

POST   /api/gmail-label-sync/disable
  Request: {}
  Response: { success: true }
  Action:
    - Set enabled=false
    - Show warning: "Labels will remain in Gmail"

GET    /api/gmail-label-sync/status
  Request: {}
  Response: {
    enabled: boolean,
    lastSyncAt: string | null,
    lastError: { at: string, message: string } | null,
    backfillSettings: { days: number, maxThreads: number }
  }

POST   /api/gmail-label-sync/sync
  Request: {}
  Response: {
    success: true,
    stats: {
      threadsProcessed: number,
      labelsApplied: number,
      errors: Array<{ threadId: string, error: string }>
    }
  }
  Action:
    - Call gmailLabelSyncService.syncLabelsForUser()
    - Rate limit: 1 request per 10 seconds per user
    - Update lastSyncAt on success
    - Store lastErrorAt/lastErrorMessage on failure

PATCH  /api/gmail-label-sync/settings
  Request: {
    backfillDays?: number,      // 1-30
    backfillMaxThreads?: number // 10-500
  }
  Response: { success: true, settings: GmailLabelSyncState }
  Validation:
    - backfillDays: 1-30
    - backfillMaxThreads: 10-500

POST   /api/gmail-label-sync/remove-all-labels
  Request: {}
  Response: { success: true, labelsRemoved: number }
  Action:
    - Show confirmation modal in UI first
    - Delete all TimeFlow/* labels from Gmail
    - Clear gmailLabelId for all categories
    - Set gmailSyncEnabled=false for all categories
    - Disable master sync
```

### Extended Routes: `emailRoutes.ts`

```typescript
PATCH  /api/email/categories/:id
  Request: {
    // Existing fields
    color?: string,
    enabled?: boolean,
    name?: string,
    description?: string,
    emoji?: string,

    // NEW: Gmail sync fields
    gmailSyncEnabled?: boolean,
    gmailLabelName?: string,
    gmailLabelColorBg?: string,
    gmailLabelColorText?: string
  }
  Response: { category: EmailCategoryConfig }
  Action:
    - Update EmailCategoryConfig
    - If gmailSyncEnabled changes to true:
      - Ensure label exists in Gmail via ensureLabelsForUser()
      - Auto-map color if gmailLabelColorBg not provided
```

**Rate Limiting:**
- All sync endpoints: 1 request per 10 seconds per user
- Category update: Existing rate limits apply

---

## Frontend UI

### Settings Page: `/settings/email-categories`

**File**: `apps/web/src/app/settings/email-categories/page.tsx`

#### Layout Structure

```
┌─────────────────────────────────────────────────┐
│ Email Categories                                │
│ Customize how emails are categorized           │
├─────────────────────────────────────────────────┤
│ ┌─ Gmail Label Sync ──────────────────────────┐ │
│ │ 📧 Sync TimeFlow categories to Gmail        │ │
│ │                                              │ │
│ │ [Toggle ON/OFF]  Gmail Label Sync           │ │
│ │                                              │ │
│ │ Status:                                      │ │
│ │ • Last synced: 2 hours ago                  │ │
│ │ • OR: Never synced                          │ │
│ │ • OR: ⚠️ Error: [message]                   │ │
│ │                                              │ │
│ │ [Sync Now] button (shows spinner)           │ │
│ │                                              │ │
│ │ Backfill Settings:                          │ │
│ │ • Sync last [7 ▾] days                      │ │
│ │   Options: 1, 7, 14, 30                     │ │
│ │ • Sync max [100 ▾] threads                  │ │
│ │   Options: 50, 100, 250, 500                │ │
│ │                                              │ │
│ │ [Remove All TimeFlow Labels] (danger btn)   │ │
│ └──────────────────────────────────────────────┘ │
├─────────────────────────────────────────────────┤
│ ┌─ Work ──────────────────────────────────────┐ │
│ │ [🔵] Work                      [Toggle]     │ │
│ │ Professional emails                         │ │
│ │                                              │ │
│ │ [Edit Color] (existing TimeFlow color)      │ │
│ │                                              │ │
│ │ ▸ Gmail Label Settings (collapsible)       │ │
│ │   (only shows when master sync enabled)     │ │
│ │                                              │ │
│ │   Gmail label: [TimeFlow/Work      ] [edit] │ │
│ │                                              │ │
│ │   TimeFlow color: #3B82F6 (blue chip)       │ │
│ │                                              │ │
│ │   Gmail color: [🟦] Auto-mapped             │ │
│ │   [Customize Gmail Color] button            │ │
│ └──────────────────────────────────────────────┘ │
│ ... (more categories) ...                       │
└─────────────────────────────────────────────────┘
```

#### New Components

**1. GmailSyncMasterControl**
- Master toggle (ON/OFF)
- Status display:
  - Green: "Last synced: [relative time]"
  - Gray: "Never synced"
  - Red: "Error: [message]"
- "Sync Now" button (disabled while syncing, shows spinner)
- Backfill dropdowns (days, max threads)
- "Remove All TimeFlow Labels" button (red/danger style)

**2. GmailCategorySettings** (collapsible section per category)
- Only visible when master sync enabled
- Gmail label name input (default: `TimeFlow/{categoryName}`)
- TimeFlow color display (read-only chip)
- Gmail color display with badge:
  - If auto-mapped: "🟦 Auto-mapped"
  - If custom: "🟦 Custom"
- "Customize Gmail Color" button → opens modal

**3. GmailColorPickerModal**
- Modal dialog
- Preview at top: "TimeFlow/Work" label with selected colors
- Background color grid (replicates Gmail palette)
- Text color grid (replicates Gmail palette)
- "Reset to Auto-mapped" button
- "Cancel" and "Apply" buttons

**Gmail Palette Data:**
```typescript
const GMAIL_COLOR_PALETTE = [
  // Extracted from Gmail screenshot
  { bg: '#000000', text: '#ffffff', name: 'Black' },
  { bg: '#434343', text: '#ffffff', name: 'Dark Gray' },
  { bg: '#666666', text: '#ffffff', name: 'Gray' },
  // ... (complete palette from screenshot)
];
```

#### User Flows

**Enable Sync:**
1. User toggles "Gmail Label Sync" ON
2. API call: POST /api/gmail-label-sync/enable
3. UI updates: shows status, sync button, backfill settings
4. All category cards expand to show Gmail settings

**Sync Now:**
1. User clicks "Sync Now" button
2. Button shows spinner, disabled
3. API call: POST /api/gmail-label-sync/sync
4. On success: Show toast "Synced X threads", update "Last synced" time
5. On error: Show error message in status section

**Customize Gmail Color:**
1. User clicks "Customize Gmail Color" for a category
2. Modal opens showing current selection
3. User picks new background + text colors
4. Clicks "Apply"
5. API call: PATCH /api/email/categories/:id with new colors
6. UI updates: badge changes to "Custom"

**Remove All Labels:**
1. User clicks "Remove All TimeFlow Labels"
2. Confirmation modal: "This will delete all TimeFlow/* labels from Gmail and disable sync. This cannot be undone."
3. User confirms
4. API call: POST /api/gmail-label-sync/remove-all-labels
5. UI updates: Master toggle OFF, all Gmail settings hidden
6. Toast: "Removed X labels from Gmail"

---

## Testing Strategy

### Unit Tests

**gmailLabelSyncService.test.ts:**
- `mapToGmailColor()`: Test color distance calculation
- `ensureLabelsForUser()`: Test label creation, 404 handling
- `applyLabelToThread()`: Test idempotency, error handling
- `syncLabelsForUser()`: Test backfill limits, partial failures

**Color Mapping Tests:**
```typescript
test('maps blue hex to nearest Gmail blue', () => {
  expect(mapToGmailColor('#3B82F6')).toMatchObject({
    backgroundColor: '#4986e7', // nearest Gmail blue
    textColor: '#ffffff'
  });
});

test('maps red hex to nearest Gmail red', () => {
  expect(mapToGmailColor('#EF4444')).toMatchObject({
    backgroundColor: '#e66550',
    textColor: '#ffffff'
  });
});
```

### Integration Tests

**API Endpoint Tests:**
- Mock googleapis Gmail client
- Test enable/disable flow
- Test sync with various backfill settings
- Test remove-all-labels
- Test rate limiting

### Manual Testing Checklist

- [ ] Enable sync, verify labels created in Gmail
- [ ] Sync now, verify threads labeled correctly
- [ ] Delete label in Gmail, verify next sync detects and disables
- [ ] Change backfill settings, verify sync respects limits
- [ ] Customize Gmail color, verify label updates in Gmail
- [ ] Remove all labels, verify all TimeFlow/* labels deleted
- [ ] Disable sync, verify labels remain but no new syncing
- [ ] Test with 0 threads, 1 thread, 100+ threads

---

## Implementation Sequence

### Phase 1: Data Model & Migration
1. Create Prisma migration for new fields
2. Update shared types in `@timeflow/shared`
3. Run migration, verify schema

### Phase 2: Backend Service
4. Implement `gmailLabelSyncService.ts`
5. Add Gmail color palette data
6. Implement color mapping algorithm
7. Write unit tests

### Phase 3: API Layer
8. Create `gmailLabelSyncRoutes.ts`
9. Extend `emailRoutes.ts` for category updates
10. Add rate limiting
11. Write integration tests

### Phase 4: Frontend UI
12. Create `GmailColorPickerModal` component
13. Extend `/settings/email-categories` page:
    - Add master control section
    - Add per-category Gmail settings
14. Add API client functions in `lib/api.ts`
15. Wire up all interactions

### Phase 5: Testing & Polish
16. Manual QA against checklist
17. Fix bugs discovered in testing
18. Add loading states, error handling
19. Polish UI (animations, copy, spacing)

### Phase 6: Documentation
20. Update user docs with Gmail sync instructions
21. Add troubleshooting guide
22. Update Sprint 16 status

---

## Success Criteria

- [ ] User can enable Gmail label sync from Settings
- [ ] "Sync Now" creates TimeFlow/* labels in Gmail
- [ ] Threads are labeled correctly based on category
- [ ] User can customize Gmail label names and colors
- [ ] Backfill settings respect configured limits
- [ ] User can remove all labels cleanly
- [ ] Label deletions in Gmail are respected (not recreated)
- [ ] Errors are handled gracefully with clear messages
- [ ] No rate limit issues under normal usage

---

## Future Enhancements (Phase B)

- Gmail watch + Pub/Sub for real-time sync
- Auto-sync on inbox fetch (fallback)
- Bulk operations (re-label all threads)
- Analytics (sync stats, label usage)

---

**Last Updated**: 2026-01-01
