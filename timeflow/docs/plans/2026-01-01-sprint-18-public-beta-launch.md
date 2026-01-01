# Sprint 18: Public Beta Launch (Web + Mobile) — Scope & Checklist

**Date**: 2026-01-01  
**Sprint**: 18  
**Theme**: Ship a real, public, production-hosted TimeFlow beta (web + mobile) that is secure, supportable, and cost-controlled.

---

## Outcomes (what “beta-ready” means)

### Product outcomes
- **Public web app** is live (desktop-first, responsive) and accessible via a stable URL.
- **Public mobile apps** are distributable (at minimum: TestFlight + internal Android track; optionally full App Store/Play Store submission-ready).
- **Google-only sign-in** works end-to-end in production (web + mobile).
- **Beta access controls** are enforced (email allowlist + optional “heavy beta” allowlist).
- **Onboarding is clear**: first-run guidance for connecting Google Calendar + setting preferences.
- **Support + feedback loop exists** (so you can learn fast without getting overwhelmed).

### Engineering outcomes
- Backend reliably deploys to **Render** and binds to a port; `/health` is green.
- Web deploys to **Vercel** and correctly routes `/api/*` to the deployed backend (no localhost rewrites).
- Security baseline: CORS locked down, rate limiting enabled, request validation enforced, secrets handled safely.
- **AI cost controls ship**: per-user quotas (Normal vs Heavy), plus a global cap.
- “SaaS readiness” docs are written: deployment runbook, smoke tests, rollback, and beta operations checklist.

---

## Constraints (locked)
- **Auth**: Google-only for beta.
- **Hosting**: Vercel (web) + Render (backend) + Supabase (Postgres).
- **Subscriptions**: Sprint 19 (but we lay the foundations in Sprint 18).
- **Integrations**: Sprint 20 (beyond Google Calendar auth/integration already present).
- **Beta size**: ~25 users (month 1).
- **AI budgets**:
  - **Normal**: **$0.50 / user / month**
  - **Heavy**: **$2.00 / user / month** (granted by email allowlist for beta; later becomes tier-2 subscription)

---

## Recommended rollout approach (cost-efficient)

### Environments
- **Production**: one public environment (keep it simple for first beta).
- **Optional staging** (only if you feel nervous): a separate Supabase project + Render/Vercel preview env.

### Providers (lowest friction)
- **Backend**: Render Starter ($7/mo) to avoid sleep + reduce “first request delay”
- **Frontend**: Vercel Hobby (free)
- **DB**: Supabase free initially
- **Analytics**: PostHog free tier (privacy-safe events only)
- **Error tracking**: optional Sentry free tier (or rely on Render/Vercel logs for first beta)

---

## Work Breakdown (Sprint 18 scope)

### 1) Production deployment unblocking (P0)
**Goal**: Backend starts on Render and stays up.

- **Fix Supabase connection string for Render**:
  - Use **Session pooler** (port **5432**, not 6543)
  - Use correct username format `postgres.<PROJECT_REF>`
  - Source: `docs/SPRINT_19_PRODUCTION_DEPLOYMENT.md`
- **Make startup failures visible**:
  - Ensure uncaught exceptions/unhandled rejections log and exit clearly
  - Confirm Render shows logs for early boot failures
- **Confirm Render port binding**:
  - Ensure server listens on `0.0.0.0` and uses `PORT` env var (Render supplies it)
- **Verify health**: `GET /health` returns `{"status":"ok"}`

### 2) Web public deploy (P0)
**Goal**: Vercel web app talks to Render backend in production.

- **Fix Next.js API rewrites** for production env (no `localhost` destinations)
  - Source: `docs/PRODUCTION_DEPLOYMENT_GUIDE.md`
- Configure env vars on Vercel:
  - `NEXT_PUBLIC_API_URL` = Render backend URL
- Confirm Google OAuth web flow works from the Vercel domain.

### 3) Mobile public distribution readiness (P0/P1)
**Goal**: Mobile builds can be installed by beta users and connect to prod backend.

- **Mobile env config** for production API base URL
- **OAuth redirect handling** for mobile (Expo) is verified against prod backend
- **App metadata**: icons, splash, basic store assets
- **Release channel**:
  - P0: TestFlight + internal Android testing
  - P1: full App Store / Play Store submission-ready

### 4) Beta gating + onboarding (P0)
**Goal**: You control who enters beta; users successfully complete first-run.

- **Email allowlist**:
  - Allowlist for “beta access” (can sign in)
  - Allowlist for “Heavy beta tier” (higher AI quota)
- **Onboarding checklist** (web + mobile):
  - Connect Google Calendar
  - Set timezone + wake/sleep times
  - Create first task and run first schedule

### 5) AI cost controls + subscription foundations (P0)
**Goal**: AI is safe to run publicly without surprise bills, and Sprint 19 can plug in billing.

- Add **tier/entitlement plumbing**:
  - `planTier` (future billing): `FREE | STANDARD | HEAVY` (names TBD)
  - `betaTierOverride` (allowlist): `HEAVY` for invited users
  - `effectiveTier = betaTierOverride ?? planTier`
- Enforce **per-user monthly quotas** (track and block server-side):
  - Normal: mapped to ~$0.50/mo worth of tokens/requests
  - Heavy: mapped to ~$2.00/mo worth of tokens/requests
- Enforce a **global monthly AI cap** to protect against spikes.
- Add **graceful UX** when limits are hit (clear message; “more coming with subscriptions”).

### 6) Security + privacy baseline (P0)
**Goal**: reasonable “public SaaS” safety without overbuilding.

- Confirm/implement:
  - **CORS** locked to `APP_BASE_URL`
  - **Rate limiting** on expensive endpoints (schedule + assistant)
  - **Request validation** on all public routes
  - **Token encryption at rest** (Google refresh tokens)
  - **No sensitive logging** (tasks content, tokens, user data)
- **Privacy policy** link ready for mobile store listings.

### 7) Docs + operations (P1)
**Goal**: you can run and support beta without panic.

- Update/create:
  - “Production deployment runbook” (Render + Vercel + Supabase)
  - “Beta smoke test checklist” (auth, tasks, schedule, calendar sync, assistant)
  - “Rollback steps” (Vercel promote + Render redeploy)
  - “Support + feedback” workflow (where users report bugs; how you triage)

---

## Acceptance Criteria (Sprint 18 is “done”)
- **Backend**: Render service stays up; `/health` is OK; startup logs visible; Supabase connection stable.
- **Web**: Vercel deployment loads; `/api/*` routes to prod backend; Google sign-in works; core flows work.
- **Mobile**: Beta installs succeed; sign-in works; core flows work; crashes are rare and diagnosable.
- **Beta gating**: only allowlisted emails can sign in; heavy allowlist receives heavy quota.
- **AI guardrails**: per-user quotas + global cap enforced; user sees clear messaging when capped.
- **Docs**: a new engineer (or future you) can deploy and run a beta from scratch using the docs.

---

## Sprint 19 / 20 handoffs (explicit)
- **Sprint 19**: Stripe + subscription management UI + billing-driven entitlements (replacing beta overrides).
- **Sprint 20**: “common integrations” beyond Google auth/calendar (e.g., Gmail labels, Slack, Linear/Jira, etc.).


