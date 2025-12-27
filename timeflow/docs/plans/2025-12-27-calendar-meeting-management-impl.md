# Calendar Meeting Management Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build calendar-native UI for creating scheduling links and sharing them via email in <60 seconds

**Architecture:** Multipart email templates (HTML+text), quick-create modals with smart defaults, Gmail API integration for sending

**Tech Stack:** React, TypeScript, Fastify, Gmail API, Prisma

---

## Task 1: Add User Name Field to Schema

**Files:**
- Modify: `apps/backend/prisma/schema.prisma:10-39`
- Run: `apps/backend/`

**Step 1: Add name field to User model**

```prisma
model User {
  id                         String                  @id @default(cuid())
  email                      String                  @unique
  name                       String?                 // NEW: User's full name
  createdAt                  DateTime                @default(now())
  // ... rest of fields
}
```

**Step 2: Create migration**

Run: `cd apps/backend && pnpm prisma migrate dev --name add_user_name`
Expected: Migration created successfully

**Step 3: Commit**

```bash
git add apps/backend/prisma/schema.prisma apps/backend/prisma/migrations/
git commit -m "feat: add name field to User model"
```

---

## Task 2: Email Template Service (Backend)

**Files:**
- Create: `apps/backend/src/services/emailTemplateService.ts`
- Test: `apps/backend/src/services/__tests__/emailTemplateService.test.ts`

**Step 1: Write failing tests**

```typescript
import { describe, it, expect } from 'vitest';
import { generateMeetingLinkEmail } from '../emailTemplateService.js';

describe('emailTemplateService', () => {
  describe('generateMeetingLinkEmail', () => {
    it('should generate HTML and plain text versions', () => {
      const result = generateMeetingLinkEmail(
        'Hi! Let\'s schedule a meeting.',
        'https://app.com/book/quick-chat'
      );

      expect(result).toHaveProperty('html');
      expect(result).toHaveProperty('text');
      expect(typeof result.html).toBe('string');
      expect(typeof result.text).toBe('string');
    });

    it('should include booking URL in HTML', () => {
      const result = generateMeetingLinkEmail(
        'Test message',
        'https://app.com/book/test'
      );

      expect(result.html).toContain('https://app.com/book/test');
      expect(result.html).toContain('Book a Meeting');
    });

    it('should include booking URL in plain text', () => {
      const result = generateMeetingLinkEmail(
        'Test message',
        'https://app.com/book/test'
      );

      expect(result.text).toContain('https://app.com/book/test');
      expect(result.text).toContain('Test message');
    });

    it('should include user message in both versions', () => {
      const message = 'Please book a time that works for you.';
      const result = generateMeetingLinkEmail(
        message,
        'https://app.com/book/test'
      );

      expect(result.html).toContain(message);
      expect(result.text).toContain(message);
    });

    it('should escape HTML in user message', () => {
      const message = '<script>alert("xss")</script>';
      const result = generateMeetingLinkEmail(
        message,
        'https://app.com/book/test'
      );

      expect(result.html).not.toContain('<script>');
      expect(result.html).toContain('&lt;script&gt;');
    });
  });
});
```

**Step 2: Run tests to verify they fail**

Run: `cd apps/backend && pnpm test src/services/__tests__/emailTemplateService.test.ts`
Expected: FAIL - Module not found

**Step 3: Implement email template service**

```typescript
/**
 * Email Template Service
 *
 * Generates professional email templates for meeting link sharing
 */

/**
 * Escape HTML to prevent XSS
 */
function escapeHtml(text: string): string {
  const map: Record<string, string> = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;',
  };
  return text.replace(/[&<>"']/g, (m) => map[m]);
}

/**
 * Generate meeting link email (HTML + plain text)
 */
export function generateMeetingLinkEmail(
  message: string,
  bookingUrl: string
): { html: string; text: string } {
  const escapedMessage = escapeHtml(message);

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta http-equiv="X-UA-Compatible" content="IE=edge">
</head>
<body style="margin:0; padding:20px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #f5f5f5;">
  <div style="max-width: 600px; margin: 0 auto; background: white; border-radius: 8px; padding: 40px;">

    <!-- User's message -->
    <div style="font-size: 16px; line-height: 1.6; color: #333; margin-bottom: 30px;">
      ${escapedMessage}
    </div>

    <!-- CTA Button -->
    <div style="text-align: center; margin: 30px 0;">
      <a href="${bookingUrl}" style="display: inline-block; background: #4F46E5; color: white; padding: 14px 32px; text-decoration: none; border-radius: 6px; font-weight: 600; font-size: 16px;">
        Book a Meeting
      </a>
    </div>

    <!-- Fallback link -->
    <div style="font-size: 14px; color: #666; text-align: center; margin-top: 20px;">
      Or copy this link: <a href="${bookingUrl}" style="color: #4F46E5; word-break: break-all;">${bookingUrl}</a>
    </div>

    <!-- Footer -->
    <div style="margin-top: 40px; padding-top: 20px; border-top: 1px solid #e5e5e5; font-size: 12px; color: #999; text-align: center;">
      Sent via TimeFlow
    </div>
  </div>
</body>
</html>`;

  const text = `${message}

Book a meeting: ${bookingUrl}

---
Sent via TimeFlow`;

  return { html, text };
}
```

**Step 4: Run tests to verify they pass**

Run: `cd apps/backend && pnpm test src/services/__tests__/emailTemplateService.test.ts`
Expected: PASS (5 tests)

**Step 5: Commit**

```bash
git add apps/backend/src/services/emailTemplateService.ts apps/backend/src/services/__tests__/emailTemplateService.test.ts
git commit -m "feat: add email template service with HTML/text generation

- Generate professional HTML emails with CTA button
- Plain text fallback for email clients
- XSS protection via HTML escaping
- Mobile-responsive design"
```

---

## Task 3: Update Gmail Service for Multipart Emails

**Files:**
- Modify: `apps/backend/src/services/gmailService.ts:225-266`
- Modify: `packages/shared/src/types/email.ts:63-69`

**Step 1: Update SendEmailRequest interface**

```typescript
export interface SendEmailRequest {
  to: string;
  subject: string;
  body?: string;           // HTML body (backwards compatible)
  html?: string;           // NEW: Explicit HTML body
  text?: string;           // NEW: Plain text body
  inReplyTo?: string;
  threadId?: string;
}
```

**Step 2: Update sendEmail function**

```typescript
export async function sendEmail(userId: string, request: SendEmailRequest): Promise<SendEmailResponse> {
  assertWithinGmailRateLimit(userId);
  const gmail = await getGmailClient(userId);

  // Determine if multipart or single-part email
  const hasMultipart = request.html && request.text;
  const boundary = `boundary_${Date.now()}_${Math.random().toString(36).substring(7)}`;

  let message: string;

  if (hasMultipart) {
    // Build multipart/alternative email
    const messageParts = [
      `To: ${request.to}`,
      `Subject: ${request.subject}`,
      `Content-Type: multipart/alternative; boundary="${boundary}"`,
      'MIME-Version: 1.0',
    ];

    if (request.inReplyTo) {
      messageParts.push(`In-Reply-To: ${request.inReplyTo}`);
      messageParts.push(`References: ${request.inReplyTo}`);
    }

    messageParts.push('');
    messageParts.push(`--${boundary}`);
    messageParts.push('Content-Type: text/plain; charset=utf-8');
    messageParts.push('');
    messageParts.push(request.text!);
    messageParts.push('');
    messageParts.push(`--${boundary}`);
    messageParts.push('Content-Type: text/html; charset=utf-8');
    messageParts.push('');
    messageParts.push(request.html!);
    messageParts.push('');
    messageParts.push(`--${boundary}--`);

    message = messageParts.join('\r\n');
  } else {
    // Single-part email (backwards compatible)
    const htmlBody = request.html || request.body || '';
    const messageParts = [
      `To: ${request.to}`,
      `Subject: ${request.subject}`,
      'Content-Type: text/html; charset=utf-8',
      'MIME-Version: 1.0',
    ];

    if (request.inReplyTo) {
      messageParts.push(`In-Reply-To: ${request.inReplyTo}`);
      messageParts.push(`References: ${request.inReplyTo}`);
    }

    messageParts.push('');
    messageParts.push(htmlBody);

    message = messageParts.join('\r\n');
  }

  const encodedMessage = Buffer.from(message)
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');

  const sendOptions: any = {
    userId: 'me',
    requestBody: {
      raw: encodedMessage,
    },
  };

  if (request.threadId) {
    sendOptions.requestBody.threadId = request.threadId;
  }

  const response = await gmail.users.messages.send(sendOptions);

  return {
    success: true,
    messageId: response.data.id,
    threadId: response.data.threadId,
  };
}
```

**Step 3: Commit**

```bash
git add apps/backend/src/services/gmailService.ts packages/shared/src/types/email.ts
git commit -m "feat: add multipart email support to Gmail service

- Support multipart/alternative (HTML + plain text)
- Backwards compatible with existing single-part emails
- Proper MIME boundary generation
- Update SendEmailRequest interface"
```

---

## Task 4: Meeting Email Controller & Routes (Backend)

**Files:**
- Create: `apps/backend/src/controllers/meetingEmailController.ts`
- Create: `apps/backend/src/routes/meetingEmailRoutes.ts`
- Modify: `apps/backend/src/server.ts`

**Step 1: Create meeting email controller**

```typescript
import { FastifyRequest, FastifyReply } from 'fastify';
import * as gmailService from '../services/gmailService.js';
import { generateMeetingLinkEmail } from '../services/emailTemplateService.js';

interface SendLinkEmailRequest {
  recipients: string[];
  subject: string;
  message: string;
  bookingUrl: string;
}

/**
 * Email validation regex
 */
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * POST /api/meetings/send-link-email
 */
export async function sendMeetingLinkEmail(
  request: FastifyRequest<{ Body: SendLinkEmailRequest }>,
  reply: FastifyReply
) {
  const userId = request.userId!;
  const { recipients, subject, message, bookingUrl } = request.body;

  // Validation
  if (!recipients || recipients.length === 0) {
    reply.status(400).send({ error: 'At least one recipient is required' });
    return;
  }

  if (recipients.length > 50) {
    reply.status(400).send({ error: 'Maximum 50 recipients allowed' });
    return;
  }

  if (!subject || subject.length === 0) {
    reply.status(400).send({ error: 'Subject is required' });
    return;
  }

  if (subject.length > 200) {
    reply.status(400).send({ error: 'Subject must be 200 characters or less' });
    return;
  }

  if (!message || message.length === 0) {
    reply.status(400).send({ error: 'Message is required' });
    return;
  }

  if (message.length > 5000) {
    reply.status(400).send({ error: 'Message must be 5000 characters or less' });
    return;
  }

  if (!bookingUrl || bookingUrl.length === 0) {
    reply.status(400).send({ error: 'Booking URL is required' });
    return;
  }

  // Validate email formats
  for (const email of recipients) {
    if (!EMAIL_REGEX.test(email.trim())) {
      reply.status(400).send({ error: `Invalid email address: ${email}` });
      return;
    }
  }

  try {
    // Generate email template
    const { html, text } = generateMeetingLinkEmail(message, bookingUrl);

    // Send to each recipient
    let sentCount = 0;
    for (const recipient of recipients) {
      try {
        await gmailService.sendEmail(userId, {
          to: recipient.trim(),
          subject,
          html,
          text,
        });
        sentCount++;
      } catch (error) {
        console.error(`Failed to send email to ${recipient}:`, error);
        // Continue sending to other recipients
      }
    }

    if (sentCount === 0) {
      reply.status(500).send({ error: 'Failed to send emails' });
      return;
    }

    reply.send({
      success: true,
      sentCount,
    });
  } catch (error) {
    console.error('Failed to send meeting link email:', error);
    throw error;
  }
}
```

**Step 2: Create routes file**

```typescript
import { FastifyInstance } from 'fastify';
import * as meetingEmailController from '../controllers/meetingEmailController.js';

export async function registerMeetingEmailRoutes(server: FastifyInstance) {
  server.post('/meetings/send-link-email', meetingEmailController.sendMeetingLinkEmail);
}
```

**Step 3: Register routes in server.ts**

Find the section where routes are registered and add:

```typescript
import { registerMeetingEmailRoutes } from './routes/meetingEmailRoutes.js';

// ... in the routes registration section
await registerMeetingEmailRoutes(server);
```

**Step 4: Commit**

```bash
git add apps/backend/src/controllers/meetingEmailController.ts apps/backend/src/routes/meetingEmailRoutes.ts apps/backend/src/server.ts
git commit -m "feat: add meeting email controller and routes

- POST /api/meetings/send-link-email endpoint
- Email validation (format, count, length limits)
- Send to multiple recipients with error handling
- Integration with email template service"
```

---

## Task 5: Update API Client (Frontend)

**Files:**
- Modify: `apps/web/src/lib/api.ts`

**Step 1: Add sendMeetingLinkEmail function**

Add to end of file:

```typescript
/**
 * Send meeting link via email
 */
export async function sendMeetingLinkEmail(data: {
  recipients: string[];
  subject: string;
  message: string;
  bookingUrl: string;
}): Promise<{ success: boolean; sentCount: number }> {
  const response = await fetchWithAuth('/api/meetings/send-link-email', {
    method: 'POST',
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to send email');
  }

  return response.json();
}
```

**Step 2: Commit**

```bash
git add apps/web/src/lib/api.ts
git commit -m "feat: add sendMeetingLinkEmail API client function"
```

---

## Task 6: Toast Notification Component

**Files:**
- Create: `apps/web/src/components/Toast.tsx`
- Create: `apps/web/src/hooks/useToast.ts`

**Step 1: Create Toast component**

```typescript
'use client';

import { useEffect } from 'react';

interface ToastProps {
  message: string;
  type: 'success' | 'error' | 'info';
  onClose: () => void;
  duration?: number;
}

export function Toast({ message, type, onClose, duration = 3000 }: ToastProps) {
  useEffect(() => {
    const timer = setTimeout(onClose, duration);
    return () => clearTimeout(timer);
  }, [onClose, duration]);

  const bgColor = {
    success: 'bg-green-600',
    error: 'bg-red-600',
    info: 'bg-blue-600',
  }[type];

  const icon = {
    success: '✓',
    error: '✕',
    info: 'ℹ',
  }[type];

  return (
    <div className="fixed bottom-4 right-4 z-50 animate-in slide-in-from-bottom-5">
      <div className={`${bgColor} text-white px-6 py-3 rounded-lg shadow-lg flex items-center gap-3 max-w-md`}>
        <span className="text-xl">{icon}</span>
        <span className="text-sm font-medium">{message}</span>
        <button onClick={onClose} className="ml-4 text-white/80 hover:text-white">
          ✕
        </button>
      </div>
    </div>
  );
}
```

**Step 2: Create useToast hook**

```typescript
'use client';

import { useState, useCallback } from 'react';

interface ToastState {
  message: string;
  type: 'success' | 'error' | 'info';
  id: number;
}

export function useToast() {
  const [toasts, setToasts] = useState<ToastState[]>([]);

  const showToast = useCallback((message: string, type: 'success' | 'error' | 'info' = 'info') => {
    const id = Date.now();
    setToasts((prev) => [...prev, { message, type, id }]);
  }, []);

  const hideToast = useCallback((id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  return {
    toasts,
    showToast,
    hideToast,
  };
}
```

**Step 3: Commit**

```bash
git add apps/web/src/components/Toast.tsx apps/web/src/hooks/useToast.ts
git commit -m "feat: add toast notification component and hook"
```

---

## Task 7: CreateLinkModal Component

**Files:**
- Create: `apps/web/src/components/CreateLinkModal.tsx`

**Step 1: Create component**

```typescript
'use client';

import { useState, useEffect } from 'react';
import * as api from '@/lib/api';

interface CreateLinkModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (linkId: string) => void;
}

export function CreateLinkModal({ isOpen, onClose, onSuccess }: CreateLinkModalProps) {
  const [name, setName] = useState('');
  const [durations, setDurations] = useState<number[]>([30]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      // Reset form when modal opens
      setName('');
      setDurations([30]);
      setError(null);
    }
  }, [isOpen]);

  const handleDurationToggle = (duration: number) => {
    if (durations.includes(duration)) {
      setDurations(durations.filter((d) => d !== duration));
    } else {
      setDurations([...durations, duration].sort((a, b) => a - b));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!name.trim()) {
      setError('Link name is required');
      return;
    }

    if (durations.length === 0) {
      setError('Select at least one duration');
      return;
    }

    try {
      setSaving(true);

      // Create link with smart defaults
      const link = await api.createSchedulingLink({
        name: name.trim(),
        durationsMinutes: durations,
        calendarProvider: 'google',
        calendarId: '', // Uses user's default calendar
        googleMeetEnabled: true,
        bufferBeforeMinutes: 5,
        bufferAfterMinutes: 5,
        schedulingHorizonDays: 14,
        isActive: true,
      });

      onSuccess(link.id);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create link');
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
        <div className="flex items-center justify-between p-6 border-b border-slate-200">
          <h3 className="text-xl font-semibold text-slate-800">Create Meeting Link</h3>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600"
          >
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="px-4 py-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm">
              {error}
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Link Name *
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Quick Chat"
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
              autoFocus
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Duration *
            </label>
            <div className="flex gap-2 flex-wrap">
              {[15, 30, 60].map((duration) => (
                <button
                  key={duration}
                  type="button"
                  onClick={() => handleDurationToggle(duration)}
                  className={`px-4 py-2 rounded-lg border transition-colors ${
                    durations.includes(duration)
                      ? 'bg-primary-600 text-white border-primary-600'
                      : 'bg-white text-slate-700 border-slate-300 hover:border-primary-300'
                  }`}
                >
                  {duration} min
                </button>
              ))}
            </div>
          </div>

          <div className="text-xs text-slate-500">
            Smart defaults applied: Google Meet enabled, 5 min buffers, 14-day horizon
          </div>

          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              disabled={saving}
              className="flex-1 px-4 py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="flex-1 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50 font-medium"
            >
              {saving ? 'Creating...' : 'Create Link'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
```

**Step 2: Commit**

```bash
git add apps/web/src/components/CreateLinkModal.tsx
git commit -m "feat: add CreateLinkModal component

- Quick create mode with name and duration
- Smart defaults for buffers, horizon, Google Meet
- Form validation and error handling
- Calls onSuccess callback with new link ID"
```

---

## Task 8: ShareLinkModal Component

**Files:**
- Create: `apps/web/src/components/ShareLinkModal.tsx`

**Step 1: Create component**

```typescript
'use client';

import { useState, useEffect } from 'react';
import { useUser } from '@/hooks/useUser';
import * as api from '@/lib/api';

interface ShareLinkModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedLinkId?: string;
  links: Array<{ id: string; name: string; slug: string }>;
  onSuccess: () => void;
}

export function ShareLinkModal({
  isOpen,
  onClose,
  selectedLinkId,
  links,
  onSuccess,
}: ShareLinkModalProps) {
  const { user } = useUser();
  const [linkId, setLinkId] = useState(selectedLinkId || '');
  const [recipients, setRecipients] = useState('');
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const selectedLink = links.find((l) => l.id === linkId);

  useEffect(() => {
    if (isOpen) {
      // Set defaults when modal opens
      if (selectedLinkId && selectedLinkId !== linkId) {
        setLinkId(selectedLinkId);
      } else if (!linkId && links.length > 0) {
        setLinkId(links[0].id);
      }

      // Set default subject with user's name
      const userName = user?.name || user?.email || 'me';
      setSubject(`Meeting w/ ${userName}`);

      // Set default message
      setMessage("Hi! I'd like to schedule a meeting with you. Please book a time that works best for you using the link below.");

      setRecipients('');
      setError(null);
    }
  }, [isOpen, selectedLinkId, user, links, linkId]);

  const handleCopyLink = () => {
    if (!selectedLink) return;
    const baseUrl = window.location.origin;
    const url = `${baseUrl}/book/${selectedLink.slug}`;
    navigator.clipboard.writeText(url);
    onSuccess();
  };

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!selectedLink) {
      setError('Please select a link to share');
      return;
    }

    if (!recipients.trim()) {
      setError('Add at least one recipient');
      return;
    }

    if (!subject.trim()) {
      setError('Subject is required');
      return;
    }

    if (!message.trim()) {
      setError('Message is required');
      return;
    }

    // Parse and validate recipients
    const recipientList = recipients
      .split(',')
      .map((email) => email.trim())
      .filter((email) => email.length > 0);

    if (recipientList.length === 0) {
      setError('Add at least one recipient');
      return;
    }

    if (recipientList.length > 50) {
      setError('Maximum 50 recipients allowed');
      return;
    }

    try {
      setSending(true);

      const baseUrl = window.location.origin;
      const bookingUrl = `${baseUrl}/book/${selectedLink.slug}`;

      await api.sendMeetingLinkEmail({
        recipients: recipientList,
        subject: subject.trim(),
        message: message.trim(),
        bookingUrl,
      });

      onSuccess();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to send email');
    } finally {
      setSending(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white flex items-center justify-between p-6 border-b border-slate-200">
          <h3 className="text-xl font-semibold text-slate-800">Share Meeting Link</h3>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600"
          >
            ✕
          </button>
        </div>

        <form onSubmit={handleSend} className="p-6 space-y-4">
          {error && (
            <div className="px-4 py-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm">
              {error}
            </div>
          )}

          {links.length > 1 && (
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Select Link
              </label>
              <select
                value={linkId}
                onChange={(e) => setLinkId(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
              >
                {links.map((link) => (
                  <option key={link.id} value={link.id}>
                    {link.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Recipients *
            </label>
            <input
              type="text"
              value={recipients}
              onChange={(e) => setRecipients(e.target.value)}
              placeholder="client@example.com, team@example.com"
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
            <p className="text-xs text-slate-500 mt-1">
              Separate multiple emails with commas
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Subject *
            </label>
            <input
              type="text"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Message *
            </label>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={4}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
          </div>

          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={handleCopyLink}
              disabled={!selectedLink}
              className="flex-1 px-4 py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 disabled:opacity-50"
            >
              Copy Link
            </button>
            <button
              type="submit"
              disabled={sending}
              className="flex-1 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50 font-medium"
            >
              {sending ? 'Sending...' : 'Send Email'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
```

**Step 2: Commit**

```bash
git add apps/web/src/components/ShareLinkModal.tsx
git commit -m "feat: add ShareLinkModal component

- Email composer with recipients, subject, message
- Link selector for multiple links
- Default subject with user's name
- Email validation and error handling
- Copy link alternative action"
```

---

## Task 9: Update MeetingManagementPanel

**Files:**
- Modify: `apps/web/src/components/PlanMeetingsPanel.tsx`

**Step 1: Rename and update component**

Rename `PlanMeetingsPanel.tsx` to `MeetingManagementPanel.tsx` and update:

```typescript
'use client';

import { useState, useEffect } from 'react';
import { useUser } from '@/hooks/useUser';
import { CreateLinkModal } from './CreateLinkModal';
import { ShareLinkModal } from './ShareLinkModal';
import { Toast } from './Toast';
import { useToast } from '@/hooks/useToast';
import * as api from '@/lib/api';

interface SchedulingLink {
  id: string;
  name: string;
  slug: string;
  isActive: boolean;
  durationsMinutes: number[];
  calendarProvider: string;
}

interface Meeting {
  id: string;
  inviteeName: string;
  inviteeEmail: string;
  startDateTime: string;
  endDateTime: string;
  status: string;
}

export function MeetingManagementPanel() {
  const { user } = useUser();
  const { toasts, showToast, hideToast } = useToast();
  const [links, setLinks] = useState<SchedulingLink[]>([]);
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState(false);

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const [selectedLinkForShare, setSelectedLinkForShare] = useState<string | undefined>();

  useEffect(() => {
    fetchData();
  }, []);

  async function fetchData() {
    try {
      setLoading(true);
      const [linksData, meetingsData] = await Promise.all([
        api.getSchedulingLinks(),
        api.getMeetings(),
      ]);
      setLinks(linksData);
      setMeetings(meetingsData.filter((m) => m.status === 'scheduled'));
    } catch (error) {
      console.error('Failed to fetch meeting data:', error);
    } finally {
      setLoading(false);
    }
  }

  const activeLinks = links.filter((l) => l.isActive);
  const upcomingMeetings = meetings.filter((m) => new Date(m.startDateTime) > new Date());

  function handleCopyLink(slug: string) {
    const baseUrl = window.location.origin;
    const url = `${baseUrl}/book/${slug}`;
    navigator.clipboard.writeText(url);
    showToast('Link copied to clipboard', 'success');
  }

  function handleCreateClick() {
    setShowCreateModal(true);
  }

  function handleShareClick() {
    setSelectedLinkForShare(undefined);
    setShowShareModal(true);
  }

  function handleCreateSuccess(linkId: string) {
    showToast('Link created successfully', 'success');
    fetchData();
    // Auto-transition to share modal
    setSelectedLinkForShare(linkId);
    setShowShareModal(true);
  }

  function handleShareSuccess() {
    const recipientCount = 1; // Could get actual count from modal
    showToast(`Email sent successfully`, 'success');
  }

  if (loading) {
    return (
      <div className="bg-white overflow-hidden flex-shrink-0">
        <div className="flex items-center justify-between px-3 py-2.5 bg-slate-50/50">
          <h3 className="text-sm font-semibold text-slate-600">Plan Meetings</h3>
        </div>
        <div className="p-3 text-center">
          <p className="text-xs text-slate-500">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="bg-white overflow-hidden flex-shrink-0 border-t border-slate-200">
        {/* Header */}
        <div className="flex items-center justify-between px-3 py-2.5 bg-gradient-to-r from-purple-50 to-primary-50">
          <div className="flex items-center gap-2">
            <svg
              className="w-4 h-4 text-primary-600"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
              />
            </svg>
            <h3 className="text-sm font-semibold text-slate-700">Plan Meetings</h3>
          </div>
          <button
            onClick={() => setExpanded(!expanded)}
            className="text-slate-500 hover:text-slate-700"
          >
            <svg
              className={`w-4 h-4 transition-transform ${expanded ? 'rotate-180' : ''}`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="p-3 space-y-3">
          {/* Stats */}
          <div className="grid grid-cols-2 gap-2">
            <div className="bg-purple-50 rounded-lg p-2 text-center">
              <p className="text-xs text-purple-600 font-medium">{activeLinks.length}</p>
              <p className="text-[11px] text-purple-700">Active Links</p>
            </div>
            <div className="bg-primary-50 rounded-lg p-2 text-center">
              <p className="text-xs text-primary-600 font-medium">{upcomingMeetings.length}</p>
              <p className="text-[11px] text-primary-700">Upcoming</p>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="space-y-2">
            <button
              onClick={handleCreateClick}
              className="w-full bg-primary-600 text-white text-xs font-medium py-2 rounded-lg hover:bg-primary-700 text-center transition-colors flex items-center justify-center gap-1"
            >
              <span>+</span> Create Link
            </button>
            <button
              onClick={handleShareClick}
              disabled={activeLinks.length === 0}
              className="w-full bg-white border border-primary-200 text-primary-700 text-xs font-medium py-2 rounded-lg hover:bg-primary-50 text-center transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-1"
            >
              📤 Share Link
            </button>
            <a
              href="/settings#meeting-manager"
              className="block w-full bg-white border border-slate-200 text-slate-700 text-xs font-medium py-2 rounded-lg hover:bg-slate-50 text-center transition-colors"
            >
              📋 View Meetings
            </a>
          </div>

          {/* Expanded: Show Links */}
          {expanded && activeLinks.length > 0 && (
            <div className="space-y-2 pt-2 border-t border-slate-200">
              <p className="text-[11px] font-semibold text-slate-600 uppercase tracking-wide">
                Your Links
              </p>
              {activeLinks.slice(0, 3).map((link) => (
                <div
                  key={link.id}
                  className="bg-slate-50 rounded-lg p-2 hover:bg-slate-100 transition-colors"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium text-slate-800 truncate">{link.name}</p>
                      <p className="text-[11px] text-slate-500 truncate">/book/{link.slug}</p>
                    </div>
                    <button
                      onClick={() => handleCopyLink(link.slug)}
                      className="flex-shrink-0 text-primary-600 hover:text-primary-700"
                      title="Copy link"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
                        />
                      </svg>
                    </button>
                  </div>
                </div>
              ))}
              {activeLinks.length > 3 && (
                <p className="text-[11px] text-slate-500 text-center">
                  +{activeLinks.length - 3} more
                </p>
              )}
            </div>
          )}

          {/* Empty State */}
          {activeLinks.length === 0 && (
            <div className="text-center py-2">
              <p className="text-[11px] text-slate-500">
                No active scheduling links.<br />
                Create one to get started!
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Modals */}
      <CreateLinkModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onSuccess={handleCreateSuccess}
      />

      <ShareLinkModal
        isOpen={showShareModal}
        onClose={() => setShowShareModal(false)}
        selectedLinkId={selectedLinkForShare}
        links={activeLinks}
        onSuccess={handleShareSuccess}
      />

      {/* Toasts */}
      {toasts.map((toast) => (
        <Toast
          key={toast.id}
          message={toast.message}
          type={toast.type}
          onClose={() => hideToast(toast.id)}
        />
      ))}
    </>
  );
}
```

**Step 2: Update calendar page import**

```typescript
// In apps/web/src/app/calendar/page.tsx
import { MeetingManagementPanel } from '@/components/MeetingManagementPanel';
```

**Step 3: Commit**

```bash
git mv apps/web/src/components/PlanMeetingsPanel.tsx apps/web/src/components/MeetingManagementPanel.tsx
git add apps/web/src/components/MeetingManagementPanel.tsx apps/web/src/app/calendar/page.tsx
git commit -m "feat: upgrade to MeetingManagementPanel with create/share

- Rename PlanMeetingsPanel to MeetingManagementPanel
- Add Create Link and Share Link buttons
- Integrate CreateLinkModal and ShareLinkModal
- Auto-transition from create to share
- Toast notifications for success/error
- Disable Share button when no links exist"
```

---

## Task 10: Update User API to Include Name

**Files:**
- Modify: `apps/backend/src/controllers/userController.ts`
- Modify: `packages/shared/src/types/user.ts`

**Step 1: Add name to User type**

```typescript
export interface User {
  id: string;
  email: string;
  name?: string; // NEW
  timeZone: string;
  wakeTime: string;
  sleepTime: string;
  defaultTaskDurationMinutes: number;
  defaultCalendarId?: string;
  dailySchedule?: DailyScheduleConfig;
  dailyScheduleConstraints?: DailyScheduleConfig;
}
```

**Step 2: Update getCurrentUser to include name**

In userController.ts, find the getCurrentUser function and add name to the response:

```typescript
export async function getCurrentUser(request: FastifyRequest, reply: FastifyReply) {
  const userId = request.userId!;

  const user = await prisma.user.findUnique({ where: { id: userId } });

  if (!user) {
    reply.status(404).send({ error: 'User not found' });
    return;
  }

  reply.send({
    id: user.id,
    email: user.email,
    name: user.name, // NEW
    timeZone: user.timeZone,
    wakeTime: user.wakeTime,
    sleepTime: user.sleepTime,
    defaultTaskDurationMinutes: user.defaultTaskDurationMinutes,
    defaultCalendarId: user.defaultCalendarId,
    dailySchedule: user.dailySchedule,
    dailyScheduleConstraints: user.dailyScheduleConstraints,
  });
}
```

**Step 3: Allow updating name in updatePreferences**

```typescript
export async function updatePreferences(
  request: FastifyRequest<{ Body: UpdatePreferencesRequest }>,
  reply: FastifyReply
) {
  const userId = request.userId!;
  const updates = request.body;

  await prisma.user.update({
    where: { id: userId },
    data: {
      name: updates.name, // NEW
      timeZone: updates.timeZone,
      wakeTime: updates.wakeTime,
      sleepTime: updates.sleepTime,
      defaultTaskDurationMinutes: updates.defaultTaskDurationMinutes,
      defaultCalendarId: updates.defaultCalendarId,
      dailySchedule: updates.dailySchedule as any,
      dailyScheduleConstraints: updates.dailyScheduleConstraints as any,
    },
  });

  reply.send({ success: true });
}
```

**Step 4: Commit**

```bash
git add apps/backend/src/controllers/userController.ts packages/shared/src/types/user.ts
git commit -m "feat: add name field to User API

- Include name in User type
- Return name in getCurrentUser
- Allow updating name in updatePreferences"
```

---

## Task 11: Integration Testing

**Files:**
- Create: `apps/backend/src/__tests__/integration/meetingEmail.test.ts`

**Step 1: Write integration test**

```typescript
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { build } from '../../server.js';
import { FastifyInstance } from 'fastify';

describe('Meeting Email Integration', () => {
  let server: FastifyInstance;

  beforeAll(async () => {
    server = await build();
  });

  afterAll(async () => {
    await server.close();
  });

  describe('POST /api/meetings/send-link-email', () => {
    it('should reject requests without auth', async () => {
      const response = await server.inject({
        method: 'POST',
        url: '/api/meetings/send-link-email',
        payload: {
          recipients: ['test@example.com'],
          subject: 'Test',
          message: 'Test message',
          bookingUrl: 'https://app.com/book/test',
        },
      });

      expect(response.statusCode).toBe(401);
    });

    it('should validate recipients are required', async () => {
      const response = await server.inject({
        method: 'POST',
        url: '/api/meetings/send-link-email',
        headers: {
          authorization: 'Bearer test-token',
        },
        payload: {
          recipients: [],
          subject: 'Test',
          message: 'Test message',
          bookingUrl: 'https://app.com/book/test',
        },
      });

      expect(response.statusCode).toBe(400);
      expect(response.json().error).toContain('recipient');
    });

    it('should validate email format', async () => {
      const response = await server.inject({
        method: 'POST',
        url: '/api/meetings/send-link-email',
        headers: {
          authorization: 'Bearer test-token',
        },
        payload: {
          recipients: ['invalid-email'],
          subject: 'Test',
          message: 'Test message',
          bookingUrl: 'https://app.com/book/test',
        },
      });

      expect(response.statusCode).toBe(400);
      expect(response.json().error).toContain('Invalid email');
    });

    it('should enforce max recipient limit', async () => {
      const recipients = Array.from({ length: 51 }, (_, i) => `user${i}@example.com`);

      const response = await server.inject({
        method: 'POST',
        url: '/api/meetings/send-link-email',
        headers: {
          authorization: 'Bearer test-token',
        },
        payload: {
          recipients,
          subject: 'Test',
          message: 'Test message',
          bookingUrl: 'https://app.com/book/test',
        },
      });

      expect(response.statusCode).toBe(400);
      expect(response.json().error).toContain('50 recipients');
    });
  });
});
```

**Step 2: Run integration tests**

Run: `cd apps/backend && pnpm test src/__tests__/integration/meetingEmail.test.ts`
Expected: Tests should pass (validation tests, auth test may need mocking)

**Step 3: Commit**

```bash
git add apps/backend/src/__tests__/integration/meetingEmail.test.ts
git commit -m "test: add integration tests for meeting email API

- Test authentication requirement
- Test recipient validation
- Test email format validation
- Test max recipient limit"
```

---

## Task 12: Manual Testing & QA

**Step 1: Start servers**

```bash
# Terminal 1
cd apps/backend && pnpm dev

# Terminal 2
cd apps/web && pnpm dev
```

**Step 2: Test create flow**

1. Navigate to calendar page
2. Click "Create Link" in Plan Meetings panel
3. Enter name "Test Meeting"
4. Select "30 min" duration
5. Click "Create Link"
6. Verify modal transitions to Share modal
7. Verify toast shows "Link created successfully"

**Step 3: Test share flow**

1. In Share modal, verify link is pre-selected
2. Enter recipient email(s): "test@example.com"
3. Verify subject pre-filled with your name
4. Verify message pre-filled with default template
5. Click "Send Email"
6. Verify toast shows "Email sent successfully"
7. Check recipient inbox for email
8. Verify email is properly formatted (HTML + text)
9. Verify booking link is clickable

**Step 4: Test copy link**

1. Click "Share Link" button
2. Click "Copy Link" instead of Send Email
3. Verify toast shows "Link copied to clipboard"
4. Paste in browser to verify URL is correct

**Step 5: Test validation**

1. Try creating link with empty name → Should show error
2. Try creating link with no duration → Should show error
3. Try sharing with empty recipients → Should show error
4. Try sharing with invalid email format → Should show error

**Step 6: Test email rendering**

Open sent email in:
- Gmail (web)
- Gmail (mobile)
- Outlook (web)
- Apple Mail

Verify:
- HTML renders correctly
- Button is clickable
- Link fallback is visible
- Mobile-responsive
- No broken layouts

**Step 7: Document any issues**

Create file: `docs/qa/2025-12-27-meeting-management-qa.md`

---

## Success Criteria

✅ User can create scheduling link from calendar in <30 seconds
✅ User can share link via email in <30 seconds
✅ Total workflow (create + share) completes in <60 seconds
✅ Emails render correctly across Gmail, Outlook, Apple Mail
✅ Email contains professional HTML and plain text versions
✅ Subject line includes host's name
✅ Validation prevents invalid inputs
✅ Toast notifications provide clear feedback
✅ Copy link alternative works
✅ All tests pass

---

## Rollout Checklist

- [ ] All unit tests pass
- [ ] All integration tests pass
- [ ] Manual QA completed
- [ ] Email rendering verified across clients
- [ ] Performance metrics met (<60s workflow)
- [ ] No console errors in browser
- [ ] No backend errors in logs
- [ ] User name migration applied
- [ ] Documentation updated

---

**Total Estimated Time**: 4-6 hours

**Priority**: High (Core workflow improvement)

**Dependencies**: Sprint 15 (scheduling links infrastructure)
