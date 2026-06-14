# Encryption Statement

**Version**: 1.0  
**Last updated**: 2026-06-13  
**Owner**: Grant Pinkerton

---

## Encryption in transit

| Path | Protocol |
|------|----------|
| Browser ↔ Vercel (`time-flow.app`) | TLS 1.2+ (HTTPS); HSTS enabled in production |
| Vercel ↔ Render (`api.time-flow.app`) | TLS 1.2+ (HTTPS) |
| Render ↔ Supabase | TLS (Supabase connection string) |
| Render ↔ Google APIs | TLS (OAuth 2.0, REST) |
| Render ↔ OpenAI | TLS (HTTPS API) |
| Render ↔ Stripe | TLS (HTTPS API + verified webhooks) |

---

## Encryption at rest

| Asset | Method | Key management |
|-------|--------|----------------|
| Google access tokens | AES-256-GCM (`encrypt()` / `decryptStoredToken()`) | `ENCRYPTION_KEY` env var on Render (32-byte key) |
| Google refresh tokens | AES-256-GCM (same module) | Same `ENCRYPTION_KEY` |
| iCloud CalDAV app passwords | AES-256-GCM | Same `ENCRYPTION_KEY` |
| Supabase database | Provider-managed disk encryption | Supabase platform |
| Session JWTs in cookies | Signed with `SESSION_SECRET`; not encrypted separately | `SESSION_SECRET` env var on Render |

---

## Cookie security

| Cookie | Flags (production) |
|--------|---------------------|
| `tf_access` | `HttpOnly; Secure; SameSite=Lax; Domain=.time-flow.app; Path=/` |
| `tf_refresh` | `HttpOnly; Secure; SameSite=Lax; Domain=.time-flow.app; Path=/` |

Google OAuth tokens are **never** stored in browser cookies or localStorage.

---

## Key rotation procedure

1. **Suspected compromise**: Rotate `SESSION_SECRET` and `ENCRYPTION_KEY` in Render; redeploy.
2. **OAuth client secret**: Rotate in Google Cloud Console; update Render env; redeploy.
3. **Post-rotation**: Users must re-authenticate (sessions invalidated). Run `migrate-encrypt-access-tokens.ts` if re-encrypting existing tokens with a new key.

Document rotation events in `../evidence/access-review-log.md` or incident records.

---

## Implementation references

- `apps/backend/src/utils/crypto.ts` — AES-256-GCM encrypt/decrypt
- `apps/backend/src/utils/sessionCookies.ts` — cookie flags
- `apps/backend/src/services/accountTokenService.ts` — token persistence
