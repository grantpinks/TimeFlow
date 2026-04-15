# Sprint 17–18 Closure: Identity Milestones, Streaks, Sick Days, Weekly Email, Empty States, Analytics

> **Handoff for:** implementation agent (Cursor / Codex / Claude)  
> **Created:** 2026-04-12  
> **Skill:** Use `executing-plans` or work phase-by-phase with checkpoints; run `verification-before-completion` before claiming done.

---

## 0. Product decisions (authoritative — do not reinterpret)

Stakeholder answers:

| Topic | Decision |
|--------|----------|
| **17.12 Missed high-priority habits** | **Habits page only** for in-app surfacing; **in-app only** (no transactional email for “missed”); **global toggle only** (no per-habit notification prefs in this pass). |
| **18.35 / 18.36 / 18.C1** | **Real badges + shipped UX**; include **off/sick day** feature so streaks can stay fair; **not** docs-only. |
| **18.43 Empty states** | **Strict pass**: every relevant app route / major surface documented and brought in line. |
| **Analytics** | **Yes** — add **key events** for milestones, streaks, sick days, weekly email. |
| **Weekly email recap** | **In scope** for this pass (alongside the above). |

---

## 1. Current baseline (read before coding)

### Already implemented (verify, do not duplicate)

- **17.12 (partial):** `habitNotificationService.getMissedHighPriorityNotifications`, `notifyMissedHighPriority` on `User`, `MissedHighPriorityBanner` on **`/habits`** (`HabitsInsights.tsx`), settings toggles. **Do not add Today banner** for missed (out of scope).
- **18.13:** Inbox `EmailListItem` shows identity hint (“Supports {identity}”) via `suggestIdentityFromEmail`.
- **Identity progress:** `identityService.getIdentityProgress`, `GET /api/identities/progress` — day-scoped completions for tasks + habits.
- **Analytics:** PostHog via `apps/web/src/lib/analytics.ts` — extend `AnalyticsEvent` + `track()` helper; existing habit events include `habits.notification.missed_banner.*`.
- **Outbound email:** `gmailService.sendEmail(userId, { to, subject, html, ... })` — sends **via the user’s Gmail**. Suitable for “weekly recap to self” when user has Gmail connected.

### Gaps to close

1. Roadmap / acceptance criteria still list 17.12 and Sprint 18 stretch as open — update **`ARCHITECT_ROADMAP_SPRINT1-17.md`** when features land.
2. No **persisted** identity milestone badges, identity streaks, or sick-day records.
3. No **weekly recap** job or user preference.
4. **Empty states:** strict audit vs `BrandedEmptyState` / `FlowMascot` / `LoadingSpinner` patterns (`docs/DESIGN_SYSTEM_PATTERNS.md`).

---

## 2. Architecture overview

### 2.1 Identity completion counts (for milestones)

Milestones (25 / 50 / 100 **per identity**) should count **qualifying completions**:

- **Tasks:** `status = completed`, `identityId` matches, count once per task completion event (use `updatedAt` or a dedicated completion timestamp if available).
- **Habits:** `HabitCompletion` with `status = completed` where `habit.identityId` matches.

**Recommendation:** Add a durable **`identityCompletionTotal`** (integer) on `Identity` updated in the same transactions/paths that already update identity-relevant completions (task complete, habit complete), *or* backfill via aggregated query once then increment. Prefer **increment on completion** for performance and simplicity.

### 2.2 Milestone badges (18.35 + 18.C1)

- Store **`highestMilestoneTier`** per identity: `0 | 25 | 50 | 100` (or nullable + separate unlock table if you want history).
- On tier crossing, emit **analytics** + optional **in-app toast/modal** (extend `IdentityCelebrationModal` or add `IdentityMilestoneModal`).
- UI surfaces: **Today** identity pills (small badge or dot), **Settings → Identities** row, **Habits** header area — keep consistent with design system.

### 2.3 Identity streak (18.36)

- **Definition (default):** For each identity, count **consecutive local calendar days** (user `timeZone`) where `completedCount >= 1` for that identity (from existing progress logic or completion events).
- **Stored state:** `currentIdentityStreak`, `longestIdentityStreak`, `lastQualifyingLocalDate` per `identityId` (on a new table or JSON on `Identity` — prefer **normalized table** `IdentityStreakState` if you need history later).
- **Daily reconciliation:** Either on completion hooks (update streak) + cron **or** cron-only from events. Hooks are more responsive; cron is a safety net for missed webhooks.

### 2.4 Sick / off days (feature)

- New model, e.g. **`UserRestDay`**: `userId`, `localDate` (date-only string `YYYY-MM-DD`), `reason` optional enum (`sick` | `travel` | `rest` | `other`), `createdAt`.
- **Rule:** A rest day **does not increment** streak but also **does not break** streak (treat as “free pass” for that local day — streak carries forward).
- **Limits (implement in plan):** e.g. max **2 rest days per rolling 30 days** per user (tunable constant). Return 400 with clear message if exceeded.
- UI: **Settings** section or **Today** subtle control (“Mark today as rest day”) + list/manage upcoming.

### 2.5 Weekly email recap

- **User flag:** e.g. `notifyWeeklyIdentityRecap Boolean @default(false)` on `User`.
- **Schedule:** Weekly send (e.g. **Sunday 18:00** or **Monday 08:00** in **user `timeZone`**).
- **Implementation options (pick one in implementation, document in code):**
  - **A)** `node-cron` in `server.ts` (simple; single-instance caveat on Render — use **Render cron job** hitting a **secured** `POST /internal/cron/weekly-recap` if multi-instance).
  - **B)** External cron (Render Cron / GitHub Actions) calling secured endpoint — **preferred for production**.
- **Content:** Summarize last 7 days: per-identity completions, streak, milestones hit, link to `https://APP_BASE_URL/today` (use `APP_BASE_URL` env).
- **Send path:** `gmailService.sendEmail(user.id, { to: user.email, subject, html })` — **requires valid Gmail tokens**; skip users without Gmail or with expired refresh token (log + metric).
- **Compliance:** Footer with “Manage email preferences in TimeFlow Settings” + respect `notifyWeeklyIdentityRecap`.

---

## 3. Phased implementation checklist

### Phase A — Sprint 17.12 closure (no new UX for missed)

**Tasks:**

1. Confirm `MissedHighPriorityBanner` + prefs match stakeholder scope (Habits only, in-app, global).
2. Add **analytics** if any gaps: e.g. ensure `habits.notification.missed_banner.shown` fires when banner renders (rate-limited path).
3. Update **`ARCHITECT_ROADMAP_SPRINT1-17.md`**: mark **17.12 ✅**, Sprint 17 goals line for retention loop if satisfied; align **Acceptance Criteria** checkboxes.

**Verify:** Manual test on `/habits` with mocked or real missed high-priority habit + toggle off/on.

---

### Phase B — Database migrations

**Tasks:**

1. Prisma migration(s) for:
   - `Identity`: `completionCountTotal Int @default(0)` (or name per convention), `milestoneTier Int @default(0)` (0 = none unlocked; 25/50/100 encoded as enum or int).
   - New: `IdentityStreakState` or fields on `Identity` for `currentStreak`, `longestStreak`, `lastProgressLocalDate`.
   - New: `UserRestDay` (unique on `userId` + `localDate`).
   - `User`: `notifyWeeklyIdentityRecap Boolean @default(false)`, optional `lastWeeklyRecapSentAt DateTime?` for idempotency.
2. Backfill script (one-off script or migration SQL): compute `completionCountTotal` from historical data **or** run async job post-deploy (document).

**Verify:** `pnpm exec prisma migrate dev` locally; CI migration dry-run if available.

---

### Phase C — Backend services

**Tasks:**

1. **`identityMilestoneService.ts`:** On task/habit completion paths already touching identity, increment `completionCountTotal`, detect tier crossings, persist `milestoneTier`, emit internal event for analytics/logging.
2. **`identityStreakService.ts`:** Update streak on completion; apply rest-day rules; optional nightly **reconcile** job to fix drift.
3. **`userRestDayService.ts`:** CRUD for rest days; enforce monthly limit.
4. **`weeklyRecapService.ts`:** Build HTML body; select users where `notifyWeeklyIdentityRecap &&` eligible; dedupe with `lastWeeklyRecapSentAt` (e.g. don’t send twice in 6 days).
5. **Controllers/routes:**
   - `GET/POST/DELETE /api/user/rest-days` (or under `/api/identities/rest-days`).
   - `PATCH /api/user` or dedicated route for `notifyWeeklyIdentityRecap`.
   - Secured `POST /api/internal/cron/weekly-recap` (secret header or `CRON_SECRET`) for Render cron.

**Verify:** Unit tests for milestone math, streak + rest day edge cases (timezone boundaries), weekly recap “no double send”.

---

### Phase D — Web app UI

**Tasks:**

1. **Milestone badges:** Components showing tier; wire to new API fields on `getIdentityProgress` response (extend DTO in `@timeflow/shared`).
2. **Celebration:** Extend completion flow to show milestone modal when tier increases (coordinate with `IdentityCelebrationModal`).
3. **Streak:** Show current streak per identity on Today pills / Identity dashboard banner (minimal, on-brand).
4. **Rest day:** Settings panel + optional Today quick action; explain streak impact in copy.
5. **Weekly recap toggle:** Settings (Notifications or Email section) with clear Gmail dependency disclaimer.

**Verify:** `pnpm --filter @timeflow/web run build`; smoke test flows.

---

### Phase E — Analytics (PostHog)

**Tasks:**

1. Extend `AnalyticsEvent` in `analytics.ts`:
   - `identity.milestone_unlocked` — `{ identity_id_hash, tier: 25 \| 50 \| 100 }`
   - `identity.streak_updated` — `{ identity_id_hash, current_streak, longest_streak }` (or split updated vs broken)
   - `identity.rest_day_marked` — `{ local_date, reason }`
   - `email.weekly_recap.sent` — `{ success: boolean }` (client won’t fire; **server** can log or use PostHog server SDK if added — if server-only logging, document and use structured logs + optional PostHog capture from backend)
2. Fire client events at UX points; backend milestone/streak logic should call a small **shared analytics helper** or structured logger.

**Note:** If PostHog server SDK is not in backend, either add lightweight `posthog-node` for server events **or** document that `email.weekly_recap.sent` is log-based until Sprint 19.

---

### Phase F — Strict empty-state pass (18.43)

**Tasks:**

1. Build a **checklist table** in the PR description or `THEME_AUDIT_REPORT.md` appendix listing every **app shell route** and key modals:
   - From `apps/web/src/app/**/page.tsx` (e.g. `/`, `/today`, `/tasks`, `/calendar`, `/inbox`, `/habits`, `/assistant`, `/meetings`, `/categories`, `/settings`, `/settings/*`, `/pricing`, marketing pages).
2. For each: **loading** → `LoadingSpinner`; **empty** → `BrandedEmptyState` or contextual `FlowMascot` + copy; **error** → consistent inline error.
3. Fix stragglers (inline spinners, emoji placeholders).
4. Mark **18.43 ✅** in roadmap when checklist is complete.

---

### Phase G — Weekly recap operation

**Tasks:**

1. Document **Render cron** (or equivalent): URL, schedule, `CRON_SECRET` env.
2. Add monitoring log line: user count processed, sends succeeded/failed/skipped.

---

### Phase H — Documentation & roadmap

**Tasks:**

1. Update **`ARCHITECT_ROADMAP_SPRINT1-17.md`**: Sprint 18 stretch items **18.35, 18.36, 18.C1, 18.43** → ✅; note weekly recap under Sprint 18 or a short “Shipping” subsection.
2. Update **`DESIGN_SYSTEM_PATTERNS.md`**: milestone badge, rest day, weekly email preference copy patterns.
3. **`KNOWN_ISSUES.md`:** Remove or update any items superseded.

---

## 4. Edge cases (must test)

- User changes `timeZone` mid-week — streaks use **current** timezone for “local date” going forward; document behavior for historical days.
- Completion at **UTC boundary** vs local midnight — align with `getIdentityProgress` day window (consider reusing same boundary logic).
- Gmail token expired — weekly recap skips user; optional in-app notice “Reconnect Gmail for weekly emails.”
- Rest day on a day user **also** completed — define rule: rest day still consumes the “pass” or completion wins (recommend: **completion counts; rest day is redundant**).

---

## 5. Verification commands

```bash
cd timeflow && pnpm --filter @timeflow/backend exec prisma validate
cd timeflow && pnpm --filter @timeflow/web run build
cd timeflow && pnpm --filter @timeflow/backend test   # if tests exist for new services
```

---

## 6. Out of scope (do not implement in this pass)

- Per-habit notification toggles for missed habits.
- Push notifications (mobile).
- Transactional email provider separate from Gmail (e.g. Resend) — unless Gmail send is blocked; then document blocker.
- Today page **missed** banner (explicitly excluded).

---

## 7. Suggested commit strategy

1. `feat(backend): identity milestones, streaks, rest days, weekly recap job`
2. `feat(web): milestone UI, rest day controls, weekly recap setting`
3. `chore: empty state audit + roadmap/docs`
4. `feat(analytics): identity milestone and streak events`

---

## 8. Open technical choice for implementer

**Streak computation:** Event-driven increments vs daily batch. Recommended: **event-driven** on completion + **nightly reconcile** cron for correctness.

---

*End of plan.*
