/**
 * Identity Controller
 *
 * Handles HTTP requests for identity CRUD, migration, and progress endpoints.
 */

import { FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';
import { formatZodError } from '../utils/errorFormatter.js';
import * as identityService from '../services/identityService.js';
import { getEvolutionState as getEvolutionStateService } from '../services/identityEvolutionService.js';
import { prisma } from '../config/prisma.js';
import { UNLOCK_CATALOG } from '../config/identityUnlockCatalog.js';

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

const flowCustomizationSchema = z.object({
  selectedStageVariant: z.string().optional(),
  selectedPalette: z.string().optional(),
  selectedEmote: z.string().optional(),
  selectedAnimationPack: z.string().optional(),
});

// ---------------------------------------------------------------------------
// Handlers
// ---------------------------------------------------------------------------

export async function listIdentities(request: FastifyRequest, reply: FastifyReply) {
  const userId = (request.user as any).id;
  const identities = await identityService.getIdentities(userId);
  return reply.send(identities);
}

export async function getIdentity(
  request: FastifyRequest<{ Params: { id: string } }>,
  reply: FastifyReply
) {
  const userId = (request.user as any).id;
  const identity = await identityService.getIdentityById(request.params.id, userId);
  if (!identity) return reply.status(404).send({ error: 'Identity not found' });
  return reply.send(identity);
}

export async function createIdentity(request: FastifyRequest, reply: FastifyReply) {
  const userId = (request.user as any).id;

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
  const userId = (request.user as any).id;

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
  const userId = (request.user as any).id;
  const result = await identityService.deleteIdentity(request.params.id, userId);
  if (!result) return reply.status(404).send({ error: 'Identity not found' });
  return reply.send({ success: true });
}

export async function reorderIdentities(request: FastifyRequest, reply: FastifyReply) {
  const userId = (request.user as any).id;

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
  const userId = (request.user as any).id;
  const needsMigration = await identityService.checkMigrationNeeded(userId);
  return reply.send({ needsMigration });
}

export async function runMigration(request: FastifyRequest, reply: FastifyReply) {
  const userId = (request.user as any).id;
  await identityService.migrateHabitIdentities(userId);
  const identities = await identityService.getIdentities(userId);
  return reply.send({ success: true, identities });
}

export async function getProgress(
  request: FastifyRequest<{ Querystring: { date?: string } }>,
  reply: FastifyReply
) {
  const userId = (request.user as any).id;
  // Default to today in ISO format
  const date = request.query.date ?? new Date().toISOString().split('T')[0];

  // Basic date validation
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return reply.status(400).send({ error: 'date must be in YYYY-MM-DD format' });
  }

  const progress = await identityService.getIdentityProgress(userId, date);
  return reply.send(progress);
}

// ---------------------------------------------------------------------------
// Identity Evolution endpoints (feature-flagged)
// ---------------------------------------------------------------------------

async function requireEvolutionEnabled(userId: string, reply: FastifyReply): Promise<boolean> {
  const user = await prisma.user.findFirst({
    where: { id: userId },
    select: { identityEvolutionEnabled: true },
  });
  if (!user?.identityEvolutionEnabled) {
    reply.status(403).send({ error: 'Identity evolution not enabled for this account.' });
    return false;
  }
  return true;
}

export async function getEvolutionState(request: FastifyRequest, reply: FastifyReply) {
  const userId = (request.user as any).id;
  if (!(await requireEvolutionEnabled(userId, reply))) return;

  const identities = await prisma.identity.findMany({
    where: { userId },
    select: { id: true },
  });

  const states = await Promise.all(
    identities.map((identity) => getEvolutionStateService(userId, identity.id))
  );
  return reply.send(states);
}

export async function getFlowCustomization(request: FastifyRequest, reply: FastifyReply) {
  const userId = (request.user as any).id;

  const customization = await prisma.userFlowCustomization.findUnique({ where: { userId } });

  if (!customization) {
    const defaults = {
      selectedStageVariant: 'default',
      selectedPalette: 'default',
      selectedEmote: 'default',
      selectedAnimationPack: 'default',
    };
    return reply.send(defaults);
  }

  return reply.send(customization);
}

export async function updateFlowCustomization(
  request: FastifyRequest<{ Params: { id: string } }>,
  reply: FastifyReply
) {
  const userId = (request.user as any).id;
  if (!(await requireEvolutionEnabled(userId, reply))) return;

  const parsed = flowCustomizationSchema.safeParse(request.body);
  if (!parsed.success) {
    return reply.status(400).send({ error: formatZodError(parsed.error) });
  }

  const updated = await prisma.userFlowCustomization.upsert({
    where: { userId },
    create: {
      userId,
      selectedStageVariant: parsed.data.selectedStageVariant ?? 'default',
      selectedPalette: parsed.data.selectedPalette ?? 'default',
      selectedEmote: parsed.data.selectedEmote ?? 'default',
      selectedAnimationPack: parsed.data.selectedAnimationPack ?? 'default',
    },
    update: {
      ...(parsed.data.selectedStageVariant !== undefined && {
        selectedStageVariant: parsed.data.selectedStageVariant,
      }),
      ...(parsed.data.selectedPalette !== undefined && {
        selectedPalette: parsed.data.selectedPalette,
      }),
      ...(parsed.data.selectedEmote !== undefined && {
        selectedEmote: parsed.data.selectedEmote,
      }),
      ...(parsed.data.selectedAnimationPack !== undefined && {
        selectedAnimationPack: parsed.data.selectedAnimationPack,
      }),
    },
  });

  return reply.send(updated);
}

export async function getIdentityUnlocks(
  request: FastifyRequest<{ Params: { id: string } }>,
  reply: FastifyReply
) {
  const userId = (request.user as any).id;
  if (!(await requireEvolutionEnabled(userId, reply))) return;

  const identityId = request.params.id;

  const unlockRows = await prisma.identityUnlock.findMany({
    where: { identityId, userId },
    orderBy: { grantedAt: 'asc' },
  });

  const catalogMap = new Map(UNLOCK_CATALOG.map((e) => [e.unlockKey, e]));

  const unlocks = unlockRows.map((row) => {
    const catalog = catalogMap.get(row.unlockKey);
    return {
      unlockKey: row.unlockKey,
      unlockType: row.unlockType,
      grantedAt: row.grantedAt.toISOString(),
      displayName: catalog?.displayName ?? row.unlockKey,
      description: catalog?.description ?? '',
    };
  });

  return reply.send({ unlocks });
}
