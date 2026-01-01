import { describe, expect, it, vi, beforeEach } from 'vitest';
import { DateTime } from 'luxon';
import { getAvailability } from '../availabilityController.js';
import { prisma } from '../../config/prisma.js';
import * as availabilityService from '../../services/meetingAvailabilityService.js';

vi.mock('../../config/prisma.js', () => ({
  prisma: {
    schedulingLink: {
      findUnique: vi.fn(),
    },
    scheduledTask: {
      findMany: vi.fn(),
    },
    scheduledHabit: {
      findMany: vi.fn(),
    },
  },
}));

vi.mock('../../services/googleCalendarService.js', () => ({
  getEvents: vi.fn().mockResolvedValue([]),
}));

vi.mock('../../services/appleCalendarService.js', () => ({
  getEvents: vi.fn().mockResolvedValue([]),
}));

vi.mock('../../services/meetingAvailabilityService.js', () => ({
  buildAvailabilitySlots: vi.fn(),
}));

function createReply() {
  const reply: any = {
    statusCode: 200,
    status(code: number) {
      this.statusCode = code;
      return this;
    },
    send: vi.fn(),
  };
  return reply;
}

describe('availabilityController', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('clamps requested range to booking horizon and passes daily cap', async () => {
    const link = {
      id: 'link1',
      slug: 'team',
      name: 'Team',
      isActive: true,
      durationsMinutes: [30],
      bufferBeforeMinutes: 5,
      bufferAfterMinutes: 5,
      maxBookingHorizonDays: 2,
      dailyCap: 1,
      calendarProvider: 'google',
      calendarId: 'cal1',
      googleMeetEnabled: true,
      user: {
        id: 'user1',
        timeZone: 'UTC',
        wakeTime: '08:00',
        sleepTime: '18:00',
        dailySchedule: null,
        meetingStartTime: null,
        meetingEndTime: null,
        blockedDaysOfWeek: [],
        dailyMeetingSchedule: null,
        googleAccessToken: 'token',
      },
    };

    (prisma.schedulingLink.findUnique as any).mockResolvedValue(link);
    (prisma.scheduledTask.findMany as any).mockResolvedValue([]);
    (prisma.scheduledHabit.findMany as any).mockResolvedValue([]);

    const slots = [
      { start: '2026-01-10T08:00:00.000Z', end: '2026-01-10T08:30:00.000Z', durationMinutes: 30 },
    ];
    (availabilityService.buildAvailabilitySlots as any).mockReturnValue(slots);

    const request: any = {
      params: { slug: 'team' },
      query: {
        from: '2026-01-10T00:00:00.000Z',
        to: '2026-01-20T23:59:59.999Z',
      },
    };

    const reply = createReply();

    await getAvailability(request, reply);

    const expectedHorizonEnd = DateTime.fromISO(request.query.from, { zone: 'UTC' })
      .plus({ days: link.maxBookingHorizonDays })
      .endOf('day')
      .toISO();

    expect(availabilityService.buildAvailabilitySlots).toHaveBeenCalledWith(
      expect.objectContaining({
        rangeStart: request.query.from,
        rangeEnd: expectedHorizonEnd,
        maxBookingHorizonDays: link.maxBookingHorizonDays,
        dailyCap: link.dailyCap,
      })
    );

    expect(reply.send).toHaveBeenCalledWith({
      link: { name: link.name, durationsMinutes: link.durationsMinutes },
      slots: { 30: [{ start: slots[0].start, end: slots[0].end }] },
    });
  });

  it('returns 400 when required params are missing', async () => {
    const reply = createReply();

    await getAvailability({ params: { slug: 'missing' }, query: {} } as any, reply);

    expect(reply.statusCode).toBe(400);
    expect(reply.send).toHaveBeenCalledWith(expect.objectContaining({ error: expect.stringContaining('from') }));
  });
});
