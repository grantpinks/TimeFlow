# Backend Log Testing

Paste or capture **failed deployment / runtime logs** here (Render backend, Vercel web build, etc.).

**Fetch Render logs:** `bash timeflow/scripts/fetch-render-logs.sh` (overwrites this file).

**Production QA** (calendar hub, Sprint 1): `timeflow/docs/qa/calendar-hub-production-qa.md`

---

## Latest capture

### Production browser console — 2026-06-01

Captured from live app after security/OAuth sprint. Triage below.

| Endpoint / error | Status | Notes |
|------------------|--------|-------|
| `GET /habits/notifications` — `Unknown field completions` on `ScheduledHabit` | 500 | **Fixed on main** — `habitNonAdherenceService` uses singular `completion` relation. Redeploy backend if still failing. |
| `GET /calendar/events`, `/me`, `/habits`, etc. | 429 | **Mitigated on main** — per-user rate limiting raised to 500/min. May still spike if many tabs open; verify after deploy. |
| `favicon.ico` | 404 | **Fixed on main** — Next.js route serves favicon from PNG asset. |

**Action after deploy:** Hard refresh, confirm `/habits/notifications` returns 200 and favicon loads.

<details>
<summary>Raw console excerpt</summary>

```
[Error] /habits/notifications — 500
Unknown field `completions` for include statement on model `ScheduledHabit`.
Available options: user, completion

[Error] /calendar/events — 429 Too Many Requests (retry in 27 seconds)
[Error] /connected-accounts, /insights, /scheduling-links, /meetings — 429
[Error] favicon.ico — 404
```

</details>

---

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
