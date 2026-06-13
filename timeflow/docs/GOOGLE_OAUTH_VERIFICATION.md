# Google OAuth Verification Guide (TimeFlow)

This guide walks through fixing the warning screens you see during Google sign-in and submitting TimeFlow for Google OAuth verification.

## What causes the warning screens?

| Screen | Cause | Fix |
|--------|-------|-----|
| **"Google hasn't verified this app"** | OAuth consent screen is in **Testing** mode | Publish to **Production** (see Step 3) |
| **Missing Privacy Policy / Terms links** | URLs not set on OAuth consent screen | Add URLs in Google Cloud Console (Step 2) |
| **Gmail scope warnings ("8 services")** | Restricted Gmail scopes requested at login | Code now splits sign-in vs Gmail (Step 1); Gmail still requires verification (Step 4) |

## Step 1 — Deploy the code changes (already in repo)

TimeFlow now uses **incremental authorization**:

- **Sign-in** (`GET /api/auth/google/start`): Calendar + profile scopes only
- **Gmail connect** (`POST /api/auth/google/gmail-url`): Gmail scopes when user enables inbox features
- **Full reconnect** (`POST /api/auth/google/reconnect-url`): All scopes from Settings

### Web session (httpOnly cookies)

After OAuth, the backend sets session cookies on the API domain — **not** tokens in the redirect URL:

| Cookie | Purpose | Max-Age |
|--------|---------|---------|
| `tf_access` | JWT access token | 15 minutes |
| `tf_refresh` | JWT refresh token | 7 days |

Production cookies use `Domain=.time-flow.app`, `HttpOnly`, `Secure`, `SameSite=Lax`. The OAuth callback routes through the **web proxy** (`time-flow.app/api/auth/google/callback` → backend) so cookies are set on the same origin users navigate to (Safari ITP compatible). After callback, redirect goes to `time-flow.app/auth/callback?state=...` with **no** `token` or `refreshToken` query params.

The web client sends cookies on every `/api/*` request via `credentials: 'include'` (Next.js rewrites proxy to the backend). Tokens are never stored in `localStorage` or URL parameters on web.

Mobile (Expo) continues to use Bearer tokens in the `Authorization` header; the backend accepts Bearer **or** cookies.

After deploying backend + web to production, new users see a simpler consent screen at sign-in.

**Existing users** who already granted all scopes are unaffected. Users who need Gmail should use **Settings → Connect Gmail** or **Reconnect Google**.

## Step 2 — Configure OAuth consent screen (Google Cloud Console)

1. Open [Google Cloud Console](https://console.cloud.google.com/)
2. Select your TimeFlow project
3. Go to **APIs & Services → OAuth consent screen**

### App information

| Field | Value |
|-------|-------|
| App name | `time-flow.app` (or `TimeFlow`) |
| User support email | Your support email |
| App logo | TimeFlow logo (optional but recommended) |
| App domain | `time-flow.app` |
| Application home page | `https://time-flow.app` |
| **Privacy Policy** | `https://time-flow.app/privacy` |
| **Terms of Service** | `https://time-flow.app/terms` |
| Authorized domains | `time-flow.app` |

### Scopes

Under **Data Access → Scopes**, ensure these match what TimeFlow uses:

**Sign-in (sensitive, not restricted):**
- `.../auth/calendar.readonly`
- `.../auth/calendar.events`
- `.../auth/userinfo.email`
- `.../auth/userinfo.profile`

**Gmail (restricted — requires verification):**
- `.../auth/gmail.readonly`
- `.../auth/gmail.compose`
- `.../auth/gmail.modify`

Remove any unused scopes.

### Credentials

Under **APIs & Services → Credentials → OAuth 2.0 Client IDs**:

- **Authorized JavaScript origins:** `https://time-flow.app`
- **Authorized redirect URIs:** `https://time-flow.app/api/auth/google/callback`

Must match production env vars:
- `APP_BASE_URL=https://time-flow.app`
- `GOOGLE_REDIRECT_URI=https://time-flow.app/api/auth/google/callback`

## Step 3 — Move from Testing to Production

While in **Testing** mode, only users on your test-user list can sign in without the unverified-app warning.

1. OAuth consent screen → **Publishing status**
2. Click **Publish App**
3. Confirm publishing

**After publishing:**
- Calendar-only sign-in works for all Google users without the "unverified app" block (for non-restricted scopes)
- Gmail scopes still show extra warnings until Google approves verification (Step 4)

## Step 4 — Submit for Google OAuth verification (Gmail scopes)

Restricted scopes (`gmail.readonly`, `gmail.compose`, `gmail.modify`) **require** Google verification before warnings disappear for all users.

1. OAuth consent screen → **Prepare for verification** (or **Submit for verification**)
2. Complete the verification form:

### Scope justifications (example text)

**gmail.readonly**
> TimeFlow reads Gmail thread metadata (sender, subject, date, labels) to display the user's inbox, categorize emails, and extract actionable tasks. Full message bodies are processed transiently for AI-assisted replies; we do not persist full email content.

**gmail.compose**
> TimeFlow creates Gmail drafts when the user asks the AI assistant to draft a reply, so the user can review and send from Gmail.

**gmail.modify**
> TimeFlow applies user-configured category labels to Gmail threads and updates read/archive state when the user takes actions in TimeFlow that should sync back to Gmail.

**calendar.readonly / calendar.events**
> TimeFlow reads calendar events to show availability and schedules user tasks as calendar events.

### Demo video (required)

Record a 2–5 minute screencast showing:

1. Sign in with Google at `https://time-flow.app`
2. Calendar events appearing in TimeFlow
3. Settings → **Connect Gmail** → consent screen → inbox loading
4. Creating a category label and syncing to Gmail (if applicable)
5. Privacy Policy and Terms links visible on your site and in the consent screen

Upload to YouTube (unlisted) or Google Drive and paste the link in the submission.

### Privacy policy requirements

Your policy at `https://time-flow.app/privacy` must include:

- What Google data you access and why
- How data is stored, encrypted, and deleted
- **Google API Services User Data Policy** Limited Use disclosure (added in May 2026 update)
- Contact email for data requests

### Domain verification

Verify `time-flow.app` in [Google Search Console](https://search.google.com/search-console) and link it to your Cloud project if prompted.

## Step 5 — Restricted scope security assessment

Google may require an annual **security assessment** for apps using restricted Gmail scopes that store or transmit Gmail data on a server.

TimeFlow stores encrypted Google refresh tokens and **access tokens** server-side (AES-256-GCM). Expect Google to ask about:

- Encryption at rest (AES-256-GCM for OAuth access + refresh tokens)
- HTTPS in transit
- Access controls and incident response
- Data retention and deletion

Budget 2–6 weeks for review and possible follow-up questions.

## Step 6 — Verify everything works

### Quick checklist

- [ ] `https://time-flow.app/privacy` loads without login
- [ ] `https://time-flow.app/terms` loads without login
- [ ] New user sign-in shows calendar scopes only (not Gmail)
- [ ] Settings → Connect Gmail adds Gmail scopes
- [ ] OAuth consent screen shows Privacy + Terms links (not the blue "Learn why you're not seeing links" warning)
- [ ] App published to Production in Cloud Console
- [ ] Verification submitted if using Gmail scopes publicly

### Test as a non-test user

Add a personal Gmail account **not** on the test-user list. Sign in on production:

- **Before Production publish:** blocked or warned
- **After Production publish (calendar only):** should sign in cleanly
- **Gmail features:** may still warn until verification approved

## Troubleshooting

| Issue | Action |
|-------|--------|
| Privacy/Terms links still missing on consent screen | Re-save OAuth consent screen; wait ~10 min; clear browser cache |
| Redirect URI mismatch | Exact match required in Credentials vs `GOOGLE_REDIRECT_URI` |
| Gmail works for you but not others | App still in Testing, or verification pending |
| "Google account does not match" on reconnect | Use the same Google account you signed up with |

## Support contacts

- Google OAuth verification: [Google OAuth Verification FAQ](https://support.google.com/cloud/answer/9110914)
- TimeFlow privacy requests: privacy@time-flow.app

---

**Timeline expectation:** Console configuration (Steps 2–3) can be done in one session. Google verification for Gmail scopes typically takes **3–6+ weeks**.
