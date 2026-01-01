/**
 * Meeting Controller (Host Actions)
 *
 * Handles host operations for managing meetings.
 */

import { FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';
import { prisma } from '../config/prisma.js';
import * as googleCalendarService from '../services/googleCalendarService.js';
import * as appleCalendarService from '../services/appleCalendarService.js';
import * as gmailService from '../services/gmailService.js';
import * as emailTemplateService from '../services/emailTemplateService.js';
import { formatZodError } from '../utils/errorFormatter.js';
import { generateICS } from '../utils/icsGenerator.js';
import type {} from '../types/context.js';

const sendLinkEmailSchema = z.object({
  recipients: z
    .array(z.string().email())
    .min(1, 'At least one recipient is required')
    .max(50, 'Maximum 50 recipients allowed'),
  subject: z.string().min(1).max(200, 'Subject must be 200 characters or less'),
  message: z.string().min(1).max(5000, 'Message must be 5000 characters or less'),
  bookingUrl: z.string().url(),
});

/**
 * GET /api/meetings
 */
export async function getMeetings(
  request: FastifyRequest<{ Querystring: { status?: string } }>,
  reply: FastifyReply
) {
  const user = request.user;
  if (!user) {
    return reply.status(401).send({ error: 'Not authenticated' });
  }

  const userId = user.id;
  const { status } = request.query;

  try {
    const where: any = { userId };

    if (status && ['scheduled', 'rescheduled', 'cancelled'].includes(status)) {
      where.status = status;
    }

    const meetings = await prisma.meeting.findMany({
      where,
      orderBy: { startDateTime: 'desc' },
      include: {
        schedulingLink: {
          select: { name: true, slug: true },
        },
      },
    });

    reply.send(
      meetings.map((m) => ({
        id: m.id,
        schedulingLinkId: m.schedulingLinkId,
        userId: m.userId,
        inviteeName: m.inviteeName,
        inviteeEmail: m.inviteeEmail,
        notes: m.notes,
        startDateTime: m.startDateTime.toISOString(),
        endDateTime: m.endDateTime.toISOString(),
        status: m.status,
        googleEventId: m.googleEventId,
        appleEventUrl: m.appleEventUrl,
        createdAt: m.createdAt.toISOString(),
        updatedAt: m.updatedAt.toISOString(),
      }))
    );
  } catch (error) {
    throw error;
  }
}

/**
 * POST /api/meetings/:meetingId/cancel
 */
export async function cancelMeeting(
  request: FastifyRequest<{ Params: { meetingId: string } }>,
  reply: FastifyReply
) {
  const user = request.user;
  if (!user) {
    return reply.status(401).send({ error: 'Not authenticated' });
  }

  const userId = user.id;
  const { meetingId } = request.params;

  try {
    const meeting = await prisma.meeting.findUnique({
      where: { id: meetingId },
      include: {
        schedulingLink: {
          include: { user: true },
        },
      },
    });

    if (!meeting || meeting.userId !== userId) {
      reply.status(404).send({ error: 'Meeting not found' });
      return;
    }

    if (meeting.status === 'cancelled') {
      reply.status(400).send({ error: 'Meeting already cancelled' });
      return;
    }

    // Update meeting status
    await prisma.meeting.update({
      where: { id: meetingId },
      data: {
        status: 'cancelled',
        cancelledAt: new Date(),
      },
    });

    // Cancel calendar event
    const link = meeting.schedulingLink;
    const user = link.user;

    if (link.calendarProvider === 'google' && meeting.googleEventId && user.googleAccessToken) {
      try {
        await googleCalendarService.cancelEvent(user.id, link.calendarId, meeting.googleEventId);
      } catch (error) {
        console.error('Failed to cancel Google event:', error);
      }
    } else if (link.calendarProvider === 'apple' && meeting.appleEventUrl) {
      try {
        await appleCalendarService.cancelEvent(user.id, link.calendarId, meeting.appleEventUrl);
      } catch (error) {
        console.error('Failed to cancel Apple event:', error);
      }
    }

    // Send cancellation email to invitee
    if (user.googleAccessToken) {
      try {
        await gmailService.sendEmail(user.id, {
          to: meeting.inviteeEmail,
          subject: `Meeting Cancelled: ${link.name}`,
          body: `Hi ${meeting.inviteeName},\n\nYour meeting has been cancelled by the host.\n\nIf you'd like to reschedule, please visit the original booking link.\n\nBest regards`,
        });
      } catch (error) {
        console.error('Failed to send cancellation email:', error);
      }
    }

    reply.send({ success: true });
  } catch (error) {
    throw error;
  }
}

/**
 * POST /api/meetings/send-link-email
 */
export async function sendMeetingLinkEmail(
  request: FastifyRequest<{ Body: unknown }>,
  reply: FastifyReply
) {
  const user = request.user;
  if (!user) {
    return reply.status(401).send({ error: 'Not authenticated' });
  }

  const userId = user.id;

  // Validate request body
  const parsed = sendLinkEmailSchema.safeParse(request.body);
  if (!parsed.success) {
    reply.status(400).send({ error: formatZodError(parsed.error) });
    return;
  }

  const { recipients, subject, message, bookingUrl } = parsed.data;

  try {
    // Verify user has Gmail access
    const userWithGmail = await prisma.user.findUnique({
      where: { id: userId },
      select: { googleAccessToken: true, name: true },
    });

    if (!userWithGmail || !userWithGmail.googleAccessToken) {
      reply.status(400).send({ error: 'Google account not connected' });
      return;
    }

    // Validate booking URL belongs to user's scheduling links
    const schedulingLinks = await prisma.schedulingLink.findMany({
      where: { userId, isActive: true },
      select: { slug: true },
    });

    const validSlugs = schedulingLinks.map((link) => link.slug);
    const urlMatch = bookingUrl.match(/\/book\/([^/?#]+)/);
    const urlSlug = urlMatch ? urlMatch[1] : null;

    if (!urlSlug || !validSlugs.includes(urlSlug)) {
      reply.status(400).send({
        error: 'Invalid booking URL. URL must match one of your active scheduling links.'
      });
      return;
    }

    // Generate email template
    const emailContent = emailTemplateService.generateMeetingLinkEmail(message, bookingUrl);

    // Send emails to all recipients
    let sentCount = 0;
    const errors: string[] = [];

    for (const recipient of recipients) {
      try {
        await gmailService.sendEmail(userId, {
          to: recipient,
          subject,
          html: emailContent.html,
          text: emailContent.text,
        });
        sentCount++;
      } catch (error) {
        console.error(`Failed to send email to ${recipient}:`, error);
        errors.push(recipient);
      }
    }

    // Return success if at least one email was sent
    if (sentCount > 0) {
      reply.send({
        success: true,
        sentCount,
        totalRecipients: recipients.length,
        ...(errors.length > 0 && { failedRecipients: errors }),
      });
    } else {
      reply.status(500).send({
        error: 'Failed to send emails to any recipients',
        failedRecipients: errors,
      });
    }
  } catch (error) {
    throw error;
  }
}

/**
 * GET /api/meetings/:id (Public)
 * Get meeting details (public endpoint, no auth required)
 */
export async function getMeetingDetails(
  request: FastifyRequest<{ Params: { id: string } }>,
  reply: FastifyReply
) {
  const { id } = request.params;

  try {
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
  } catch (error) {
    throw error;
  }
}

/**
 * GET /api/meetings/:id/calendar (Public)
 * Download ICS calendar file for the meeting
 */
export async function downloadMeetingCalendar(
  request: FastifyRequest<{ Params: { id: string } }>,
  reply: FastifyReply
) {
  const { id } = request.params;

  try {
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
  } catch (error) {
    throw error;
  }
}

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
