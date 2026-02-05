/**
 * Diagnostics Controller
 * 
 * Helps debug production issues by exposing diagnostic endpoints
 */

import type { FastifyRequest, FastifyReply } from 'fastify';
import { prisma } from '../config/prisma.js';
import * as calendarService from '../services/googleCalendarService.js';

/**
 * GET /api/diagnostics/calendar
 * Check if user's Google Calendar is properly connected
 */
export async function checkCalendar(request: FastifyRequest, reply: FastifyReply) {
  const userId = request.user?.id;
  if (!userId) {
    return reply.status(401).send({ error: 'Unauthorized' });
  }

  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        googleAccessToken: true,
        googleRefreshToken: true,
        googleAccessTokenExpiry: true,
        defaultCalendarId: true,
      },
    });

    if (!user) {
      return reply.status(404).send({ error: 'User not found' });
    }

    const diagnostics: any = {
      userId: user.id,
      email: user.email,
      hasAccessToken: !!user.googleAccessToken,
      hasRefreshToken: !!user.googleRefreshToken,
      tokenExpiry: user.googleAccessTokenExpiry?.toISOString(),
      tokenExpired: user.googleAccessTokenExpiry ? user.googleAccessTokenExpiry < new Date() : null,
      defaultCalendarId: user.defaultCalendarId || 'primary',
      calendarConnectionStatus: 'unknown',
      eventsFetched: 0,
      error: null,
    };

    // Try to fetch events
    if (user.googleAccessToken) {
      try {
        const now = new Date();
        const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);
        
        const events = await calendarService.getEvents(
          userId,
          user.defaultCalendarId || 'primary',
          now.toISOString(),
          tomorrow.toISOString()
        );

        diagnostics.calendarConnectionStatus = 'connected';
        diagnostics.eventsFetched = events.length;
        diagnostics.sampleEvents = events.slice(0, 3).map(e => ({
          summary: e.summary,
          start: e.start,
          end: e.end,
        }));
      } catch (error) {
        diagnostics.calendarConnectionStatus = 'error';
        diagnostics.error = error instanceof Error ? error.message : 'Unknown error';
        diagnostics.errorDetails = error instanceof Error ? error.stack : null;
      }
    } else {
      diagnostics.calendarConnectionStatus = 'not_connected';
      diagnostics.error = 'No Google access token found. User needs to connect Google Calendar.';
    }

    return reply.send(diagnostics);
  } catch (error) {
    request.log.error(error, 'Diagnostics check failed');
    return reply.status(500).send({
      error: 'Diagnostics failed',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}

/**
 * GET /api/diagnostics/env
 * Check critical environment variables (safe output only)
 */
export async function checkEnvironment(request: FastifyRequest, reply: FastifyReply) {
  const userId = request.user?.id;
  if (!userId) {
    return reply.status(401).send({ error: 'Unauthorized' });
  }

  // Only show safe diagnostic info
  const diagnostics = {
    nodeEnv: process.env.NODE_ENV,
    hasDatabase: !!process.env.DATABASE_URL,
    hasSessionSecret: !!process.env.SESSION_SECRET,
    hasEncryptionKey: !!process.env.ENCRYPTION_KEY,
    hasGoogleClientId: !!process.env.GOOGLE_CLIENT_ID,
    hasGoogleClientSecret: !!process.env.GOOGLE_CLIENT_SECRET,
    googleRedirectUri: process.env.GOOGLE_REDIRECT_URI,
    llmProvider: process.env.LLM_PROVIDER || 'local',
    llmModel: process.env.OPENAI_MODEL || process.env.LLM_MODEL || 'default',
    hasOpenAiKey: !!process.env.OPENAI_API_KEY,
    frontendUrl: process.env.FRONTEND_URL,
    port: process.env.PORT,
  };

  return reply.send(diagnostics);
}
