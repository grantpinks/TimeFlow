# Sprint 15.5 Handoff: Authenticated Sidebar Navigation Redesign (Notion-style)

**Project**: TimeFlow  
**Owner**: Agent  
**Scope type**: UX shell refactor (web)  
**Status**: Planned  
**Last Updated**: 2026-01-01

---

## Why we’re doing this

The current top navigation is reaching a point where it **overflows/clutters** on common laptop widths (especially once we include utilities like command palette, theme toggle, and account actions). A Notion-style sidebar scales better and enables future **sub-navigation** (Inbox, Settings, etc.) without continuously expanding the header.

---

## Product requirements (locked)

- Sidebar is **visible only after sign-in**.
- Sidebar is **collapsible**:
  - Expanded: icons + labels
  - Collapsed: icons only + tooltips
  - Collapse state **persists** across reloads.
- Sidebar includes **logo** at the top and **logo click navigates to `/today`**.
- One-click destinations (main nav):
  - **Today** → `/today`
  - **Tasks** → `/tasks`
  - **Flow AI** (label) → `/assistant`
  - **Calendar** → `/calendar`
  - **Inbox** → `/inbox`
- **Settings** is represented by a **gear icon** (no “Settings” text entry), routing to `/settings`.
- Mobile behavior: sidebar becomes a **drawer** opened by a hamburger button (authenticated only).

---

## Out of scope (explicit)

- Rebuilding page content (Today/Tasks/Calendar/etc.)
- Advanced workspace/team switching (Notion-style multi-workspace)
- Bottom-tab mobile nav (drawer is sufficient for v1)
- Full Inbox Foundations implementation (Sprint 15 addendum)

---

## Technical constraints / repo realities

- The top-level shell is centralized in:
  - `timeflow/apps/web/src/components/Layout.tsx`
- Global shell classes exist (from `timeflow/apps/web/src/app/globals.css`):
  - `.app-shell`, `.app-header`, `.app-main`, `.app-container`
- There is currently **no `/inbox` route** under `timeflow/apps/web/src/app/` (add a placeholder page to avoid 404).

---

## Implementation plan (agent execution)

### 1) Create an authenticated app shell layout (sidebar + content)

**Goal**: Keep unauthenticated layout unchanged; authenticated users get the new shell.

**Work**:
- In `Layout.tsx`, branch rendering on `isAuthenticated`:
  - Unauthenticated: current header + children (unchanged)
  - Authenticated:
    - Sidebar
    - Content region (existing children)

**Notes**:
- Keep logic in `Layout.tsx` for the first pass (no need to create many new files unless it improves clarity).

---

### 2) Sidebar component (Notion-like)

**Structure**:
- Sidebar header:
  - Logo icon + “TimeFlow” text (expanded)
  - Clicking logo navigates to `/today`
  - Collapse toggle button (chevron)
- Sidebar nav:
  - Today, Tasks, Flow AI, Calendar, Inbox
- Sidebar footer:
  - Gear icon → `/settings`
  - User info + Sign out (either here or in the top header)
  - Theme toggle (optional; place where it fits best)

**Active state**:
- Based on `usePathname()` equality to route
- Consider prefix match for nested pages later (e.g. `/settings/...`)

---

### 3) Collapsing behavior + persistence

**State**:
- `isSidebarCollapsed: boolean`

**Persistence**:
- Use `localStorage` key: `timeflow.sidebar.collapsed` with values `"1"` or `"0"`
- Initialize on mount; update on toggle

**UX details**:
- Collapsed: show icons only + tooltips (`title` is acceptable for v1)
- Expanded width target: ~240px; collapsed ~72px

---

### 4) Mobile drawer behavior

**State**:
- `isMobileSidebarOpen: boolean`

**Behavior**:
- Add hamburger button in authenticated top header, visible on small screens only
- Drawer overlays content, with dimmed backdrop
- Close drawer on:
  - backdrop click
  - `Escape` key
  - navigation link click

---

### 5) Add `/inbox` placeholder route

**Goal**: Ensure the new “Inbox” destination never 404s.

**Implementation**:
- Add `timeflow/apps/web/src/app/inbox/page.tsx`:
  - Minimal placeholder content (“Inbox coming soon”) with a link back to Today
  - Use existing `Layout` wrapper used by other pages

---

### 6) Styling / CSS integration

**Goal**: Introduce sidebar without breaking the existing content sizing.

**Approach**:
- Prefer Tailwind utility classes for layout in `Layout.tsx`:
  - Authenticated shell: flex row (sidebar + content)
  - Content: retains padding and max-width behaviors
- If `.app-container` max-width causes awkward empty space with sidebar:
  - Option A: keep `.app-container` for page content (recommended)
  - Option B: define a new container for authenticated shell only (avoid changing unauthenticated marketing layout)

---

## Task breakdown (with estimates)

| Task | Description | Est |
|------|-------------|-----|
| 15.5.1 | Update `Layout.tsx` to support authenticated sidebar shell | 2–3h |
| 15.5.2 | Sidebar UI + nav wiring + settings gear | 2–3h |
| 15.5.3 | Collapse behavior + localStorage persistence + tooltips | 1–2h |
| 15.5.4 | Mobile drawer behavior (hamburger + overlay + close rules) | 2–3h |
| 15.5.5 | Add `/inbox` placeholder route | 0.5–1h |
| 15.5.6 | Styling polish + spacing + active state visuals | 1–2h |

**Total**: ~8–14 hours

---

## Must-pass acceptance criteria

- Signed out: **no sidebar**; existing header remains unchanged.
- Signed in (desktop):
  - Sidebar visible with logo and nav destinations.
  - **Logo click → `/today`**.
  - Sidebar collapse toggle works; state persists after refresh.
  - Settings is a **gear icon**; no “Settings” link in main nav.
- Signed in (mobile):
  - Hamburger opens drawer; overlay click / Esc closes it.
  - Navigation closes drawer and routes correctly.
- `/inbox` is reachable and does not 404.
- No top-nav overflow on common laptop widths.

---

## QA checklist (quick manual)

- Verify active state styling on each route.
- Verify tooltips appear in collapsed mode and are readable.
- Verify focus states with keyboard tabbing (links + buttons).
- Verify localStorage persistence by refreshing.
- Verify mobile drawer: open/close + route + scroll lock not required for v1 but nice to have.


