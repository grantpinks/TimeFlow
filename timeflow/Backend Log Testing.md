# Backend Log Testing

## Sprint 1 — Calendar Hub (closeout)

**Status:** Code complete. Run production QA before Sprint 2.

Checklist: [`docs/plans/2026-05-26-sprint-1-calendar-hub-closeout.md`](docs/plans/2026-05-26-sprint-1-calendar-hub-closeout.md)

| # | Test | Pass | Notes |
|---|------|------|-------|
| 1 | Google-only regression | ☐ | |
| 2 | Connect iCloud | ☐ | |
| 3 | Event correct local time | ☐ | |
| 4 | Sidebar visibility toggle | ☐ | |
| 5 | Hide from sidebar list | ☐ | |
| 6 | Smart schedule + iCloud busy | ☐ | |
| 7 | Disconnect iCloud persists | ☐ | |
| 8 | Apple scheduling link book | ☐ | |
| 9 | Gmail inbox | ☐ | |

Sprint 2 outline: [`docs/plans/2026-05-26-sprint-2-sign-in-with-apple-outline.md`](docs/plans/2026-05-26-sprint-2-sign-in-with-apple-outline.md)

---

## Deploy log (archive)

<details>
<summary>Vercel build — 2026-05 (CalendarView startTime — fixed on main)</summary>

```
21:57:41.314 Running build in Washington, D.C., USA (East) – iad1
...
21:58:41.855 Type error: 'startTime' is declared but its value is never read.
21:58:41.856 ./src/components/CalendarView.tsx:660:9
```

</details>
