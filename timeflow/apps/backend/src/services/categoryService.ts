import { prisma } from '../config/prisma.js';
import {
  EMAIL_CATEGORIES,
  type EmailCategoryConfig,
} from './emailCategorizationService.js';

/**
 * Default categories created for new users
 */
const DEFAULT_CATEGORIES = [
  { name: 'Professional', color: '#3B82F6', order: 0 },
  { name: 'Schoolwork', color: '#8B5CF6', order: 1 },
  { name: 'Personal', color: '#10B981', order: 2 },
  { name: 'Misc', color: '#6B7280', order: 3 },
];

/**
 * Ensure a user has default categories
 * Called on first login to seed default categories
 */
export async function ensureDefaultCategories(userId: string): Promise<void> {
  // Check if user has any categories
  const count = await prisma.category.count({ where: { userId } });

  if (count === 0) {
    // Create default categories
    await prisma.category.createMany({
      data: DEFAULT_CATEGORIES.map((cat) => ({
        ...cat,
        userId,
        isDefault: true,
      })),
    });
  }
}

/**
 * Get all categories for a user
 */
export async function getCategories(userId: string) {
  return prisma.category.findMany({
    where: { userId },
    orderBy: { order: 'asc' },
  });
}

/**
 * Get a single category by ID (with ownership check)
 */
export async function getCategoryById(categoryId: string, userId: string) {
  return prisma.category.findFirst({
    where: { id: categoryId, userId },
  });
}

/**
 * Create a new category
 */
export async function createCategory(
  userId: string,
  data: {
    name: string;
    color: string;
    order?: number;
  }
) {
  return prisma.category.create({
    data: {
      userId,
      name: data.name,
      color: data.color,
      order: data.order ?? 999,
      isDefault: false,
    },
  });
}

/**
 * Update an existing category
 */
export async function updateCategory(
  categoryId: string,
  userId: string,
  data: { name?: string; color?: string; order?: number }
) {
  // Verify ownership
  const category = await getCategoryById(categoryId, userId);
  if (!category) {
    throw new Error('Category not found');
  }

  return prisma.category.update({
    where: { id: categoryId },
    data,
  });
}

/**
 * Delete a category
 * Prevents deletion if tasks are assigned to this category
 */
export async function deleteCategory(categoryId: string, userId: string) {
  // Verify ownership
  const category = await getCategoryById(categoryId, userId);
  if (!category) {
    throw new Error('Category not found');
  }

  // Don't allow deleting if tasks exist with this category
  const taskCount = await prisma.task.count({
    where: { categoryId },
  });

  if (taskCount > 0) {
    throw new Error(
      'Cannot delete category with existing tasks. Reassign tasks first.'
    );
  }

  return prisma.category.delete({
    where: { id: categoryId },
  });
}

/**
 * Merge base email category config with user overrides.
 */
function mergeCategoryConfig(
  categoryId: string,
  overrides?: {
    color?: string | null;
    enabled?: boolean | null;
    name?: string | null;
    description?: string | null;
    emoji?: string | null;
    gmailSyncEnabled?: boolean | null;
    gmailLabelName?: string | null;
    gmailLabelColor?: string | null;
  }
): EmailCategoryConfig {
  const base = EMAIL_CATEGORIES[categoryId as keyof typeof EMAIL_CATEGORIES];
  if (!base) {
    throw new Error('Invalid category');
  }

  return {
    ...base,
    color: overrides?.color ?? base.color,
    enabled: overrides?.enabled ?? true,
    name: overrides?.name ?? base.name,
    description: overrides?.description ?? base.description,
    emoji: overrides?.emoji ?? base.emoji,
    gmailSyncEnabled: overrides?.gmailSyncEnabled ?? false,
    gmailLabelName: overrides?.gmailLabelName ?? undefined,
    gmailLabelColor: overrides?.gmailLabelColor ?? undefined,
  };
}

/**
 * Update (or create) user-specific email category configuration.
 */
export async function updateCategoryConfig(
  userId: string,
  categoryId: string,
  updates: Partial<EmailCategoryConfig>
) {
  // Validate category exists
  const base = EMAIL_CATEGORIES[categoryId as keyof typeof EMAIL_CATEGORIES];
  if (!base) {
    throw new Error('Category not found');
  }

  const data = {
    color: updates.color,
    enabled: updates.enabled,
    name: updates.name,
    description: updates.description,
    emoji: updates.emoji,
    gmailSyncEnabled: updates.gmailSyncEnabled,
    gmailLabelName: updates.gmailLabelName,
    gmailLabelColor: updates.gmailLabelColor,
  };

  const record = await prisma.emailCategoryConfig.upsert({
    where: {
      userId_categoryId: {
        userId,
        categoryId,
      },
    },
    create: {
      userId,
      categoryId,
      ...data,
    },
    update: data,
  });

  return mergeCategoryConfig(categoryId, record);
}

/**
 * Get all email category configs for a user, merged with defaults.
 */
export async function getEmailCategoryConfigsForUser(userId: string) {
  const overrides = await prisma.emailCategoryConfig.findMany({
    where: { userId },
  });

  return Object.values(EMAIL_CATEGORIES).map((category) => {
    const override = overrides.find((o) => o.categoryId === category.id);
    return mergeCategoryConfig(category.id, override || undefined);
  });
}
