# TimeFlow — Product backlog (selected)

Items we explicitly chose **not** to do now. Pull into a sprint when ready.

---

## Deferred: Sign in with Apple (was “Sprint 2”)

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

## Other calendar-hub backlog (not deferred, just later)

| Item | Notes |
|------|--------|
| Second Google account | Primary-only sync today |
| Outlook / Microsoft Graph | Separate epic |
| Drop legacy `User.google*` / `AppleCalendarAccount` | Deploy gate 2 after stability |
| Separate “availability” vs “visible” toggles in UI | Schema supports `useForAvailability` |
| Legacy column removal | Second migration deploy |
