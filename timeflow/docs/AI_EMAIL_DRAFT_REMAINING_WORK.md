# AI Email Draft Workflow - Remaining Work & Testing Plan

**Date**: 2026-01-03 (Original) | **Updated**: 2026-01-12
**Status**: ✅ **COMPLETE & VERIFIED**
**Phase**: Sprint 16 Phase B+

---

## 🎉 COMPLETION UPDATE (2026-01-12)

**ALL WORK COMPLETE**:
- ✅ Backend fully implemented and operational
- ✅ Frontend fully implemented (DraftPanel component)
- ✅ Integration verified end-to-end
- ✅ TypeScript errors fixed (13 total)
- ✅ Manual testing successful
- 📄 **Full verification report**: `../AI_DRAFT_TESTING_REPORT.md`

**What was completed since 2026-01-03**:
1. DraftPanel component (905 lines) with complete state machine
2. Integration in inbox page with "Draft Reply with AI" button
3. Fixed 10 TypeScript type narrowing errors
4. Fixed 3 backend test mock errors
5. Verified all 5 API endpoints functional
6. Confirmed assistant service 'email-draft' mode operational
7. Manual end-to-end testing passed

---

## Original Status (2026-01-03)

---

## Overview

The AI Email Draft workflow backend is **fully implemented and tested**. This document outlines the remaining frontend work and comprehensive testing plan needed to complete Phase B+ v1.

---

## ✅ What's Complete

### Backend (100%)

- [x] **Database Schema** - `WritingVoiceProfile` model created
- [x] **5 REST Endpoints** (all functional):
  - `POST /email/draft/ai` - Generate AI draft
  - `POST /email/draft/preview` - Create deterministic preview
  - `POST /email/drafts` - Send or create Gmail draft
  - `GET /user/writing-voice` - Get voice profile
  - `PUT /user/writing-voice` - Update voice profile
- [x] **Security Guardrails**:
  - Determinism token validation (SHA-256)
  - Confirmation checkbox enforcement
  - Email address validation
  - Safe logging (no email content in logs)
- [x] **Gmail Integration**:
  - `createGmailDraft()` function
  - `sendEmail()` function
  - RFC 2822 multipart message support
- [x] **Usage Tracking** - `aiDraftsGenerated` counter increments
- [x] **Auto-create Profile** - Defaults (5,5,5) if missing

### Shared Types (100%)

- [x] TypeScript interfaces in `@timeflow/shared`:
  - `EmailDraftRequest`
  - `EmailDraftResponse`
  - `EmailPreviewRequest`
  - `EmailPreviewResponse`
  - `CreateDraftRequest`
  - `CreateDraftResponse`
  - `WritingVoiceProfile`

---

## 🚧 What Needs to be Completed

### 1. Frontend UI Components (0% complete)

**Priority: HIGH - Core Feature**

#### a) Settings Page: Writing & Voice Profile (`/settings/writing-voice`)
**Estimated Time**: 3-4 hours

**Location**: `apps/web/src/app/settings/writing-voice/page.tsx`

**Requirements**:
- [ ] Three sliders with labels:
  - **Formality**: 1 (Casual) → 10 (Professional)
  - **Length**: 1 (Concise) → 10 (Detailed)
  - **Tone**: 1 (Friendly) → 10 (Formal)
- [ ] Default position: 5 (neutral)
- [ ] Real-time slider value display (1-10)
- [ ] Collapsible "Advanced" section:
  - [ ] Text area for voice samples (2-3 example emails)
  - [ ] Character counter (optional, recommended 500-2000 chars)
  - [ ] Save button with loading state
- [ ] Success/error toast notifications
- [ ] Auto-fetch profile on mount (`GET /user/writing-voice`)
- [ ] Save on blur or explicit "Save Changes" button

**API Integration**:
```typescript
// Prefer the shared API client or NEXT_PUBLIC_API_URL to avoid CORS/prod mismatch
const baseUrl = process.env.NEXT_PUBLIC_API_URL ?? '';

// Fetch profile
const response = await fetch(`${baseUrl}/user/writing-voice`);
const profile = await response.json();

// Update profile
await fetch(`${baseUrl}/user/writing-voice`, {
  method: 'PUT',
  body: JSON.stringify({
    formality: 7,
    length: 4,
    tone: 6,
    voiceSamples: 'Hi team,\n\nJust wanted to...'
  })
});
```

**Design Notes**:
- Use existing TimeFlow UI components (sliders, cards, buttons)
- Match Settings page layout (same padding, typography)
- Mobile-responsive sliders

---

#### b) Inbox: Draft Panel Component (`DraftPanel.tsx`)
**Estimated Time**: 6-8 hours

**Location**: `apps/web/src/components/inbox/DraftPanel.tsx`

**Requirements**:

##### State Machine:
1. **Setup (first-run only)**:
   - [ ] Check if voice profile exists
   - [ ] If missing, show inline setup:
     - Quick 3-slider setup
     - "Skip and use defaults" button
     - "Go to full settings" link
   - [ ] On skip, auto-create profile with defaults

2. **Generating**:
   - [ ] Loading spinner with "Generating draft..." text
   - [ ] Cancel button (abort fetch request via `AbortController`)
   - [ ] Estimated time: ~5-10 seconds

3. **Editable Draft**:
   - [ ] Large text area (min 200px height)
   - [ ] Character counter
   - [ ] Quick refine buttons:
     - "Make shorter" (reduce length slider by 2)
     - "More formal" (increase formality slider by 2)
     - "Warmer tone" (decrease tone slider by 2)
   - [ ] "Regenerate" button (calls `/email/draft/ai` again)
   - [ ] "Preview" button (advances to next state)
   - [ ] Display current voice settings (small text below)

4. **Full Preview**:
   - [ ] Display exact recipients:
     - To: `recipient@example.com`
     - Cc: (if reply-all enabled)
     - Subject: `Re: Original Subject`
   - [ ] HTML-rendered preview (read-only)
   - [ ] **Reply-all toggle** (only if original email has CC/multiple recipients)
     - [ ] Show recipient count warning if > 5 recipients
   - [ ] "Edit Draft" button (back to editable state)
   - [ ] **Confirmation checkbox**:
     - Text: "☐ I confirm this draft matches the preview and is ready to send"
     - Required before send actions enabled
   - [ ] Two action buttons (disabled until checkbox checked):
     - **Send from TimeFlow** (primary button, blue)
     - **Create Gmail Draft** (secondary button, gray)

5. **Success State**:
   - [ ] Green checkmark icon
   - [ ] Success message:
     - If sent: "Email sent successfully!"
     - If draft: "Draft created in Gmail"
   - [ ] Action buttons:
     - "View in Gmail" (if draft action)
     - "Close" (close panel)
     - "Draft Another" (reset to generating state)

6. **Error State**:
   - [ ] Red error icon
   - [ ] Error message (from API)
   - [ ] "Retry" button
   - [ ] "Cancel" button

##### Component Structure:
```typescript
interface DraftPanelProps {
  emailId: string;           // Original email to reply to
  threadId?: string;         // Gmail thread ID
  onClose: () => void;       // Close panel callback
}

interface DraftPanelState {
  stage: 'setup' | 'generating' | 'editable' | 'preview' | 'success' | 'error';
  draftText: string;
  voicePreferences: { formality: number; length: number; tone: number };
  previewData?: EmailPreviewResponse;
  isReplyAll: boolean;
  confirmed: boolean;
  error?: string;
}
```

##### API Calls:
```typescript
// 1. Generate draft
POST /email/draft/ai
Body: { emailId, voicePreferences?, additionalContext? }
Response: { draftText, to, subject, metadata }

// 2. Generate preview
POST /email/draft/preview
Body: { draftText, to, subject, cc?, inReplyTo, threadId }
Response: { htmlPreview, textPreview, determinismToken, previewedAt }

// 3. Send or create draft
POST /email/drafts
Body: {
  action: 'send' | 'create_draft',
  htmlPreview, textPreview, determinismToken,
  to, subject, cc?, inReplyTo, threadId,
  confirmed: true
}
Response: { success, messageId?, draftId?, gmailUrl? }
```

**Design Notes**:
- Panel slides in from right (300-400px width)
- Use existing TimeFlow colors/typography
- Mobile: Full-screen modal instead of slide-in (explicit acceptance criteria below)
- Preserve draft text in local state (don't lose on accidental close)
- Avoid logging or surfacing email body/draft text in client logs/toasts

---

#### c) Inbox Thread Detail: "AI Email Draft" Button
**Estimated Time**: 1 hour

**Location**: `apps/web/src/app/inbox/page.tsx` (or thread detail component)

**Requirements**:
- [ ] Add "AI Email Draft" button in thread detail header
- [ ] Button placement: Next to "Reply" or "Forward" actions
- [ ] Icon: Magic wand or sparkles (⚡)
- [ ] Button text: "Draft Reply" or "AI Draft"
- [ ] On click: Open `DraftPanel` component
- [ ] Pass `emailId` and `threadId` to panel

**Design Notes**:
- Primary button if email is unread/unanswered
- Secondary button if email has existing replies
- If the thread detail is a server component, add a client boundary to open the DraftPanel

---

### 2. Assistant Service Integration (50% complete)

**Priority: MEDIUM - Currently using placeholder**

**Current State**:
- Backend has placeholder `generateDraftWithLLM()` returning static template
- Needs integration with `assistantService.ts`

**Work Needed**:
- [ ] Add `'email-draft'` mode to `assistantService.ts`
- [ ] Create email draft system prompt in `promptManager.ts`
- [ ] Implement `buildEmailDraftContext()` function
- [ ] Map voice preferences to prompt labels
- [ ] Use structured JSON response (similar to categorization)
- [ ] Replace placeholder in `emailDraftController.ts` line 564-585

**Example Prompt Structure**:
```
You are a professional email writer. Write a reply to the following email.

Original Email:
From: john@example.com
Subject: Q4 Planning Meeting

[email body...]

Voice Preferences:
- Formality: Professional
- Length: Moderate (3-5 sentences)
- Tone: Professional but approachable

Writing Style Examples:
[user's voice samples if provided...]

Instructions:
- Match the user's writing style
- Be concise and clear
- Use appropriate greeting/closing
- No hallucinations or assumptions
```

**Estimated Time**: 2-3 hours

---

### 3. Reply vs Reply-All Logic (0% complete)

**Priority: MEDIUM - Future enhancement**

**Current State**: Only single recipient supported

**Work Needed**:
- [ ] Parse original email headers (To, Cc, Reply-To)
- [ ] Implement recipient deduplication
- [ ] Filter out user's own email addresses
- [ ] Toggle UI component in preview stage
- [ ] Update API to accept `cc` field
- [ ] Test with large recipient lists (> 5 people)
- [ ] Lock preview/send to the same recipient set to avoid determinism token mismatch

**Business Rules**:
- **Reply (default)**:
  - `To` = `Reply-To` header if present, else `From`
  - `Cc` = empty
- **Reply-All (toggled)**:
  - `To` = `Reply-To` or `From`
  - `Cc` = original `To` + original `Cc` minus user's addresses
  - Dedupe all emails (case-insensitive)

**Estimated Time**: 2 hours

---

### 4. First-Run Inline Setup (0% complete)

**Priority: LOW - Nice to have**

**Current State**: Auto-creates profile with defaults (5,5,5)

**Enhancement Idea**:
- Show inline setup in DraftPanel on first use
- 3 quick sliders + "Start Drafting" button
- Skip button (uses defaults)
- Link to full settings page

**Estimated Time**: 1-2 hours

---

## 🧪 Testing Plan

### Manual Testing Checklist

#### Unit Tests (Backend)
- [ ] **Determinism token generation**:
  - Same inputs produce same token
  - Different inputs produce different tokens
- [ ] **Email validation**:
  - Valid emails pass: `test@example.com`
  - Invalid emails fail: `notanemail`, `@example.com`
- [ ] **Voice profile auto-creation**:
  - First call creates profile with defaults
  - Subsequent calls reuse existing profile
- [ ] **Confirmation checkbox enforcement**:
  - `confirmed: false` → 400 error
  - `confirmed: true` → success
- [ ] **Determinism token validation**:
  - Matching token → success
  - Mismatched token → 400 error

#### Integration Tests (API)
- [ ] **GET /user/writing-voice**:
  - Returns defaults for new user
  - Returns saved preferences for existing user
- [ ] **PUT /user/writing-voice**:
  - Updates formality slider (1-10 range)
  - Updates length slider (1-10 range)
  - Updates tone slider (1-10 range)
  - Updates voice samples (plain text)
  - Rejects out-of-range values (0, 11)
- [ ] **POST /email/draft/ai**:
  - Generates draft for valid email
  - Returns 404 for missing email
  - Returns 403 if Gmail not connected
  - Increments `aiDraftsGenerated` counter
  - Respects voice preference overrides
- [ ] **POST /email/draft/preview**:
  - Returns HTML + text preview
  - Returns determinism token
  - Validates email addresses
  - Handles missing optional fields (cc, threadId)
- [ ] **POST /email/drafts**:
  - `action: 'send'` → sends email via Gmail
  - `action: 'create_draft'` → creates Gmail draft
  - Validates determinism token
  - Requires confirmation checkbox
  - Returns Gmail URL for drafts

#### E2E Tests (Frontend + Backend)
- [ ] **Happy Path: Send from TimeFlow**:
  1. User opens email in `/inbox`
  2. Clicks "AI Email Draft" button
  3. Panel opens, shows generating state
  4. Draft appears in editable text area
  5. User clicks "Preview"
  6. Full preview displays with recipients
  7. User checks confirmation checkbox
  8. User clicks "Send from TimeFlow"
  9. Success message appears
  10. Email sent to recipient's inbox
  11. Thread updated with reply
- [ ] **Happy Path: Create Gmail Draft**:
  1. Same steps 1-7 above
  2. User clicks "Create Gmail Draft"
  3. Success message appears with "View in Gmail" link
  4. Gmail draft created in user's Drafts folder
  5. Draft contains exact preview content
- [ ] **Edge Case: Preview Determinism**:
  1. User generates draft
  2. User edits draft text
  3. User previews draft (generates token A)
  4. User clicks "Edit Draft"
  5. User changes draft text again
  6. User previews again (generates token B)
  7. Token B ≠ Token A
  8. Old token A is invalidated
- [ ] **Edge Case: Cancel Generation**:
  1. User clicks "AI Email Draft"
  2. Panel shows generating state
  3. User clicks "Cancel"
  4. Fetch request aborted
  5. Panel closes without error
- [ ] **Edge Case: Regenerate Draft**:
  1. User generates draft (uses 1 quota)
  2. User clicks "Regenerate"
  3. New draft generated (uses 2nd quota)
  4. `aiDraftsGenerated` counter = 2
- [ ] **Edge Case: Large Recipient Count**:
  1. User opens email with 10 CC recipients
  2. User generates draft
  3. User enables "Reply All" toggle
  4. Preview shows warning: "This will send to 11 recipients"
  5. User must acknowledge before send enabled
- [ ] **Error Handling: Gmail Not Connected**:
  1. User with no Gmail account clicks "AI Email Draft"
  2. API returns 403 with `GMAIL_NOT_CONNECTED`
  3. Panel shows error message
  4. "Connect Gmail" link displayed
- [ ] **Error Handling: LLM Timeout**:
  1. LLM service takes > 30 seconds
  2. API returns 500 timeout error
  3. Panel shows "Service is slow, please retry"
  4. User can retry or cancel
- [ ] **Logging Safety**:
  1. Generate draft with sensitive content
  2. Check backend logs
  3. Verify NO email body or draft text logged
  4. Only metadata logged (userId, emailId hash, draftLength)

---

## 📋 Acceptance Criteria (Phase B+ v1)

**Must Have**:
- [x] Backend endpoints functional and secure
- [x] Database schema created and migrated
- [ ] Settings page: Writing & Voice profile works
- [ ] Inbox: Draft Panel component fully functional
- [ ] "AI Email Draft" button in thread detail
- [ ] Generate → Edit → Preview → Send workflow complete
- [ ] Confirmation checkbox enforced
- [ ] Gmail draft creation works
- [ ] Send from TimeFlow works
- [ ] No email content in logs
- [ ] Mobile DraftPanel modal behavior meets spec

**Should Have**:
- [ ] Assistant service integration (vs placeholder)
- [ ] Reply-all toggle with recipient warnings
- [ ] First-run inline setup
- [ ] Quick refine buttons (shorter, warmer, etc.)
- [ ] Mobile-responsive UI

**Nice to Have**:
- [ ] Voice samples collapsible section
- [ ] Character counters
- [ ] Draft auto-save to localStorage
- [ ] Keyboard shortcuts (Cmd+Enter to send)

---

## 🚀 Rollout Phases

### Phase B+ v0 (Internal Testing) - **Target: 3 days**
- Settings page + basic draft panel
- Generate → Preview → "Open in Gmail to refine" only
- No send from TimeFlow yet
- Test with dev team only

### Phase B+ v1 (Beta Launch) - **Target: 7 days**
- Full workflow: Generate → Edit → Preview → Send/Draft
- Confirmation checkbox + determinism validation
- Reply-all support
- Public beta release

### Phase B+ v2 (Post-Beta Enhancements) - **Target: 14 days**
- Assistant service integration (replace placeholder)
- Voice sample learning
- Multi-profile support (work/personal contexts)
- Subscription tier gating (quota enforcement)

---

## 🛠️ Implementation Order (Recommended)

**Day 1-2**: Frontend Core (6-8 hours)
1. Settings page: Writing & Voice (`/settings/writing-voice`)
2. Draft Panel component (states 1-3: setup, generating, editable)

**Day 3**: Frontend Preview & Actions (4-5 hours)
3. Draft Panel (states 4-5: preview, success/error)
4. Confirmation checkbox + action buttons
5. "AI Email Draft" button in inbox thread detail

**Day 4**: Integration & Testing (3-4 hours)
6. Connect all API endpoints
7. Test happy path end-to-end
8. Fix edge cases (error handling, loading states)

**Day 5**: Assistant Service (2-3 hours)
9. Replace placeholder LLM with assistant service
10. Add email draft prompts
11. Test draft quality with various voice preferences

**Day 6**: Reply-All & Polish (2-3 hours)
12. Implement reply-all logic
13. Add recipient warnings
14. Mobile responsive fixes

**Day 7**: Final Testing & Documentation (2 hours)
15. Run full manual test checklist
16. Update user docs (if needed)
17. Internal demo & feedback

---

## 📝 Notes for Implementation

### API Base URL
- Development: `http://localhost:3001`
- Production: `https://api.timeflow.app`
- Use `process.env.NEXT_PUBLIC_API_URL` in frontend API calls (or shared client) to avoid CORS/route mismatch

### Authentication
- All API calls require `Authorization: Bearer <token>`
- Token stored in secure cookie or localStorage
- Middleware: `requireAuth` prehandler on all endpoints

### Error Codes
| Code | Message | Handling |
|------|---------|----------|
| 401 | Unauthorized | Redirect to login |
| 403 | Gmail not connected | Show "Connect Gmail" link |
| 404 | Email not found | Show "Email no longer available" |
| 400 | Confirmation required | Re-enable checkbox |
| 400 | Determinism token mismatch | Regenerate preview |
| 429 | Quota exceeded | Show upgrade prompt (future) |
| 500 | LLM service error | Show "Try again" button |

### Logging Best Practices
- ✅ **DO log**: userId, emailId (hashed), request timing, error codes
- ❌ **DON'T log**: email body, draft text, recipient names
- Use `[EmailDraft]` prefix for all logs
- Log levels: `info` for success, `warn` for validation, `error` for failures

---

## ✅ Definition of Done

Phase B+ v1 is **complete** when:
- [ ] All "Must Have" items checked
- [ ] Manual test checklist passes 100%
- [ ] No P0/P1 bugs in backlog
- [ ] Internal demo completed
- [ ] Deployed to beta environment
- [ ] Usage tracking confirmed working
- [ ] Security audit passed (determinism, confirmation, logging)

---

## 📚 Reference Documents

- **Design Doc**: `docs/plans/2026-01-02-ai-email-draft-workflow-design.md`
- **Shared Types**: `packages/shared/src/types/email.ts`
- **Backend Controller**: `apps/backend/src/controllers/emailDraftController.ts`
- **Prisma Schema**: `apps/backend/prisma/schema.prisma`

---

**Next Steps**: Assign frontend tasks to another agent and begin parallel work on assistant service integration.
- [ ] **Frontend UI: State Transitions**:
  1. Setup → Generating → Editable → Preview → Success/Error paths render correctly
  2. Cancel resets state without leaks
  3. Determinism token mismatch forces re-preview
