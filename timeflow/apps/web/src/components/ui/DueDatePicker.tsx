'use client';

import { useState, useEffect } from 'react';
import { Input } from './Input';
import { Label } from './Label';
import { CalendarSlotPickerModal } from '@/components/scheduling/CalendarSlotPickerModal';

interface DueDatePickerProps {
  value: string; // ISO date string (YYYY-MM-DD or YYYY-MM-DDTHH:mm)
  onChange: (value: string) => void;
  /** When set with `enableCalendarPicker`, opens a calendar grid for custom time instead of a plain time input. */
  durationMinutes?: number;
  enableCalendarPicker?: boolean;
}

type QuickOption = 'today' | 'tomorrow' | 'in-2-days' | 'end-of-week' | 'custom' | null;
type TimePreset =
  | 'in-1-hour'
  | 'in-4-hours'
  | 'eod'
  | 'at-9am'
  | 'at-12pm'
  | 'at-6pm'
  | 'at-9pm'
  | 'custom-time'
  | null;

export function DueDatePicker({
  value,
  onChange,
  durationMinutes = 30,
  enableCalendarPicker = false,
}: DueDatePickerProps) {
  const [selectedOption, setSelectedOption] = useState<QuickOption>(null);
  const [showCustomPicker, setShowCustomPicker] = useState(false);
  const [customDate, setCustomDate] = useState('');
  const [selectedTime, setSelectedTime] = useState('09:00');
  const [timePreset, setTimePreset] = useState<TimePreset>(null);
  const [showCalendarPicker, setShowCalendarPicker] = useState(false);

  /** Non-today quick dates use fixed clock times instead of "in X hours". */
  const useFixedClockPresets =
    selectedOption === 'tomorrow' ||
    selectedOption === 'in-2-days' ||
    selectedOption === 'end-of-week';

  const buildBaseDateForOption = (
    option: Exclude<QuickOption, 'custom' | null>,
    ref: Date
  ): Date => {
    const d = new Date(ref);
    d.setSeconds(0, 0);
    d.setMilliseconds(0);
    if (option === 'today') {
      return d;
    }
    d.setHours(0, 0, 0, 0);
    switch (option) {
      case 'tomorrow':
        d.setDate(d.getDate() + 1);
        break;
      case 'in-2-days':
        d.setDate(d.getDate() + 2);
        break;
      case 'end-of-week': {
        const currentDay = d.getDay();
        const daysUntilSunday = currentDay === 0 ? 7 : 7 - currentDay;
        d.setDate(d.getDate() + daysUntilSunday);
        break;
      }
    }
    return d;
  };

  // Determine which quick option matches the current value
  useEffect(() => {
    if (!value) {
      setSelectedOption(null);
      setShowCustomPicker(false);
      return;
    }

    const valueDate = new Date(value);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const inTwoDays = new Date(today);
    inTwoDays.setDate(inTwoDays.getDate() + 2);

    // Calculate next Sunday
    const currentDay = today.getDay();
    const daysUntilSunday = currentDay === 0 ? 7 : (7 - currentDay);
    const nextSunday = new Date(today);
    nextSunday.setDate(nextSunday.getDate() + daysUntilSunday);

    const valueDateOnly = new Date(valueDate);
    valueDateOnly.setHours(0, 0, 0, 0);

    // Extract time from value
    if (value.includes('T')) {
      const timeStr = value.slice(11, 16);
      setSelectedTime(timeStr);
    }

    if (valueDateOnly.getTime() === today.getTime()) {
      setSelectedOption('today');
      setShowCustomPicker(false);
    } else if (valueDateOnly.getTime() === tomorrow.getTime()) {
      setSelectedOption('tomorrow');
      setShowCustomPicker(false);
    } else if (valueDateOnly.getTime() === inTwoDays.getTime()) {
      setSelectedOption('in-2-days');
      setShowCustomPicker(false);
    } else if (valueDateOnly.getTime() === nextSunday.getTime()) {
      setSelectedOption('end-of-week');
      setShowCustomPicker(false);
    } else {
      setSelectedOption('custom');
      setShowCustomPicker(true);
      // Parse custom date from value
      const dateStr = value.slice(0, 10);
      setCustomDate(dateStr);
    }
  }, [value]);

  const handleQuickOption = (option: QuickOption) => {
    if (option === 'custom') {
      setSelectedOption('custom');
      setShowCustomPicker(true);
      setTimePreset(null);
      setShowCalendarPicker(false);
      return;
    }

    setSelectedOption(option);
    setShowCustomPicker(false);
    setTimePreset(null); // Reset time preset when changing date option
    setShowCalendarPicker(false);
  };

  const handleTimePreset = (preset: TimePreset) => {
    if (!selectedOption || selectedOption === 'custom') return;

    setTimePreset(preset);

    if (preset === 'custom-time') {
      if (enableCalendarPicker) {
        setShowCalendarPicker(true);
      }
      // Without calendar picker: show the time input only (below)
      return;
    }

    const now = new Date();
    let targetDate: Date;

    // Calculate time based on preset
    switch (preset) {
      case 'in-1-hour':
        if (selectedOption !== 'today') return;
        targetDate = new Date(now.getTime() + 60 * 60 * 1000);
        break;
      case 'in-4-hours':
        if (selectedOption !== 'today') return;
        targetDate = new Date(now.getTime() + 4 * 60 * 60 * 1000);
        break;
      case 'eod':
        if (selectedOption !== 'today') return;
        targetDate = new Date(now);
        targetDate.setHours(23, 59, 0, 0);
        break;
      case 'at-9am':
        targetDate = buildBaseDateForOption(selectedOption, now);
        targetDate.setHours(9, 0, 0, 0);
        break;
      case 'at-12pm':
        targetDate = buildBaseDateForOption(selectedOption, now);
        targetDate.setHours(12, 0, 0, 0);
        break;
      case 'at-6pm':
        targetDate = buildBaseDateForOption(selectedOption, now);
        targetDate.setHours(18, 0, 0, 0);
        break;
      case 'at-9pm':
        targetDate = buildBaseDateForOption(selectedOption, now);
        targetDate.setHours(21, 0, 0, 0);
        break;
      default:
        return;
    }

    // Update selected time for display
    const hours = targetDate.getHours().toString().padStart(2, '0');
    const minutes = targetDate.getMinutes().toString().padStart(2, '0');
    setSelectedTime(`${hours}:${minutes}`);

    // Format as YYYY-MM-DDTHH:mm
    const isoString = targetDate.toISOString().slice(0, 16);
    onChange(isoString);
  };

  const handleTimeChange = (newTime: string) => {
    setSelectedTime(newTime);

    // Only update parent if time is complete (HH:mm format - 5 characters)
    if (newTime.length !== 5 || !newTime.includes(':')) {
      return; // Wait for complete time input
    }

    if (!selectedOption || selectedOption === 'custom') {
      // For custom, the date picker will handle the update
      if (customDate) {
        const dateTime = `${customDate}T${newTime}`;
        onChange(dateTime);
      }
      return;
    }

    // For quick options, recalculate the date with new time
    const today = new Date();
    const [hours, minutes] = newTime.split(':').map(Number);

    // Validate hours and minutes
    if (isNaN(hours) || isNaN(minutes) || hours < 0 || hours > 23 || minutes < 0 || minutes > 59) {
      return; // Invalid time, don't update
    }

    today.setHours(hours, minutes, 0, 0);

    let targetDate: Date;

    switch (selectedOption) {
      case 'today':
        targetDate = today;
        break;
      case 'tomorrow':
        targetDate = new Date(today);
        targetDate.setDate(targetDate.getDate() + 1);
        break;
      case 'in-2-days':
        targetDate = new Date(today);
        targetDate.setDate(targetDate.getDate() + 2);
        break;
      case 'end-of-week': {
        const currentDay = today.getDay();
        const daysUntilSunday = currentDay === 0 ? 7 : 7 - currentDay;
        targetDate = new Date(today);
        targetDate.setDate(targetDate.getDate() + daysUntilSunday);
        break;
      }
      default:
        return;
    }

    const isoString = targetDate.toISOString().slice(0, 16);
    onChange(isoString);
  };

  const handleClear = () => {
    setSelectedOption(null);
    setShowCustomPicker(false);
    setCustomDate('');
    setSelectedTime('09:00');
    setTimePreset(null);
    setShowCalendarPicker(false);
    onChange('');
  };

  const calendarInitialDate = (): Date | undefined => {
    if (showCustomPicker && customDate) {
      return new Date(customDate + 'T12:00:00');
    }
    if (value) {
      const d = new Date(value);
      return Number.isNaN(d.getTime()) ? undefined : d;
    }
    return undefined;
  };

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => handleQuickOption('today')}
          className={`px-4 py-2 text-sm font-medium rounded-xl transition-all duration-200 ${
            selectedOption === 'today'
              ? 'bg-gradient-to-r from-primary-500 to-primary-600 text-white shadow-md shadow-primary-500/30 scale-105'
              : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-gradient-to-r hover:from-primary-50 hover:to-cyan-50 dark:hover:from-primary-900/20 dark:hover:to-cyan-900/20 border border-slate-200 dark:border-slate-700 hover:border-primary-300 dark:hover:border-primary-600'
          }`}
        >
          Today
        </button>
        <button
          type="button"
          onClick={() => handleQuickOption('tomorrow')}
          className={`px-4 py-2 text-sm font-medium rounded-xl transition-all duration-200 ${
            selectedOption === 'tomorrow'
              ? 'bg-gradient-to-r from-primary-500 to-primary-600 text-white shadow-md shadow-primary-500/30 scale-105'
              : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-gradient-to-r hover:from-primary-50 hover:to-cyan-50 dark:hover:from-primary-900/20 dark:hover:to-cyan-900/20 border border-slate-200 dark:border-slate-700 hover:border-primary-300 dark:hover:border-primary-600'
          }`}
        >
          Tomorrow
        </button>
        <button
          type="button"
          onClick={() => handleQuickOption('in-2-days')}
          className={`px-4 py-2 text-sm font-medium rounded-xl transition-all duration-200 ${
            selectedOption === 'in-2-days'
              ? 'bg-gradient-to-r from-primary-500 to-primary-600 text-white shadow-md shadow-primary-500/30 scale-105'
              : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-gradient-to-r hover:from-primary-50 hover:to-cyan-50 dark:hover:from-primary-900/20 dark:hover:to-cyan-900/20 border border-slate-200 dark:border-slate-700 hover:border-primary-300 dark:hover:border-primary-600'
          }`}
        >
          In 2 Days
        </button>
        <button
          type="button"
          onClick={() => handleQuickOption('end-of-week')}
          className={`px-4 py-2 text-sm font-medium rounded-xl transition-all duration-200 ${
            selectedOption === 'end-of-week'
              ? 'bg-gradient-to-r from-primary-500 to-primary-600 text-white shadow-md shadow-primary-500/30 scale-105'
              : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-gradient-to-r hover:from-primary-50 hover:to-cyan-50 dark:hover:from-primary-900/20 dark:hover:to-cyan-900/20 border border-slate-200 dark:border-slate-700 hover:border-primary-300 dark:hover:border-primary-600'
          }`}
        >
          End of Week
        </button>
        <button
          type="button"
          onClick={() => handleQuickOption('custom')}
          className={`px-4 py-2 text-sm font-medium rounded-xl transition-all duration-200 ${
            selectedOption === 'custom'
              ? 'bg-gradient-to-r from-primary-500 to-primary-600 text-white shadow-md shadow-primary-500/30 scale-105'
              : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-gradient-to-r hover:from-primary-50 hover:to-cyan-50 dark:hover:from-primary-900/20 dark:hover:to-cyan-900/20 border border-slate-200 dark:border-slate-700 hover:border-primary-300 dark:hover:border-primary-600'
          }`}
        >
          Custom
        </button>
        {value && (
          <button
            type="button"
            onClick={handleClear}
            className="px-4 py-2 text-sm font-medium rounded-xl bg-white dark:bg-slate-800 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 border border-red-200 dark:border-red-800 hover:border-red-300 dark:hover:border-red-600 transition-all duration-200"
          >
            Clear
          </button>
        )}
      </div>

      {/* Time preset options for quick date selections */}
      {selectedOption && selectedOption !== 'custom' && (
        <div className="space-y-3 p-4 bg-gradient-to-br from-slate-50 to-primary-50/20 dark:from-slate-900/50 dark:to-primary-900/10 rounded-xl border border-slate-200/50 dark:border-slate-700/50">
          <Label>Time</Label>
          <div className="flex flex-wrap gap-2">
            {useFixedClockPresets ? (
              <>
                <button
                  type="button"
                  onClick={() => handleTimePreset('at-9am')}
                  className={`px-3 py-1.5 text-sm font-medium rounded-lg transition-all duration-200 ${
                    timePreset === 'at-9am'
                      ? 'bg-gradient-to-r from-cyan-500 to-blue-500 text-white shadow-md shadow-cyan-500/30'
                      : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-cyan-50 dark:hover:bg-cyan-900/20 border border-slate-200 dark:border-slate-700'
                  }`}
                >
                  9:00 AM
                </button>
                <button
                  type="button"
                  onClick={() => handleTimePreset('at-12pm')}
                  className={`px-3 py-1.5 text-sm font-medium rounded-lg transition-all duration-200 ${
                    timePreset === 'at-12pm'
                      ? 'bg-gradient-to-r from-cyan-500 to-blue-500 text-white shadow-md shadow-cyan-500/30'
                      : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-cyan-50 dark:hover:bg-cyan-900/20 border border-slate-200 dark:border-slate-700'
                  }`}
                >
                  12:00 PM
                </button>
                <button
                  type="button"
                  onClick={() => handleTimePreset('at-6pm')}
                  className={`px-3 py-1.5 text-sm font-medium rounded-lg transition-all duration-200 ${
                    timePreset === 'at-6pm'
                      ? 'bg-gradient-to-r from-cyan-500 to-blue-500 text-white shadow-md shadow-cyan-500/30'
                      : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-cyan-50 dark:hover:bg-cyan-900/20 border border-slate-200 dark:border-slate-700'
                  }`}
                >
                  6:00 PM
                </button>
                <button
                  type="button"
                  onClick={() => handleTimePreset('at-9pm')}
                  className={`px-3 py-1.5 text-sm font-medium rounded-lg transition-all duration-200 ${
                    timePreset === 'at-9pm'
                      ? 'bg-gradient-to-r from-cyan-500 to-blue-500 text-white shadow-md shadow-cyan-500/30'
                      : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-cyan-50 dark:hover:bg-cyan-900/20 border border-slate-200 dark:border-slate-700'
                  }`}
                >
                  9:00 PM
                </button>
              </>
            ) : (
              <>
                <button
                  type="button"
                  onClick={() => handleTimePreset('in-1-hour')}
                  className={`px-3 py-1.5 text-sm font-medium rounded-lg transition-all duration-200 ${
                    timePreset === 'in-1-hour'
                      ? 'bg-gradient-to-r from-cyan-500 to-blue-500 text-white shadow-md shadow-cyan-500/30'
                      : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-cyan-50 dark:hover:bg-cyan-900/20 border border-slate-200 dark:border-slate-700'
                  }`}
                >
                  In 1 Hour
                </button>
                <button
                  type="button"
                  onClick={() => handleTimePreset('in-4-hours')}
                  className={`px-3 py-1.5 text-sm font-medium rounded-lg transition-all duration-200 ${
                    timePreset === 'in-4-hours'
                      ? 'bg-gradient-to-r from-cyan-500 to-blue-500 text-white shadow-md shadow-cyan-500/30'
                      : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-cyan-50 dark:hover:bg-cyan-900/20 border border-slate-200 dark:border-slate-700'
                  }`}
                >
                  In 4 Hours
                </button>
                <button
                  type="button"
                  onClick={() => handleTimePreset('eod')}
                  className={`px-3 py-1.5 text-sm font-medium rounded-lg transition-all duration-200 ${
                    timePreset === 'eod'
                      ? 'bg-gradient-to-r from-cyan-500 to-blue-500 text-white shadow-md shadow-cyan-500/30'
                      : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-cyan-50 dark:hover:bg-cyan-900/20 border border-slate-200 dark:border-slate-700'
                  }`}
                >
                  End of Day
                </button>
              </>
            )}
            <button
              type="button"
              onClick={() => handleTimePreset('custom-time')}
              className={`px-3 py-1.5 text-sm font-medium rounded-lg transition-all duration-200 ${
                timePreset === 'custom-time'
                  ? 'bg-gradient-to-r from-cyan-500 to-blue-500 text-white shadow-md shadow-cyan-500/30'
                  : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-cyan-50 dark:hover:bg-cyan-900/20 border border-slate-200 dark:border-slate-700'
              }`}
            >
              Custom Time
            </button>
          </div>

          {/* Show time input only when Custom Time is selected */}
          {timePreset === 'custom-time' && !enableCalendarPicker && (
            <div className="mt-3">
              <Input
                type="time"
                value={selectedTime}
                onChange={(e) => handleTimeChange(e.target.value)}
              />
            </div>
          )}
        </div>
      )}

      {/* Custom date and time picker */}
      {showCustomPicker && (
        <div className="space-y-3 p-4 bg-gradient-to-br from-slate-50 to-primary-50/20 dark:from-slate-900/50 dark:to-primary-900/10 rounded-xl border border-slate-200/50 dark:border-slate-700/50">
          <div>
            <Label>Date</Label>
            <Input
              type="date"
              value={customDate}
              onChange={(e) => {
                setCustomDate(e.target.value);
                // Auto-update when date changes
                if (e.target.value) {
                  const dateTime = `${e.target.value}T${selectedTime}`;
                  onChange(dateTime);
                }
              }}
            />
          </div>
          <div>
            <Label>Time</Label>
            {!enableCalendarPicker ? (
              <Input
                type="time"
                value={selectedTime}
                onChange={(e) => handleTimeChange(e.target.value)}
              />
            ) : (
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setShowCalendarPicker(true)}
                  className="flex-shrink-0 p-2.5 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-primary-600 dark:text-primary-400 hover:bg-gradient-to-br hover:from-primary-50 hover:to-cyan-50 dark:hover:from-primary-900/20 dark:hover:to-cyan-900/20 hover:border-primary-400 dark:hover:border-primary-500 transition-all duration-200 shadow-sm hover:shadow-md"
                  title="Pick from calendar"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                </button>
                <Input
                  className="flex-1"
                  type="time"
                  value={selectedTime}
                  onChange={(e) => handleTimeChange(e.target.value)}
                />
              </div>
            )}
          </div>
        </div>
      )}

      {enableCalendarPicker && (
        <CalendarSlotPickerModal
          isOpen={showCalendarPicker}
          title="Due date & time"
          durationMinutes={durationMinutes}
          initialDate={calendarInitialDate()}
          onClose={() => setShowCalendarPicker(false)}
          onSelect={(start, _end) => {
            const hours = start.getHours().toString().padStart(2, '0');
            const minutes = start.getMinutes().toString().padStart(2, '0');
            const y = start.getFullYear();
            const m = (start.getMonth() + 1).toString().padStart(2, '0');
            const d = start.getDate().toString().padStart(2, '0');
            setSelectedTime(`${hours}:${minutes}`);
            if (showCustomPicker) {
              setCustomDate(`${y}-${m}-${d}`);
            }
            const isoString = start.toISOString().slice(0, 16);
            onChange(isoString);
            setTimePreset('custom-time');
            setShowCalendarPicker(false);
          }}
        />
      )}
    </div>
  );
}
