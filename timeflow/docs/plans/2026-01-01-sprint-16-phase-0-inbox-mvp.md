# Sprint 16 Phase 0: Inbox MVP (Email Triage) - Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Transform `/inbox` from a basic email list into a daily-usable triage surface with thread detail view, read/unread/archive actions, server-backed search, and transparent categorization explanations.

**Architecture:** Upgrade the existing `/inbox` page (editorial "Executive Briefing" design) to support thread-level operations with optimistic UI updates, integrate with existing Gmail API endpoints, and add categorization transparency by showing users *why* emails are categorized (override → domain → keywords → Gmail labels).

**Tech Stack:**
- **Backend**: Fastify, Gmail API (googleapis), existing gmailService, emailOverrideService
- **Frontend**: Next.js 14, Framer Motion, Tailwind CSS, existing api.ts client, DOMPurify for HTML sanitization
- **Database**: Prisma (EmailCategoryOverride from Sprint 15)

---

## Task 1: Add Thread Detail View with "Open in Gmail"

**Files:**
- Modify: `apps/web/src/app/inbox/page.tsx` (existing inbox page)
- Modify: `apps/web/src/lib/api.ts` (add thread fetching if needed)
- Backend already has: `apps/backend/src/controllers/emailController.ts:66` (`getFullEmail`)

**Step 1: Install DOMPurify for HTML sanitization**

```bash
cd apps/web
pnpm add dompurify
pnpm add -D @types/dompurify
```

**Step 2: Add state for selected thread**

Update state management in inbox page:

```typescript
// Add to existing state in apps/web/src/app/inbox/page.tsx
const [selectedThreadId, setSelectedThreadId] = useState<string | null>(null);
const [threadMessages, setThreadMessages] = useState<FullEmailMessage[]>([]);
const [loadingThread, setLoadingThread] = useState(false);
```

**Step 3: Create thread fetching function**

```typescript
async function fetchThread(threadId: string) {
  setLoadingThread(true);
  try {
    // Get all messages in the thread
    const messagesInThread = emails.filter(e => e.threadId === threadId);

    // Fetch full content for each message
    const fullMessages = await Promise.all(
      messagesInThread.map(msg => api.getFullEmail(msg.id))
    );

    setThreadMessages(fullMessages);
    setSelectedThreadId(threadId);
  } catch (error) {
    console.error('Failed to fetch thread:', error);
  } finally {
    setLoadingThread(false);
  }
}
```

**Step 4: Add EmailBody component with safe HTML rendering**

Create helper component for safe HTML rendering:

```typescript
'use client';

import DOMPurify from 'dompurify';
import { useMemo } from 'react';

interface EmailBodyProps {
  html?: string;
  plainText?: string;
}

function EmailBody({ html, plainText }: EmailBodyProps) {
  const sanitizedHtml = useMemo(() => {
    if (!html) return null;
    return DOMPurify.sanitize(html, {
      ALLOWED_TAGS: ['p', 'br', 'b', 'i', 'u', 'strong', 'em', 'a', 'ul', 'ol', 'li', 'blockquote'],
      ALLOWED_ATTR: ['href', 'target', 'rel'],
    });
  }, [html]);

  if (sanitizedHtml) {
    return (
      <div
        className="prose max-w-none"
        dangerouslySetInnerHTML={{ __html: sanitizedHtml }}
      />
    );
  }

  if (plainText) {
    return (
      <div className="prose max-w-none whitespace-pre-wrap">
        {plainText}
      </div>
    );
  }

  return <div className="text-gray-400 italic">No content available</div>;
}
```

**Step 5: Add thread detail panel UI**

Add expandable thread detail panel after email list:

```tsx
{selectedThreadId && (
  <motion.div
    initial={{ opacity: 0, x: 20 }}
    animate={{ opacity: 1, x: 0 }}
    exit={{ opacity: 0, x: 20 }}
    className="fixed right-0 top-0 h-screen w-1/2 bg-white border-l border-gray-200 shadow-2xl overflow-y-auto z-50"
  >
    <div className="sticky top-0 bg-white border-b border-gray-200 p-4 flex items-center justify-between">
      <h2 className="font-serif text-xl font-bold">Thread Details</h2>
      <div className="flex gap-2">
        <a
          href={`https://mail.google.com/mail/u/0/#inbox/${selectedThreadId}`}
          target="_blank"
          rel="noopener noreferrer"
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
        >
          <ExternalLink size={16} />
          Open in Gmail
        </a>
        <button
          onClick={() => setSelectedThreadId(null)}
          className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
        >
          Close
        </button>
      </div>
    </div>

    <div className="p-6 space-y-6">
      {loadingThread ? (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      ) : (
        threadMessages.map((message, idx) => (
          <div key={message.id} className="border border-gray-200 rounded-lg p-6 bg-gray-50">
            <div className="flex items-start justify-between mb-4">
              <div>
                <div className="font-semibold text-gray-900">{message.from}</div>
                <div className="text-sm text-gray-500">
                  To: {message.to} {message.cc && `• Cc: ${message.cc}`}
                </div>
              </div>
              <div className="text-sm text-gray-500">
                {new Date(message.receivedAt).toLocaleString()}
              </div>
            </div>

            <EmailBody html={message.body} plainText={message.snippet} />

            {message.attachments && message.attachments.length > 0 && (
              <div className="mt-4 pt-4 border-t border-gray-300">
                <div className="text-sm font-semibold text-gray-700 mb-2">Attachments:</div>
                <div className="space-y-2">
                  {message.attachments.map((att, i) => (
                    <div key={i} className="flex items-center gap-2 text-sm text-gray-600">
                      <Paperclip size={14} />
                      {att.filename} ({Math.round(att.size / 1024)}KB)
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        ))
      )}
    </div>
  </motion.div>
)}
```

**Step 6: Wire up click handler**

Update email row click handler:

```typescript
// In the email list rendering section
<div
  onClick={() => fetchThread(email.threadId || email.id)}
  className="cursor-pointer hover:bg-gray-50 transition-colors"
>
  {/* existing email row content */}
</div>
```

**Step 7: Add necessary imports**

```typescript
import { ExternalLink, Paperclip } from 'lucide-react';
import type { FullEmailMessage } from '@/lib/api';
import DOMPurify from 'dompurify';
```

**Step 8: Test thread detail view**

Manual test:
1. Navigate to `/inbox`
2. Click on an email thread
3. Verify thread detail panel opens on right side
4. Verify "Open in Gmail" button works
5. Verify close button works
6. Verify thread messages display correctly with sanitized HTML
7. Verify no XSS vulnerabilities (test with malicious HTML)

**Step 9: Commit**

```bash
git add apps/web/src/app/inbox/page.tsx apps/web/package.json
git commit -m "feat: add thread detail view with Open in Gmail button

- Add expandable thread detail panel
- Fetch full thread messages on click
- Display thread messages with safe HTML sanitization (DOMPurify)
- Add Open in Gmail external link button
- Prevent XSS vulnerabilities with sanitized HTML rendering

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

## Task 2: Implement Triage Actions (Read/Unread, Archive) with Optimistic UI

**Files:**
- Modify: `apps/web/src/app/inbox/page.tsx`
- Modify: `apps/web/src/lib/api.ts` (add optimistic update helpers)
- Backend already has: `emailController.ts:148` (markEmailAsRead), `:176` (archiveEmail)

**Step 1: Add optimistic update functions**

```typescript
// In apps/web/src/app/inbox/page.tsx

async function handleToggleRead(emailId: string, currentIsRead: boolean) {
  const newIsRead = !currentIsRead;

  // Optimistic update
  setEmails(prev => prev.map(e =>
    e.id === emailId ? { ...e, isRead: newIsRead } : e
  ));

  try {
    await api.markEmailAsRead(emailId, newIsRead);
  } catch (error: any) {
    // Revert on error
    setEmails(prev => prev.map(e =>
      e.id === emailId ? { ...e, isRead: currentIsRead } : e
    ));

    if (error.response?.status === 429) {
      alert(`Rate limit exceeded. ${error.response.data.error}. Please try again in ${error.response.data.retryAfterSeconds} seconds.`);
    } else {
      alert('Failed to update read status. Please try again.');
    }
  }
}

async function handleArchive(emailId: string) {
  // Optimistic removal
  const emailToArchive = emails.find(e => e.id === emailId);
  setEmails(prev => prev.filter(e => e.id !== emailId));

  try {
    await api.archiveEmail(emailId);

    // If thread detail is open for this email, close it
    if (selectedThreadId === emailToArchive?.threadId) {
      setSelectedThreadId(null);
    }
  } catch (error: any) {
    // Revert on error
    if (emailToArchive) {
      setEmails(prev => [...prev, emailToArchive].sort((a, b) =>
        new Date(b.receivedAt).getTime() - new Date(a.receivedAt).getTime()
      ));
    }

    if (error.response?.status === 429) {
      alert(`Rate limit exceeded. ${error.response.data.error}. Please try again in ${error.response.data.retryAfterSeconds} seconds.`);
    } else {
      alert('Failed to archive email. Please try again.');
    }
  }
}
```

**Step 2: Add action buttons to email row UI**

Add hover actions to each email row:

```tsx
<div className="relative group">
  {/* Existing email row content */}

  {/* Hover actions */}
  <div className="absolute right-4 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-2">
    <button
      onClick={(e) => {
        e.stopPropagation();
        handleToggleRead(email.id, email.isRead);
      }}
      className="p-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
      title={email.isRead ? 'Mark as unread' : 'Mark as read'}
    >
      {email.isRead ? <MailOpen size={16} /> : <Mail size={16} />}
    </button>

    <button
      onClick={(e) => {
        e.stopPropagation();
        handleArchive(email.id);
      }}
      className="p-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
      title="Archive"
    >
      <Archive size={16} />
    </button>

    {/* Keep existing "Correct →" button */}
  </div>
</div>
```

**Step 3: Add visual indicator for unread emails**

Add conditional styling for unread emails:

```tsx
<div
  className={cn(
    "p-4 border-l-4 transition-all",
    email.isRead ? "border-l-transparent" : "border-l-blue-600 bg-blue-50"
  )}
>
  <div className={cn(
    "font-serif text-lg",
    !email.isRead && "font-bold"
  )}>
    {email.subject}
  </div>
</div>
```

**Step 4: Add necessary imports**

```typescript
import { Mail, MailOpen, Archive } from 'lucide-react';
```

**Step 5: Update API client with error handling**

Ensure api.ts handles errors properly (it already does based on existing code):

```typescript
// apps/web/src/lib/api.ts - verify these exist

export async function markEmailAsRead(emailId: string, isRead: boolean): Promise<void> {
  const response = await fetch(`${API_BASE_URL}/email/${emailId}/read`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify({ isRead }),
  });

  if (!response.ok) {
    const error: any = new Error('Failed to mark as read');
    error.response = { status: response.status, data: await response.json() };
    throw error;
  }
}

export async function archiveEmail(emailId: string): Promise<void> {
  const response = await fetch(`${API_BASE_URL}/email/${emailId}/archive`, {
    method: 'POST',
    headers: getHeaders(),
  });

  if (!response.ok) {
    const error: any = new Error('Failed to archive email');
    error.response = { status: response.status, data: await response.json() };
    throw error;
  }
}
```

**Step 6: Test triage actions**

Manual test:
1. Navigate to `/inbox`
2. Hover over an email → verify action buttons appear
3. Click "Mark as read" → verify UI updates instantly, no errors
4. Click "Mark as unread" → verify UI updates instantly
5. Click "Archive" → verify email disappears instantly
6. Test with bad network (throttle) → verify optimistic updates revert on error
7. Test rate limit scenario → verify friendly error message

**Step 7: Commit**

```bash
git add apps/web/src/app/inbox/page.tsx apps/web/src/lib/api.ts
git commit -m "feat: add optimistic read/unread and archive actions

- Implement optimistic UI updates for read/unread toggle
- Implement optimistic UI updates for archive action
- Add hover action buttons to email rows
- Handle rate limit errors with user-friendly messages
- Revert optimistic updates on API errors

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

## Task 3: Add Server-Backed Search with Client-Side Fallback

**Files:**
- Modify: `apps/web/src/app/inbox/page.tsx`
- Backend already has: `emailController.ts:118` (searchEmails)
- API client already has: `apps/web/src/lib/api.ts` (may need to add searchEmails if missing)

**Step 1: Add search mode state**

```typescript
// In apps/web/src/app/inbox/page.tsx

const [searchMode, setSearchMode] = useState<'client' | 'server'>('client');
const [serverSearchResults, setServerSearchResults] = useState<EmailMessage[]>([]);
const [searchLoading, setSearchLoading] = useState(false);
```

**Step 2: Add server search function**

```typescript
async function performServerSearch(query: string) {
  if (!query || query.length < 2) {
    setSearchMode('client');
    setServerSearchResults([]);
    return;
  }

  setSearchLoading(true);
  setSearchMode('server');

  try {
    const result = await api.searchEmails(query);
    setServerSearchResults(result.messages);
  } catch (error: any) {
    console.error('Server search failed, falling back to client search:', error);
    setSearchMode('client');
    setServerSearchResults([]);

    if (error.response?.status === 429) {
      alert(`Rate limit exceeded. Falling back to client-side search.`);
    }
  } finally {
    setSearchLoading(false);
  }
}
```

**Step 3: Add debounced search trigger**

```typescript
import { useEffect, useRef } from 'react';

// Add debounce for server search
const searchDebounceTimer = useRef<NodeJS.Timeout | null>(null);

function handleSearchChange(newQuery: string) {
  setSearchQuery(newQuery);

  // Clear existing timer
  if (searchDebounceTimer.current) {
    clearTimeout(searchDebounceTimer.current);
  }

  // If query is empty, reset to client mode
  if (!newQuery) {
    setSearchMode('client');
    setServerSearchResults([]);
    return;
  }

  // Debounce server search (500ms)
  searchDebounceTimer.current = setTimeout(() => {
    performServerSearch(newQuery);
  }, 500);
}
```

**Step 4: Update filtered emails logic**

```typescript
// Replace existing filteredBySearch logic

const displayEmails = searchMode === 'server'
  ? serverSearchResults
  : (searchQuery
      ? emails.filter(e =>
          e.subject.toLowerCase().includes(searchQuery.toLowerCase()) ||
          e.from.toLowerCase().includes(searchQuery.toLowerCase()) ||
          e.snippet?.toLowerCase().includes(searchQuery.toLowerCase())
        )
      : emails
    );
```

**Step 5: Update search input UI**

```tsx
<div className="relative">
  <input
    type="text"
    placeholder="Search emails..."
    value={searchQuery}
    onChange={(e) => handleSearchChange(e.target.value)}
    className="w-full px-4 py-2 pl-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
  />
  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />

  {searchLoading && (
    <div className="absolute right-3 top-1/2 -translate-y-1/2">
      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
    </div>
  )}

  {searchMode === 'server' && !searchLoading && (
    <div className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-500">
      Gmail search
    </div>
  )}
</div>
```

**Step 6: Add searchEmails to API client if missing**

```typescript
// apps/web/src/lib/api.ts

export async function searchEmails(query: string, maxResults: number = 50): Promise<EmailInboxResponse> {
  const response = await fetch(`${API_BASE_URL}/email/search?q=${encodeURIComponent(query)}&maxResults=${maxResults}`, {
    method: 'GET',
    headers: getHeaders(),
  });

  if (!response.ok) {
    const error: any = new Error('Failed to search emails');
    error.response = { status: response.status, data: await response.json() };
    throw error;
  }

  return response.json();
}
```

**Step 7: Test search functionality**

Manual test:
1. Navigate to `/inbox`
2. Type a search query slowly → verify debounce works (doesn't fire immediately)
3. Wait 500ms → verify server search triggers, loading indicator shows
4. Verify search results display correctly
5. Clear search → verify returns to full inbox
6. Test with bad network → verify fallback to client search works

**Step 8: Commit**

```bash
git add apps/web/src/app/inbox/page.tsx apps/web/src/lib/api.ts
git commit -m "feat: add server-backed search with client-side fallback

- Implement debounced Gmail search API integration
- Add automatic fallback to client-side search on errors
- Show loading indicator during server search
- Display search mode indicator (Gmail search vs local)
- Handle rate limit errors gracefully

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

## Task 4: Replace Placeholder "Why This Label?" with Real Explanations

**Files:**
- Modify: `apps/web/src/app/inbox/page.tsx`
- Create: `apps/backend/src/services/emailExplanationService.ts`
- Modify: `apps/backend/src/controllers/emailController.ts`
- Modify: `apps/backend/src/routes/emailRoutes.ts` (add new endpoint)

**Step 1: Create email explanation service**

Create new file: `apps/backend/src/services/emailExplanationService.ts`

```typescript
/**
 * Email Explanation Service
 *
 * Provides transparent explanations for why emails are categorized.
 * Hierarchy: Override > Domain > Keywords > Gmail Labels
 */

import type { EmailCategory } from '@timeflow/shared';
import { EMAIL_CATEGORIES } from './emailCategorizationService.js';
import { findOverrideForSender, findOverrideForThread } from './emailOverrideService.js';

export interface EmailCategoryExplanation {
  category: EmailCategory;
  source: 'override' | 'domain' | 'keywords' | 'gmailLabel' | 'default';
  reason: string;
  details: {
    matchedValue?: string; // Sender email, domain, or keyword
    overrideType?: 'sender' | 'domain' | 'threadId';
    matchedKeywords?: string[];
    gmailLabel?: string;
  };
}

export async function explainCategorization(
  userId: string,
  email: {
    id: string;
    threadId?: string;
    from: string;
    subject: string;
    snippet?: string;
    labels: string[];
    category: EmailCategory;
  }
): Promise<EmailCategoryExplanation> {
  const fromAddress = extractEmailAddress(email.from.toLowerCase());
  const domain = extractDomain(fromAddress);

  // 1. Check for thread-specific override
  if (email.threadId) {
    const threadOverride = await findOverrideForThread(userId, email.threadId);
    if (threadOverride) {
      return {
        category: email.category,
        source: 'override',
        reason: `You manually set this conversation to "${email.category}"`,
        details: {
          overrideType: 'threadId',
          matchedValue: email.threadId,
        },
      };
    }
  }

  // 2. Check for sender override
  const senderOverride = await findOverrideForSender(userId, fromAddress);
  if (senderOverride) {
    const isEmailMatch = senderOverride.overrideType === 'sender';
    const isDomainMatch = senderOverride.overrideType === 'domain';

    return {
      category: email.category,
      source: 'override',
      reason: isEmailMatch
        ? `You set all emails from ${fromAddress} to "${email.category}"`
        : `You set all emails from @${domain} to "${email.category}"`,
      details: {
        overrideType: senderOverride.overrideType as 'sender' | 'domain',
        matchedValue: senderOverride.overrideValue,
      },
    };
  }

  // 3. Check Gmail labels
  const categoryConfig = EMAIL_CATEGORIES[email.category];
  if (categoryConfig.gmailLabels) {
    for (const label of categoryConfig.gmailLabels) {
      if (email.labels.includes(label)) {
        return {
          category: email.category,
          source: 'gmailLabel',
          reason: `Based on Gmail's "${label.replace('CATEGORY_', '')}" label`,
          details: {
            gmailLabel: label,
          },
        };
      }
    }
  }

  // 4. Check domain match
  if (categoryConfig.domains) {
    for (const configDomain of categoryConfig.domains) {
      if (domain.includes(configDomain)) {
        return {
          category: email.category,
          source: 'domain',
          reason: `Based on sender domain @${domain}`,
          details: {
            matchedValue: domain,
          },
        };
      }
    }
  }

  // 5. Check keyword match
  const subject = email.subject.toLowerCase();
  const snippet = (email.snippet || '').toLowerCase();
  const matchedKeywords: string[] = [];

  if (categoryConfig.keywords) {
    for (const keyword of categoryConfig.keywords) {
      if (subject.includes(keyword) || snippet.includes(keyword)) {
        matchedKeywords.push(keyword);
      }
    }
  }

  if (matchedKeywords.length > 0) {
    return {
      category: email.category,
      source: 'keywords',
      reason: `Based on keywords: ${matchedKeywords.slice(0, 3).join(', ')}${matchedKeywords.length > 3 ? '...' : ''}`,
      details: {
        matchedKeywords,
      },
    };
  }

  // 6. Default fallback
  return {
    category: email.category,
    source: 'default',
    reason: `Default categorization (no specific match found)`,
    details: {},
  };
}

function extractEmailAddress(from: string): string {
  const match = from.match(/<(.+)>/);
  return match ? match[1].toLowerCase() : from.toLowerCase();
}

function extractDomain(email: string): string {
  const parts = email.split('@');
  return parts.length > 1 ? parts[1] : email;
}
```

**Step 2: Add explanation endpoint**

Modify: `apps/backend/src/controllers/emailController.ts`

```typescript
// Add import
import * as emailExplanationService from '../services/emailExplanationService.js';

// Add new controller function
export async function explainEmailCategory(
  request: FastifyRequest<{ Params: { id: string } }>,
  reply: FastifyReply
) {
  const user = request.user;
  if (!user) {
    return reply.status(401).send({ error: 'Not authenticated' });
  }

  try {
    const emailId = request.params.id;

    // Get the email first
    const email = await gmailService.getFullEmail(user.id, emailId);

    // Get explanation
    const explanation = await emailExplanationService.explainCategorization(user.id, {
      id: email.id,
      threadId: email.threadId,
      from: email.from,
      subject: email.subject,
      snippet: email.snippet,
      labels: email.labels,
      category: (email as any).category || 'other',
    });

    return reply.send({ explanation });
  } catch (error) {
    request.log.error(error, 'Failed to explain email category');
    return reply.status(500).send({ error: 'Failed to explain categorization' });
  }
}
```

**Step 3: Register explanation endpoint**

Modify: `apps/backend/src/routes/emailRoutes.ts`

```typescript
// Add import at top
import { explainEmailCategory } from '../controllers/emailController.js';

// Add to registerEmailRoutes function
server.get('/email/:id/explanation', { preHandler: requireAuth }, explainEmailCategory);
```

**Step 4: Add frontend API client function**

Modify: `apps/web/src/lib/api.ts`

```typescript
export interface EmailCategoryExplanation {
  category: string;
  source: 'override' | 'domain' | 'keywords' | 'gmailLabel' | 'default';
  reason: string;
  details: {
    matchedValue?: string;
    overrideType?: 'sender' | 'domain' | 'threadId';
    matchedKeywords?: string[];
    gmailLabel?: string;
  };
}

export async function getEmailExplanation(emailId: string): Promise<{ explanation: EmailCategoryExplanation }> {
  const response = await fetch(`${API_BASE_URL}/email/${emailId}/explanation`, {
    method: 'GET',
    headers: getHeaders(),
  });

  if (!response.ok) {
    throw new Error('Failed to get email explanation');
  }

  return response.json();
}
```

**Step 5: Update inbox page to fetch and display explanations**

Modify: `apps/web/src/app/inbox/page.tsx`

```typescript
// Add state
const [explanations, setExplanations] = useState<Record<string, EmailCategoryExplanation>>({});

// Add fetch function
async function fetchExplanation(emailId: string) {
  if (explanations[emailId]) return; // Already fetched

  try {
    const result = await api.getEmailExplanation(emailId);
    setExplanations(prev => ({ ...prev, [emailId]: result.explanation }));
  } catch (error) {
    console.error('Failed to fetch explanation:', error);
  }
}

// Update expandable "Why This Label?" section
{expandedThreadId === email.threadId && (
  <motion.div
    initial={{ height: 0, opacity: 0 }}
    animate={{ height: 'auto', opacity: 1 }}
    exit={{ height: 0, opacity: 0 }}
    className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg"
  >
    <div className="font-semibold text-blue-900 mb-2">Why This Label?</div>

    {!explanations[email.id] ? (
      <button
        onClick={() => fetchExplanation(email.id)}
        className="text-sm text-blue-600 hover:underline"
      >
        Show explanation →
      </button>
    ) : (
      <div className="text-sm text-blue-800">
        <div className="font-medium mb-1">{explanations[email.id].reason}</div>

        {explanations[email.id].source === 'override' && (
          <div className="text-xs text-blue-600 mt-2">
            ✓ Your manual correction
          </div>
        )}

        {explanations[email.id].source === 'keywords' && (
          <div className="text-xs text-blue-600 mt-2">
            Keywords: {explanations[email.id].details.matchedKeywords?.join(', ')}
          </div>
        )}

        {explanations[email.id].source === 'domain' && (
          <div className="text-xs text-blue-600 mt-2">
            Domain: {explanations[email.id].details.matchedValue}
          </div>
        )}

        {explanations[email.id].source === 'gmailLabel' && (
          <div className="text-xs text-blue-600 mt-2">
            Gmail label: {explanations[email.id].details.gmailLabel}
          </div>
        )}
      </div>
    )}
  </motion.div>
)}
```

**Step 6: Test explanation feature**

Manual test:
1. Navigate to `/inbox`
2. Click on an email to expand
3. Click "Show explanation →"
4. Verify explanation loads and displays correctly
5. Test with different email types:
   - Email with user override (should show "Your manual correction")
   - Email from known domain (should show "Based on sender domain")
   - Email with keywords (should show "Based on keywords")
   - Email with Gmail label (should show "Based on Gmail's label")

**Step 7: Run backend tests**

Create test file: `apps/backend/src/services/__tests__/emailExplanationService.test.ts`

```typescript
import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { explainCategorization } from '../emailExplanationService.js';
import * as emailOverrideService from '../emailOverrideService.js';

// Mock the override service
jest.mock('../emailOverrideService.js');

describe('emailExplanationService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should explain override-based categorization', async () => {
    (emailOverrideService.findOverrideForSender as jest.Mock).mockResolvedValue({
      overrideType: 'sender',
      overrideValue: 'test@example.com',
      categoryName: 'Work',
    });

    const explanation = await explainCategorization('user123', {
      id: 'msg1',
      from: 'Test User <test@example.com>',
      subject: 'Test',
      labels: [],
      category: 'work',
    });

    expect(explanation.source).toBe('override');
    expect(explanation.reason).toContain('You set all emails from');
  });

  it('should explain Gmail label-based categorization', async () => {
    (emailOverrideService.findOverrideForSender as jest.Mock).mockResolvedValue(null);
    (emailOverrideService.findOverrideForThread as jest.Mock).mockResolvedValue(null);

    const explanation = await explainCategorization('user123', {
      id: 'msg1',
      from: 'promo@store.com',
      subject: 'Sale!',
      labels: ['CATEGORY_PROMOTIONS'],
      category: 'promotion',
    });

    expect(explanation.source).toBe('gmailLabel');
    expect(explanation.reason).toContain("Gmail's");
  });
});
```

Run tests:

```bash
cd apps/backend
pnpm test emailExplanationService
```

Expected: All tests pass

**Step 8: Commit**

```bash
git add apps/backend/src/services/emailExplanationService.ts \
        apps/backend/src/controllers/emailController.ts \
        apps/backend/src/routes/emailRoutes.ts \
        apps/backend/src/services/__tests__/emailExplanationService.test.ts \
        apps/web/src/lib/api.ts \
        apps/web/src/app/inbox/page.tsx

git commit -m "feat: add transparent email categorization explanations

Backend:
- Create emailExplanationService with hierarchy logic
- Add GET /api/email/:id/explanation endpoint
- Explain override > domain > keywords > Gmail labels
- Add unit tests for explanation service

Frontend:
- Fetch and display real categorization explanations
- Show source type (override, domain, keywords, Gmail label)
- Display matched values and keywords
- Add on-demand explanation loading

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

## Final QA & Polish

**Step 1: End-to-end QA checklist**

Test the complete flow:
- [ ] Navigate to `/inbox` and verify editorial design is preserved
- [ ] Click on email → thread detail panel opens
- [ ] "Open in Gmail" button works correctly
- [ ] Mark as read/unread works with optimistic UI
- [ ] Archive works with optimistic UI
- [ ] Search triggers server search after debounce
- [ ] Search falls back to client search on error
- [ ] "Why This Label?" shows real explanations
- [ ] Rate limit errors show friendly messages
- [ ] Category correction still works (from Sprint 15)
- [ ] HTML in emails is properly sanitized (no XSS)

**Step 2: Performance check**

- [ ] Inbox loads in < 2 seconds
- [ ] Thread detail loads in < 1 second
- [ ] Search results appear in < 1 second
- [ ] Optimistic UI updates feel instant
- [ ] No layout shifts or flicker

**Step 3: Error handling check**

- [ ] Bad network → graceful fallback
- [ ] Rate limit → friendly error message
- [ ] Missing data → sensible defaults
- [ ] API errors → no crashes, user feedback

**Step 4: Accessibility check**

- [ ] All buttons have titles/labels
- [ ] Keyboard navigation works
- [ ] Focus states are visible
- [ ] Color contrast meets WCAG AA

**Step 5: Update documentation**

Update: `docs/SPRINT_15_INBOX_FOUNDATIONS_IMPLEMENTATION.md`

Add section:

```markdown
## Sprint 16 Phase 0 Enhancements (2026-01-01)

**Status**: ✅ Complete

### Additions
- ✅ Thread detail view with expandable panel
- ✅ "Open in Gmail" external link button
- ✅ Read/unread toggle with optimistic UI
- ✅ Archive action with optimistic UI
- ✅ Server-backed Gmail search with client fallback
- ✅ Real "Why This Label?" explanations (override > domain > keywords > Gmail labels)
- ✅ HTML sanitization with DOMPurify (XSS protection)

### Technical Details
- Added `emailExplanationService.ts` for categorization transparency
- Implemented debounced search (500ms) to reduce API calls
- Optimistic UI updates with revert on error
- Rate limit error handling with user-friendly messages
- Thread-level operations support
- Safe HTML rendering with DOMPurify sanitization

### Files Modified
- `apps/web/src/app/inbox/page.tsx` - Thread detail, triage actions, search
- `apps/web/src/lib/api.ts` - New API client functions
- `apps/web/package.json` - Added DOMPurify dependency
- `apps/backend/src/services/emailExplanationService.ts` - NEW
- `apps/backend/src/controllers/emailController.ts` - Explanation endpoint
- `apps/backend/src/routes/emailRoutes.ts` - Route registration
```

**Step 6: Final commit**

```bash
git add docs/SPRINT_15_INBOX_FOUNDATIONS_IMPLEMENTATION.md
git commit -m "docs: add Sprint 16 Phase 0 completion summary

- Document thread detail view implementation
- Document triage actions (read/unread, archive)
- Document server-backed search with fallback
- Document categorization explanation feature
- Document HTML sanitization for security

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

## Acceptance Criteria Verification

### Task 16.0: Thread list + thread detail + "Open in Gmail"
- [x] Clicking an email opens thread detail panel
- [x] Thread detail shows all messages in conversation
- [x] "Open in Gmail" button links to correct thread
- [x] Close button dismisses panel
- [x] Thread loading indicator works
- [x] HTML content is safely sanitized (no XSS)

### Task 16.0b: Triage actions with optimistic UI
- [x] Read/unread toggle updates instantly
- [x] Archive removes email instantly
- [x] Errors revert optimistic updates
- [x] Rate limit errors show friendly messages
- [x] Hover actions appear smoothly

### Task 16.0c: Server-backed search
- [x] Search triggers Gmail API after debounce
- [x] Search results display correctly
- [x] Fallback to client search on errors
- [x] Loading indicator shows during search
- [x] Clear search returns to full inbox

### Task 16.0d: Real "Why this label?" explanations
- [x] Explanation endpoint returns correct source
- [x] Overrides show "Your manual correction"
- [x] Domain matches show sender domain
- [x] Keyword matches show matched keywords
- [x] Gmail labels show label name
- [x] Explanation UI is clear and helpful

---

## Next Steps

After completing Phase 0:

1. **Sprint 16 Phase A Planning**: Gmail Label Sync
   - Database schema for label mappings
   - Gmail Label API integration
   - Sync service with idempotent operations
   - Settings UI for label sync controls

2. **Sprint 16 Phase B (Optional)**: Background Sync
   - Gmail watch + Pub/Sub setup
   - Push handler endpoint
   - Watch renewal job

3. **User Testing**
   - Gather feedback on inbox usability
   - Identify pain points in triage workflow
   - Measure time to triage inbox

---

**Plan Created**: 2026-01-01
**Estimated Time**: 18-28 hours total
- Task 1: 6-8h
- Task 2: 4-6h
- Task 3: 4-6h
- Task 4: 6-10h
- QA & Polish: 2-4h
