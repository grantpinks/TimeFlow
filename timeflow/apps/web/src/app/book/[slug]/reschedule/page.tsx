'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import * as api from '@/lib/api';
import { DateTime } from 'luxon';

export default function ReschedulePage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const slug = params.slug as string;
  const token = searchParams.get('token') || '';

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  // Link and availability data
  const [linkName, setLinkName] = useState('');
  const [durationsMinutes, setDurationsMinutes] = useState<number[]>([]);
  const [selectedDuration, setSelectedDuration] = useState<number | null>(null);
  const [availableSlots, setAvailableSlots] = useState<Record<number, Array<{ start: string; end: string }>>>({});

  // Date selection
  const [selectedDate, setSelectedDate] = useState<string>(DateTime.now().toISODate()!);
  const [selectedSlot, setSelectedSlot] = useState<{ start: string; end: string } | null>(null);

  const fetchAvailability = useCallback(async () => {
    if (!selectedDuration) return;

    try {
      setLoading(true);
      setError(null);

      const from = DateTime.fromISO(selectedDate).startOf('day').toISO()!;
      const to = DateTime.fromISO(selectedDate).plus({ days: 7 }).endOf('day').toISO()!;

      const data = await api.getPublicAvailability(slug, from, to);

      setLinkName(data.link.name);
      setDurationsMinutes(data.link.durationsMinutes);
      setAvailableSlots(data.slots);

      if (!selectedDuration && data.link.durationsMinutes.length > 0) {
        setSelectedDuration(data.link.durationsMinutes[0]);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load availability');
    } finally {
      setLoading(false);
    }
  }, [selectedDate, selectedDuration, slug]);

  useEffect(() => {
    if (!token) {
      setError('Invalid reschedule link');
      setLoading(false);
      return;
    }
    fetchAvailability();
  }, [selectedDate, selectedDuration, token, fetchAvailability]);

  async function handleReschedule() {
    if (!selectedSlot || !selectedDuration) {
      setError('Please select a new time slot');
      return;
    }

    try {
      setSubmitting(true);
      setError(null);

      await api.reschedulePublicMeeting(slug, token, {
        startDateTime: selectedSlot.start,
        durationMinutes: selectedDuration,
      });

      setSuccess(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to reschedule meeting');
    } finally {
      setSubmitting(false);
    }
  }

  function formatTime(isoString: string) {
    return DateTime.fromISO(isoString).toLocaleString(DateTime.TIME_SIMPLE);
  }

  function formatDate(isoString: string) {
    return DateTime.fromISO(isoString).toLocaleString(DateTime.DATE_MED);
  }

  const slotsForSelectedDate = selectedDuration && availableSlots[selectedDuration]
    ? availableSlots[selectedDuration].filter((slot) => {
        const slotDate = DateTime.fromISO(slot.start).toISODate();
        return slotDate === selectedDate;
      })
    : [];

  if (!token) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-lg shadow-lg max-w-md w-full p-8 text-center">
          <div className="text-red-500 text-5xl mb-4">✕</div>
          <h1 className="text-2xl font-bold text-slate-800 mb-2">Invalid Link</h1>
          <p className="text-slate-600">
            This reschedule link is invalid or has expired.
          </p>
        </div>
      </div>
    );
  }

  if (success) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-lg shadow-lg max-w-md w-full p-8 text-center">
          <div className="text-green-500 text-5xl mb-4">✓</div>
          <h1 className="text-2xl font-bold text-slate-800 mb-2">Meeting Rescheduled!</h1>
          <p className="text-slate-600 mb-6">
            Your meeting has been rescheduled. You&apos;ll receive a confirmation email shortly.
          </p>

          {selectedSlot && (
            <div className="bg-slate-50 rounded-lg p-4 text-left">
              <p className="text-sm text-slate-600 mb-1">New Time</p>
              <p className="font-medium text-slate-800">
                {formatDate(selectedSlot.start)} at {formatTime(selectedSlot.start)}
              </p>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 py-8 px-4">
      <div className="max-w-4xl mx-auto">
        <div className="bg-white rounded-lg shadow-sm border border-slate-200 overflow-hidden">
          <div className="bg-primary-600 text-white p-6">
            <h1 className="text-2xl font-bold">Reschedule Meeting</h1>
            <p className="text-primary-100 mt-1">{linkName}</p>
          </div>

          {error && (
            <div className="mx-6 mt-6 px-4 py-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm">
              {error}
            </div>
          )}

          <div className="p-6">
            {/* Duration Selection */}
            {durationsMinutes.length > 1 && (
              <div className="mb-6">
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Meeting Duration
                </label>
                <div className="flex gap-2 flex-wrap">
                  {durationsMinutes.map((duration) => (
                    <button
                      key={duration}
                      type="button"
                      onClick={() => {
                        setSelectedDuration(duration);
                        setSelectedSlot(null);
                      }}
                      className={`px-4 py-2 rounded-lg border transition-colors ${
                        selectedDuration === duration
                          ? 'bg-primary-600 text-white border-primary-600'
                          : 'bg-white text-slate-700 border-slate-300 hover:border-primary-300'
                      }`}
                    >
                      {duration} min
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Date Navigation */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Select New Date
              </label>
              <div className="flex gap-2 overflow-x-auto pb-2">
                {Array.from({ length: 14 }, (_, i) => {
                  const date = DateTime.now().plus({ days: i });
                  const dateString = date.toISODate()!;
                  return (
                    <button
                      key={dateString}
                      type="button"
                      onClick={() => {
                        setSelectedDate(dateString);
                        setSelectedSlot(null);
                      }}
                      className={`flex-shrink-0 px-4 py-3 rounded-lg border transition-colors min-w-[100px] ${
                        selectedDate === dateString
                          ? 'bg-primary-600 text-white border-primary-600'
                          : 'bg-white text-slate-700 border-slate-300 hover:border-primary-300'
                      }`}
                    >
                      <div className="text-xs opacity-75">
                        {date.toFormat('EEE')}
                      </div>
                      <div className="font-medium">
                        {date.toFormat('MMM d')}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Time Slot Selection */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Available Times
              </label>
              {loading ? (
                <div className="text-slate-500 py-8 text-center">Loading available times...</div>
              ) : slotsForSelectedDate.length === 0 ? (
                <div className="text-slate-500 py-8 text-center">
                  No available times on this date. Try another date.
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
                  {slotsForSelectedDate.map((slot) => (
                    <button
                      key={slot.start}
                      type="button"
                      onClick={() => setSelectedSlot(slot)}
                      className={`px-4 py-2 rounded-lg border transition-colors text-sm ${
                        selectedSlot?.start === slot.start
                          ? 'bg-primary-600 text-white border-primary-600'
                          : 'bg-white text-slate-700 border-slate-300 hover:border-primary-300'
                      }`}
                    >
                      {formatTime(slot.start)}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Confirm Button */}
            {selectedSlot && (
              <div className="border-t border-slate-200 pt-6">
                <button
                  onClick={handleReschedule}
                  disabled={submitting}
                  className="w-full bg-primary-600 text-white px-6 py-3 rounded-lg hover:bg-primary-700 disabled:opacity-50 font-medium"
                >
                  {submitting ? 'Rescheduling...' : 'Confirm Reschedule'}
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
