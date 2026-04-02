# Deployment Configuration: Vercel + Render (pnpm monorepo)

**Last Verified:** April 1, 2026 — commit `f7d2370`  
**Status:** ✅ BOTH PLATFORMS WORKING

---

## The Core Problem

This is a **pnpm monorepo** that deploys to two platforms with different package managers:

| Platform | Package Manager | Workspace syntax |
|---|---|---|
| Render (backend) | pnpm | `workspace:*` ✅ |
| Vercel (frontend) | npm | `workspace:*` ❌ crashes |

`workspace:*` is pnpm-specific. When npm encounters it, it throws:
```
npm error code EUNSUPPORTEDPROTOCOL
npm error Unsupported URL Type "workspace:": workspace:*
```

If you change `workspace:*` to plain `*` for npm compatibility, pnpm then tries to fetch the package from the npm registry and fails with:
```
ERR_PNPM_FETCH_404  GET https://registry.npmjs.org/@timeflow%2Fshared: Not Found - 404
```

You cannot satisfy both with a single version specifier in `package.json`.

---

## The Solution (DO NOT CHANGE THIS)

**Keep `workspace:*` in `apps/web/package.json`.** Let Vercel patch it on-the-fly.

### `vercel.json`
```json
{
  "$schema": "https://openapi.vercel.sh/vercel.json",
  "installCommand": "sed -i 's/workspace:\\*/*/g' apps/web/package.json && npm install --legacy-peer-deps",
  "buildCommand": "npm run build:web",
  "framework": "nextjs",
  "outputDirectory": "apps/web/.next"
}
```

The `sed` command runs inside Vercel's **ephemeral build environment** — it rewrites `workspace:*` → `*` on disk only for that build. The committed code is never touched.

### `apps/web/package.json` (keep as-is)
```json
"@timeflow/shared": "workspace:*"
```

### Root `package.json` workspaces (keep `apps/backend` EXCLUDED)
```json
"workspaces": [
  "apps/web",
  "packages/shared",
  "packages/scheduling"
]
```
`apps/backend` is excluded because its `package.json` also contains `workspace:*` references (`@timeflow/scheduling`, `@timeflow/shared`). If it were included, npm would read it and crash. Render uses `pnpm-workspace.yaml` to find the backend — not this field — so excluding it here has zero impact on Render or local dev.

### `.npmrc`
```
strict-peer-dependencies=false
auto-install-peers=true
shamefully-hoist=true
prefer-workspace-packages=true
```

---

## How Each Platform Works

### Vercel (Frontend)
1. Clones repo (has `workspace:*` in apps/web/package.json)
2. `installCommand` runs `sed` → patches `workspace:*` to `*` in the ephemeral env
3. `npm install --legacy-peer-deps` from root → npm workspaces resolves `@timeflow/shared` locally
4. `npm run build:web` → builds `packages/shared` → `packages/scheduling` → `apps/web`
5. Serves from `apps/web/.next`

### Render (Backend)
1. Clones repo (has `workspace:*` in all packages — untouched)
2. `pnpm install` → pnpm natively resolves all `workspace:*` from local packages
3. `cd apps/backend && pnpm prisma generate && pnpm build`
4. `start.sh` runs `npx prisma migrate deploy` then starts the server

### Local Development (unchanged)
```bash
pnpm install     # pnpm handles workspace:* natively
pnpm dev:web     # frontend
pnpm dev:backend # backend
```

---

## What Was Tried and Failed

| Attempt | Why It Failed |
|---|---|
| Change `workspace:*` → `*` in apps/web/package.json | pnpm tries to fetch `@timeflow/shared` from npm registry → 404 |
| Add `prefer-workspace-packages=true` to .npmrc (with `*`) | pnpm-lock.yaml mismatch caused pnpm to re-resolve from registry anyway |
| `npm install -g pnpm && pnpm install` in Vercel installCommand | pnpm has `ERR_INVALID_THIS` incompatibility with Vercel's Node.js build environment |
| Using corepack to pin pnpm version on Vercel | Same ERR_INVALID_THIS issue, different pnpm versions |
| Removing installCommand (letting Vercel auto-detect pnpm) | Vercel auto-detects pnpm but still hits the same ERR_INVALID_THIS error |
| Manually running `npm install` in each subdir | `npm install` in apps/web sees `workspace:*` and crashes |

---

## Key Files

| File | Purpose |
|---|---|
| `vercel.json` | Vercel build config — contains the `sed` patch + `npm run build:web` |
| `package.json` (root) | npm workspaces (excludes apps/backend) |
| `pnpm-workspace.yaml` | pnpm workspaces (includes everything, used by Render + local) |
| `.npmrc` | Shared package manager config |
| `apps/backend/start.sh` | Runs `npx prisma migrate deploy` before starting server on Render |

---

## If Something Breaks

**Vercel fails with `workspace:*`:**
- Check `vercel.json` → `installCommand` must start with the `sed` command
- Check `apps/web/package.json` → `@timeflow/shared` must be `workspace:*`

**Render fails with 404 on `@timeflow/shared`:**
- Check `apps/web/package.json` → must be `workspace:*` (NOT `*`)
- Check `pnpm-workspace.yaml` → must include `packages/*`

**Render fails with `workspace:*` in backend:**
- This would only happen if `apps/backend` was added back to root `package.json` workspaces AND npm was being used
- `apps/backend` must stay OUT of root `package.json` workspaces

**New package added to apps/web that is a local workspace:**
- Add it as `workspace:*` in `apps/web/package.json`
- The `sed` command in vercel.json patches ALL `workspace:*` occurrences — no extra config needed
