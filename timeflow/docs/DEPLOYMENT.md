# TimeFlow Deployment Guide

> **⚠️ For production deployment to public cloud (Render + Vercel + Supabase), see the comprehensive guide**: [`PRODUCTION_DEPLOYMENT_GUIDE.md`](./PRODUCTION_DEPLOYMENT_GUIDE.md)

**Version**: 1.0
**Last Updated**: 2025-12-04

---

## Overview

This guide covers local development deployment and Docker setup.

---

## Prerequisites

- PostgreSQL database (14+)
- Node.js 20+
- pnpm 9+
- Google OAuth 2.0 credentials

---

## Environment Variables

### Backend (.env)

```bash
DATABASE_URL="postgresql://user:pass@host:port/db?sslmode=require"
SESSION_SECRET="<32+ char random string>"
ENCRYPTION_KEY="<32+ char random string>"
GOOGLE_CLIENT_ID="<google-oauth-id>"
GOOGLE_CLIENT_SECRET="<google-oauth-secret>"
GOOGLE_REDIRECT_URI="https://your-domain.com/api/auth/google/callback"
APP_BASE_URL="https://your-frontend.com"
NODE_ENV="production"
LLM_PROVIDER="openai"
OPENAI_API_KEY="<openai-api-key>"
OPENAI_MODEL="gpt-4o-mini"
LLM_ENDPOINT="http://localhost:11434/v1/chat/completions"
LLM_MODEL="llama3.2"
LLM_MAX_TOKENS="4000"
```

**Generate secrets**: `openssl rand -base64 32`

---

## Optional: Gmail Label Sync (Sprint 15)

If you enable the “Gmail Label Sync” feature (labels applied inside Gmail), you’ll also need Google Cloud Pub/Sub and a stable public push endpoint.

### Google Cloud Setup

- Enable Gmail API in your Google Cloud project.
- Ensure OAuth consent screen and scopes include Gmail access (label application requires `gmail.modify`).
- Plan for Google OAuth verification if rolling out to consumer users.

### Pub/Sub Setup (Watch Notifications)

- Create a Pub/Sub **topic** (e.g., `gmail-watch-topic`).
- Create a **push subscription** to your backend endpoint (e.g., `POST /api/integrations/gmail/push`).
- Prefer configuring Pub/Sub push auth (OIDC) or an allowlist at the edge/WAF layer.

### Operational Notes

- Gmail watch subscriptions expire; you must renew them periodically.
- Push delivery is at-least-once; your handler must be idempotent and dedupe by historyId.

Docs:
- Sprint plan: `docs/SPRINT_16_PLAN.md`
- Implementation guide: `docs/SPRINT_16_GMAIL_LABEL_SYNC_IMPLEMENTATION_GUIDE.md`

---

## Deployment Steps

### 1. Database Setup

```bash
# Run migrations
cd apps/backend
pnpm prisma migrate deploy
```

### 2. Backend Deployment

**Recommended**: Railway, Render, Fly.io

- Build: `cd apps/backend && pnpm install && pnpm prisma generate && pnpm build`
- Start: `cd apps/backend && pnpm start`
- Add environment variables
- Expose port 3001

### 3. Web Deployment

**Recommended**: Vercel

```bash
cd apps/web
vercel --prod
```

Set env var: `NEXT_PUBLIC_API_BASE_URL=https://your-backend.com/api`

### 4. Mobile Deployment

```bash
cd apps/mobile
eas build --platform ios
eas submit --platform ios
```

---

## Health Checks

```bash
curl https://your-backend.com/health
# Expected: {"status":"ok"}
```

---

## Troubleshooting

**Backend won't start**:
- Check ENCRYPTION_KEY is set (32+ chars)
- Verify DATABASE_URL connection

**OAuth fails**:
- Verify redirect URI matches Google Console
- Check APP_BASE_URL is correct

**AI Assistant not working**:
- If using OpenAI: ensure `OPENAI_API_KEY` is set and `LLM_PROVIDER="openai"`
- If using local LLM: check `LLM_ENDPOINT` is reachable and the server is running
- For Ollama: Ensure model is pulled (`docker compose exec ollama ollama pull llama3.2`)

## OpenAI Provider Configuration

TimeFlow can use OpenAI for `/api/assistant/chat` with strict JSON scheduling output.

Set in your hosting environment (do not commit secrets):

```bash
LLM_PROVIDER="openai"
OPENAI_API_KEY="<openai-api-key>"
OPENAI_MODEL="gpt-4o-mini"
```

Scheduling mode uses strict JSON schema output and server-side validation to keep schedule previews safe.

## AI Model Configuration

TimeFlow uses llama3.2 as the default AI model, with support for llama3.3 and gpt-oss as alternatives.

### Using llama3.2 (Default)

1. **Start Ollama** (via docker-compose):
   ```bash
   docker compose up -d ollama
   ```

2. **Pull the llama3.2 model**:
   ```bash
   docker compose exec ollama ollama pull llama3.2
   ```

3. **Start the backend** (llama3.2 is already configured as default):
   ```bash
   cd apps/backend
   pnpm dev:backend
   ```

### Switching to a Different Model

To use llama3.3 or another model:

1. **Update your .env**:
   ```bash
   ASSISTANT_MODEL="llama3.3"
   ```

2. **Pull the model if needed**:
   ```bash
   docker compose exec ollama ollama pull llama3.3
   ```

3. **Restart the backend**:
   ```bash
   pnpm dev:backend
   ```

---

## Security Checklist

- [ ] HTTPS enabled
- [ ] Secrets not in git
- [ ] CORS configured  
- [ ] Rate limiting active
- [ ] Database backups enabled

---

See individual app READMEs for detailed setup instructions.
