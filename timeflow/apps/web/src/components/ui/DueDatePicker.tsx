'use client';

import { useState, useEffect } from 'react';
import { Input } from './Input';
import { Label } from './Label';

interface DueDatePickerProps {
  value: string; // ISO date string (YYYY-MM-DD or YYYY-MM-DDTHH:mm)
  onChange: (value: string) => void;
}

type QuickOption = 'today' | 'tomorrow' | 'in-2-days' | 'end-of-week' | 'custom' | null;
type TimePreset = 'in-1-hour' | 'in-4-hours' | 'eod' | 'custom-time' | null;

export function DueDatePicker({ value, onChange }: DueDatePickerProps) {
  const [selectedOption, setSelectedOption] = useState<QuickOption>(null);
  const [showCustomPicker, setShowCustomPicker] = useState(false);
  const [customDate, setCustomDate] = useState('');
  const [selectedTime, setSelectedTime] = useState('09:00');
  const [timePreset, setTimePreset] = useState<TimePreset>(null);

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
      return;
    }

    setSelectedOption(option);
    setShowCustomPicker(false);
    setTimePreset(null); // Reset time preset when changing date option

    // For end-of-week, automatically set to 10pm Sunday
    if (option === 'end-of-week') {
      const now = new Date();
      const currentDay = now.getDay(); // 0 = Sunday, 6 = Saturday

      // Calculate days until next Sunday (0 = today if Sunday, 7 = next Sunday)
      const daysUntilSunday = currentDay === 0 ? 7 : (7 - currentDay);
      const targetDate = new Date(now);
      targetDate.setDate(targetDate.getDate() + daysUntilSunday);
      targetDate.setHours(22, 0, 0, 0);

      // Update selected time for display
      setSelectedTime('22:00');

      // Format as YYYY-MM-DDTHH:mm
      const isoString = targetDate.toISOString().slice(0, 16);
      onChange(isoString);
      return;
    }

    // Don't set a time immediately for other options - let user choose preset or custom time
  };

  const handleTimePreset = (preset: TimePreset) => {
    if (!selectedOption || selectedOption === 'custom') return;

    setTimePreset(preset);

    if (preset === 'custom-time') {
      // Just show the time input, don't update parent yet
      return;
    }

    const now = new Date();
    let targetDate: Date;

    // Calculate time based on preset
    switch (preset) {
      case 'in-1-hour':
        // Calculate from current time
        targetDate = new Date(now.getTime() + 60 * 60 * 1000); // Add 1 hour in milliseconds
        break;
      case 'in-4-hours':
        // Calculate from current time
        targetDate = new Date(now.getTime() + 4 * 60 * 60 * 1000); // Add 4 hours in milliseconds
        break;
      case 'eod':
        // End of day = 11:59 PM on the selected date
        targetDate = new Date(now);

        // Adjust date based on selected option
        switch (selectedOption) {
          case 'today':
            // Keep today
            break;
          case 'tomorrow':
            targetDate.setDate(targetDate.getDate() + 1);
            break;
          case 'in-2-days':
            targetDate.setDate(targetDate.getDate() + 2);
            break;
          case 'end-of-week':
            // Calculate days until next Sunday
            const currentDay = targetDate.getDay();
            const daysUntilSunday = currentDay === 0 ? 7 : (7 - currentDay);
            targetDate.setDate(targetDate.getDate() + daysUntilSunday);
            break;
        }

        targetDate.setHours(23, 59, 0, 0);
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
    onChange('');
  };

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => handleQuickOption('today')}
          className={`px-3 py-1.5 text-sm rounded-md transition-colors ${
            selectedOption === 'today'
              ? 'bg-primary-600 text-white'
              : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
          }`}
        >
          Today
        </button>
        <button
          type="button"
          onClick={() => handleQuickOption('tomorrow')}
          className={`px-3 py-1.5 text-sm rounded-md transition-colors ${
            selectedOption === 'tomorrow'
              ? 'bg-primary-600 text-white'
              : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
          }`}
        >
          Tomorrow
        </button>
        <button
          type="button"
          onClick={() => handleQuickOption('in-2-days')}
          className={`px-3 py-1.5 text-sm rounded-md transition-colors ${
            selectedOption === 'in-2-days'
              ? 'bg-primary-600 text-white'
              : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
          }`}
        >
          In 2 Days
        </button>
        <button
          type="button"
          onClick={() => handleQuickOption('end-of-week')}
          className={`px-3 py-1.5 text-sm rounded-md transition-colors ${
            selectedOption === 'end-of-week'
              ? 'bg-primary-600 text-white'
              : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
          }`}
        >
          End of Week
        </button>
        <button
          type="button"
          onClick={() => handleQuickOption('custom')}
          className={`px-3 py-1.5 text-sm rounded-md transition-colors ${
            selectedOption === 'custom'
              ? 'bg-primary-600 text-white'
              : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
          }`}
        >
          Custom
        </button>
        {value && (
          <button
            type="button"
            onClick={handleClear}
            className="px-3 py-1.5 text-sm rounded-md bg-red-50 text-red-600 hover:bg-red-100 transition-colors"
          >
            Clear
          </button>
        )}
      </div>

      {/* Time preset options for quick date selections */}
      {selectedOption && selectedOption !== 'custom' && (
        <div className="space-y-3 p-3 bg-slate-50 rounded-md border border-slate-200">
          <Label>Time</Label>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => handleTimePreset('in-1-hour')}
              className={`px-3 py-1.5 text-sm rounded-md transition-colors ${
                timePreset === 'in-1-hour'
                  ? 'bg-primary-600 text-white'
                  : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-300'
              }`}
            >
              In 1 Hour
            </button>
            <button
              type="button"
              onClick={() => handleTimePreset('in-4-hours')}
              className={`px-3 py-1.5 text-sm rounded-md transition-colors ${
                timePreset === 'in-4-hours'
                  ? 'bg-primary-600 text-white'
                  : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-300'
              }`}
            >
              In 4 Hours
            </button>
            <button
              type="button"
              onClick={() => handleTimePreset('eod')}
              className={`px-3 py-1.5 text-sm rounded-md transition-colors ${
                timePreset === 'eod'
                  ? 'bg-primary-600 text-white'
                  : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-300'
              }`}
            >
              End of Day
            </button>
            <button
              type="button"
              onClick={() => handleTimePreset('custom-time')}
              className={`px-3 py-1.5 text-sm rounded-md transition-colors ${
                timePreset === 'custom-time'
                  ? 'bg-primary-600 text-white'
                  : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-300'
              }`}
            >
              Custom Time
            </button>
          </div>

          {/* Show time input only when Custom Time is selected */}
          {timePreset === 'custom-time' && (
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
        <div className="space-y-3 p-3 bg-slate-50 rounded-md border border-slate-200">
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
            <Input
              type="time"
              value={selectedTime}
              onChange={(e) => handleTimeChange(e.target.value)}
            />
          </div>
        </div>
      )}
    </div>
  );
}
