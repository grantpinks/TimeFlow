# Inbox Cache Design (Hybrid, 2-minute TTL)

Date: 2026-01-12

## Summary
Implement a hybrid inbox cache to make the inbox feel instant while limiting Gmail/API load. The server serves cached inbox responses (Postgres-backed, TTL 2 minutes) and refreshes in the background. The client renders from local cache immediately, then updates from server responses.

## Goals
- Instant inbox render with cached threads.
- Reduce Gmail API calls and user-perceived latency.
- Keep behavior consistent across devices (server cache).
- Maintain safe fallback when Gmail is slow/unavailable.

## Non-goals
- Redis integration in this phase.
- New UI surfaces beyond a lightweight refresh indicator.
- Full cache invalidation by label changes (future).

## Architecture
### Server-side cache (source of truth)
- Add `InboxCache` table keyed by `userId`.
- Store serialized inbox payload and `fetchedAt`.
- TTL: 2 minutes.
- Endpoint `/api/email/inbox` accepts `cacheMode`:
  - `prefer` (default): return cached response if available (even if stale), schedule refresh if stale.
  - `refresh`: bypass cache and fetch Gmail, update cache, return fresh.
  - `bypass`: no cache read/write (for debugging).
- Responses include metadata: `cacheAgeMs`, `isStale`.

### Client-side cache (instant paint)
- Use existing localStorage cache (`emailCache.ts`).
- Align TTL to 2 minutes.
- On inbox mount:
  1) Load local cache and render immediately.
  2) Call `/api/email/inbox?cacheMode=prefer` to update in-memory state and local cache.
- Manual refresh clears local cache and calls `cacheMode=refresh`.

## Data Flow
1) User opens inbox.
2) Client renders local cached threads immediately if available.
3) Client requests `/api/email/inbox?cacheMode=prefer`.
4) Server returns cached response if fresh; if stale, returns stale with `isStale=true` and triggers background refresh.
5) Client updates UI when response arrives; background refresh updates server cache for subsequent requests.

## Error Handling
- If Gmail fetch fails and cached data exists, return cached data (stale) and log failure.
- If Gmail fetch fails and no cache exists, return 5xx.
- Rate limit errors follow same pattern (serve stale, backoff on refresh).

## Load Considerations
- Gmail calls capped to at most once per user per 2 minutes.
- Postgres writes are low volume (cache refresh only).
- Background refresh should be single-flight per user to avoid stampede.

## Testing Strategy
- Backend unit tests for cache decisions (fresh cache, stale cache triggers refresh, cache miss).
- Backend controller test ensuring metadata fields are present.
- Frontend test: uses local cache for instant render, then updates after server response.

## Rollout
1) Deploy backend cache table + logic.
2) Deploy frontend cache read/write and server metadata handling.
3) Monitor logs for refresh frequency and Gmail rate-limit errors.

## Future Enhancements
- Redis cache for higher scale.
- Cache invalidation on Gmail push notifications.
- Multi-page cache keys (pageToken support).
