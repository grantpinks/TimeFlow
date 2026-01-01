# Tasks Board View - Future Enhancement

**Status**: Planned for future sprint
**Created**: 2025-12-31
**Priority**: Medium
**Dependencies**: Sprint 16 UI Refinement (Tab-based layout)

---

## Overview

Add an optional "Board View" toggle to the Tasks page that allows users to switch between the default tab-based list view and a Kanban-style board with 3 columns (Unscheduled, Scheduled, Completed).

## Rationale

While the tab-based layout (implemented in Sprint 16) provides a calmer, more focused experience, some power users may prefer to see all three task statuses simultaneously for a quick overview and faster drag-and-drop workflows between statuses.

## User Story

> As a power user managing many tasks,
> I want to optionally view all task statuses in a board layout,
> So that I can quickly drag tasks between columns and see my entire task landscape at once.

---

## Design Specifications

### View Toggle

**Location**: Top-right of Tasks page, next to the overflow menu

**UI**:
```
[List View Icon] [Board View Icon]
```

- Icons should be subtle, icon-only buttons
- Active view highlighted with primary color
- Inactive view uses neutral gray
- View preference saved to localStorage

### Board Layout

When Board View is active:

1. **Three columns**:
   - Unscheduled (left)
   - Scheduled (center)
   - Completed (right)

2. **Column styling**:
   - Each column is a `Panel` component
   - Typography-led headers (no thick bars)
   - Generous spacing between columns (24-32px)
   - Cards within columns use `ListRow` pattern (not individual elevated cards)

3. **Responsive behavior**:
   - Desktop (lg+): 3 columns side-by-side
   - Tablet (md): 2 columns, third wraps below
   - Mobile (sm): Automatically switch to List View (tabs)

### Empty States

- Use `EmptyState` component for empty columns
- Calm, minimal message (no heavy bordered cards)

---

## Technical Implementation

### Files to Modify

1. **`apps/web/src/app/tasks/page.tsx`**
   - Add view state: `const [view, setView] = useState<'list' | 'board'>('list')`
   - Save/load preference from localStorage
   - Conditionally render tabs vs. columns based on view

2. **New component (optional)**: `apps/web/src/components/TaskBoard.tsx`
   - Encapsulates 3-column board layout
   - Reuses existing TaskList component for each column
   - Handles responsive breakpoints

### State Management

```typescript
// Load view preference
useEffect(() => {
  const savedView = localStorage.getItem('tasksViewPreference');
  if (savedView === 'board') {
    setView('board');
  }
}, []);

// Save view preference
useEffect(() => {
  localStorage.setItem('tasksViewPreference', view);
}, [view]);
```

### Responsive Strategy

```typescript
// Force list view on mobile
const effectiveView = isMobile ? 'list' : view;
```

---

## Acceptance Criteria

- [ ] View toggle button renders in header
- [ ] Clicking toggle switches between list and board views
- [ ] Board view shows 3 columns with proper spacing
- [ ] Drag-and-drop works in board view (existing DnD logic)
- [ ] View preference persists across sessions
- [ ] Mobile automatically uses list view (responsive)
- [ ] All existing functionality preserved (search, filters, bulk actions)
- [ ] Board view uses new design system (Panel, ListRow, typography-led)

---

## Design Principles (Must Maintain)

Per Sprint 16 UI Refinement Plan:

1. **Generous Spacing**: Columns have 24-32px gaps, items have breathing room
2. **Elevation & Depth**: Columns are Panels with elevation-1, not heavy borders
3. **Typography-Led**: Column headers use SectionHeader (no thick accent bars)
4. **Calm Empty States**: Use EmptyState component, not bordered cards
5. **No Visual Noise**: Avoid thick left bars, loud colors, or excessive decoration

---

## Future Considerations

### Phase 1 (This Implementation)
- Simple toggle: List ↔ Board
- View preference saved to localStorage
- Responsive (auto-switch to list on mobile)

### Phase 2 (Later)
- Customizable column widths
- Collapse/expand columns
- Swimlanes (group by priority, category, due date)
- WIP limits per column

### Phase 3 (Advanced)
- Custom board layouts (user-defined columns)
- Multiple boards (e.g., "Work", "Personal")
- Shared team boards

---

## Estimated Effort

- **Design**: 1 hour (mockup board layout with new design system)
- **Implementation**: 3-4 hours
  - View toggle + state management: 1 hour
  - Board layout component: 1.5 hours
  - Responsive behavior: 1 hour
  - Testing all interactions: 0.5 hours
- **QA**: 1 hour (test drag-drop, filters, search in board view)

**Total**: 5-6 hours

---

## References

- Sprint 16 UI Refinement Plan: `/docs/UI_REFINEMENT_PLAN.md`
- Tasks Page (Tab View): `/apps/web/src/app/tasks/page.tsx`
- Panel Component: `/apps/web/src/components/ui/Panel.tsx`
- SectionHeader Component: `/apps/web/src/components/ui/SectionHeader.tsx`
- ListRow Component: `/apps/web/src/components/ui/ListRow.tsx`

---

## Notes

This feature was intentionally deferred from Sprint 16 to ship a simpler, calmer default experience (tabs). If user feedback indicates strong demand for board view, this can be prioritized in Sprint 17 or 18.

**Key Insight**: Default to calm (tabs), offer power when needed (board toggle).
