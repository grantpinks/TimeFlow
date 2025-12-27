/**
 * Meeting Controller (Host Actions)
 *
 * Handles host operations for managing meetings.
 */

import { FastifyRequest, FastifyReply } from 'fastify';
import { prisma } from '../config/prisma.js';
import * as googleCalendarService from '../services/googleCalendarService.js';
import * as appleCalendarService from '../services/appleCalendarService.js';
import * as gmailService from '../services/gmailService.js';

/**
 * GET /api/meetings
 */
export async function getMeetings(
  request: FastifyRequest<{ Querystring: { status?: string } }>,
  reply: FastifyReply
) {
  const userId = request.userId!;
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
  const userId = request.userId!;
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
        await googleCalendarService.deleteEvent(user.id, link.calendarId, meeting.googleEventId);
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
