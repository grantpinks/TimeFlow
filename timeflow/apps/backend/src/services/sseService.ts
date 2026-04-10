/**
 * Server-Sent Events (SSE) Service
 *
 * Manages real-time push notifications to connected clients.
 * Used for instant inbox updates when new emails arrive via Gmail push.
 */

import { FastifyReply } from 'fastify';

export type SSEEvent = {
  type: 'inbox-update' | 'ping';
  data?: any;
};

interface SSEClient {
  userId: string;
  reply: FastifyReply;
  connectionId: string;
}

// Store active SSE connections by user ID
const clients = new Map<string, Set<SSEClient>>();

/**
 * Register a new SSE client connection
 */
export function registerClient(userId: string, reply: FastifyReply, connectionId: string): void {
  if (!clients.has(userId)) {
    clients.set(userId, new Set());
  }

  const client: SSEClient = { userId, reply, connectionId };
  clients.get(userId)!.add(client);

  // Remove client when connection closes
  reply.raw.on('close', () => {
    removeClient(userId, connectionId);
  });
}

/**
 * Remove a client connection
 */
export function removeClient(userId: string, connectionId: string): void {
  const userClients = clients.get(userId);
  if (!userClients) return;

  const clientToRemove = Array.from(userClients).find(c => c.connectionId === connectionId);
  if (clientToRemove) {
    userClients.delete(clientToRemove);
    if (userClients.size === 0) {
      clients.delete(userId);
    }
  }
}

/**
 * Send an event to a specific user's connected clients
 */
export function sendEventToUser(userId: string, event: SSEEvent): void {
  const userClients = clients.get(userId);
  if (!userClients || userClients.size === 0) return;

  const eventData = `event: ${event.type}\ndata: ${JSON.stringify(event.data ?? {})}\n\n`;

  // Send to all connected clients for this user
  userClients.forEach((client) => {
    try {
      client.reply.raw.write(eventData);
    } catch (error) {
      // If write fails, remove the client
      console.error('Failed to send SSE event to client:', error);
      removeClient(userId, client.connectionId);
    }
  });
}

/**
 * Send a ping event to keep connections alive
 */
export function sendPing(userId: string): void {
  sendEventToUser(userId, { type: 'ping' });
}

/**
 * Broadcast inbox update event to a user
 */
export function broadcastInboxUpdate(userId: string, data?: { historyId?: string }): void {
  sendEventToUser(userId, {
    type: 'inbox-update',
    data,
  });
}

/**
 * Get count of active connections for a user
 */
export function getClientCount(userId: string): number {
  return clients.get(userId)?.size ?? 0;
}

/**
 * Get total count of all active connections
 */
export function getTotalClientCount(): number {
  let total = 0;
  clients.forEach((userClients) => {
    total += userClients.size;
  });
  return total;
}

/**
 * Start periodic ping to keep connections alive (every 30 seconds)
 */
let pingInterval: NodeJS.Timeout | null = null;

export function startPingInterval(): void {
  if (pingInterval) return;

  pingInterval = setInterval(() => {
    clients.forEach((userClients, userId) => {
      sendPing(userId);
    });
  }, 30000); // 30 seconds
}

export function stopPingInterval(): void {
  if (pingInterval) {
    clearInterval(pingInterval);
    pingInterval = null;
  }
}
