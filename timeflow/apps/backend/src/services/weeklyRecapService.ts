/**
 * Weekly identity recap email (Gmail send, opt-in).
 * Triggered by secured cron POST — see internal/cron/weekly-recap.
 */

import { DateTime } from 'luxon';
import { prisma } from '../config/prisma.js';
import * as gmailService from './gmailService.js';

const MIN_DAYS_BETWEEN_RECAPS = 6;

export async function runWeeklyRecapBatch(): Promise<{
  processed: number;
  sent: number;
  skipped: number;
  failed: number;
}> {
  const users = await prisma.user.findMany({
    where: {
      notifyWeeklyIdentityRecap: true,
      googleRefreshToken: { not: null },
    },
    select: {
      id: true,
      email: true,
      timeZone: true,
      lastWeeklyRecapSentAt: true,
      name: true,
    },
  });

  let sent = 0;
  let skipped = 0;
  let failed = 0;
  const baseUrl = process.env.APP_BASE_URL?.replace(/\/$/, '') || 'http://localhost:3000';

  for (const user of users) {
    if (user.lastWeeklyRecapSentAt) {
      const days = DateTime.now().diff(
        DateTime.fromJSDate(user.lastWeeklyRecapSentAt)
      ).as('days');
      if (days < MIN_DAYS_BETWEEN_RECAPS) {
        skipped++;
        continue;
      }
    }

    try {
      const identities = await prisma.identity.findMany({
        where: { userId: user.id, isActive: true },
        orderBy: [{ sortOrder: 'asc' }],
        select: {
          name: true,
          icon: true,
          currentStreak: true,
          longestStreak: true,
          completionCountTotal: true,
          milestoneTier: true,
        },
      });

      const lines = identities.map(
        (i) =>
          `${i.icon} <strong>${escapeHtml(i.name)}</strong>: ${i.currentStreak} day streak · ${i.completionCountTotal} total completions · milestone tier ${i.milestoneTier}`
      );

      const html = `<!DOCTYPE html><html><body style="font-family:system-ui,sans-serif;line-height:1.5;color:#1e293b">
<p>Hi${user.name ? ` ${escapeHtml(user.name)}` : ''},</p>
<p>Here is your weekly TimeFlow identity snapshot:</p>
<ul>${lines.map((l) => `<li>${l}</li>`).join('')}</ul>
<p><a href="${baseUrl}/today" style="color:#0d9488">Open Today in TimeFlow</a></p>
<p style="font-size:12px;color:#64748b">Manage this email in TimeFlow Settings. Sent through your connected Gmail account.</p>
</body></html>`;

      await gmailService.sendEmail(user.id, {
        to: user.email,
        subject: 'Your weekly TimeFlow identity recap',
        html,
      });

      await prisma.user.update({
        where: { id: user.id },
        data: { lastWeeklyRecapSentAt: new Date() },
      });
      sent++;
    } catch (err) {
      console.error('[weeklyRecap] failed for user', user.id, err);
      failed++;
    }
  }

  console.log(
    `[weeklyRecap] batch done processed=${users.length} sent=${sent} skipped=${skipped} failed=${failed}`
  );

  return { processed: users.length, sent, skipped, failed };
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
