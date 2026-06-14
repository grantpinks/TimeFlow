# MFA Evidence Checklist

**Purpose**: CASA / SOC 2 evidence that multi-factor authentication is enabled on all administrative platforms.

**Owner**: Grant Pinkerton  
**Last updated**: 2026-06-13

---

## Instructions

1. Enable MFA on each platform (if not already).
2. Capture a screenshot showing MFA is enabled (hide personal phone numbers if visible).
3. Save screenshots in this folder with the naming convention below.
4. Check off each item when complete.

---

## Checklist

| Platform | MFA enabled | Screenshot file | Date captured |
|----------|-------------|-----------------|---------------|
| [ ] GitHub | | `github-mfa.png` | |
| [ ] Vercel | | `vercel-mfa.png` | |
| [ ] Render | | `render-mfa.png` | |
| [ ] Supabase | | `supabase-mfa.png` | |
| [ ] Google Cloud Console | | `gcp-mfa.png` | |
| [ ] Stripe (optional) | | `stripe-mfa.png` | |

---

## Where to find MFA settings

| Platform | Path |
|----------|------|
| GitHub | Settings → Password and authentication → Two-factor authentication |
| Vercel | Account Settings → Authentication → Two-Factor Authentication |
| Render | Account Settings → Security |
| Supabase | Organization → Security → MFA |
| Google Cloud | Google Account → Security → 2-Step Verification |
| Stripe | User settings → Security → Two-step authentication |

---

## Notes

- Do not commit screenshots containing recovery codes or backup codes.
- Re-capture quarterly or after any admin account change.
- Reference: `../../policies/access-control-policy.md` Section 3.1
