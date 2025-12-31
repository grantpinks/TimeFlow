'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams } from 'next/navigation';
import * as api from '@/lib/api';
import { DateTime } from 'luxon';

export default function BookingPage() {
  const params = useParams();
  const slug = params.slug as string;

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

  // Form data
  const [inviteeName, setInviteeName] = useState('');
  const [inviteeEmail, setInviteeEmail] = useState('');
  const [notes, setNotes] = useState('');

  // Tokens for post-booking
  const [rescheduleToken, setRescheduleToken] = useState('');
  const [cancelToken, setCancelToken] = useState('');
  const [meetingId, setMeetingId] = useState('');

  const fetchAvailability = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      // Fetch availability for the next 7 days starting from selected date
      const from = DateTime.fromISO(selectedDate).startOf('day').toISO()!;
      const to = DateTime.fromISO(selectedDate).plus({ days: 7 }).endOf('day').toISO()!;

      const data = await api.getPublicAvailability(slug, from, to);

      setLinkName(data.link.name);
      setDurationsMinutes(data.link.durationsMinutes);
      setAvailableSlots(data.slots);

      // Auto-select first duration if not selected
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
    fetchAvailability();
  }, [fetchAvailability]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (!selectedSlot || !selectedDuration) {
      setError('Please select a time slot');
      return;
    }

    if (!inviteeName.trim() || !inviteeEmail.trim()) {
      setError('Please fill in all required fields');
      return;
    }

    try {
      setSubmitting(true);
      setError(null);

      // Ensure datetime is in proper ISO 8601 format with timezone
      const startDateTime = DateTime.fromISO(selectedSlot.start).toISO();
      if (!startDateTime) {
        throw new Error('Invalid datetime format');
      }

      const result = await api.bookPublicMeeting(slug, {
        inviteeName,
        inviteeEmail,
        notes,
        startDateTime,
        durationMinutes: selectedDuration,
      });

      setMeetingId(result.meeting.id);
      setRescheduleToken(result.rescheduleToken);
      setCancelToken(result.cancelToken);
      setSuccess(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to book meeting');
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

  // Get slots for selected date and duration
  const slotsForSelectedDate = selectedDuration && availableSlots[selectedDuration]
    ? availableSlots[selectedDuration].filter((slot) => {
        const slotDate = DateTime.fromISO(slot.start).toISODate();
        return slotDate === selectedDate;
      })
    : [];

  if (success) {
    const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';
    const calendarDownloadUrl = `${API_BASE}/api/meetings/${meetingId}/calendar`;

    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center p-4">
        <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full overflow-hidden">
          {/* Gradient Header */}
          <div className="bg-gradient-to-r from-primary-600 to-primary-700 p-8 text-center">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-white/20 rounded-full mb-4">
              <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h1 className="text-3xl font-bold text-white mb-2">You&apos;re All Set!</h1>
            <p className="text-primary-100 text-lg">
              Your meeting with {linkName} has been confirmed
            </p>
          </div>

          <div className="p-8">
            {/* Meeting Details */}
            {selectedSlot && (
              <div className="bg-gradient-to-br from-slate-50 to-slate-100 rounded-lg p-6 mb-6 border border-slate-200">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
                      Date & Time
                    </p>
                    <p className="text-lg font-bold text-slate-800">
                      {formatDate(selectedSlot.start)}
                    </p>
                    <p className="text-slate-600 mt-1">
                      {formatTime(selectedSlot.start)} ({selectedDuration} minutes)
                    </p>
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
                      Meeting Type
                    </p>
                    <p className="text-lg font-bold text-slate-800">{linkName}</p>
                  </div>
                </div>
              </div>
            )}

            {/* Add to Calendar Button */}
            <div className="mb-6">
              <a
                href={calendarDownloadUrl}
                className="flex items-center justify-center w-full bg-primary-600 text-white px-6 py-4 rounded-lg hover:bg-primary-700 transition-colors font-semibold text-lg shadow-md hover:shadow-lg"
              >
                <svg className="w-6 h-6 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                Add to Calendar
              </a>
              <p className="text-xs text-slate-500 text-center mt-2">
                Download .ics file for Google Calendar, Apple Calendar, or Outlook
              </p>
            </div>

            {/* Info Box */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
              <div className="flex">
                <svg className="w-5 h-5 text-blue-600 mt-0.5 mr-3 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <div className="text-sm text-blue-800">
                  <p className="font-medium mb-1">Confirmation Email Sent</p>
                  <p className="text-blue-700">
                    A confirmation email with meeting details has been sent to <span className="font-semibold">{inviteeEmail}</span>
                  </p>
                </div>
              </div>
            </div>

            {/* Action Links */}
            <div className="border-t border-slate-200 pt-6">
              <p className="text-sm font-medium text-slate-700 mb-3">Need to make changes?</p>
              <div className="flex flex-col sm:flex-row gap-3">
                <a
                  href={`/book/${slug}/reschedule?token=${rescheduleToken}`}
                  className="flex-1 text-center px-4 py-3 bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200 transition-colors font-medium border border-slate-300"
                >
                  Reschedule Meeting
                </a>
                <a
                  href={`/book/${slug}/cancel?token=${cancelToken}`}
                  className="flex-1 text-center px-4 py-3 bg-red-50 text-red-700 rounded-lg hover:bg-red-100 transition-colors font-medium border border-red-200"
                >
                  Cancel Meeting
                </a>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 py-8 px-4">
      <div className="max-w-4xl mx-auto">
        <div className="bg-white rounded-lg shadow-sm border border-slate-200 overflow-hidden">
          {/* Header */}
          <div className="bg-primary-600 text-white p-6">
            <h1 className="text-2xl font-bold">{linkName || 'Book a Meeting'}</h1>
            <p className="text-primary-100 mt-1">Select a time that works for you</p>
          </div>

          {error && (
            <div className="mx-6 mt-6 px-4 py-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="p-6">
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
                Select Date
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

            {/* Booking Form */}
            {selectedSlot && (
              <div className="border-t border-slate-200 pt-6 space-y-4">
                <h3 className="text-lg font-medium text-slate-800">Your Information</h3>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={inviteeName}
                    onChange={(e) => setInviteeName(e.target.value)}
                    required
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                    placeholder="John Doe"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Email <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="email"
                    value={inviteeEmail}
                    onChange={(e) => setInviteeEmail(e.target.value)}
                    required
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                    placeholder="john@example.com"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Notes (optional)
                  </label>
                  <textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    rows={3}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                    placeholder="Anything you'd like to share..."
                  />
                </div>

                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full bg-primary-600 text-white px-6 py-3 rounded-lg hover:bg-primary-700 disabled:opacity-50 font-medium"
                >
                  {submitting ? 'Booking...' : 'Confirm Booking'}
                </button>
              </div>
            )}
          </form>
        </div>
      </div>
    </div>
  );
}
