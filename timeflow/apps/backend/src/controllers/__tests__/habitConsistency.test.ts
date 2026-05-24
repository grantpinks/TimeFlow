import { describe, it, expect, beforeEach, vi } from 'vitest';
import { buildServer } from '../../server.js';

vi.mock('../../config/prisma.js', () => ({
  prisma: {
    habit: {
      findMany: vi.fn(),
    },
    habitCompletion: {
      findMany: vi.fn(),
    },
    user: {
      findUnique: vi.fn().mockResolvedValue({ id: 'u1', identityEvolutionEnabled: true }),
    },
  },
}));

vi.mock('../../middlewares/auth.js', () => ({
  requireAuth: vi.fn((req: any, _reply: any, done: any) => {
    req.user = { id: 'u1' };
    done();
  }),
}));

import { prisma } from '../../config/prisma.js';

describe('GET /api/habits/consistency', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns 400 if identityId missing', async () => {
    const server = await buildServer();
    const res = await server.inject({ method: 'GET', url: '/api/habits/consistency' });
    expect(res.statusCode).toBe(400);
  });

  it('returns 7-day grid for habits linked to identity', async () => {
    const today = new Date();
    today.setHours(12, 0, 0, 0);
    const yesterday = new Date(today);
    yesterday.setDate(today.getDate() - 1);

    (prisma.habit.findMany as any).mockResolvedValue([
      { id: 'h1', title: 'Read 30 min' },
    ]);
    (prisma.habitCompletion.findMany as any).mockResolvedValue([
      { habitId: 'h1', completedAt: yesterday },
    ]);

    const server = await buildServer();
    const res = await server.inject({
      method: 'GET',
      url: '/api/habits/consistency?identityId=identity1',
    });

    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    expect(body.habits).toHaveLength(1);
    expect(body.habits[0].habitId).toBe('h1');
    expect(body.habits[0].completions).toHaveLength(7);
    // Yesterday's slot should be true
    expect(body.habits[0].completions[5]).toBe(true);
  });
});
