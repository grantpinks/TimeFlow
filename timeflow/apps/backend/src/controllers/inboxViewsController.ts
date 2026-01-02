/**
 * Inbox Views Controller
 *
 * Handles API endpoints for managing inbox view configurations.
 */

import { FastifyReply, FastifyRequest } from 'fastify';
import { z } from 'zod';
import {
  DEFAULT_INBOX_VIEWS,
  type InboxView,
} from '../../../../packages/shared/src/types/email.js';
import { prisma } from '../config/prisma.js';
import { formatZodError } from '../utils/errorFormatter.js';
import type {} from '../types/context.js';

const viewSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  labelIds: z.array(z.string().min(1)).default([]),
  isBuiltin: z.boolean().optional(),
});

const updateViewsSchema = z.object({
  views: z.array(viewSchema),
});

const builtinViewIds = new Set(DEFAULT_INBOX_VIEWS.map((view) => view.id));

function normalizeInboxViews(raw: unknown): InboxView[] {
  const incoming = Array.isArray(raw)
    ? raw
        .map((entry) => {
          if (!entry || typeof entry !== 'object') return null;
          const view = entry as InboxView;
          if (!view.id || !view.name) return null;
          const labelIds = Array.isArray(view.labelIds)
            ? view.labelIds.filter((labelId) => typeof labelId === 'string' && labelId.length > 0)
            : [];
          return {
            id: view.id,
            name: view.name,
            labelIds,
            isBuiltin: Boolean(view.isBuiltin),
          } satisfies InboxView;
        })
        .filter((view): view is InboxView => Boolean(view))
    : [];

  const incomingMap = new Map(incoming.map((view) => [view.id, view]));

  const builtins = DEFAULT_INBOX_VIEWS.map((defaultView) => {
    const incomingView = incomingMap.get(defaultView.id);
    if (!incomingView || defaultView.id === 'all') {
      return { ...defaultView, isBuiltin: true };
    }
    return {
      ...defaultView,
      name: incomingView.name || defaultView.name,
      labelIds: incomingView.labelIds ?? defaultView.labelIds,
      isBuiltin: true,
    };
  });

  const customViews = incoming
    .filter((view) => !builtinViewIds.has(view.id))
    .map((view) => ({ ...view, isBuiltin: false }));

  return [...builtins, ...customViews];
}

/**
 * GET /api/inbox/views
 * Get inbox view configurations for the authenticated user.
 */
export async function getInboxViews(request: FastifyRequest, reply: FastifyReply) {
  const user = request.user;
  if (!user) {
    return reply.status(401).send({ error: 'Not authenticated' });
  }

  const record = await prisma.user.findUnique({
    where: { id: user.id },
    select: { inboxViews: true },
  });

  const views = normalizeInboxViews(record?.inboxViews ?? DEFAULT_INBOX_VIEWS);
  reply.send({ views });
}

/**
 * PUT /api/inbox/views
 * Update inbox view configurations for the authenticated user.
 */
export async function updateInboxViews(request: FastifyRequest, reply: FastifyReply) {
  const user = request.user;
  if (!user) {
    return reply.status(401).send({ error: 'Not authenticated' });
  }

  const validation = updateViewsSchema.safeParse(request.body);
  if (!validation.success) {
    return reply.status(400).send({
      error: 'Invalid input',
      details: formatZodError(validation.error),
    });
  }

  const normalized = normalizeInboxViews(validation.data.views);

  const updated = await prisma.user.update({
    where: { id: user.id },
    data: { inboxViews: normalized },
    select: { inboxViews: true },
  });

  reply.send({ views: normalizeInboxViews(updated.inboxViews ?? normalized) });
}

/**
 * DELETE /api/inbox/views/:id
 * Delete a custom inbox view for the authenticated user.
 */
export async function deleteInboxView(
  request: FastifyRequest<{ Params: { id: string } }>,
  reply: FastifyReply
) {
  const user = request.user;
  if (!user) {
    return reply.status(401).send({ error: 'Not authenticated' });
  }

  const { id } = request.params;

  const record = await prisma.user.findUnique({
    where: { id: user.id },
    select: { inboxViews: true },
  });

  const views = normalizeInboxViews(record?.inboxViews ?? DEFAULT_INBOX_VIEWS);
  const existing = views.find((view) => view.id === id);

  if (!existing) {
    return reply.status(404).send({ error: 'Inbox view not found' });
  }

  if (builtinViewIds.has(existing.id)) {
    return reply.status(400).send({ error: 'Built-in views cannot be deleted' });
  }

  const nextViews = views.filter((view) => view.id !== id);
  await prisma.user.update({
    where: { id: user.id },
    data: { inboxViews: nextViews },
  });

  reply.status(204).send();
}
