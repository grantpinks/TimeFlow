/**
 * Prisma Client Singleton
 *
 * This module exports a single PrismaClient instance to be reused across the
 * backend. Avoids opening multiple database connections.
 */

import { PrismaClient } from '@prisma/client';

declare global {
  // Prevent multiple instances in development due to hot-reloading
  // eslint-disable-next-line no-var
  var __prisma: PrismaClient | undefined;
}

export const prisma: PrismaClient =
  global.__prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['query', 'warn', 'error'] : ['error'],
  });

if (process.env.NODE_ENV !== 'production') {
  global.__prisma = prisma;
}

