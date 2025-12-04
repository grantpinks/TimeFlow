# TimeFlow Deployment Guide

**Version**: 1.0
**Last Updated**: 2025-12-04

---

## Overview

This guide walks through deploying TimeFlow to production.

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
```

**Generate secrets**: `openssl rand -base64 32`

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
- Check LLM_ENDPOINT is reachable
- Verify LLM server is running

---

## Security Checklist

- [ ] HTTPS enabled
- [ ] Secrets not in git
- [ ] CORS configured  
- [ ] Rate limiting active
- [ ] Database backups enabled

---

See individual app READMEs for detailed setup instructions.
