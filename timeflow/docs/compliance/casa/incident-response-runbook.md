# Incident Response Runbook

**Version**: 1.0  
**Last updated**: 2026-06-13  
**Owner**: Grant Pinkerton  
**On-call**: Grant Pinkerton — privacy@time-flow.app

---

## Severity levels

| Level | Examples | Response target |
|-------|----------|-----------------|
| **P0 Critical** | Active data breach, OAuth token mass leak, DB credential exposure | 1 hour |
| **P1 High** | Auth bypass, single-user token compromise, API abuse | 4 hours |
| **P2 Medium** | Dependency CVE with exploit path, suspicious access pattern | 24 hours |
| **P3 Low** | Failed scan finding, non-exploitable CVE | Next sprint |

---

## P0: Suspected OAuth / session compromise

1. **Contain**
   - Rotate `SESSION_SECRET` and `ENCRYPTION_KEY` in Render; redeploy API.
   - Rotate Google OAuth client secret in Google Cloud Console; update Render env.
   - If DB credentials suspected: rotate Supabase password; update `DATABASE_URL`.

2. **Revoke**
   - Force global re-auth: cookie rotation invalidates all sessions.
   - For targeted user: advise logout; optionally delete refresh token in DB.

3. **Assess**
   - Check Render logs for unusual 401/403 spikes, new IP patterns.
   - Review recent deploys and git commits.

4. **Notify**
   - Affected users via email if personal data accessed.
   - Google if restricted scope abuse suspected (per OAuth policy).
   - Document in incident record.

5. **Recover**
   - Redeploy known-good commit if code compromise suspected.
   - Run `migrate-encrypt-access-tokens.ts` if re-encrypting with new key.

---

## P0: Database credential exposure

1. Rotate Supabase database password immediately.
2. Update `DATABASE_URL` on Render; redeploy.
3. Review Supabase audit logs for unauthorized queries.
4. Document scope of exposure.

---

## P1: Dependency vulnerability (exploitable)

1. Check `pnpm audit` / GitHub Dependabot alert.
2. Patch or override dependency; run CI.
3. Deploy to production within 72 hours for High/Critical.
4. Save scan report to `self-scan-results/`.

---

## P1: Abnormal API traffic

1. Check Render metrics and rate-limit logs.
2. Block abusive IPs at Render/Vercel if available.
3. Tighten rate limits if needed.

---

## Communication template

**Subject**: TimeFlow Security Notice

> We detected [brief description] on [date]. We took [actions]. Your data [was/was not] affected. Contact privacy@time-flow.app with questions.

---

## Post-incident

1. Write postmortem (timeline, root cause, action items).
2. Update policies/controls if gap found.
3. Store record in `../evidence/` (use `incident-tabletop-template.md` format for drills).

---

## Contacts

| Role | Contact |
|------|---------|
| Engineering / on-call | Grant Pinkerton |
| Privacy inquiries | privacy@time-flow.app |
| Google OAuth issues | Google Cloud Console support |
| Supabase | Supabase dashboard support |
| Stripe | Stripe dashboard support |

---

## Tabletop exercises

Run at least one tabletop per quarter. Template: `../evidence/incident-tabletop-template.md`.
