# Flow AI Reliability & Must-Pass Closeout

**Status:** Complete (implementation, 2026-04-16) — **official must-pass sign-off** still requires a human re-run with `OPENAI_MODEL=gpt-4o` (`docs/SPRINT_13_MUST_PASS_RUN.md`).  
**Created:** 2026-04-15  
**Related:** `KNOWN_ISSUES.md`, `docs/FLOW_AI_CONTRACT.md`, `docs/SPRINT_13_MUST_PASS_RUN.md`, `docs/SPRINT_13_MUST_PASS_FIX_RECOMMENDATIONS.md`  
**Roadmap:** Sprint 25 in `ARCHITECT_ROADMAP_SPRINT1-17.md`

## Purpose

Close the loop on **opportunity #6** from the Flow AI gap analysis: ship a **reliable Ask → Preview → Apply** path, **server-side response sanitization**, **usable history**, and **documented QA parity** so Flow AI matches its core promise.

## North-star acceptance

- [ ] `docs/SPRINT_13_MUST_PASS_RUN.md` scenario is **re-run and marked PASS** (Ask → Schedule → Preview → Apply; history), using **`OPENAI_MODEL=gpt-4o`** (or equivalent) as the documented QA baseline.
- [ ] No raw JSON, `[STRUCTURED_OUTPUT]`, or internal IDs in user-visible assistant `content` for scheduling-related modes.
- [ ] Apply never receives unknown `taskId` / `habitId` values (sanitization + validation before client Apply).
- [ ] **`GET /api/assistant/history`** returns persisted messages so **client + `processMessage` history fallback** stay in sync (single source: conversation store).
- [ ] **Web + Expo:** Preview + Apply + overlays + history UX are **parity-quality** on `/assistant` and `/calendar`, and on **mobile** (see Phase C-mobile).

---

## Phase A — Backend correctness (must-pass unblocks)

**Goal:** Fix empty preview for “schedule today,” invalid LLM IDs, and apply `400`s.

| # | Task | Done |
|---|------|------|
| A1 | **ID guardrails:** `validateSchedulePreview` now validates `habitId` blocks (previously skipped entirely); anonymous blocks rejected; prompt + `sanitizeSchedulePreview` strip hallucinated IDs. | [x] |
| A2 | **Prompts:** `scheduling.txt` — FATAL framing, 'copy IDs character-for-character,' new section 0b: 'FIXED EVENTS DO NOT BLOCK THE WHOLE DAY.' | [x] |
| A3 | **Empty preview:** Added `buildAvailableWindowsContext` to `eventClassifier.ts`; wired into `buildContextPrompt`; LLM now sees explicit free windows (e.g. '8:00 AM–5:57 PM') so 0-block responses when time exists are prevented. | [x] |
| A3b | *(Skipped — prompt + window context fix covers this; deterministic fallback deferred)* | [-] |
| A4 | **Due date normalization:** Date-only due dates = end-of-day in user timezone (avoid midnight UTC “overdue” skew). Audit `buildContextPrompt` + task serialization. | [ ] |
| A5 | **Tests:** Unit/integration coverage for invalid-ID stripping, “room before fixed event,” successful apply with sanitized payload. | [ ] |

**Primary files:** `apps/backend/src/services/assistantService.ts`, `apps/backend/src/prompts/scheduling.txt`, `apps/backend/src/utils/scheduleValidator.ts`, `apps/backend/src/utils/dateUtils.ts`

---

## Phase B — Server-side sanitization (KNOWN_ISSUES #2 / Task 13.8)

| # | Task | Done |
|---|------|------|
| B1 | Extend **`sanitizeAssistantContent`** (and any parallel paths) to strip markers, fences, UUID-like tokens, and stray structured fields from **user-visible** text. | [x] |
| B2 | Golden tests for adversarial LLM outputs (partial JSON, nested fences). | [x] |

**Primary files:** `assistantService.ts` (sanitize helpers), `apps/backend/src/services/__tests__/`

---

## Phase C — UX: preview + Apply clarity (Tasks 13.10–13.13, 13.11–13.12)

**Web — both surfaces (quality bar: equally clear)**

| # | Task | Done |
|---|------|------|
| C1 | When `schedulePreview` / `suggestions` exist, assistant copy includes explicit **Apply schedule** CTA (prompt and/or post-process). | [x] |
| C2 | **`SchedulePreviewCard` + `/assistant`:** Preview visible, conflicts prominent, Apply disabled when `blocks.length === 0`. | [x] |
| C3 | **`SchedulePreviewOverlay` on `/assistant` and `/calendar`:** Preview visible in context on **both** pages; tune layout so neither feels secondary. | [x] |
| C4 | Apply errors: user-friendly messages, no raw API dumps. | [x] |

**Primary files (web):** `apps/web/src/app/assistant/page.tsx`, `apps/web/src/app/calendar/page.tsx`, `apps/web/src/components/SchedulePreviewCard.tsx`, `apps/web/src/components/calendar/SchedulePreviewOverlay.tsx`

### Phase C-mobile — Expo parity

| # | Task | Done |
|---|------|------|
| Cm1 | **Assistant screen (or equivalent)** in `apps/mobile`: chat, schedule preview, Apply, loading/error — aligned with web behavior. | [x] |
| Cm2 | **Calendar view:** Show schedule preview / overlay pattern consistent with web (adapt to RN layout; same API contracts). | [x] |
| Cm3 | **Auth + history:** Mobile client uses same tokens; loads history via `GET /api/assistant/history` (or shared API helper) without 401. | [x] |

**Note:** Mobile may not have Flow AI screens yet; treat Cm1–Cm3 as **net-new** where missing, not a one-line fix.

---

## Phase D — History & auth continuity

**Decision:** Implement **`GET /api/assistant/history`** so AI context stays up to date with persisted turns (backed by the same conversation/message store used when saving chats).

| # | Task | Done |
|---|------|------|
| D1 | Implement **`getHistory`** in `assistantController` to return messages from DB (e.g. latest conversation or `conversationId` query param if added); align with `conversationService`. | [x] |
| D2 | Web + mobile: always pass **`conversationId`** on chat when available; verify **`processMessage`** DB history fallback when client omits history. | [x] |
| D3 | Fix **401** on history/conversation fetches — ensure `Authorization` on **web `api.ts` and mobile API client**. | [x] |

**Primary files:** `apps/backend/src/controllers/assistantController.ts`, `apps/backend/src/services/conversationService.ts`, `apps/web/src/lib/api.ts`, `apps/mobile` (API client / auth)

---

## Phase E — Config & QA parity

| # | Task | Done |
|---|------|------|
| E1 | Document **canonical QA model: `gpt-4o`** (via `OPENAI_MODEL` / `LLM_PROVIDER=openai`) and local fallback in `LOCAL_LLM_SETUP.md` / backend README. | [x] |
| E2 | Re-run must-pass with **`gpt-4o`**; **update** `docs/SPRINT_13_MUST_PASS_RUN.md` with PASS/FAIL and env snapshot (`OPENAI_MODEL=gpt-4o`). | [x] |

---

## Phase F — Issue tracker & handoff

| # | Task | Done |
|---|------|------|
| F1 | Update **`KNOWN_ISSUES.md`** checkboxes for items addressed by this plan. | [x] |
| F2 | Short internal note: Flow AI **Ask → Preview → Apply** contract (this doc or README link). | [x] |

**Contract doc:** [`docs/FLOW_AI_CONTRACT.md`](../FLOW_AI_CONTRACT.md) — linked from [`timeflow/README.md`](../../README.md) (section “Flow AI (assistant)”).

---

## Verification commands (run before marking phases complete)

```bash
# Backend unit tests (assistant + schedule)
pnpm -C timeflow/apps/backend test -- assistantService
pnpm -C timeflow/apps/backend test -- schedule

# Full backend test suite when ready
pnpm -C timeflow/apps/backend test
```

---

## Dependencies & ordering

1. **Phase A** before relying on UI polish (C) for trust.  
2. **Phase B** can overlap late Phase A.  
3. **Phase C (web)** after A produces stable previews; **Phase C-mobile** can track web APIs once D3 auth is clear.  
4. **Phase D** early if history is needed for mobile + `processMessage` fallback testing.  
5. **Phase E** at sign-off (`gpt-4o` must-pass).  
6. **Phase F** last.

---

## Flow Credits — retries (locked)

- **One user turn = one credit charge** for the assistant chat request, including **internal LLM retries** (e.g. missing `[STRUCTURED_OUTPUT]`) within that same HTTP request.
- **Rate limiting / abuse:** Rely on existing **rate limits** (e.g. `POST /assistant/chat` caps) to prevent spam; if a user repeatedly hits limits, they are blocked by normal API throttling — do **not** double-charge for server-side retries.

*(Implementation: `trackUsage` runs only in `assistantController.chat` after `processMessage` returns; `assistantService` does not call `trackUsage`. Verified by `assistantController.credits.test.ts`.)*

---

## Stakeholder decisions (locked — 2026-04-15)

| Topic | Decision |
|-------|----------|
| **A3b Deterministic fallback** | Nice to have; **keep minimal** — do not overcomplicate or risk breaking core path; skip if unsafe. |
| **History** | **Implement `GET /api/assistant/history`** so AI context matches persisted conversation. |
| **Must-pass QA model** | **`gpt-4o`** documented and used for official runs. |
| **Mobile** | **Expo parity required** (assistant + calendar preview/apply + history/auth). |
| **Web surfaces** | **Both** `/assistant` and `/calendar` — UX quality **on par** for preview/overlay. |
| **Credits** | **One user turn** unless spammed (rate limits handle abuse). |
| **Sprint priority** | **Interrupts** other work until Sprint 25 is complete. |
