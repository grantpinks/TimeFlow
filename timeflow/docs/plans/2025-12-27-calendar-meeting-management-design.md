# Calendar-Native Meeting Management UI Design

**Date**: 2025-12-27
**Status**: Approved
**Target**: Sprint 15 Enhancement

---

## Overview

Enable users to create scheduling links and share them with recipients directly from the calendar page, without navigating to Settings. Complete workflow: create link → compose email → send, all in under 60 seconds.

**Core Principle**: Quick access to share existing links (80% use case), with fast link creation available (20% use case).

---

## User Journey

**Primary Flow (Quick Share):**
1. User clicks "Share Link" from calendar sidebar
2. Selects existing link from dropdown
3. Types recipient email(s)
4. Reviews pre-filled subject/message (editable)
5. Clicks "Send Email"
6. Toast confirmation: "Email sent!"

**Total time: ~20-30 seconds**

**Secondary Flow (Create & Share):**
1. User clicks "Create Link" from calendar sidebar
2. Enters name + selects duration (15/30/60 min)
3. Clicks "Create" (smart defaults applied)
4. Modal auto-transitions to Share modal
5. Completes email send (steps 3-6 from primary flow)

**Total time: ~35-45 seconds**

---

## Component Architecture

### 1. MeetingManagementPanel
**Location**: Calendar sidebar (replaces PlanMeetingsPanel)

**Features**:
- Stats display (active links count, upcoming meetings count)
- Quick action buttons: "Create Link", "Share Link", "View Meetings"
- Expandable section showing first 3 active links with inline copy button
- Collapsible header to save space

**States**:
- `links[]` - All scheduling links
- `meetings[]` - All meetings
- `expanded` - Boolean for show/hide link list
- `showCreateModal`, `showShareModal`, `showMeetingsModal` - Modal visibility

### 2. CreateLinkModal
**Trigger**: "Create Link" button in MeetingManagementPanel

**Two Modes**:
- **Quick Create (default)**: Name + Duration only
- **Advanced**: All fields (buffers, horizon, daily cap, etc.)

**Smart Defaults** (Quick Create):
- Calendar: User's default calendar
- Google Meet: ON
- Buffers: 5 min before/after
- Horizon: 14 days
- Daily cap: None

**On Success**:
- Auto-transitions to ShareLinkModal with new link pre-selected
- Toast: "Link created: {linkName}"

### 3. ShareLinkModal
**Trigger**: "Share Link" button OR after creating new link

**Features**:
- Link selector dropdown (if multiple links exist)
- Recipients input (multi-email, comma-separated)
- Subject line (pre-filled, editable)
- Message body (pre-filled template, editable)
- "Preview Email" button
- "Copy Link" alternative action
- "Send Email" primary CTA

**Email Defaults**:
- Subject: `Meeting w/ {hostName}` (e.g., "Meeting w/ Grant Pinkerton")
- Message: Professional template with booking link

**Validation**:
- Email format validation
- Max 50 recipients per send
- Required fields: recipients, subject, message

### 4. MeetingListModal
**Trigger**: "View Meetings" button

**Features**:
- Tabbed view: Upcoming / Past / Cancelled
- Meeting cards with: invitee, time, status, link used
- Quick actions per meeting: Cancel, View Details

### 5. EmailPreviewModal
**Trigger**: "Preview Email" button in ShareLinkModal

**Features**:
- Shows rendered HTML email exactly as recipient will see it
- Desktop and mobile views
- "Edit" button returns to ShareModal

---

## Email Template Design

### Hybrid HTML Template (Recommended)

**Structure**:
- Clean, centered layout (max 600px width)
- Professional greeting
- User's custom message (editable)
- Primary CTA button: "Book a Meeting" (blue, mobile-friendly)
- Fallback text link below button
- Subtle footer: "Sent via TimeFlow"
- Multipart: HTML + plain text fallback

**Email Subject**:
- Default: `Meeting w/ {hostName}`
- Example: "Meeting w/ Grant Pinkerton"
- Fully editable before sending

**Message Templates**:
- **Professional**: "Hi! I'd like to schedule a meeting with you. Please book a time that works best for you using the link below."
- **Quick**: "Let's find a time to connect. Pick a time that works for you:"
- **Custom**: User-saved templates (future enhancement)

**Variable Substitution**:
- `{hostName}` → Current user's full name
- `{linkName}` → Scheduling link name
- `{bookingUrl}` → Full booking URL

**Email Client Compatibility**:
- Gmail (web, mobile)
- Outlook (web, desktop 2016+)
- Apple Mail (macOS, iOS)
- Mobile-responsive
- Dark mode compatible

---

## Data Flow & API Integration

### Frontend State Management

**MeetingManagementPanel**:
- Fetches links and meetings on mount
- Caches for 5 minutes
- Invalidates cache on create/update/delete

**CreateLinkModal**:
- Mode: 'quick' | 'advanced'
- Form data with smart defaults
- Validation errors
- Saving state

**ShareLinkModal**:
- Selected link
- Recipients array
- Subject and message (editable)
- Sending state

### API Calls

**Existing (from Sprint 15)**:
- `GET /api/scheduling-links` - Fetch user's links
- `POST /api/scheduling-links` - Create new link
- `PUT /api/scheduling-links/:id` - Update link
- `DELETE /api/scheduling-links/:id` - Delete link
- `GET /api/meetings` - Fetch user's meetings

**New**:
- `POST /api/meetings/send-link-email` - Send email via Gmail API

**Request Payload (send-link-email)**:
```typescript
{
  recipients: string[],      // ["client@example.com", "team@example.com"]
  subject: string,            // "Meeting w/ Grant Pinkerton"
  message: string,            // User's custom message
  bookingUrl: string         // "https://app.com/book/quick-chat"
}
```

**Response**:
```typescript
{
  success: boolean,
  sentCount: number
}
```

---

## Backend Implementation

### New Files

**1. `apps/backend/src/services/emailTemplateService.ts`**
```typescript
export function generateMeetingLinkEmail(
  message: string,
  bookingUrl: string
): { html: string; text: string }
```

Generates:
- HTML email with inline CSS
- Plain text fallback
- Mobile-responsive design
- Email client compatible

**2. `apps/backend/src/controllers/meetingEmailController.ts`**
```typescript
export async function sendMeetingLinkEmail(
  request: FastifyRequest<{ Body: SendEmailPayload }>,
  reply: FastifyReply
)
```

Responsibilities:
- Validate recipients (format, max count)
- Generate email template
- Send via Gmail API (loop through recipients)
- Return success/failure

**3. `apps/backend/src/routes/meetingEmailRoutes.ts`**
```typescript
export async function registerMeetingEmailRoutes(server: FastifyInstance)
```

Registers:
- `POST /api/meetings/send-link-email`

### Gmail API Enhancement

**Update**: `apps/backend/src/services/gmailService.ts`

**Add support for multipart emails**:
```typescript
export async function sendEmail(
  userId: string,
  data: {
    to: string;
    subject: string;
    html?: string;      // NEW
    text?: string;      // NEW
    body?: string;      // Existing (backwards compatible)
  }
): Promise<void>
```

**MIME Format**:
- `Content-Type: multipart/alternative`
- Part 1: `text/plain`
- Part 2: `text/html`

---

## Security & Validation

### Email Validation
- Regex check for valid email format
- Max 50 recipients per send (prevent spam)
- Rate limiting: 100 emails/hour per user

### Input Sanitization
- Escape HTML in user message (prevent XSS)
- Validate booking URL matches user's links
- Subject line max 200 chars
- Message max 5000 chars

### Error Handling

**Validation Errors**:
- Empty link name → "Link name is required"
- No duration selected → "Select at least one duration"
- Invalid email format → "Invalid email address: {email}"
- Empty recipients → "Add at least one recipient"

**API Errors**:
- Gmail API rate limit → "Too many emails sent. Try again in a few minutes."
- Gmail API auth expired → "Please reconnect your Google account in Settings"
- Network error → "Failed to send email. Check your connection and try again."
- Link creation failed → "Failed to create link. Please try again."

**Success Feedback**:
- Link created → Toast: "✓ Link created: {linkName}"
- Email sent → Toast: "✓ Email sent to {count} recipients"
- Link copied → Toast: "✓ Link copied to clipboard"

---

## UI/UX Details

### MeetingManagementPanel Layout

**Collapsed (Default)**:
```
┌─────────────────────────────────┐
│ 📅 Plan Meetings            [▼] │
├─────────────────────────────────┤
│  [2]          [3]                │
│  Active       Upcoming           │
│  Links        Meetings           │
│                                  │
│  [+ Create Link]                 │
│  [📤 Share Link]                 │
│  [📋 View Meetings]              │
└─────────────────────────────────┘
```

**Expanded**:
```
┌─────────────────────────────────┐
│ 📅 Plan Meetings            [▲] │
├─────────────────────────────────┤
│  [2]          [3]                │
│  Active       Upcoming           │
│  Links        Meetings           │
│                                  │
│  [+ Create Link]                 │
│  [📤 Share Link]                 │
│  [📋 View Meetings]              │
│                                  │
│  YOUR LINKS                      │
│  ┌───────────────────────────┐  │
│  │ Quick Chat         [Copy] │  │
│  │ /book/quick-chat          │  │
│  └───────────────────────────┘  │
│  ┌───────────────────────────┐  │
│  │ 30min Meeting      [Copy] │  │
│  │ /book/30min               │  │
│  └───────────────────────────┘  │
│  +1 more                         │
└─────────────────────────────────┘
```

### CreateLinkModal (Quick Mode)
```
┌────────────────────────────────────┐
│ Create Meeting Link          [✕]   │
├────────────────────────────────────┤
│ Link Name *                        │
│ [Quick Chat________________]       │
│                                    │
│ Duration *                         │
│ [ ] 15 min  [✓] 30 min  [ ] 60 min │
│                                    │
│ [⚙️ Advanced Options]               │
│                                    │
│          [Cancel]  [Create Link]   │
└────────────────────────────────────┘
```

### ShareLinkModal
```
┌────────────────────────────────────┐
│ Share Meeting Link           [✕]   │
├────────────────────────────────────┤
│ Select Link:                       │
│ [Quick Chat                    ▼]  │
│                                    │
│ Recipients: *                      │
│ [client@example.com, team@...  ]   │
│ Separate multiple emails with ","  │
│                                    │
│ Subject: *                         │
│ [Meeting w/ Grant Pinkerton    ]   │
│                                    │
│ Message: *                         │
│ ┌────────────────────────────────┐ │
│ │Hi! I'd like to schedule a      │ │
│ │meeting with you...             │ │
│ └────────────────────────────────┘ │
│                                    │
│ [👁️ Preview Email]                 │
│                                    │
│      [Copy Link]  [Send Email]     │
└────────────────────────────────────┘
```

---

## Performance Considerations

### Caching
- Scheduling links: 5 minutes
- Meetings: 2 minutes
- Invalidate on create/update/delete

### Optimistic Updates
- Show "Link created" immediately, rollback on error
- Show "Email sent" immediately, show error if failed

### Lazy Loading
- Only fetch meeting list when modal opens
- Only fetch email templates when ShareModal opens (future)

---

## Testing Strategy

### Unit Tests
- Email template generation (HTML + text)
- Email validation logic
- Link creation with smart defaults
- Variable substitution in templates

### Integration Tests
- Full create + share workflow
- Gmail API email sending
- Error handling for API failures
- Cache invalidation

### E2E Tests
- User creates link → shares via email → verifies sent
- Copy link workflow
- Multiple recipients
- Email preview

### Email Client Testing
- Gmail (web, mobile)
- Outlook (web, desktop 2016+)
- Apple Mail (macOS, iOS)
- Dark mode rendering
- Mobile responsiveness

---

## Rollout Plan

### Phase 1 (MVP - This Sprint)
- MeetingManagementPanel with create + share
- CreateLinkModal (quick mode only)
- ShareLinkModal with email composer
- Default email template only
- Gmail API integration
- Email sending with multipart MIME

### Phase 2 (Future Enhancement)
- Saved email templates (user-customizable)
- CreateLinkModal advanced mode toggle
- Email preview before sending
- Analytics (link opens, click tracking)
- MeetingListModal enhancements

### Phase 3 (Advanced Features)
- SMS integration (Twilio)
- Calendar invite attachment (.ics file)
- Batch send to distribution lists
- Email scheduling (send later)
- Template variables (custom fields)

---

## Success Metrics

### Performance
- Link creation: < 2 seconds
- Email send: < 3 seconds
- Complete workflow: < 60 seconds

### User Experience
- Quick share flow: ~20-30 seconds
- Create + share flow: ~35-45 seconds
- 0 broken email layouts across tested clients

### Adoption
- % of users who create links from calendar vs settings
- Avg emails sent per link created
- Time from link creation to first share

---

## Open Questions & Decisions

**Resolved**:
- ✅ Email subject format: "Meeting w/ {hostName}"
- ✅ Template approach: Hybrid HTML (clean, professional, reliable)
- ✅ Quick create defaults: Smart defaults, optional advanced mode
- ✅ Primary workflow: Quick share (existing links) over create

**Future Consideration**:
- Email template library (saved templates) - Phase 2
- SMS integration via Twilio - Phase 3
- QR code generation for links - Phase 3
- Link analytics/tracking - Phase 2

---

**Last Updated**: 2025-12-27
**Approved By**: User
**Next Steps**: Implementation
