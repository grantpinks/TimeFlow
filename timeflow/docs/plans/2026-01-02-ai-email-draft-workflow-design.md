# Sprint 16 Phase B+: AI Email Draft Workflow (Design)

**Date**: 2026-01-02  
**Status**: Design Complete, Ready for Implementation  
**Scope**: Generate Draft → Full Preview → (Send from TimeFlow) or (Create Gmail Draft) or (Open in Gmail to refine)  

---

## Summary

Add an **AI Email Draft** workflow inside `/inbox` thread detail that:

- Understands the **intent** of the selected email/thread
- Drafts a reply in the user’s **voice and word choice**
- Forces a **Full Preview** step before any Gmail write operation
- Supports three end actions:
  - **Send from TimeFlow** (after preview + confirmation checkbox)
  - **Create Gmail Draft** (then open the draft in Gmail)
  - **Open in Gmail to refine** (no server-side send)

This is designed to be trust-first and cost-controlled: server-side quotas, token caps, redacted logs, and explicit permissioning for any “learn from Sent mail” feature.

---

## Key Decisions

### Preview-first sending (must-have)
**Decision**: Sending/drafting in Gmail is only allowed from a **frozen preview payload** (no hidden regeneration).  
**Rationale**: Prevents “model drift” between preview and send, improves trust, reduces support risk.

### Reply default + reply-all toggle
**Decision**: Default to **Reply (sender only)** with a clear **Reply all** toggle and recipient preview.  
**Rationale**: Minimizes accidental broad replies, keeps power users fast.

### Voice learning strategy
**Decision**: Ship **B + C by default**, with **A as explicit opt-in** shown on first run (with warning).  
**Rationale**: B/C provides immediate value with low privacy risk; A offers best quality but requires higher trust and careful permissions.

### Output destinations (three options)
**Decision**: Provide **Send from TimeFlow**, **Create Gmail Draft**, and **Open in Gmail to refine**.  
**Rationale**: Covers different comfort levels and workflows; “Open in Gmail” remains an escape hatch.

---

## UX / Product Requirements

### Entry point
In thread detail (right panel), add **AI Email Draft**.

### Draft Panel states
- **Setup (first run only)**: if no voice profile exists, prompt to set up “Writing & Voice” inline (with option to skip and use defaults).
- **Generating**: show progress and allow cancel.
- **Editable draft**: editable text area + quick refine buttons.
- **Full Preview**: shows exact To/Cc/Bcc, Subject, and Body that will be sent/saved.
- **Final actions** (enabled only from preview):
  - Send from TimeFlow
  - Create Gmail Draft
  - Open in Gmail to refine

### “Send from TimeFlow” confirmation

**Decision**: Require a confirmation checkbox before enabling Send.  
**Copy (suggested)**: “I reviewed recipients and content. Send this email from my Gmail account.”

Also show:
- **Recipient count warning** when Reply-all adds many recipients (e.g., > 5)
- A final **modal** confirming: “Send to: …” and “Subject: …”

### Reply vs Reply-all rules (v1)
- **Reply (default)**:
  - `To` = `Reply-To` if present else sender from `From`
  - `Cc` = empty
- **Reply all (toggle)**:
  - `To` = `Reply-To`/`From`
  - `Cc` = original `To` + `Cc` minus the user’s own addresses
  - Always **dedupe** emails

### Settings location
**Decision**: Source-of-truth lives in **Settings**, with a first-run inline setup in the Draft Panel.

- Settings page: `Settings → Writing & Voice`
- First-run in Draft Panel:
  - Create a minimal voice profile (B) in ~2 minutes
  - Optionally paste samples (C)
  - Optionally enable Sent-mail learning (A) with warning + controls

---

## Voice Profile (B + C default, A opt-in)

### B: Style Builder (required)
Store structured preferences:
- Tone: formal ↔ casual
- Warmth: warm ↔ direct
- Verbosity: concise ↔ detailed
- Contractions: on/off
- Emojis: never / rarely / sometimes
- Greeting style (e.g., “Hi {FirstName},” vs “Hello,”)
- Closing style (e.g., “Best,” “Thanks,” “Sincerely,”)
- Signature rules (auto-append; multi-signature optional later)
- “Prefer phrases” + “Never say” phrases

### C: User-provided samples (optional, recommended)
User pastes 1–5 emails they’ve sent that represent their voice.

**Recommendation**: Store a derived “writing fingerprint” (privacy-first) rather than keeping full raw samples:
- Typical sentence length range
- Common transitions (“Quick note”, “Just checking in”)
- Hedging level (“maybe”, “might”, “when you get a chance”)
- Preferred closings and sign-offs

Optionally (future): store encrypted raw samples for reprocessing, but treat as higher sensitivity.

### A: Learn from Sent mail (optional opt-in, shown during first run)
Show a toggle with explicit warning + benefits:
- **Warning**: “TimeFlow will access a sample of messages from your Gmail Sent folder to learn your writing style.”
- **Benefits**: “More accurate voice matching, less rewriting, more consistent tone.”

Controls:
- Sample size: 20 / 50 / 100
- Optional exclude domains (e.g., `@company.com`)
- Revoke anytime (disables future pulls and deletes derived fingerprint if requested)

Implementation note: This runs as a background job; drafts can still work immediately using B/C while A completes.

---

## Data Model (Prisma)

Add new models to `apps/backend/prisma/schema.prisma` (names can be adjusted, but intent should stay).

### `WritingVoiceProfile` (new)
- `id`
- `userId` (unique)
- `styleJson` (JSON) — the B preferences
- `fingerprintJson` (JSON, nullable) — derived from C and/or A
- `sentMailLearningEnabled` (boolean)
- `sentMailLearningConfigJson` (JSON, nullable) — sample size, excluded domains
- `sentMailLastTrainedAt` (DateTime, nullable)
- timestamps

### `WritingSample` (optional new, only if storing raw samples)
- `id`
- `userId`
- `encryptedBody` (string)
- `source` enum: `user_paste` | `gmail_sent`
- timestamps

### `AiUsageCounter` (recommended new)
Track per-user daily/monthly usage for email drafting and quick rewrites:
- `userId`
- `periodStart` (Date)
- `periodType` enum: `day` | `month`
- `draftRequests` (int)
- `rewriteRequests` (int)
- `tokensApprox` (int, optional)

---

## Backend Architecture

### Existing Gmail routes we will reuse/extend
Current routes are in `apps/backend/src/routes/emailRoutes.ts` and include `POST /email/send`.

### New endpoints (proposed)
- `POST /email/draft/ai`
  - Input: `{ emailId, threadId?, replyMode: "reply"|"reply_all", instructions?, voiceOverrides? }`
  - Output: `{ intentSummary, keyPoints, questionsToAnswer, draftText, subject, recipients, safetyFlags, warnings }`

- `POST /email/draft/preview`
  - Input: `{ emailId, threadId?, replyMode, draftText, subject?, includeQuotedOriginal? }`
  - Output: `{ to, cc, subject, bodyHtml, bodyText, threadId?, inReplyTo? }`
  - **This output is the only allowed payload** for send/create-draft.

- `POST /email/drafts`
  - Input: preview payload
  - Output: `{ draftId, messageId, gmailUrl }`

- `POST /email/send`
  - Already exists
  - For this feature: require `{ ...previewPayload, confirmed: true }`

### Services (proposed)
- `aiEmailDraftService.ts`
  - Builds context (latest message + small thread context)
  - Loads voice profile
  - Calls the LLM with structured output
- Extend `gmailService.ts`
  - Add `createDraft(...)` using `gmail.users.drafts.create`
  - Reuse MIME-building logic from `sendEmail(...)`
- `voiceProfileService.ts`
  - CRUD for voice profile (B/C)
  - Background training job for A (Sent mail)

---

## Prompting / LLM Approach

### Structured output
Use JSON-only structured responses (similar to `aiCategorizationService.ts`) so the UI can reliably render:
- `intentSummary`
- `questionsToAnswer[]`
- `draftText`
- `safetyFlags[]`

### Prompt files
Add prompt files under `apps/backend/src/prompts/` (consistent with existing PromptManager usage):
- `email_draft_base.txt` (tone + safety + “no hallucinations” rules for drafting)
- `email_draft_generate.txt` (generate intent + draft JSON)
- `email_draft_rewrite.txt` (rewrite current draft given a delta instruction)

### Context window control (cost + privacy)
- Always include the **latest message** full body
- Include at most a short thread recap (subject/from/dates) or a cached summary
- Never include attachment contents (only filenames/types)

---

## Safety, Privacy, and Trust

### User-visible warnings (not blocking by default)
- Payment / banking / invoice requests
- Legal/medical advice context
- Highly sensitive personal data indicators
- Large recipient count on reply-all

### Logging policy
- Do **not** log raw email bodies or generated drafts.
- Store only minimal request metadata: requestId, userId, emailId/threadId hashes, token counts, timing, error codes.

### Permissions / OAuth scopes
Current `GOOGLE_SCOPES` already include `gmail.readonly`, `gmail.compose`, `gmail.modify`, so no new scopes are required for:
- Reading email content
- Creating drafts
- Sending replies

We still require explicit in-product confirmation (preview + checkbox) before sending.

---

## Testing / Acceptance Criteria

### Must-pass behavior
- Draft generation works for both `reply` and `reply_all`.
- Full Preview matches exactly what gets sent/saved.
- Send requires checkbox; without it the API rejects the request.
- Quotas block additional requests with a clear message.
- No raw email/draft content in logs.

### Manual test checklist
- From `/inbox`, open a thread → AI Email Draft:
  - Generate
  - Quick refine (concise/warm)
  - Toggle Reply-all and verify preview recipients change
  - Create Gmail Draft and open in Gmail
  - Send from TimeFlow (after checkbox) and verify reply is sent in the correct thread

---

## Rollout Plan (recommended)

### Phase B+ v0 (internal)
- B style builder only + draft generation + preview + “Open in Gmail to refine”

### Phase B+ v1 (beta)
- Add “Create Gmail Draft”
- Add “Send from TimeFlow” with checkbox + warnings
- Add C paste samples

### Phase B+ v2 (opt-in upgrade)
- Add A Sent-mail learning with warning + revoke + background job

