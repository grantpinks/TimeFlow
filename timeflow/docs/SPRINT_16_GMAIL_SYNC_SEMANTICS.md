# Sprint 16 Phase A: Gmail Label Sync Semantics

**Purpose:** Define thread-level labeling rules, conflict handling, and backfill behavior so sync is predictable and safe.

## Scope
- Applies to **manual sync** and optional **sync-on-inbox-fetch** (Phase A).
- Gmail labels are **namespaced** as `TimeFlow/<CategoryName>`.
- Sync operates at the **thread level** (Gmail thread.modify).

## Labeling Rules
1. **Create/ensure labels**
   - If a category has Gmail sync enabled, a Gmail label is created/updated as `TimeFlow/<CategoryName>`.
   - Label color is mapped to Gmail’s supported palette (best-effort).

2. **Apply label to threads**
   - For each categorized email thread within the backfill window, apply the label if not present.
   - Operations are idempotent: applying an existing label is safe.

3. **Respect user deletions**
   - If Gmail returns **404** for a label, the category sync is disabled and `gmailLabelId` is cleared.
   - No automatic re-creation without explicit user action.

## Categorization Precedence
1. **User overrides/rules** (thread → sender → domain)
2. Gmail labels (Category_*)
3. Domain patterns
4. Keywords
5. Default fallback

## Conflict Handling
- If a user applies a different Gmail label manually, TimeFlow **does not remove** it.
- TimeFlow only **adds** its own `TimeFlow/*` labels.
- If a thread qualifies for multiple categories (rare), TimeFlow uses the **first match** by precedence above.

## Backfill Policy
- **Manual Sync:** Uses user-configured `backfillDays` and `backfillMaxThreads`.
- **Sync-on-fetch (optional):** Limited to **1 day** and **25 threads** per run, with a **10-minute minimum interval**.
- Backfill stops when either limit is reached.

## Rate Limits & Safety
- Thread modifications are rate-limited to ~2 requests/second (500ms delay).
- Sync should not run concurrently for the same user.
- Sync errors are captured in `GmailLabelSyncState.lastSyncError`.

## Idempotency Guarantees
- Label creation/update is safe to repeat.
- Thread label application is safe to repeat.
- Sync retries do not duplicate labels or thrash colors.

## Known Non-Goals (Phase A)
- No background watch or Pub/Sub.
- No label removal from Gmail (except explicit “Remove All TimeFlow Labels”).
- No automatic re-sync if label is deleted by user.
