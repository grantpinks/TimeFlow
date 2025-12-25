# Sprint 14 Plan: Calendar Dashboard Overhaul (Color-Coded, Actionable)

## Reference Layout (Design Template)

![Calendar dashboard reference layout](./assets/calendar-dashboard-reference.jpg)

**Project**: TimeFlow  
**Duration**: 2 weeks  
**Status**: Planned (documentation-only)  
**Template**: Inspired by the provided “Upcoming events + Calendar” dashboard layout (left rail + main calendar).

---

## Why this sprint is before Meeting Scheduling

Meeting scheduling (booking links + availability) will feel incomplete if the Calendar page is just a passive view. Sprint 14 upgrades `/calendar` into a planning hub so Sprint 15 can layer “plan meetings from context” cleanly.

---

## Goals

- [ ] `/calendar` becomes a dashboard: Upcoming Events, Unscheduled Tasks, and Calendar in one layout.
- [ ] Strong color coding:
  - tasks use category colors
  - external events are visually distinct and readable
- [ ] Preserve all existing calendar functionality:
  - Smart Schedule button
  - task reschedule DnD
  - task actions (unschedule/delete)
  - event/task popovers
- [ ] Reserve space for future meeting planning UI (placeholder panel only).

---

## Current Implementation (What we must not break)

Key files:
- Page: `timeflow/apps/web/src/app/calendar/page.tsx`
- Calendar component: `timeflow/apps/web/src/components/CalendarView.tsx`

Existing capabilities:
- Fetch external events via `api.getCalendarEvents(...)`
- Render tasks (category colors supported via `event.categoryColor`)
- Drag/drop reschedule tasks in calendar grid
- Task action modal and event detail popovers

---

## Proposed Layout (based on the reference image)

### Left rail

1) **Upcoming events** (external calendar events)
- list view with colored dot + time range + title
- clicking opens detail popover (read-only initially)

2) **Unscheduled tasks**
- list of `status=unscheduled` tasks
- quick actions: schedule, complete, delete (as available)
- drag task into calendar to schedule

3) **(Future) Plan meeting**
- placeholder panel with disabled controls + CTA (“Coming in Sprint 15”)

### Main panel

- Month/Week/Day toggle (existing `react-big-calendar` views)
- Color-coded events:
  - tasks: category color
  - external events: distinct styling (not all gray)
- Legend and quick filters (optional P1):
  - show/hide tasks vs external events
  - show/hide categories

---

## Engineering Tasks (Implementation Guidance)

- Refactor calendar page into a “dashboard shell” component and keep `CalendarView` intact.
- Build new panels as dedicated components:
  - `UpcomingEventsPanel`
  - `UnscheduledTasksPanel`
  - `PlanMeetingsPlaceholderPanel`
- Ensure consistent styling with the rest of the app:
  - reuse existing `surface-card`/layout primitives where possible
  - keep typography + spacing consistent with Today/Tasks

---

## Acceptance Criteria

- `/calendar` has left rail panels + main calendar panel matching the reference layout.
- Tasks show category color coding reliably.
- External events are visually distinct, readable, and not “all gray”.
- All existing calendar flows still work (reschedule, smart schedule, task actions).
- A “Plan meetings (Coming soon)” placeholder exists and does not break anything.

---

**Last Updated**: 2025-12-23


