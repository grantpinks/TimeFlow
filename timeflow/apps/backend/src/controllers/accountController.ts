import { FastifyReply, FastifyRequest } from 'fastify';
import { env } from '../config/env.js';
import {
  ACCESS_COOKIE_NAME,
  REFRESH_COOKIE_NAME,
  buildClearCookieOptions,
} from '../utils/sessionCookies.js';
import { deleteUserAccount } from '../services/accountDeletionService.js';

/**
 * DELETE /api/user/account
 * Permanently deletes the authenticated user's account and all associated data.
 */
export async function deleteAccount(request: FastifyRequest, reply: FastifyReply) {
  const userId = request.user?.id;
  if (!userId) {
    return reply.status(401).send({ error: 'Unauthorized' });
  }

  try {
    await deleteUserAccount(userId, request.log);
  } catch (error) {
    request.log.error({ err: error, userId }, 'Account deletion failed');
    return reply.status(500).send({ error: 'Failed to delete account' });
  }

  const clearOpts = buildClearCookieOptions(env.NODE_ENV);
  reply.clearCookie(ACCESS_COOKIE_NAME, clearOpts);
  reply.clearCookie(REFRESH_COOKIE_NAME, clearOpts);

  return { success: true };
}
