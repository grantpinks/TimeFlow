# OAuth Token Lifecycle

**Version**: 1.0  
**Last updated**: 2026-06-13  
**Owner**: Grant Pinkerton

---

## Overview

TimeFlow uses Google OAuth 2.0 for authentication and API access (Calendar, Gmail). Tokens are stored server-side only; the browser holds httpOnly session JWTs, not Google tokens.

---

## Lifecycle stages

### 1. Authorization

- User clicks "Sign in with Google" on `time-flow.app`.
- Backend generates HMAC-signed OAuth `state` + nonce (`oauthState.ts`).
- User consents to requested scopes on Google's consent screen.
- Callback: `https://time-flow.app/api/auth/google/callback` (proxied to Render).

### 2. Token exchange & storage

- Backend exchanges authorization code for access + refresh tokens.
- Refresh token encrypted and stored in Postgres (`User.googleRefreshToken` or `ConnectedAccount`).
- Access token encrypted (AES-256-GCM) and stored with expiry timestamp.
- httpOnly session cookies (`tf_access`, `tf_refresh`) issued to browser.
- Redirect to app **without tokens in URL**.

### 3. Active use

- API requests authenticated via `tf_access` cookie (web) or Bearer header (mobile).
- Google API calls use `accountTokenService.getGoogleOAuth2ClientForUser()`.
- Access token refreshed automatically when expired; new access token re-encrypted and persisted.

### 4. Scope upgrades (Gmail connect)

- Additional OAuth flow with signed state for Gmail scopes.
- Same encryption and storage rules apply.

### 5. Logout

- `POST /api/auth/logout` clears session cookies.
- Google refresh token revoked via `oauth2Client.revokeToken()` (best-effort).
- Client `sessionStorage` email cache cleared.

### 6. Account deletion

- `DELETE /api/user/account` deletes all user data in Postgres first.
- Google refresh tokens revoked from pre-delete snapshot.
- Stripe subscription canceled (best-effort).
- Session cookies cleared in response.

---

## Token storage locations

| Token | Storage | Encryption |
|-------|---------|------------|
| Google refresh token | Postgres | AES-256-GCM |
| Google access token | Postgres | AES-256-GCM |
| Session JWT (`tf_access`) | httpOnly cookie | HMAC-signed (not stored in DB) |
| Session JWT (`tf_refresh`) | httpOnly cookie | HMAC-signed (not stored in DB) |

---

## Security controls

- OAuth state HMAC-signed to prevent CSRF on callback
- `validateOrigin` middleware on mutating routes
- Access tokens never returned to browser after initial OAuth
- Legacy plaintext tokens migrated via `scripts/migrate-encrypt-access-tokens.ts`
- Google token revoke on logout and account deletion

---

## Google Cloud project

- **Project ID**: `joga-bonito-465122`
- **OAuth client**: Web application type
- **Authorized redirect URI**: `https://time-flow.app/api/auth/google/callback`
