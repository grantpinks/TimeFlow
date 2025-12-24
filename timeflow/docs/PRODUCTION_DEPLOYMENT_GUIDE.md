# TimeFlow Production Deployment Guide

**Goal**: Deploy TimeFlow to production (Render backend + Vercel frontend + Supabase database) for ~100 beta users with zero downtime and no broken functionality.

**Target Stack**:
- **Frontend**: Vercel (free tier)
- **Backend**: Render (always-on instance, ~$7–15/month)
- **Database**: Supabase Postgres (you already have this set up)
- **Domain**: Optional for beta (can use default Vercel/Render URLs)

---

## Prerequisites Checklist

Before you start, gather these items:

### 1. Supabase Database
- [ ] **Supabase project URL** and **connection string** (you already have this)
- [ ] Confirm you can connect to it from your local machine
- [ ] Run Prisma migrations on the Supabase DB (see Step 3 below)

### 2. Google OAuth Credentials
- [ ] **Google Client ID** (from Google Cloud Console)
- [ ] **Google Client Secret**
- [ ] Note: You'll need to **add production redirect URIs** after deployment (see Step 6)

### 3. Security Secrets (generate new ones for production)
- [ ] **SESSION_SECRET** (random 32+ char string for JWT signing)
- [ ] **ENCRYPTION_KEY** (random 32+ char string for encrypting Google tokens)

**Generate these with**:
```bash
# On your Windows machine (PowerShell):
-join ((48..57) + (65..90) + (97..122) | Get-Random -Count 48 | ForEach-Object {[char]$_})
```
Run that command **twice** to get two different secrets.

### 4. Optional: AI/Analytics Keys
- [ ] **OpenAI API Key** (if using AI assistant in production)
- [ ] **PostHog API Key** (if you want analytics tracking)

---

## Architecture Overview

```
┌─────────────────────┐
│  Users (browser)    │
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│  Vercel Frontend    │  app.yourdomain.com (or your-app.vercel.app)
│  (Next.js)          │  Serves UI, proxies API calls to backend
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│  Render Backend     │  your-api.onrender.com
│  (Fastify API)      │  Handles auth, calendar sync, AI, scheduling
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│  Supabase Postgres  │  Cloud-hosted database
│  (existing project) │  Stores users, tasks, habits, etc.
└─────────────────────┘
```

---

## Step-by-Step Deployment

### Step 1: Prepare the Database (Supabase)

**What**: Run Prisma migrations on your Supabase database so the schema is production-ready.

**How**:
1. Get your **Supabase connection string**:
   - Go to your Supabase project dashboard
   - Navigate to **Settings** → **Database**
   - Copy the **Connection string** (PostgreSQL format, NOT the pooler URL)
   - It looks like: `postgresql://postgres:[PASSWORD]@[HOST]:5432/postgres`

2. **Test the connection** from your local machine:
   ```bash
   cd "C:\Users\theth\Desktop\Productivity Pro\timeflow\apps\backend"
   
   # Temporarily set the DATABASE_URL to your Supabase connection string
   $env:DATABASE_URL="postgresql://postgres:[YOUR-PASSWORD]@[YOUR-HOST]:5432/postgres"
   
   # Test the connection
   pnpm prisma db pull
   ```

3. **Run migrations** on Supabase:
   ```bash
   # Still in apps/backend with DATABASE_URL set to Supabase
   pnpm prisma migrate deploy
   ```
   This applies all your existing migrations to the cloud database.

4. **Verify it worked**:
   ```bash
   pnpm prisma studio
   ```
   This should open Prisma Studio connected to your Supabase DB. You should see all your tables.

**⚠️ Important**: After this step, your **Supabase database is ready**. Do NOT run migrations again unless you're adding new features.

---

### Step 2: Deploy Backend to Render

**What**: Get your Fastify API running on Render with all the correct environment variables.

**How**:

#### 2.1: Create Render Account & New Web Service
1. Go to [render.com](https://render.com) and sign up (free)
2. Click **New +** → **Web Service**
3. Connect your **GitHub/GitLab** account (you'll need to push TimeFlow to a Git repo first—see Step 2.2)

#### 2.2: Push TimeFlow to a Git Repo (if not already done)
**⚠️ CRITICAL: Scrub secrets first!**

Before pushing to GitHub:
```bash
cd "C:\Users\theth\Desktop\Productivity Pro\timeflow"

# Make sure .env files are in .gitignore (they should be already)
cat .gitignore | Select-String ".env"

# If .env is NOT in .gitignore, add it:
echo ".env" >> .gitignore
echo ".env.local" >> .gitignore
echo "*.env" >> .gitignore
```

Then push:
```bash
git init  # if not already a git repo
git add .
git commit -m "Prepare for production deployment"

# Create a new private repo on GitHub, then:
git remote add origin https://github.com/YOUR-USERNAME/timeflow.git
git push -u origin main
```

#### 2.3: Configure Render Web Service
Back in Render:
1. **Select your repo** (the one you just pushed)
2. **Configure the service**:
   - **Name**: `timeflow-backend`
   - **Region**: Choose closest to your users (e.g., Oregon or Ohio for US)
   - **Branch**: `main`
   - **Root Directory**: `apps/backend`
   - **Environment**: `Node`
   - **Build Command**: `pnpm install && pnpm prisma:generate && pnpm build`
   - **Start Command**: `node dist/index.js`
   - **Plan**: Select **Starter** ($7/month for always-on) or **Free** (will sleep after inactivity)

3. Click **Advanced** and add these **Environment Variables**:

| Key | Value | Notes |
|-----|-------|-------|
| `NODE_ENV` | `production` | Required |
| `PORT` | `4000` | Render uses PORT from env |
| `DATABASE_URL` | `postgresql://postgres:[PASSWORD]@[HOST]:5432/postgres` | Your Supabase connection string |
| `SESSION_SECRET` | `[YOUR-NEW-SECRET-1]` | Generate a new one (see Prerequisites) |
| `ENCRYPTION_KEY` | `[YOUR-NEW-SECRET-2]` | Generate a new one (32+ chars) |
| `GOOGLE_CLIENT_ID` | `[YOUR-GOOGLE-CLIENT-ID]` | From Google Cloud Console |
| `GOOGLE_CLIENT_SECRET` | `[YOUR-GOOGLE-CLIENT-SECRET]` | From Google Cloud Console |
| `GOOGLE_REDIRECT_URI` | `https://your-backend.onrender.com/api/auth/google/callback` | **UPDATE AFTER DEPLOY** (see Step 2.4) |
| `APP_BASE_URL` | `https://your-app.vercel.app` | **UPDATE AFTER FRONTEND DEPLOY** (Step 4) |
| `RATE_LIMIT_MAX` | `100` | Optional: max requests per minute per IP |
| `RATE_LIMIT_WINDOW` | `1 minute` | Optional: rate limit time window |
| `OPENAI_API_KEY` | `sk-...` | **Optional**: only if using AI assistant |
| `OPENAI_MODEL` | `gpt-4o-mini` | **Optional**: only if using AI assistant |

4. Click **Create Web Service**

#### 2.4: Get Your Backend URL
After deployment completes (~5-10 minutes):
- Render will give you a URL like: `https://timeflow-backend-abc123.onrender.com`
- **Copy this URL** — you'll need it for:
  - Updating `GOOGLE_REDIRECT_URI` (Step 6)
  - Updating `APP_BASE_URL` in frontend (Step 4)

#### 2.5: Update Environment Variables
Go back to **Environment** tab in Render and update:
- `GOOGLE_REDIRECT_URI`: `https://timeflow-backend-abc123.onrender.com/api/auth/google/callback`
- Save and redeploy (Render will auto-restart)

#### 2.6: Test the Backend
```bash
# Test health endpoint
curl https://timeflow-backend-abc123.onrender.com/health
```
Should return: `{"status":"ok"}`

---

### Step 3: Deploy Frontend to Vercel

**What**: Get your Next.js frontend live and connected to the Render backend.

**How**:

#### 3.1: Create Vercel Account & Import Project
1. Go to [vercel.com](https://vercel.com) and sign up (free)
2. Click **Add New...** → **Project**
3. **Import** your TimeFlow Git repository
4. Select the **web app** (`apps/web`)

#### 3.2: Configure Vercel Project
1. **Framework Preset**: Next.js (auto-detected)
2. **Root Directory**: `apps/web`
3. **Build Command**: `pnpm build` (or leave default)
4. **Output Directory**: `.next` (default)
5. **Install Command**: `pnpm install` (Vercel should auto-detect the monorepo)

#### 3.3: Add Environment Variables
Click **Environment Variables** and add:

| Key | Value | Notes |
|-----|-------|-------|
| `NEXT_PUBLIC_API_URL` | `https://timeflow-backend-abc123.onrender.com` | Your Render backend URL |
| `NEXT_PUBLIC_POSTHOG_KEY` | `phc_...` | **Optional**: PostHog analytics key |
| `NEXT_PUBLIC_POSTHOG_HOST` | `https://app.posthog.com` | **Optional**: only if using PostHog |

**⚠️ CRITICAL FIX NEEDED**: The `next.config.js` file currently rewrites `/api` to `localhost:3001`. We need to change this to use the production backend URL.

#### 3.4: Fix `next.config.js` for Production
Before deploying, update `timeflow/apps/web/next.config.js`:

**Current (broken in production)**:
```javascript
async rewrites() {
  return [
    {
      source: '/api/:path*',
      destination: 'http://localhost:3001/api/:path*',
    },
  ];
},
```

**Fixed (works in dev and production)**:
```javascript
async rewrites() {
  const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';
  return [
    {
      source: '/api/:path*',
      destination: `${apiUrl}/api/:path*`,
    },
  ];
},
```

Commit and push this change:
```bash
cd "C:\Users\theth\Desktop\Productivity Pro\timeflow"
git add apps/web/next.config.js
git commit -m "Fix API rewrites for production"
git push
```

#### 3.5: Deploy
1. Click **Deploy**
2. Wait ~3-5 minutes for build to complete
3. Vercel will give you a URL like: `https://timeflow-abc123.vercel.app`

#### 3.6: Update Backend CORS
Go back to **Render** → **Environment** and update:
- `APP_BASE_URL`: `https://timeflow-abc123.vercel.app`
- Save and redeploy

---

### Step 4: Configure Google OAuth for Production

**What**: Add production URLs to Google Cloud Console so OAuth login works.

**How**:
1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Navigate to **APIs & Services** → **Credentials**
3. Click on your **OAuth 2.0 Client ID**
4. Under **Authorized JavaScript origins**, add:
   - `https://timeflow-abc123.vercel.app` (your Vercel frontend URL)
5. Under **Authorized redirect URIs**, add:
   - `https://timeflow-backend-abc123.onrender.com/api/auth/google/callback` (your Render backend URL)
6. Click **Save**

**⚠️ Note**: It may take 5-10 minutes for Google to propagate these changes.

---

### Step 5: Test the Full Stack

**Checklist**:
- [ ] Visit your Vercel frontend URL
- [ ] Click "Sign in with Google"
- [ ] Complete OAuth flow
- [ ] Verify you land on the `/today` page
- [ ] Create a test task
- [ ] Verify calendar sync works
- [ ] Test AI assistant (if enabled)
- [ ] Check mobile responsiveness

**If OAuth fails**:
- Check browser console for CORS errors
- Verify `APP_BASE_URL` in Render matches your Vercel URL exactly
- Verify Google OAuth redirect URIs are correct
- Wait 10 minutes (Google changes take time to propagate)

---

## Environment Variables Master List

For your reference, here's every environment variable needed:

### Backend (Render)
```bash
NODE_ENV=production
PORT=4000
DATABASE_URL=postgresql://postgres:[PASSWORD]@[HOST]:5432/postgres
SESSION_SECRET=[YOUR-32-CHAR-SECRET-1]
ENCRYPTION_KEY=[YOUR-32-CHAR-SECRET-2]
GOOGLE_CLIENT_ID=[FROM-GOOGLE-CLOUD-CONSOLE]
GOOGLE_CLIENT_SECRET=[FROM-GOOGLE-CLOUD-CONSOLE]
GOOGLE_REDIRECT_URI=https://[YOUR-BACKEND].onrender.com/api/auth/google/callback
APP_BASE_URL=https://[YOUR-FRONTEND].vercel.app
RATE_LIMIT_MAX=100
RATE_LIMIT_WINDOW=1 minute

# Optional (AI Assistant)
OPENAI_API_KEY=sk-...
OPENAI_MODEL=gpt-4o-mini

# Optional (if using local LLM instead of OpenAI)
LLM_ENDPOINT=http://...
LLM_PROVIDER=ollama
LLM_MODEL=llama2
```

### Frontend (Vercel)
```bash
NEXT_PUBLIC_API_URL=https://[YOUR-BACKEND].onrender.com
NEXT_PUBLIC_POSTHOG_KEY=phc_... # Optional
NEXT_PUBLIC_POSTHOG_HOST=https://app.posthog.com # Optional
```

---

## Post-Deployment Monitoring

### Health Checks
- **Backend health**: `https://[YOUR-BACKEND].onrender.com/health`
- **Frontend**: Visit your Vercel URL and check console for errors

### Logs
- **Render**: Dashboard → Logs tab (real-time)
- **Vercel**: Dashboard → Deployments → Click deployment → Logs

### Performance
- **Render Free Tier**: Service sleeps after 15 min of inactivity (first request takes ~30s to wake)
- **Render Starter ($7/mo)**: Always on, no sleep

---

## Cost Breakdown (Beta with ~100 Users)

| Service | Plan | Monthly Cost | Notes |
|---------|------|--------------|-------|
| **Vercel** | Hobby (free) | $0 | Generous free tier |
| **Render** | Starter | $7 | Always-on backend |
| **Supabase** | Free | $0 | 500MB storage, 2GB transfer |
| **Domain** | (optional) | ~$1/mo | Can use default URLs for beta |
| **OpenAI** | Pay-as-you-go | $5–20/mo | Depends on AI assistant usage |
| **PostHog** | Free | $0 | 1M events/month free |
| **TOTAL** | | **~$7–30/mo** | Depends on AI usage |

**To minimize costs during beta**:
- Use Render Free tier (backend sleeps, but saves $7/mo)
- Limit AI assistant calls or use local LLM
- Skip domain until you're ready to launch publicly

---

## Rollback Plan

If something breaks in production:

### Quick Rollback (Render)
1. Go to Render Dashboard → **Deploys**
2. Find the last working deployment
3. Click **Redeploy** on that version

### Quick Rollback (Vercel)
1. Go to Vercel Dashboard → **Deployments**
2. Find the last working deployment
3. Click **Promote to Production**

### Database Rollback
**⚠️ CAUTION**: Database changes are harder to roll back.
- If you added a new migration that broke things, you may need to manually revert it
- Always test migrations on a staging database first (Supabase allows multiple projects)

---

## Common Issues & Fixes

### Issue: "Failed to fetch" errors in frontend
**Fix**: Check that `NEXT_PUBLIC_API_URL` in Vercel points to your Render backend URL (include `https://`).

### Issue: CORS errors in browser console
**Fix**: Check that `APP_BASE_URL` in Render matches your Vercel frontend URL exactly (no trailing slash).

### Issue: Google OAuth fails
**Fix**: 
1. Verify redirect URIs in Google Cloud Console match your Render backend URL
2. Wait 10 minutes for Google to propagate changes
3. Check `GOOGLE_REDIRECT_URI` env var in Render

### Issue: Backend crashes on startup
**Fix**:
1. Check Render logs for the error
2. Common causes:
   - Invalid `DATABASE_URL` (can't connect to Supabase)
   - Missing required env vars (`SESSION_SECRET`, `ENCRYPTION_KEY`)
   - Prisma client not generated (add `pnpm prisma:generate` to build command)

### Issue: Tasks/calendar not loading
**Fix**:
1. Check browser console for API errors
2. Check Render logs for backend errors
3. Verify database has data (connect via Prisma Studio)

---

## Next Steps After Deployment

1. **Test thoroughly** with a small group of friends/family
2. **Monitor logs** for the first 24 hours
3. **Set up alerts** (Render has built-in downtime alerts)
4. **Add a custom domain** (optional, see below)
5. **Plan for Sprint 14** (Calendar Dashboard Overhaul) once beta is stable

---

## Optional: Add a Custom Domain

### For Frontend (Vercel)
1. Buy a domain (Namecheap, Google Domains, etc.)
2. In Vercel Dashboard → **Settings** → **Domains**
3. Add your domain (e.g., `app.yourdomain.com`)
4. Follow Vercel's DNS instructions
5. Update `APP_BASE_URL` in Render to match your new domain

### For Backend (Render)
1. In Render Dashboard → **Settings** → **Custom Domain**
2. Add your subdomain (e.g., `api.yourdomain.com`)
3. Follow Render's DNS instructions
4. Update `NEXT_PUBLIC_API_URL` in Vercel to match your new domain
5. Update Google OAuth redirect URIs

---

## Security Checklist (Before Public Launch)

- [ ] All `.env` files are in `.gitignore` (not pushed to Git)
- [ ] Production secrets are different from dev secrets
- [ ] `APP_BASE_URL` is set (CORS is locked to your frontend only)
- [ ] Rate limiting is enabled (`RATE_LIMIT_MAX` is set)
- [ ] Google tokens are encrypted at rest (`ENCRYPTION_KEY` is set)
- [ ] JWT secret is strong and unique (`SESSION_SECRET`)
- [ ] Database backups are enabled (Supabase does this automatically)
- [ ] You've tested login/logout flows in production
- [ ] You've tested task creation, calendar sync, and AI assistant

---

## Questions to Confirm Before Deploying

Please provide these values so we can finalize the deployment:

1. **Supabase connection string**: `postgresql://postgres:[PASSWORD]@[HOST]:5432/postgres`
2. **Google OAuth Client ID**: `[YOUR-CLIENT-ID].apps.googleusercontent.com`
3. **Google OAuth Client Secret**: `[YOUR-CLIENT-SECRET]`
4. **Two new secrets for production**:
   - `SESSION_SECRET`: (generate with command in Prerequisites)
   - `ENCRYPTION_KEY`: (generate with command in Prerequisites)
5. **Optional: OpenAI API Key** (if using AI assistant in production)
6. **Optional: PostHog API Key** (if you want analytics)

Once you provide these, I can give you the exact copy-paste values for Render and Vercel environment variables.

---

**Last Updated**: 2025-12-24  
**Status**: Ready for deployment  
**Estimated Time**: 1-2 hours (first time)

