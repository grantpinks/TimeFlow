# TimeFlow System Description (CASA Tier 2)

**Version**: 1.0  
**Last updated**: 2026-06-13  
**Owner**: Grant Pinkerton  
**Assessment**: CASA Tier 2 (Google OAuth restricted scopes)  
**Google Cloud project**: `joga-bonito-465122`  
**Production URL**: https://time-flow.app

---

## Purpose

TimeFlow is an AI-assisted productivity application that schedules tasks and habits into Google Calendar, categorizes Gmail messages, and provides an in-app assistant. This document describes the production system boundary for security assessors.

---

## Architecture

```
User Browser (time-flow.app)
  ↓ HTTPS
Vercel (Next.js 14) ──rewrite /api/*──→ Render (Fastify 5 API @ api.time-flow.app)
                                            ↓ TLS
                                        Supabase Postgres
                                            ↓
                              Google APIs (OAuth, Calendar, Gmail)
```

### Components

| Component | Provider | Role |
|-----------|----------|------|
| Web app | Vercel | Next.js UI, CSP/security headers, `/api/*` reverse proxy to backend |
| API | Render | Fastify REST API, OAuth callback, session cookies, business logic |
| Database | Supabase | Managed PostgreSQL (Prisma ORM) |
| Identity | Google OAuth 2.0 | Sign-in, Calendar read/write, Gmail readonly/compose/modify |
| AI (optional) | OpenAI | Assistant, email drafts, scheduling suggestions |
| Payments | Stripe | Hosted checkout; no card data on TimeFlow servers |
| Analytics | PostHog | Product analytics (event metadata) |

### Out of scope (CASA web assessment)

- **Mobile app** (`apps/mobile`, Expo): uses Bearer token auth; separate from browser cookie session model.
- **Local development**: not assessed; production-only testing per project decision.

---

## Authentication & session model (web)

1. User initiates Google OAuth from `time-flow.app`.
2. OAuth callback hits `https://time-flow.app/api/auth/google/callback` (proxied to Render).
3. Backend sets httpOnly cookies `tf_access` (15 min) and `tf_refresh` (7 days) on `Domain=.time-flow.app`.
4. Browser API calls use `credentials: 'include'`; Vercel forwards cookies to Render.
5. CSRF protection via `validateOrigin` middleware on mutating `/api/*` routes.
6. Logout revokes Google refresh token (best-effort) and clears cookies.

Mobile retains `Authorization: Bearer` fallback in `authTokenExtractor.ts`.

---

## Google OAuth scopes

| Scope | Use |
|-------|-----|
| `openid`, `email`, `profile` | Authentication |
| Calendar read/write | Task/habit scheduling, availability |
| Gmail readonly, compose, modify | Inbox, categorization, drafts |

OAuth state is HMAC-signed. Google access tokens are encrypted at rest (AES-256-GCM).

---

## Data stores

| Store | Contents |
|-------|----------|
| Supabase Postgres | User profile, tasks, habits, calendar sync metadata, encrypted OAuth tokens, inbox metadata cache (no snippets), conversations |
| Browser sessionStorage | Short-lived inbox metadata cache (tab-scoped) |
| httpOnly cookies | JWT session tokens only (no Google tokens in browser) |

See `data-classification.md` and `data-storage-attestation.md` for detail.

---

## Security controls (summary)

- TLS everywhere (HSTS on web in production)
- CSP, X-Frame-Options, helmet on API
- httpOnly cookie sessions (no localStorage JWT)
- Encrypted Google access tokens at rest
- Account self-deletion API (`DELETE /api/user/account`)
- Dependency audit + Semgrep SAST in CI (`.github/workflows/security.yml`)
- Diagnostics endpoints disabled in production

---

## Environments

| Environment | URL | Notes |
|-------------|-----|-------|
| Production | `time-flow.app`, `api.time-flow.app` | Only environment in CASA scope |
| Staging | None | Production-only testing |

---

## Related documents

- `data-classification.md`
- `encryption-statement.md`
- `oauth-token-lifecycle.md`
- `deployment-attestation.md`
- `data-storage-attestation.md`
- `incident-response-runbook.md`
- `../evidence/vendor-list.md`
