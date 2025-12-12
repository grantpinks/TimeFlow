/**
 * useCategories Hook
 *
 * Manages category state and provides CRUD operations.
 */

'use client';

import { useState, useEffect } from 'react';
import * as api from '@/lib/api';
import type { Category, CreateCategoryRequest, UpdateCategoryRequest } from '@timeflow/shared';

export function useCategories() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchCategories = async () => {
    try {
      setLoading(true);
      const data = await api.getCategories();
      setCategories(data);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load categories');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCategories();
  }, []);

  const createCategory = async (data: CreateCategoryRequest) => {
    const category = await api.createCategory(data);
    setCategories((prev) => [...prev, category]);
    return category;
  };

  const updateCategory = async (id: string, data: UpdateCategoryRequest) => {
    const updated = await api.updateCategory(id, data);
    setCategories((prev) => prev.map((c) => (c.id === id ? updated : c)));
    return updated;
  };

  const deleteCategory = async (id: string) => {
    await api.deleteCategory(id);
    setCategories((prev) => prev.filter((c) => c.id !== id));
  };

  return {
    categories,
    loading,
    error,
    refetch: fetchCategories,
    createCategory,
    updateCategory,
    deleteCategory,
  };
}
