# Sprint 16 Phase B+: AI Email Draft Workflow (Design)

**Date**: 2026-01-02
**Status**: Design Complete, Ready for Implementation
**Scope**: Generate Draft → Edit → Full Preview → (Send from TimeFlow) or (Create Gmail Draft)

**Design Session**: Completed with brainstorming validation
**Beta Strategy**: Unified experience (all features available), future subscription tiering noted with TODOs

---

## Summary

Add an **AI Email Draft** workflow inside `/inbox` that:

- Opens an inline **Draft Panel** when user clicks "Draft Reply" on any email
- Generates AI-powered replies using LLM with customizable **Writing Voice Profile**
- Provides **Generate → Edit → Preview → Send/Draft** workflow with strict determinism
- Forces a **Full Preview + Confirmation Checkbox** before any send operation
- Supports two end actions:
  - **Send from TimeFlow** (after preview + confirmation checkbox)
  - **Create Gmail Draft** (opens draft in Gmail for refinement)

This is designed to be trust-first and cost-controlled: preview determinism (no regen after preview), server-side quotas (tracking only in beta), redacted logs, and explicit send confirmation.

---

## Key Decisions

### 1. Inline Draft Panel (Contextual UX)
**Decision**: Draft panel slides in from the right side of inbox (inline, not modal)
**Rationale**: Keeps users in inbox flow, feels more integrated than switching context to full-screen modal
**Alternative Considered**: Modal workflow (more immersive) - rejected as too disruptive

### 2. Preview Determinism (Maximum Safety)
**Decision**: Strict determinism - no regeneration after preview. Preview locks draft state.
**Rationale**: Prevents "model drift" between preview and send, ensures trust, reduces support risk
**Implementation**: SHA-256 hash (determinismToken) validates preview payload before send
**Alternative Considered**: Flexible regeneration - rejected due to accidental edit loss risk

### 3. Safe Send Confirmation (Option 4: Maximum Safety)
**Decision**: Require BOTH preview viewed AND confirmation checkbox before send enabled
**Rationale**: Prevents costly mistakes, especially important for email (can't undo)
**UX**: Checkbox text: "☐ I confirm this draft matches the preview and is ready to send"

### 4. Reply-All Toggle (Contextual Display)
**Decision**: Toggle only appears if original email has CC/multiple recipients
**Rationale**: Cleaner UI for 1:1 emails, less cognitive load
**Default**: Reply to sender only (safe default)

### 5. Writing Voice Profile (Hybrid Approach)
**Decision**: Default quick sliders + collapsible advanced section with voice samples
**Rationale**: Start simple (formality/length/tone), level up when ready (paste writing examples)
**Beta**: All features unified, no gating
**Future**: Lock advanced features behind premium tiers (noted with TODOs)

### 6. Quota Enforcement (Option 4: Beta Freedom)
**Decision**: Track usage counter but don't block in beta
**Rationale**: Gather real usage data to inform future pricing, maximize beta happiness
**Implementation**: `aiDraftsGenerated` counter in WritingVoiceProfile, no hard limits

### 7. Assistant Service Integration (Option 1: Unified AI)
**Decision**: Extend existing assistantService.ts with new 'email-draft' mode
**Rationale**: Consistent with existing AI patterns, reuses LLM infrastructure
**Alternative Considered**: Dedicated emailDraftService - rejected as duplicates code

### 8. Database Schema (Option 3: Start Simple, Scale Later)
**Decision**: One WritingVoiceProfile per user, add TODO comments for multi-profile support
**Rationale**: Simplest for beta, clear migration path to premium multi-profile feature

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

## Database Schema (Prisma)

### New Model: WritingVoiceProfile

```prisma
model WritingVoiceProfile {
  id                String   @id @default(cuid())
  userId            String   @unique

  // Voice preferences (1-10 scale, 5 = neutral)
  formality         Int      @default(5)  // 1=casual, 10=professional
  length            Int      @default(5)  // 1=concise, 10=detailed
  tone              Int      @default(5)  // 1=friendly, 10=formal

  // Advanced: user writing samples
  voiceSamples      String?  // Optional: 2-3 example emails

  // Usage tracking (for future quotas)
  aiDraftsGenerated Int      @default(0)

  createdAt         DateTime @default(now())
  updatedAt         DateTime @updatedAt

  user              User     @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@index([userId])

  // TODO: Post-beta - Add monthly quota limits per subscription tier
  // TODO: Post-beta - Add profile variants (work/personal contexts)
}
```

### User Model Update

```prisma
model User {
  // ... existing fields
  writingVoiceProfile WritingVoiceProfile?
}
```

**Implementation Notes:**
- Auto-create profile with defaults (5,5,5) if missing when generating first draft
- Slider values map to prompt labels:
  - Formality: 1-3=casual, 4-6=balanced, 7-10=professional
  - Length: 1-3=concise (2-3 sentences), 4-6=moderate (3-5), 7-10=detailed (5-7)
  - Tone: 1-3=friendly/warm, 4-6=professional/approachable, 7-10=formal/respectful
- voiceSamples: Plain text, user-provided, optional
- aiDraftsGenerated: Incremented on each draft generation, never decremented
- Future: Add quotaResetAt field when implementing subscription tiers

---

## API Endpoints

### 1. POST /email/draft/ai

Generate AI email draft using LLM.

**Request:**
```typescript
{
  emailId: string;              // Original email to reply to
  voicePreferences?: {          // Optional slider overrides
    formality?: number;         // 1-10
    length?: number;            // 1-10
    tone?: number;              // 1-10
  };
  additionalContext?: string;   // User instructions: "mention the deadline"
}
```

**Response:**
```typescript
{
  draftText: string;            // Plain text draft
  to: string;                   // Recipient email
  subject: string;              // Re: [original subject]
  cc?: string;                  // If reply-all (future)
  metadata: {
    generatedAt: string;        // ISO timestamp
    modelUsed: string;          // "gpt-4o" or "llama3.2"
  }
}
```

**Errors:**
- `404` - Email not found
- `403` - Gmail not connected
- `500` - LLM service unavailable
- `429` - Quota exceeded (post-beta)

---

### 2. POST /email/draft/preview

Generate deterministic preview and lock draft state.

**Request:**
```typescript
{
  draftText: string;            // User's edited draft (plain text)
  to: string;
  subject: string;
  cc?: string;                  // Future: reply-all support
  inReplyTo?: string;           // Original email ID
  threadId?: string;            // Gmail thread ID
}
```

**Response:**
```typescript
{
  htmlPreview: string;          // Formatted HTML email
  textPreview: string;          // Plain text version
  determinismToken: string;     // SHA-256 hash of preview payload
  previewedAt: string;          // ISO timestamp
}
```

**Note:** This endpoint is deterministic - same inputs produce same token.

---

### 3. POST /email/drafts

Send email or create Gmail draft (requires preview confirmation).

**Request:**
```typescript
{
  action: 'send' | 'create_draft';
  htmlPreview: string;          // From preview response
  textPreview: string;          // From preview response
  determinismToken: string;     // Must match preview token
  to: string;
  subject: string;
  cc?: string;
  inReplyTo?: string;
  threadId?: string;
  confirmed: boolean;           // MUST be true (checkbox)
}
```

**Response (send):**
```typescript
{
  success: true;
  messageId: string;            // Gmail message ID
  threadId: string;             // Gmail thread ID
}
```

**Response (create_draft):**
```typescript
{
  success: true;
  draftId: string;              // Gmail draft ID
  gmailUrl: string;             // https://mail.google.com/mail/u/0/#drafts?compose=xyz
}
```

**Errors:**
- `400` - Confirmation checkbox not checked
- `400` - Determinism token mismatch
- `403` - Sensitive data detected (future security layer)
- `429` - Gmail API rate limit

---

### 4. GET /user/writing-voice

Get user's writing voice profile (auto-creates if missing).

**Response:**
```typescript
{
  formality: number;            // 1-10
  length: number;               // 1-10
  tone: number;                 // 1-10
  voiceSamples: string | null;  // Writing examples
  aiDraftsGenerated: number;    // Usage counter
}
```

---

### 5. PUT /user/writing-voice

Update writing voice profile.

**Request:**
```typescript
{
  formality?: number;           // 1-10
  length?: number;              // 1-10
  tone?: number;                // 1-10
  voiceSamples?: string;        // Writing examples
}
```

**Response:**
```typescript
{
  success: true;
  profile: WritingVoiceProfile;
}
```

---

## Backend Architecture

### Service Integration

**assistantService.ts** (extend existing)
- Add new mode: `'email-draft'`
- New EMAIL_DRAFT_SYSTEM_PROMPT in promptManager
- Context builder: `buildEmailDraftContext()`
- Maps voice preferences to prompt labels

**gmailService.ts** (extend existing)
- Add `createGmailDraft()` function
- Build RFC 2822 multipart/alternative message
- Call `gmail.users.drafts.create()`
- Return draft ID + Gmail URL

**emailDraftController.ts** (new)
- Route handlers for 5 new endpoints
- Validate inputs (email addresses, determinism tokens)
- Enforce confirmation checkbox
- Increment usage counters

**Determinism Token Generation:**
```typescript
function generateDeterminismToken(preview: PreviewPayload): string {
  const crypto = require('crypto');
  const payload = JSON.stringify({
    html: preview.htmlPreview,
    text: preview.textPreview,
    to: preview.to,
    subject: preview.subject,
    cc: preview.cc || '',
  });
  return crypto.createHash('sha256').update(payload).digest('hex');
}
```

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

