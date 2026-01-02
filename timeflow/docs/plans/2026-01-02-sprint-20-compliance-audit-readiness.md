# Sprint 20: Compliance & Audit Readiness (SOC 2 / ISO 27001 / PCI) — Scope

**Date**: 2026-01-02  
**Sprint**: 20  
**Goal**: Make TimeFlow “professional-grade” from a security/compliance perspective by implementing the controls, documentation, and evidence capture needed to **pass audits** (SOC 2, ISO 27001) and **minimize PCI scope**.

---

## Answer to “is this actionable?”

Yes — this plan is intended to be **directly executable**. SOC 2 Type I is fundamentally: **controls exist and are documented** (plus you can show initial evidence where applicable).

To make that concrete, Sprint 20 should produce:
- **Policies** (written, approved, versioned)
- **Controls implemented** (MFA, least privilege, logging, incident response, secure SDLC)
- **Evidence artifacts** (access review records, scan reports, incident tabletop record, vendor list)

This document now includes a **step-by-step checklist** and explicitly calls out what evidence to save.

## Reality check (important)

- **SOC 2 / ISO 27001 are not just code**. Passing requires:
  - policies + procedures
  - control implementation
  - *evidence over time* (e.g., access reviews, incident drills, vulnerability scans)
- Sprint 20 can absolutely make you **audit-ready**, but “passing with flying colors” typically means:
  - **SOC 2 Type I** (design of controls) first, then
  - **SOC 2 Type II** (operating effectiveness) after a **3–6 month** evidence window
- **PCI** depends heavily on payment architecture. The cheapest/cleanest path is to **avoid handling card data entirely** (keep TimeFlow out of the cardholder data environment).

---

## Audit target (locked): SOC 2 Type I first

**Sprint 20 target**: **SOC 2 Type I** readiness (controls *designed and implemented*, with initial evidence).  
**Immediately after Sprint 20**: start the evidence window for **SOC 2 Type II** (operating effectiveness over time, commonly 3–6+ months).

What this changes:
- We prioritize **getting controls in place** and **making them auditable** (policy, ownership, logs, access reviews, incident runbooks).
- We don’t block on “months of evidence” inside Sprint 20, but we set up the **evidence pipeline** so Type II becomes straightforward.

---

## Cost-efficient strategy (recommended)

### 1) Target: SOC 2 first
- Start with **Security** (required) and add **Confidentiality** if you’re selling to teams/SMBs.
- Treat ISO 27001 as a follow-on once you have SOC 2 discipline (ISO requires an ISMS program).

### 2) PCI: reduce scope aggressively
- Use **Stripe-hosted checkout** (e.g., Stripe Checkout) so TimeFlow never stores/processes card numbers.
- Keep payment pages and card entry **off your domain/app** to stay in the lowest-scope path (often SAQ A style).

### 3) Tooling (minimal but credible)
- Centralized logs (Render/Vercel + an aggregator if needed)
- Error tracking (optional but helpful)
- Dependency + vulnerability scanning in CI
- Access control discipline (MFA everywhere, least privilege, periodic reviews)

---

## System scope definition (what auditors will ask)

Define and document:
- **In-scope systems**: Vercel (web), Render (API), Supabase (DB), Google OAuth/Calendar/Gmail, OpenAI (if enabled), PostHog/Sentry (if enabled)
- **Data classification**:
  - OAuth tokens (high sensitivity)
  - email metadata/content (high sensitivity)
  - calendar events (high sensitivity)
  - tasks/notes (high sensitivity)
- **Data flows**: where data enters, where it’s stored, how it’s encrypted, who can access it

Deliverable: a 1–2 page “System Description” + diagram.

---

## Sprint 20 work (actionable checklist)

### A) Governance & Documentation (SOC 2 / ISO foundation)
- Policies (lightweight but real):
  - Information Security Policy
  - Access Control Policy (least privilege + reviews)
  - Secure SDLC / Change Management Policy
  - Incident Response Policy
  - Vendor Management Policy
  - Data Retention + Deletion Policy
- Risk assessment:
  - identify top risks (OAuth token leakage, email content exposure, SSRF, auth bypass, logging leaks)
  - risk treatment plan (what you’re doing about each)
- Runbooks:
  - onboarding/offboarding access checklist
  - incident response runbook + contact list

### B) Identity & Access Management
- Require **MFA** on:
  - GitHub
  - Vercel
  - Render
  - Supabase
  - Google Cloud
- Remove shared credentials; enforce least privilege roles
- Access reviews:
  - monthly “who has prod access?” checklist + evidence stored

### C) Secrets & Key Management
- Ensure:
  - secrets not in git
  - environment separation (dev/stage/prod)
  - documented rotation procedure for `SESSION_SECRET`, `ENCRYPTION_KEY`, OAuth secrets
- Add “break-glass” procedure (who can change prod secrets, when, how logged)

### D) Application Security Controls
- Confirm/implement:
  - input validation on all public endpoints
  - rate limiting on expensive endpoints
  - secure cookies / session storage where appropriate
  - CORS locked to expected origins
  - protection against sensitive logging (emails/tokens)
- Add an “admin-only debug” mode policy (disabled in production by default)

### E) Logging, Monitoring, and Evidence
- Define required logs:
  - auth events (login, token refresh failures)
  - admin/config changes (env var changes, deploys)
  - security events (rate limit triggers, 401 spikes)
- Log retention target (e.g., 30–90 days for beta; longer for enterprise later)
- Evidence capture:
  - periodic screenshots/exports of access reviews
  - CI scan outputs
  - incident drill record (even “no incidents” must be evidenced)

### F) Vendor & Subprocessor Management
- Create a subprocessor list (Vercel, Render, Supabase, Google, OpenAI, PostHog, etc.)
- Record:
  - what data each receives
  - links to their security pages/SOC reports (where available)
  - DPAs where needed

### G) PCI (payments) scope control (prep for Sprint 19+)
- Commit to Stripe approach that minimizes PCI scope:
  - Stripe Checkout hosted pages
  - avoid storing PAN/cardholder data entirely
  - ensure webhooks are verified and secrets are protected
- Document payment data flow and “what we do NOT store” statement

---

## Acceptance Criteria (Sprint 20)
- A SOC 2 auditor can perform a **Type I assessment**: controls exist, are documented, and you can demonstrate early evidence where applicable.
- A SOC 2 auditor can read your **System Description** and see clear control ownership.
- You have implemented and can demonstrate:
  - MFA everywhere
  - least privilege + periodic access reviews (with evidence)
  - secure secrets handling + rotation procedure
  - validated inputs + rate limiting + safe logging
  - incident response runbook + at least one tabletop exercise documented
- PCI scope is minimized by architecture (Stripe-hosted checkout planned), and documented.

---

## Suggested next milestone (post Sprint 20)

### SOC 2 Type II runway
- Set an evidence window (recommended): **3 months** minimum for first Type II if you want to move fast.
- Run these on a schedule and store evidence:
  - monthly access reviews
  - vulnerability scan reports + remediation tickets
  - incident drill(s) + postmortems
  - change management evidence (PR reviews, deploy logs, approvals)

---

## Sprint 20 execution checklist (SOC 2 Type I oriented)

> **Definition of done for each item**: you can show an auditor the artifact (policy, config screenshot/export, log output, or completed record) stored in-repo under `docs/compliance/`.

### Step 0: Decide audit scope + boundaries (P0)
- Define the SOC 2 **system boundary**:
  - in-scope services (Vercel, Render, Supabase, Google, OpenAI, etc.)
  - environments (prod only vs prod+staging)
  - which Trust Services Criteria besides **Security** (recommend: add **Confidentiality** if selling to businesses)
- **Evidence**:
  - `docs/compliance/system-scope.md` (what’s in scope / out of scope)
  - `docs/compliance/system-diagram.md` (data flow diagram)

### Step 1: Policies (P0)
Write short, enforceable policies (avoid 20-page fluff).
- Information Security Policy
- Access Control Policy
- Secure SDLC / Change Management Policy
- Incident Response Policy
- Vendor Management Policy
- Data Retention & Deletion Policy
- **Evidence**: markdown policy files under `docs/compliance/policies/`

### Step 2: Identity & access control hardening (P0)
- Enforce **MFA** for: GitHub, Vercel, Render, Supabase, Google Cloud, any admin email.
- Ensure least privilege:
  - no “owner/admin” roles assigned unnecessarily
  - production access is explicit and limited
- Establish onboarding/offboarding checklist (even if it’s “only you” right now).
- **Evidence**:
  - `docs/compliance/evidence/access-review-log.md` (record current access + monthly reviews)
  - screenshots/exports saved under `docs/compliance/evidence/screenshots/` (optional)

### Step 3: Secrets management + key hygiene (P0)
- Verify:
  - no secrets in git
  - prod secrets are separate from dev
  - rotation procedure exists for `SESSION_SECRET`, `ENCRYPTION_KEY`, Google OAuth client secret, webhook secrets
- Add a “break-glass” procedure (what happens if you suspect compromise).
- **Evidence**:
  - `docs/compliance/evidence/secrets-rotation.md`
  - `docs/compliance/evidence/break-glass.md`

### Step 4: Application security baseline (P0)
- Confirm/implement:
  - request validation on all public routes
  - rate limiting on expensive routes
  - safe auth/session handling
  - CORS locked down
  - “no sensitive logs” discipline (tokens, email bodies, calendar contents)
- **Evidence**:
  - `docs/compliance/evidence/appsec-controls.md` (what’s enforced, where)

### Step 5: Logging + monitoring for auditability (P0)
- Define:
  - which events you log (auth events, permission changes, admin actions, rate-limit trips)
  - log retention target
- Ensure logs are accessible and retained long enough to support Type I review.
- **Evidence**:
  - `docs/compliance/evidence/logging-and-retention.md`

### Step 6: Secure SDLC & change management evidence (P0)
- Minimum viable controls:
  - PR review required for main (or documented exception if solo)
  - CI runs lint/tests/build
  - basic dependency vulnerability scanning
- **Evidence**:
  - `docs/compliance/evidence/sdlc.md` (how changes are proposed/reviewed/released)

### Step 7: Vulnerability management (P0)
- Establish a cadence:
  - dependency scan weekly
  - critical patches within X days
  - track security fixes as tickets/issues
- **Evidence**:
  - `docs/compliance/evidence/vuln-management.md`

### Step 8: Incident response (P0)
- Write the incident response runbook and do **one tabletop exercise**.
- **Evidence**:
  - `docs/compliance/evidence/incident-response.md`
  - `docs/compliance/evidence/incident-tabletop-YYYY-MM-DD.md`

### Step 9: Vendor/subprocessor management (P0)
- List subprocessors and what data they touch.
- **Evidence**:
  - `docs/compliance/evidence/vendor-list.md`

### Step 10: PCI scope minimization (P0 for planning, implementation depends on Sprint 19)
- Document the payment architecture choice:
  - Stripe-hosted checkout, no storage of PAN/cardholder data
  - webhook signature verification requirements
- **Evidence**:
  - `docs/compliance/evidence/pci-scope.md`


