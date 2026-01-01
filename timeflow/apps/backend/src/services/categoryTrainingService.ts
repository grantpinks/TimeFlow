import { prisma } from '../config/prisma.js';
import type { CategoryTrainingExampleSnapshot } from '@timeflow/shared';

export function normalizeKeywords(values: string[]) {
  return Array.from(
    new Set(values.map((value) => value.trim().toLowerCase()).filter(Boolean))
  );
}

function uniqueByEventId(values: CategoryTrainingExampleSnapshot[]) {
  const seen = new Set<string>();
  return values.filter((value) => {
    if (seen.has(value.eventId)) return false;
    seen.add(value.eventId);
    return true;
  });
}

export async function getTrainingProfile(userId: string, categoryId: string) {
  try {
    return await prisma.categoryTrainingProfile.findFirst({
      where: { userId, categoryId },
    });
  } catch (error: any) {
    if (error?.code === 'P2021') {
      // Table missing; treat as no profile rather than crashing
      return null;
    }
    throw error;
  }
}

export async function getTrainingProfiles(userId: string) {
  try {
    return await prisma.categoryTrainingProfile.findMany({
      where: { userId },
    });
  } catch (error: any) {
    if (error?.code === 'P2021') {
      // Table missing; skip training data
      return [];
    }
    throw error;
  }
}

export async function upsertTrainingProfile(
  userId: string,
  categoryId: string,
  data: {
    description?: string;
    includeKeywords: string[];
    excludeKeywords?: string[];
    exampleEventIds?: string[];
    exampleEventsSnapshot?: CategoryTrainingExampleSnapshot[];
  }
) {
  const includeKeywords = normalizeKeywords(data.includeKeywords);
  const excludeKeywords = normalizeKeywords(data.excludeKeywords || []);
  const exampleEventIds = Array.from(new Set(data.exampleEventIds || []));
  const exampleEventsSnapshot = uniqueByEventId(data.exampleEventsSnapshot || []);

  try {
    return await prisma.categoryTrainingProfile.upsert({
      where: { categoryId },
      create: {
        userId,
        categoryId,
        description: data.description?.trim() || null,
        includeKeywords,
        excludeKeywords,
        exampleEventIds,
        exampleEventsSnapshot,
      },
      update: {
        description: data.description?.trim() || null,
        includeKeywords,
        excludeKeywords,
        exampleEventIds,
        exampleEventsSnapshot,
      },
    });
  } catch (error: any) {
    if (error?.code === 'P2021') {
      // Table missing; silently skip training persistence
      return null;
    }
    throw error;
  }
}

export async function addTrainingExample(
  userId: string,
  categoryId: string,
  example: CategoryTrainingExampleSnapshot
) {
  const profile = await getTrainingProfile(userId, categoryId);
  if (!profile) {
    try {
      return await prisma.categoryTrainingProfile.create({
        data: {
          userId,
          categoryId,
          description: null,
          includeKeywords: [],
          excludeKeywords: [],
          exampleEventIds: [example.eventId],
          exampleEventsSnapshot: [example],
        },
      });
    } catch (error: any) {
      if (error?.code === 'P2021') {
        return null;
      }
      throw error;
    }
  }

  const exampleEventIds = Array.from(
    new Set([...(profile.exampleEventIds || []), example.eventId])
  );
  const existingSnapshots = Array.isArray(profile.exampleEventsSnapshot)
    ? (profile.exampleEventsSnapshot as CategoryTrainingExampleSnapshot[])
    : [];
  const exampleEventsSnapshot = uniqueByEventId([
    ...existingSnapshots,
    example,
  ]).slice(0, 5);

  try {
    return await prisma.categoryTrainingProfile.update({
      where: { categoryId },
      data: { exampleEventIds, exampleEventsSnapshot },
    });
  } catch (error: any) {
    if (error?.code === 'P2021') {
      return null;
    }
    throw error;
  }
}
