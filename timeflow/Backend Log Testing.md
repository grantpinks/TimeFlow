# Backend Log Testing

Paste or capture **failed deployment / runtime logs** here (Render backend, Vercel web build, etc.).

**Fetch Render logs:** `bash timeflow/scripts/fetch-render-logs.sh` (overwrites this file).

**Production QA** (calendar hub, Sprint 1): `timeflow/docs/qa/calendar-hub-production-qa.md`

---

## Latest capture

### Vercel web build — 2026-05 (resolved on main)

```
21:57:41.314 Running build in Washington, D.C., USA (East) – iad1
21:57:41.315 Build machine configuration: 2 cores, 8 GB
21:57:41.444 Cloning github.com/grantpinks/TimeFlow (Branch: main, Commit: da014bc)
...
21:58:41.852 Failed to compile.
21:58:41.855 ./src/components/CalendarView.tsx:660:9
21:58:41.855 Type error: 'startTime' is declared but its value is never read.
21:58:41.997 Error: Command "npm run build:web" exited with 1
```

**Resolution:** Unused variable removed; `npm run build` passes on current `main`.
