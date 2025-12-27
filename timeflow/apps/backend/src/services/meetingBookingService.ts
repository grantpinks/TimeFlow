import { prisma } from '../config/prisma.js';
import { DateTime } from 'luxon';
import crypto from 'crypto';
import * as googleCalendarService from './googleCalendarService.js';
import * as appleCalendarService from './appleCalendarService.js';
import * as gmailService from './gmailService.js';

interface TimeSlot {
  start: string;
  end: string;
}

interface ExistingMeeting {
  startDateTime: Date;
  endDateTime: Date;
}

/**
 * Check if a time slot is available (no conflicts with existing meetings)
 */
export function isSlotAvailable(slot: TimeSlot, existingMeetings: ExistingMeeting[]): boolean {
  const slotStart = new Date(slot.start).getTime();
  const slotEnd = new Date(slot.end).getTime();

  for (const meeting of existingMeetings) {
    const meetingStart = meeting.startDateTime.getTime();
    const meetingEnd = meeting.endDateTime.getTime();

    // Check for any overlap
    if (slotStart < meetingEnd && slotEnd > meetingStart) {
      return false;
    }
  }

  return true;
}

/**
 * Generate a secure random token and its hash
 */
function generateToken(): { token: string; hash: string } {
  const token = crypto.randomBytes(32).toString('hex');
  const hash = crypto.createHash('sha256').update(token).digest('hex');
  return { token, hash };
}

/**
 * Hash a token for comparison
 */
function hashToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex');
}

/**
 * Check if a token is valid (not expired and not used)
 */
export function isTokenValid(token: { expiresAt: Date; usedAt: Date | null }): boolean {
  if (token.usedAt) {
    return false; // Token already used
  }

  if (token.expiresAt < new Date()) {
    return false; // Token expired
  }

  return true;
}

/**
 * Book a meeting on a scheduling link
 */
export async function bookMeeting(
  slug: string,
  data: {
    inviteeName: string;
    inviteeEmail: string;
    notes?: string;
    startDateTime: string;
    durationMinutes: number;
  }
): Promise<{
  meeting: {
    id: string;
    startDateTime: string;
    endDateTime: string;
    inviteeName: string;
    inviteeEmail: string;
  };
  rescheduleToken: string;
  cancelToken: string;
}> {
  // Load scheduling link
  const link = await prisma.schedulingLink.findUnique({
    where: { slug },
    include: { user: true },
  });

  if (!link || !link.isActive) {
    throw new Error('Scheduling link not found or inactive');
  }

  // Validate duration
  if (!link.durationsMinutes.includes(data.durationMinutes)) {
    throw new Error('Invalid duration');
  }

  const startDateTime = new Date(data.startDateTime);
  const endDateTime = DateTime.fromJSDate(startDateTime)
    .plus({ minutes: data.durationMinutes })
    .toJSDate();

  // Re-check availability (concurrency check)
  const existingMeetings = await prisma.meeting.findMany({
    where: {
      schedulingLinkId: link.id,
      status: 'scheduled',
      startDateTime: { lt: endDateTime },
      endDateTime: { gt: startDateTime },
    },
  });

  if (
    !isSlotAvailable(
      { start: startDateTime.toISOString(), end: endDateTime.toISOString() },
      existingMeetings
    )
  ) {
    throw new Error('Time slot no longer available');
  }

  // Generate tokens for reschedule and cancel
  const rescheduleTokenData = generateToken();
  const cancelTokenData = generateToken();

  // Create meeting and tokens in transaction
  const meeting = await prisma.$transaction(async (tx) => {
    const createdMeeting = await tx.meeting.create({
      data: {
        schedulingLinkId: link.id,
        userId: link.userId,
        inviteeName: data.inviteeName,
        inviteeEmail: data.inviteeEmail,
        notes: data.notes,
        startDateTime,
        endDateTime,
        status: 'scheduled',
      },
    });

    // Create reschedule token (30 days expiry)
    await tx.meetingActionToken.create({
      data: {
        meetingId: createdMeeting.id,
        type: 'reschedule',
        tokenHash: rescheduleTokenData.hash,
        expiresAt: DateTime.now().plus({ days: 30 }).toJSDate(),
      },
    });

    // Create cancel token (30 days expiry)
    await tx.meetingActionToken.create({
      data: {
        meetingId: createdMeeting.id,
        type: 'cancel',
        tokenHash: cancelTokenData.hash,
        expiresAt: DateTime.now().plus({ days: 30 }).toJSDate(),
      },
    });

    return createdMeeting;
  });

  // Create calendar event
  const user = link.user;

  if (link.calendarProvider === 'google' && user.googleAccessToken) {
    try {
      const eventId = await googleCalendarService.createEvent(
        user.id,
        link.calendarId,
        {
          summary: `Meeting with ${data.inviteeName}`,
          description: data.notes,
          start: startDateTime.toISOString(),
          end: endDateTime.toISOString(),
          attendees: [{ email: data.inviteeEmail }],
        },
        link.googleMeetEnabled
      );

      await prisma.meeting.update({
        where: { id: meeting.id },
        data: { googleEventId: eventId },
      });
    } catch (error) {
      // Continue without Google event on error
    }
  } else if (link.calendarProvider === 'apple') {
    try {
      const eventUrl = await appleCalendarService.createEvent(user.id, link.calendarId, {
        summary: `Meeting with ${data.inviteeName}`,
        description: data.notes,
        start: startDateTime.toISOString(),
        end: endDateTime.toISOString(),
      });

      await prisma.meeting.update({
        where: { id: meeting.id },
        data: { appleEventUrl: eventUrl },
      });
    } catch (error) {
      // Continue without Apple event on error
    }
  }

  // Send confirmation email
  if (user.googleAccessToken) {
    try {
      const rescheduleUrl = `${process.env.APP_BASE_URL}/book/${slug}/reschedule?token=${rescheduleTokenData.token}`;
      const cancelUrl = `${process.env.APP_BASE_URL}/book/${slug}/cancel?token=${cancelTokenData.token}`;

      await gmailService.sendEmail(user.id, {
        to: data.inviteeEmail,
        subject: `Meeting Confirmed: ${link.name}`,
        body: `Hi ${data.inviteeName},\n\nYour meeting has been confirmed!\n\nWhen: ${startDateTime.toLocaleString()}\nDuration: ${data.durationMinutes} minutes\n\nTo reschedule: ${rescheduleUrl}\nTo cancel: ${cancelUrl}\n\nBest regards`,
      });
    } catch (error) {
      // Continue without email on error
    }
  }

  return {
    meeting: {
      id: meeting.id,
      startDateTime: meeting.startDateTime.toISOString(),
      endDateTime: meeting.endDateTime.toISOString(),
      inviteeName: meeting.inviteeName,
      inviteeEmail: meeting.inviteeEmail,
    },
    rescheduleToken: rescheduleTokenData.token,
    cancelToken: cancelTokenData.token,
  };
}

/**
 * Reschedule a meeting using a token
 */
export async function rescheduleMeeting(
  slug: string,
  token: string,
  data: {
    startDateTime: string;
    durationMinutes: number;
  }
): Promise<{
  meeting: {
    id: string;
    startDateTime: string;
    endDateTime: string;
  };
}> {
  const tokenHash = hashToken(token);

  // Find and validate token
  const actionToken = await prisma.meetingActionToken.findUnique({
    where: { tokenHash },
    include: {
      meeting: {
        include: {
          schedulingLink: {
            include: { user: true },
          },
        },
      },
    },
  });

  if (!actionToken || actionToken.type !== 'reschedule') {
    throw new Error('Invalid reschedule token');
  }

  if (!isTokenValid(actionToken)) {
    throw new Error('Token expired or already used');
  }

  const meeting = actionToken.meeting;
  const link = meeting.schedulingLink;

  if (link.slug !== slug) {
    throw new Error('Token does not match scheduling link');
  }

  // Validate duration
  if (!link.durationsMinutes.includes(data.durationMinutes)) {
    throw new Error('Invalid duration');
  }

  const startDateTime = new Date(data.startDateTime);
  const endDateTime = DateTime.fromJSDate(startDateTime)
    .plus({ minutes: data.durationMinutes })
    .toJSDate();

  // Update meeting and mark token as used
  const updatedMeeting = await prisma.$transaction(async (tx) => {
    // Mark token as used
    await tx.meetingActionToken.update({
      where: { id: actionToken.id },
      data: { usedAt: new Date() },
    });

    // Update meeting
    return await tx.meeting.update({
      where: { id: meeting.id },
      data: {
        startDateTime,
        endDateTime,
        status: 'rescheduled',
        rescheduledAt: new Date(),
      },
    });
  });

  // Update calendar event
  const user = link.user;

  if (link.calendarProvider === 'google' && meeting.googleEventId && user.googleAccessToken) {
    try {
      await googleCalendarService.updateEvent(
        user.id,
        link.calendarId,
        meeting.googleEventId,
        {
          start: startDateTime.toISOString(),
          end: endDateTime.toISOString(),
        }
      );
    } catch (error) {
      // Continue without Google event update on error
    }
  } else if (link.calendarProvider === 'apple' && meeting.appleEventUrl) {
    try {
      await appleCalendarService.updateEvent(
        user.id,
        link.calendarId,
        meeting.appleEventUrl,
        {
          start: startDateTime.toISOString(),
          end: endDateTime.toISOString(),
        }
      );
    } catch (error) {
      // Continue without Apple event update on error
    }
  }

  // Send reschedule confirmation email
  if (user.googleAccessToken) {
    try {
      await gmailService.sendEmail(user.id, {
        to: meeting.inviteeEmail,
        subject: `Meeting Rescheduled: ${link.name}`,
        body: `Hi ${meeting.inviteeName},\n\nYour meeting has been rescheduled.\n\nNew Time: ${startDateTime.toLocaleString()}\nDuration: ${data.durationMinutes} minutes\n\nBest regards`,
      });
    } catch (error) {
      // Continue without email on error
    }
  }

  return {
    meeting: {
      id: updatedMeeting.id,
      startDateTime: updatedMeeting.startDateTime.toISOString(),
      endDateTime: updatedMeeting.endDateTime.toISOString(),
    },
  };
}

/**
 * Cancel a meeting using a token
 */
export async function cancelMeeting(
  slug: string,
  token: string
): Promise<{
  success: boolean;
}> {
  const tokenHash = hashToken(token);

  // Find and validate token
  const actionToken = await prisma.meetingActionToken.findUnique({
    where: { tokenHash },
    include: {
      meeting: {
        include: {
          schedulingLink: {
            include: { user: true },
          },
        },
      },
    },
  });

  if (!actionToken || actionToken.type !== 'cancel') {
    throw new Error('Invalid cancel token');
  }

  if (!isTokenValid(actionToken)) {
    throw new Error('Token expired or already used');
  }

  const meeting = actionToken.meeting;
  const link = meeting.schedulingLink;

  if (link.slug !== slug) {
    throw new Error('Token does not match scheduling link');
  }

  // Update meeting and mark token as used
  await prisma.$transaction(async (tx) => {
    // Mark token as used
    await tx.meetingActionToken.update({
      where: { id: actionToken.id },
      data: { usedAt: new Date() },
    });

    // Update meeting status
    await tx.meeting.update({
      where: { id: meeting.id },
      data: {
        status: 'cancelled',
        cancelledAt: new Date(),
      },
    });
  });

  // Cancel calendar event (keep record but mark as cancelled)
  const user = link.user;

  if (link.calendarProvider === 'google' && meeting.googleEventId && user.googleAccessToken) {
    try {
      await googleCalendarService.deleteEvent(user.id, link.calendarId, meeting.googleEventId);
    } catch (error) {
      // Continue without Google event cancel on error
    }
  } else if (link.calendarProvider === 'apple' && meeting.appleEventUrl) {
    try {
      await appleCalendarService.cancelEvent(user.id, link.calendarId, meeting.appleEventUrl);
    } catch (error) {
      // Continue without Apple event cancel on error
    }
  }

  // Send cancellation email
  if (user.googleAccessToken) {
    try {
      await gmailService.sendEmail(user.id, {
        to: meeting.inviteeEmail,
        subject: `Meeting Cancelled: ${link.name}`,
        body: `Hi ${meeting.inviteeName},\n\nYour meeting has been cancelled.\n\nIf you'd like to reschedule, please visit the original booking link.\n\nBest regards`,
      });
    } catch (error) {
      // Continue without email on error
    }
  }

  return {
    success: true,
  };
}
