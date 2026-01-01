# Sprint 16 Phase A: Gmail Label Sync Setup & Troubleshooting

**Purpose:** Document setup requirements, OAuth scopes, limitations, and troubleshooting steps.

## Setup Requirements
1. **Google OAuth credentials**
   - `GOOGLE_CLIENT_ID`
   - `GOOGLE_CLIENT_SECRET`
   - `GOOGLE_REDIRECT_URI`
2. **App URL**
   - `APP_BASE_URL` should match the frontend origin used in OAuth callbacks.
3. **Scopes**
   - Calendar: `calendar.readonly`, `calendar.events`
   - Gmail: `gmail.readonly`, `gmail.compose`, `gmail.modify`
   - Profile: `userinfo.email`, `userinfo.profile`

## Gmail Label Sync Behavior (Phase A)
- Manual sync only (Settings → Gmail Label Sync → Sync Now).
- Optional sync-on-inbox-fetch via env flag:
  - `GMAIL_SYNC_ON_INBOX_FETCH=true`

## Known Limitations
- Gmail supports a fixed palette of label colors (25 total).
- Manual sync only (no background watch or Pub/Sub).
- Thread-level operations are rate-limited (conservative 500ms delay).
- Label deletions in Gmail disable sync until the user re-enables it.

## Troubleshooting

### 1) “Google account not connected”
- Reconnect via Settings → Google Connection.
- Verify `googleAccessToken` and `googleRefreshToken` exist in DB.

### 2) Labels not appearing in Gmail
- Confirm sync is enabled for the category.
- Trigger **Sync Now** and check for errors in Settings.
- Verify Gmail API scopes include `gmail.modify`.

### 3) Sync errors or rate limit issues
- Retry in a few minutes.
- Reduce backfill limits (days/threads).
- Ensure `GMAIL_SYNC_ON_INBOX_FETCH` is not enabled in production unless intended.

### 4) Wrong category applied
- Use “Correct Category” in Inbox.
- Choose the rule scope (sender/domain/thread).
- Re-run manual sync.

### 5) OAuth scope verification
- Gmail label modification requires sensitive scopes; ensure OAuth consent screen is configured for testing or verified.

## Validation Checklist
- Sync status available via `/api/gmail-sync/status`.
- Manual sync adds `TimeFlow/<CategoryName>` labels in Gmail.
- Deleting a Gmail label disables sync for that category.
- Backfill settings update via `/api/gmail-sync/settings`.
