/**
 * Availability Routes
 *
 * Public routes for checking scheduling link availability.
 */

import { FastifyInstance } from 'fastify';
import * as availabilityController from '../controllers/availabilityController.js';

export async function registerAvailabilityRoutes(server: FastifyInstance) {
  // Get availability for a scheduling link (public, no auth)
  server.get('/availability/:slug', availabilityController.getAvailability);
}
