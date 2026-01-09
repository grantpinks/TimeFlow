/**
 * Tests for Commit Schedule Service
 *
 * Validates bulk habit scheduling commit with progress tracking.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { commitSchedule, getSchedulingJob } from '../commitScheduleService.js';
import { prisma } from '../../config/prisma.js';
import { createEvent } from '../googleCalendarService.js';

// Mock dependencies
vi.mock('../../config/prisma.js', () => ({
  prisma: {
    schedulingJob: {
      create: vi.fn(),
      update: vi.fn(),
      findUnique: vi.fn(),
    },
    habit: {
      findUnique: vi.fn(),
    },
    user: {
      findUnique: vi.fn(),
    },
    scheduledHabit: {
      create: vi.fn(),
    },
  },
}));

vi.mock('../googleCalendarService.js', () => ({
  createEvent: vi.fn(),
}));

describe('commitScheduleService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('commitSchedule', () => {
    it('should create a scheduling job and return job ID', async () => {
      const mockUserId = 'user-123';
      const mockBlocks = [
        {
          habitId: 'habit-1',
          startDateTime: '2026-01-10T08:00:00.000Z',
          endDateTime: '2026-01-10T08:30:00.000Z',
        },
      ];

      const mockJobId = 'job-123';

      // Setup mocks
      vi.mocked(prisma.schedulingJob.create).mockResolvedValue({
        id: mockJobId,
        userId: mockUserId,
        status: 'IN_PROGRESS',
        totalBlocks: 1,
        completedBlocks: 0,
        createdEventIds: [],
        errorMessage: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      } as any);

      vi.mocked(prisma.habit.findUnique).mockResolvedValue({
        id: 'habit-1',
        title: 'Morning Exercise',
        userId: mockUserId,
      } as any);

      vi.mocked(prisma.user.findUnique).mockResolvedValue({
        id: mockUserId,
        googleAccessToken: 'mock-token',
        defaultCalendarId: 'primary',
      } as any);

      vi.mocked(createEvent).mockResolvedValue({
        eventId: 'event-1',
      } as any);

      vi.mocked(prisma.scheduledHabit.create).mockResolvedValue({} as any);
      vi.mocked(prisma.schedulingJob.update).mockResolvedValue({} as any);

      const result = await commitSchedule(mockUserId, mockBlocks);

      expect(result).toHaveProperty('jobId', mockJobId);
      expect(prisma.schedulingJob.create).toHaveBeenCalled();
    });

    it('should return progress array with correct structure', async () => {
      const mockUserId = 'user-123';
      const mockBlocks = [
        {
          habitId: 'habit-1',
          startDateTime: '2026-01-10T08:00:00.000Z',
          endDateTime: '2026-01-10T08:30:00.000Z',
        },
      ];

      // Setup minimal mocks
      vi.mocked(prisma.schedulingJob.create).mockResolvedValue({
        id: 'job-123',
        userId: mockUserId,
        status: 'IN_PROGRESS',
        totalBlocks: 1,
        completedBlocks: 0,
        createdEventIds: [],
        errorMessage: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      } as any);

      vi.mocked(prisma.habit.findUnique).mockResolvedValue({
        id: 'habit-1',
        title: 'Morning Exercise',
        userId: mockUserId,
      } as any);

      vi.mocked(prisma.user.findUnique).mockResolvedValue({
        id: mockUserId,
        googleAccessToken: 'mock-token',
      } as any);

      vi.mocked(createEvent).mockResolvedValue({ eventId: 'event-1' } as any);
      vi.mocked(prisma.scheduledHabit.create).mockResolvedValue({} as any);
      vi.mocked(prisma.schedulingJob.update).mockResolvedValue({} as any);

      const result = await commitSchedule(mockUserId, mockBlocks);

      expect(result).toHaveProperty('progress');
      expect(Array.isArray(result.progress)).toBe(true);
      expect(result.progress.length).toBe(1);
      expect(result.progress[0]).toHaveProperty('habitId', 'habit-1');
      expect(result.progress[0]).toHaveProperty('status');
    });
  });

  describe('getSchedulingJob', () => {
    it('should retrieve a scheduling job by ID', async () => {
      const mockJobId = 'job-123';
      const mockJob = {
        id: mockJobId,
        userId: 'user-123',
        status: 'COMPLETED',
        totalBlocks: 2,
        completedBlocks: 2,
        createdEventIds: ['event-1', 'event-2'],
      };

      vi.mocked(prisma.schedulingJob.findUnique).mockResolvedValue(mockJob as any);

      const result = await getSchedulingJob(mockJobId);

      expect(result).toEqual(mockJob);
      expect(prisma.schedulingJob.findUnique).toHaveBeenCalledWith({
        where: { id: mockJobId },
      });
    });

    it('should return null if job not found', async () => {
      vi.mocked(prisma.schedulingJob.findUnique).mockResolvedValue(null);

      const result = await getSchedulingJob('nonexistent-job');

      expect(result).toBeNull();
    });
  });
});
