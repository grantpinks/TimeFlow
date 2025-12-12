import { FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';
import * as categoryService from '../services/categoryService.js';

/**
 * Validation schema for creating a category
 */
const createCategorySchema = z.object({
  name: z.string().trim().min(1, 'Name is required').max(50, 'Name too long'),
  color: z
    .string()
    .regex(/^#[0-9A-Fa-f]{6}$/, 'Invalid hex color format (e.g., #3B82F6)'),
  order: z.number().int().min(0).optional(),
});

/**
 * Validation schema for updating a category
 */
const updateCategorySchema = z.object({
  name: z.string().trim().min(1).max(50).optional(),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/, 'Invalid hex color format').optional(),
  order: z.number().int().min(0).optional(),
});

/**
 * GET /api/categories
 * Get all categories for the authenticated user
 */
export async function getCategories(
  req: FastifyRequest,
  reply: FastifyReply
) {
  const userId = req.user?.id;
  if (!userId) {
    return reply.code(401).send({ error: 'Unauthorized' });
  }

  const categories = await categoryService.getCategories(userId);
  return reply.send(categories);
}

/**
 * POST /api/categories
 * Create a new category
 */
export async function createCategory(
  req: FastifyRequest,
  reply: FastifyReply
) {
  const userId = req.user?.id;
  if (!userId) {
    return reply.code(401).send({ error: 'Unauthorized' });
  }

  const result = createCategorySchema.safeParse(req.body);
  if (!result.success) {
    return reply.code(400).send({
      error: 'Validation failed',
      details: result.error.format(),
    });
  }

  try {
    const category = await categoryService.createCategory(userId, result.data);
    return reply.code(201).send(category);
  } catch (error) {
    if (error instanceof Error && error.message.includes('Unique constraint')) {
      return reply.code(409).send({
        error: 'A category with this name already exists',
      });
    }
    throw error;
  }
}

/**
 * PATCH /api/categories/:id
 * Update an existing category
 */
export async function updateCategory(
  req: FastifyRequest,
  reply: FastifyReply
) {
  const userId = req.user?.id;
  if (!userId) {
    return reply.code(401).send({ error: 'Unauthorized' });
  }

  const { id } = req.params as { id: string };

  const result = updateCategorySchema.safeParse(req.body);
  if (!result.success) {
    return reply.code(400).send({
      error: 'Validation failed',
      details: result.error.format(),
    });
  }

  try {
    const category = await categoryService.updateCategory(
      id,
      userId,
      result.data
    );
    return reply.send(category);
  } catch (error) {
    if (error instanceof Error && error.message === 'Category not found') {
      return reply.code(404).send({ error: 'Category not found' });
    }
    if (error instanceof Error && error.message.includes('Unique constraint')) {
      return reply.code(409).send({
        error: 'A category with this name already exists',
      });
    }
    throw error;
  }
}

/**
 * DELETE /api/categories/:id
 * Delete a category
 */
export async function deleteCategory(
  req: FastifyRequest,
  reply: FastifyReply
) {
  const userId = req.user?.id;
  if (!userId) {
    return reply.code(401).send({ error: 'Unauthorized' });
  }

  const { id } = req.params as { id: string };

  try {
    await categoryService.deleteCategory(id, userId);
    return reply.code(204).send();
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === 'Category not found') {
        return reply.code(404).send({ error: 'Category not found' });
      }
      if (error.message.includes('Cannot delete category')) {
        return reply.code(400).send({ error: error.message });
      }
    }
    throw error;
  }
}
