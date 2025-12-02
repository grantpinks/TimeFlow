/**
 * Backend-specific types for request context and session data.
 */

export interface AuthenticatedUser {
  id: string;
  email: string;
  googleId?: string | null;
  timeZone: string;
  wakeTime: string;
  sleepTime: string;
  defaultTaskDurationMinutes: number;
  defaultCalendarId?: string | null;
}

/**
 * Extend Fastify's request interface to include authenticated user.
 */
declare module 'fastify' {
  interface FastifyRequest {
    user?: AuthenticatedUser;
  }
}

