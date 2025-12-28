# Editable Schedule Preview Design

Date: 2025-12-28

## Goal
Make the drag-and-drop schedule preview modal editable for date, time, and duration so users can correct the slot before confirming, while keeping the scheduling flow unified and lightweight.

## Scope
- Update the TaskSchedulePreview modal to include editable inputs (date, time, duration).
- Reflect edits in the displayed scheduled time.
- Pass the edited slot back to the calendar page so scheduling uses the updated values.
- Add a minimal frontend test harness and component tests.

## Architecture
- TaskSchedulePreview owns temporary slot edits in local state.
- The calendar page remains the single place that performs scheduling via `handleRescheduleTask`.
- The modal passes `{ start, end }` back to the page on confirm.

## UI Behavior
- Inputs:
  - Date: native `input[type="date"]`.
  - Start time: native `input[type="time"]`.
  - Duration: numeric minutes (e.g., 5-720).
- The "Scheduled Time" line updates live from the edited values.
- Invalid values show a short inline error and disable the confirm button.
- Cancel closes the modal without changes.

## Data Flow
1. Drag task to calendar -> preview modal opens with the initial slot.
2. User edits date/time/duration -> modal computes `start` and `end`.
3. Confirm -> modal calls `onConfirm({ start, end })`.
4. Calendar page calls `handleRescheduleTask(taskId, start, end)` and clears preview state.

## Error Handling
- If date/time cannot be parsed or duration is invalid, show an error and disable confirm.
- If scheduling fails, keep the modal open for retry (existing behavior).

## Testing
- Add a minimal Vitest + React Testing Library harness in `apps/web`.
- Component tests:
  - Editing inputs updates the scheduled time and passes the edited slot to `onConfirm`.
  - Invalid duration disables confirm and shows an error.

## Out of Scope
- Additional scheduling logic or API changes.
- New modals or multi-step wizards.
