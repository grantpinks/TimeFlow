/**
 * Categories Management Page
 *
 * Allows users to create, edit, and delete task categories.
 */

'use client';

import { useState } from 'react';
import { Layout } from '@/components/Layout';
import { useCategories } from '@/hooks/useCategories';
import ColorPicker from '@/components/ColorPicker';
import { CategoryTrainingPanel } from '@/components/CategoryTrainingPanel';
import type { Category } from '@timeflow/shared';

export default function CategoriesPage() {
  const { categories, loading, createCategory, updateCategory, deleteCategory } = useCategories();
  const [editing, setEditing] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editColor, setEditColor] = useState('#3B82F6');

  const [showAdd, setShowAdd] = useState(false);
  const [newName, setNewName] = useState('');
  const [newColor, setNewColor] = useState('#3B82F6');
  const [addError, setAddError] = useState('');
  const [editError, setEditError] = useState('');
  const [trainingCategoryId, setTrainingCategoryId] = useState<string | null>(null);

  const activeTrainingCategory = trainingCategoryId
    ? categories.find((category) => category.id === trainingCategoryId)
    : null;

  const handleEdit = (category: Category) => {
    setEditing(category.id);
    setEditName(category.name);
    setEditColor(category.color);
    setEditError('');
  };

  const handleSaveEdit = async () => {
    if (!editing) return;
    if (!editName.trim()) {
      setEditError('Category name is required');
      return;
    }

    try {
      await updateCategory(editing, { name: editName.trim(), color: editColor });
      setEditing(null);
      setEditError('');
    } catch (err) {
      setEditError(err instanceof Error ? err.message : 'Failed to update category');
    }
  };

  const handleAdd = async () => {
    if (!newName.trim()) {
      setAddError('Category name is required');
      return;
    }

    try {
      await createCategory({ name: newName.trim(), color: newColor });
      setNewName('');
      setNewColor('#3B82F6');
      setShowAdd(false);
      setAddError('');
    } catch (err) {
      setAddError(err instanceof Error ? err.message : 'Failed to create category');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this category? This cannot be undone.')) {
      return;
    }

    try {
      await deleteCategory(id);
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to delete category');
    }
  };

  if (loading) {
    return (
      <Layout>
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="max-w-4xl mx-auto">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-3xl font-bold text-slate-900">Categories</h1>
            <p className="text-slate-600 mt-1">Organize your tasks with color-coded categories</p>
          </div>
          <button
            onClick={() => setShowAdd(true)}
            className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
          >
            Add Category
          </button>
        </div>

        <div className="space-y-3">
          {categories.map((category) => (
            <div
              key={category.id}
              className="bg-white p-4 rounded-lg border border-slate-200 flex items-center justify-between"
            >
              {editing === category.id ? (
                <div className="flex-1 space-y-3">
                  <div className="flex items-center gap-4">
                    <input
                      type="text"
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      className="px-3 py-2 border border-slate-300 rounded flex-1"
                      placeholder="Category name"
                    />
                  </div>
                  <ColorPicker value={editColor} onChange={setEditColor} />
                  {editError && (
                    <p className="text-sm text-red-600">{editError}</p>
                  )}
                  <div className="flex gap-2">
                    <button
                      onClick={handleSaveEdit}
                      className="px-4 py-2 bg-primary-600 text-white rounded hover:bg-primary-700 transition-colors"
                    >
                      Save
                    </button>
                    <button
                      onClick={() => {
                        setEditing(null);
                        setEditError('');
                      }}
                      className="px-4 py-2 bg-slate-200 text-slate-700 rounded hover:bg-slate-300 transition-colors"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  <div className="flex items-center gap-3">
                    <div
                      className="w-6 h-6 rounded"
                      style={{ backgroundColor: category.color }}
                    />
                    <span className="font-medium">{category.name}</span>
                    {category.isDefault && (
                      <span className="text-xs text-slate-500">(default)</span>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleEdit(category)}
                      className="px-3 py-1 text-sm text-primary-600 hover:bg-primary-50 rounded transition-colors"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => setTrainingCategoryId(category.id)}
                      className="px-3 py-1 text-sm text-slate-600 hover:bg-slate-100 rounded transition-colors"
                    >
                      Train
                    </button>
                    {!category.isDefault && (
                      <button
                        onClick={() => handleDelete(category.id)}
                        className="px-3 py-1 text-sm text-red-600 hover:bg-red-50 rounded transition-colors"
                      >
                        Delete
                      </button>
                    )}
                  </div>
                </>
              )}
            </div>
          ))}
        </div>

        {showAdd && (
          <div className="mt-4 bg-slate-50 p-4 rounded-lg border border-slate-200">
            <h3 className="font-medium mb-3">Add New Category</h3>
            <div className="space-y-3">
              <input
                type="text"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="Category name"
                className="w-full px-3 py-2 border border-slate-300 rounded"
              />
              <ColorPicker value={newColor} onChange={setNewColor} />
              {addError && (
                <p className="text-sm text-red-600">{addError}</p>
              )}
              <div className="flex gap-2">
                <button
                  onClick={handleAdd}
                  disabled={!newName.trim()}
                  className="px-4 py-2 bg-primary-600 text-white rounded disabled:bg-slate-300 disabled:cursor-not-allowed hover:bg-primary-700 transition-colors"
                >
                  Add
                </button>
                <button
                  onClick={() => {
                    setShowAdd(false);
                    setNewName('');
                    setNewColor('#3B82F6');
                    setAddError('');
                  }}
                  className="px-4 py-2 bg-slate-200 text-slate-700 rounded hover:bg-slate-300 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}

        {activeTrainingCategory && (
          <div className="mt-6">
            <CategoryTrainingPanel
              categoryId={activeTrainingCategory.id}
              categoryName={activeTrainingCategory.name}
              onClose={() => setTrainingCategoryId(null)}
            />
          </div>
        )}

        {categories.length === 0 && (
          <div className="text-center text-slate-500 py-8">
            No categories yet. Add one above to get started!
          </div>
        )}
      </div>
    </Layout>
  );
}
