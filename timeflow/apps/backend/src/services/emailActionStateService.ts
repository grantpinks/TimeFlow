import { prisma } from '../config/prisma.js';
import type { EmailActionState } from '@timeflow/shared';

export type EmailActionStateMap = Record<string, EmailActionState>;

export async function getActionStateMap(
  userId: string,
  threadIds: string[]
): Promise<EmailActionStateMap> {
  if (threadIds.length === 0) return {};

  const rows = await prisma.emailActionState.findMany({
    where: { userId, threadId: { in: threadIds } },
    select: { threadId: true, actionState: true },
  });

  return rows.reduce<EmailActionStateMap>((acc, row) => {
    acc[row.threadId] = row.actionState as EmailActionState;
    return acc;
  }, {});
}

export async function setActionState(
  userId: string,
  threadId: string,
  actionState: EmailActionState | null
): Promise<EmailActionState | null> {
  if (!actionState) {
    await prisma.emailActionState.deleteMany({
      where: { userId, threadId },
    });
    return null;
  }

  await prisma.emailActionState.upsert({
    where: { userId_threadId: { userId, threadId } },
    create: { userId, threadId, actionState },
    update: { actionState },
  });

  return actionState;
}
