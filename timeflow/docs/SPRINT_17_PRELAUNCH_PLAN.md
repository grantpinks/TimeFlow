# Sprint 17: Pre-Launch Hardening & Scalability

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
| 17.1 | **Implement JWT-based Authentication**: Replace the current dev token system. The backend will sign and issue JWTs upon successful Google OAuth, and the frontend will store them securely (e.g., in `httpOnly` cookies) and send them with each API request. | Codex | 8-10h | P0 |
| 17.2 | **Encrypt Google Tokens at Rest**: Use a strong encryption library (like Node.js `crypto`) to encrypt all Google OAuth refresh tokens before storing them in the database. Create a secure key management strategy for the encryption key. | Codex | 6-8h | P0 |
| 17.3 | **Implement API Request Validation**: Add comprehensive Fastify validation schemas for all public-facing API routes. Ensure all request bodies, params, and query strings are validated. | Codex | 6-8h | P0 |
| 17.4 | **Add API Rate Limiting**: Integrate a rate-limiting plugin for Fastify (e.g., `@fastify/rate-limit`) to prevent abuse. Apply sensible default limits to all endpoints and stricter limits to expensive ones (e.g., `/api/schedule`, `/api/assistant/chat`). | Codex | 4-6h | P0 |
| 17.C1 | **Security Review**: Conduct a peer review of the implemented security measures (JWT, encryption, validation, rate limiting), specifically checking for common vulnerabilities. | Claude | 4-6h | P0 |

### Part 2: Scalability & Performance (P1)

These tasks ensure the platform can handle a growing number of users without performance degradation.

| ID | Task | Agent | Hours | Priority |
|----|------|-------|-------|----------|
| 17.5 | **Containerize Backend Application**: Create a `Dockerfile` for the backend service to ensure a consistent and portable deployment environment, preparing it for scalable hosting. | Codex | 4-6h | P1 |
| 17.6 | **Connection Pooling Strategy**: Verify that the production database setup (e.g., Supabase, Neon) uses a connection pooler like pgBouncer. Resolve the `DATABASE_URL` issue noted in `TASKS.md` to ensure a stable connection. | Codex | 3-4h | P1 |
| 17.7 | **Background Scheduling Investigation**: For the scheduling algorithm, create a proof-of-concept that offloads the `scheduleTasks` execution to a background job queue (e.g., using BullMQ). Document the findings and the implementation path for a future sprint. | Codex | 6-8h | P1 |
| 17.8 | **Google API Quota Plan**: Draft the official request for a Google Cloud API quota increase. Document the current usage and projected usage based on a target of 1,000 active users. | Claude | 2-3h | P1 |
| 17.9 | **Implement LLM Caching**: Implement a simple in-memory cache (e.g., using `node-cache`) or a Redis-based cache for the `assistantService` to reduce redundant calls to the LLM for identical prompts. | Codex | 4-6h | P1 |

### Part 3: Architecture & Future-Proofing (P2)

These tasks establish secure patterns for upcoming monetization features.

| ID | Task | Agent | Hours | Priority |
|----|------|-------|-------|----------|
| 17.10 | **Public Availability API Design**: Create an architectural document outlining the secure design for the `GET /api/availability/[urlSlug]` endpoint. It must specify how to return only free/busy blocks and prevent any private event data from being exposed. | Claude | 4-6h | P2 |
| 17.11 | **Payment Integration Plan**: Document the technical plan for Stripe integration. This should include the webhook handling strategy for subscription events, the feature entitlement system, and a strict confirmation that no credit card data will ever be stored in the TimeFlow database. | Claude | 4-6h | P2 |
| 17.G1 | **Update Core Documentation**: Update `ARCHITECTURE_DECISIONS.md`, `DEPLOYMENT.md`, and the backend `README.md` to reflect the new security and scalability measures implemented in this sprint. | Gemini | 4-6h | P1 |

---

## Decision Gate

- [ ] Have all four critical security tasks (17.1 - 17.4) been implemented and peer-reviewed?
- [ ] Is the backend application successfully running inside a Docker container?
- [ ] Is the production database connection strategy confirmed to be stable and pooled?
- [ ] Is there a clear, documented plan for handling Google API quotas and future payment integration?
- [ ] Has all relevant documentation been updated by Gemini?

---

**Last Updated**: 2025-12-11
