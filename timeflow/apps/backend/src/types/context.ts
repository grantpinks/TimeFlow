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
 * Extend Fastify JWT to properly type the user object.
 */
declare module '@fastify/jwt' {
  interface FastifyJWT {
    user: AuthenticatedUser;
  }
}

