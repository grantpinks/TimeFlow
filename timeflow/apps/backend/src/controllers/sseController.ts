/**
 * SSE Controller
 *
 * Handles Server-Sent Events connections for real-time inbox updates.
 */

import { FastifyRequest, FastifyReply } from 'fastify';
import { registerClient } from '../services/sseService.js';
import { randomBytes } from 'crypto';

/**
 * SSE endpoint for real-time inbox notifications
 */
export async function handleSSEConnection(
  request: FastifyRequest,
  reply: FastifyReply
) {
  const user = request.user;
  if (!user) {
    return reply.status(401).send({ error: 'Not authenticated' });
  }

  // Set SSE headers
  reply.raw.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive',
    'X-Accel-Buffering': 'no', // Disable nginx buffering
  });

  // Generate unique connection ID
  const connectionId = randomBytes(16).toString('hex');

  // Send initial connection success event
  reply.raw.write(`event: connected\ndata: ${JSON.stringify({ connectionId })}\n\n`);

  // Register the client
  registerClient(user.id, reply, connectionId);

  request.log.info({ userId: user.id, connectionId }, 'SSE client connected');

  // Keep connection open until client disconnects
  reply.raw.on('close', () => {
    request.log.info({ userId: user.id, connectionId }, 'SSE client disconnected');
  });
}
