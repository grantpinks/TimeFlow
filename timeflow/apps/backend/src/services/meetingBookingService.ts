import { prisma } from '../config/prisma.js';
import { DateTime } from 'luxon';
import crypto from 'crypto';
import * as googleCalendarService from './googleCalendarService.js';
import * as appleCalendarService from './appleCalendarService.js';
import * as gmailService from './gmailService.js';
import { generateMeetingConfirmationEmail } from './emailTemplateService.js';

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

  // Enforce booking horizon
  if (link.maxBookingHorizonDays && link.maxBookingHorizonDays > 0) {
    const userZone = link.user.timeZone || 'UTC';
    const horizonEnd = DateTime.now()
      .setZone(userZone)
      .plus({ days: link.maxBookingHorizonDays })
      .endOf('day');

    if (DateTime.fromJSDate(startDateTime) > horizonEnd) {
      throw new Error('Requested time is beyond the booking horizon');
    }
  }

  // Enforce daily cap
  if (link.dailyCap && link.dailyCap > 0) {
    const dayStart = DateTime.fromJSDate(startDateTime).startOf('day').toJSDate();
    const dayEnd = DateTime.fromJSDate(startDateTime).endOf('day').toJSDate();

    const meetingsThisDay = await prisma.meeting.findMany({
      where: {
        schedulingLinkId: link.id,
        status: { not: 'cancelled' },
        startDateTime: { gte: dayStart, lte: dayEnd },
      },
    });

    if (meetingsThisDay.length >= link.dailyCap) {
      throw new Error('Daily meeting cap reached for this link');
    }
  }

  // Re-check availability (concurrency check)
  const existingMeetings = await prisma.meeting.findMany({
    where: {
      schedulingLinkId: link.id,
      status: { in: ['scheduled', 'rescheduled'] },
      startDateTime: { lt: endDateTime },
      endDateTime: { gt: startDateTime },
    },
  });

  // Check blocking tasks/habits that overlap this slot
  const blockingTasks = await prisma.scheduledTask.findMany({
    where: {
      task: { userId: link.userId },
      blocksAvailability: true,
      startDateTime: { lt: endDateTime },
      endDateTime: { gt: startDateTime },
    },
  });

  const blockingHabits = await prisma.scheduledHabit.findMany({
    where: {
      userId: link.userId,
      blocksAvailability: true,
      startDateTime: { lt: endDateTime },
      endDateTime: { gt: startDateTime },
    },
  });

  const bufferBeforeMinutes = link.bufferBeforeMinutes ?? 0;
  const bufferAfterMinutes = link.bufferAfterMinutes ?? 0;
  const externalBlockers: ExistingMeeting[] = [];

  const applyBuffer = (start: string, end: string): ExistingMeeting => ({
    startDateTime: DateTime.fromISO(start).minus({ minutes: bufferBeforeMinutes }).toJSDate(),
    endDateTime: DateTime.fromISO(end).plus({ minutes: bufferAfterMinutes }).toJSDate(),
  });

  const windowStart = DateTime.fromJSDate(startDateTime)
    .minus({ minutes: bufferBeforeMinutes })
    .toISO();
  const windowEnd = DateTime.fromJSDate(endDateTime)
    .plus({ minutes: bufferAfterMinutes })
    .toISO();

  if (windowStart && windowEnd) {
    if (link.calendarProvider === 'google' && link.user.googleAccessToken) {
      const events = await googleCalendarService.getEvents(
        link.user.id,
        link.calendarId,
        windowStart,
        windowEnd
      );

      externalBlockers.push(
        ...events
          .filter((event) => event.transparency !== 'transparent')
          .map((event) => applyBuffer(event.start, event.end))
      );
    } else if (link.calendarProvider === 'apple') {
      const events = await appleCalendarService.getEvents(link.user.id, link.calendarId, windowStart, windowEnd);

      externalBlockers.push(
        ...events
          .filter((event) => event.transparency !== 'transparent')
          .map((event) => applyBuffer(event.start, event.end))
      );
    }
  }

  const blockers = [
    ...existingMeetings.map((m) => ({ startDateTime: m.startDateTime, endDateTime: m.endDateTime })),
    ...blockingTasks.map((t) => ({ startDateTime: t.startDateTime, endDateTime: t.endDateTime })),
    ...blockingHabits.map((h) => ({ startDateTime: h.startDateTime, endDateTime: h.endDateTime })),
    ...externalBlockers,
  ];

  if (
    !isSlotAvailable(
      { start: startDateTime.toISOString(), end: endDateTime.toISOString() },
      blockers
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
  let meetLink: string | undefined;

  if (link.calendarProvider === 'google' && user.googleAccessToken) {
    try {
      const result = await googleCalendarService.createEvent(
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

      meetLink = result.meetLink;

      await prisma.meeting.update({
        where: { id: meeting.id },
        data: {
          googleEventId: result.eventId,
          googleMeetLink: meetLink,
        },
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

      // Format datetime in user's timezone
      const userDateTime = DateTime.fromJSDate(startDateTime, { zone: user.timeZone });
      const formattedDateTime = userDateTime.toLocaleString({
        weekday: 'long',
        month: 'long',
        day: 'numeric',
        year: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
        timeZoneName: 'short',
      });

      const emailContent = generateMeetingConfirmationEmail({
        inviteeName: data.inviteeName,
        linkName: link.name,
        dateTime: formattedDateTime,
        durationMinutes: data.durationMinutes,
        meetLink,
        rescheduleUrl,
        cancelUrl,
        notes: data.notes,
      });

      await gmailService.sendEmail(user.id, {
        to: data.inviteeEmail,
        subject: `Meeting Confirmed: ${link.name}`,
        html: emailContent.html,
        text: emailContent.text,
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
      // Format datetime in user's timezone
      const userDateTime = DateTime.fromJSDate(startDateTime, { zone: user.timeZone });
      const formattedDateTime = userDateTime.toLocaleString({
        weekday: 'long',
        month: 'long',
        day: 'numeric',
        year: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
        timeZoneName: 'short',
      });

      // Generate new reschedule/cancel tokens for the rescheduled meeting
      const newRescheduleToken = generateToken();
      const newCancelToken = generateToken();

      await prisma.$transaction(async (tx) => {
        // Create new tokens
        await tx.meetingActionToken.create({
          data: {
            meetingId: meeting.id,
            type: 'reschedule',
            tokenHash: newRescheduleToken.hash,
            expiresAt: DateTime.now().plus({ days: 30 }).toJSDate(),
          },
        });

        await tx.meetingActionToken.create({
          data: {
            meetingId: meeting.id,
            type: 'cancel',
            tokenHash: newCancelToken.hash,
            expiresAt: DateTime.now().plus({ days: 30 }).toJSDate(),
          },
        });
      });

      const rescheduleUrl = `${process.env.APP_BASE_URL}/book/${slug}/reschedule?token=${newRescheduleToken.token}`;
      const cancelUrl = `${process.env.APP_BASE_URL}/book/${slug}/cancel?token=${newCancelToken.token}`;

      const emailContent = generateMeetingConfirmationEmail({
        inviteeName: meeting.inviteeName,
        linkName: link.name,
        dateTime: formattedDateTime,
        durationMinutes: data.durationMinutes,
        meetLink: meeting.googleMeetLink ?? undefined,
        rescheduleUrl,
        cancelUrl,
        notes: meeting.notes ?? undefined,
      });

      await gmailService.sendEmail(user.id, {
        to: meeting.inviteeEmail,
        subject: `Meeting Rescheduled: ${link.name}`,
        html: emailContent.html,
        text: emailContent.text,
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
      await googleCalendarService.cancelEvent(user.id, link.calendarId, meeting.googleEventId);
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
