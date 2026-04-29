import { beforeEach, describe, expect, it, vi } from 'vitest';
import { prisma } from '../../config/prisma.js';
import { seedStarterUnlocksForIdentity } from '../identityEvolutionService.js';
import { createIdentity, migrateHabitIdentities } from '../identityService.js';

vi.mock('../../config/prisma.js', () => ({
  prisma: {
    identity: {
      count: vi.fn(),
      findFirst: vi.fn(),
      create: vi.fn(),
    },
    habit: {
      findMany: vi.fn(),
      updateMany: vi.fn(),
    },
    $transaction: vi.fn(),
  },
}));

vi.mock('../identityEvolutionService.js', () => ({
  seedStarterUnlocksForIdentity: vi.fn(),
}));

describe('identityService starter unlock seeding', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('seeds starter unlocks when creating an identity', async () => {
    vi.mocked(prisma.identity.count).mockResolvedValue(0 as any);
    vi.mocked(prisma.identity.findFirst).mockResolvedValue({ sortOrder: 2 } as any);
    vi.mocked(prisma.$transaction).mockImplementation(async (fn: any) =>
      fn({
        identity: {
          create: vi.fn().mockResolvedValue({ id: 'identity-1', sortOrder: 3 }),
        },
      })
    );

    await createIdentity({
      userId: 'user-1',
      name: 'Builder',
      color: '#0d9488',
      icon: '⭐',
    });

    expect(seedStarterUnlocksForIdentity).toHaveBeenCalledWith(
      expect.anything(),
      'identity-1',
      'user-1'
    );
  });

  it('seeds starter unlocks for identities created during habit migration', async () => {
    vi.mocked(prisma.identity.count).mockResolvedValue(0 as any);
    vi.mocked(prisma.habit.findMany).mockResolvedValue([
      { id: 'habit-1', identity: 'Writer', durationMinutes: 30 },
      { id: 'habit-2', identity: 'Athlete', durationMinutes: 20 },
    ] as any);

    const createdRows = [
      { id: 'identity-writer', name: 'Writer' },
      { id: 'identity-athlete', name: 'Athlete' },
    ];

    vi.mocked(prisma.$transaction).mockImplementation(async (fn: any) =>
      fn({
        identity: {
          create: vi
            .fn()
            .mockResolvedValueOnce(createdRows[0])
            .mockResolvedValueOnce(createdRows[1]),
        },
      })
    );
    vi.mocked(prisma.habit.updateMany).mockResolvedValue({ count: 1 } as any);

    await migrateHabitIdentities('user-1');

    expect(seedStarterUnlocksForIdentity).toHaveBeenNthCalledWith(
      1,
      expect.anything(),
      'identity-writer',
      'user-1'
    );
    expect(seedStarterUnlocksForIdentity).toHaveBeenNthCalledWith(
      2,
      expect.anything(),
      'identity-athlete',
      'user-1'
    );
  });
});
