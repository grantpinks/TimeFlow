'use client';

import { useEffect, useMemo, useState } from 'react';
import * as api from '@/lib/api';

interface CategoryTrainingPanelProps {
  categoryId: string;
  categoryName: string;
  onClose: () => void;
}

export function CategoryTrainingPanel({
  categoryId,
  categoryName,
  onClose,
}: CategoryTrainingPanelProps) {
  const [description, setDescription] = useState('');
  const [includeKeywords, setIncludeKeywords] = useState('');
  const [excludeKeywords, setExcludeKeywords] = useState('');
  const [selectedEvents, setSelectedEvents] = useState<api.CategoryTrainingExampleSnapshot[]>([]);
  const [availableEvents, setAvailableEvents] = useState<api.CategoryTrainingExampleSnapshot[]>([]);
  const [saving, setSaving] = useState(false);
  const [loadingEvents, setLoadingEvents] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;

    api.getCategoryTraining(categoryId).then((profile) => {
      if (!active || !profile) return;
      setDescription(profile.description || '');
      setIncludeKeywords((profile.includeKeywords || []).join(', '));
      setExcludeKeywords((profile.excludeKeywords || []).join(', '));
      setSelectedEvents(profile.exampleEventsSnapshot || []);
    });

    return () => {
      active = false;
    };
  }, [categoryId]);

  useEffect(() => {
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
  }, []);

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

  const handleSave = async () => {
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
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save training');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="bg-white border border-slate-200 rounded-lg p-4 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs uppercase tracking-wide text-slate-500">Train category</p>
          <h3 className="text-lg font-semibold text-slate-900">{categoryName}</h3>
        </div>
        <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
          Close
        </button>
      </div>

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

      {error && <p className="text-sm text-red-600">{error}</p>}

      <div className="flex justify-end gap-2">
        <button onClick={onClose} className="px-3 py-2 text-sm bg-slate-100 rounded-lg">
          Cancel
        </button>
        <button
          onClick={handleSave}
          disabled={saving}
          className="px-3 py-2 text-sm bg-primary-600 text-white rounded-lg"
        >
          {saving ? 'Saving...' : 'Save training'}
        </button>
      </div>
    </div>
  );
}
