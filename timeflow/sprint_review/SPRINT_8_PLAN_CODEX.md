# Sprint 8 Plan (Codex)

**Focus**: Hardening, testing, and safeguards following Sprint 7 delivery (habit suggestions + Gmail inbox).
**Duration**: 2 weeks

## Goals
- Close testing gaps (unit + integration/E2E) for habit suggestions and Gmail inbox.
- Enforce Gmail rate-limit protection and observability.
- Reduce auth/security debt where feasible without blocking Claude’s UI work.

## Scope (Codex)
1) Testing
   - Stabilize scheduling unit tests (incl. dailySchedule overrides, invalid bounds).
   - Add backend inbox E2E coverage (auth happy path, rate-limit 429, pagination params).
   - Evaluate feasibility of lightweight web inbox E2E (mock backend) without adding heavy deps; propose if needed.
2) Reliability & Safeguards
   - Gmail rate-limit guardrails (per-user/window config) with retry hints.
   - Surface 429 handling to clients (status + retryAfterSeconds).
3) Security/Validation Quick Wins
   - Add request validation to email inbox endpoint (already Zod-validated) and extend patterns if small lift.
   - Identify next auth hardening steps (JWT, token expiry) for Sprint 9 handoff.

## Deliverables
- Tests added/passing locally for scheduling + inbox.
- Rate-limiting helper + controller 429 responses (configurable env documented).
- Short notes on remaining auth/validation debt to schedule next sprint.

## Out of Scope (Claude owns)
- Habit review UI.
- Inbox caching/pagination UI polish.

## Definition of Done
- `pnpm -r test` passes locally (or documented platform limitation + mitigation).
- Gmail rate limit defaults documented in `.env.example`.
- E2E/integration test covers inbox happy path and rate-limit behavior.

## Progress Update 1 (current)
- Scheduling + inbox tests added and passing (`pnpm -r test`).
- Gmail per-user rate limiting implemented with 429 + retry hints; env knobs documented.
- Backend inbox E2E added (auth, happy path, rate-limit case).
- Next targets: assess lightweight web inbox E2E/mocks feasibility; outline auth/JWT hardening steps for Sprint 9.

---

## Premium Interactions (Sprint 8) — Task Plan (8.1-8.5)

### 8.1 Integrate Framer Motion into shared layout for page transitions (P0)
- Approach: Add `framer-motion` to web app, wrap `_app`/root layout shell with `AnimatePresence` and define page transition variants (fade/slide, 200-250ms). Use `prefers-reduced-motion` media query to disable animations.
- Touchpoints: `apps/web/src/app/layout.tsx` (or shared Layout component), nav link active states to coordinate exit/enter.
- Dependencies: Add `framer-motion` dependency; verify Next 14 SSR compatibility (use dynamic no-ssr for heavy parts only if needed).
- QA: Page navigation shows smooth transitions; reduced-motion users see no motion; no hydration warnings.

### 8.2 AnimatePresence-based modal/side-panel animations (P0)
- Approach: Create reusable `ModalMotionWrapper` using `AnimatePresence` + variants (backdrop fade 150ms, panel slide-up/slide-in 200ms). Plug into existing modals/side panels (task details, settings drawers if present).
- Touchpoints: Common modal component path (e.g., `apps/web/src/components`), ensure focus trap + scroll lock preserved.
- QA: Open/close animates smoothly; ESC/overlay click still works; reduced-motion bypasses animation.

### 8.3 Implement DnD for tasks onto calendar using `dnd-kit` (P0)
- Approach: Swap/augment current DnD (currently using `react-dnd`) with `dnd-kit` for calendar drop precision. Introduce `DragOverlay` for cursor-follow preview. Map tasks to draggable items; calendar slots to droppable targets with slot metadata.
- Touchpoints: `apps/web/src/app/today/page.tsx` (or calendar page), shared calendar component. Add adapter to convert drop result into schedule API call (or temporary local state if commit flow exists).
- Dependencies: Add `@dnd-kit/core`, `@dnd-kit/sortable`, `@dnd-kit/modifiers`; keep `react-dnd` only if still used elsewhere or plan removal.
- QA: Drag start/over/drop events fire; tasks land in correct time slot; keyboard accessibility preserved or documented follow-up.

### 8.4 Add ghost previews + snap-to-slot guides during DnD (P1)
- Approach: Use `DragOverlay` for ghost; render guide lines/slot highlight on hover droppable. Implement snapping modifier (e.g., 15-min grid). Show slot time tooltip near cursor.
- Touchpoints: DnD configuration module; calendar slot rendering for highlight state; style tokens to keep consistent.
- QA: Ghost mirrors task card; snap respects calendar granularity; guides only appear while dragging; no layout shift.

### 8.5 Task-complete micro-interaction (checkbox + subtle celebration) (P1)
- Approach: Create motion-enhanced checkbox component (scale/bounce 120-150ms) plus optional confetti burst (low-density) or glow ripple; gate behind reduced-motion. Trigger on complete action in task list and calendar.
- Touchpoints: Task item component(s) in `apps/web/src/components` or page-level list; ensure backend update call unchanged.
- QA: Animation plays once on complete; reduced-motion skips; no double submit; state stays in sync with API response.

### Cross-cutting considerations
- Accessibility: Respect `prefers-reduced-motion`; maintain focus outlines; ensure keyboard DnD fallback or documented follow-up.
- Performance: Keep motion durations <250ms; avoid heavy box-shadows; use CSS variables for easing/opacity to theme later.
- Testing: Add story-style visual checks (optional) plus unit/integration for DnD drop handler logic and completion handler side effects.
