'use client';

import { useState, useEffect } from 'react';
import * as api from '@/lib/api';
import type { SchedulingLink } from '@timeflow/shared';

export function SchedulingLinksPanel() {
  const [links, setLinks] = useState<SchedulingLink[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingLink, setEditingLink] = useState<SchedulingLink | null>(null);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Load scheduling links
  useEffect(() => {
    fetchLinks();
  }, []);

  async function fetchLinks() {
    try {
      setLoading(true);
      const data = await api.getSchedulingLinks();
      setLinks(data);
    } catch (err) {
      console.error('Failed to fetch scheduling links:', err);
      setMessage({ type: 'error', text: 'Failed to load scheduling links' });
    } finally {
      setLoading(false);
    }
  }

  function handleCreate() {
    setEditingLink(null);
    setShowModal(true);
  }

  function handleEdit(link: SchedulingLink) {
    setEditingLink(link);
    setShowModal(true);
  }

  async function handleDelete(id: string) {
    if (!confirm('Are you sure you want to delete this scheduling link?')) return;

    try {
      await api.deleteSchedulingLink(id);
      setMessage({ type: 'success', text: 'Scheduling link deleted' });
      fetchLinks();
    } catch (err) {
      setMessage({ type: 'error', text: 'Failed to delete scheduling link' });
    }
  }

  async function handleToggle(id: string, isActive: boolean) {
    try {
      if (isActive) {
        await api.pauseSchedulingLink(id);
      } else {
        await api.resumeSchedulingLink(id);
      }
      fetchLinks();
    } catch (err) {
      setMessage({ type: 'error', text: 'Failed to toggle scheduling link' });
    }
  }

  function handleModalClose() {
    setShowModal(false);
    setEditingLink(null);
  }

  function handleModalSuccess() {
    setShowModal(false);
    setEditingLink(null);
    fetchLinks();
    setMessage({ type: 'success', text: 'Scheduling link saved' });
  }

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-6">
        <h2 className="text-lg font-semibold text-slate-800 mb-4">Scheduling Links</h2>
        <div className="text-slate-500">Loading...</div>
      </div>
    );
  }

  return (
    <div id="scheduling-links" className="bg-white rounded-lg shadow-sm border border-slate-200 p-6">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-lg font-semibold text-slate-800">Scheduling Links</h2>
          <p className="text-slate-600 text-sm mt-1">
            Share links to let others book meetings on your calendar
          </p>
        </div>
        <button
          onClick={handleCreate}
          className="inline-flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors text-sm font-medium"
        >
          + Create Link
        </button>
      </div>

      {message && (
        <div
          className={`mb-4 px-4 py-3 rounded-lg text-sm ${
            message.type === 'success'
              ? 'bg-green-50 border border-green-200 text-green-700'
              : 'bg-red-50 border border-red-200 text-red-700'
          }`}
        >
          {message.text}
        </div>
      )}

      {links.length === 0 ? (
        <div className="text-center py-12 text-slate-500">
          <p className="mb-2">No scheduling links yet</p>
          <p className="text-sm">Create a link to start accepting meeting bookings</p>
        </div>
      ) : (
        <div className="space-y-3">
          {links.map((link) => (
            <div
              key={link.id}
              className="border border-slate-200 rounded-lg p-4 hover:border-slate-300 transition-colors"
            >
              <div className="flex items-start justify-between mb-2">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="font-medium text-slate-800">{link.name}</h3>
                    <span
                      className={`text-xs px-2 py-0.5 rounded-full ${
                        link.isActive
                          ? 'bg-green-50 text-green-700 border border-green-200'
                          : 'bg-slate-50 text-slate-600 border border-slate-200'
                      }`}
                    >
                      {link.isActive ? 'Active' : 'Paused'}
                    </span>
                  </div>
                  <p className="text-sm text-slate-600 mb-2">
                    {process.env.NEXT_PUBLIC_APP_URL}/book/{link.slug}
                  </p>
                  <div className="flex items-center gap-4 text-xs text-slate-500">
                    <span>{link.durationsMinutes.join(', ')} min</span>
                    <span>{link.calendarProvider === 'google' ? 'Google' : 'Apple'} Calendar</span>
                    {link.googleMeetEnabled && <span>📹 Meet enabled</span>}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleToggle(link.id, link.isActive)}
                    className="text-sm text-slate-600 hover:text-slate-800 px-3 py-1 rounded hover:bg-slate-50"
                  >
                    {link.isActive ? 'Pause' : 'Resume'}
                  </button>
                  <button
                    onClick={() => handleEdit(link)}
                    className="text-sm text-primary-600 hover:text-primary-700 px-3 py-1 rounded hover:bg-primary-50"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => handleDelete(link.id)}
                    className="text-sm text-red-600 hover:text-red-700 px-3 py-1 rounded hover:bg-red-50"
                  >
                    Delete
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {showModal && (
        <SchedulingLinkModal
          link={editingLink}
          onClose={handleModalClose}
          onSuccess={handleModalSuccess}
        />
      )}
    </div>
  );
}

interface SchedulingLinkModalProps {
  link: SchedulingLink | null;
  onClose: () => void;
  onSuccess: () => void;
}

function SchedulingLinkModal({ link, onClose, onSuccess }: SchedulingLinkModalProps) {
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form state
  const [name, setName] = useState(link?.name || '');
  const [durationsMinutes, setDurationsMinutes] = useState<number[]>(link?.durationsMinutes || [30]);
  const [bufferBeforeMinutes, setBufferBeforeMinutes] = useState(link?.bufferBeforeMinutes || 10);
  const [bufferAfterMinutes, setBufferAfterMinutes] = useState(link?.bufferAfterMinutes || 10);
  const [maxBookingHorizonDays, setMaxBookingHorizonDays] = useState(link?.maxBookingHorizonDays || 60);
  const [dailyCap, setDailyCap] = useState(link?.dailyCap || 6);
  const [calendarProvider, setCalendarProvider] = useState<'google' | 'apple'>(link?.calendarProvider || 'google');
  const [calendarId, setCalendarId] = useState(link?.calendarId || 'primary');
  const [googleMeetEnabled, setGoogleMeetEnabled] = useState(link?.googleMeetEnabled ?? true);

  // Duration checkboxes
  const durationOptions = [15, 30, 45, 60, 90, 120];

  function toggleDuration(duration: number) {
    if (durationsMinutes.includes(duration)) {
      setDurationsMinutes(durationsMinutes.filter(d => d !== duration));
    } else {
      setDurationsMinutes([...durationsMinutes, duration].sort((a, b) => a - b));
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);

    if (!name.trim()) {
      setError('Name is required');
      setSaving(false);
      return;
    }

    if (durationsMinutes.length === 0) {
      setError('Select at least one duration');
      setSaving(false);
      return;
    }

    try {
      const data = {
        name,
        durationsMinutes,
        bufferBeforeMinutes,
        bufferAfterMinutes,
        maxBookingHorizonDays,
        dailyCap,
        calendarProvider,
        calendarId,
        googleMeetEnabled,
      };

      if (link) {
        await api.updateSchedulingLink(link.id, data);
      } else {
        await api.createSchedulingLink(data);
      }

      onSuccess();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save scheduling link');
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-slate-200 p-6">
          <div className="flex items-center justify-between">
            <h3 className="text-xl font-semibold text-slate-800">
              {link ? 'Edit Scheduling Link' : 'Create Scheduling Link'}
            </h3>
            <button
              onClick={onClose}
              className="text-slate-400 hover:text-slate-600"
            >
              ✕
            </button>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {error && (
            <div className="px-4 py-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm">
              {error}
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Link Name
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
              placeholder="30-Minute Meeting"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Meeting Durations
            </label>
            <div className="grid grid-cols-3 gap-2">
              {durationOptions.map((duration) => (
                <label key={duration} className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={durationsMinutes.includes(duration)}
                    onChange={() => toggleDuration(duration)}
                    className="w-4 h-4 text-primary-600 border-slate-300 rounded focus:ring-primary-500"
                  />
                  <span className="text-sm">{duration} min</span>
                </label>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Buffer Before (min)
              </label>
              <input
                type="number"
                min="0"
                value={bufferBeforeMinutes}
                onChange={(e) => setBufferBeforeMinutes(Number(e.target.value))}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Buffer After (min)
              </label>
              <input
                type="number"
                min="0"
                value={bufferAfterMinutes}
                onChange={(e) => setBufferAfterMinutes(Number(e.target.value))}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Booking Horizon (days)
              </label>
              <input
                type="number"
                min="1"
                value={maxBookingHorizonDays}
                onChange={(e) => setMaxBookingHorizonDays(Number(e.target.value))}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Daily Meeting Cap
              </label>
              <input
                type="number"
                min="1"
                value={dailyCap}
                onChange={(e) => setDailyCap(Number(e.target.value))}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Calendar Provider
            </label>
            <select
              value={calendarProvider}
              onChange={(e) => setCalendarProvider(e.target.value as 'google' | 'apple')}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
            >
              <option value="google">Google Calendar</option>
              <option value="apple">Apple Calendar</option>
            </select>
          </div>

          {calendarProvider === 'google' && (
            <div>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={googleMeetEnabled}
                  onChange={(e) => setGoogleMeetEnabled(e.target.checked)}
                  className="w-4 h-4 text-primary-600 border-slate-300 rounded focus:ring-primary-500"
                />
                <span className="text-sm font-medium text-slate-700">
                  Enable Google Meet for bookings
                </span>
              </label>
            </div>
          )}

          <div className="flex justify-end gap-3 pt-4 border-t border-slate-200">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-slate-700 border border-slate-300 rounded-lg hover:bg-slate-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50 font-medium"
            >
              {saving ? 'Saving...' : link ? 'Update Link' : 'Create Link'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
