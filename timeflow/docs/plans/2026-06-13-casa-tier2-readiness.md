# CASA Tier 2 Readiness Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Prepare TimeFlow to pass Google-required CASA Tier 2 security assessment by Sep 2, 2026, starting with httpOnly cookie-based sessions (Option A) and remediating all high-risk ASVS gaps.

**Architecture:** Backend (Render/Fastify) owns session cookies set on OAuth callback at `api.time-flow.app` with `Domain=.time-flow.app`. Web (Vercel/Next.js) proxies `/api/*` to the backend; all browser fetches use `credentials: 'include'`. Mobile keeps Bearer tokens via `Authorization` header (out of CASA web scope). Google OAuth tokens encrypted at rest; OAuth state HMAC-signed.

**Tech Stack:** Fastify 5, `@fastify/cookie`, `@fastify/jwt`, Next.js 14, Prisma/Supabase Postgres, Vitest

**Deadline:** CASA LOV due **2026-09-02** (engage lab by **2026-07-15**)

---

## Timeline Overview

| Phase | Dates (target) | Focus |
|-------|----------------|-------|
| 1 — Cookie sessions | Jun 13 – Jun 27 | httpOnly JWT cookies, remove localStorage/URL tokens |
| 2 — Crypto & OAuth | Jun 27 – Jul 4 | Encrypt access tokens, sign OAuth state |
| 3 — Headers & access | Jul 4 – Jul 11 | CSP, helmet, diagnostics lockdown |
| 4 — Data protection | Jul 11 – Jul 18 | Account deletion, inbox cache alignment |
| 5 — SDLC tooling | Jul 11 – Jul 18 | Dependency scan, SAST in CI |
| 6 — Compliance docs | Jul 1 – Jul 18 | Policies, attestations, evidence folder |
| 7 — Lab assessment | Jul 15 – Sep 2 | TAC Security kickoff + remediation cycles |

Phases 5–6 overlap with 3–4. Phase 7 starts once Phase 1–2 are deployed to production.

---

## Decisions (locked 2026-06-13)

| # | Decision | Answer |
|---|----------|--------|
| 1 | **Production domains** | `time-flow.app` (web) + `api.time-flow.app` (API). Cookies use `Domain=.time-flow.app`. OAuth callback: `https://api.time-flow.app/api/auth/google/callback`. |
| 2 | **Staging** | None — test and deploy to **production** only. Run self-scans (ZAP, manual auth checks) against `https://time-flow.app`. |
| 3 | **Mobile** | Out of CASA scope. Expo app keeps Bearer token auth; backend retains `Authorization` header fallback. |
| 4 | **Lab contact** | **Not yet contacted.** Owner action: email TAC Security this week (see Task 23). |
| 5 | **Forced re-login** | **Accepted.** One-time re-auth after Phase 1 deploy when `localStorage` tokens are removed. |

---

## Phase 1: httpOnly Cookie Sessions (Option A)

### Architecture

```
Google OAuth callback
  → api.time-flow.app/api/auth/google/callback
  → Set-Cookie: tf_access (15m), tf_refresh (7d) on .time-flow.app
  → Redirect to time-flow.app/auth/callback?state=...  (NO tokens in URL)

Browser fetch time-flow.app/api/*
  → Vercel rewrite → api.time-flow.app
  → Cookie header forwarded automatically
  → requireAuth reads tf_access cookie (fallback: Authorization Bearer for mobile)
```

**Cookie spec:**

| Cookie | Value | Max-Age | Flags |
|--------|-------|---------|-------|
| `tf_access` | JWT `{ sub, type: 'access' }` | 900s (15m) | `HttpOnly; Secure; SameSite=Lax; Path=/` |
| `tf_refresh` | JWT `{ sub, type: 'refresh' }` | 604800s (7d) | `HttpOnly; Secure; SameSite=Lax; Path=/` |

Production: add `Domain=.time-flow.app`. Development: omit `Domain`, `Secure=false`.

---

### Task 1: Cookie utilities (backend)

**Files:**
- Create: `apps/backend/src/utils/sessionCookies.ts`
- Test: `apps/backend/src/utils/__tests__/sessionCookies.test.ts`

**Step 1: Write failing tests**

```typescript
// apps/backend/src/utils/__tests__/sessionCookies.test.ts
import { describe, it, expect } from 'vitest';
import {
  ACCESS_COOKIE_NAME,
  REFRESH_COOKIE_NAME,
  buildAccessCookieOptions,
  buildRefreshCookieOptions,
  buildClearCookieOptions,
} from '../sessionCookies.js';

describe('sessionCookies', () => {
  it('uses stable cookie names', () => {
    expect(ACCESS_COOKIE_NAME).toBe('tf_access');
    expect(REFRESH_COOKIE_NAME).toBe('tf_refresh');
  });

  it('sets httpOnly and sameSite lax in production', () => {
    const opts = buildAccessCookieOptions('production');
    expect(opts.httpOnly).toBe(true);
    expect(opts.sameSite).toBe('lax');
    expect(opts.secure).toBe(true);
    expect(opts.domain).toBe('.time-flow.app');
  });

  it('omits domain and secure in development', () => {
    const opts = buildAccessCookieOptions('development');
    expect(opts.secure).toBe(false);
    expect(opts.domain).toBeUndefined();
  });

  it('clear options expire cookies', () => {
    const clear = buildClearCookieOptions('production');
    expect(clear.maxAge).toBe(0);
  });
});
```

**Step 2: Run test — expect FAIL**

```bash
cd timeflow/apps/backend && pnpm exec vitest run src/utils/__tests__/sessionCookies.test.ts
```

**Step 3: Implement `sessionCookies.ts`**

```typescript
// apps/backend/src/utils/sessionCookies.ts
import type { CookieSerializeOptions } from '@fastify/cookie';

export const ACCESS_COOKIE_NAME = 'tf_access';
export const REFRESH_COOKIE_NAME = 'tf_refresh';

const PROD_DOMAIN = '.time-flow.app';
const ACCESS_MAX_AGE = 15 * 60;
const REFRESH_MAX_AGE = 7 * 24 * 60 * 60;

function baseOptions(nodeEnv: string): CookieSerializeOptions {
  const isProd = nodeEnv === 'production';
  return {
    path: '/',
    httpOnly: true,
    sameSite: 'lax',
    secure: isProd,
    ...(isProd ? { domain: PROD_DOMAIN } : {}),
  };
}

export function buildAccessCookieOptions(nodeEnv: string): CookieSerializeOptions {
  return { ...baseOptions(nodeEnv), maxAge: ACCESS_MAX_AGE };
}

export function buildRefreshCookieOptions(nodeEnv: string): CookieSerializeOptions {
  return { ...baseOptions(nodeEnv), maxAge: REFRESH_MAX_AGE };
}

export function buildClearCookieOptions(nodeEnv: string): CookieSerializeOptions {
  return { ...baseOptions(nodeEnv), maxAge: 0 };
}
```

**Step 4: Run test — expect PASS**

**Step 5: Commit**

```bash
git add apps/backend/src/utils/sessionCookies.ts apps/backend/src/utils/__tests__/sessionCookies.test.ts
git commit -m "feat(auth): add session cookie helpers for httpOnly JWT storage"
```

---

### Task 2: Register @fastify/cookie

**Files:**
- Modify: `apps/backend/package.json`
- Modify: `apps/backend/src/server.ts`

**Step 1: Install dependency**

```bash
cd timeflow/apps/backend && pnpm add @fastify/cookie
```

**Step 2: Register plugin in `server.ts` (after cors, before jwt)**

```typescript
import cookie from '@fastify/cookie';

await server.register(cookie, {
  secret: env.SESSION_SECRET,
  parseOptions: {},
});
```

**Step 3: Verify server starts**

```bash
cd timeflow/apps/backend && pnpm exec tsc --noEmit
```

**Step 4: Commit**

```bash
git commit -am "feat(auth): register @fastify/cookie plugin"
```

---

### Task 3: Update auth middleware to read cookies

**Files:**
- Modify: `apps/backend/src/middlewares/auth.ts`
- Create: `apps/backend/src/utils/__tests__/authTokenExtractor.test.ts`
- Create: `apps/backend/src/utils/authTokenExtractor.ts`

**Step 1: Write failing test for token extraction**

```typescript
import { describe, it, expect } from 'vitest';
import { extractAccessToken } from '../authTokenExtractor.js';
import { ACCESS_COOKIE_NAME } from '../sessionCookies.js';

describe('extractAccessToken', () => {
  it('prefers Authorization Bearer header', () => {
    const token = extractAccessToken({
      authorization: 'Bearer header-token',
      cookies: { [ACCESS_COOKIE_NAME]: 'cookie-token' },
    });
    expect(token).toBe('header-token');
  });

  it('falls back to access cookie', () => {
    const token = extractAccessToken({
      cookies: { [ACCESS_COOKIE_NAME]: 'cookie-token' },
    });
    expect(token).toBe('cookie-token');
  });

  it('returns null when missing', () => {
    expect(extractAccessToken({})).toBeNull();
  });
});
```

**Step 2: Implement extractor**

```typescript
// apps/backend/src/utils/authTokenExtractor.ts
import { ACCESS_COOKIE_NAME, REFRESH_COOKIE_NAME } from './sessionCookies.js';

type TokenSource = {
  authorization?: string;
  cookies?: Record<string, string | undefined>;
};

export function extractAccessToken(source: TokenSource): string | null {
  const authHeader = source.authorization;
  if (authHeader?.startsWith('Bearer ')) {
    return authHeader.slice(7);
  }
  return source.cookies?.[ACCESS_COOKIE_NAME] ?? null;
}

export function extractRefreshToken(source: TokenSource): string | null {
  return source.cookies?.[REFRESH_COOKIE_NAME] ?? null;
}
```

**Step 3: Update `requireAuth` and `optionalAuth`**

Replace Bearer-only extraction with:

```typescript
import { extractAccessToken } from '../utils/authTokenExtractor.js';

const token = extractAccessToken({
  authorization: request.headers.authorization,
  cookies: request.cookies as Record<string, string | undefined>,
});
if (!token) {
  return reply.status(401).send({ error: 'Unauthorized: Missing token' });
}
const payload = request.server.jwt.verify<{ sub: string; type?: string }>(token);
```

Remove stale TODO comments about MVP user-ID tokens.

**Step 4: Update rate limiter `keyGenerator` in `server.ts`**

Also check `request.cookies[ACCESS_COOKIE_NAME]` when no Bearer header.

**Step 5: Run tests + typecheck**

```bash
cd timeflow/apps/backend && pnpm exec vitest run src/utils/__tests__/authTokenExtractor.test.ts
cd timeflow/apps/backend && pnpm exec tsc --noEmit
```

**Step 6: Commit**

```bash
git commit -am "feat(auth): read JWT from httpOnly cookie with Bearer fallback"
```

---

### Task 4: OAuth callback sets cookies (remove URL tokens)

**Files:**
- Modify: `apps/backend/src/controllers/authController.ts`

**Step 1: Write integration test**

Create `apps/backend/src/controllers/__tests__/authController.cookies.test.ts` using Fastify inject:

```typescript
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { buildServer } from '../../server.js';

describe('authController cookie session', () => {
  // Mock authService.handleGoogleCallback — verify redirect has NO token= query param
  // Verify Set-Cookie headers include tf_access and tf_refresh
});
```

(Use existing test patterns from `gmailPush.e2e.test.ts` for server inject setup.)

**Step 2: Replace redirect-with-tokens in `handleGoogleCallback`**

```typescript
import {
  ACCESS_COOKIE_NAME,
  REFRESH_COOKIE_NAME,
  buildAccessCookieOptions,
  buildRefreshCookieOptions,
} from '../utils/sessionCookies.js';
import { env } from '../config/env.js';

// After jwtSign calls:
reply.setCookie(ACCESS_COOKIE_NAME, accessToken, buildAccessCookieOptions(env.NODE_ENV));
reply.setCookie(REFRESH_COOKIE_NAME, refreshToken, buildRefreshCookieOptions(env.NODE_ENV));

const baseUrl = frontendBaseUrl();
const stateParam = state ? `?state=${encodeURIComponent(state)}` : '';
return reply.redirect(`${baseUrl}/auth/callback${stateParam}`);
```

**Step 3: Run test — expect PASS**

**Step 4: Commit**

```bash
git commit -am "feat(auth): set httpOnly session cookies on OAuth callback"
```

---

### Task 5: Cookie-based refresh + logout endpoints

**Files:**
- Modify: `apps/backend/src/controllers/authController.ts`
- Modify: `apps/backend/src/routes/authRoutes.ts`

**Step 1: Update `refreshToken` handler**

- Read refresh token from `extractRefreshToken({ cookies: request.cookies })` first
- Fall back to body `refreshToken` for mobile backward compat (deprecate later)
- Set new cookies via `reply.setCookie` instead of JSON body tokens
- Return `{ success: true }` (no tokens in response body for web)

```typescript
export async function refreshToken(request, reply) {
  const fromCookie = extractRefreshToken({ cookies: request.cookies });
  const fromBody = parsed.data?.refreshToken;
  const refreshTokenValue = fromCookie ?? fromBody;
  // ... verify, rotate ...
  reply.setCookie(ACCESS_COOKIE_NAME, accessToken, buildAccessCookieOptions(env.NODE_ENV));
  reply.setCookie(REFRESH_COOKIE_NAME, newRefreshToken, buildRefreshCookieOptions(env.NODE_ENV));
  return { success: true, ...(fromBody ? { accessToken, refreshToken: newRefreshToken } : {}) };
}
```

**Step 2: Add logout handler**

```typescript
// authController.ts
export async function logout(request: FastifyRequest, reply: FastifyReply) {
  const clearOpts = buildClearCookieOptions(env.NODE_ENV);
  reply.clearCookie(ACCESS_COOKIE_NAME, clearOpts);
  reply.clearCookie(REFRESH_COOKIE_NAME, clearOpts);
  return { success: true };
}
```

**Step 3: Register route**

```typescript
server.post('/auth/logout', { preHandler: requireAuth }, authController.logout);
```

**Step 4: Add session probe endpoint (optional but useful for frontend)**

```typescript
server.get('/auth/session', { preHandler: requireAuth }, async (request) => {
  return { authenticated: true, userId: request.user!.id };
});
```

**Step 5: Commit**

```bash
git commit -am "feat(auth): cookie-based token refresh and logout endpoint"
```

---

### Task 6: Frontend API client — credentials mode

**Files:**
- Modify: `apps/web/src/lib/api.ts`

**Step 1: Add `credentials: 'include'` to all fetch calls**

In `request()`, `refreshAccessToken()`, and the three email helpers that use raw `fetch` (`markEmailAsRead`, `archiveEmail`, `trashEmail`), plus `downloadHostMeetingCalendar`:

```typescript
const response = await fetch(`${API_BASE}${endpoint}`, {
  ...options,
  credentials: 'include',
  headers,
});
```

**Step 2: Remove localStorage token storage**

- Delete `getAuthToken`, `setAuthToken`, `getRefreshToken`, `setRefreshToken` implementations (or make setters no-ops with deprecation comment)
- `clearAuthToken()` → call `POST /api/auth/logout` with `credentials: 'include'`
- `hasStoredAuthSession()` → async `checkSession()` calling `GET /api/auth/session` OR keep sync heuristic removed; update callers

**Step 3: Update refresh flow**

```typescript
async function refreshAccessToken(): Promise<boolean> {
  const res = await fetch(`${API_BASE}/auth/refresh`, {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: '{}',
  });
  return res.ok;
}
```

On 401 retry, call `refreshAccessToken()` and retry request (no token string needed).

**Step 4: Remove Authorization header from web client**

Web requests should NOT send Bearer header — cookies only. Keep header logic gated:

```typescript
// Only attach Bearer if explicitly provided (mobile WebView future); web uses cookies
```

**Step 5: Run web typecheck**

```bash
cd timeflow/apps/web && pnpm exec tsc --noEmit
```

**Step 6: Commit**

```bash
git commit -am "feat(auth): web API client uses httpOnly cookies with credentials include"
```

---

### Task 7: Auth callback page (no URL tokens)

**Files:**
- Modify: `apps/web/src/app/auth/callback/page.tsx`

**Step 1: Simplify callback**

Cookies are already set by backend redirect. Page only parses `state` for return path:

```typescript
useEffect(() => {
  const { error, state } = readOAuthCallbackParams();
  if (error) {
    router.replace(`/auth/error?error=${encodeURIComponent(error)}`);
    return;
  }
  const redirectTo = parseOAuthReturnPath(state);
  router.replace(redirectTo);
}, [router]);
```

Remove imports of `setAuthToken`, `setRefreshToken`. Remove `token` / `refreshToken` from `readOAuthCallbackParams`.

**Step 2: Commit**

```bash
git commit -am "feat(auth): callback page no longer reads tokens from URL"
```

---

### Task 8: Update hooks and direct localStorage usages

**Files:**
- Modify: `apps/web/src/hooks/useUser.ts`
- Modify: `apps/web/src/hooks/useIdentityProgress.ts`
- Modify: `apps/web/src/hooks/useEvolutionSurface.ts`
- Modify: `apps/web/src/components/InboxPrefetch.tsx`
- Modify: `apps/web/src/app/pricing/page.tsx`
- Modify: `apps/web/src/components/habits/HabitCard.tsx`
- Modify: `apps/web/src/components/habits/HabitRow.tsx`
- Modify: `apps/web/src/components/habits/TimeSlotPicker.tsx`
- Modify: `apps/web/src/components/habits/FlowSchedulingBanner.tsx`

**Step 1: `useUser.ts`**

- `logout` becomes async: `await api.logout()` then `setUser(null)` + `router.push('/login')`
- `isAuthenticated` based on successful `getMe()` only (already the case)

**Step 2: Replace `hasStoredAuthSession()` calls**

Either remove the guard (let API 401 handle it) or replace with `api.checkSession()` if added.

**Step 3: Habit components using `localStorage.getItem('timeflow_token')`**

Replace manual Bearer headers with `credentials: 'include'` fetch to `/api/...` or use shared `api.request()` helper. Extract a small `authFetch(url, init)` if needed.

**Step 4: Update tests**

- `apps/web/src/components/__tests__/InboxPrefetch.test.tsx`
- `apps/web/src/components/habits/__tests__/FlowSchedulingBanner.test.tsx`

Mock `credentials: 'include'` behavior; remove localStorage token setup.

**Step 5: Run tests**

```bash
cd timeflow/apps/web && pnpm test
```

**Step 6: Commit**

```bash
git commit -am "refactor(auth): remove localStorage token usage across web app"
```

---

### Task 9: Local dev cross-origin cookie verification

**Files:**
- Modify: `apps/web/next.config.js` (only if needed)
- Modify: `docs/GOOGLE_OAUTH_VERIFICATION.md`

**Step 1: Document local dev flow**

When web runs on `:3000` and API on `:3001` without proxy, cookies won't work cross-port. **Always use Next.js rewrite** (`/api` proxy) in dev:

```
NEXT_PUBLIC_API_URL=http://localhost:3001
# Browser hits localhost:3000/api/* (same origin)
```

**Step 2: Manual verification checklist**

```bash
# Terminal 1
cd timeflow && pnpm dev:backend

# Terminal 2
cd timeflow && pnpm dev:web

# Browser DevTools → Application → Cookies
# 1. Sign in via Google
# 2. Confirm tf_access + tf_refresh on localhost (no Domain attr)
# 3. Confirm /auth/callback URL has NO token= param
# 4. Refresh page — still authenticated
# 5. Wait 15m or delete tf_access — auto-refresh works
# 6. Logout — cookies cleared
```

**Step 3: Production verification**

After deploy to Render + Vercel:
- Cookies show `Domain: .time-flow.app`
- `Secure` flag set
- Gmail connect + reconnect flows still work

**Step 4: Commit docs**

```bash
git commit -am "docs: update OAuth guide for httpOnly cookie sessions"
```

---

## Phase 2: Crypto & OAuth Hardening

### Task 10: Encrypt Google access tokens at rest

**Files:**
- Modify: `apps/backend/src/services/authService.ts` (all `googleAccessToken` writes)
- Modify: `apps/backend/src/services/googleCalendarService.ts`
- Modify: `apps/backend/src/services/gmailService.ts`
- Modify: `apps/backend/src/services/gmailWatchService.ts`
- Modify: `apps/backend/src/utils/crypto.ts`
- Create: `apps/backend/scripts/migrate-encrypt-access-tokens.ts`

**Step 1: Write test**

```typescript
it('encrypt/decrypt round-trips access tokens', () => {
  const plain = 'ya29.access-token-value';
  const enc = encrypt(plain);
  expect(enc).not.toBe(plain);
  expect(decrypt(enc)).toBe(plain);
});
```

**Step 2: Remove legacy plaintext fallback in `decrypt()`**

Change line 19 from `return payload` to `return null` (or log + return null). Run migration script first in production.

**Step 3: Wrap all access token DB writes with `encrypt()`**

Search: `googleAccessToken:` assignments in authService and connected account flows.

**Step 4: Wrap all reads with `decrypt()`**

In calendar/gmail services where tokens are read from DB.

**Step 5: One-time migration script**

```typescript
// For each User/ConnectedAccount with googleAccessToken not matching iv.data.tag format:
//   update with encrypt(token)
```

Run in staging first, then production during maintenance window.

**Step 6: Commit**

```bash
git commit -am "feat(security): encrypt Google access tokens at rest"
```

---

### Task 11: HMAC-sign OAuth state

**Files:**
- Modify: `apps/backend/src/utils/oauthState.ts`
- Modify: `apps/backend/src/utils/__tests__/oauthState.test.ts`

**Step 1: Write failing tests**

```typescript
it('rejects tampered state payload', () => {
  const encoded = encodeOAuthState({ linkUserId: 'user_a', flow: 'gmail' });
  const tampered = encoded.slice(0, -2) + 'XX';
  expect(() => decodeOAuthState(tampered)).toThrow('Invalid OAuth state');
});

it('round-trips signed gmail connect state', () => {
  const encoded = encodeOAuthState({ linkUserId: 'user_123', flow: 'gmail', returnTo: '/settings' });
  expect(decodeOAuthState(encoded).linkUserId).toBe('user_123');
});
```

**Step 2: Implement signed state format**

```
base64url(json).base64url(hmac-sha256)
```

Use `SESSION_SECRET` as HMAC key. Keep plain-path encoding for simple sign-in return paths (no linkUserId).

**Step 3: Validate `linkUserId` matches authenticated user in gmail/reconnect flows** (already in authService — verify).

**Step 4: Commit**

```bash
git commit -am "feat(security): HMAC-sign OAuth state for CSRF protection"
```

---

## Phase 3: Security Headers & Access Control

### Task 12: Next.js security headers

**Files:**
- Modify: `apps/web/next.config.js`

**Step 1: Add headers() config**

```javascript
async headers() {
  return [
    {
      source: '/(.*)',
      headers: [
        { key: 'X-Frame-Options', value: 'DENY' },
        { key: 'X-Content-Type-Options', value: 'nosniff' },
        { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
        { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
        {
          key: 'Content-Security-Policy',
          value: [
            "default-src 'self'",
            "script-src 'self' 'unsafe-inline' 'unsafe-eval'", // tighten after audit
            "style-src 'self' 'unsafe-inline'",
            "img-src 'self' data: https:",
            "connect-src 'self' https://api.time-flow.app https://*.posthog.com",
            "frame-ancestors 'none'",
          ].join('; '),
        },
      ],
    },
  ];
},
```

Adjust `connect-src` for PostHog/Stripe as needed.

**Step 2: Verify app loads without CSP violations in browser console**

**Step 3: Commit**

---

### Task 13: Fastify helmet

**Files:**
- Modify: `apps/backend/package.json`
- Modify: `apps/backend/src/server.ts`

```bash
cd timeflow/apps/backend && pnpm add @fastify/helmet
```

```typescript
import helmet from '@fastify/helmet';
await server.register(helmet, {
  contentSecurityPolicy: false, // API only; CSP on Next.js
});
```

---

### Task 14: Lock down diagnostics endpoints

**Files:**
- Modify: `apps/backend/src/routes/diagnosticsRoutes.ts`
- Modify: `apps/backend/src/controllers/diagnosticsController.ts`

**Step 1:** Gate behind `NODE_ENV === 'development'` OR require admin flag on user OR remove from production entirely.

**Recommended:** Disable in production:

```typescript
if (env.NODE_ENV === 'production') {
  return; // don't register diagnostics routes
}
```

**Step 2: Commit**

---

## Phase 4: Data Protection

### Task 15: Account & data deletion API

**Files:**
- Create: `apps/backend/src/controllers/accountController.ts`
- Create: `apps/backend/src/routes/accountRoutes.ts`
- Modify: `apps/backend/src/server.ts`
- Modify: `apps/web/src/app/privacy/page.tsx` (link to deletion flow if needed)

**Endpoint:** `DELETE /api/user/account`

**Behavior:**
1. Revoke Google OAuth tokens via Google API
2. Delete user cascades (Prisma onDelete rules) — tasks, conversations, inbox cache, etc.
3. Clear session cookies
4. Return `{ success: true }`

**Step 1:** Write test with test user
**Step 2:** Implement controller
**Step 3:** Add Settings UI "Delete my account" with confirmation dialog

---

### Task 16: Align inbox cache with privacy policy

**Files:**
- Modify: `apps/backend/src/services/inboxCacheService.ts`
- Modify: `apps/web/src/lib/emailCache.ts`
- Modify: `apps/web/src/app/privacy/page.tsx`

**Options (pick one during implementation):**

- **A (recommended):** Store metadata only server-side (sender, subject, date, labels, threadId — no snippet/body). Remove client localStorage cache entirely.
- **B:** Update privacy policy to disclose 90s client cache + server inbox cache with TTL.

**Step 1:** Audit what `InboxCache` JSON contains today
**Step 2:** Strip body/snippet if keeping cache
**Step 3:** Add server-side TTL expiry (e.g., 24h max)
**Step 4:** Update privacy policy wording to match

---

## Phase 5: Secure SDLC Tooling

### Task 17: Dependency scanning in CI

**Files:**
- Modify: `timeflow/.github/workflows/ci.yml`

```yaml
- name: Dependency audit
  run: pnpm audit --audit-level=high
  continue-on-error: false
```

Also enable GitHub Dependabot (`dependabot.yml`).

---

### Task 18: SAST in CI

**Files:**
- Create: `.github/workflows/security.yml`

Use Semgrep (free tier) or CodeQL:

```yaml
- uses: returntocorp/semgrep-action@v1
  with:
    config: p/default
```

Save SARIF report to `docs/compliance/casa/self-scan-results/`.

---

### Task 19: OWASP ZAP baseline self-scan

**Manual step (before lab kickoff):**

```bash
docker run -t ghcr.io/zaproxy/zaproxy:stable zap-baseline.py \
  -t https://time-flow.app \
  -r docs/compliance/casa/self-scan-results/zap-baseline-$(date +%Y%m%d).html
```

Fix all High/Medium findings before contacting lab.

---

## Phase 6: Compliance Documentation

### Task 20: Create CASA evidence folder

**Files:**
- Create: `docs/compliance/casa/system-description.md`
- Create: `docs/compliance/casa/data-classification.md`
- Create: `docs/compliance/casa/encryption-statement.md`
- Create: `docs/compliance/casa/oauth-token-lifecycle.md`
- Create: `docs/compliance/casa/deployment-attestation.md`
- Create: `docs/compliance/casa/data-storage-attestation.md`
- Create: `docs/compliance/casa/incident-response-runbook.md`
- Create: `docs/compliance/evidence/vendor-list.md` (fill in: Google, Supabase, Render, Vercel, OpenAI, Stripe, PostHog)

Reuse content from `docs/plans/2026-01-02-sprint-20-compliance-audit-readiness.md` Sections A–B.

**System description diagram (include in doc):**

```
User Browser (time-flow.app)
  ↓ HTTPS
Vercel (Next.js) ──rewrite──→ Render (Fastify API)
                                  ↓ TLS
                              Supabase Postgres
                                  ↓
                    Google APIs (OAuth, Calendar, Gmail)
```

---

### Task 21: Lightweight security policies

**Files:**
- Create: `docs/compliance/policies/information-security-policy.md`
- Create: `docs/compliance/policies/access-control-policy.md`
- Create: `docs/compliance/policies/incident-response-policy.md`
- Create: `docs/compliance/policies/data-retention-policy.md`

Keep each to 1–2 pages. Date and version them.

---

### Task 22: MFA evidence capture

**Manual checklist — screenshot each platform:**

- [ ] GitHub — MFA enabled
- [ ] Vercel — MFA enabled
- [ ] Render — MFA enabled
- [ ] Supabase — MFA enabled
- [ ] Google Cloud Console — MFA enabled

Save to `docs/compliance/casa/evidence/mfa-screenshots/`.

---

## Phase 7: Lab Engagement

### Task 23: Contact TAC Security (do immediately)

**Email template:**

> Subject: CASA Tier 2 Assessment — TimeFlow (time-flow.app)
>
> We received Google's notification requiring CASA Tier 2 by September 2, 2026 for project joga-bonito-465122.
>
> App: https://time-flow.app
> Scopes: Google Calendar (read/write), Gmail (readonly, compose, modify)
> Architecture: Next.js on Vercel, Fastify API on Render, Supabase Postgres
>
> Please provide pricing, timeline, and pre-assessment checklist.

---

### Task 24: Lab kickoff package (week of Jul 15)

Send to assessor:

1. Google notification email (PDF)
2. `docs/compliance/casa/system-description.md`
3. Self-scan reports (ZAP, SAST, pnpm audit)
4. Privacy policy URL: `https://time-flow.app/privacy`
5. Production URL + test account credentials
6. Architecture diagram
7. Point of contact + 48h response commitment

---

### Task 25: Remediation cycle

When lab returns findings:

1. Triage by severity (Critical → High → Medium)
2. Fix in code or document compensating control
3. Redeploy to production
4. Request rescan within 48h
5. Repeat until LOV issued

---

## Testing Strategy (end-to-end)

### Auth regression tests

| # | Scenario | Expected |
|---|----------|----------|
| 1 | New user Google sign-in | Cookies set, no URL tokens, lands on /today |
| 2 | Page refresh while logged in | Still authenticated via cookies |
| 3 | Access token expiry | Silent refresh via cookie |
| 4 | Logout | Cookies cleared, /user/me returns 401 |
| 5 | Settings → Connect Gmail | OAuth works, cookies preserved |
| 6 | Gmail reconnect | Signed state validated |
| 7 | Cross-tab session | Both tabs share cookies |
| 8 | Pricing page checkout | Works without localStorage token |
| 9 | Habit scheduling banner | API calls work with credentials |
| 10 | Mobile app login | Bearer auth still works (unaffected) |

### Security tests

| # | Check | Tool |
|---|-------|------|
| 1 | No tokens in browser localStorage | DevTools manual |
| 2 | Cookies are HttpOnly + Secure | DevTools manual |
| 3 | OAuth callback URL clean | DevTools Network tab |
| 4 | CSP no violations | Browser console |
| 5 | Diagnostics 404 in production | curl |
| 6 | Account deletion works | API test |
| 7 | Dependency vulnerabilities | pnpm audit |
| 8 | SAST clean | Semgrep CI |

### CI commands (run before each phase merge)

```bash
cd timeflow
pnpm install
pnpm exec tsc --noEmit -p apps/backend
pnpm exec tsc --noEmit -p apps/web
cd apps/backend && pnpm test
cd apps/web && pnpm test
cd apps/backend && pnpm verify:db-security
```

---

## Risk Register

| Risk | Mitigation |
|------|------------|
| OAuth callback on `api.*` subdomain — cookies must use `Domain=.time-flow.app` | Test in staging before prod deploy |
| Next.js rewrite may not forward Set-Cookie in edge cases | Verify with Network tab; fallback: set cookies via `/auth/callback` BFF route |
| Forced re-login angers users | One-time; communicate via status banner |
| CSP breaks PostHog/Stripe/analytics | Tune `connect-src` iteratively |
| Lab finds issues late | Start lab Jul 15; keep 2-week buffer before Sep 2 |
| Legacy plaintext tokens in DB | Run migration script in Phase 2 before removing decrypt fallback |

---

## Success Criteria (CASA Tier 2 pass)

- [ ] Letter of Validation (LOV) received from authorized lab
- [ ] Google verification unblocked
- [ ] No JWTs in URL or localStorage (web)
- [ ] All OAuth tokens encrypted at rest
- [ ] OAuth state HMAC-signed
- [ ] CSP + security headers deployed
- [ ] Account deletion implemented
- [ ] Privacy policy matches actual data handling
- [ ] Compliance evidence folder complete
- [ ] Self-scan reports show no High/Critical findings
- [ ] MFA enabled on all admin platforms (evidence captured)

---

## Execution Handoff

**Plan complete and saved to `docs/plans/2026-06-13-casa-tier2-readiness.md`.**

**Two execution options:**

1. **Subagent-Driven (this session)** — Dispatch fresh subagent per task, review between tasks, fast iteration

2. **Parallel Session (separate)** — Open new session with executing-plans, batch execution with checkpoints

**Which approach?**

---

## References

- [CASA Overview](https://appdefensealliance.dev/casa)
- [CASA Tiering](https://appdefensealliance.dev/casa/casa-tiering)
- [CASA Framework User Process](https://appdefensealliance.dev/casa/casa-start)
- TimeFlow: `docs/GOOGLE_OAUTH_VERIFICATION.md`
- TimeFlow: `docs/plans/2026-01-02-sprint-20-compliance-audit-readiness.md`
