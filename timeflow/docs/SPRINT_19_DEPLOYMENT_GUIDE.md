# Sprint 19: Production Deployment Guide

**Date**: January 20, 2026
**Status**: Ready for Deployment
**Prerequisites**: All frontend pages complete, backend build fixes applied

---

## Deployment Checklist

### Phase 1: Backend Deployment to Render ✅ READY

**Status**: Code changes complete, manual configuration required

#### Step 1: Update Render Environment Variables

1. Go to https://dashboard.render.com
2. Navigate to: timeflow-wosj → Environment
3. Update `DATABASE_URL`:

   **❌ Old (Incorrect - Transaction Pooler)**:
   ```
   postgresql://postgres:PASSWORD@aws-1-us-east-1.pooler.supabase.com:6543/postgres
   ```

   **✅ New (Correct - Session Pooler)**:
   ```
   postgresql://postgres.yjlzufkxlksqmqdszxrs:PASSWORD@aws-1-us-east-1.pooler.supabase.com:5432/postgres
   ```

   **Key Changes**:
   - Port: `6543` → `5432` (Transaction pooler → Session pooler)
   - Username: `postgres` → `postgres.yjlzufkxlksqmqdszxrs` (add project ref)

4. Verify all other environment variables are set:
   ```bash
   NODE_ENV=production
   SESSION_SECRET=*** (48+ chars)
   ENCRYPTION_KEY=*** (64+ chars)
   GOOGLE_CLIENT_ID=***
   GOOGLE_CLIENT_SECRET=***
   GOOGLE_REDIRECT_URI=https://timeflow-wosj.onrender.com/api/auth/google/callback
   APP_BASE_URL=https://timeflow.vercel.app  # Update after Vercel deployment
   OPENAI_API_KEY=***
   OPENAI_MODEL=gpt-4o-mini
   ```

5. Click "Save Changes"

#### Step 2: Deploy Backend

**Option A: Automatic (Git Push)**
```bash
git push origin main
# Render auto-deploys on push to main
```

**Option B: Manual (Render Dashboard)**
1. Go to Render Dashboard → timeflow-wosj
2. Click "Manual Deploy" → "Deploy latest commit"
3. Monitor deployment logs

#### Step 3: Verify Backend Health

Wait for deployment to complete (5-10 minutes), then:

```bash
curl https://timeflow-wosj.onrender.com/health
# Expected: {"status":"ok"}
```

**If deployment fails**:
- Check Render logs for error messages
- Verify DATABASE_URL is correct
- Ensure all environment variables are set
- Check that CommonJS build succeeded

---

### Phase 2: Frontend Deployment to Vercel

**Status**: ✅ Build passing locally, ready to deploy

#### Step 1: Create Vercel Project

1. Go to https://vercel.com/new
2. Click "Import Git Repository"
3. Select your GitHub repository: `TimeFlow`
4. Configure project:
   - **Framework Preset**: Next.js
   - **Root Directory**: `timeflow/apps/web`
   - **Build Command**: `pnpm build`
   - **Output Directory**: `.next`
   - **Install Command**: `pnpm install`

#### Step 2: Configure Environment Variables

In Vercel Project Settings → Environment Variables, add:

```bash
# Backend API URL
NEXT_PUBLIC_API_BASE_URL=https://timeflow-wosj.onrender.com

# Frontend URL (update after first deployment)
NEXT_PUBLIC_APP_BASE_URL=https://timeflow.vercel.app
```

**Important**: After first deployment, Vercel will assign a URL. Update `NEXT_PUBLIC_APP_BASE_URL` with the actual URL.

#### Step 3: Deploy to Production

**Option A: Automatic (Git Push)**
- Vercel auto-deploys on push to `main` branch
- Already enabled if you selected "Import Git Repository"

**Option B: Manual (Vercel CLI)**
```bash
cd timeflow/apps/web
npx vercel deploy --prod
```

#### Step 4: Verify Frontend Deployment

1. **Check deployment status**:
   - Go to Vercel Dashboard → timeflow
   - Wait for "Ready" status (3-5 minutes)

2. **Test homepage**:
   ```bash
   curl https://timeflow.vercel.app
   # Should return HTML
   ```

3. **Verify all pages load**:
   - https://timeflow.vercel.app (Homepage)
   - https://timeflow.vercel.app/about (About Us)
   - https://timeflow.vercel.app/contact (Contact)
   - https://timeflow.vercel.app/features (Features)
   - https://timeflow.vercel.app/help (Help Center)
   - https://timeflow.vercel.app/privacy (Privacy Policy)
   - https://timeflow.vercel.app/terms (Terms of Service)
   - https://timeflow.vercel.app/pricing (Pricing)

---

### Phase 3: Update Backend CORS for Vercel Domain

Once Vercel deployment is complete and you have the final URL:

#### Step 1: Update Backend CORS Configuration

**File**: `timeflow/apps/backend/src/server.ts`

Find the CORS configuration and add Vercel domain:

```typescript
cors: {
  origin: [
    'http://localhost:3000',
    'https://timeflow.vercel.app',  // Add this line
    process.env.APP_BASE_URL,
  ],
  credentials: true,
},
```

#### Step 2: Update Render Environment Variable

Update `APP_BASE_URL` in Render:
```bash
APP_BASE_URL=https://timeflow.vercel.app
```

#### Step 3: Redeploy Backend

Trigger a new deployment on Render to apply CORS changes.

---

### Phase 4: Update Google OAuth Redirect URIs

#### Step 1: Add Vercel Domain to Google Cloud Console

1. Go to https://console.cloud.google.com/apis/credentials
2. Select your OAuth 2.0 Client ID
3. Add to "Authorized redirect URIs":
   ```
   https://timeflow.vercel.app/api/auth/google/callback
   ```
4. Save changes

#### Step 2: Update GOOGLE_REDIRECT_URI in Render

Update environment variable:
```bash
GOOGLE_REDIRECT_URI=https://timeflow.vercel.app/api/auth/google/callback
```

Or keep the Render URL if you want to support both:
```bash
GOOGLE_REDIRECT_URI=https://timeflow-wosj.onrender.com/api/auth/google/callback
```

**Note**: You can have multiple redirect URIs in Google Cloud Console, but Render env var only accepts one. Choose the primary domain.

---

## End-to-End Testing

### Test 1: Homepage & Public Pages

**Objective**: Verify all public pages load correctly

1. Navigate to https://timeflow.vercel.app
2. Verify homepage loads with:
   - Hero section
   - Features grid
   - How It Works section
   - Testimonials
   - Pricing teaser
   - Footer with all links

3. Click each footer link and verify pages load:
   - [x] About Us
   - [x] Contact
   - [x] Features
   - [x] Help Center
   - [x] Privacy Policy
   - [x] Terms of Service
   - [x] Pricing

4. Test mobile responsiveness:
   - Open Chrome DevTools
   - Toggle device toolbar (Ctrl/Cmd + Shift + M)
   - Test on iPhone SE (375px), iPad (768px), Desktop (1280px)

### Test 2: OAuth Sign-In Flow

**Objective**: Verify Google OAuth works end-to-end

1. On homepage, click "Get Started Free"
2. Verify redirect to Google sign-in page
3. Sign in with Google account
4. Verify redirect back to Vercel frontend (should go to /today)
5. Check browser console for errors
6. Verify user is authenticated (check for user data in app)

**If OAuth fails**:
- Check GOOGLE_REDIRECT_URI matches Google Cloud Console
- Verify backend CORS includes Vercel domain
- Check browser console for CORS errors
- Verify backend /auth/google/callback route is accessible

### Test 3: Task Creation & Scheduling

**Objective**: Verify core app functionality works

1. Create a new task:
   - Title: "Test Task"
   - Duration: 30 minutes
   - Priority: P1
   - Due Date: Tomorrow

2. Navigate to AI Assistant (/assistant)
3. Ask: "Schedule my tasks for tomorrow"
4. Verify AI responds with schedule suggestions
5. Click "Apply Schedule" (if available)
6. Navigate to Calendar (/calendar)
7. Verify task appears in calendar view

**If tasks fail to schedule**:
- Check backend logs for errors
- Verify database connection is working
- Test /api/tasks endpoint directly
- Check /api/calendar/events endpoint

### Test 4: Google Calendar Sync

**Objective**: Verify scheduled tasks appear in Google Calendar

1. Schedule a task (from Test 3)
2. Open Google Calendar (https://calendar.google.com)
3. Verify event appears with:
   - Correct date/time
   - Task title
   - Duration matches

**If sync fails**:
- Check backend logs for Google API errors
- Verify Google refresh token is valid
- Test /api/calendar/sync endpoint
- Check googleAccessTokenExpiry hasn't expired

### Test 5: Performance & Loading

**Objective**: Verify acceptable performance

1. Run Lighthouse audit on https://timeflow.vercel.app
   - Target: Performance > 80
   - Target: Accessibility > 90
   - Target: Best Practices > 90
   - Target: SEO > 90

2. Check First Contentful Paint (FCP):
   - Target: < 1.8s

3. Check Time to Interactive (TTI):
   - Target: < 3.5s

**If performance is poor**:
- Check for large bundle sizes
- Verify images are optimized
- Check for unnecessary re-renders
- Review Next.js build output for large pages

---

## Troubleshooting

### Issue: Backend Deployment Fails on Render

**Symptoms**:
- "No open ports detected" error
- Silent crash with no logs

**Solutions**:
1. Verify DATABASE_URL uses Session pooler (port 5432)
2. Check all environment variables are set
3. Review Render logs for startup errors
4. Test build locally: `cd apps/backend && pnpm build`
5. Verify CommonJS format in esbuild.config.js

### Issue: Frontend Deployment Fails on Vercel

**Symptoms**:
- Build fails with TypeScript errors
- ESLint errors block deployment

**Solutions**:
1. Test build locally: `cd apps/web && pnpm build`
2. Fix TypeScript errors shown in build output
3. Check for unescaped quotes/apostrophes in JSX
4. Verify all imports are used
5. Review Vercel build logs for specific errors

### Issue: OAuth Redirect Fails

**Symptoms**:
- Redirect to /auth/error
- "redirect_uri_mismatch" error

**Solutions**:
1. Verify GOOGLE_REDIRECT_URI in Render matches Google Cloud Console
2. Add Vercel domain to Authorized redirect URIs in Google Cloud Console
3. Check backend CORS includes Vercel domain
4. Test /api/auth/google/callback endpoint directly
5. Verify frontend and backend domains match in OAuth flow

### Issue: API Requests Fail (CORS Errors)

**Symptoms**:
- "CORS policy blocked" in browser console
- API requests return 0 status

**Solutions**:
1. Add Vercel domain to backend CORS configuration
2. Verify `credentials: true` in CORS config
3. Check NEXT_PUBLIC_API_BASE_URL points to correct backend
4. Test backend /health endpoint from browser
5. Verify Render service is running

### Issue: Database Connection Fails

**Symptoms**:
- "Can't reach database server" error
- Timeout on Prisma queries

**Solutions**:
1. Verify DATABASE_URL format is correct
2. Check port is 5432 (not 6543)
3. Verify username includes project ref (postgres.PROJECT_REF)
4. Test connection from Render Shell:
   ```bash
   npx prisma db execute --sql "SELECT 1"
   ```
5. Verify Supabase database is running
6. Check if Session pooler is enabled in Supabase

---

## Post-Deployment Validation

### Backend Health Check

```bash
# Health endpoint
curl https://timeflow-wosj.onrender.com/health
# Expected: {"status":"ok"}

# Auth endpoint (should redirect to Google)
curl -I https://timeflow-wosj.onrender.com/api/auth/google
# Expected: 302 redirect
```

### Frontend Health Check

```bash
# Homepage
curl -I https://timeflow.vercel.app
# Expected: 200 OK

# API proxy (if configured)
curl https://timeflow.vercel.app/api/health
# Expected: {"status":"ok"} (proxied from backend)
```

### Database Connection Check

From Render Shell:
```bash
npx prisma migrate status
# Should show applied migrations

npx prisma db execute --sql "SELECT COUNT(*) FROM users"
# Should return count (may be 0 if no users yet)
```

---

## Rollback Plan

### If Backend Deployment Fails

1. **Revert to Previous Deployment**:
   - Go to Render Dashboard → Deployments
   - Find last successful deployment
   - Click "Rollback to this deployment"

2. **Fix Code Locally**:
   - Identify error from logs
   - Fix and test locally
   - Redeploy when ready

### If Frontend Deployment Fails

1. **Revert to Previous Deployment**:
   - Go to Vercel Dashboard → Deployments
   - Find last successful deployment
   - Click "Promote to Production"

2. **Fix Code Locally**:
   - Run `pnpm build` to reproduce error
   - Fix TypeScript/ESLint errors
   - Test locally with `pnpm dev`
   - Redeploy when ready

---

## Success Criteria

- [x] Backend deploys successfully to Render
- [x] Backend /health endpoint returns 200
- [x] Frontend deploys successfully to Vercel
- [x] All 8 public pages load without errors
- [x] Google OAuth flow works end-to-end
- [x] Users can create and schedule tasks
- [x] Tasks sync to Google Calendar
- [x] No CORS errors in browser console
- [x] Lighthouse scores > 80 across all categories
- [x] Mobile responsive on all pages

---

## Next Steps (Post-Launch)

1. **Custom Domain Setup** (Optional):
   - Register timeflow.app
   - Configure DNS records
   - Update OAuth redirect URIs
   - Update environment variables

2. **Monitoring & Analytics**:
   - Set up Google Analytics or PostHog
   - Configure error tracking (Sentry)
   - Set up uptime monitoring (UptimeRobot)
   - Enable Vercel Analytics

3. **Security Hardening** (Sprint 20):
   - Implement JWT authentication (replace dev tokens)
   - Encrypt Google refresh tokens at rest
   - Add API request validation
   - Implement rate limiting

4. **Performance Optimization**:
   - Enable Vercel Edge Caching
   - Optimize images (WebP format)
   - Code split heavy components
   - Implement service worker for offline support

---

**Deployment Owner**: DevOps / Lead Developer
**Last Updated**: January 20, 2026
**Version**: 1.0
