import { ConnectedAccountProvider } from '@prisma/client';
import { prisma } from '../config/prisma.js';
import { getPrimaryGoogleAccount } from './accountTokenService.js';
import * as appleCalendarService from './appleCalendarService.js';
import { canonicalCalDavCalendarKey } from './appleCalendarService.js';

type ConnectedCalendarDto = {
  id: string;
  connectedAccountId: string;
  externalCalendarId: string;
  name: string;
  color: string | null;
  visible: boolean;
  listedInSidebar: boolean;
  useForAvailability: boolean;
  isPrimary: boolean;
};

type ConnectedAccountDto = {
  id: string;
  provider: ConnectedAccountProvider;
  email: string;
  displayName: string | null;
  isPrimary: boolean;
  lastSuccessAt: string | null;
  lastErrorAt: string | null;
  lastErrorMessage: string | null;
  calendars: ConnectedCalendarDto[];
};

function toConnectedAccountDto(account: {
  id: string;
  provider: ConnectedAccountProvider;
  email: string;
  displayName: string | null;
  isPrimary: boolean;
  lastSuccessAt: Date | null;
  lastErrorAt: Date | null;
  lastErrorMessage: string | null;
  calendars: Array<{
    id: string;
    connectedAccountId: string;
    externalCalendarId: string;
    name: string;
    color: string | null;
    visible: boolean;
    listedInSidebar: boolean;
    useForAvailability: boolean;
    isPrimary: boolean;
  }>;
}): ConnectedAccountDto {
  return {
    id: account.id,
    provider: account.provider,
    email: account.email,
    displayName: account.displayName,
    isPrimary: account.isPrimary,
    lastSuccessAt: account.lastSuccessAt?.toISOString() ?? null,
    lastErrorAt: account.lastErrorAt?.toISOString() ?? null,
    lastErrorMessage: account.lastErrorMessage ?? null,
    calendars: account.calendars,
  };
}

async function ensureGoogleBackfill(userId: string): Promise<void> {
  await getPrimaryGoogleAccount(userId);
}

async function dedupeAppleConnectedCalendars(connectedAccountId: string): Promise<void> {
  const existing = await prisma.connectedCalendar.findMany({
    where: { connectedAccountId },
    orderBy: { createdAt: 'asc' },
  });

  const groups = new Map<string, typeof existing>();
  for (const calendar of existing) {
    const key = canonicalCalDavCalendarKey(calendar.externalCalendarId);
    const group = groups.get(key) ?? [];
    group.push(calendar);
    groups.set(key, group);
  }

  for (const group of groups.values()) {
    if (group.length <= 1) continue;
    const [, ...duplicates] = group;
    await prisma.connectedCalendar.deleteMany({
      where: { id: { in: duplicates.map((c) => c.id) } },
    });
  }
}

async function syncAppleCalendarsForAccount(userId: string, accountId: string): Promise<void> {
  const account = await prisma.connectedAccount.findUnique({ where: { id: accountId } });
  if (!account || account.userId !== userId || account.provider !== ConnectedAccountProvider.apple_caldav) {
    throw new Error('Cannot sync calendars for non-Apple account');
  }

  if (!account.caldavCalendarHomeUrl) {
    await appleCalendarService.refreshConnectedAccountDiscovery(userId, accountId);
  }

  const calendars = await appleCalendarService.listCalendars(userId, accountId);
  const existing = await prisma.connectedCalendar.findMany({
    where: { connectedAccountId: accountId },
  });
  const existingByKey = new Map(
    existing.map((calendar) => [canonicalCalDavCalendarKey(calendar.externalCalendarId), calendar])
  );

  for (const cal of calendars) {
    const key = canonicalCalDavCalendarKey(cal.url);
    const match = existingByKey.get(key);
    if (match) {
      await prisma.connectedCalendar.update({
        where: { id: match.id },
        data: {
          externalCalendarId: cal.url,
          name: cal.displayName,
          useForAvailability: true,
        },
      });
      existingByKey.delete(key);
      continue;
    }

    await prisma.connectedCalendar.create({
      data: {
        connectedAccountId: accountId,
        externalCalendarId: cal.url,
        name: cal.displayName,
        visible: true,
        listedInSidebar: true,
        useForAvailability: true,
      },
    });
  }

  await dedupeAppleConnectedCalendars(accountId);
}

async function syncGoogleCalendarsForAccount(userId: string, accountId: string): Promise<void> {
  const account = await prisma.connectedAccount.findUnique({ where: { id: accountId } });
  if (!account || account.userId !== userId || account.provider !== ConnectedAccountProvider.google) {
    throw new Error('Cannot sync calendars for non-Google account');
  }
  // Today, googleCalendarService.listCalendars() resolves the primary Google token context.
  // Until multi-Google is implemented, only sync calendars for the primary Google account.
  if (!account.isPrimary) {
    return;
  }

  const calendars = await (await import('./googleCalendarService.js')).listCalendars(userId);
  await Promise.all(
    calendars.map((cal) =>
      prisma.connectedCalendar.upsert({
        where: {
          connectedAccountId_externalCalendarId: {
            connectedAccountId: accountId,
            externalCalendarId: cal.id,
          },
        },
        update: {
          name: cal.summary,
          isPrimary: cal.primary,
        },
        create: {
          connectedAccountId: accountId,
          externalCalendarId: cal.id,
          name: cal.summary,
          isPrimary: cal.primary,
          visible: true,
          listedInSidebar: true,
          useForAvailability: true,
        },
      })
    )
  );
}

async function backfillAppleAccountIfPresent(userId: string): Promise<void> {
  const existingConnectedApple = await prisma.connectedAccount.count({
    where: { userId, provider: ConnectedAccountProvider.apple_caldav },
  });
  if (existingConnectedApple > 0) return;

  const legacy = await prisma.appleCalendarAccount.findUnique({ where: { userId } });
  if (!legacy) return;

  const account = await prisma.connectedAccount.upsert({
    where: {
      userId_provider_providerAccountId: {
        userId,
        provider: ConnectedAccountProvider.apple_caldav,
        providerAccountId: legacy.email.toLowerCase(),
      },
    },
    update: {
      email: legacy.email,
      caldavBaseUrl: legacy.baseUrl,
      caldavPrincipalUrl: legacy.principalUrl,
      caldavCalendarHomeUrl: legacy.calendarHomeUrl,
      caldavAppPasswordEncrypted: legacy.appPasswordEncrypted,
    },
    create: {
      userId,
      provider: ConnectedAccountProvider.apple_caldav,
      providerAccountId: legacy.email.toLowerCase(),
      email: legacy.email,
      caldavBaseUrl: legacy.baseUrl,
      caldavPrincipalUrl: legacy.principalUrl,
      caldavCalendarHomeUrl: legacy.calendarHomeUrl,
      caldavAppPasswordEncrypted: legacy.appPasswordEncrypted,
    },
  });

  const existing = await prisma.connectedCalendar.count({
    where: { connectedAccountId: account.id },
  });
  if (existing > 0) return;

  const calendars = await appleCalendarService.listCalendars(userId, account.id);
  await Promise.all(
    calendars.map((cal) =>
      prisma.connectedCalendar.upsert({
        where: {
          connectedAccountId_externalCalendarId: {
            connectedAccountId: account.id,
            externalCalendarId: cal.url,
          },
        },
        update: { name: cal.displayName },
        create: {
          connectedAccountId: account.id,
          externalCalendarId: cal.url,
          name: cal.displayName,
        },
      })
    )
  );
}

export async function listConnectedAccounts(userId: string): Promise<ConnectedAccountDto[]> {
  await ensureGoogleBackfill(userId);
  await backfillAppleAccountIfPresent(userId);

  const google = await prisma.connectedAccount.findFirst({
    where: { userId, provider: ConnectedAccountProvider.google, isPrimary: true },
  });
  if (google) {
    const count = await prisma.connectedCalendar.count({
      where: { connectedAccountId: google.id },
    });
    if (count === 0) {
      await syncGoogleCalendarsForAccount(userId, google.id);
    }
  }

  const appleAccounts = await prisma.connectedAccount.findMany({
    where: { userId, provider: ConnectedAccountProvider.apple_caldav },
  });
  for (const apple of appleAccounts) {
    try {
      const count = await prisma.connectedCalendar.count({
        where: { connectedAccountId: apple.id },
      });
      if (count === 0) {
        await syncAppleCalendarsForAccount(userId, apple.id);
      } else {
        await dedupeAppleConnectedCalendars(apple.id);
      }
    } catch (error) {
      console.error('[ConnectedAccount] Apple calendar sync failed:', error);
    }
  }

  const accounts = await prisma.connectedAccount.findMany({
    where: { userId },
    include: {
      calendars: {
        orderBy: [{ isPrimary: 'desc' }, { name: 'asc' }],
      },
    },
    orderBy: [{ isPrimary: 'desc' }, { createdAt: 'asc' }],
  });

  return accounts.map(toConnectedAccountDto);
}

export async function connectIcloudAccount(userId: string, email: string, appPassword: string) {
  const discovered = await appleCalendarService.discoverConnectedAccount(userId, email, appPassword);
  const account = await prisma.connectedAccount.findUniqueOrThrow({
    where: {
      userId_provider_providerAccountId: {
        userId,
        provider: ConnectedAccountProvider.apple_caldav,
        providerAccountId: email.toLowerCase(),
      },
    },
  });

  await syncAppleCalendarsForAccount(userId, account.id);

  const accountAfterSync = await prisma.connectedAccount.findUniqueOrThrow({
    where: { id: account.id },
  });

  // Keep legacy Apple row in sync as a compatibility bridge.
  await prisma.appleCalendarAccount.upsert({
    where: { userId },
    update: {
      email,
      appPasswordEncrypted: discovered.encryptedPassword,
      baseUrl: accountAfterSync.caldavBaseUrl || 'https://caldav.icloud.com',
      principalUrl: discovered.principalUrl,
      calendarHomeUrl: discovered.calendarHomeUrl,
    },
    create: {
      userId,
      email,
      appPasswordEncrypted: discovered.encryptedPassword,
      baseUrl: accountAfterSync.caldavBaseUrl || 'https://caldav.icloud.com',
      principalUrl: discovered.principalUrl,
      calendarHomeUrl: discovered.calendarHomeUrl,
    },
  });

  const hydrated = await prisma.connectedAccount.findUniqueOrThrow({
    where: { id: account.id },
    include: { calendars: { orderBy: [{ isPrimary: 'desc' }, { name: 'asc' }] } },
  });

  return toConnectedAccountDto(hydrated);
}

export async function updateConnectedCalendar(
  userId: string,
  connectedCalendarId: string,
  updates: {
    visible?: boolean;
    listedInSidebar?: boolean;
    color?: string | null;
    useForAvailability?: boolean;
  }
): Promise<ConnectedCalendarDto> {
  const calendar = await prisma.connectedCalendar.findUnique({
    where: { id: connectedCalendarId },
    include: { account: true },
  });
  if (!calendar || calendar.account.userId !== userId) {
    throw new Error('Connected calendar not found');
  }

  const next = await prisma.connectedCalendar.update({
    where: { id: connectedCalendarId },
    data: {
      visible: updates.visible,
      listedInSidebar: updates.listedInSidebar,
      color: updates.color,
      useForAvailability: updates.useForAvailability,
    },
  });

  return next;
}

export async function disconnectConnectedAccount(userId: string, connectedAccountId: string) {
  const account = await prisma.connectedAccount.findUnique({ where: { id: connectedAccountId } });
  if (!account || account.userId !== userId) {
    throw new Error('Connected account not found');
  }

  await prisma.connectedAccount.delete({ where: { id: connectedAccountId } });

  if (account.provider === ConnectedAccountProvider.apple_caldav) {
    const legacy = await prisma.appleCalendarAccount.findUnique({ where: { userId } });
    if (legacy && legacy.email.toLowerCase() === account.providerAccountId.toLowerCase()) {
      await prisma.appleCalendarAccount.delete({ where: { userId } });
    }
    return;
  }

  // Prevent lazy backfill from immediately recreating a disconnected primary Google account.
  if (account.provider === ConnectedAccountProvider.google && account.isPrimary) {
    await prisma.user.update({
      where: { id: userId },
      data: {
        googleAccessToken: null,
        googleRefreshToken: null,
        googleAccessTokenExpiry: null,
      },
    });
  }
}
