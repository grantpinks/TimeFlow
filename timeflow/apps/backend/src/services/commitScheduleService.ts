/**
 * Commit Schedule Service
 *
 * Handles bulk scheduling of habits with progress tracking and Google Calendar integration.
 */

import { prisma } from '../config/prisma.js';
import { createEvent } from './googleCalendarService.js';
import { DateTime } from 'luxon';

export interface AcceptedBlock {
  habitId: string;
  startDateTime: string; // ISO string
  endDateTime: string; // ISO string
}

export interface BlockProgress {
  habitId: string;
  status: 'pending' | 'creating' | 'created' | 'failed';
  eventId?: string;
  error?: string;
}

export interface CommitScheduleResponse {
  jobId: string;
  progress: BlockProgress[];
}

/**
 * Commit accepted habit blocks to Google Calendar
 *
 * Creates a SchedulingJob record and processes blocks sequentially,
 * creating ScheduledHabit records and Google Calendar events.
 *
 * @param userId - User ID
 * @param acceptedBlocks - Array of habit blocks to schedule
 * @returns Job ID and progress array
 */
export async function commitSchedule(
  userId: string,
  acceptedBlocks: AcceptedBlock[]
): Promise<CommitScheduleResponse> {
  // Create scheduling job record
  const job = await prisma.schedulingJob.create({
    data: {
      userId,
      status: 'IN_PROGRESS',
      totalBlocks: acceptedBlocks.length,
      completedBlocks: 0,
    },
  });

  const progress: BlockProgress[] = acceptedBlocks.map((block) => ({
    habitId: block.habitId,
    status: 'pending' as const,
  }));

  // Process blocks sequentially (TODO: parallelize with rate limiting in v2)
  for (let i = 0; i < acceptedBlocks.length; i++) {
    const block = acceptedBlocks[i];

    try {
      progress[i].status = 'creating';

      // Fetch habit details
      const habit = await prisma.habit.findUnique({
        where: { id: block.habitId },
      });

      if (!habit) {
        throw new Error(`Habit ${block.habitId} not found`);
      }

      if (habit.userId !== userId) {
        throw new Error(`Habit ${block.habitId} does not belong to user ${userId}`);
      }

      // Fetch user details for calendar access
      const user = await prisma.user.findUnique({
        where: { id: userId },
      });

      if (!user) {
        throw new Error(`User ${userId} not found`);
      }

      if (!user.googleAccessToken) {
        throw new Error('User does not have Google Calendar access');
      }

      // Create Google Calendar event
      const calendarId = user.defaultCalendarId || 'primary';

      const calendarEvent = await createEvent(
        userId,
        calendarId,
        {
          summary: habit.title,
          description: habit.description || undefined,
          start: block.startDateTime,
          end: block.endDateTime,
        },
        false, // enableMeet
        true // skipConflictCheck (suggestions already validated)
      );

      // Create ScheduledHabit record
      await prisma.scheduledHabit.create({
        data: {
          habitId: block.habitId,
          userId,
          provider: 'google',
          calendarId,
          eventId: calendarEvent.eventId,
          startDateTime: DateTime.fromISO(block.startDateTime).toJSDate(),
          endDateTime: DateTime.fromISO(block.endDateTime).toJSDate(),
          lastSyncedAt: new Date(),
        },
      });

      // Update progress
      progress[i].status = 'created';
      progress[i].eventId = calendarEvent.eventId;

      // Update job progress
      await prisma.schedulingJob.update({
        where: { id: job.id },
        data: {
          completedBlocks: i + 1,
          createdEventIds: {
            push: calendarEvent.eventId,
          },
        },
      });
    } catch (error) {
      console.error(`Failed to schedule habit ${block.habitId}:`, error);
      progress[i].status = 'failed';
      progress[i].error = error instanceof Error ? error.message : 'Unknown error';

      // Update job with error
      await prisma.schedulingJob.update({
        where: { id: job.id },
        data: {
          status: 'FAILED',
          errorMessage: `Failed to schedule habit ${block.habitId}: ${
            error instanceof Error ? error.message : 'Unknown error'
          }`,
        },
      });

      // Don't continue processing if one fails
      break;
    }
  }

  // Mark job as completed if all blocks succeeded
  const allSucceeded = progress.every((p) => p.status === 'created');
  if (allSucceeded) {
    await prisma.schedulingJob.update({
      where: { id: job.id },
      data: {
        status: 'COMPLETED',
      },
    });
  }

  return {
    jobId: job.id,
    progress,
  };
}

/**
 * Get scheduling job by ID
 *
 * @param jobId - Job ID
 * @returns Scheduling job or null if not found
 */
export async function getSchedulingJob(jobId: string) {
  return prisma.schedulingJob.findUnique({
    where: { id: jobId },
  });
}

/**
 * Cancel a scheduling job
 *
 * Note: In v1, we only support cancellation before commit is called.
 * Real-time cancellation during processing will be added in v2.
 *
 * @param jobId - Job ID
 * @returns Updated job
 */
export async function cancelSchedulingJob(jobId: string) {
  return prisma.schedulingJob.update({
    where: { id: jobId },
    data: {
      status: 'CANCELLED',
    },
  });
}
