# Task 12.10: Email Category UI Implementation Guide

**Status**: Backend Complete ✅ | Frontend In Progress 🚧
**Date**: December 11, 2025

---

## ✅ Completed: Backend Implementation

### 1. Email Categorization Service
**File**: `apps/backend/src/services/emailCategorizationService.ts`

- 10 categories with colors, icons, and keywords
- Rule-based categorization (Gmail labels → domain patterns → keywords)
- Utility functions: `groupEmailsByCategory`, `getCategoryStatistics`

### 2. Gmail Service Integration
**File**: `apps/backend/src/services/gmailService.ts`

- All fetched emails automatically categorized
- `EmailMessage` type extended with `category` field

### 3. API Endpoint
**File**: `apps/backend/src/routes/emailRoutes.ts`

- `GET /api/email/categories` - Returns all category configurations

### 4. Frontend API Client
**File**: `apps/web/src/lib/api.ts`

- Added `getEmailCategories()` function
- Added `EmailCategoryConfig` interface
- Added `EmailCategory` type import

### 5. Testing
**File**: `apps/backend/src/services/__tests__/emailCategorizationService.test.ts`

- 20+ unit tests covering all scenarios
- All tests passing ✅

---

## 🚧 Remaining: Frontend UI Implementation

### Overview
Add visual category badges and filtering to the email inbox on the Today page.

---

## Implementation Steps

### Step 1: Add State Management

**File to Edit**: `apps/web/src/app/today/page.tsx`

**Add near the top of the component** (around line 50-100):

```typescript
import { getEmailCategories, type EmailCategoryConfig } from '../lib/api';
import type { EmailCategory } from '@timeflow/shared';

// Inside the TodayPage component:
const [emailCategories, setEmailCategories] = useState<EmailCategoryConfig[]>([]);
const [selectedCategory, setSelectedCategory] = useState<EmailCategory | 'all'>('all');

// Fetch categories on mount
useEffect(() => {
  async function loadCategories() {
    try {
      const { categories } = await getEmailCategories();
      setEmailCategories(categories);
    } catch (err) {
      console.error('Failed to load email categories:', err);
    }
  }
  loadCategories();
}, []);
```

---

### Step 2: Filter Emails by Category

**Add this function** after the existing email filtering logic:

```typescript
// Filter emails by selected category
const categoryFilteredEmails = React.useMemo(() => {
  if (selectedCategory === 'all') {
    return displayedEmails;
  }
  return displayedEmails.filter(email => email.category === selectedCategory);
}, [displayedEmails, selectedCategory]);
```

**Then update the rendering** to use `categoryFilteredEmails` instead of `displayedEmails` in the map function.

---

### Step 3: Add Category Filter Buttons

**Location**: Lines 666-688 (after "All" / "Focused" buttons)

**Add this code** right after the closing `</div>` of the All/Focused buttons (line 688):

```typescript
{/* Category Filter Pills */}
{emailCategories.length > 0 && (
  <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-thin">
    <button
      onClick={() => setSelectedCategory('all')}
      className={`px-3 py-1.5 text-xs font-medium rounded-full transition-colors whitespace-nowrap ${
        selectedCategory === 'all'
          ? 'bg-slate-800 text-white'
          : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
      }`}
    >
      All Categories
    </button>
    {emailCategories.map((cat) => {
      const count = displayedEmails.filter(e => e.category === cat.id).length;
      if (count === 0) return null;

      return (
        <button
          key={cat.id}
          onClick={() => setSelectedCategory(cat.id)}
          className={`px-3 py-1.5 text-xs font-medium rounded-full transition-colors whitespace-nowrap flex items-center gap-1.5 ${
            selectedCategory === cat.id
              ? 'text-white shadow-sm'
              : 'bg-white border text-slate-700 hover:shadow-sm'
          }`}
          style={{
            backgroundColor: selectedCategory === cat.id ? cat.color : undefined,
            borderColor: selectedCategory === cat.id ? 'transparent' : '#e2e8f0',
          }}
        >
          <span>{cat.name}</span>
          <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-semibold ${
            selectedCategory === cat.id
              ? 'bg-white/20'
              : 'bg-slate-100'
          }`}>
            {count}
          </span>
        </button>
      );
    })}
  </div>
)}
```

---

### Step 4: Add Category Badge to Email Cards

**Location**: Lines 749-754 (after importance badge)

**Replace** the existing importance badge section with:

```typescript
{/* Right side - time, importance, and category */}
<div className="flex flex-col items-end gap-1.5 flex-shrink-0">
  <span className="text-[11px] text-slate-500">
    {new Date(email.receivedAt).toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
    })}
  </span>

  {/* Category Badge */}
  {email.category && (() => {
    const categoryConfig = emailCategories.find(c => c.id === email.category);
    if (!categoryConfig) return null;

    return (
      <span
        className="text-[10px] px-2 py-0.5 rounded-full font-medium"
        style={{
          backgroundColor: `${categoryConfig.color}15`,
          color: categoryConfig.color,
          border: `1px solid ${categoryConfig.color}40`,
        }}
      >
        {categoryConfig.name}
      </span>
    );
  })()}

  {/* Importance Badge */}
  {email.importance === 'high' && (
    <span className="text-[10px] px-1.5 py-0.5 rounded bg-red-100 text-red-700 font-medium">
      High
    </span>
  )}
</div>
```

---

### Step 5: Add CSS for Scrollbar (Optional)

**File**: `apps/web/src/app/globals.css`

**Add at the bottom**:

```css
/* Custom scrollbar for category pills */
.scrollbar-thin::-webkit-scrollbar {
  height: 4px;
}

.scrollbar-thin::-webkit-scrollbar-track {
  background: #f1f5f9;
  border-radius: 2px;
}

.scrollbar-thin::-webkit-scrollbar-thumb {
  background: #cbd5e1;
  border-radius: 2px;
}

.scrollbar-thin::-webkit-scrollbar-thumb:hover {
  background: #94a3b8;
}
```

---

## Testing Checklist

After implementation, verify:

- [ ] **Category badges appear** on all email cards with correct colors
- [ ] **Category filter buttons** render with correct counts
- [ ] **Clicking category filter** shows only emails in that category
- [ ] **"All Categories" button** shows all emails
- [ ] **Category counts** update when emails are filtered by All/Focused
- [ ] **Colors match** the backend category configurations
- [ ] **Mobile responsive** - category pills scroll horizontally on small screens
- [ ] **Performance** - no lag when switching categories
- [ ] **Empty categories** are hidden from filter list
- [ ] **Categories load** on page mount without errors

---

## Category Configuration Reference

| Category | Color | Description |
|---|---|---|
| Personal | #3B82F6 (Blue) | Family, friends, personal |
| Work | #8B5CF6 (Purple) | Meetings, projects, deadlines |
| Promotion | #EC4899 (Pink) | Sales, discounts, offers |
| Shopping | #F59E0B (Amber) | Orders, shipments |
| Social | #10B981 (Green) | Social media notifications |
| Finance | #06B6D4 (Cyan) | Payments, invoices, bank |
| Travel | #14B8A6 (Teal) | Flights, hotels, bookings |
| Newsletter | #6366F1 (Indigo) | Digests, subscriptions |
| Updates | #A855F7 (Purple-light) | Alerts, notifications |
| Other | #64748B (Slate) | Uncategorized |

---

## Visual Design Preview

### Category Badge on Email Card
```
┌─────────────────────────────────────────────┐
│ 📧 Meeting Reminder                    Dec 11│
│ boss@company.com                    [Work]   │
│ Team meeting at 3pm tomorrow         High    │
└─────────────────────────────────────────────┘
```

### Category Filter Pills
```
┌────────────────────────────────────────────────────┐
│ [All Categories] [Work 5] [Personal 3] [Shopping 2]│
└────────────────────────────────────────────────────┘
```

---

## File Locations Summary

**Backend (Complete ✅)**:
- `apps/backend/src/services/emailCategorizationService.ts`
- `apps/backend/src/services/gmailService.ts`
- `apps/backend/src/controllers/emailController.ts`
- `apps/backend/src/routes/emailRoutes.ts`
- `apps/backend/src/services/__tests__/emailCategorizationService.test.ts`

**Frontend (To Edit 🚧)**:
- `apps/web/src/lib/api.ts` ✅ (Complete)
- `apps/web/src/app/today/page.tsx` 🚧 (Needs edits in Steps 1-4)
- `apps/web/src/app/globals.css` 🚧 (Optional scrollbar styling)

**Shared Types (Updated ✅)**:
- `packages/shared/src/types/email.ts`

---

## Acceptance Criteria

Task 12.10 is complete when:

1. ✅ Backend categorization service implemented
2. ✅ All emails automatically categorized
3. ✅ API endpoint returns category configurations
4. ✅ Frontend API client can fetch categories
5. 🚧 Category badges display on email cards
6. 🚧 Category filter buttons functional
7. 🚧 Filtering works correctly
8. 🚧 Mobile responsive
9. 🚧 No console errors
10. 🚧 User can see and filter by all 10 categories

---

## Known Issues & Notes

1. **Web Server**: May need restart to pick up new modules (CommandPalette, providers)
2. **Port Conflict**: Multiple dev servers may be running on port 3000
3. **Category Counts**: Will be 0 until real Gmail data is loaded

---

## Next Task: 12.11 - Email Category Settings

After 12.10 is complete, implement:
- User-customizable category names
- Color picker for categories
- Enable/disable categories
- Custom keywords for categorization rules
- Save preferences to user settings

---

**Document Owner**: Architect Agent
**Status**: Implementation guide ready
**Last Updated**: December 11, 2025
