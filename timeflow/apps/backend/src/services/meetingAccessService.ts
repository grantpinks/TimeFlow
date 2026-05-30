import crypto from 'crypto';
import { prisma } from '../config/prisma.js';
import { isTokenValid } from './meetingBookingService.js';

const READ_TOKEN_TYPES = new Set(['view', 'reschedule', 'cancel']);

export function hashMeetingActionToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex');
}

type MeetingWithLink = Awaited<ReturnType<typeof loadMeetingWithLink>>;

async function loadMeetingWithLink(meetingId: string) {
  return prisma.meeting.findUnique({
    where: { id: meetingId },
    include: {
      schedulingLink: {
        include: { user: { select: { email: true, name: true } } },
      },
    },
  });
}

/**
 * Resolve meeting read access for invitees (action token) or the host (JWT user id).
 */
export async function resolveMeetingReadAccess(
  meetingId: string,
  options: { token?: string; hostUserId?: string }
): Promise<MeetingWithLink | null> {
  if (options.hostUserId) {
    const meeting = await loadMeetingWithLink(meetingId);
    if (meeting?.userId === options.hostUserId) {
      return meeting;
    }
  }

  const token = options.token?.trim();
  if (!token) {
    return null;
  }

  const actionToken = await prisma.meetingActionToken.findUnique({
    where: { tokenHash: hashMeetingActionToken(token) },
    include: {
      meeting: {
        include: {
          schedulingLink: {
            include: { user: { select: { email: true, name: true } } },
          },
        },
      },
    },
  });

  if (!actionToken || actionToken.meetingId !== meetingId) {
    return null;
  }

  if (!READ_TOKEN_TYPES.has(actionToken.type) || !isTokenValid(actionToken)) {
    return null;
  }

  return actionToken.meeting;
}
