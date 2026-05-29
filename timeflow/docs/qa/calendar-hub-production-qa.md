# Production QA — Multi-Account Calendar Hub (Sprint 1)

**When to use:** After a production deploy of the calendar hub work, before starting Sprint 2.  
**Not for:** Render/Vercel build failures — use `timeflow/Backend Log Testing.md` (or `bash scripts/fetch-render-logs.sh`).

**Related:** Sprint 1 closeout `docs/plans/2026-05-26-sprint-1-calendar-hub-closeout.md` · Sprint 2 outline `docs/plans/2026-05-26-sprint-2-sign-in-with-apple-outline.md`

---

## Checklist

Run on **production**. Mark **Pass** when verified.

| # | Test | Pass | Notes |
|---|------|------|-------|
| 1 | **Google-only regression:** Log in with Google → calendar loads; tasks still schedule to default Google calendar | ☐ | |
| 2 | **Connect iCloud:** Settings → app-specific password → account shows synced calendars (not 0) | ☐ | |
| 3 | **Event time:** iCloud test event at correct local time (not crushed at top of week view) | ☐ | |
| 4 | **Sidebar visibility:** Uncheck calendar → events hide; recheck → events return | ☐ | |
| 5 | **Hide from list:** Hide duplicate/extra calendars (× or Settings) → sidebar stays tidy | ☐ | |
| 6 | **Smart schedule:** Visible iCloud busy time blocks scheduling | ☐ | |
| 7 | **Disconnect iCloud:** Disconnect → stays disconnected after refresh | ☐ | |
| 8 | **Apple scheduling link:** Create link with iCloud calendar → book test slot → event on iCloud | ☐ | |
| 9 | **Gmail:** Inbox still loads | ☐ | |

---

## Environment

- `ENCRYPTION_KEY` on Render must be **unchanged** since users connected iCloud (otherwise they must reconnect).
- Migrations: confirm deploy logs show `✅ Migrations complete!` (includes `listedInSidebar` column).

---

## After QA (optional)

Sprint 1 calendar hub is **complete** without further work.

**Sign in with Apple** is **deferred** until you enroll in the Apple Developer Program (~$99/year). That is **not** required for iCloud connect in Settings. See `docs/plans/BACKLOG.md`.
