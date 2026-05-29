import { FastifyReply, FastifyRequest } from 'fastify';
import { z } from 'zod';
import { formatZodError } from '../utils/errorFormatter.js';
import * as connectedAccountService from '../services/connectedAccountService.js';

const ICLOUD_APP_PASSWORD_REGEX = /^[a-z0-9]{4}-[a-z0-9]{4}-[a-z0-9]{4}-[a-z0-9]{4}$/i;

const connectIcloudSchema = z.object({
  email: z.string().email(),
  appPassword: z
    .string()
    .regex(
      ICLOUD_APP_PASSWORD_REGEX,
      'Must be a valid iCloud App Password (xxxx-xxxx-xxxx-xxxx)'
    ),
});

const patchConnectedCalendarSchema = z
  .object({
    visible: z.boolean().optional(),
    listedInSidebar: z.boolean().optional(),
    color: z
      .string()
      .regex(/^#([0-9A-Fa-f]{3}|[0-9A-Fa-f]{6})$/, 'Color must be a hex value like #3B82F6')
      .nullable()
      .optional(),
    useForAvailability: z.boolean().optional(),
  })
  .refine(
    (value) =>
      value.visible !== undefined ||
      value.listedInSidebar !== undefined ||
      value.color !== undefined ||
      value.useForAvailability !== undefined,
    { message: 'At least one field must be provided' }
  );

export async function listConnectedAccounts(request: FastifyRequest, reply: FastifyReply) {
  const user = request.user;
  if (!user) return reply.status(401).send({ error: 'Not authenticated' });

  try {
    return await connectedAccountService.listConnectedAccounts(user.id);
  } catch (error) {
    request.log.error(error, 'Failed to list connected accounts');
    return reply.status(500).send({ error: 'Failed to list connected accounts' });
  }
}

export async function connectIcloudAccount(
  request: FastifyRequest<{ Body: { email: string; appPassword: string } }>,
  reply: FastifyReply
) {
  const user = request.user;
  if (!user) return reply.status(401).send({ error: 'Not authenticated' });

  const parsed = connectIcloudSchema.safeParse(request.body);
  if (!parsed.success) {
    return reply.status(400).send({ error: formatZodError(parsed.error) });
  }

  try {
    return await connectedAccountService.connectIcloudAccount(
      user.id,
      parsed.data.email,
      parsed.data.appPassword
    );
  } catch (error) {
    request.log.error(error, 'Failed to connect iCloud account');
    return reply.status(400).send({ error: 'Failed to connect iCloud account' });
  }
}

export async function patchConnectedCalendar(
  request: FastifyRequest<{
    Params: { connectedCalendarId: string };
    Body: {
      visible?: boolean;
      listedInSidebar?: boolean;
      color?: string | null;
      useForAvailability?: boolean;
    };
  }>,
  reply: FastifyReply
) {
  const user = request.user;
  if (!user) return reply.status(401).send({ error: 'Not authenticated' });

  const parsed = patchConnectedCalendarSchema.safeParse(request.body);
  if (!parsed.success) {
    return reply.status(400).send({ error: formatZodError(parsed.error) });
  }

  try {
    return await connectedAccountService.updateConnectedCalendar(
      user.id,
      request.params.connectedCalendarId,
      parsed.data
    );
  } catch (error) {
    request.log.error(error, 'Failed to update connected calendar');
    if (error instanceof Error && error.message === 'Connected calendar not found') {
      return reply.status(404).send({ error: error.message });
    }
    return reply.status(500).send({ error: 'Failed to update connected calendar' });
  }
}

export async function resyncConnectedAccount(
  request: FastifyRequest<{ Params: { connectedAccountId: string } }>,
  reply: FastifyReply
) {
  const user = request.user;
  if (!user) return reply.status(401).send({ error: 'Not authenticated' });

  try {
    return await connectedAccountService.resyncConnectedAccount(
      user.id,
      request.params.connectedAccountId
    );
  } catch (error) {
    request.log.error(error, 'Failed to resync connected account');
    if (error instanceof Error && error.message === 'Connected account not found') {
      return reply.status(404).send({ error: error.message });
    }
    if (
      error instanceof Error &&
      error.message === connectedAccountService.RESYNC_NOT_AVAILABLE_MESSAGE
    ) {
      return reply.status(400).send({ error: error.message });
    }
    return reply.status(500).send({ error: 'Failed to resync connected account' });
  }
}

export async function disconnectConnectedAccount(
  request: FastifyRequest<{ Params: { connectedAccountId: string } }>,
  reply: FastifyReply
) {
  const user = request.user;
  if (!user) return reply.status(401).send({ error: 'Not authenticated' });

  try {
    await connectedAccountService.disconnectConnectedAccount(
      user.id,
      request.params.connectedAccountId
    );
    return { success: true };
  } catch (error) {
    request.log.error(error, 'Failed to disconnect connected account');
    if (error instanceof Error && error.message === 'Connected account not found') {
      return reply.status(404).send({ error: error.message });
    }
    return reply.status(500).send({ error: 'Failed to disconnect connected account' });
  }
}
