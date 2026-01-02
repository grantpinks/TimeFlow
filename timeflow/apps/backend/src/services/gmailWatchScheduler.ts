import { prisma } from '../config/prisma.js';
import { env } from '../config/env.js';
import { startGmailWatch } from './gmailWatchService.js';

const DEFAULT_RENEWAL_WINDOW_MINUTES = 60;
const DEFAULT_RENEWAL_INTERVAL_MINUTES = 30;

export async function renewExpiringWatches(): Promise<void> {
  const pubsubTopic = process.env.GMAIL_PUBSUB_TOPIC ?? env.GMAIL_PUBSUB_TOPIC;
  if (!pubsubTopic) {
    return;
  }

  const windowMinutes = Number(
    process.env.GMAIL_WATCH_RENEWAL_WINDOW_MINUTES ??
      env.GMAIL_WATCH_RENEWAL_WINDOW_MINUTES ??
      DEFAULT_RENEWAL_WINDOW_MINUTES
  );
  const threshold = new Date(Date.now() + windowMinutes * 60 * 1000);

  const expiring = await prisma.gmailLabelSyncState.findMany({
    where: {
      watchEnabled: true,
      watchExpiration: {
        lte: threshold,
      },
    },
  });

  for (const state of expiring) {
    await startGmailWatch(state.userId, { topicName: pubsubTopic });
  }
}

export function startWatchRenewalJob(): NodeJS.Timeout | null {
  const renewalEnabled =
    process.env.GMAIL_WATCH_RENEWAL_ENABLED ?? env.GMAIL_WATCH_RENEWAL_ENABLED;
  if (renewalEnabled !== 'true') {
    return null;
  }

  const intervalMinutes = Number(
    process.env.GMAIL_WATCH_RENEWAL_INTERVAL_MINUTES ??
      env.GMAIL_WATCH_RENEWAL_INTERVAL_MINUTES ??
      DEFAULT_RENEWAL_INTERVAL_MINUTES
  );

  return setInterval(() => {
    void renewExpiringWatches().catch((error) => {
      console.error('Gmail watch renewal failed:', error);
    });
  }, intervalMinutes * 60 * 1000);
}
