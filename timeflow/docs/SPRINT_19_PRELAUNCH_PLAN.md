# Sprint 19: Pre-Launch Hardening & Scalability

**Project**: TimeFlow
**Duration**: 2 weeks
**Focus**: Address critical security vulnerabilities, scalability bottlenecks, and future-proof the architecture for a safe and successful public launch. This sprint is a prerequisite for monetization.

---

## Goals

- [ ] Eliminate all critical security vulnerabilities identified in the pre-launch audit.
- [ ] Implement foundational scalability patterns for the backend and database.
- [ ] Solidify the architecture to safely support upcoming premium features like public booking links and payments.
- [ ] Ensure the application is robust, resilient, and ready for its first wave of public users.

---

## Tasks

### Part 1: Critical Security Hardening (P0)

These tasks address the most severe risks and are mandatory for a public release.

| ID | Task | Agent | Hours | Priority |
|----|------|-------|-------|----------|
| 19.1 | **Implement JWT-based Authentication**: Replace the current dev token system. The backend will sign and issue JWTs upon successful Google OAuth, and the frontend will store them securely (e.g., in `httpOnly` cookies) and send them with each API request. | Codex | 8-10h | P0 |
| 19.2 | **Encrypt Google Tokens at Rest**: Use a strong encryption library (like Node.js `crypto`) to encrypt all Google OAuth refresh tokens before storing them in the database. Create a secure key management strategy for the encryption key. | Codex | 6-8h | P0 |
| 19.3 | **Implement API Request Validation**: Add comprehensive Fastify validation schemas for all public-facing API routes. Ensure all request bodies, params, and query strings are validated. | Codex | 6-8h | P0 |
| 19.4 | **Add API Rate Limiting**: Integrate a rate-limiting plugin for Fastify (e.g., `@fastify/rate-limit`) to prevent abuse. Apply sensible default limits to all endpoints and stricter limits to expensive ones (e.g., `/api/schedule`, `/api/assistant/chat`). | Codex | 4-6h | P0 |
| 19.C1 | **Security Review**: Conduct a peer review of the implemented security measures (JWT, encryption, validation, rate limiting), specifically checking for common vulnerabilities. | Claude | 4-6h | P0 |

### Part 2: Scalability & Infrastructure (P1)

| ID | Task | Agent | Hours | Priority |
|----|------|-------|-------|----------|
| 19.5 | Implement database connection pooling strategy for production and verify Prisma behavior under load. | Codex | 4-6h | P1 |
| 19.6 | Add basic monitoring/alerting hooks for scheduler latency and assistant error rates. | Codex | 4-6h | P1 |
| 19.G1 | Update deployment docs/runbooks for launch readiness (env vars, secrets, queues, monitoring). | Gemini | 3-4h | P1 |

---

**Last Updated**: 2025-12-23


