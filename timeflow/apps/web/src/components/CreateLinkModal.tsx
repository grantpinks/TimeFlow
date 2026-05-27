'use client';

/**
 * CreateLinkModal Component
 *
 * Modal for quickly creating scheduling links with smart defaults.
 */

import { useState, useEffect } from 'react';
import Link from 'next/link';
import * as api from '@/lib/api';
import {
  useSchedulingLinkCalendars,
  pickDefaultCalendarId,
} from '@/hooks/useSchedulingLinkCalendars';

interface CreateLinkModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (linkId: string) => void;
}

export function CreateLinkModal({ isOpen, onClose, onSuccess }: CreateLinkModalProps) {
  const [name, setName] = useState('');
  const [durations, setDurations] = useState<number[]>([30]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [calendarProvider, setCalendarProvider] = useState<'google' | 'apple'>('google');
  const [calendarId, setCalendarId] = useState('');
  const [googleMeetEnabled, setGoogleMeetEnabled] = useState(true);

  const { loading: calendarsLoading, googleOptions, appleOptions } =
    useSchedulingLinkCalendars(isOpen);

  const calendarOptions = calendarProvider === 'google' ? googleOptions : appleOptions;

  useEffect(() => {
    if (!isOpen || calendarsLoading) return;

    async function setDefaultFromProfile() {
      let preferred: string | null = null;
      if (calendarProvider === 'google') {
        try {
          const profile = await api.getMe();
          preferred = profile.defaultCalendarId ?? null;
        } catch {
          // use first connected calendar
        }
      }
      setCalendarId((current) => {
        if (current && calendarOptions.some((o) => o.id === current)) {
          return current;
        }
        return pickDefaultCalendarId(calendarProvider, calendarOptions, preferred);
      });
    }

    setDefaultFromProfile();
  }, [isOpen, calendarsLoading, calendarProvider, googleOptions, appleOptions]);

  if (!isOpen) return null;

  const handleDurationToggle = (duration: number) => {
    if (durations.includes(duration)) {
      setDurations(durations.filter((d) => d !== duration));
    } else {
      setDurations([...durations, duration]);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!name.trim()) {
      setError('Link name is required');
      return;
    }

    if (durations.length === 0) {
      setError('Select at least one duration');
      return;
    }

    if (!calendarId) {
      setError(
        calendarProvider === 'apple'
          ? 'Connect iCloud in Settings and select an Apple calendar.'
          : 'Connect Google Calendar in Settings and select a calendar.'
      );
      return;
    }

    setIsSubmitting(true);

    try {
      const newLink = await api.createSchedulingLink({
        name: name.trim(),
        durationsMinutes: durations.sort((a, b) => a - b),
        calendarProvider,
        calendarId,
        googleMeetEnabled: calendarProvider === 'google' ? googleMeetEnabled : false,
        bufferBeforeMinutes: 5,
        bufferAfterMinutes: 5,
        maxBookingHorizonDays: 14,
      });

      setName('');
      setDurations([30]);
      setCalendarProvider('google');
      setCalendarId('');
      setGoogleMeetEnabled(true);

      onSuccess(newLink.id);
      onClose();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to create link';
      setError(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    if (!isSubmitting) {
      setName('');
      setDurations([30]);
      setError('');
      setCalendarProvider('google');
      setCalendarId('');
      setGoogleMeetEnabled(true);
      onClose();
    }
  };

  const formDisabled = isSubmitting || calendarsLoading;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">Create Meeting Link</h2>
          <button
            onClick={handleClose}
            disabled={isSubmitting}
            className="text-gray-400 hover:text-gray-600 disabled:opacity-50"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label htmlFor="link-name" className="block text-sm font-medium text-gray-700 mb-1">
              Link Name *
            </label>
            <input
              id="link-name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., Quick Chat"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
              disabled={formDisabled}
              autoFocus
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Duration *</label>
            <div className="flex gap-3">
              {[15, 30, 60].map((duration) => (
                <button
                  key={duration}
                  type="button"
                  onClick={() => handleDurationToggle(duration)}
                  disabled={formDisabled}
                  className={`
                    flex-1 px-4 py-2 rounded-lg border-2 font-medium text-sm
                    transition-colors disabled:opacity-50
                    ${
                      durations.includes(duration)
                        ? 'border-primary-500 bg-primary-50 text-primary-700'
                        : 'border-gray-300 text-gray-700 hover:border-gray-400'
                    }
                  `}
                >
                  {duration} min
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Calendar</label>
            <select
              value={calendarProvider}
              onChange={(e) => setCalendarProvider(e.target.value as 'google' | 'apple')}
              disabled={formDisabled}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 disabled:opacity-50 mb-2"
            >
              <option value="google">Google Calendar</option>
              <option value="apple">Apple Calendar (iCloud)</option>
            </select>
            {calendarsLoading ? (
              <p className="text-sm text-gray-500">Loading calendars…</p>
            ) : calendarOptions.length === 0 ? (
              <p className="text-sm text-amber-800 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
                {calendarProvider === 'apple' ? (
                  <>
                    No Apple calendars.{' '}
                    <Link href="/settings" className="font-medium underline">
                      Connect iCloud in Settings
                    </Link>
                  </>
                ) : (
                  <>
                    No Google calendars.{' '}
                    <Link href="/settings" className="font-medium underline">
                      Connect Google in Settings
                    </Link>
                  </>
                )}
              </p>
            ) : (
              <select
                value={calendarId}
                onChange={(e) => setCalendarId(e.target.value)}
                disabled={formDisabled}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
              >
                {calendarOptions.map((cal) => (
                  <option key={cal.id} value={cal.id}>
                    {cal.name} ({cal.accountEmail})
                  </option>
                ))}
              </select>
            )}
          </div>

          {calendarProvider === 'google' && (
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={googleMeetEnabled}
                onChange={(e) => setGoogleMeetEnabled(e.target.checked)}
                disabled={formDisabled}
                className="w-4 h-4 text-primary-600 border-gray-300 rounded focus:ring-primary-500"
              />
              <span className="text-sm text-gray-700">Enable Google Meet</span>
            </label>
          )}

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
            <p className="text-xs text-blue-800">
              <strong>Smart defaults:</strong> 5-min buffers, 14-day booking window
            </p>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3">
              <p className="text-sm text-red-800">{error}</p>
            </div>
          )}

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={handleClose}
              disabled={formDisabled}
              className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={formDisabled || !calendarId}
              className="flex-1 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50 font-medium"
            >
              {calendarsLoading ? 'Loading...' : isSubmitting ? 'Creating...' : 'Create Link'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
