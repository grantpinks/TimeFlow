# TimeFlow — Product backlog (selected)

Items we explicitly chose **not** to do now. Pull into a sprint when ready.

**Roadmap:** `ARCHITECT_ROADMAP_SPRINT1-17.md` — **Sprint 27** (deferred), **Sprint 27-Lite** (optional polish, no Apple Dev Program).

---

## Deferred: Sign in with Apple (Roadmap Sprint 27)

**Why deferred:** Requires [Apple Developer Program](https://developer.apple.com/programs/) membership (~$99/year). Not needed for current iCloud calendar connect (CalDAV + app-specific password).

**What users have today without it:**

- Log in with **Google**
- Connect **iCloud** in Settings (app-specific password)
- Merged calendar, sidebar toggles, smart schedule busy time, Apple scheduling links

**What this sprint would add later:**

- “Sign in with Apple” on login page (same JWT as Google)
- `User.appleId` + account linking policy
- Apple-first onboarding → iCloud connect
- Optional: mobile Expo Apple auth

**When to schedule:**

- [ ] Willing to pay for Apple Developer Program
- [ ] Sprint 1 production QA signed off (`docs/qa/calendar-hub-production-qa.md`)
- [ ] Linking policy decided (same email on Google + Apple: merge vs prompt)
- [ ] Write full implementation plan from `docs/plans/2026-05-26-sprint-2-sign-in-with-apple-outline.md`

**Estimate:** ~1–2 weeks engineering after Apple portal setup.

---

## Optional without Apple Developer Program (Roadmap Sprint 27-Lite)

These add value from the **deferred** sprint theme but **do not** need Sign in with Apple:

| Item | Value |
|------|--------|
| Post-Google-signup checklist (“Connect iCloud”) | Reduces drop-off; guides users to Sprint 26 feature |
| Resync calendars button in Settings | Fixes stale/duplicate lists without reconnect |
| Sync health (`lastErrorAt` / last success) in UI | Explains warning icons; less support burden |
| `useForAvailability` toggle separate from `visible` | Hide calendar visually but still block busy time |
| Sidebar collapse per account | Tidier UI when many calendars |
| iCloud connect wizard (app-password help) | Fewer failed connects |
| Mobile parity audit for merged calendar | Expo users see same events as web |

**Cannot do without Apple Dev Program:** Apple login button, `User.appleId` from Apple, Apple OAuth callbacks, native Sign in with Apple on iOS.

---

## Other calendar-hub backlog (not deferred, just later)

| Item | Notes |
|------|--------|
| Second Google account | Primary-only sync today |
| Outlook / Microsoft Graph | Separate epic |
| Drop legacy `User.google*` / `AppleCalendarAccount` | Deploy gate 2 after stability |
| Separate “availability” vs “visible” toggles in UI | Schema supports `useForAvailability` |
| Legacy column removal | Second migration deploy |
