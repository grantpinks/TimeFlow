'use client';

import { useState, useEffect } from 'react';
import { Layout } from '@/components/Layout';
import ColorPicker from '@/components/ColorPicker';
import GmailColorPicker, { type GmailColor } from '@/components/GmailColorPicker';
import * as api from '@/lib/api';
import type { EmailCategoryConfig } from '@/lib/api';
import { track } from '@/lib/analytics';

const GMAIL_COLORS: GmailColor[] = [
  { backgroundColor: '#cfe2f3', textColor: '#0b5394' },
  { backgroundColor: '#d9ead3', textColor: '#38761d' },
  { backgroundColor: '#fff2cc', textColor: '#7f6000' },
  { backgroundColor: '#fce5cd', textColor: '#b45f06' },
  { backgroundColor: '#f4cccc', textColor: '#990000' },
  { backgroundColor: '#d9d2e9', textColor: '#674ea7' },
  { backgroundColor: '#d0e0e3', textColor: '#0c343d' },
  { backgroundColor: '#ead1dc', textColor: '#783f04' },
  { backgroundColor: '#c9daf8', textColor: '#1155cc' },
  { backgroundColor: '#b6d7a8', textColor: '#274e13' },
  { backgroundColor: '#ffe599', textColor: '#bf9000' },
  { backgroundColor: '#f9cb9c', textColor: '#b45f06' },
  { backgroundColor: '#ea9999', textColor: '#990000' },
  { backgroundColor: '#b4a7d6', textColor: '#351c75' },
  { backgroundColor: '#a2c4c9', textColor: '#0c343d' },
  { backgroundColor: '#d5a6bd', textColor: '#783f04' },
  { backgroundColor: '#9fc5e8', textColor: '#0b5394' },
  { backgroundColor: '#93c47d', textColor: '#38761d' },
  { backgroundColor: '#ffd966', textColor: '#7f6000' },
  { backgroundColor: '#f6b26b', textColor: '#b45f06' },
  { backgroundColor: '#e06666', textColor: '#990000' },
  { backgroundColor: '#8e7cc3', textColor: '#351c75' },
  { backgroundColor: '#76a5af', textColor: '#0c343d' },
  { backgroundColor: '#c27ba0', textColor: '#783f04' },
  { backgroundColor: '#a4c2f4', textColor: '#0b5394' },
];

function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result
    ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16),
      }
    : null;
}

function colorDistance(
  rgb1: { r: number; g: number; b: number },
  rgb2: { r: number; g: number; b: number }
): number {
  return Math.sqrt(
    Math.pow(rgb1.r - rgb2.r, 2) +
      Math.pow(rgb1.g - rgb2.g, 2) +
      Math.pow(rgb1.b - rgb2.b, 2)
  );
}

function findClosestGmailColor(hexColor: string): GmailColor {
  const inputRgb = hexToRgb(hexColor);
  if (!inputRgb) {
    return GMAIL_COLORS[0];
  }

  let closest = GMAIL_COLORS[0];
  let minDistance = Infinity;

  for (const gmailColor of GMAIL_COLORS) {
    const gmailRgb = hexToRgb(gmailColor.backgroundColor);
    if (!gmailRgb) continue;
    const distance = colorDistance(inputRgb, gmailRgb);
    if (distance < minDistance) {
      minDistance = distance;
      closest = gmailColor;
    }
  }

  return closest;
}

export default function EmailCategoriesSettingsPage() {
  const [categories, setCategories] = useState<EmailCategoryConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [editingCategory, setEditingCategory] = useState<string | null>(null);
  const [gmailColorOverride, setGmailColorOverride] = useState<string | null>(null);
  const [autoMappedGmailColor, setAutoMappedGmailColor] = useState<GmailColor | null>(null);

  useEffect(() => {
    loadCategories();
  }, []);

  useEffect(() => {
    if (!editingCategory) {
      setGmailColorOverride(null);
      setAutoMappedGmailColor(null);
      return;
    }

    const category = categories.find((cat) => cat.id === editingCategory);
    if (category?.color) {
      const mapped = findClosestGmailColor(category.color);
      setAutoMappedGmailColor(mapped);
      setGmailColorOverride(category.color);
    }
  }, [editingCategory, categories]);

  async function loadCategories() {
    try {
      const { categories: cats } = await api.getEmailCategories();
      setCategories(cats);
    } catch (err) {
      console.error('Failed to load categories:', err);
      setError('Failed to load email categories');
    } finally {
      setLoading(false);
    }
  }

  async function handleUpdateCategory(categoryId: string, updates: Partial<EmailCategoryConfig>) {
    setSaving(true);
    setError(null);
    setSuccessMessage(null);

    try {
      await api.updateEmailCategory(categoryId, updates);

      setCategories((prev) =>
        prev.map((cat) => (cat.id === categoryId ? { ...cat, ...updates } : cat))
      );

      setSuccessMessage('Category updated successfully');
      track('category_edited', { category_id: categoryId });

      setTimeout(() => setSuccessMessage(null), 3000);
      setEditingCategory(null);
    } catch (err) {
      console.error('Failed to update category:', err);
      setError('Failed to update category');
    } finally {
      setSaving(false);
    }
  }

  async function handleToggleEnabled(categoryId: string, enabled: boolean) {
    await handleUpdateCategory(categoryId, { enabled });
  }

  async function handleToggleGmailSync(categoryId: string, enabled: boolean) {
    setSaving(true);
    setError(null);
    setSuccessMessage(null);

    try {
      await api.updateCategoryGmailSync(categoryId, enabled);
      setCategories((prev) =>
        prev.map((cat) => (cat.id === categoryId ? { ...cat, gmailSyncEnabled: enabled } : cat))
      );
      setSuccessMessage('Gmail sync updated');
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err) {
      console.error('Failed to update Gmail sync:', err);
      setError('Failed to update Gmail sync');
    } finally {
      setSaving(false);
    }
  }

  async function handleResetToDefaults() {
    if (!confirm('Are you sure you want to reset all categories to default settings? This cannot be undone.')) {
      return;
    }

    setSaving(true);
    setError(null);

    try {
      // Reset all categories to default colors and enabled state
      const defaultColors: Record<string, string> = {
        Personal: '#3B82F6',
        Work: '#8B5CF6',
        Promotion: '#F59E0B',
        Shopping: '#EC4899',
        Social: '#14B8A6',
        Finance: '#06B6D4',
        Travel: '#10B981',
        Newsletter: '#6366F1',
        Updates: '#84CC16',
        Other: '#64748B',
      };

      const updates = categories.map((cat) =>
        api.updateEmailCategory(cat.id, {
          color: defaultColors[cat.name] || cat.color,
          enabled: true,
        })
      );

      await Promise.all(updates);
      await loadCategories();

      setSuccessMessage('All categories reset to defaults');
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err) {
      console.error('Failed to reset categories:', err);
      setError('Failed to reset categories');
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-slate-900 mb-2">Email Categories</h1>
          <p className="text-slate-600">
            Customize how your emails are categorized and displayed
          </p>
        </div>

        {/* Status messages */}
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-800">
            {error}
          </div>
        )}
        {successMessage && (
          <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg text-green-800 flex items-center justify-between">
            <span>{successMessage}</span>
            <button
              onClick={() => setSuccessMessage(null)}
              className="text-green-600 hover:text-green-800"
            >
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                <path
                  fillRule="evenodd"
                  d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                  clipRule="evenodd"
                />
              </svg>
            </button>
          </div>
        )}

        {/* Categories list */}
        <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
          <div className="divide-y divide-slate-200">
            {categories.map((category) => (
              <div key={category.id} className="p-6 hover:bg-slate-50 transition-colors">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4 flex-1">
                    {/* Category indicator */}
                    <div
                      className="w-12 h-12 rounded-lg flex items-center justify-center text-white text-xl font-semibold"
                      style={{ backgroundColor: category.color }}
                    >
                      {category.emoji || category.name[0]}
                    </div>

                    {/* Category info */}
                    <div className="flex-1">
                      <div className="flex items-center gap-3">
                        <h3 className="text-lg font-semibold text-slate-900">
                          {category.name}
                        </h3>
                        {!category.enabled && (
                          <span className="px-2 py-0.5 text-xs font-medium bg-slate-100 text-slate-600 rounded-full">
                            Disabled
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-slate-600 mt-1">
                        {category.description || 'No description'}
                      </p>

                      {/* Color customization */}
                      {editingCategory === category.id && (
                        <div className="mt-4 space-y-4">
                          <div className="flex items-center gap-3">
                            <ColorPicker
                              value={category.color}
                              onChange={(color) => handleUpdateCategory(category.id, { color })}
                            />
                            <button
                              onClick={() => setEditingCategory(null)}
                              className="text-sm text-slate-600 hover:text-slate-900"
                            >
                              Done
                            </button>
                          </div>

                          {category.gmailSyncEnabled && (
                            <div>
                              <h4 className="text-sm font-semibold text-slate-700 mb-3">
                                Gmail Label Color
                              </h4>
                              <GmailColorPicker
                                selectedColor={gmailColorOverride}
                                autoMappedColor={autoMappedGmailColor ?? undefined}
                                onColorSelect={(color) => {
                                  setGmailColorOverride(color.backgroundColor);
                                  handleUpdateCategory(category.id, { color: color.backgroundColor });
                                }}
                              />
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-3">
                    <label className="flex items-center gap-2 text-sm text-slate-600">
                      <input
                        type="checkbox"
                        checked={category.gmailSyncEnabled ?? false}
                        onChange={(e) => handleToggleGmailSync(category.id, e.target.checked)}
                        className="h-4 w-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
                        disabled={saving}
                      />
                      Sync to Gmail
                    </label>

                    {editingCategory !== category.id && (
                      <button
                        onClick={() => setEditingCategory(category.id)}
                        className="px-3 py-1.5 text-sm font-medium text-slate-700 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors"
                        disabled={saving}
                      >
                        Edit Color
                      </button>
                    )}

                    <button
                      onClick={() => handleToggleEnabled(category.id, !category.enabled)}
                      disabled={saving}
                      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 ${
                        category.enabled ? 'bg-primary-600' : 'bg-slate-200'
                      }`}
                    >
                      <span
                        className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                          category.enabled ? 'translate-x-6' : 'translate-x-1'
                        }`}
                      />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Reset button */}
        <div className="mt-6 flex justify-end">
          <button
            onClick={handleResetToDefaults}
            disabled={saving}
            className="px-4 py-2 text-sm font-medium text-slate-700 hover:text-slate-900 hover:bg-slate-100 border border-slate-300 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Reset to Defaults
          </button>
        </div>

        {/* Info section */}
        <div className="mt-8 p-6 bg-blue-50 border border-blue-200 rounded-lg">
          <h3 className="text-sm font-semibold text-blue-900 mb-2 flex items-center gap-2">
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
              <path
                fillRule="evenodd"
                d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
                clipRule="evenodd"
              />
            </svg>
            About Email Categories
          </h3>
          <ul className="text-sm text-blue-800 space-y-1">
            <li>• Categories are automatically assigned to incoming emails using AI</li>
            <li>• Disabled categories won&apos;t appear in the filter pills on the Today page</li>
            <li>• Category colors help you quickly identify different types of emails</li>
            <li>• Reset to defaults will restore the original colors and enable all categories</li>
          </ul>
        </div>
      </div>
    </Layout>
  );
}
