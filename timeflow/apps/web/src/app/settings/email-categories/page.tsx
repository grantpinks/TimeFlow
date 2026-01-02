'use client';

import { useState, useEffect, useRef } from 'react';
import { Layout } from '@/components/Layout';
import ColorPicker from '@/components/ColorPicker';
import GmailColorPicker, { type GmailColor } from '@/components/GmailColorPicker';
import * as api from '@/lib/api';
import type { EmailCategoryConfig } from '@/lib/api';
import { track } from '@/lib/analytics';

const GMAIL_BACKGROUND_COLORS = [
  '#e7e7e7',
  '#b6cff5',
  '#98d7e4',
  '#e3d7ff',
  '#fbd3e0',
  '#f2b2a8',
  '#c2c2c2',
  '#4986e7',
  '#2da2bb',
  '#b99aff',
  '#f691b2',
  '#fb4c2f',
  '#ffc8af',
  '#ffdeb5',
  '#fbe983',
  '#fdedc1',
  '#b3efd3',
  '#a2dcc1',
  '#ff7537',
  '#ffad46',
  '#ebdbde',
  '#cca6ac',
  '#42d692',
  '#16a765',
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

function getReadableTextColor(backgroundColor: string): string {
  const rgb = hexToRgb(backgroundColor);
  if (!rgb) return '#000000';
  const luminance = (0.299 * rgb.r + 0.587 * rgb.g + 0.114 * rgb.b) / 255;
  return luminance > 0.6 ? '#000000' : '#ffffff';
}

const GMAIL_COLORS: GmailColor[] = GMAIL_BACKGROUND_COLORS.map((backgroundColor) => ({
  backgroundColor,
  textColor: getReadableTextColor(backgroundColor),
}));

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
  const [gmailLabelNameInput, setGmailLabelNameInput] = useState<string>('');
  const [gmailSyncStatus, setGmailSyncStatus] = useState<api.GmailSyncStatus | null>(null);
  const [syncing, setSyncing] = useState(false);
  const [syncInProgress, setSyncInProgress] = useState(false);
  const [syncPolling, setSyncPolling] = useState(false);
  const [syncStartTime, setSyncStartTime] = useState<number | null>(null);
  const [syncElapsedSeconds, setSyncElapsedSeconds] = useState(0);
  const [removing, setRemoving] = useState(false);
  const [backfillDaysInput, setBackfillDaysInput] = useState(7);
  const [backfillMaxThreadsInput, setBackfillMaxThreadsInput] = useState(100);
  const [backfillSaving, setBackfillSaving] = useState(false);
  const pollIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const pollTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    loadCategories();
    loadGmailSyncStatus();
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
      setGmailColorOverride(category.gmailLabelColor ?? mapped.backgroundColor);
      const labelNameRaw = category.gmailLabelName ?? category.name;
      const normalizedLabelName = labelNameRaw.startsWith('TimeFlow/')
        ? labelNameRaw.slice('TimeFlow/'.length)
        : labelNameRaw;
      setGmailLabelNameInput(normalizedLabelName);
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

  async function loadGmailSyncStatus(): Promise<api.GmailSyncStatus | null> {
    try {
      const status = await api.getGmailSyncStatus();
      setGmailSyncStatus(status);
      setBackfillDaysInput(status.backfillDays);
      setBackfillMaxThreadsInput(status.backfillMaxThreads);
      return status;
    } catch (err) {
      console.error('Failed to load Gmail sync status:', err);
      return null;
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

  async function handleSyncNow() {
    setSyncing(true);
    setError(null);
    setSuccessMessage(null);

    try {
      const result = await api.triggerGmailSync();
      if (result.status === 'in_progress') {
        const startedAt = Date.now();
        setSyncStartTime(startedAt);
        setSyncInProgress(true);
        setSyncElapsedSeconds(0);
        setSuccessMessage('Gmail sync started. Status will update shortly.');
        startSyncPolling(startedAt);
      } else {
        setSuccessMessage(
          `Synced ${result.syncedCategories} categories and ${result.syncedThreads ?? 0} threads`
        );
        await loadGmailSyncStatus();
      }
    } catch (err: any) {
      console.error('Failed to sync Gmail labels:', err);
      // Show more detailed error message
      const errorMessage = err?.message || err?.error || 'Failed to sync Gmail labels';
      setError(errorMessage);
    } finally {
      setSyncing(false);
    }
  }

  async function handleUpdateBackfillSettings(days: number, maxThreads: number) {
    if (days < 1 || days > 30) {
      setError('Backfill days must be between 1 and 30.');
      if (gmailSyncStatus) {
        setBackfillDaysInput(gmailSyncStatus.backfillDays);
      }
      return;
    }

    if (maxThreads < 10 || maxThreads > 500) {
      setError('Max threads must be between 10 and 500.');
      if (gmailSyncStatus) {
        setBackfillMaxThreadsInput(gmailSyncStatus.backfillMaxThreads);
      }
      return;
    }

    setBackfillSaving(true);
    setError(null);
    setSuccessMessage(null);

    try {
      await api.updateGmailSyncSettings({
        backfillDays: days,
        backfillMaxThreads: maxThreads,
      });
      setSuccessMessage('Backfill settings updated.');
      await loadGmailSyncStatus();
    } catch (err) {
      console.error('Failed to update Gmail sync settings:', err);
      setError(err instanceof Error ? err.message : 'Failed to update settings');
    } finally {
      setBackfillSaving(false);
    }
  }

  function stopSyncPolling() {
    if (pollIntervalRef.current) {
      clearInterval(pollIntervalRef.current);
      pollIntervalRef.current = null;
    }
    if (pollTimeoutRef.current) {
      clearTimeout(pollTimeoutRef.current);
      pollTimeoutRef.current = null;
    }
    setSyncPolling(false);
  }

  function startSyncPolling(startedAt: number) {
    stopSyncPolling();
    setSyncPolling(true);

    const pollOnce = async () => {
      setSyncElapsedSeconds(Math.max(0, Math.floor((Date.now() - startedAt) / 1000)));
      const status = await loadGmailSyncStatus();
      if (!status) return;
      if (status.lastSyncedAt) {
        const lastSyncedAtMs = new Date(status.lastSyncedAt).getTime();
        if (lastSyncedAtMs >= startedAt - 1000) {
          setSyncInProgress(false);
          setSyncPolling(false);
          setSyncStartTime(null);
          setSyncElapsedSeconds(0);
          if (status.lastSyncError) {
            setError(`Gmail sync completed with errors: ${status.lastSyncError}`);
          } else {
            setSuccessMessage('Gmail sync completed. See updated status below.');
          }
          stopSyncPolling();
        }
      }
    };

    pollOnce();
    pollIntervalRef.current = setInterval(pollOnce, 5000);
    pollTimeoutRef.current = setTimeout(() => {
      setSyncPolling(false);
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
        pollIntervalRef.current = null;
      }
    }, 120000);
  }

  useEffect(() => {
    return () => {
      stopSyncPolling();
    };
  }, []);

  const syncProgressPercent = Math.min(100, Math.round((syncElapsedSeconds / 120) * 100));

  async function handleRemoveAllLabels() {
    if (!confirm('This will remove all TimeFlow labels from Gmail. Continue?')) {
      return;
    }

    setRemoving(true);
    setError(null);
    setSuccessMessage(null);

    try {
      const result = await api.removeAllGmailLabels();
      setSuccessMessage(`Removed ${result.removedCategories ?? result.syncedCategories} Gmail labels`);
      await loadGmailSyncStatus();
      await loadCategories();
    } catch (err) {
      console.error('Failed to remove Gmail labels:', err);
      setError('Failed to remove Gmail labels');
    } finally {
      setRemoving(false);
    }
  }

  async function handleToggleAllGmailSync(enabled: boolean) {
    setSaving(true);
    setError(null);
    setSuccessMessage(null);

    try {
      await Promise.all(
        categories.map((category) => api.updateCategoryGmailSync(category.id, enabled))
      );
      await loadCategories();
      setSuccessMessage(enabled ? 'Enabled Gmail sync for all categories' : 'Disabled Gmail sync for all categories');
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err) {
      console.error('Failed to update Gmail sync for all categories:', err);
      setError('Failed to update Gmail sync for all categories');
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
          gmailLabelName: undefined,
          gmailLabelColor: undefined,
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

        {/* Gmail Sync Overview */}
        <div className="bg-white border border-slate-200 rounded-lg p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-lg font-semibold text-slate-900">Gmail Label Sync</h2>
              <p className="text-sm text-slate-600">
                Control Gmail sync behavior and run manual syncs.
              </p>
            </div>
            <label className="flex items-center gap-2 text-sm text-slate-600">
              <input
                type="checkbox"
                checked={categories.some((category) => category.gmailSyncEnabled)}
                onChange={(e) => handleToggleAllGmailSync(e.target.checked)}
                className="h-4 w-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
                disabled={saving}
              />
              Sync all categories
            </label>
          </div>

          {gmailSyncStatus && (
            <div className="grid grid-cols-2 gap-4 text-sm mb-4">
              <div>
                <div className="text-slate-500 mb-1">Last Synced</div>
                <div className="font-medium text-slate-800">
                  {gmailSyncStatus.lastSyncedAt
                    ? new Date(gmailSyncStatus.lastSyncedAt).toLocaleString()
                    : 'Never'}
                </div>
              </div>
              <div>
                <div className="text-slate-500 mb-1">Threads Synced</div>
                <div className="font-medium text-slate-800">
                  {gmailSyncStatus.lastSyncThreadCount}
                </div>
              </div>
            </div>
          )}

          {gmailSyncStatus?.lastSyncError && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded text-sm text-red-700">
              {gmailSyncStatus.lastSyncError}
            </div>
          )}

          <div className="flex flex-wrap gap-3">
            <button
              onClick={handleSyncNow}
              disabled={syncing}
              className="px-4 py-2 bg-emerald-600 text-white rounded-lg text-sm font-medium
                         hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {syncing ? 'Starting...' : 'Sync Now'}
            </button>
            <button
              onClick={handleRemoveAllLabels}
              disabled={removing}
              className="px-4 py-2 bg-red-600 text-white rounded-lg text-sm font-medium
                         hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {removing ? 'Removing...' : 'Remove All TimeFlow Labels'}
            </button>
          </div>
          {(syncInProgress || syncPolling) && (
            <div className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-emerald-800">
              <div className="flex items-center gap-3">
                <span className="relative flex h-3 w-3">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-70" />
                  <span className="relative inline-flex h-3 w-3 rounded-full bg-emerald-600" />
                </span>
                <div className="text-sm font-medium">
                  Sync scan in progress ({syncElapsedSeconds}s)
                </div>
                <div className="text-xs text-emerald-700">
                  {syncPolling
                    ? 'Auto-refreshing status for up to 2 minutes'
                    : 'Still running. Status will update when it finishes'}
                </div>
              </div>
              <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-emerald-100">
                <div
                  className="h-full rounded-full bg-emerald-500 transition-all duration-700"
                  style={{ width: `${syncProgressPercent}%` }}
                />
              </div>
            </div>
          )}

          {gmailSyncStatus && (
            <div className="mt-6 rounded-xl border border-slate-200 bg-slate-50 p-4">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="text-sm font-semibold text-slate-700">Backfill Settings</div>
                  <p className="text-xs text-slate-500 mt-1">
                    Control how deep and how broad the labeling scan goes.
                  </p>
                </div>
                {backfillSaving && (
                  <div className="text-xs font-medium text-emerald-600">Saving…</div>
                )}
              </div>

              <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="rounded-lg bg-white border border-slate-200 p-3">
                  <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wide">
                    Backfill Days
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="30"
                    value={backfillDaysInput}
                    onChange={(e) => setBackfillDaysInput(Number(e.target.value))}
                    onBlur={() =>
                      handleUpdateBackfillSettings(backfillDaysInput, backfillMaxThreadsInput)
                    }
                    className="mt-2 w-full rounded-lg border border-slate-200 px-3 py-2 text-base font-medium text-slate-900
                               focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                  <p className="mt-1 text-xs text-slate-500">How many days back to scan (1-30)</p>
                </div>
                <div className="rounded-lg bg-white border border-slate-200 p-3">
                  <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wide">
                    Max Threads
                  </label>
                  <input
                    type="number"
                    min="10"
                    max="500"
                    value={backfillMaxThreadsInput}
                    onChange={(e) => setBackfillMaxThreadsInput(Number(e.target.value))}
                    onBlur={() =>
                      handleUpdateBackfillSettings(backfillDaysInput, backfillMaxThreadsInput)
                    }
                    className="mt-2 w-full rounded-lg border border-slate-200 px-3 py-2 text-base font-medium text-slate-900
                               focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                  <p className="mt-1 text-xs text-slate-500">Max threads per sync (10-500)</p>
                </div>
              </div>
            </div>
          )}
        </div>

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
                              <div className="mb-4">
                                <label className="block text-sm font-medium text-slate-600 mb-2">
                                  Gmail Label Name
                                </label>
                                <input
                                  type="text"
                                  value={gmailLabelNameInput}
                                  onChange={(e) => setGmailLabelNameInput(e.target.value)}
                                  onBlur={() => {
                                    const trimmed = gmailLabelNameInput.trim();
                                    handleUpdateCategory(category.id, {
                                      gmailLabelName: trimmed.length > 0 ? trimmed : undefined,
                                    });
                                  }}
                                  className="w-full px-3 py-2 border border-slate-200 rounded-lg
                                             focus:outline-none focus:ring-2 focus:ring-emerald-500"
                                  placeholder={category.name}
                                />
                                <p className="text-xs text-slate-500 mt-1">
                                  Label will appear as TimeFlow/&lt;Name&gt; in Gmail.
                                </p>
                              </div>
                              <GmailColorPicker
                                selectedColor={gmailColorOverride}
                                autoMappedColor={autoMappedGmailColor ?? undefined}
                                onColorSelect={(color) => {
                                  setGmailColorOverride(color.backgroundColor);
                                  handleUpdateCategory(category.id, {
                                    gmailLabelColor: color.backgroundColor,
                                  });
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
