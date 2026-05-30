import { describe, it, expect, vi, beforeEach } from 'vitest';
import crypto from 'crypto';
import { hashMeetingActionToken, resolveMeetingReadAccess } from '../meetingAccessService.js';

vi.mock('../../config/prisma.js', () => ({
  prisma: {
    meeting: { findUnique: vi.fn() },
    meetingActionToken: { findUnique: vi.fn() },
  },
}));

vi.mock('../meetingBookingService.js', () => ({
  isTokenValid: vi.fn((token: { expiresAt: Date; usedAt: Date | null }) => {
    if (token.usedAt) return false;
    return token.expiresAt > new Date();
  }),
}));

import { prisma } from '../../config/prisma.js';

const meetingFixture = {
  id: 'meeting-1',
  userId: 'host-1',
  inviteeName: 'Guest',
  inviteeEmail: 'guest@example.com',
  notes: null,
  startDateTime: new Date('2026-06-01T15:00:00Z'),
  endDateTime: new Date('2026-06-01T15:30:00Z'),
  googleMeetLink: 'https://meet.google.com/abc',
  schedulingLink: {
    name: 'Coffee Chat',
    user: { email: 'host@example.com', name: 'Host' },
  },
};

describe('meetingAccessService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('hashMeetingActionToken is deterministic SHA-256', () => {
    const hash = hashMeetingActionToken('secret-token');
    const expected = crypto.createHash('sha256').update('secret-token').digest('hex');
    expect(hash).toBe(expected);
  });

  it('allows host user id without action token', async () => {
    vi.mocked(prisma.meeting.findUnique).mockResolvedValue(meetingFixture as any);

    const result = await resolveMeetingReadAccess('meeting-1', { hostUserId: 'host-1' });
    expect(result?.id).toBe('meeting-1');
  });

  it('denies host user id for another users meeting', async () => {
    vi.mocked(prisma.meeting.findUnique).mockResolvedValue(meetingFixture as any);

    const result = await resolveMeetingReadAccess('meeting-1', { hostUserId: 'other-user' });
    expect(result).toBeNull();
  });

  it('allows valid view token for matching meeting', async () => {
    const token = 'view-token';
    vi.mocked(prisma.meetingActionToken.findUnique).mockResolvedValue({
      meetingId: 'meeting-1',
      type: 'view',
      expiresAt: new Date(Date.now() + 60_000),
      usedAt: null,
      meeting: meetingFixture,
    } as any);

    const result = await resolveMeetingReadAccess('meeting-1', { token });
    expect(result?.inviteeEmail).toBe('guest@example.com');
    expect(prisma.meetingActionToken.findUnique).toHaveBeenCalledWith({
      where: { tokenHash: hashMeetingActionToken(token) },
      include: expect.any(Object),
    });
  });

  it('denies token for wrong meeting id', async () => {
    vi.mocked(prisma.meetingActionToken.findUnique).mockResolvedValue({
      meetingId: 'other-meeting',
      type: 'view',
      expiresAt: new Date(Date.now() + 60_000),
      usedAt: null,
      meeting: meetingFixture,
    } as any);

    const result = await resolveMeetingReadAccess('meeting-1', { token: 'view-token' });
    expect(result).toBeNull();
  });

  it('denies access without token or host user', async () => {
    const result = await resolveMeetingReadAccess('meeting-1', {});
    expect(result).toBeNull();
  });
});
