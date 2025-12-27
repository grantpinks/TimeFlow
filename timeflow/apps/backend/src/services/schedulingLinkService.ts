import { prisma } from '../config/prisma.js';
import type { SchedulingLink } from '@timeflow/shared';

/**
 * Generate URL-safe slug from name
 */
export function generateLinkSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .trim();
}

/**
 * Get all scheduling links for a user
 */
export async function getSchedulingLinks(userId: string): Promise<SchedulingLink[]> {
  const links = await prisma.schedulingLink.findMany({
    where: { userId },
    orderBy: { createdAt: 'desc' },
  });

  return links.map((link) => ({
    id: link.id,
    userId: link.userId,
    name: link.name,
    slug: link.slug,
    isActive: link.isActive,
    durationsMinutes: link.durationsMinutes,
    bufferBeforeMinutes: link.bufferBeforeMinutes,
    bufferAfterMinutes: link.bufferAfterMinutes,
    maxBookingHorizonDays: link.maxBookingHorizonDays,
    dailyCap: link.dailyCap,
    calendarProvider: link.calendarProvider as 'google' | 'apple',
    calendarId: link.calendarId,
    googleMeetEnabled: link.googleMeetEnabled,
    createdAt: link.createdAt.toISOString(),
    updatedAt: link.updatedAt.toISOString(),
  }));
}

/**
 * Create a new scheduling link
 */
export async function createSchedulingLink(
  userId: string,
  data: {
    name: string;
    durationsMinutes: number[];
    bufferBeforeMinutes?: number;
    bufferAfterMinutes?: number;
    maxBookingHorizonDays?: number;
    dailyCap?: number;
    calendarProvider: 'google' | 'apple';
    calendarId: string;
    googleMeetEnabled?: boolean;
  }
): Promise<SchedulingLink> {
  const baseSlug = generateLinkSlug(data.name);
  let slug = baseSlug;
  let counter = 1;

  // Ensure slug uniqueness
  while (await prisma.schedulingLink.findUnique({ where: { slug } })) {
    slug = `${baseSlug}-${counter}`;
    counter++;
  }

  const link = await prisma.schedulingLink.create({
    data: {
      userId,
      name: data.name,
      slug,
      durationsMinutes: data.durationsMinutes,
      bufferBeforeMinutes: data.bufferBeforeMinutes ?? 10,
      bufferAfterMinutes: data.bufferAfterMinutes ?? 10,
      maxBookingHorizonDays: data.maxBookingHorizonDays ?? 60,
      dailyCap: data.dailyCap ?? 6,
      calendarProvider: data.calendarProvider,
      calendarId: data.calendarId,
      googleMeetEnabled: data.googleMeetEnabled ?? true,
    },
  });

  return {
    id: link.id,
    userId: link.userId,
    name: link.name,
    slug: link.slug,
    isActive: link.isActive,
    durationsMinutes: link.durationsMinutes,
    bufferBeforeMinutes: link.bufferBeforeMinutes,
    bufferAfterMinutes: link.bufferAfterMinutes,
    maxBookingHorizonDays: link.maxBookingHorizonDays,
    dailyCap: link.dailyCap,
    calendarProvider: link.calendarProvider as 'google' | 'apple',
    calendarId: link.calendarId,
    googleMeetEnabled: link.googleMeetEnabled,
    createdAt: link.createdAt.toISOString(),
    updatedAt: link.updatedAt.toISOString(),
  };
}

/**
 * Update a scheduling link
 */
export async function updateSchedulingLink(
  id: string,
  userId: string,
  data: Partial<{
    name: string;
    durationsMinutes: number[];
    bufferBeforeMinutes: number;
    bufferAfterMinutes: number;
    maxBookingHorizonDays: number;
    dailyCap: number;
    calendarProvider: 'google' | 'apple';
    calendarId: string;
    googleMeetEnabled: boolean;
  }>
): Promise<SchedulingLink | null> {
  const link = await prisma.schedulingLink.findFirst({
    where: { id, userId },
  });

  if (!link) {
    return null;
  }

  const updated = await prisma.schedulingLink.update({
    where: { id },
    data,
  });

  return {
    id: updated.id,
    userId: updated.userId,
    name: updated.name,
    slug: updated.slug,
    isActive: updated.isActive,
    durationsMinutes: updated.durationsMinutes,
    bufferBeforeMinutes: updated.bufferBeforeMinutes,
    bufferAfterMinutes: updated.bufferAfterMinutes,
    maxBookingHorizonDays: updated.maxBookingHorizonDays,
    dailyCap: updated.dailyCap,
    calendarProvider: updated.calendarProvider as 'google' | 'apple',
    calendarId: updated.calendarId,
    googleMeetEnabled: updated.googleMeetEnabled,
    createdAt: updated.createdAt.toISOString(),
    updatedAt: updated.updatedAt.toISOString(),
  };
}

/**
 * Pause a scheduling link
 */
export async function pauseSchedulingLink(id: string, userId: string): Promise<boolean> {
  const link = await prisma.schedulingLink.findFirst({
    where: { id, userId },
  });

  if (!link) {
    return false;
  }

  await prisma.schedulingLink.update({
    where: { id },
    data: { isActive: false },
  });

  return true;
}

/**
 * Resume a scheduling link
 */
export async function resumeSchedulingLink(id: string, userId: string): Promise<boolean> {
  const link = await prisma.schedulingLink.findFirst({
    where: { id, userId },
  });

  if (!link) {
    return false;
  }

  await prisma.schedulingLink.update({
    where: { id },
    data: { isActive: true },
  });

  return true;
}

/**
 * Delete a scheduling link
 */
export async function deleteSchedulingLink(id: string, userId: string): Promise<boolean> {
  const link = await prisma.schedulingLink.findFirst({
    where: { id, userId },
  });

  if (!link) {
    return false;
  }

  await prisma.schedulingLink.delete({
    where: { id },
  });

  return true;
}
