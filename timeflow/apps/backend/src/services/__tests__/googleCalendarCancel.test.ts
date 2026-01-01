import { beforeEach, describe, expect, it, vi } from 'vitest';
import { cancelEvent } from '../googleCalendarService.js';
import { prisma } from '../../config/prisma.js';

const patchMock = vi.fn();

vi.mock('../../config/prisma.js', () => ({
  prisma: {
    user: {
      findUnique: vi.fn(),
      update: vi.fn(),
    },
  },
}));

vi.mock('../../config/google.js', () => ({
  getUserOAuth2Client: vi.fn().mockReturnValue({
    on: vi.fn(),
  }),
}));

vi.mock('../utils/crypto.js', () => ({
  decrypt: (value: string) => value,
  encrypt: (value: string) => value,
}));

vi.mock('googleapis', () => ({
  google: {
    calendar: () => ({
      events: {
        patch: patchMock,
        delete: vi.fn(),
        insert: vi.fn(),
        list: vi.fn(),
        update: vi.fn(),
      },
    }),
  },
  calendar_v3: {},
}));

describe('googleCalendarService cancelEvent', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (prisma.user.findUnique as any).mockResolvedValue({
      id: 'user1',
      googleAccessToken: 'token',
      googleRefreshToken: 'refresh',
    });
  });

  it('patches event status to cancelled instead of deleting', async () => {
    patchMock.mockResolvedValue({});

    await cancelEvent('user1', 'primary', 'event123');

    expect(patchMock).toHaveBeenCalledWith({
      calendarId: 'primary',
      eventId: 'event123',
      requestBody: { status: 'cancelled' },
    });
  });
});
