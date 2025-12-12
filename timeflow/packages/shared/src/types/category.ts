/**
 * Category types for task categorization
 */

export interface Category {
  id: string;
  userId: string;
  name: string;
  color: string; // hex code, e.g., "#3B82F6"
  isDefault: boolean;
  order: number;
  createdAt: string;
  updatedAt: string;
}

export interface CreateCategoryRequest {
  name: string;
  color: string;
  order?: number;
}

export interface UpdateCategoryRequest {
  name?: string;
  color?: string;
  order?: number;
}
