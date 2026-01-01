# TimeFlow UI Refinement Plan

**Last Updated:** 2025-12-31

## 1. Guiding Vision

Our goal is to refine the TimeFlow UI to be less "blocky" and more aligned with our brand attributes: **intelligent, reassuring, and quietly confident**. The UI should embody **focus, clarity, and momentum**. This plan outlines the design principles and practical steps we will take to achieve a more modern, premium, and calm user experience, starting with the **Today Page** and **Tasks Page**.

---

## 2. Core Design Themes

Based on our brand guidelines and an analysis of best-in-class productivity applications, we will adhere to the following five design themes.

### Theme 1: Generous Spacing & Rhythmic Layout
Create a calm, organized feel by increasing padding within components and margins between them. Embrace whitespace to guide the user's eye and establish a clear visual rhythm.

### Theme 2: Elevation & Depth Over Flat Borders
Replace hard, rigid borders with soft, subtle shadows to create a sense of elevation and depth. This makes UI elements appear to "float" above the background, creating a lighter, more sophisticated interface.

### Theme 3: Typography as a Primary UI Element
Use our established typographic hierarchy (weight, size, and color) to create structure and meaning, reducing the need for visual dividers and boxes.

### Theme 4: Intentional, Minimalist Color
Employ our brand's neutral color palette for the majority of the UI, reserving the primary `Teal Flow` and `Amber Pulse` colors for key actions, focused states, and deliberate highlights.

### Theme 5: Fluidity Through Motion & Feedback
Introduce subtle, quick animations for state changes (e.g., task completion, panel transitions) to make the application feel responsive, polished, and alive.

---

## 3. Initial Focus: Themes 1 & 2

To make the most immediate and significant impact, our initial efforts will concentrate on implementing **Theme 1 (Generous Spacing)** and **Theme 2 (Elevation & Depth)**.

### Theme 1 in Practice: Generous Spacing

**Today Page:**
*   **Section Separation:** The vertical space between the "Upcoming Events" section, the "Today's Tasks" list, and any other top-level panels will be increased to at least `32px` to create clear visual separation.
*   **List Item Padding:** The vertical padding within each event or task item will be increased. Instead of feeling cramped, each item will have room to breathe, with a minimum of `16px` of vertical padding.

**Tasks Page:**
*   **Page Padding:** The entire Tasks page container will have a horizontal and vertical padding of at least `24px` to prevent content from touching the screen edges.
*   **List Density:** We will introduce more space between individual task list items. A standard task will have a `12px` margin below it, separating it from the next task.
*   **Group Spacing:** When tasks are grouped by project or date, the heading for each group will have a larger top margin (e.g., `24px`) to clearly distinguish it from the preceding group.

### Theme 2 in Practice: Elevation & Depth

**Today Page:**
*   **Panel Style:** The main panels for "Upcoming Events" and "Today's Tasks" will be changed from bordered boxes to elevated cards. They will have their `border` property removed and replaced with a soft, multi-layered box-shadow (e.g., `0 1px 2px 0 rgb(0 0 0 / 0.05), 0 1px 3px 1px rgb(0 0 0 / 0.05)`) to create a subtle lift off the `Paper` background.
*   **Item Hover State:** On hovering over an individual event or task, its `box-shadow` will subtly increase to indicate it's interactive, rather than just changing the background color.

**Tasks Page:**
*   **Task Item Cards:** Individual task items will no longer have a `1px solid` border. They will be refactored into 'card' components. Each card will have a soft `box-shadow` (e.g., `0px 1px 3px rgba(15, 23, 42, 0.06)`) to create a gentle lift.
*   **Floating Action Button:** The primary "Add Task" button, if it's a floating action button (FAB), will have a more pronounced shadow to signify its higher position in the visual hierarchy.
*   **Modal & Pop-up Elevation:** Modals for editing tasks will appear with a distinct, larger shadow, clearly setting them above the main page content and the overlay.

---

## 4. Reality Check From Current UI (What’s Creating “Blocky + Stress”)

Based on the current Tasks layout and the Today page content density, the stress is coming less from “not enough shadows” and more from **too many always-on boxes competing for attention**.

### 4.1. Tasks Page: Primary Stressors
*   **Three permanent columns** (Unscheduled / Scheduled / Completed) means the user must parse three contexts at once—even when one is empty.
*   **Card-per-row + thick left color bars + many chips** makes the list feel like a stack of bricks.
*   **Too many top-row actions** (Print / Export / Select / Smart Schedule + sort + search + filters) creates decision fatigue.
*   **Empty state is a bordered card** which still reads as “content” and consumes attention.
*   **Habits section is a second UI system** with heavy cards + big Edit/Delete buttons (visually loud, inconsistent).

### 4.2. Today Page: Primary Stressors
*   **Many “equal-weight” sections** (Start Your Day, To Do, Other Tasks, Inbox, Schedule, Quick Actions, Stats, Habit Suggestions) all visible at once.
*   **A timeline full of empty drop zones** reads as repetitive noise instead of a calm schedule.
*   **Quick Actions + Stats** are useful, but visually compete with the primary job: deciding what to do next.

---

## 5. Add a Token System (So Refinements Stay Consistent)

Before touching pages, we should define a minimal set of design tokens so the UI becomes cohesive quickly.

### 5.1. Spacing Scale
- `4 / 8 / 12 / 16 / 24 / 32 / 48`
- **Rule of thumb**
  - **Inside** containers: `16–24`
  - **Between** sections: `24–32`
  - **Between** dense rows: `8–12`

### 5.2. Radius
- Cards/panels: `12`
- Inputs/buttons: `10`
- Pills/chips: `999`

### 5.3. Elevation Ladder (Max 3 Levels)
- **Level 0**: Base surface (no shadow)
- **Level 1**: Panels / containers (subtle shadow or hairline border)
- **Level 2**: Hover / active item (slightly stronger)
- **Level 3**: Modals / popovers (strongest + overlay)

> Key rule: **not everything is elevated**. Most lists should be flat inside a single elevated container.

### 5.4. Borders vs Shadows
- Prefer **hairline dividers** inside flat lists.
- Use shadows only when something truly “floats” (panel, menu, modal).

### 5.5. Color & State Rules (Minimal but explicit)
- Accent colors (`Teal Flow`, `Amber Pulse`) reserved for **primary actions, focus rings, and selected states**.
- Hover should be subtle (surface tint), not a strong background block.
- Selected row gets a calm surface tint + a small accent indicator (not a thick bar).

---

## 6. Core Component Refactors (High Leverage)

These components make the biggest impact on “blockiness” without redesigning everything.

### 6.1. `Panel` (new)
- Used for: section containers (Tasks list container, Today sections)
- Styling: Level 1 elevation, generous padding, soft radius

### 6.2. `ListRow` (new)
- Replace “card per task” with a row pattern inside a `Panel`
- Supports: checkbox, title, metadata line, right-side actions (appear on hover/focus)

### 6.3. `SectionHeader` (new)
- Title + count + optional actions on the right
- Uses typography instead of borders to separate sections

### 6.4. `Chip` + `Badge` normalization (existing or new)
- Unify visual language for category chips and priority badges
- Reduce saturation; keep them readable but not loud

### 6.5. Empty State Pattern (new)
- No bordered “empty card”
- Use a calm message + a single clear action (e.g., “Add task”)

### 6.6. Modal/Popover elevation and focus
- Strong, consistent focus ring
- Clear overlay + one elevation level above everything else

---

## 7. Tasks Page: Proposed Layout (Reduce Cognitive Load)

### 7.1. Replace 3 Always-On Columns with a Single Primary View
Two strong options:

**Option A (Recommended): Tabs + One List**
- Tabs: `Unscheduled`, `Scheduled`, `Completed` with counts
- One `Panel` containing a flat list of `ListRow`s
- Benefits: reduces “three-context scanning,” better on small screens, calmer

**Option B: Board Mode (Later Sprint)**
- A board-style view can be added as a **future enhancement**, but the initial refinement ships **Option A only**.

### 7.2. Top Bar Simplification
- Left: Page title + subtle summary
- Center: Search (single field)
- Right: Primary button (Smart Schedule)
- Move Print/Export/Select into an overflow menu (`…`) or secondary action bar

### 7.3. Task Row Visual Simplification
- Replace thick left bars with:
  - a small accent dot, or
  - a thin 2px indicator only when selected
- Hide edit/delete icons until hover/focus (or show one “more” menu)
- Make the title dominant; metadata becomes secondary and consistent

### 7.4. Habits Section
- Move Habits into its **own dedicated page/route** (core feature), and remove it from the Tasks page UI.
- Ensure Habits remains **easy to find**:
  - add a primary navigation entry (or a clearly visible secondary nav item) labeled `Habits`
  - do not hide behind deep settings or overflow-only navigation
- Replace big Edit/Delete buttons with a single “…” menu per habit row/card
- Align Habits UI to the same `Panel` / `SectionHeader` / `ListRow` design language

---

## 8. Today Page: Proposed Layout (Calm, Guided Flow)

### 8.1. Establish Primary vs Secondary Regions
- **Primary**: “What should I do next?” (Tasks + Schedule)
- **Secondary**: Inbox preview, stats, quick actions (collapsible / lighter)

### 8.2. Reduce Equal-Weight Stacking
- Convert many sections into a small number of grouped panels:
  - `Plan` (tasks to schedule + timeline)
  - `Do` (top tasks / focus)
  - `Inbox` (preview + filter)

### 8.3. Timeline: Reduce Visual Noise
- Collapse empty hours by default (show “Next open slot” + expand on demand)
- Use softer dividers and fewer repeated “drop zone” callouts
- Make scheduled items visually clearer than empty slots

### 8.4. “Start Your Day Right” Checklist
- Keep it, but ensure it feels like a **light onboarding ribbon**:
  - compact height
  - calm styling
  - dismissible

---

## 9. Motion & Feedback (Sleek Without Being Distracting)

- Use short, subtle transitions (`150–200ms`) for hover/expand/collapse
- Prefer opacity/transform over layout changes (avoid jitter)
- Support reduced motion settings

---

## 10. Rollout Plan (Fast Wins, Minimal Risk)

### Phase 1: System
- Implement tokens + `Panel` + `SectionHeader` + `ListRow` + Empty states

### Phase 2: Tasks Page
- Switch default from 3-column board → tabs + one list
- Simplify top bar actions
- Normalize chips/badges

### Phase 3: Today Page
- Rebalance layout (primary vs secondary)
- Reduce timeline noise
- Consolidate sections into fewer panels

### Phase 4: Polish & QA
- Keyboard focus, contrast, reduced motion
- Verify scanning speed: can users find “next task” in < 2 seconds?

---

## 11. Calendar Page: Alignment With the New UI Standard

### 11.1. What’s Working
- Clear overall layout: sidebar for context, main area for the calendar
- Primary CTAs are obvious (Categorize / Smart Schedule)
- Event blocks are legible and scannable

### 11.2. Where It Doesn’t Match Yet (Why It Still Feels “Boxy”)
- **Border-heavy surfaces**: multiple framed regions + strong grid lines reads “enterprise/utility,” not calm/premium.
- **Toolbar density**: legend + view toggles + nav + actions all compete at the top.
- **Sidebar is many mini-cards** rather than one calm, consistent container.
- **Color noise in month view**: many saturated blocks dominate the page; the grid becomes secondary.

### 11.3. Calendar Surface Strategy (Apply the Elevation Ladder)
- **Level 0**: the calendar grid itself should be mostly flat (no heavy frame), with hairline dividers.
- **Level 1**: sidebar becomes a single `Panel` with internal section dividers (typography-led).
- **Level 2**: hover/drag targets (subtle), not chunky outlines.
- **Level 3**: popovers/modals only (consistent radius/padding/shadow).

### 11.4. Grid + Density Rules (Month + Week)
- Reduce contrast of grid lines (hairline neutrals); emphasize “today” with a subtle surface tint.
- Prefer whitespace + typography for day headers; avoid boxed header rows.
- In **month view**, cap visible items per day (e.g., 2–3) + “+N more” popover to prevent full-saturation walls.
- In **week/day views**, ensure event blocks have consistent padding and a calmer palette (avoid overly saturated fills across many events).

### 11.5. Toolbar + Filters Simplification
- Keep **one primary action** visually dominant at a time (context-aware if possible).
- Collapse the always-visible category legend into a **Filters popover** (still quick to access, less persistent noise). *(Decision: yes)*
- Consider an overflow menu for secondary actions to reduce top-bar clutter.

### 11.6. Sidebar Hierarchy
- Standardize sidebar sections using `SectionHeader` and flat lists (`ListRow`) inside the sidebar `Panel`.
- Make “Plan Meetings” less visually loud:
  - collapse by default, or
  - reduce button prominence and unify styling with the rest of the system.

### 11.7. Success Criteria (Calendar)
- Month view remains scannable even on busy weeks (no “color wall”).
- The calendar reads as one calm surface, not a set of nested boxes.
- Actions feel discoverable without being constantly shouted.

---

## 12. Brand + Functionality Guardrails (Non-Negotiables)

We will refine layout, density, and surfaces **without breaking brand recognition or core flows**.

### 12.1. Branding Preservation Rules
- **Do not change**: logo, product name lockup, core brand palette, or typographic scale choices unless explicitly approved.
- **Accent discipline**: `Teal Flow` and `Amber Pulse` remain reserved for primary actions, focus, and key highlights (no “random accent” usage).
- **Neutral-first surfaces**: most refinement comes from neutrals (surface tints, hairline dividers, subtle elevation), not new colors.
- **Keep category color semantics**: if a color currently communicates a meaning (category/event type/priority), we keep that mapping stable.

### 12.2. UX / IA Safety Rules
- No removing capabilities; only **re-grouping** and **de-emphasizing** secondary actions.
- Any “simplification” must preserve discoverability:
  - If we move actions into an overflow menu, ensure they remain reachable in ≤ 2 clicks.
  - If we hide row actions until hover, ensure an accessible alternative exists (focus/keyboard/menu button).

### 12.3. Functionality Safety Rules
- Keep all existing routes and data flows intact; UI changes should be component-level and styling/layout-level.
- Prefer additive changes (new `Panel`, `ListRow`, `SectionHeader`) and migrate screens gradually.
- Avoid “big bang” rewrites; ship in small slices with easy rollback.

### 12.4. Rollout & Rollback Strategy
- Implement behind a feature flag when feasible (per-page or per-component).
- Stage changes:
  - tokens/components → Tasks → Today → Calendar
- Maintain a “classic UI” fallback path until the new UI is validated.

### 12.5. Validation Checklist (Before We Call It Done)
- **Brand check**: does it still feel unmistakably “TimeFlow” at a glance?
- **Core flows**: add task, complete task, schedule task, categorize event, switch views (month/week/day), open details popover, search/filter.
- **Accessibility**: visible focus ring, contrast, keyboard navigation, reduced motion.
- **Performance**: no expensive shadows everywhere; keep scroll smooth on long lists and dense calendar days.

---

## 13. Agent Handoff (Make This Executable)

This section is the “contract” an implementation agent can follow with minimal back-and-forth.

### 13.1. Objective (1 sentence)
Reduce UI stress and “blockiness” on **Tasks**, **Today**, and **Calendar** by standardizing surfaces, spacing, hierarchy, and density—**without breaking brand or functionality**.

### 13.2. Scope (In / Out)
**In scope**
- Styling + layout + component refactors (`Panel`, `SectionHeader`, `ListRow`, chips/badges, empty states)
- Restructuring page layout and action placement (e.g., move secondary actions into overflow menus)
- Density improvements (tabs + single list on Tasks; “+N more” in month view; collapse empty timeline hours)

**Out of scope (unless explicitly approved)**
- Changing business logic, APIs, data models, or routes
- Changing brand palette/typography system
- Major interaction redesigns that alter core workflows (e.g., removing drag/drop, changing scheduling semantics)

### 13.3. Required Deliverables
- **Tokens** applied in code (spacing/radius/shadows/borders/states)
- New reusable components: `Panel`, `SectionHeader`, `ListRow`, and an Empty State pattern
- Tasks page default: **tabs + single list (Option A)**. Plan a **board preview** for a later sprint (do not ship in this pass).
- Today page: fewer equal-weight sections; primary vs secondary regions
- Calendar: de-boxed grid, calmer sidebar, month view “+N more”, simplified top bar/filters
- Habits: move to a **dedicated Habits page** that is easy to discover from navigation (key feature)

### 13.4. Definition of Done (Acceptance Tests)
An agent should not mark “done” until these pass manually:
- **Tasks**
  - Search works
  - Add task works
  - Complete/uncomplete works
  - Smart Schedule still accessible and unchanged in behavior
  - Print/Export/Select still reachable in ≤ 2 clicks
- **Today**
  - All existing sections still accessible (even if collapsed/de-emphasized)
  - Schedule area remains functional for scheduling actions
- **Calendar**
  - Switch Month/Week/Day still works
  - Event popover still opens and is readable
  - Categorize Events / Smart Schedule still present and functional
  - Month view remains scannable on busy weeks (“+N more” works)

### 13.5. Implementation Sequence (Recommended)
- Step 1: Implement tokens + base components (`Panel`, `SectionHeader`, `ListRow`, empty states)
- Step 2: Migrate Tasks page to tabs + single list + simplified top bar
- Step 3: Migrate Today page to grouped panels + reduced timeline noise
- Step 4: Migrate Calendar page to new surface strategy + month density + simplified filters
- Step 5: Polish (focus rings, reduced motion, hover states, perf)

### 13.6. Agent “Discovery Checklist” (Before Editing UI)
The agent should first locate:
- Where tokens/theme are defined (colors, typography, spacing, shadows)
- Where Tasks/Today/Calendar pages live
- Existing task card/list components and calendar event rendering
- Any existing feature flag system (to enable safe rollout)

### 13.7. Open Decisions (Owner to Confirm)
- **Tasks**: Ship **Option A only** now (tabs + list). Board preview planned for a later sprint.
- **Habits**: Move to its **own page** and keep it easy to find via navigation (key feature).
- **Calendar legend**: Convert to a **Filters popover** (not always visible).

---

## 14. Implementation Touchpoints (Where to Change Code)

This is the concrete map an agent should use to implement the refinements safely.

### 14.1. Web App Routes (Next.js App Router)
- **Today**: `/Users/grantpinkerton/Desktop/Time Flow/TimeFlow/timeflow/apps/web/src/app/today/page.tsx`
- **Tasks**: `/Users/grantpinkerton/Desktop/Time Flow/TimeFlow/timeflow/apps/web/src/app/tasks/page.tsx`
- **Calendar**: `/Users/grantpinkerton/Desktop/Time Flow/TimeFlow/timeflow/apps/web/src/app/calendar/page.tsx`
- **Habits (dedicated page)**: `/Users/grantpinkerton/Desktop/Time Flow/TimeFlow/timeflow/apps/web/src/app/habits/page.tsx`

### 14.2. Navigation / “Habits must be easy to find”
- Primary header nav lives in:
  - `/Users/grantpinkerton/Desktop/Time Flow/TimeFlow/timeflow/apps/web/src/components/Layout.tsx`
- **Action required**: add `Habits` to the `navItems` so it is always visible alongside Today/Tasks/Calendar.

### 14.3. Design Tokens + Global Surfaces
- Tokens source of truth:
  - `/Users/grantpinkerton/Desktop/Time Flow/TimeFlow/timeflow/apps/web/src/styles/design-tokens.css`
- Global styles + shared utility classes (imports tokens):
  - `/Users/grantpinkerton/Desktop/Time Flow/TimeFlow/timeflow/apps/web/src/app/globals.css`
- Existing global surface helpers already in use:
  - `.surface-card`, `.page-title`, `.page-subtitle`, `.app-shell`, etc. (`globals.css`)

### 14.4. Core UI Components (High-leverage refactor targets)
- **Task list container + add/edit flows**:
  - `/Users/grantpinkerton/Desktop/Time Flow/TimeFlow/timeflow/apps/web/src/components/TaskList.tsx`
- **Current task “card per row” presentation** (major source of blocky feel):
  - `/Users/grantpinkerton/Desktop/Time Flow/TimeFlow/timeflow/apps/web/src/components/ui/TaskCard.tsx`
- **Shared card wrapper** (can become the basis of `Panel`):
  - `/Users/grantpinkerton/Desktop/Time Flow/TimeFlow/timeflow/apps/web/src/components/ui/Card.tsx`
- **Buttons** (keep brand + states consistent):
  - `/Users/grantpinkerton/Desktop/Time Flow/TimeFlow/timeflow/apps/web/src/components/ui/Button.tsx`

### 14.5. Calendar Rendering + Month/Week Views
- Calendar rendering (react-big-calendar + event styling + view switching):
  - `/Users/grantpinkerton/Desktop/Time Flow/TimeFlow/timeflow/apps/web/src/components/CalendarView.tsx`
- Calendar page composition (sidebar panels + header/legend/CTAs):
  - `/Users/grantpinkerton/Desktop/Time Flow/TimeFlow/timeflow/apps/web/src/app/calendar/page.tsx`
- Sidebar panels used on Calendar page:
  - `/Users/grantpinkerton/Desktop/Time Flow/TimeFlow/timeflow/apps/web/src/components/MiniCalendar.tsx`
  - `/Users/grantpinkerton/Desktop/Time Flow/TimeFlow/timeflow/apps/web/src/components/UpcomingEventsPanel.tsx`
  - `/Users/grantpinkerton/Desktop/Time Flow/TimeFlow/timeflow/apps/web/src/components/UnscheduledTasksPanel.tsx`
  - `/Users/grantpinkerton/Desktop/Time Flow/TimeFlow/timeflow/apps/web/src/components/MeetingManagementPanel.tsx`

### 14.6. Page-Specific “First Edit” Guidance

**Tasks (Option A: Tabs + one list)**
- Start in `/apps/web/src/app/tasks/page.tsx`:
  - Replace the `grid ... lg:grid-cols-3` column layout with a tab state (`unscheduled/scheduled/completed`) and render **one** `TaskList`.
  - Remove the inline “Habits Section” from Tasks page (Habits lives at `/habits`).
- Expect follow-up edits in `TaskList.tsx` and `TaskCard.tsx` to support a calmer `ListRow` style (less border emphasis, fewer always-visible actions).

**Habits (key feature, separate page)**
- `/apps/web/src/app/habits/page.tsx` already exists and supports CRUD.
- Ensure discoverability by adding `Habits` to header nav (`Layout.tsx`).

**Calendar (legend → Filters popover, month view “+N more”)**
- Legend currently lives in `/apps/web/src/app/calendar/page.tsx` (the “Category Legend” block). Convert it into a single Filters control (popover/menu).
- Month density and “+N more” behavior belongs in `CalendarView.tsx` (react-big-calendar month rendering customization).

**Today (reduce equal-weight stacking)**
- Primary layout lives in `/apps/web/src/app/today/page.tsx`.
- Look for: multiple “panel” containers with `bg-... border ... shadow ...` and consolidate into fewer, calmer `Panel` surfaces using tokens.
