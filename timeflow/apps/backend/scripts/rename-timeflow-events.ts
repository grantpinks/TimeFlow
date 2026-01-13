import 'dotenv/config';
import { prisma } from '../src/config/prisma.js';
import * as calendarService from '../src/services/googleCalendarService.js';
import { buildTimeflowEventDetails } from '../src/utils/timeflowEventPrefix.js';

const dryRun = process.argv.includes('--dry-run');

type UserSummary = {
  id: string;
  email?: string | null;
  defaultCalendarId?: string | null;
  eventPrefixEnabled?: boolean | null;
  eventPrefix?: string | null;
  googleAccessToken?: string | null;
};

async function updateGoogleEvent(
  userId: string,
  calendarId: string,
  eventId: string,
  summary: string,
  description?: string
): Promise<boolean> {
  if (dryRun) {
    console.log(`[dry-run] Would rename event ${eventId} → ${summary}`);
    return true;
  }

  try {
    await calendarService.updateEvent(
      userId,
      calendarId,
      eventId,
      {
        summary,
        ...(description ? { description } : {}),
      },
      true // skip conflict check
    );
    console.log(`[live] Updated event ${eventId} to ${summary}`);
    return true;
  } catch (error) {
    console.error(`[live] Failed to update event ${eventId}:`, error);
    return false;
  }
}

async function rewriteEventsForUser(user: UserSummary): Promise<void> {
  if (!user.googleAccessToken) {
    console.warn(`Skipping user ${user.id} (no Google token)`);
    return;
  }

  const calendarId = user.defaultCalendarId || 'primary';
  const prefixEnabled = user.eventPrefixEnabled ?? true;
  const prefix = user.eventPrefix ?? null;
  let updated = 0;
  const prefixDisplay = prefixEnabled
    ? (prefix?.trim() ? prefix.trim() : 'TF|')
    : '(disabled)';
  const dryRunSuffix = dryRun ? ' (dry run)' : '';
  console.log(
    `[user=${user.email ?? user.id}] calendar=${calendarId} prefix=${prefixDisplay}${dryRunSuffix}`
  );

  const scheduledTasks = await prisma.scheduledTask.findMany({
    where: { userId: user.id },
    include: { task: { select: { title: true } } },
  });
  for (const scheduled of scheduledTasks) {
    if (!scheduled.eventId) continue;
    const title = scheduled.task?.title ?? 'Scheduled Task';
    const { summary, description } = buildTimeflowEventDetails({
      title,
      kind: 'task',
      prefixEnabled,
      prefix,
    });

    if (await updateGoogleEvent(user.id, calendarId, scheduled.eventId, summary, description)) {
      updated += 1;
    }
  }

  const scheduledHabits = await prisma.scheduledHabit.findMany({
    where: { userId: user.id },
    include: { habit: { select: { title: true } } },
  });
  for (const scheduled of scheduledHabits) {
    if (!scheduled.eventId) continue;
    const title = scheduled.habit?.title ?? 'Scheduled Habit';
    const { summary, description } = buildTimeflowEventDetails({
      title,
      kind: 'habit',
      prefixEnabled,
      prefix,
    });

    if (await updateGoogleEvent(user.id, calendarId, scheduled.eventId, summary, description)) {
      updated += 1;
    }
  }

  console.log(
    `User ${user.email ?? user.id}: ${updated} event(s) processed (calendar ${calendarId})`
  );
}

async function main() {
  const users = await prisma.user.findMany({
    where: { googleAccessToken: { not: null } },
    select: {
      id: true,
      email: true,
      defaultCalendarId: true,
      eventPrefixEnabled: true,
      eventPrefix: true,
      googleAccessToken: true,
    },
  });

  for (const user of users) {
    try {
      await rewriteEventsForUser(user);
    } catch (error) {
      console.error(`Failed to rewrite events for user ${user.id}:`, error);
    }
  }
}

main()
  .catch((error) => {
    console.error('Failed to rewrite TimeFlow events:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
