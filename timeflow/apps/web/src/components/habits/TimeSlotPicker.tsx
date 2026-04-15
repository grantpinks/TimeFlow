/**
 * Time Slot Picker Component
 *
 * Shows available time slots for habit scheduling with visual indicators
 */

'use client';

import { useState, useEffect } from 'react';
import { LoadingSpinner } from '@/components/ui';

export interface TimeSlot {
  startDateTime: string;
  endDateTime: string;
  dayOfWeek: string;
  timeOfDay: 'morning' | 'afternoon' | 'evening';
  displayTime: string;
}

interface TimeSlotPickerProps {
  habitId: string;
  habitTitle: string;
  dateOption: 'today' | 'tomorrow' | 'this-week';
  onSelectSlot: (slot: TimeSlot) => void;
  onCancel: () => void;
}

export function TimeSlotPicker({
  habitId,
  habitTitle,
  dateOption,
  onSelectSlot,
  onCancel,
}: TimeSlotPickerProps) {
  const [slots, setSlots] = useState<TimeSlot[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [habitDuration, setHabitDuration] = useState<number>(30);
  const [customTimeDate, setCustomTimeDate] = useState<string | null>(null);
  const [customTimeValue, setCustomTimeValue] = useState<string>('');

  const getAuthHeaders = (): Record<string, string> => {
    const token = localStorage.getItem('timeflow_token');
    return token ? { Authorization: `Bearer ${token}` } : {};
  };

  useEffect(() => {
    console.log('[TimeSlotPicker] Component mounted/updated', { habitId, dateOption });
    fetchAvailableSlots();
  }, [habitId, dateOption]);

  const fetchAvailableSlots = async () => {
    console.log('[TimeSlotPicker] fetchAvailableSlots called', { habitId, dateOption });
    setLoading(true);
    setError(null);

    try {
      // Calculate date range based on option
      const now = new Date();
      let date: string | undefined;
      let dateRangeStart: string | undefined;
      let dateRangeEnd: string | undefined;

      if (dateOption === 'today') {
        date = now.toISOString().split('T')[0];
      } else if (dateOption === 'tomorrow') {
        const tomorrow = new Date(now);
        tomorrow.setDate(tomorrow.getDate() + 1);
        date = tomorrow.toISOString().split('T')[0];
      } else if (dateOption === 'this-week') {
        const tomorrow = new Date(now);
        tomorrow.setDate(tomorrow.getDate() + 1);
        dateRangeStart = tomorrow.toISOString().split('T')[0];

        const endOfWeek = new Date(now);
        endOfWeek.setDate(endOfWeek.getDate() + 7);
        dateRangeEnd = endOfWeek.toISOString().split('T')[0];
      }

      const url = `/api/habits/${habitId}/available-slots`;
      const payload = {
        date,
        dateRangeStart,
        dateRangeEnd,
        maxSlotsPerDay: 5,
      };

      console.log('[TimeSlotPicker] Making API request', { url, payload });

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeaders(),
        },
        body: JSON.stringify(payload),
      });

      console.log('[TimeSlotPicker] Response received', { status: response.status, ok: response.ok });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Failed to fetch available slots');
      }

      const data = await response.json();
      console.log('[TimeSlotPicker] Data received', { slotsCount: data.slots?.length || 0, data });
      setSlots(data.slots || []);
      setHabitDuration(data.habitDuration || 30);
    } catch (err) {
      console.error('[TimeSlotPicker] Error fetching slots:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch available slots');
    } finally {
      setLoading(false);
      console.log('[TimeSlotPicker] Loading complete');
    }
  };

  const getTimeOfDayIcon = (timeOfDay: 'morning' | 'afternoon' | 'evening') => {
    switch (timeOfDay) {
      case 'morning':
        return '☀️';
      case 'afternoon':
        return '🌤️';
      case 'evening':
        return '🌙';
    }
  };

  const getTimeOfDayColor = (timeOfDay: 'morning' | 'afternoon' | 'evening') => {
    switch (timeOfDay) {
      case 'morning':
        return 'from-amber-50 to-yellow-50 border-amber-200 hover:border-amber-400';
      case 'afternoon':
        return 'from-blue-50 to-sky-50 border-blue-200 hover:border-blue-400';
      case 'evening':
        return 'from-indigo-50 to-purple-50 border-indigo-200 hover:border-indigo-400';
    }
  };

  const handleCustomTimeClick = (date: string) => {
    setCustomTimeDate(date);
    setCustomTimeValue('');
  };

  const handleCustomTimeSubmit = (date: string) => {
    if (!customTimeValue) return;

    // Parse the time (format: "HH:mm")
    const [hours, minutes] = customTimeValue.split(':').map(Number);

    // Create start datetime in ISO format
    const startDate = new Date(date + 'T00:00:00');
    startDate.setHours(hours, minutes, 0, 0);
    const startDateTime = startDate.toISOString();

    // Calculate end datetime based on habit duration
    const endDate = new Date(startDate);
    endDate.setMinutes(endDate.getMinutes() + habitDuration);
    const endDateTime = endDate.toISOString();

    // Determine time of day
    const timeOfDay: 'morning' | 'afternoon' | 'evening' =
      hours < 12 ? 'morning' : hours < 17 ? 'afternoon' : 'evening';

    // Format display time
    const formatTime = (d: Date) => {
      const h = d.getHours();
      const m = d.getMinutes();
      const ampm = h >= 12 ? 'PM' : 'AM';
      const displayHour = h % 12 || 12;
      const displayMin = m.toString().padStart(2, '0');
      return `${displayHour}:${displayMin} ${ampm}`;
    };

    const displayTime = `${formatTime(startDate)} - ${formatTime(endDate)}`;

    // Get day of week
    const dayOfWeek = startDate.toLocaleDateString('en-US', { weekday: 'long' });

    const customSlot: TimeSlot = {
      startDateTime,
      endDateTime,
      dayOfWeek,
      timeOfDay,
      displayTime,
    };

    onSelectSlot(customSlot);
  };

  const cancelCustomTime = () => {
    setCustomTimeDate(null);
    setCustomTimeValue('');
  };

  // Group slots by day
  const slotsByDay = slots.reduce((acc, slot) => {
    const date = slot.startDateTime.split('T')[0];
    if (!acc[date]) {
      acc[date] = [];
    }
    acc[date].push(slot);
    return acc;
  }, {} as Record<string, TimeSlot[]>);

  if (loading) {
    return (
      <div className="absolute top-full left-0 mt-2 w-96 bg-white rounded-xl shadow-2xl border-2 border-primary-200 z-50 p-6">
        <div className="flex flex-col items-center justify-center py-8">
          <LoadingSpinner size="lg" label="Finding time slots" />
          <p className="text-slate-600 font-medium mt-4">Finding available time slots…</p>
          <p className="text-sm text-slate-500 mt-1">Analyzing your calendar</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="absolute top-full left-0 mt-2 w-96 bg-white rounded-xl shadow-2xl border-2 border-red-200 z-50 p-6">
        <div className="text-center py-4">
          <div className="text-4xl mb-3">⚠️</div>
          <h3 className="text-lg font-semibold text-slate-900 mb-2">Could not find slots</h3>
          <p className="text-sm text-slate-600 mb-4">{error}</p>
          <div className="flex gap-2 justify-center">
            <button
              onClick={fetchAvailableSlots}
              className="px-4 py-2 bg-primary-600 text-white rounded-lg font-medium hover:bg-primary-700 transition-colors text-sm"
            >
              Try Again
            </button>
            <button
              onClick={onCancel}
              className="px-4 py-2 bg-slate-200 text-slate-700 rounded-lg font-medium hover:bg-slate-300 transition-colors text-sm"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (slots.length === 0) {
    return (
      <div className="absolute top-full left-0 mt-2 w-96 bg-white rounded-xl shadow-2xl border-2 border-amber-200 z-50 p-6">
        <div className="text-center py-4">
          <div className="text-4xl mb-3">📅</div>
          <h3 className="text-lg font-semibold text-slate-900 mb-2">No available slots</h3>
          <p className="text-sm text-slate-600 mb-4">
            Your calendar is fully booked for this time period. Try a different time range or clear some space.
          </p>
          <button
            onClick={onCancel}
            className="px-4 py-2 bg-slate-200 text-slate-700 rounded-lg font-medium hover:bg-slate-300 transition-colors text-sm"
          >
            Cancel
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="absolute top-full left-0 mt-2 w-96 bg-white rounded-xl shadow-2xl border-2 border-primary-200 z-50 overflow-hidden">
      {/* Header */}
      <div className="bg-gradient-to-r from-primary-50 to-blue-50 px-5 py-4 border-b-2 border-primary-200">
        <h3 className="font-bold text-slate-900 text-lg mb-1">Select Time Slot</h3>
        <p className="text-sm text-slate-600">
          {habitTitle} • {slots.length} available slot{slots.length !== 1 ? 's' : ''}
        </p>
      </div>

      {/* Slots grouped by day */}
      <div className="max-h-96 overflow-y-auto p-4 space-y-4">
        {Object.entries(slotsByDay).map(([date, daySlots]) => {
          const firstSlot = daySlots[0];
          // Parse date correctly to avoid timezone issues
          const today = new Date().toISOString().split('T')[0];
          const tomorrow = new Date(Date.now() + 86400000).toISOString().split('T')[0];

          const isToday = date === today;
          const isTomorrow = date === tomorrow;

          let dayLabel = firstSlot.dayOfWeek;
          if (isToday) dayLabel = 'Today';
          else if (isTomorrow) dayLabel = 'Tomorrow';

          // Parse date for display (add 'T12:00:00' to avoid timezone shift)
          const displayDate = new Date(date + 'T12:00:00');

          return (
            <div key={date}>
              <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-2 px-1">
                📅 {dayLabel}, {displayDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
              </h4>
              <div className="space-y-2">
                {daySlots.map((slot, index) => (
                  <button
                    key={`${date}-${index}`}
                    onClick={() => onSelectSlot(slot)}
                    className={`w-full p-3 rounded-lg border-2 bg-gradient-to-r ${getTimeOfDayColor(slot.timeOfDay)} transition-all duration-200 hover:shadow-md hover:-translate-y-0.5 text-left`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-2xl">{getTimeOfDayIcon(slot.timeOfDay)}</span>
                        <div>
                          <p className="font-semibold text-slate-900 text-sm">
                            {slot.displayTime}
                          </p>
                          <p className="text-xs text-slate-600 capitalize">
                            {slot.timeOfDay}
                          </p>
                        </div>
                      </div>
                      <svg className="w-5 h-5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </div>
                  </button>
                ))}

                {/* Custom Time Option */}
                {customTimeDate === date ? (
                  <div className="p-4 bg-gradient-to-r from-purple-50 to-pink-50 border-2 border-purple-300 rounded-lg">
                    <div className="flex items-center gap-2 mb-3">
                      <span className="text-2xl">🕐</span>
                      <h5 className="font-bold text-slate-900">Custom Time</h5>
                    </div>
                    <div className="space-y-3">
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">
                          Select start time:
                        </label>
                        <input
                          type="time"
                          value={customTimeValue}
                          onChange={(e) => setCustomTimeValue(e.target.value)}
                          className="w-full px-3 py-2 border-2 border-slate-300 rounded-lg focus:border-primary-500 focus:ring-2 focus:ring-primary-200 outline-none"
                        />
                        <p className="text-xs text-slate-500 mt-1">
                          Duration: {habitDuration} minutes
                        </p>
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleCustomTimeSubmit(date)}
                          disabled={!customTimeValue}
                          className={`flex-1 px-4 py-2 rounded-lg font-medium transition-colors ${
                            customTimeValue
                              ? 'bg-primary-600 text-white hover:bg-primary-700'
                              : 'bg-slate-200 text-slate-400 cursor-not-allowed'
                          }`}
                        >
                          Confirm
                        </button>
                        <button
                          onClick={cancelCustomTime}
                          className="px-4 py-2 bg-slate-200 text-slate-700 rounded-lg font-medium hover:bg-slate-300 transition-colors"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  </div>
                ) : (
                  <button
                    onClick={() => handleCustomTimeClick(date)}
                    className="w-full p-3 rounded-lg border-2 border-dashed border-slate-300 bg-white hover:bg-slate-50 hover:border-primary-400 transition-all duration-200 text-left"
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-2xl">🕐</span>
                      <div>
                        <p className="font-semibold text-slate-700 text-sm">
                          Custom Time
                        </p>
                        <p className="text-xs text-slate-500">
                          Choose your own time
                        </p>
                      </div>
                    </div>
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Footer */}
      <div className="bg-slate-50 px-5 py-3 border-t border-slate-200 flex justify-end">
        <button
          onClick={onCancel}
          className="px-4 py-2 text-sm text-slate-600 hover:text-slate-800 font-medium transition-colors"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}
