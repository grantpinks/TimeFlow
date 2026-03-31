/**
 * Identity Service
 *
 * Business logic for identity CRUD, reordering, migration, and progress tracking.
 */

import { prisma } from '../config/prisma.js';

const IDENTITY_LIMIT = 5;

// Curated palette — matches frontend constants
const IDENTITY_COLORS = [
  '#0d9488', // Teal
  '#2563eb', // Blue
  '#059669', // Green
  '#d97706', // Amber
  '#7c3aed', // Purple
  '#e11d48', // Rose
  '#4f46e5', // Indigo
  '#475569', // Slate
];

export interface CreateIdentityInput {
  userId: string;
  name: string;
  description?: string;
  color: string;
  icon: string;
}

export interface UpdateIdentityInput {
  name?: string;
  description?: string;
  color?: string;
  icon?: string;
  isActive?: boolean;
}

// ---------------------------------------------------------------------------
// CRUD
// ---------------------------------------------------------------------------

export async function getIdentities(userId: string) {
  return prisma.identity.findMany({
    where: { userId },
    orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
  });
}

export async function getIdentityById(id: string, userId: string) {
  return prisma.identity.findFirst({ where: { id, userId } });
}

export async function createIdentity(input: CreateIdentityInput) {
  const { userId, name, description, color, icon } = input;

  // Enforce 5-identity hard limit
  const count = await prisma.identity.count({ where: { userId } });
  if (count >= IDENTITY_LIMIT) {
    throw new Error(`IDENTITY_LIMIT_REACHED`);
  }

  // Determine next sortOrder
  const lastIdentity = await prisma.identity.findFirst({
    where: { userId },
    orderBy: { sortOrder: 'desc' },
    select: { sortOrder: true },
  });
  const sortOrder = lastIdentity ? lastIdentity.sortOrder + 1 : 0;

  return prisma.identity.create({
    data: { userId, name: name.trim(), description, color, icon, sortOrder },
  });
}

export async function updateIdentity(id: string, userId: string, input: UpdateIdentityInput) {
  const existing = await prisma.identity.findFirst({ where: { id, userId } });
  if (!existing) return null;

  // Check name uniqueness if name is being changed
  if (input.name && input.name.trim() !== existing.name) {
    const conflict = await prisma.identity.findFirst({
      where: { userId, name: input.name.trim(), id: { not: id } },
    });
    if (conflict) throw new Error('DUPLICATE_NAME');
  }

  return prisma.identity.update({
    where: { id },
    data: {
      ...(input.name !== undefined && { name: input.name.trim() }),
      ...(input.description !== undefined && { description: input.description }),
      ...(input.color !== undefined && { color: input.color }),
      ...(input.icon !== undefined && { icon: input.icon }),
      ...(input.isActive !== undefined && { isActive: input.isActive }),
    },
  });
}

export async function deleteIdentity(id: string, userId: string) {
  const existing = await prisma.identity.findFirst({ where: { id, userId } });
  if (!existing) return null;

  // onDelete: SetNull handles nullifying task/habit FKs automatically
  await prisma.identity.delete({ where: { id } });
  return true;
}

export async function reorderIdentities(userId: string, identityIds: string[]) {
  // Verify all belong to user
  const owned = await prisma.identity.findMany({
    where: { userId, id: { in: identityIds } },
    select: { id: true },
  });
  if (owned.length !== identityIds.length) {
    throw new Error('INVALID_IDS');
  }

  // Update sortOrder in a transaction
  await prisma.$transaction(
    identityIds.map((id, index) =>
      prisma.identity.update({ where: { id }, data: { sortOrder: index } })
    )
  );

  return getIdentities(userId);
}

// ---------------------------------------------------------------------------
// Migration: auto-convert habit.identity strings into Identity records
// ---------------------------------------------------------------------------

function getDefaultIconForName(name: string): string {
  const n = name.toLowerCase();
  if (n.includes('writer') || n.includes('writing')) return '✍️';
  if (n.includes('athlete') || n.includes('fitness') || n.includes('health')) return '💪';
  if (n.includes('leader') || n.includes('professional') || n.includes('career')) return '💼';
  if (n.includes('creative') || n.includes('artist') || n.includes('art')) return '🎨';
  if (n.includes('financial') || n.includes('money') || n.includes('wealth')) return '💰';
  if (n.includes('relationship') || n.includes('social') || n.includes('friend')) return '💕';
  if (n.includes('learning') || n.includes('knowledge') || n.includes('education')) return '📚';
  if (n.includes('mindful') || n.includes('spiritual') || n.includes('meditation')) return '🧘';
  if (n.includes('home') || n.includes('environment') || n.includes('organize')) return '🏡';
  if (n.includes('travel') || n.includes('adventure') || n.includes('explore')) return '✈️';
  if (n.includes('growth') || n.includes('personal')) return '🌱';
  return '⭐';
}

export async function checkMigrationNeeded(userId: string): Promise<boolean> {
  const existingCount = await prisma.identity.count({ where: { userId } });
  if (existingCount > 0) return false;

  const habitsWithIdentity = await prisma.habit.count({
    where: { userId, identity: { not: null } },
  });
  return habitsWithIdentity > 0;
}

export async function migrateHabitIdentities(userId: string): Promise<void> {
  const alreadyMigrated = await prisma.identity.count({ where: { userId } });
  if (alreadyMigrated > 0) return;

  const habits = await prisma.habit.findMany({
    where: { userId, identity: { not: null } },
    select: { id: true, identity: true, durationMinutes: true },
  });

  const uniqueNames = [
    ...new Set(habits.map((h) => h.identity).filter(Boolean) as string[]),
  ].slice(0, IDENTITY_LIMIT);

  if (uniqueNames.length === 0) return;

  // Create Identity records
  const created = await prisma.$transaction(
    uniqueNames.map((name, index) =>
      prisma.identity.create({
        data: {
          userId,
          name,
          description: 'Migrated from habits',
          color: IDENTITY_COLORS[index % IDENTITY_COLORS.length],
          icon: getDefaultIconForName(name),
          sortOrder: index,
        },
      })
    )
  );

  // Link existing habits to their new Identity records
  for (const identity of created) {
    const matchingHabits = habits.filter((h) => h.identity === identity.name);
    if (matchingHabits.length > 0) {
      await prisma.habit.updateMany({
        where: { id: { in: matchingHabits.map((h) => h.id) } },
        data: { identityId: identity.id },
      });
    }
  }
}

// ---------------------------------------------------------------------------
// Progress Tracking
// ---------------------------------------------------------------------------

export async function getIdentityProgress(userId: string, date: string) {
  const dayStart = new Date(`${date}T00:00:00.000Z`);
  const dayEnd = new Date(`${date}T23:59:59.999Z`);

  const identities = await prisma.identity.findMany({
    where: { userId, isActive: true },
    orderBy: [{ sortOrder: 'asc' }],
  });

  // Completed tasks linked to identities today
  const completedTasks = await prisma.task.findMany({
    where: {
      userId,
      status: 'completed',
      identityId: { not: null },
      updatedAt: { gte: dayStart, lte: dayEnd },
    },
    select: { identityId: true, durationMinutes: true },
  });

  // Completed habit instances today (via HabitCompletion)
  // actualDurationMinutes lives on HabitCompletion; identityId + durationMinutes are on Habit
  const completedHabits = await prisma.habitCompletion.findMany({
    where: {
      userId,
      status: 'completed',
      completedAt: { gte: dayStart, lte: dayEnd },
    },
    select: {
      actualDurationMinutes: true,
      habit: { select: { identityId: true, durationMinutes: true } },
    },
  });

  // Habits scheduled today but not yet complete (via ScheduledHabit)
  const scheduledHabits = await prisma.scheduledHabit.findMany({
    where: {
      userId,
      startDateTime: { gte: dayStart, lte: dayEnd },
      status: 'scheduled',
    },
    include: { habit: { select: { identityId: true } } },
  });

  // Build progress map per identity
  const progressMap = new Map<
    string,
    { completedCount: number; totalMinutes: number; inProgressCount: number }
  >();

  for (const identity of identities) {
    progressMap.set(identity.id, { completedCount: 0, totalMinutes: 0, inProgressCount: 0 });
  }

  for (const task of completedTasks) {
    if (task.identityId && progressMap.has(task.identityId)) {
      const entry = progressMap.get(task.identityId)!;
      entry.completedCount += 1;
      entry.totalMinutes += task.durationMinutes ?? 0;
    }
  }

  for (const completion of completedHabits) {
    const identityId = completion.habit?.identityId;
    if (identityId && progressMap.has(identityId)) {
      const entry = progressMap.get(identityId)!;
      entry.completedCount += 1;
      // actualDurationMinutes is on HabitCompletion; fall back to habit.durationMinutes
      const minutes = completion.actualDurationMinutes ?? completion.habit?.durationMinutes ?? 0;
      entry.totalMinutes += minutes;
    }
  }

  for (const scheduled of scheduledHabits) {
    const identityId = scheduled.habit?.identityId;
    if (identityId && progressMap.has(identityId)) {
      progressMap.get(identityId)!.inProgressCount += 1;
    }
  }

  return {
    date,
    identities: identities.map((identity) => ({
      identityId: identity.id,
      name: identity.name,
      color: identity.color,
      icon: identity.icon,
      ...progressMap.get(identity.id)!,
    })),
  };
}
