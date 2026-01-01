# Meetings Dashboard & Booking UI Refinements

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build a professional Meetings Dashboard for hosts to view/manage meetings, and enhance the booking confirmation screen with calendar integration and better UX.

**Architecture:** Create new `/meetings` page in Next.js app, add backend API endpoint to fetch user's meetings, improve booking success screen with add-to-calendar buttons and better visual hierarchy.

**Tech Stack:** Next.js 14 App Router, Fastify backend, Prisma ORM, Luxon for dates, ICS file generation for calendar integration

---

## Part 1: Improved Booking Confirmation Screen (Quick Win)

### Task 1: Add Calendar Download Functionality

**Goal:** Allow invitees to download .ics calendar files for the booked meeting

**Files:**
- Create: `apps/backend/src/utils/icsGenerator.ts`
- Create: `apps/backend/src/controllers/meetingController.ts`
- Modify: `apps/backend/src/routes/index.ts`
- Modify: `apps/web/src/app/book/[slug]/page.tsx:123-165`

**Step 1: Create ICS file generator utility**

Create `apps/backend/src/utils/icsGenerator.ts`:

```typescript
import { DateTime } from 'luxon';

interface ICSEventData {
  summary: string;
  description?: string;
  location?: string;
  startDateTime: Date;
  endDateTime: Date;
  organizerEmail: string;
  organizerName?: string;
  attendeeEmail: string;
  attendeeName: string;
}

/**
 * Generate ICS (iCalendar) file content for a meeting
 * Compatible with Google Calendar, Apple Calendar, Outlook
 */
export function generateICS(event: ICSEventData): string {
  const formatDate = (date: Date): string => {
    // Format as YYYYMMDDTHHMMSSZ (UTC)
    return DateTime.fromJSDate(date).toUTC().toFormat("yyyyMMdd'T'HHmmss'Z'");
  };

  const now = formatDate(new Date());
  const dtStart = formatDate(event.startDateTime);
  const dtEnd = formatDate(event.endDateTime);

  // Generate unique ID
  const uid = `${Date.now()}-${Math.random().toString(36).substring(7)}@timeflow.app`;

  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//TimeFlow//Meeting Scheduler//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:REQUEST',
    'BEGIN:VEVENT',
    `UID:${uid}`,
    `DTSTAMP:${now}`,
    `DTSTART:${dtStart}`,
    `DTEND:${dtEnd}`,
    `SUMMARY:${event.summary}`,
  ];

  if (event.description) {
    // Escape special characters and wrap long lines
    const desc = event.description.replace(/\n/g, '\\n').replace(/,/g, '\\,');
    lines.push(`DESCRIPTION:${desc}`);
  }

  if (event.location) {
    lines.push(`LOCATION:${event.location}`);
  }

  lines.push(
    `ORGANIZER;CN=${event.organizerName || event.organizerEmail}:mailto:${event.organizerEmail}`,
    `ATTENDEE;CN=${event.attendeeName};RSVP=TRUE:mailto:${event.attendeeEmail}`,
    'STATUS:CONFIRMED',
    'SEQUENCE:0',
    'END:VEVENT',
    'END:VCALENDAR'
  );

  return lines.join('\r\n');
}
```

**Step 2: Create meeting details API endpoint**

Create `apps/backend/src/controllers/meetingController.ts`:

```typescript
import { FastifyRequest, FastifyReply } from 'fastify';
import { prisma } from '../config/prisma.js';
import { generateICS } from '../utils/icsGenerator.js';

/**
 * GET /api/meetings/:id
 * Get meeting details (public endpoint, no auth required)
 */
export async function getMeetingDetails(
  request: FastifyRequest<{ Params: { id: string } }>,
  reply: FastifyReply
) {
  const { id } = request.params;

  const meeting = await prisma.meeting.findUnique({
    where: { id },
    include: {
      schedulingLink: {
        include: { user: { select: { email: true, name: true } } },
      },
    },
  });

  if (!meeting) {
    reply.status(404).send({ error: 'Meeting not found' });
    return;
  }

  reply.send({
    id: meeting.id,
    inviteeName: meeting.inviteeName,
    inviteeEmail: meeting.inviteeEmail,
    startDateTime: meeting.startDateTime.toISOString(),
    endDateTime: meeting.endDateTime.toISOString(),
    notes: meeting.notes,
    googleMeetLink: meeting.googleMeetLink,
    linkName: meeting.schedulingLink.name,
    organizerEmail: meeting.schedulingLink.user.email,
    organizerName: meeting.schedulingLink.user.name,
  });
}

/**
 * GET /api/meetings/:id/calendar
 * Download ICS calendar file for the meeting
 */
export async function downloadMeetingCalendar(
  request: FastifyRequest<{ Params: { id: string } }>,
  reply: FastifyReply
) {
  const { id } = request.params;

  const meeting = await prisma.meeting.findUnique({
    where: { id },
    include: {
      schedulingLink: {
        include: { user: { select: { email: true, name: true } } },
      },
    },
  });

  if (!meeting) {
    reply.status(404).send({ error: 'Meeting not found' });
    return;
  }

  const icsContent = generateICS({
    summary: meeting.schedulingLink.name,
    description: meeting.notes ?? undefined,
    location: meeting.googleMeetLink ?? undefined,
    startDateTime: meeting.startDateTime,
    endDateTime: meeting.endDateTime,
    organizerEmail: meeting.schedulingLink.user.email,
    organizerName: meeting.schedulingLink.user.name ?? undefined,
    attendeeEmail: meeting.inviteeEmail,
    attendeeName: meeting.inviteeName,
  });

  reply
    .header('Content-Type', 'text/calendar; charset=utf-8')
    .header('Content-Disposition', `attachment; filename="meeting-${meeting.id}.ics"`)
    .send(icsContent);
}
```

**Step 3: Register new routes**

Modify `apps/backend/src/routes/index.ts` - add after existing meeting routes:

```typescript
import * as meetingController from '../controllers/meetingController.js';

// ... existing routes ...

// Meeting details (public)
fastify.get('/api/meetings/:id', meetingController.getMeetingDetails);
fastify.get('/api/meetings/:id/calendar', meetingController.downloadMeetingCalendar);
```

**Step 4: Update booking controller to return meeting ID**

Modify `apps/backend/src/controllers/bookingController.ts` around line 62:

```typescript
// After successful booking, return meeting ID too
reply.status(201).send(result);
```

Ensure `result` from `meetingBookingService.bookMeeting` includes meeting ID. Check `apps/backend/src/services/meetingBookingService.ts:289-299`:

```typescript
return {
  meeting: {
    id: meeting.id,  // ← Ensure this is included
    startDateTime: meeting.startDateTime.toISOString(),
    endDateTime: meeting.endDateTime.toISOString(),
    inviteeName: meeting.inviteeName,
    inviteeEmail: meeting.inviteeEmail,
  },
  rescheduleToken: rescheduleTokenData.token,
  cancelToken: cancelTokenData.token,
};
```

**Step 5: Enhance booking confirmation screen UI**

Modify `apps/web/src/app/book/[slug]/page.tsx:123-165`:

```tsx
// State to store meeting ID
const [meetingId, setMeetingId] = useState('');

// In handleSubmit, capture meeting ID
const result = await api.bookPublicMeeting(slug, {
  inviteeName,
  inviteeEmail,
  notes,
  startDateTime,
  durationMinutes: selectedDuration,
});

setMeetingId(result.meeting.id);  // ← Add this
setRescheduleToken(result.rescheduleToken);
setCancelToken(result.cancelToken);
setSuccess(true);

// Replace success screen (lines 123-165)
if (success) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-50 to-slate-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full overflow-hidden">
        {/* Success Header */}
        <div className="bg-gradient-to-r from-primary-600 to-primary-700 p-8 text-center">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-white rounded-full mb-4">
            <svg className="w-12 h-12 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h1 className="text-3xl font-bold text-white mb-2">Meeting Confirmed!</h1>
          <p className="text-primary-100 text-lg">
            You're all set. Check your email for details.
          </p>
        </div>

        {/* Meeting Details */}
        <div className="p-8">
          {selectedSlot && (
            <div className="bg-slate-50 rounded-xl p-6 mb-6 border border-slate-200">
              <div className="grid grid-cols-2 gap-6">
                <div>
                  <p className="text-xs text-slate-500 uppercase tracking-wide mb-2">Date & Time</p>
                  <p className="font-semibold text-slate-800 text-lg">
                    {formatDate(selectedSlot.start)}
                  </p>
                  <p className="text-primary-600 font-medium">
                    {formatTime(selectedSlot.start)}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-slate-500 uppercase tracking-wide mb-2">Duration</p>
                  <p className="font-semibold text-slate-800 text-lg">{selectedDuration} minutes</p>
                </div>
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="space-y-3 mb-6">
            <a
              href={`/api/meetings/${meetingId}/calendar`}
              download
              className="flex items-center justify-center gap-2 w-full bg-primary-600 text-white px-6 py-3 rounded-lg hover:bg-primary-700 transition-colors font-medium"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Add to Calendar
            </a>

            <a
              href={`/book/${slug}/reschedule?token=${rescheduleToken}`}
              className="flex items-center justify-center gap-2 w-full bg-slate-100 text-slate-700 px-6 py-3 rounded-lg hover:bg-slate-200 transition-colors font-medium"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              Reschedule Meeting
            </a>
          </div>

          {/* Secondary Actions */}
          <div className="pt-6 border-t border-slate-200 text-center">
            <p className="text-sm text-slate-600 mb-2">Need to cancel?</p>
            <a
              href={`/book/${slug}/cancel?token=${cancelToken}`}
              className="text-sm text-red-600 hover:text-red-700 underline font-medium"
            >
              Cancel this meeting
            </a>
          </div>

          {/* Info Box */}
          <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex gap-3">
              <svg className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
              </svg>
              <div>
                <p className="text-sm font-medium text-blue-900 mb-1">Confirmation Email Sent</p>
                <p className="text-sm text-blue-700">
                  We've sent a confirmation email to <strong>{inviteeEmail}</strong> with all the meeting details.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
```

**Step 6: Test the improved UI**

Manual test:
1. Navigate to http://localhost:3000/book/coffee-chat-1
2. Book a meeting
3. Verify:
   - ✓ New gradient header with checkmark icon
   - ✓ Better visual hierarchy
   - ✓ "Add to Calendar" button downloads .ics file
   - ✓ "Reschedule Meeting" button has calendar icon
   - ✓ Information box about email confirmation
   - ✓ Cancel link is less prominent (good UX)

**Step 7: Commit booking UI improvements**

```bash
git add apps/backend/src/utils/icsGenerator.ts apps/backend/src/controllers/meetingController.ts apps/backend/src/routes/index.ts apps/web/src/app/book/[slug]/page.tsx
git commit -m "feat: enhance booking confirmation screen with calendar download and improved UI

- Add ICS calendar file generation utility
- Create API endpoints for meeting details and calendar download
- Redesign success screen with gradient header and better layout
- Add 'Add to Calendar' button for easy calendar integration
- Improve visual hierarchy and spacing
- Add confirmation email info box"
```

---

## Part 2: Meetings Dashboard for Hosts

### Task 2: Create Backend API for Host Meetings

**Files:**
- Modify: `apps/backend/src/controllers/meetingController.ts`
- Modify: `apps/backend/src/routes/index.ts`

**Step 1: Add getUserMeetings endpoint**

Add to `apps/backend/src/controllers/meetingController.ts`:

```typescript
/**
 * GET /api/user/meetings
 * Get all meetings for the authenticated user (host view)
 */
export async function getUserMeetings(
  request: FastifyRequest<{ Querystring: { status?: string; upcoming?: string } }>,
  reply: FastifyReply
) {
  const userId = request.userId; // Set by auth middleware
  const { status, upcoming } = request.query;

  const where: any = { userId };

  // Filter by status
  if (status) {
    where.status = status;
  }

  // Filter upcoming/past
  if (upcoming === 'true') {
    where.startDateTime = { gte: new Date() };
  } else if (upcoming === 'false') {
    where.startDateTime = { lt: new Date() };
  }

  const meetings = await prisma.meeting.findMany({
    where,
    include: {
      schedulingLink: {
        select: { name: true, slug: true },
      },
    },
    orderBy: { startDateTime: upcoming === 'false' ? 'desc' : 'asc' },
  });

  const formatted = meetings.map((m) => ({
    id: m.id,
    inviteeName: m.inviteeName,
    inviteeEmail: m.inviteeEmail,
    startDateTime: m.startDateTime.toISOString(),
    endDateTime: m.endDateTime.toISOString(),
    status: m.status,
    notes: m.notes,
    googleMeetLink: m.googleMeetLink,
    linkName: m.schedulingLink.name,
    linkSlug: m.schedulingLink.slug,
    createdAt: m.createdAt.toISOString(),
  }));

  reply.send({ meetings: formatted });
}
```

**Step 2: Register authenticated route**

Modify `apps/backend/src/routes/index.ts`:

```typescript
// Authenticated meeting routes (require userId)
fastify.get('/api/user/meetings', meetingController.getUserMeetings);
```

**Step 3: Test API endpoint**

```bash
curl http://localhost:3001/api/user/meetings?upcoming=true | python3 -m json.tool
```

Expected: Array of upcoming meetings with meeting details

**Step 4: Commit backend changes**

```bash
git add apps/backend/src/controllers/meetingController.ts apps/backend/src/routes/index.ts
git commit -m "feat: add API endpoint for host meetings dashboard

- Add getUserMeetings endpoint with filtering
- Support upcoming/past and status filters
- Include scheduling link details in response"
```

---

### Task 3: Create Meetings Dashboard Frontend

**Files:**
- Create: `apps/web/src/app/meetings/page.tsx`
- Modify: `apps/web/src/lib/api.ts`

**Step 1: Add API function for fetching meetings**

Modify `apps/web/src/lib/api.ts`:

```typescript
// Add to existing API functions

export interface HostMeeting {
  id: string;
  inviteeName: string;
  inviteeEmail: string;
  startDateTime: string;
  endDateTime: string;
  status: string;
  notes: string | null;
  googleMeetLink: string | null;
  linkName: string;
  linkSlug: string;
  createdAt: string;
}

export async function getUserMeetings(params?: {
  status?: string;
  upcoming?: boolean;
}): Promise<{ meetings: HostMeeting[] }> {
  const query = new URLSearchParams();
  if (params?.status) query.append('status', params.status);
  if (params?.upcoming !== undefined) query.append('upcoming', String(params.upcoming));

  const response = await fetch(
    `${API_BASE}/api/user/meetings?${query.toString()}`,
    { credentials: 'include' }
  );

  if (!response.ok) {
    throw new Error(`Failed to fetch meetings: ${response.statusText}`);
  }

  return response.json();
}
```

**Step 2: Create Meetings Dashboard page**

Create `apps/web/src/app/meetings/page.tsx`:

```tsx
'use client';

import { useState, useEffect } from 'react';
import { getUserMeetings, type HostMeeting } from '@/lib/api';
import { DateTime } from 'luxon';

export default function MeetingsPage() {
  const [meetings, setMeetings] = useState<HostMeeting[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'upcoming' | 'past'>('upcoming');

  useEffect(() => {
    async function loadMeetings() {
      try {
        setLoading(true);
        const data = await getUserMeetings({ upcoming: filter === 'upcoming' });
        setMeetings(data.meetings);
      } catch (error) {
        console.error('Failed to load meetings:', error);
      } finally {
        setLoading(false);
      }
    }

    loadMeetings();
  }, [filter]);

  function formatDateTime(isoString: string) {
    return DateTime.fromISO(isoString).toLocaleString({
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    });
  }

  function getDuration(start: string, end: string) {
    const startDt = DateTime.fromISO(start);
    const endDt = DateTime.fromISO(end);
    return endDt.diff(startDt, 'minutes').minutes;
  }

  function getStatusBadge(status: string) {
    const styles = {
      scheduled: 'bg-green-100 text-green-800',
      rescheduled: 'bg-blue-100 text-blue-800',
      cancelled: 'bg-red-100 text-red-800',
    };
    return styles[status as keyof typeof styles] || 'bg-slate-100 text-slate-800';
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-slate-600">Loading meetings...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <div className="bg-white border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-slate-900">Meetings</h1>
              <p className="mt-1 text-sm text-slate-500">
                View and manage your scheduled meetings
              </p>
            </div>

            {/* Filter Tabs */}
            <div className="flex gap-2">
              <button
                onClick={() => setFilter('upcoming')}
                className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                  filter === 'upcoming'
                    ? 'bg-primary-600 text-white'
                    : 'bg-white text-slate-700 border border-slate-300 hover:bg-slate-50'
                }`}
              >
                Upcoming
              </button>
              <button
                onClick={() => setFilter('past')}
                className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                  filter === 'past'
                    ? 'bg-primary-600 text-white'
                    : 'bg-white text-slate-700 border border-slate-300 hover:bg-slate-50'
                }`}
              >
                Past
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Meetings List */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {meetings.length === 0 ? (
          <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-12 text-center">
            <div className="text-slate-400 text-6xl mb-4">📅</div>
            <h3 className="text-lg font-medium text-slate-900 mb-2">
              No {filter} meetings
            </h3>
            <p className="text-slate-600">
              {filter === 'upcoming'
                ? "You don't have any upcoming meetings scheduled."
                : "You don't have any past meetings."}
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {meetings.map((meeting) => (
              <div
                key={meeting.id}
                className="bg-white rounded-lg shadow-sm border border-slate-200 p-6 hover:shadow-md transition-shadow"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    {/* Meeting Header */}
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-lg font-semibold text-slate-900">
                        {meeting.linkName}
                      </h3>
                      <span
                        className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusBadge(
                          meeting.status
                        )}`}
                      >
                        {meeting.status}
                      </span>
                    </div>

                    {/* Guest Info */}
                    <div className="flex items-center gap-2 text-slate-700 mb-3">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                        />
                      </svg>
                      <span className="font-medium">{meeting.inviteeName}</span>
                      <span className="text-slate-400">·</span>
                      <span className="text-slate-600">{meeting.inviteeEmail}</span>
                    </div>

                    {/* DateTime */}
                    <div className="flex items-center gap-4 text-sm text-slate-600 mb-3">
                      <div className="flex items-center gap-2">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                          />
                        </svg>
                        <span>{formatDateTime(meeting.startDateTime)}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                          />
                        </svg>
                        <span>{getDuration(meeting.startDateTime, meeting.endDateTime)} min</span>
                      </div>
                    </div>

                    {/* Notes */}
                    {meeting.notes && (
                      <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 mb-3">
                        <p className="text-xs text-amber-900 font-medium mb-1">Guest Notes:</p>
                        <p className="text-sm text-amber-800">{meeting.notes}</p>
                      </div>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex flex-col gap-2 ml-4">
                    {meeting.googleMeetLink && (
                      <a
                        href={meeting.googleMeetLink}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center justify-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors text-sm font-medium whitespace-nowrap"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"
                          />
                        </svg>
                        Join Meeting
                      </a>
                    )}
                    <a
                      href={`/api/meetings/${meeting.id}/calendar`}
                      download
                      className="inline-flex items-center justify-center gap-2 px-4 py-2 bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200 transition-colors text-sm font-medium whitespace-nowrap"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
                        />
                      </svg>
                      Download ICS
                    </a>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
```

**Step 3: Add navigation link to Meetings**

Modify your main navigation (likely in `apps/web/src/app/layout.tsx` or navigation component) to add:

```tsx
<a href="/meetings" className="nav-link">
  Meetings
</a>
```

**Step 4: Test the dashboard**

Manual test:
1. Navigate to http://localhost:3000/meetings
2. Verify:
   - ✓ Shows upcoming meetings by default
   - ✓ Can switch to past meetings
   - ✓ Each meeting shows guest name, email, date/time
   - ✓ "Join Meeting" button appears if Google Meet link exists
   - ✓ "Download ICS" button works
   - ✓ Guest notes displayed if present
   - ✓ Status badge shows correct color

**Step 5: Commit meetings dashboard**

```bash
git add apps/web/src/app/meetings/page.tsx apps/web/src/lib/api.ts
git commit -m "feat: add Meetings Dashboard for hosts

- Create /meetings page to view all scheduled meetings
- Add filtering by upcoming/past
- Display meeting details with guest info and notes
- Add Join Meeting button for Google Meet links
- Add Download ICS button for calendar integration
- Include status badges and visual hierarchy"
```

---

## Testing Checklist

### Booking Confirmation Screen
- [ ] Book a meeting successfully
- [ ] Verify gradient header with checkmark
- [ ] Click "Add to Calendar" - downloads .ics file
- [ ] Open .ics file - imports to calendar correctly
- [ ] Verify meeting details (time, duration) are correct
- [ ] Click "Reschedule" - redirects to reschedule page
- [ ] Click "Cancel" - redirects to cancel page
- [ ] Verify confirmation email info box appears

### Meetings Dashboard
- [ ] Navigate to /meetings page
- [ ] Upcoming meetings show by default
- [ ] Click "Past" tab - shows past meetings
- [ ] Each meeting shows correct guest info
- [ ] Meeting time and duration display correctly
- [ ] Guest notes appear when present
- [ ] Status badges show correct colors
- [ ] "Join Meeting" button appears when Meet link exists
- [ ] Click "Join Meeting" - opens Google Meet in new tab
- [ ] Click "Download ICS" - downloads calendar file
- [ ] Empty state shows when no meetings

---

## Future Enhancements (Not in this plan)

1. **In-app Meeting Management**
   - Cancel meetings from dashboard
   - Reschedule from host view
   - Send custom messages to guests

2. **Meeting Analytics**
   - Total meetings this month
   - Most popular time slots
   - Guest attendance tracking

3. **Calendar Sync**
   - Two-way sync with Google Calendar
   - Update dashboard when calendar changes
   - Show conflicts before booking

4. **Notifications**
   - Email reminders before meetings
   - SMS notifications
   - Desktop notifications for upcoming meetings

---

## Notes

- **Booking confirmation screen** improvements are a quick win that dramatically improves professional appearance
- **Meetings dashboard** gives hosts visibility and control they currently lack
- **ICS download** ensures compatibility with all calendar apps (Google, Apple, Outlook)
- **Future sprints** can add cancellation/rescheduling directly from dashboard
