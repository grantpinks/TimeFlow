/**
 * Identity Controller
 *
 * Handles HTTP requests for identity CRUD, migration, and progress endpoints.
 */

import { FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';
import { formatZodError } from '../utils/errorFormatter.js';
import * as identityService from '../services/identityService.js';

// ---------------------------------------------------------------------------
// Validation schemas
// ---------------------------------------------------------------------------

const HEX_COLOR_RE = /^#[0-9a-fA-F]{6}$/;

const createIdentitySchema = z.object({
  name: z.string().trim().min(1, 'Name is required').max(50, 'Name too long'),
  description: z.string().trim().max(200).optional(),
  color: z.string().regex(HEX_COLOR_RE, 'Color must be a valid hex color (e.g. #0d9488)'),
  icon: z.string().min(1, 'Icon is required').max(8, 'Icon must be a single emoji'),
});

const updateIdentitySchema = z.object({
  name: z.string().trim().min(1).max(50).optional(),
  description: z.string().trim().max(200).optional().nullable(),
  color: z.string().regex(HEX_COLOR_RE).optional(),
  icon: z.string().min(1).max(8).optional(),
  isActive: z.boolean().optional(),
});

const reorderSchema = z.object({
  identityIds: z.array(z.string().cuid()).min(1),
});

// ---------------------------------------------------------------------------
// Handlers
// ---------------------------------------------------------------------------

export async function listIdentities(request: FastifyRequest, reply: FastifyReply) {
  const userId = (request.user as any).userId;
  const identities = await identityService.getIdentities(userId);
  return reply.send(identities);
}

export async function getIdentity(
  request: FastifyRequest<{ Params: { id: string } }>,
  reply: FastifyReply
) {
  const userId = (request.user as any).userId;
  const identity = await identityService.getIdentityById(request.params.id, userId);
  if (!identity) return reply.status(404).send({ error: 'Identity not found' });
  return reply.send(identity);
}

export async function createIdentity(request: FastifyRequest, reply: FastifyReply) {
  const userId = (request.user as any).userId;

  const parsed = createIdentitySchema.safeParse(request.body);
  if (!parsed.success) {
    return reply.status(400).send({ error: formatZodError(parsed.error) });
  }

  try {
    const { name, description, color, icon } = parsed.data;
    const identity = await identityService.createIdentity({ userId, name, description, color, icon });
    return reply.status(201).send(identity);
  } catch (err: any) {
    if (err.message === 'IDENTITY_LIMIT_REACHED') {
      return reply.status(403).send({
        error: 'You have reached the maximum of 5 identities. Delete one to create another.',
      });
    }
    if (err.code === 'P2002') {
      return reply.status(409).send({ error: 'You already have an identity with that name.' });
    }
    throw err;
  }
}

export async function updateIdentity(
  request: FastifyRequest<{ Params: { id: string } }>,
  reply: FastifyReply
) {
  const userId = (request.user as any).userId;

  const parsed = updateIdentitySchema.safeParse(request.body);
  if (!parsed.success) {
    return reply.status(400).send({ error: formatZodError(parsed.error) });
  }

  try {
    const identity = await identityService.updateIdentity(
      request.params.id,
      userId,
      parsed.data as any
    );
    if (!identity) return reply.status(404).send({ error: 'Identity not found' });
    return reply.send(identity);
  } catch (err: any) {
    if (err.message === 'DUPLICATE_NAME') {
      return reply.status(409).send({ error: 'You already have an identity with that name.' });
    }
    throw err;
  }
}

export async function deleteIdentity(
  request: FastifyRequest<{ Params: { id: string } }>,
  reply: FastifyReply
) {
  const userId = (request.user as any).userId;
  const result = await identityService.deleteIdentity(request.params.id, userId);
  if (!result) return reply.status(404).send({ error: 'Identity not found' });
  return reply.send({ success: true });
}

export async function reorderIdentities(request: FastifyRequest, reply: FastifyReply) {
  const userId = (request.user as any).userId;

  const parsed = reorderSchema.safeParse(request.body);
  if (!parsed.success) {
    return reply.status(400).send({ error: formatZodError(parsed.error) });
  }

  try {
    const identities = await identityService.reorderIdentities(userId, parsed.data.identityIds);
    return reply.send(identities);
  } catch (err: any) {
    if (err.message === 'INVALID_IDS') {
      return reply.status(400).send({ error: 'One or more identity IDs are invalid.' });
    }
    throw err;
  }
}

export async function getMigrationStatus(request: FastifyRequest, reply: FastifyReply) {
  const userId = (request.user as any).userId;
  const needsMigration = await identityService.checkMigrationNeeded(userId);
  return reply.send({ needsMigration });
}

export async function runMigration(request: FastifyRequest, reply: FastifyReply) {
  const userId = (request.user as any).userId;
  await identityService.migrateHabitIdentities(userId);
  const identities = await identityService.getIdentities(userId);
  return reply.send({ success: true, identities });
}

export async function getProgress(
  request: FastifyRequest<{ Querystring: { date?: string } }>,
  reply: FastifyReply
) {
  const userId = (request.user as any).userId;
  // Default to today in ISO format
  const date = request.query.date ?? new Date().toISOString().split('T')[0];

  // Basic date validation
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return reply.status(400).send({ error: 'date must be in YYYY-MM-DD format' });
  }

  const progress = await identityService.getIdentityProgress(userId, date);
  return reply.send(progress);
}
