# Data Retention & Deletion Policy

**Version**: 1.0  
**Effective date**: 2026-06-13  
**Owner**: Grant Pinkerton  
**Review cadence**: Annually

---

## 1. Purpose

Define how long TimeFlow retains user data and how users can request deletion.

---

## 2. Scope

All user data stored by TimeFlow in Postgres, client caches, and third-party integrations.

---

## 3. Retention periods

| Data type | Retention | Deletion trigger |
|-----------|-----------|------------------|
| User profile & preferences | Account lifetime | Account deletion |
| Tasks, habits, identities | Account lifetime | Account deletion |
| Calendar sync metadata | Account lifetime | Account deletion |
| AI conversations | Account lifetime | Account deletion |
| Google OAuth tokens (encrypted) | Until logout or account deletion | Logout revoke / account deletion |
| Inbox metadata cache (server) | Max 24 hours | TTL expiry or account deletion |
| Inbox metadata cache (browser) | Tab session | Tab close or logout |
| Usage logs | Account lifetime | Account deletion |
| Application logs (Render) | Per Render retention (~30 days) | Platform auto-expiry |
| PostHog analytics | Per PostHog settings | Vendor retention |

---

## 4. What we do not retain

- Full email bodies or snippets in Postgres (metadata only).
- Google OAuth tokens in browser storage.
- Cardholder data (handled by Stripe).

---

## 5. User deletion rights

Users may delete their account at any time:

1. **Self-service**: Settings → Delete account → type `DELETE` to confirm.
2. **API**: `DELETE /api/user/account` (authenticated).
3. **Email request**: privacy@time-flow.app (for users unable to access account).

Deletion removes all user-owned database rows, revokes Google tokens, cancels Stripe subscription, and clears session cookies.

---

## 6. Backup retention

Supabase platform backups follow provider defaults. Deleted user data is not restored for individual user requests after deletion completes.

---

## 7. Legal holds

If required by law, retention may be extended for specific records. Document any hold with legal counsel guidance.

---

## 8. Related documents

- `../casa/data-classification.md`
- `../casa/data-storage-attestation.md`
- Public privacy policy: https://time-flow.app/privacy
