import { prisma } from '../config/prisma.js';
import type { CalendarEvent } from '@timeflow/shared';

/**
 * Get categorization for a specific event
 */
export async function getEventCategorization(
  userId: string,
  eventId: string,
  provider: string
) {
  return prisma.eventCategorization.findUnique({
    where: {
      userId_eventId_provider: {
        userId,
        eventId,
        provider,
      },
    },
    include: {
      category: true,
    },
  });
}

/**
 * Get categorizations for multiple events
 * Returns a map of eventId -> categorization
 */
export async function getEventCategorizations(
  userId: string,
  eventIds: string[],
  provider: string = 'google'
) {
  const categorizations = await prisma.eventCategorization.findMany({
    where: {
      userId,
      eventId: { in: eventIds },
      provider,
    },
    include: {
      category: true,
    },
  });

  // Return as map for easy lookup
  return new Map(
    categorizations.map((cat) => [
      cat.eventId,
      {
        categoryId: cat.categoryId,
        categoryName: cat.category.name,
        categoryColor: cat.category.color,
        confidence: cat.confidence,
        isManual: cat.isManual,
      },
    ])
  );
}

/**
 * Create or update event categorization
 */
export async function upsertEventCategorization(
  userId: string,
  eventId: string,
  calendarId: string,
  provider: string,
  categoryId: string,
  eventSummary: string,
  options: {
    confidence?: number;
    isManual?: boolean;
  } = {}
) {
  // Verify category exists and belongs to user
  const category = await prisma.category.findFirst({
    where: { id: categoryId, userId },
  });

  if (!category) {
    throw new Error('Category not found or does not belong to user');
  }

  return prisma.eventCategorization.upsert({
    where: {
      userId_eventId_provider: {
        userId,
        eventId,
        provider,
      },
    },
    create: {
      userId,
      eventId,
      calendarId,
      provider,
      categoryId,
      eventSummary,
      confidence: options.confidence ?? 0.0,
      isManual: options.isManual ?? false,
    },
    update: {
      categoryId,
      eventSummary,
      confidence: options.confidence ?? 0.0,
      isManual: options.isManual ?? false,
    },
    include: {
      category: true,
    },
  });
}

/**
 * Update categorization (manual override)
 */
export async function updateEventCategorization(
  userId: string,
  eventId: string,
  provider: string,
  categoryId: string,
  options: { eventSummary?: string; isManual?: boolean; confidence?: number } = {}
) {
  // Verify categorization exists
  const existing = await getEventCategorization(userId, eventId, provider);
  if (!existing) {
    throw new Error('Event categorization not found');
  }

  // Verify new category exists and belongs to user
  const category = await prisma.category.findFirst({
    where: { id: categoryId, userId },
  });

  if (!category) {
    throw new Error('Category not found or does not belong to user');
  }

  return prisma.eventCategorization.update({
    where: {
      userId_eventId_provider: {
        userId,
        eventId,
        provider,
      },
    },
    data: {
      categoryId,
      ...(options.eventSummary ? { eventSummary: options.eventSummary } : {}),
      isManual: options.isManual ?? true, // Mark as manually set
      confidence: options.confidence ?? 1.0, // User choice is 100% confident
    },
    include: {
      category: true,
    },
  });
}

/**
 * Delete event categorization
 */
export async function deleteEventCategorization(
  userId: string,
  eventId: string,
  provider: string
) {
  // Verify ownership before deleting
  const existing = await getEventCategorization(userId, eventId, provider);
  if (!existing) {
    throw new Error('Event categorization not found');
  }

  return prisma.eventCategorization.delete({
    where: {
      userId_eventId_provider: {
        userId,
        eventId,
        provider,
      },
    },
  });
}

/**
 * Delete all categorizations for events that no longer exist
 * Useful for cleanup when events are deleted from Google Calendar
 */
export async function cleanupStaleEventCategorizations(
  userId: string,
  currentEventIds: string[],
  provider: string = 'google'
) {
  const result = await prisma.eventCategorization.deleteMany({
    where: {
      userId,
      provider,
      eventId: { notIn: currentEventIds },
    },
  });

  return result.count;
}

/**
 * Get all uncategorized events for a user
 */
export async function getUncategorizedEvents(
  userId: string,
  allEvents: CalendarEvent[],
  provider: string = 'google'
): Promise<CalendarEvent[]> {
  const eventIds = allEvents.map((e) => e.id).filter(Boolean);

  const categorized = await prisma.eventCategorization.findMany({
    where: {
      userId,
      eventId: { in: eventIds },
      provider,
    },
    select: { eventId: true },
  });

  const categorizedIds = new Set(categorized.map((c) => c.eventId));

  return allEvents.filter((event) => !categorizedIds.has(event.id));
}

/**
 * Get categorization statistics for a user
 */
export async function getCategorizationStats(userId: string) {
  const total = await prisma.eventCategorization.count({
    where: { userId },
  });

  const manual = await prisma.eventCategorization.count({
    where: { userId, isManual: true },
  });

  const lowConfidence = await prisma.eventCategorization.count({
    where: { userId, confidence: { lt: 0.5 }, isManual: false },
  });

  const byCategory = await prisma.eventCategorization.groupBy({
    by: ['categoryId'],
    where: { userId },
    _count: { id: true },
  });

  return {
    total,
    manual,
    automatic: total - manual,
    lowConfidence,
    byCategory: byCategory.map((item) => ({
      categoryId: item.categoryId,
      count: item._count.id,
    })),
  };
}

/**
 * Batch upsert categorizations
 * Useful for bulk categorization operations
 */
export async function batchUpsertCategorizations(
  userId: string,
  categorizations: Array<{
    eventId: string;
    calendarId: string;
    provider: string;
    categoryId: string;
    eventSummary: string;
    confidence: number;
    isManual: boolean;
  }>
) {
  // Use transaction for atomicity
  return prisma.$transaction(
    categorizations.map((cat) =>
      prisma.eventCategorization.upsert({
        where: {
          userId_eventId_provider: {
            userId,
            eventId: cat.eventId,
            provider: cat.provider,
          },
        },
        create: {
          userId,
          ...cat,
        },
        update: {
          categoryId: cat.categoryId,
          eventSummary: cat.eventSummary,
          confidence: cat.confidence,
          isManual: cat.isManual,
        },
      })
    )
  );
}

/**
 * Clean up stale event categorizations
 * Removes categorizations for events that no longer exist in the calendar
 *
 * @param userId - User ID
 * @param currentEventIds - Array of event IDs that currently exist in the calendar
 * @param provider - Calendar provider (default: 'google')
 * @returns Number of stale categorizations deleted
 */
export async function cleanupStaleCategorizations(
  userId: string,
  currentEventIds: string[],
  provider: string = 'google'
): Promise<number> {
  const result = await prisma.eventCategorization.deleteMany({
    where: {
      userId,
      provider,
      eventId: {
        notIn: currentEventIds, // Delete categorizations not in current event list
      },
    },
  });

  if (result.count > 0) {
    console.log(`[Cleanup] Removed ${result.count} stale categorizations for user ${userId}`);
  }

  return result.count;
}
