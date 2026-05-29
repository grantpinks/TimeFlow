# Sprint 2 — Sign in with Apple (Outline)

**Status:** **Deferred** — not scheduled. Revisit when willing to enroll in the [Apple Developer Program](https://developer.apple.com/programs/) (~$99/year).  
**Blocked by:** Paid Apple Developer membership (required for Sign in with Apple; **not** required for iCloud CalDAV connect in Settings).

**Prerequisite when resumed:** `docs/qa/calendar-hub-production-qa.md` (Sprint 1 QA signed off on production)

---

## Goal

Apple is an **equal primary login** alongside Google. Same `User` / JWT shape. Post-login, users can connect iCloud (existing CalDAV flow) or link accounts per linking policy.

---

## You provide before implementation

| Item | Notes |
|------|--------|
| Apple Developer Program | Team ID, Services ID, Sign in with Apple key |
| Redirect URLs | `APP_BASE_URL` + `/api/auth/apple/callback` (exact paths TBD in full plan) |
| Linking policy | When `user@icloud.com` Google login exists and user signs in with Apple — auto-link, block, or prompt? |

---

## Task map (full plan TBD)

| ID | Summary |
|----|---------|
| S2-1 | Apple Developer: Services ID, key, domain verification |
| S2-2 | `POST /api/auth/apple` start + callback; JWT same as Google |
| S2-3 | `User.appleId` (or equivalent); ADR for linking |
| S2-4 | Login page: Google + Apple buttons |
| S2-5 | Onboarding: connect iCloud after Apple-first signup |
| S2-6 | Mobile Expo Apple auth (if in scope) |
| S2-7 | Auth matrix QA (Google only, Apple only, link both, disconnect) |

---

## Out of scope for Sprint 2

- Outlook
- Second Gmail inbox
- Removing legacy `User.google*` columns (still Deploy gate 2)

---

## First implementation step

Write full `2026-05-26-sprint-2-sign-in-with-apple-implementation-plan.md` with TDD tasks after QA sign-off and linking policy decision.
