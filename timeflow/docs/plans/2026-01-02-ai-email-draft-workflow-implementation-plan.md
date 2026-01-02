# AI Email Draft Workflow Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add “AI Email Draft” in `/inbox` that drafts replies in the user’s voice, forces full preview, and supports Send from TimeFlow, Create Gmail Draft, and Open in Gmail to refine.

**Architecture:** Implement AI drafting and Gmail writes server-side (Fastify) with strict quotas and preview-first safety. Store a per-user voice profile (B + C) in Prisma, and optionally allow Sent-mail learning (A) as an explicit opt-in.

**Tech Stack:** Next.js 14 (web), Fastify (backend), Prisma (Postgres), Vitest (tests), OpenAI (LLM), googleapis (Gmail).

---

### Task 0: Read the design doc and confirm scope

**Files:**
- Read: `docs/plans/2026-01-02-ai-email-draft-workflow-design.md`

**Step 1: Confirm feature gates**
- Confirm we ship:
  - Reply default + Reply-all toggle
  - Generate → Edit → Full Preview → action
  - Actions: Send from TimeFlow, Create Gmail Draft, Open in Gmail to refine
  - Voice profile: B + C default, A opt-in shown on first run

**Step 2: Commit (docs only, if you changed anything)**

```bash
git add docs/plans/2026-01-02-ai-email-draft-workflow-design.md
git commit -m "docs: lock AI email draft workflow design"
```

---

### Task 1: Add shared types for AI email draft + Gmail draft creation

**Files:**
- Modify: `packages/shared/src/types/email.ts`
- Test: `packages/shared/src/types/__tests__/emailDraftTypes.test.ts` (create if you have a test folder; otherwise skip tests here)

**Step 1: Add types**
Add the following to `packages/shared/src/types/email.ts`:

```ts
export type EmailReplyMode = 'reply' | 'reply_all';

export interface AiEmailDraftRequest {
  emailId: string;
  threadId?: string;
  replyMode: EmailReplyMode;
  instructions?: string; // optional user instruction like "keep it short"
}

export interface AiEmailDraftResponse {
  intentSummary: string;
  keyPoints: string[];
  questionsToAnswer: string[];
  draftText: string; // plain text draft; UI edits this
  warnings: string[];
  safetyFlags: string[];
}

export interface AiEmailPreviewRequest {
  emailId: string;
  threadId?: string;
  replyMode: EmailReplyMode;
  draftText: string;
  subject?: string;
  includeQuotedOriginal?: boolean;
}

export interface AiEmailPreviewPayload {
  to: string;
  cc?: string;
  subject: string;
  bodyText: string;
  bodyHtml: string;
  inReplyTo?: string;
  threadId?: string;
}

export interface CreateGmailDraftResponse {
  draftId: string;
  messageId?: string;
  threadId?: string;
  gmailUrl?: string;
}
```

**Step 2: Commit**

```bash
git add packages/shared/src/types/email.ts
git commit -m "feat(shared): add AI email draft + preview types"
```

---

### Task 2: Add Prisma models for voice profile + AI usage counters

**Files:**
- Modify: `apps/backend/prisma/schema.prisma`

**Step 1: Add `WritingVoiceProfile` model**
Add near other user-owned models:

```prisma
model WritingVoiceProfile {
  id                        String   @id @default(cuid())
  userId                    String   @unique
  user                      User     @relation(fields: [userId], references: [id], onDelete: Cascade)

  styleJson                 Json
  fingerprintJson           Json?

  sentMailLearningEnabled   Boolean  @default(false)
  sentMailLearningConfigJson Json?
  sentMailLastTrainedAt     DateTime?

  createdAt                 DateTime @default(now())
  updatedAt                 DateTime @updatedAt

  @@index([userId])
}
```

**Step 2: Add `AiUsageCounter` model**

```prisma
model AiUsageCounter {
  id            String   @id @default(cuid())
  userId        String
  user          User     @relation(fields: [userId], references: [id], onDelete: Cascade)

  periodStart   DateTime
  periodType    String   // "day" | "month"

  draftRequests Int      @default(0)
  rewriteRequests Int    @default(0)
  tokensApprox  Int      @default(0)

  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt

  @@unique([userId, periodType, periodStart])
  @@index([userId, periodType, periodStart])
}
```

**Step 3: Add relations to `User`**
In `model User`, add:

```prisma
  writingVoiceProfile WritingVoiceProfile?
  aiUsageCounters     AiUsageCounter[]
```

**Step 4: Run migration + generate**

```bash
cd timeflow/apps/backend
pnpm prisma migrate dev --name add_writing_voice_profile
pnpm prisma generate
```

**Step 5: Commit**

```bash
git add apps/backend/prisma/schema.prisma apps/backend/prisma/migrations
git commit -m "feat(db): add writing voice profile and AI usage counters"
```

---

### Task 3: Add prompt files for email drafting

**Files:**
- Create: `apps/backend/src/prompts/email_draft_base.txt`
- Create: `apps/backend/src/prompts/email_draft_generate.txt`
- Create: `apps/backend/src/prompts/email_draft_rewrite.txt`

**Step 1: Add `email_draft_base.txt`**
Create:

```text
You are TimeFlow’s email drafting assistant.

Non-negotiables:
- Never send email. Only draft.
- Never invent facts not present in the email context or user instruction.
- If the email asks for something unclear, ask a clarifying question list in the JSON (do not guess).
- Be concise and natural. Match the user voice profile rules exactly.

Safety:
- If sensitive topics appear (money, legal, medical, passwords), add a safetyFlag and a short warning.
```

**Step 2: Add `email_draft_generate.txt`**
Create:

```text
Return JSON only with:
{
  "intentSummary": "...",
  "keyPoints": ["..."],
  "questionsToAnswer": ["..."],
  "draftText": "...",
  "warnings": ["..."],
  "safetyFlags": ["..."]
}
```

**Step 3: Add `email_draft_rewrite.txt`**
Create:

```text
Rewrite the provided draft according to the user’s delta instruction while keeping meaning.
Return JSON only:
{ "draftText": "..." }
```

**Step 4: Commit**

```bash
git add apps/backend/src/prompts/email_draft_*.txt
git commit -m "feat(prompts): add AI email draft prompts"
```

---

### Task 4: Extend PromptManager to load non-mode prompt files (minimal change)

**Files:**
- Modify: `apps/backend/src/services/promptManager.ts`
- Test: `apps/backend/src/services/__tests__/promptManager.test.ts`

**Step 1: Add a public loader**
Add this method to `PromptManager`:

```ts
  getFile(filename: string): string {
    const key = `file:${filename}`;
    if (this.prompts.has(key)) return this.prompts.get(key)!;
    const content = this.loadPromptFile(filename);
    this.prompts.set(key, content);
    return content;
  }
```

**Step 2: Add tests**
In `promptManager.test.ts`, add:
- loading `email_draft_base.txt` works
- caching works (second call returns same string without throwing)

**Step 3: Run tests**

```bash
cd timeflow/apps/backend
pnpm test
```

**Step 4: Commit**

```bash
git add apps/backend/src/services/promptManager.ts apps/backend/src/services/__tests__/promptManager.test.ts
git commit -m "feat(ai): allow PromptManager to load prompt files"
```

---

### Task 5: Implement voice profile service (B + C) and minimal quota helper

**Files:**
- Create: `apps/backend/src/services/voiceProfileService.ts`
- Create: `apps/backend/src/services/aiUsageService.ts`
- Test: `apps/backend/src/services/__tests__/voiceProfileService.test.ts`

**Step 1: Implement `voiceProfileService.ts`**
Minimum functions:
- `getOrCreateDefaultVoiceProfile(userId)`
- `updateVoiceProfile(userId, patch)`

Store B preferences as JSON with defaults (reasonable, neutral tone).

**Step 2: Implement `aiUsageService.ts`**
Minimum functions:
- `assertWithinAiDraftQuota(userId)` (throw error if exceeded)
- `incrementAiDraftUsage(userId, tokensApprox)`

**Step 3: Write tests**
Use prisma mocking patterns from other tests; test that:
- default voice profile is created once
- quota throws after threshold

**Step 4: Commit**

```bash
git add apps/backend/src/services/voiceProfileService.ts apps/backend/src/services/aiUsageService.ts apps/backend/src/services/__tests__/voiceProfileService.test.ts
git commit -m "feat(ai): add voice profile + AI draft quota services"
```

---

### Task 6: Implement AI email draft service (intent + draft JSON)

**Files:**
- Create: `apps/backend/src/services/aiEmailDraftService.ts`
- Test: `apps/backend/src/services/__tests__/aiEmailDraftService.test.ts`

**Step 1: Implement `aiEmailDraftService.ts`**
Inputs:
- `userId`
- `email: FullEmailMessage`
- `replyMode`
- `instructions?`
- `voiceProfile`

Behavior:
- Call OpenAI with:
  - system prompt = `email_draft_base.txt` + voice profile rules
  - user prompt = `email_draft_generate.txt` + email context
  - `response_format: { type: "json_object" }`

Return `AiEmailDraftResponse`.

**Step 2: Test**
Mock OpenAI client similarly to `aiCategorizationService.ts` tests (or mock the function layer):
- Parses JSON
- Rejects invalid JSON

**Step 3: Commit**

```bash
git add apps/backend/src/services/aiEmailDraftService.ts apps/backend/src/services/__tests__/aiEmailDraftService.test.ts
git commit -m "feat(ai): add AI email draft generation service"
```

---

### Task 7: Add preview builder (recipient computation + MIME-safe body)

**Files:**
- Create: `apps/backend/src/services/emailDraftPreviewService.ts`
- Test: `apps/backend/src/services/__tests__/emailDraftPreviewService.test.ts`

**Step 1: Implement preview builder**
Inputs:
- `userId` (for “own addresses” filtering; simplest: filter by user.email)
- `email: FullEmailMessage`
- `replyMode`
- `draftText`
- `includeQuotedOriginal`

Output:
- `AiEmailPreviewPayload`

Rules:
- Reply uses `replyTo ?? from`
- Reply-all adds original To/Cc (minus user email), dedupe
- `inReplyTo` should use the original message id (Gmail uses RFC Message-ID header; if not available, omit)
  - If you don’t have Message-ID today, keep `inReplyTo` empty for v1 (threadId still ensures threading).

**Step 2: Commit**

```bash
git add apps/backend/src/services/emailDraftPreviewService.ts apps/backend/src/services/__tests__/emailDraftPreviewService.test.ts
git commit -m "feat(email): add AI draft preview builder"
```

---

### Task 8: Add Gmail Draft creation to gmailService

**Files:**
- Modify: `apps/backend/src/services/gmailService.ts`
- Test: `apps/backend/src/services/__tests__/gmailServiceDrafts.test.ts`

**Step 1: Add `createDraft`**
Implement:
- Build MIME raw (reuse logic from `sendEmail`)
- Call `gmail.users.drafts.create({ userId: "me", requestBody: { message: { raw, threadId? }}})`

**Step 2: Add a controller route**
We’ll do routes next task; for now just service + test with mocked googleapis client.

**Step 3: Commit**

```bash
git add apps/backend/src/services/gmailService.ts apps/backend/src/services/__tests__/gmailServiceDrafts.test.ts
git commit -m "feat(gmail): add create draft support"
```

---

### Task 9: Add backend routes/controllers for AI draft + preview + draft creation + safe send

**Files:**
- Modify: `apps/backend/src/routes/emailRoutes.ts`
- Modify: `apps/backend/src/controllers/emailController.ts`
- Test: `apps/backend/src/__tests__/emailDraftRoutes.e2e.test.ts`

**Step 1: Add endpoints**
Add to `emailRoutes.ts`:
- `POST /email/draft/ai`
- `POST /email/draft/preview`
- `POST /email/drafts`
- `POST /email/send-ai-draft` (new; requires checkbox confirm)

**Step 2: Implement controller handlers**
In `emailController.ts`:
- Validate with `zod`
- Fetch full email via `gmailService.getFullEmail`
- Enforce quota
- Call `aiEmailDraftService` and return JSON
- Preview endpoint returns `AiEmailPreviewPayload`
- Draft endpoint calls `gmailService.createDraft`
- Send endpoint calls `gmailService.sendEmail`, but only if `confirmed === true`

**Step 3: E2E tests**
Use server.inject pattern like existing inbox tests:
- Unauthed returns 401
- Happy path returns 200 with expected JSON shape (mock services)
- Send rejects when `confirmed` missing/false

**Step 4: Commit**

```bash
git add apps/backend/src/routes/emailRoutes.ts apps/backend/src/controllers/emailController.ts apps/backend/src/__tests__/emailDraftRoutes.e2e.test.ts
git commit -m "feat(email): add AI draft, preview, gmail draft, and safe send routes"
```

---

### Task 10: Add web API client functions for AI draft workflow

**Files:**
- Modify: `apps/web/src/lib/api.ts`

**Step 1: Add functions**
Add wrappers:
- `generateAiEmailDraft(req: AiEmailDraftRequest)`
- `previewAiEmailDraft(req: AiEmailPreviewRequest)`
- `createGmailDraft(payload: AiEmailPreviewPayload)`
- `sendAiDraftEmail(payload: AiEmailPreviewPayload & { confirmed: boolean })`

**Step 2: Commit**

```bash
git add apps/web/src/lib/api.ts
git commit -m "feat(web): add API client for AI email draft workflow"
```

---

### Task 11: Add Draft Panel UI to Inbox thread detail

**Files:**
- Create: `apps/web/src/components/inbox/AiEmailDraftPanel.tsx`
- Modify: `apps/web/src/app/inbox/page.tsx`

**Step 1: Create `AiEmailDraftPanel.tsx`**
UI responsibilities:
- Button: Generate Draft
- Textarea: editable draft
- Toggle: Reply-all
- Button: Full Preview
- Preview step shows To/Cc/Subject and body (read-only)
- Actions (only from preview):
  - Send from TimeFlow (modal w/ checkbox)
  - Create Gmail Draft
  - Open in Gmail to refine (mailto or Gmail deep link fallback)

**Step 2: Wire into `page.tsx`**
- Render panel when a thread is open (you already have `selectedThreadId` + `threadMessages`)
- Pass the latest message (or messageId) into the panel

**Step 3: Commit**

```bash
git add apps/web/src/components/inbox/AiEmailDraftPanel.tsx apps/web/src/app/inbox/page.tsx
git commit -m "feat(inbox): add AI email draft panel with preview and actions"
```

---

### Task 12: Add “Writing & Voice” settings (B + C + A toggle)

**Files:**
- Create: `apps/web/src/app/settings/writing-voice/page.tsx`
- Create: `apps/backend/src/routes/voiceRoutes.ts`
- Create: `apps/backend/src/controllers/voiceController.ts`
- Modify: `apps/backend/src/server.ts` (register routes)

**Step 1: Backend voice endpoints**
Add:
- `GET /voice/profile`
- `PATCH /voice/profile`

**Step 2: Web settings page**
- B: sliders/toggles + prefer/never phrases
- C: paste samples (store only derived fingerprint in v1)
- A: opt-in toggle with warning + sample size (store config; background job can be a follow-up task)

**Step 3: Commit**

```bash
git add apps/backend/src/routes/voiceRoutes.ts apps/backend/src/controllers/voiceController.ts apps/backend/src/server.ts apps/web/src/app/settings/writing-voice/page.tsx
git commit -m "feat(settings): add writing voice profile settings"
```

---

### Task 13: Run full verification

**Step 1: Backend tests**

```bash
cd timeflow/apps/backend
pnpm test
```

**Step 2: Web build + tests**

```bash
cd timeflow/apps/web
pnpm test
pnpm build
```

**Step 3: Smoke test**
- Connect Gmail
- Open `/inbox`, open a thread
- Generate draft → preview → create Gmail draft
- Generate draft → preview → send from TimeFlow (checkbox required)

**Step 4: Final commit (only if needed)**
If you made fixes during verification:

```bash
git add -A
git commit -m "fix: stabilize AI email draft workflow"
```

---

## Notes / Follow-ups (explicitly deferred)
- Sent-mail learning (A) background job (fetch Sent samples, derive fingerprint) can ship as Phase B+ v2.
- Message-ID / In-Reply-To headers: if not currently available from Gmail parsing, rely on threadId for threading in v1.


