# Sprint 16 Phase B: Gmail Watch + Pub/Sub Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Label new Gmail threads within minutes using Gmail watch + Pub/Sub, with safe auth, dedupe, and renewal, building on the Phase A sync service already shipped.

**Architecture:** Use Gmail `users.watch` to publish changes to a Pub/Sub topic. A new push handler validates either OIDC JWT or shared secret, maps `emailAddress` → user, dedupes by `historyId`, and calls a history-driven sync routine. Watch state is stored on `GmailLabelSyncState` and renewed before expiration. Fallback remains sync-on-inbox-fetch.

**Tech Stack:** Fastify, Prisma, Gmail API (`googleapis`), Vitest, Zod, optional `google-auth-library` for OIDC verification.

---

## Existing Work (Do Not Redo)
- Phase A Gmail label sync service and routes already exist in `timeflow/apps/backend/src/services/gmailLabelSyncService.ts` and `timeflow/apps/backend/src/routes/gmailSyncRoutes.ts`.
- `GmailLabelSyncState` already has `lastHistoryId` and `watchExpiration` in `timeflow/apps/backend/prisma/schema.prisma`.
- Fallback sync-on-inbox-fetch is already implemented (`syncGmailLabelsOnInboxFetch`).

---

### Task 1: Extend sync state for watch metadata

**Files:**
- Modify: `timeflow/apps/backend/prisma/schema.prisma`
- Modify: `timeflow/apps/backend/src/__tests__/schema.test.ts`

**Step 1: Write the failing test**

```ts
// timeflow/apps/backend/src/__tests__/schema.test.ts
expect(schema).toContain('watchEnabled');
expect(schema).toContain('watchResourceId');
expect(schema).toContain('watchTopicName');
```

**Step 2: Run test to verify it fails**

Run: `pnpm -C timeflow/apps/backend test -- schema.test.ts`
Expected: FAIL with missing fields

**Step 3: Write minimal implementation**

```prisma
// timeflow/apps/backend/prisma/schema.prisma
model GmailLabelSyncState {
  // ...existing fields
  watchEnabled     Boolean  @default(false)
  watchResourceId  String?
  watchTopicName   String?
}
```

Run: `pnpm -C timeflow/apps/backend prisma:migrate -- --name add_gmail_watch_metadata`
Expected: Migration generated and applied

**Step 4: Run test to verify it passes**

Run: `pnpm -C timeflow/apps/backend test -- schema.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add timeflow/apps/backend/prisma/schema.prisma timeflow/apps/backend/prisma/migrations timeflow/apps/backend/src/__tests__/schema.test.ts
git commit -m "feat(backend): add gmail watch metadata"
```

---

### Task 2: Add Gmail watch service + history sync

**Files:**
- Create: `timeflow/apps/backend/src/services/gmailWatchService.ts`
- Modify: `timeflow/apps/backend/src/services/gmailLabelSyncService.ts`
- Create: `timeflow/apps/backend/src/services/__tests__/gmailWatchService.test.ts`

**Step 1: Write the failing test**

```ts
// timeflow/apps/backend/src/services/__tests__/gmailWatchService.test.ts
it('starts a Gmail watch and persists historyId + expiration', async () => {
  prismaMock.gmailLabelSyncState.update.mockResolvedValue({
    userId: 'user-1',
    watchEnabled: true,
    watchResourceId: 'resource-123',
    watchTopicName: 'projects/demo/topics/timeflow',
    lastHistoryId: '999',
    watchExpiration: new Date('2030-01-01T00:00:00Z'),
  });

  gmailMock.users.watch.mockResolvedValue({
    data: { historyId: '999', expiration: '1893456000000' },
  });

  const result = await startGmailWatch('user-1');
  expect(result.watchEnabled).toBe(true);
  expect(result.lastHistoryId).toBe('999');
});
```

**Step 2: Run test to verify it fails**

Run: `pnpm -C timeflow/apps/backend test -- gmailWatchService.test.ts`
Expected: FAIL (module missing)

**Step 3: Write minimal implementation**

```ts
// timeflow/apps/backend/src/services/gmailWatchService.ts
export async function startGmailWatch(userId: string) {
  // call gmail.users.watch with topicName from env
  // store watchEnabled, watchResourceId, watchTopicName, lastHistoryId, watchExpiration
}

export async function stopGmailWatch(userId: string) {
  // call gmail.users.stop and set watchEnabled false
}

export async function syncFromHistory(userId: string, historyId: string) {
  // dedupe by comparing historyId to syncState.lastHistoryId
  // use gmail.users.history.list starting at lastHistoryId
  // gather threadIds and call applyLabelToThread for categorized threads
  // update lastHistoryId with the newest historyId processed
}
```

Hook `syncFromHistory` into `gmailLabelSyncService.ts` using existing helpers:
- reuse `scoreEmailCategoryWithFallback`, `applyCategoryOverride`, `applyLabelToThread`, and existing label mapping logic
- reuse `createOrUpdateGmailLabel` for category label IDs when needed

**Step 4: Run test to verify it passes**

Run: `pnpm -C timeflow/apps/backend test -- gmailWatchService.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add timeflow/apps/backend/src/services/gmailWatchService.ts timeflow/apps/backend/src/services/gmailLabelSyncService.ts timeflow/apps/backend/src/services/__tests__/gmailWatchService.test.ts
git commit -m "feat(backend): add gmail watch + history sync"
```

---

### Task 3: Add Pub/Sub push handler endpoint (OIDC + secret auth)

**Files:**
- Create: `timeflow/apps/backend/src/controllers/gmailPushController.ts`
- Modify: `timeflow/apps/backend/src/routes/gmailSyncRoutes.ts` (or create `gmailPushRoutes.ts`)
- Modify: `timeflow/apps/backend/src/config/env.ts`
- Create: `timeflow/apps/backend/src/__tests__/gmailPush.e2e.test.ts`

**Step 1: Write the failing test**

```ts
// timeflow/apps/backend/src/__tests__/gmailPush.e2e.test.ts
it('accepts Pub/Sub push with shared secret and triggers history sync', async () => {
  gmailWatchServiceMock.syncFromHistory.mockResolvedValue({ processedThreads: 1 });

  const res = await server.inject({
    method: 'POST',
    url: '/api/integrations/gmail/push',
    headers: { 'x-pubsub-token': 'secret' },
    payload: {
      message: { data: Buffer.from(JSON.stringify({ emailAddress: 'user@example.com', historyId: '100' })).toString('base64') },
      subscription: 'projects/demo/subscriptions/timeflow',
    },
  });

  expect(res.statusCode).toBe(204);
  expect(gmailWatchServiceMock.syncFromHistory).toHaveBeenCalledWith('user-123', '100');
});
```

**Step 2: Run test to verify it fails**

Run: `pnpm -C timeflow/apps/backend test -- gmailPush.e2e.test.ts`
Expected: FAIL (route/controller missing)

**Step 3: Write minimal implementation**

```ts
// timeflow/apps/backend/src/controllers/gmailPushController.ts
// Validate Pub/Sub body (base64 decode) and require auth:
// - OIDC: verify JWT audience and optional service account email allowlist
// - Secret: x-pubsub-token matches env.GMAIL_PUBSUB_PUSH_SECRET
// Map emailAddress -> user via prisma.user.findUnique({ where: { email } })
// If historyId <= syncState.lastHistoryId: 204 (dedupe)
// Otherwise call syncFromHistory(userId, historyId) and return 204
```

Add env config in `env.ts`:
- `GMAIL_PUBSUB_TOPIC`
- `GMAIL_PUBSUB_PUSH_SECRET`
- `GMAIL_PUBSUB_OIDC_AUDIENCE`
- `GMAIL_PUBSUB_OIDC_EMAIL_ALLOWLIST` (comma-separated)

Wire route in `registerGmailSyncRoutes` or a new `registerGmailPushRoutes`:
- `POST /api/integrations/gmail/push`

**Step 4: Run test to verify it passes**

Run: `pnpm -C timeflow/apps/backend test -- gmailPush.e2e.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add timeflow/apps/backend/src/controllers/gmailPushController.ts timeflow/apps/backend/src/routes/gmailSyncRoutes.ts timeflow/apps/backend/src/config/env.ts timeflow/apps/backend/src/__tests__/gmailPush.e2e.test.ts
git commit -m "feat(backend): add gmail pubsub push handler"
```

---

### Task 4: Add watch enable/disable endpoints

**Files:**
- Modify: `timeflow/apps/backend/src/routes/gmailSyncRoutes.ts`
- Modify: `timeflow/apps/backend/src/services/gmailWatchService.ts`
- Create: `timeflow/apps/backend/src/__tests__/gmailWatchRoutes.e2e.test.ts`

**Step 1: Write the failing test**

```ts
// timeflow/apps/backend/src/__tests__/gmailWatchRoutes.e2e.test.ts
it('enables Gmail watch for authenticated user', async () => {
  gmailWatchServiceMock.startGmailWatch.mockResolvedValue({ watchEnabled: true });
  const res = await server.inject({ method: 'POST', url: '/api/gmail-sync/watch/enable', headers: { authorization: authHeader() } });
  expect(res.statusCode).toBe(200);
});
```

**Step 2: Run test to verify it fails**

Run: `pnpm -C timeflow/apps/backend test -- gmailWatchRoutes.e2e.test.ts`
Expected: FAIL (route missing)

**Step 3: Write minimal implementation**

```ts
// timeflow/apps/backend/src/routes/gmailSyncRoutes.ts
server.post('/gmail-sync/watch/enable', { preHandler: requireAuth }, async (req, reply) => {
  const state = await startGmailWatch(req.user!.id);
  reply.send(state);
});

server.post('/gmail-sync/watch/disable', { preHandler: requireAuth }, async (req, reply) => {
  const state = await stopGmailWatch(req.user!.id);
  reply.send(state);
});
```

**Step 4: Run test to verify it passes**

Run: `pnpm -C timeflow/apps/backend test -- gmailWatchRoutes.e2e.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add timeflow/apps/backend/src/routes/gmailSyncRoutes.ts timeflow/apps/backend/src/services/gmailWatchService.ts timeflow/apps/backend/src/__tests__/gmailWatchRoutes.e2e.test.ts
git commit -m "feat(backend): add gmail watch enable/disable endpoints"
```

---

### Task 5: Watch renewal scheduler

**Files:**
- Create: `timeflow/apps/backend/src/services/gmailWatchScheduler.ts`
- Modify: `timeflow/apps/backend/src/server.ts`
- Create: `timeflow/apps/backend/src/services/__tests__/gmailWatchScheduler.test.ts`

**Step 1: Write the failing test**

```ts
// timeflow/apps/backend/src/services/__tests__/gmailWatchScheduler.test.ts
it('renews watches expiring within the window', async () => {
  prismaMock.gmailLabelSyncState.findMany.mockResolvedValue([
    { userId: 'user-1', watchEnabled: true, watchExpiration: new Date(Date.now() + 5 * 60 * 1000) },
  ]);
  await renewExpiringWatches();
  expect(startGmailWatch).toHaveBeenCalledWith('user-1');
});
```

**Step 2: Run test to verify it fails**

Run: `pnpm -C timeflow/apps/backend test -- gmailWatchScheduler.test.ts`
Expected: FAIL (module missing)

**Step 3: Write minimal implementation**

```ts
// timeflow/apps/backend/src/services/gmailWatchScheduler.ts
export async function renewExpiringWatches() {
  // find watchEnabled states with watchExpiration <= now + window
  // call startGmailWatch for each
}

export function startWatchRenewalJob() {
  // setInterval using env.GMAIL_WATCH_RENEWAL_INTERVAL_MINUTES
}
```

Wire into server startup (`server.ts`) behind env flag (e.g., `GMAIL_WATCH_RENEWAL_ENABLED`).

**Step 4: Run test to verify it passes**

Run: `pnpm -C timeflow/apps/backend test -- gmailWatchScheduler.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add timeflow/apps/backend/src/services/gmailWatchScheduler.ts timeflow/apps/backend/src/server.ts timeflow/apps/backend/src/services/__tests__/gmailWatchScheduler.test.ts
git commit -m "feat(backend): add gmail watch renewal job"
```

---

### Task 6: Web UI toggle for background sync

**Files:**
- Modify: `timeflow/apps/web/src/lib/api.ts`
- Modify: `timeflow/apps/web/src/app/settings/email-categories/page.tsx`
- Create: `timeflow/apps/web/src/app/settings/__tests__/gmailWatchToggle.test.tsx`

**Step 1: Write the failing test**

```tsx
// timeflow/apps/web/src/app/settings/__tests__/gmailWatchToggle.test.tsx
render(<EmailCategoriesSettings />);
expect(screen.getByText(/background sync/i)).not.toBeNull();
```

**Step 2: Run test to verify it fails**

Run: `pnpm -C timeflow/apps/web test -- gmailWatchToggle.test.tsx`
Expected: FAIL (UI missing)

**Step 3: Write minimal implementation**

```ts
// timeflow/apps/web/src/lib/api.ts
export async function enableGmailWatch() { return request('/gmail-sync/watch/enable', { method: 'POST' }); }
export async function disableGmailWatch() { return request('/gmail-sync/watch/disable', { method: 'POST' }); }
```

```tsx
// timeflow/apps/web/src/app/settings/email-categories/page.tsx
// Add "Background sync" toggle + status text
// Wire to enableGmailWatch/disableGmailWatch and refresh sync status
```

**Step 4: Run test to verify it passes**

Run: `pnpm -C timeflow/apps/web test -- gmailWatchToggle.test.tsx`
Expected: PASS

**Step 5: Commit**

```bash
git add timeflow/apps/web/src/lib/api.ts timeflow/apps/web/src/app/settings/email-categories/page.tsx timeflow/apps/web/src/app/settings/__tests__/gmailWatchToggle.test.tsx
git commit -m "feat(web): add gmail background sync toggle"
```

---

### Task 7: Docs and deployment guidance

**Files:**
- Modify: `timeflow/docs/DEPLOYMENT.md`
- Modify: `timeflow/docs/SPRINT_16_GMAIL_LABEL_SYNC_IMPLEMENTATION_GUIDE.md`

**Step 1: Update docs**

Add:
- Pub/Sub topic + push subscription setup
- OIDC config (audience + service account email allowlist)
- Shared secret header fallback
- Required env vars

**Step 2: Commit**

```bash
git add timeflow/docs/DEPLOYMENT.md timeflow/docs/SPRINT_16_GMAIL_LABEL_SYNC_IMPLEMENTATION_GUIDE.md
git commit -m "docs: add gmail watch and pubsub setup"
```

---

## Notes / Cohesion Checks
- Ensure `syncFromHistory` uses existing categorization + overrides to keep Phase A and Phase B in sync.
- Do not auto-enable watch; require explicit user toggle in settings.
- Keep dedupe logic simple: ignore `historyId` <= stored `lastHistoryId`.
- On history 404 (too old), fallback to `syncGmailLabels` with bounded backfill and reset `lastHistoryId` to the incoming `historyId`.

---

**Plan complete and saved to `docs/plans/2026-01-02-sprint-16-phase-b-gmail-watch-pubsub.md`. Two execution options:**

**1. Subagent-Driven (this session)** - I dispatch a fresh subagent per task, review between tasks, fast iteration

**2. Parallel Session (separate)** - Open new session with executing-plans, batch execution with checkpoints

Which approach?
