/**
 * Secured cron endpoints (Render / external scheduler).
 * POST with header: x-cron-secret: CRON_SECRET
 */

import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import * as weeklyRecapService from '../services/weeklyRecapService.js';

export async function registerInternalCronRoutes(server: FastifyInstance) {
  server.post('/internal/cron/weekly-recap', async (request: FastifyRequest, reply: FastifyReply) => {
    const secret = request.headers['x-cron-secret'];
    const expected = process.env.CRON_SECRET;
    if (!expected || typeof secret !== 'string' || secret !== expected) {
      return reply.status(401).send({ error: 'Unauthorized' });
    }
    const result = await weeklyRecapService.runWeeklyRecapBatch();
    return reply.send(result);
  });
}
