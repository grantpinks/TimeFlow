import { describe, expect, it } from 'vitest';
import type { Meeting, SchedulingLink, AvailabilitySlot } from '../index';

describe('shared types exports', () => {
  it('exports meeting and scheduling link types', () => {
    // Type-only test: verify types can be imported and used
    const meeting: Meeting = {
      id: '1',
      schedulingLinkId: 'link1',
      userId: 'user1',
      inviteeName: 'John',
      inviteeEmail: 'john@example.com',
      startDateTime: '2026-01-10T10:00:00.000Z',
      endDateTime: '2026-01-10T10:30:00.000Z',
      status: 'scheduled',
      createdAt: '2026-01-10T09:00:00.000Z',
      updatedAt: '2026-01-10T09:00:00.000Z',
    };

    const link: SchedulingLink = {
      id: '1',
      userId: 'user1',
      name: 'Team Sync',
      slug: 'team-sync',
      isActive: true,
      durationsMinutes: [30],
      bufferBeforeMinutes: 10,
      bufferAfterMinutes: 10,
      maxBookingHorizonDays: 60,
      dailyCap: 6,
      calendarProvider: 'google',
      calendarId: 'cal1',
      googleMeetEnabled: true,
      createdAt: '2026-01-10T09:00:00.000Z',
      updatedAt: '2026-01-10T09:00:00.000Z',
    };

    const slot: AvailabilitySlot = {
      start: '2026-01-10T10:00:00.000Z',
      end: '2026-01-10T10:30:00.000Z',
      durationMinutes: 30,
    };

    expect(meeting.id).toBe('1');
    expect(link.slug).toBe('team-sync');
    expect(slot.durationMinutes).toBe(30);
  });
});
