# Vendor / Subprocessor List

**Version**: 1.1  
**Last updated**: 2026-06-13  
**Owner**: Grant Pinkerton  
**Purpose**: CASA / SOC 2 evidence for third-party risk management.

---

## Subprocessors

| Vendor | Purpose | Data touched | Security / compliance docs | DPA / notes |
|--------|---------|--------------|---------------------------|-------------|
| **Google** | OAuth 2.0, Calendar API, Gmail API | OAuth tokens, calendar events, email metadata/content (in transit only) | [Google Cloud Security](https://cloud.google.com/security), [Google API Services User Data Policy](https://developers.google.com/terms/api-services-user-data-policy) | CASA Tier 2 assessment required for restricted scopes |
| **Supabase** | Managed PostgreSQL | All application user data, encrypted OAuth tokens | [Supabase Security](https://supabase.com/security), SOC 2 Type II | Database hosted in Supabase project region |
| **Vercel** | Web hosting (Next.js) | HTTP traffic, session cookies (in transit), static assets | [Vercel Security](https://vercel.com/security), SOC 2 Type II | `/api/*` proxied to Render; no DB access |
| **Render** | API hosting (Fastify) | API traffic, application logs, env secrets | [Render Security](https://render.com/docs/security) | `trustProxy: 1`; secrets in env vars only |
| **OpenAI** | AI assistant, email drafts, scheduling | User prompts, task/calendar/email context in API requests | [OpenAI Security](https://openai.com/security), [API data usage policy](https://openai.com/policies/api-data-usage-policies) | API data not used for training (per OpenAI API terms) |
| **Stripe** | Subscription billing | Customer email, subscription metadata; **no card data on TimeFlow** | [Stripe Security](https://stripe.com/docs/security), PCI DSS Level 1 | Stripe Checkout hosted; SAQ A scope |
| **PostHog** | Product analytics | Anonymized event metadata, page views | [PostHog Security](https://posthog.com/docs/privacy) | No email content or tokens sent |

---

## Data minimization by vendor

| Vendor | What we do NOT send |
|--------|---------------------|
| Google | N/A — user-authorized API access only |
| OpenAI | Full inbox bodies stored; prompts include only context needed for the request |
| PostHog | OAuth tokens, email bodies, calendar event details |
| Stripe | Card numbers (handled entirely by Stripe Checkout) |

---

## Vendor review cadence

- **Quarterly**: Confirm subprocessors unchanged; check for new SOC reports.
- **On onboarding**: Assess data flow before integrating new vendor.
- **On incident**: Follow vendor breach notification procedures.

---

## Removed / not in production

| Vendor | Status |
|--------|--------|
| Sentry | Not currently enabled in production |
