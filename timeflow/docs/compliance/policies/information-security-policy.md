# Information Security Policy

**Version**: 1.0  
**Effective date**: 2026-06-13  
**Owner**: Grant Pinkerton  
**Review cadence**: Annually or after significant architecture change

---

## 1. Purpose

This policy defines security requirements for TimeFlow systems, data, and operations to protect user information and meet regulatory and customer obligations (including Google CASA Tier 2).

---

## 2. Scope

Applies to all production systems: Vercel (web), Render (API), Supabase (database), and integrations with Google, Stripe, OpenAI, and PostHog.

---

## 3. Security principles

1. **Least privilege** — Access granted only as needed for role/function.
2. **Defense in depth** — Layer controls (TLS, auth, encryption, headers, validation).
3. **Data minimization** — Collect and retain only what the product requires.
4. **Secure by default** — Production disables debug/diagnostic endpoints.
5. **Evidence-based** — Security controls documented and verifiable.

---

## 4. Requirements

### 4.1 Authentication & authorization

- Production web sessions use httpOnly cookies; no JWT in localStorage.
- Google OAuth tokens stored server-side only, encrypted at rest.
- Mutating API routes protected by authentication and CSRF origin validation.

### 4.2 Encryption

- TLS required for all external communication.
- OAuth tokens encrypted with AES-256-GCM at rest.
- Secrets stored in platform env vars, never in git.

### 4.3 Application security

- Input validation on API endpoints (Zod schemas).
- Security headers (CSP, HSTS, X-Frame-Options) on web and API.
- Rate limiting on expensive endpoints.
- No sensitive data (tokens, email bodies) in application logs.

### 4.4 Secure development

- CI runs lint, typecheck, build, and security scans before deploy.
- Dependency vulnerabilities tracked via Dependabot and `pnpm audit`.
- SAST (Semgrep) on every push/PR.

### 4.5 Incident response

- Follow `../casa/incident-response-runbook.md`.
- P0 incidents addressed within 1 hour; document all security incidents.

### 4.6 Vendor management

- Subprocessors documented in `../evidence/vendor-list.md`.
- New vendors assessed for data handling before integration.

---

## 5. Roles & responsibilities

| Role | Responsibility |
|------|----------------|
| Owner / Engineering | Implement controls, respond to incidents, maintain documentation |
| Users | Protect credentials; report security concerns to privacy@time-flow.app |

---

## 6. Exceptions

Exceptions must be documented with risk acceptance, compensating controls, and expiry date.

---

## 7. Related documents

- `access-control-policy.md`
- `incident-response-policy.md`
- `data-retention-policy.md`
- `../casa/system-description.md`
