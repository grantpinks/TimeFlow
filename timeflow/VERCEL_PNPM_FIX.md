# Vercel Deployment Fix: pnpm ERR_INVALID_THIS Issue

**Date:** March 25, 2026  
**Status:** ✅ RESOLVED

---

## Problem Summary

Vercel deployment was failing consistently with `ERR_INVALID_THIS` errors during `pnpm install`:

```
ERR_PNPM_META_FETCH_FAIL  GET https://registry.npmjs.org/@babel%2Fcore: 
Value of "this" must be of type URLSearchParams
```

This affected all package installations and blocked deployment entirely.

---

## Root Cause

**pnpm has a fundamental incompatibility with Vercel's build infrastructure** at the Node.js polyfill level. The error occurs in pnpm's internal HTTP request handling when it tries to fetch package metadata from the npm registry.

**Attempted Solutions That Failed:**
1. ❌ Adding `.npmrc` with hoisting configurations
2. ❌ Pinning specific pnpm versions (8.15.0, 9.15.4)
3. ❌ Using corepack to manage pnpm versions
4. ❌ Modifying install flags (`--no-frozen-lockfile`, etc.)

**Why They Failed:** The issue is at the runtime level, not configuration. Vercel's Node.js environment has quirks that break pnpm's registry client.

---

## Solution: Switch to npm for Vercel (Keep pnpm Locally)

### Strategy
Use **npm** exclusively for Vercel deployment while keeping **pnpm** for local development. Both package managers support npm workspaces syntax.

### Implementation

#### 1. Root `package.json` Changes

**Before:**
```json
{
  "workspaces": ["apps/*", "packages/*"]
}
```

**After:**
```json
{
  "workspaces": [
    "apps/web",
    "packages/shared",
    "packages/scheduling"
  ],
  "scripts": {
    "build:packages": "cd packages/shared && npm run build && cd ../scheduling && npm run build",
    "build:web": "npm run build:packages && cd apps/web && npm run build"
  }
}
```

**Why:** Explicit workspace paths work better with npm, and sequential build scripts ensure proper dependency order.

#### 2. `apps/web/package.json` Changes

**Before:**
```json
{
  "dependencies": {
    "@timeflow/shared": "workspace:*"
  }
}
```

**After:**
```json
{
  "dependencies": {
    "@timeflow/shared": "*"
  }
}
```

**Why:** The `workspace:*` protocol is pnpm-specific. npm uses `*` for workspace dependencies.

#### 3. `vercel.json` Configuration

**Before:**
```json
{
  "installCommand": "pnpm install",
  "buildCommand": "cd apps/web && pnpm build"
}
```

**After:**
```json
{
  "$schema": "https://openapi.vercel.sh/vercel.json",
  "installCommand": "npm install --legacy-peer-deps",
  "buildCommand": "npm run build:web",
  "framework": "nextjs",
  "outputDirectory": "apps/web/.next"
}
```

**Why:** 
- `--legacy-peer-deps` handles peer dependency conflicts gracefully
- `build:web` script ensures packages build before the web app
- No pnpm usage at all

#### 4. Simplified `.npmrc`

**Before:**
```
strict-peer-dependencies=false
auto-install-peers=true
resolution-mode=highest
node-linker=hoisted
public-hoist-pattern[]=*
shamefully-hoist=true
```

**After:**
```
strict-peer-dependencies=false
auto-install-peers=true
shamefully-hoist=true
```

**Why:** Removed pnpm-specific settings that npm doesn't understand.

---

## How It Works

### Vercel Deployment Flow

1. **Clone Repository** - Vercel pulls latest code from GitHub
2. **Install Dependencies** - `npm install --legacy-peer-deps`
   - Installs all workspace packages (web, shared, scheduling)
   - npm automatically handles workspace linking
   - Generates `package-lock.json` in Vercel's environment
3. **Build Packages** - `npm run build:packages`
   - Compiles `packages/shared` TypeScript → `dist/`
   - Compiles `packages/scheduling` TypeScript → `dist/`
4. **Build Web App** - `cd apps/web && npm run build`
   - Next.js imports from compiled packages
   - Creates production bundle in `apps/web/.next`
5. **Deploy** - Vercel serves from `.next` directory

### Local Development (Unchanged)

Developers continue using pnpm locally:
```bash
pnpm install          # Use pnpm locally
pnpm dev:backend      # Backend server
pnpm dev:web          # Frontend server
```

**Why This Works:** pnpm and npm both understand npm workspace syntax in `package.json`. The only difference is the `workspace:*` protocol, which we changed to `*`.

---

## Results

✅ **Deployment Status:** Successful  
✅ **Build Time:** Normal (2-3 minutes)  
✅ **No Registry Errors:** npm has no URLSearchParams issues  
✅ **Workspace Linking:** Works perfectly with npm workspaces  
✅ **Local Dev:** Unchanged, still using pnpm  

---

## Key Takeaways

1. **pnpm is not universally compatible** with all deployment platforms due to internal implementation differences
2. **npm workspaces are more portable** and work reliably across platforms
3. **You can use different package managers** for local vs. deployment without breaking functionality
4. **Explicit workspace paths** are more reliable than glob patterns for deployment

---

## Files Changed

- ✏️ `package.json` - Explicit workspaces + build scripts
- ✏️ `apps/web/package.json` - Changed `workspace:*` to `*`
- ✏️ `vercel.json` - Switched to npm commands
- ✏️ `.npmrc` - Simplified for npm compatibility

**Commits:**
- `99cdc3b` - Switch Vercel deployment from pnpm to npm
- `b72308c` - Fix Vercel deployment with stable pnpm version (failed)
- `bb2375a` - Fix Vercel pnpm deployment issues (failed)

---

## Future Considerations

- **Backend (Render):** Still uses pnpm successfully, no changes needed
- **Package-lock.json:** Not committed to repo, generated by Vercel during build
- **Mobile App:** If deploying, follow same npm approach
- **CI/CD:** Any automated builds should use npm for reliability

---

**Last Updated:** March 25, 2026  
**Verified By:** Successful production deployment to time-flow.app
