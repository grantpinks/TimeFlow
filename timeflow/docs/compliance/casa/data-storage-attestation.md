# Data Storage Attestation

**Version**: 1.0  
**Last updated**: 2026-06-13  
**Owner**: Grant Pinkerton  
**Attested by**: Grant Pinkerton

---

## Statement

I attest that TimeFlow stores user data only in Supabase PostgreSQL (production) and short-lived client-side session caches as described below. Full email content and message snippets are not persisted on TimeFlow servers.

---

## Primary data store

| Attribute | Value |
|-----------|-------|
| Provider | Supabase (managed PostgreSQL) |
| Access | Render API via `DATABASE_URL` (TLS) |
| ORM | Prisma |
| Backups | Supabase platform-managed |
| Encryption at rest | Supabase provider encryption |

---

## What we store

| Category | Stored? | Location | Max retention |
|----------|---------|----------|---------------|
| User profile & preferences | Yes | Postgres | Until account deletion |
| Tasks, habits, identities | Yes | Postgres | Until account deletion |
| Calendar sync metadata | Yes | Postgres | Until account deletion |
| Gmail metadata (no snippet) | Yes | Postgres `InboxCache` | 24 hours |
| Gmail snippets / bodies | **No** | — | Fetched on demand from Gmail API |
| Google OAuth tokens | Yes (encrypted) | Postgres | Until logout/deletion |
| AI conversations | Yes | Postgres | Until account deletion |
| Session JWTs | No (cookies only) | Browser httpOnly cookies | 15 min / 7 days |

---

## Client-side storage

| Store | Contents | Lifetime |
|-------|----------|----------|
| httpOnly cookies | Session JWTs only | Per cookie max-age |
| sessionStorage | Inbox metadata (no snippets) | Until tab close |
| localStorage | **No auth tokens** (removed Phase 1) | — |

---

## Account deletion

`DELETE /api/user/account` removes all user-owned rows in a transactional delete, then revokes Google tokens and cancels Stripe. See `accountDeletionService.ts`.

User-initiated from Settings → Delete account.

---

## Third-party data processing

Data sent to subprocessors is limited to what each integration requires. See `../evidence/vendor-list.md`.

---

## Privacy policy alignment

Public policy: https://time-flow.app/privacy  
Last updated: 2026-06-13 (metadata-only caching, self-service deletion).
