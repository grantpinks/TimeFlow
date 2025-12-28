/**
 * Meeting Routes (Host Actions)
 *
 * Authenticated routes for hosts to manage their meetings.
 */

import { FastifyInstance } from 'fastify';
import * as meetingController from '../controllers/meetingController.js';

export async function registerMeetingRoutes(server: FastifyInstance) {
  // Get all meetings for the authenticated user
  server.get('/meetings', meetingController.getMeetings);

  // Cancel a meeting (host action)
  server.post('/meetings/:meetingId/cancel', meetingController.cancelMeeting);

  // Send meeting link email to recipients
  server.post('/meetings/send-link-email', meetingController.sendMeetingLinkEmail);
}
