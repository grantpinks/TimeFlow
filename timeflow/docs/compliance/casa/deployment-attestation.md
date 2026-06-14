# Deployment Attestation

**Version**: 1.0  
**Last updated**: 2026-06-13  
**Owner**: Grant Pinkerton  
**Attested by**: Grant Pinkerton

---

## Statement

I attest that TimeFlow production deployments follow a controlled change process with automated CI checks before merge to `main`, and that production secrets are not stored in source control.

---

## Deployment pipeline

| Step | Control |
|------|---------|
| Code change | Git branch → PR or direct commit to `main` |
| CI (`.github/workflows/ci.yml`) | Typecheck, lint, build, tests, dependency audit |
| Security (`.github/workflows/security.yml`) | Semgrep SAST, pnpm audit report artifacts |
| Web deploy | Vercel auto-deploy on push to `main` |
| API deploy | Render auto-deploy on push to `main` (`render.yaml`) |

---

## Production configuration

| Service | Config source | Secrets |
|---------|---------------|---------|
| Vercel | Project settings + `apps/web/next.config.js` | Env vars in Vercel dashboard (not in git) |
| Render | `render.yaml` + dashboard env | `SESSION_SECRET`, `ENCRYPTION_KEY`, `DATABASE_URL`, Google OAuth, Stripe, OpenAI |
| Supabase | Supabase dashboard | Connection string via `DATABASE_URL` on Render |

---

## Production domains

| Service | URL |
|---------|-----|
| Web | https://time-flow.app |
| API | https://api.time-flow.app |
| OAuth callback | https://time-flow.app/api/auth/google/callback |

---

## Change management

- All CASA security changes tracked in git with descriptive commit messages.
- Phases 1–5 deployed to production (cookie sessions, encryption, headers, account deletion, CI security).
- Rollback: revert commit and redeploy via Vercel/Render dashboards.

---

## Diagnostics & debug

- `/api/diagnostics/*` routes return 404 in production (`NODE_ENV=production`).
- AI debug toggle hidden in production UI.

---

## Evidence

- Git commit history on `main`
- CI workflow runs (GitHub Actions)
- Render/Vercel deployment logs
