# Vendor / Subprocessor List

**Purpose**: SOC 2 evidence that you understand and manage third-party risk.

## Template

| Vendor | Purpose | Data touched | Security docs link | Notes / decisions |
|--------|---------|--------------|--------------------|------------------|
| Vercel | Web hosting | App UI, user session traffic |  |  |
| Render | API hosting | API traffic, logs |  |  |
| Supabase | Postgres | User data, tokens (encrypted), tasks, email metadata |  |  |
| Google | OAuth + Calendar/Gmail APIs | OAuth tokens, calendar/email data |  |  |
| OpenAI (if enabled) | AI assistant | Potentially user prompts/content |  |  |
| PostHog (if enabled) | Analytics | Event metadata |  |  |
| Sentry (if enabled) | Error tracking | Stack traces (ensure no sensitive payloads) |  |  |


