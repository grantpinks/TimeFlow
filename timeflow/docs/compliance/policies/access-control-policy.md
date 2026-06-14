# Access Control Policy

**Version**: 1.0  
**Effective date**: 2026-06-13  
**Owner**: Grant Pinkerton  
**Review cadence**: Quarterly access review

---

## 1. Purpose

Define how access to TimeFlow production systems and data is granted, reviewed, and revoked.

---

## 2. Scope

All administrative access to:

- GitHub (source code)
- Vercel (web hosting)
- Render (API hosting)
- Supabase (database)
- Google Cloud Console (OAuth project)
- Stripe Dashboard (billing)

---

## 3. Requirements

### 3.1 Multi-factor authentication (MFA)

MFA **must** be enabled on all platforms listed in Section 2. Evidence captured in `../casa/evidence/mfa-screenshots/`.

### 3.2 Least privilege

- Production database access limited to the Render service account connection string.
- No shared passwords; individual accounts only.
- Admin roles assigned only when required.

### 3.3 User application access

- End users access only their own data via authenticated API sessions.
- Row-level isolation enforced by `userId` on all queries.
- Account deletion removes all user data (`DELETE /api/user/account`).

### 3.4 Service accounts & secrets

- API keys and secrets stored in platform env vars (Render, Vercel).
- Secrets never committed to git.
- Rotation procedure in `../casa/encryption-statement.md`.

---

## 4. Access review

| Activity | Frequency | Evidence |
|----------|-----------|----------|
| Review who has admin access to each platform | Monthly | `../evidence/access-review-log.md` |
| Confirm MFA enabled | Quarterly | `../casa/evidence/mfa-screenshots/` |
| Revoke access for departed personnel | Immediately | Access review log entry |

---

## 5. Onboarding / offboarding

**Onboarding** (new team member):

1. Create individual accounts on required platforms.
2. Enable MFA before granting production access.
3. Assign minimum role needed.
4. Record in access review log.

**Offboarding**:

1. Remove from all platform accounts within 24 hours.
2. Rotate shared secrets if any were accessible.
3. Record in access review log.

---

## 6. Break-glass

In emergency (e.g., suspected compromise):

1. Owner may access production directly via platform dashboards.
2. All break-glass actions logged with timestamp and reason.
3. Rotate affected secrets within 24 hours of incident closure.

---

## 7. Related documents

- `information-security-policy.md`
- `../evidence/access-review-log.md`
- `../casa/evidence/mfa-screenshots/README.md`
