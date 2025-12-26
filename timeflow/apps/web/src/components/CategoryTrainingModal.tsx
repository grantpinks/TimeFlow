'use client';

import { useEffect, useMemo, useState } from 'react';
import ColorPicker from '@/components/ColorPicker';
import type { Category, CreateCategoryRequest } from '@timeflow/shared';
import * as api from '@/lib/api';

interface CategoryTrainingModalProps {
  isOpen: boolean;
  onClose: () => void;
  onComplete: (categoryId: string) => void;
  createCategory: (data: CreateCategoryRequest) => Promise<Category>;
}

export function CategoryTrainingModal({
  isOpen,
  onClose,
  onComplete,
  createCategory,
}: CategoryTrainingModalProps) {
  const [step, setStep] = useState<1 | 2>(1);
  const [name, setName] = useState('');
  const [color, setColor] = useState('#3B82F6');
  const [categoryId, setCategoryId] = useState<string | null>(null);
  const [description, setDescription] = useState('');
  const [includeKeywords, setIncludeKeywords] = useState('');
  const [excludeKeywords, setExcludeKeywords] = useState('');
  const [availableEvents, setAvailableEvents] = useState<api.CategoryTrainingExampleSnapshot[]>([]);
  const [selectedEvents, setSelectedEvents] = useState<api.CategoryTrainingExampleSnapshot[]>([]);
  const [loadingEvents, setLoadingEvents] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!isOpen) {
      setStep(1);
      setName('');
      setColor('#3B82F6');
      setCategoryId(null);
      setDescription('');
      setIncludeKeywords('');
      setExcludeKeywords('');
      setSelectedEvents([]);
      setAvailableEvents([]);
      setLoadingEvents(false);
      setSaving(false);
      setError('');
    }
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen || step !== 2) return;
    let active = true;

    const now = new Date();
    const start = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const end = new Date(now.getFullYear(), now.getMonth() + 2, 0);

    setLoadingEvents(true);
    api
      .getCalendarEvents(start.toISOString(), end.toISOString())
      .then((events) => {
        if (!active) return;
        const sanitized = events
          .filter((event) => event.id)
          .map((event) => ({
            eventId: event.id as string,
            summary: event.summary,
            description: event.description,
            start: event.start,
            end: event.end,
          }));
        setAvailableEvents(sanitized);
      })
      .catch((err) => {
        console.error('Failed to load calendar events:', err);
      })
      .finally(() => {
        if (active) {
          setLoadingEvents(false);
        }
      });

    return () => {
      active = false;
    };
  }, [isOpen, step]);

  const selectedEventIds = useMemo(
    () => new Set(selectedEvents.map((event) => event.eventId)),
    [selectedEvents]
  );

  const toggleEvent = (event: api.CategoryTrainingExampleSnapshot) => {
    setSelectedEvents((prev) => {
      const exists = prev.some((item) => item.eventId === event.eventId);
      if (exists) return prev.filter((item) => item.eventId !== event.eventId);
      return [...prev, event].slice(0, 5);
    });
  };

  const handleCreate = async () => {
    if (!name.trim()) {
      setError('Category name is required.');
      return;
    }

    setSaving(true);
    setError('');
    try {
      const category = await createCategory({ name: name.trim(), color });
      setCategoryId(category.id);
      setStep(2);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create category');
    } finally {
      setSaving(false);
    }
  };

  const handleSaveTraining = async () => {
    if (!categoryId) return;

    const include = includeKeywords
      .split(',')
      .map((item) => item.trim())
      .filter(Boolean);
    if (include.length === 0) {
      setError('Include keywords are required.');
      return;
    }

    setSaving(true);
    setError('');
    try {
      await api.upsertCategoryTraining(categoryId, {
        description: description.trim() || undefined,
        includeKeywords: include,
        excludeKeywords: excludeKeywords
          .split(',')
          .map((item) => item.trim())
          .filter(Boolean),
        exampleEventIds: selectedEvents.map((event) => event.eventId),
        exampleEventsSnapshot: selectedEvents,
      });
      onComplete(categoryId);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save training');
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4">
      <div className="w-full max-w-xl bg-white rounded-xl border border-slate-200 shadow-xl">
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200">
          <div>
            <p className="text-xs uppercase tracking-wide text-slate-500">Custom category</p>
            <h3 className="text-lg font-semibold text-slate-900">
              {step === 1 ? 'Create category' : 'Train category'}
            </h3>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
            Close
          </button>
        </div>

        <div className="px-5 py-4 space-y-4">
          {step === 1 ? (
            <>
              <div>
                <label className="text-sm font-medium text-slate-700">Name</label>
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="mt-1 w-full border border-slate-300 rounded-lg px-3 py-2 text-sm"
                  placeholder="e.g., Client Work"
                />
              </div>
              <div>
                <label className="text-sm font-medium text-slate-700">Color</label>
                <ColorPicker value={color} onChange={setColor} />
              </div>
            </>
          ) : (
            <>
              <div>
                <label className="text-sm font-medium text-slate-700">Description</label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="mt-1 w-full border border-slate-300 rounded-lg px-3 py-2 text-sm"
                  rows={2}
                  placeholder="e.g., Meetings with customers, project reviews, and client calls"
                />
              </div>

              <div>
                <label className="text-sm font-medium text-slate-700">Include keywords (required)</label>
                <input
                  value={includeKeywords}
                  onChange={(e) => setIncludeKeywords(e.target.value)}
                  className="mt-1 w-full border border-slate-300 rounded-lg px-3 py-2 text-sm"
                  placeholder="review, client, roadmap"
                />
                <p className="text-xs text-slate-500 mt-1">Separate keywords with commas.</p>
              </div>

              <div>
                <label className="text-sm font-medium text-slate-700">Exclude keywords</label>
                <input
                  value={excludeKeywords}
                  onChange={(e) => setExcludeKeywords(e.target.value)}
                  className="mt-1 w-full border border-slate-300 rounded-lg px-3 py-2 text-sm"
                  placeholder="gym, dentist"
                />
              </div>

              <div>
                <label className="text-sm font-medium text-slate-700">Example events</label>
                <div className="mt-2 grid gap-2 max-h-52 overflow-y-auto border border-slate-200 rounded-lg p-2">
                  {loadingEvents ? (
                    <p className="text-xs text-slate-500">Loading events...</p>
                  ) : availableEvents.length === 0 ? (
                    <p className="text-xs text-slate-500">No recent events found.</p>
                  ) : (
                    availableEvents.map((event) => (
                      <label key={event.eventId} className="flex items-start gap-2 text-sm text-slate-700">
                        <input
                          type="checkbox"
                          checked={selectedEventIds.has(event.eventId)}
                          onChange={() => toggleEvent(event)}
                        />
                        <span>{event.summary}</span>
                      </label>
                    ))
                  )}
                </div>
                <p className="text-xs text-slate-500 mt-1">Pick up to 5 events for better AI accuracy.</p>
              </div>
            </>
          )}

          {error && <p className="text-sm text-red-600">{error}</p>}
        </div>

        <div className="flex justify-end gap-2 px-5 py-4 border-t border-slate-200">
          <button onClick={onClose} className="px-3 py-2 text-sm bg-slate-100 rounded-lg">
            Cancel
          </button>
          {step === 1 ? (
            <button
              onClick={handleCreate}
              disabled={saving}
              className="px-3 py-2 text-sm bg-primary-600 text-white rounded-lg"
            >
              {saving ? 'Creating...' : 'Continue'}
            </button>
          ) : (
            <button
              onClick={handleSaveTraining}
              disabled={saving}
              className="px-3 py-2 text-sm bg-primary-600 text-white rounded-lg"
            >
              {saving ? 'Saving...' : 'Save training'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
