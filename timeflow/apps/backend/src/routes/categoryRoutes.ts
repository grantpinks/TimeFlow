/**
 * Category Routes
 *
 * Registers category CRUD endpoints.
 */

import { FastifyInstance } from 'fastify';
import * as categoryController from '../controllers/categoryController.js';
import { requireAuth } from '../middlewares/auth.js';

export async function registerCategoryRoutes(server: FastifyInstance) {
  // GET /api/categories - List all categories for user
  server.get(
    '/categories',
    { preHandler: requireAuth },
    categoryController.getCategories
  );

  // POST /api/categories - Create a new category
  server.post(
    '/categories',
    { preHandler: requireAuth },
    categoryController.createCategory
  );

  // PATCH /api/categories/:id - Update a category
  server.patch(
    '/categories/:id',
    { preHandler: requireAuth },
    categoryController.updateCategory
  );

  // DELETE /api/categories/:id - Delete a category
  server.delete(
    '/categories/:id',
    { preHandler: requireAuth },
    categoryController.deleteCategory
  );
}
