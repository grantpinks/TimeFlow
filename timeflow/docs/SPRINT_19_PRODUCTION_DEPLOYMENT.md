# Sprint 19: Production Deployment Task

**Status**: 🔴 BLOCKED - Needs Investigation
**Priority**: P0 (Required for public launch)
**Estimated Effort**: 8-12 hours (troubleshooting + implementation)
**Last Attempted**: 2025-12-25
**Assigned To**: TBD (Sprint 19)

---

## Problem Summary

The TimeFlow backend cannot successfully deploy to Render (production hosting platform). The application builds successfully but fails to start, resulting in:

```
==> No open ports detected, continuing to scan...
==> Port scan timeout reached, no open ports detected.
```

**Root Cause**: The Node.js application crashes silently during startup before it can bind to a port, producing zero log output despite extensive logging added to `src/index.ts`.

---

## Environment Configuration

### Current Render Setup

**Service**: https://timeflow-wosj.onrender.com
**Type**: Web Service
**Build Command**: `pnpm install && pnpm prisma generate && pnpm build`
**Start Command**: `npx prisma migrate deploy && bash start.sh`

### Environment Variables (Confirmed Set)

```bash
NODE_ENV=production
DATABASE_URL=postgresql://postgres.***:***@aws-1-us-east-1.pooler.supabase.com:6543/postgres
SESSION_SECRET=*** (48 character secret)
ENCRYPTION_KEY=*** (64 character secret)
GOOGLE_CLIENT_ID=*** (Google OAuth Client ID)
GOOGLE_CLIENT_SECRET=*** (Google OAuth Client Secret)
GOOGLE_REDIRECT_URI=https://timeflow-wosj.onrender.com/api/auth/google/callback
APP_BASE_URL=http://localhost:3000
OPENAI_API_KEY=*** (OpenAI API Key)
OPENAI_MODEL=gpt-4o-mini
```

**Note**: All secrets are properly configured in Render environment variables (not committed to git).

**Note**: PORT is NOT set (intentionally removed to let Render auto-assign)

**⚠️ CRITICAL DATABASE ISSUE (Discovered 2025-12-26)**:
The DATABASE_URL above is **INCORRECT** for persistent server applications like Fastify. It uses:
- **Transaction pooler** (port 6543) - only for serverless/short-lived connections
- **Wrong username format** - Missing project reference prefix

**Correct format for Render deployment:**
```bash
DATABASE_URL=postgresql://postgres.yjlzufkxlksqmqdszxrs:PASSWORD@aws-1-us-east-1.pooler.supabase.com:5432/postgres
```
Key changes:
- Use **Session pooler** port `5432` (not Transaction pooler port `6543`)
- Username must include project ref: `postgres.PROJECT_REF` (not just `postgres`)
- This is required for IPv4 networks and persistent connections

---

## Troubleshooting History

### Attempts Made (2025-12-25)

#### 1. TypeScript Build Errors ✅ FIXED
- **Issue**: Multiple TypeScript type errors in production build
- **Fix**:
  - Fixed JWT verification to use `request.server.jwt.verify()`
  - Added type assertions for Zod validation outputs
  - Cast Prisma JsonValue to DailyScheduleConfig types
  - Fixed ApplyScheduleBlock union type in Zod schema
- **Commit**: `ff2fed2` - "Fix TypeScript build errors for production deployment"
- **Result**: Build now succeeds with zero TypeScript errors

#### 2. Environment Variable Validation ✅ FIXED
- **Issue**: Better error logging needed to identify missing env vars
- **Fix**: Added detailed logging in `src/config/env.ts` showing which vars are set/missing
- **Commit**: `37e5624` - "Add detailed environment variable validation logging"
- **Result**: Can now see exactly which environment variables are configured

#### 3. ESBuild Configuration - Iteration 1 ❌ FAILED
- **Issue**: `module: "ESNext"` + path aliases not resolved at runtime
- **Fix Attempted**:
  - Set `rootDir: "src"` in tsconfig
  - Added explicit path aliases to backend tsconfig
  - Used `--packages=external` to keep dependencies external
- **Commit**: `49e4601` - "Fix Render deployment: Use esbuild to bundle backend"
- **Result**: Bundle created (158kb) but app still crashed silently

#### 4. ESBuild Configuration - Iteration 2 ❌ FAILED
- **Issue**: Monorepo workspace packages (@timeflow/shared, @timeflow/scheduling) not found at runtime
- **Fix Attempted**:
  - Bundle ALL dependencies except Prisma
  - Remove `--packages=external` flag
  - Only externalize `@prisma/client` (has native binaries)
  - Add `createRequire` banner for compatibility
- **Commit**: `e10af81` - "Bundle all dependencies except Prisma"
- **Result**: Bundle grew to 26.9MB but app STILL crashes silently with zero output

#### 5. Diagnostic Logging ⏳ IN PROGRESS
- **Issue**: Node process produces zero output - can't see what's crashing
- **Fix Attempted**:
  - Added extensive console.log in `src/index.ts` startup
  - Created `start.sh` wrapper script with pre-flight checks
  - Script logs: working dir, env vars, file existence, Node version
- **Commit**: `fb21b0f` - "Add diagnostic startup script"
- **Result**: TBD (deployment abandoned before completion)

### Attempts Made (2025-12-26)

#### 6. Database Connection Configuration ✅ IDENTIFIED (Not Yet Applied to Render)
- **Issue**: Discovered incorrect DATABASE_URL configuration during local development OAuth testing
- **Problem**: Using Transaction pooler (port 6543) instead of Session pooler (port 5432)
- **Symptoms**:
  - Prisma commands timeout indefinitely
  - Runtime error: `Can't reach database server at db.yjlzufkxlksqmqdszxrs.supabase.co:5432`
  - OAuth callback fails with `PrismaClientInitializationError`
- **Root Cause**:
  - Supabase has two pooler types: **Transaction** (port 6543) vs **Session** (port 5432)
  - Transaction pooler is for serverless/short-lived connections (Lambda, Edge Functions)
  - Session pooler is for persistent server applications (Fastify, Express)
  - IPv4 networks (like Render) require Session pooler
  - Username format must include project ref: `postgres.PROJECT_REF` not `postgres`
- **Fix Applied Locally**:
  ```bash
  # Wrong (current Render config):
  postgresql://postgres:PASSWORD@aws-1-us-east-1.pooler.supabase.com:6543/postgres

  # Correct (verified working locally):
  postgresql://postgres.yjlzufkxlksqmqdszxrs:PASSWORD@aws-1-us-east-1.pooler.supabase.com:5432/postgres
  ```
- **Result**: ✅ Local OAuth flow now works, database queries successful
- **Action Required**: Update DATABASE_URL in Render environment variables (pending Sprint 19)

---

## Technical Details

### Build Output (Successful)

```
==> Running build command 'pnpm install && pnpm prisma generate && pnpm build'...
✔ Generated Prisma Client (v5.22.0)
> esbuild src/index.ts --bundle --platform=node --target=node20 --format=esm
  dist/index.js  26.9mb
✅ Backend bundled successfully
==> Build successful 🎉
```

### Runtime Failure Pattern

```
==> Running 'npx prisma migrate deploy && node dist/index.js'
Prisma schema loaded from prisma/schema.prisma
Datasource "db": PostgreSQL database "postgres", schema "public"
==> No open ports detected, continuing to scan...
[Repeats for ~5 minutes until timeout]
```

**Critical Observation**: ZERO output from Node.js process. None of the console.log statements in `src/index.ts` appear, suggesting the process crashes during module initialization before any code executes.

### Code Structure

**Entry Point**: `apps/backend/src/index.ts`
```typescript
// Log startup immediately - this runs BEFORE imports in ESM
console.log('🚀 TimeFlow backend starting...');
// ... more logging ...

import { buildServer } from './server.js';
import { env } from './config/env.js';

// More logging that never appears in Render logs
```

**Server Setup**: Binds to `0.0.0.0` with `env.PORT`
```typescript
await server.listen({ port: env.PORT, host: '0.0.0.0' });
```

---

## Hypotheses for Root Cause

### 1. ESM Import Resolution Issue (Most Likely for Startup Crash)
- The bundled ESM format may have incompatibilities with Render's Node.js environment
- Dynamic imports or module resolution might fail silently
- **Test**: Try switching to CommonJS (`format: 'cjs'`) in esbuild config

### 2. Database Connection Misconfiguration ✅ CONFIRMED (Secondary Issue)
- **Status**: Identified and documented, not yet applied to Render
- Using Transaction pooler (port 6543) instead of Session pooler (port 5432)
- Wrong username format (missing project reference prefix)
- **Impact**: Even if startup succeeds, first database query will fail
- **Fix**: Update DATABASE_URL to use Session pooler with correct username format
- See "Attempts Made (2025-12-26) #6" for full details

### 3. Missing System Dependencies
- Render might be missing a native dependency required by bundled packages
- **Test**: Check if googleapis or other packages need system libs

### 4. Memory/Resource Limits
- 26.9MB bundle might exceed Render free tier limits during initialization
- **Test**: Try Render Starter ($7/mo) tier with more resources

### 5. Prisma Client Issue
- Even though @prisma/client is externalized, the bundle might reference it incorrectly
- **Test**: Verify Prisma client is generated and accessible at runtime

### 6. Stdout/Stderr Buffering
- Logs might be buffered and not flushing before crash
- **Test**: Add `--force-exit` or explicit stdout flushes

---

## Recommended Next Steps (Sprint 19)

### Phase 1: Diagnostic Deep Dive (2-3 hours)

1. **Fix Database Connection (Critical - Do This First!)**
   - Update Render environment variable `DATABASE_URL` to:
     ```
     postgresql://postgres.yjlzufkxlksqmqdszxrs:PASSWORD@aws-1-us-east-1.pooler.supabase.com:5432/postgres
     ```
   - Key changes: Session pooler (port 5432), proper username format
   - This won't fix the startup crash, but prevents secondary database errors

2. **Enable Render Shell Access**
   - Use Render Dashboard → Shell tab
   - Manually run: `cd /opt/render/project/src/timeflow/apps/backend && node dist/index.js`
   - Capture the ACTUAL error message that's being hidden

3. **Test ESM → CJS Conversion**
   ```javascript
   // esbuild.config.js
   format: 'cjs',  // Change from 'esm'
   ```
   - CommonJS has better compatibility
   - Might resolve module loading issues

4. **Add Explicit Error Handlers**
   ```javascript
   process.on('uncaughtException', (err) => {
     console.error('UNCAUGHT EXCEPTION:', err);
     process.exit(1);
   });
   process.on('unhandledRejection', (reason) => {
     console.error('UNHANDLED REJECTION:', reason);
     process.exit(1);
   });
   ```

### Phase 2: Alternative Deployment Strategies (4-6 hours)

#### Option A: Railway (Alternative to Render)
- **Pros**: Better monorepo support, similar pricing, better logging
- **Cons**: Need to migrate configuration
- **Effort**: 2-3 hours

#### Option B: Docker Container
- **Pros**: Complete control over runtime environment, works on any platform
- **Cons**: More complex setup, larger deploy size
- **Effort**: 4-6 hours
- **Steps**:
  1. Create `Dockerfile` that bundles everything
  2. Test locally with Docker
  3. Deploy to Render as container service

#### Option C: Vercel Serverless Functions
- **Pros**: Native Next.js integration, excellent DX
- **Cons**: Need to convert Fastify to serverless-compatible handlers
- **Effort**: 6-8 hours
- **Not Recommended**: Major architecture change

#### Option D: AWS Elastic Beanstalk
- **Pros**: Enterprise-grade, great for monorepos
- **Cons**: More expensive, steeper learning curve
- **Effort**: 8-12 hours

### Phase 3: Production Readiness (2-4 hours)

Once deployment works:

1. **Update Frontend URLs**
   - Deploy Next.js frontend to Vercel
   - Update `APP_BASE_URL` in Render to Vercel URL
   - Test CORS and OAuth flows end-to-end

2. **Configure Custom Domain** (Optional)
   - Set up `api.timeflow.app` or similar
   - Update Google OAuth redirect URIs
   - Configure SSL/TLS

3. **Health Monitoring**
   - Set up Render health checks
   - Configure uptime monitoring (UptimeRobot, etc.)
   - Add error tracking (Sentry, LogRocket)

---

## Success Criteria

- [ ] Backend deploys successfully to Render (or alternative platform)
- [ ] `/health` endpoint returns `{"status":"ok"}`
- [ ] Startup logs appear in deployment logs
- [ ] OAuth flow works end-to-end
- [ ] Frontend can communicate with deployed backend
- [ ] Database migrations run successfully
- [ ] All environment variables properly configured

---

## Resources

### Documentation
- [Render Web Services Port Binding](https://render.com/docs/web-services#port-binding)
- [ESBuild Bundling Guide](https://esbuild.github.io/api/#bundle)
- [Node.js ESM Modules](https://nodejs.org/api/esm.html)
- [Supabase Connection Pooling](https://supabase.com/docs/guides/database/connecting-to-postgres#connection-pooler)
  - Transaction pooler (port 6543) vs Session pooler (port 5432)
  - IPv4 compatibility requirements

### Related Files
- `apps/backend/esbuild.config.js` - Build configuration
- `apps/backend/start.sh` - Diagnostic startup script
- `apps/backend/src/index.ts` - Application entry point
- `docs/PRODUCTION_DEPLOYMENT_GUIDE.md` - Original deployment guide

### Deployment Logs
- `docs/Deployment Logs.md` - Historical deployment attempts and errors

---

**Last Updated**: 2025-12-26
**Next Review**: Sprint 19 Planning

**Recent Updates**:
- 2025-12-26: Identified database connection misconfiguration (Transaction vs Session pooler)
- 2025-12-25: Initial troubleshooting attempts, documented ESM bundling issues
