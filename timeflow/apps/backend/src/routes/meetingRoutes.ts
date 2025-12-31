/**
 * Meeting Routes (Host Actions)
 *
 * Authenticated routes for hosts to manage their meetings.
 */

import { FastifyInstance } from 'fastify';
import * as meetingController from '../controllers/meetingController.js';
import { requireAuth } from '../middlewares/auth.js';

export async function registerMeetingRoutes(server: FastifyInstance) {
  // Get all meetings for the authenticated user
  server.get('/meetings', { preHandler: requireAuth }, meetingController.getMeetings);

  // Cancel a meeting (host action)
  server.post('/meetings/:meetingId/cancel', { preHandler: requireAuth }, meetingController.cancelMeeting);

  // Send meeting link email to recipients
  server.post('/meetings/send-link-email', { preHandler: requireAuth }, meetingController.sendMeetingLinkEmail);

  // Public meeting endpoints (no auth required)
  server.get('/meetings/:id', meetingController.getMeetingDetails);
  server.get('/meetings/:id/calendar', meetingController.downloadMeetingCalendar);
}
