# Inbox Custom Views (Design)

## Summary
Add editable inbox views so users can define which labels appear when a view is selected. “All” remains fixed, while “Professional” and “Personal” are editable built-ins. Users can add custom views. Configuration is editable on `/inbox` via an inline panel launched from a small “Customize” tab beside the filter bar. Views persist per-user on the backend with a local storage fallback.

## Goals
- Allow users to customize which labels appear for each inbox view.
- Keep “All” non-editable; allow edits for “Professional” and “Personal”.
- Provide a fast inline editor on `/inbox` with label-chip multi-select.
- Persist to backend with local fallback and optimistic UI.

## Non-Goals
- Editing views from `/today`.
- Advanced rules (sender/domain/thread rules) beyond label inclusion.
- Drag-and-drop ordering (can be added later).

## Data Model
**InboxView**
- `id`: string (`all`, `professional`, `personal`, or UUID)
- `name`: string
- `labelIds`: string[] (label keys)
- `isBuiltin`: boolean
- `updatedAt`: timestamp

Server storage: per-user in a user profile column or `inbox_views` table keyed by `user_id`.

## API
- `GET /inbox/views` → `{ views: InboxView[] }`
- `PUT /inbox/views` → `{ views: InboxView[] }` (upsert list)
- `DELETE /inbox/views/:id` → deletes custom view only

## Persistence Strategy
- Read local storage `inboxViews:v1` to render filters immediately.
- Fetch server views; on success, replace local list and update storage.
- If server fails, keep local list and show a subtle “Saved locally” state.
- Optimistic edits: update local state immediately, then sync to server; on failure, restore last server snapshot but keep local cache for next load.

## UI/UX
- Add a “Customize” tab to the left of the existing filter pills on `/inbox`.
- Clicking opens an inline editor panel beneath the filter row.
- Each view row shows:
  - Name (editable text)
  - Label chips (multi-select from existing label chips)
  - Actions (save/cancel for edits or a single “Save changes”)
- “All” is visible but locked with a lock icon + tooltip; “Professional” and “Personal” are editable.
- “+ Add view” inserts a new row with default name “New view”.
- When editor is open, label chip area auto-expands even if the main chip row is collapsed.

## Filtering Logic
- Selected view’s labels are applied with OR semantics.
- “All” means no filtering (show all messages).
- Selected view is tracked in state (optional query param `?view=`).

## State & Data Flow
1) Load cached views from local storage → render filters.
2) Fetch server views → replace local, persist to cache.
3) Editor changes update draft view list; Save commits to main list and triggers server sync.
4) Filtering uses selected view labels to filter inbox messages.

## Error Handling
- If server update fails, revert to last server snapshot and show a brief error toast.
- If server fetch fails, show a lightweight badge “Using local preferences”.

## Testing
- Unit: `filterInboxEmails` respects dynamic view labels.
- Unit: local storage fallback merges with server results.
- UI: editor opens, multi-select works, “All” locked, label chips expand on edit.

## Open Questions
- Should custom views allow reordering in the filter bar? (Not required now.)
