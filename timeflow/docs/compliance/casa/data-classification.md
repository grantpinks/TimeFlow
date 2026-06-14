# Data Classification

**Version**: 1.0  
**Last updated**: 2026-06-13  
**Owner**: Grant Pinkerton

---

## Classification levels

| Level | Definition | Handling |
|-------|------------|----------|
| **Restricted** | OAuth tokens, encryption keys, session secrets | Encrypted at rest; never logged; env-only storage |
| **Confidential** | Email metadata, calendar events, tasks, habits, AI conversations | Encrypted in transit; access controlled by user auth; minimal retention |
| **Internal** | App configuration, feature flags, anonymized analytics | Standard access controls |
| **Public** | Marketing pages, privacy policy, terms | No restrictions |

---

## Data inventory

### Restricted

| Data | Location | Retention |
|------|----------|-----------|
| Google refresh tokens | Postgres (`User`, `ConnectedAccount`) | Until logout, revocation, or account deletion |
| Google access tokens (encrypted) | Postgres | Until expiry/refresh; encrypted with `ENCRYPTION_KEY` |
| JWT session secrets | Render env (`SESSION_SECRET`) | Rotated on compromise |
| Stripe customer/subscription IDs | Postgres | Until account deletion |

### Confidential

| Data | Location | Retention |
|------|----------|-----------|
| User email, name, preferences | Postgres | Until account deletion |
| Tasks, habits, identities | Postgres | Until account deletion |
| Calendar event IDs, sync metadata | Postgres + Google Calendar | Until account deletion |
| Gmail message metadata (sender, subject, date, labels) | Postgres inbox cache (24h max), sessionStorage (tab) | See `data-retention-policy.md` |
| Email snippets / bodies | **Not stored server-side** | Fetched on demand from Gmail API only |
| AI assistant messages | Postgres (`Conversation`, `ConversationMessage`) | Until account deletion |
| Meeting booking details (invitee email) | Postgres | Until account deletion |

### Internal

| Data | Location | Retention |
|------|----------|-----------|
| Usage logs (credit costs, action types) | Postgres | Until account deletion |
| Assistant metrics (anonymized counts) | Postgres | Until account deletion |
| PostHog event metadata | PostHog | Per vendor retention |

### Public

| Data | Location |
|------|----------|
| Privacy policy, terms, help content | Vercel static/SSR pages |

---

## Data flow summary

1. **Inbound**: Google OAuth, Calendar/Gmail APIs, Stripe webhooks, user form input.
2. **Processing**: Render API (Fastify); AI prompts sent to OpenAI when user invokes assistant.
3. **Storage**: Supabase Postgres; no object storage for user content.
4. **Outbound**: Google Calendar/Gmail (sync), Stripe (billing), PostHog (analytics).

---

## Prohibited storage

- Full email bodies or snippets in Postgres (enforced by `stripInboxSnippets`)
- Google tokens in browser localStorage or URL parameters
- Cardholder data (PAN, CVV) — Stripe Checkout handles payments off-domain
