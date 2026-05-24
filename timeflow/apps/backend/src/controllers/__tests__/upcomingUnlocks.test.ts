import { describe, it, expect, vi } from 'vitest';
import { buildServer } from '../../server.js';

vi.mock('../../config/prisma.js', () => ({
  prisma: {
    user: {
      findUnique: vi.fn().mockResolvedValue({ id: 'u1', identityEvolutionEnabled: true }),
      findFirst: vi.fn().mockResolvedValue({ id: 'u1', identityEvolutionEnabled: true }),
    },
    identityUnlock: {
      findMany: vi.fn().mockResolvedValue([
        { unlockKey: 'flow_palette_default' }, // already earned
      ]),
    },
    identity: {
      findFirst: vi.fn().mockResolvedValue({ id: 'identity1', xp: 55 }),
    },
  },
}));

vi.mock('../../middlewares/auth.js', () => ({
  requireAuth: vi.fn((req: any, _reply: any, done: any) => {
    req.user = { id: 'u1' };
    done();
  }),
}));

describe('GET /api/identities/:id/upcoming-unlocks', () => {
  it('returns max 3 not-yet-earned unlocks sorted by level/stage', async () => {
    const server = await buildServer();
    const res = await server.inject({
      method: 'GET',
      url: '/api/identities/identity1/upcoming-unlocks',
    });
    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    expect(body.upcoming.length).toBeLessThanOrEqual(3);
    expect(body.upcoming.every((u: any) => u.unlockKey !== 'flow_palette_default')).toBe(true);
    expect(body).toHaveProperty('xpToNextLevel');
    expect(body).toHaveProperty('sessionsNeeded');
  });
});
