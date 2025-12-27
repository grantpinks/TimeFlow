/**
 * Booking Routes
 *
 * Public routes for booking meetings.
 */

import { FastifyInstance } from 'fastify';
import * as bookingController from '../controllers/bookingController.js';

export async function registerBookingRoutes(server: FastifyInstance) {
  // Book a meeting (public, no auth)
  server.post('/book/:slug', bookingController.bookMeeting);
}
