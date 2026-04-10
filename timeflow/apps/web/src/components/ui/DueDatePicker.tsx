'use client';

import { useState, useEffect } from 'react';
import { Input } from './Input';
import { Label } from './Label';

interface DueDatePickerProps {
  value: string; // ISO date string (YYYY-MM-DD or YYYY-MM-DDTHH:mm)
  onChange: (value: string) => void;
}

type QuickOption = 'today' | 'tomorrow' | 'in-2-days' | 'custom' | null;

export function DueDatePicker({ value, onChange }: DueDatePickerProps) {
  const [selectedOption, setSelectedOption] = useState<QuickOption>(null);
  const [showCustomPicker, setShowCustomPicker] = useState(false);
  const [customDate, setCustomDate] = useState('');
  const [customTime, setCustomTime] = useState('09:00');

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

    const valueDateOnly = new Date(valueDate);
    valueDateOnly.setHours(0, 0, 0, 0);

    if (valueDateOnly.getTime() === today.getTime()) {
      setSelectedOption('today');
      setShowCustomPicker(false);
    } else if (valueDateOnly.getTime() === tomorrow.getTime()) {
      setSelectedOption('tomorrow');
      setShowCustomPicker(false);
    } else if (valueDateOnly.getTime() === inTwoDays.getTime()) {
      setSelectedOption('in-2-days');
      setShowCustomPicker(false);
    } else {
      setSelectedOption('custom');
      setShowCustomPicker(true);
      // Parse custom date/time from value
      const dateStr = value.slice(0, 10);
      setCustomDate(dateStr);
      if (value.includes('T')) {
        const timeStr = value.slice(11, 16);
        setCustomTime(timeStr);
      }
    }
  }, [value]);

  const handleQuickOption = (option: QuickOption) => {
    const today = new Date();
    today.setHours(9, 0, 0, 0); // Default to 9 AM

    let targetDate: Date;

    switch (option) {
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
      case 'custom':
        setSelectedOption('custom');
        setShowCustomPicker(true);
        return;
      default:
        return;
    }

    setSelectedOption(option);
    setShowCustomPicker(false);
    // Format as YYYY-MM-DDTHH:mm
    const isoString = targetDate.toISOString().slice(0, 16);
    onChange(isoString);
  };

  const handleClear = () => {
    setSelectedOption(null);
    setShowCustomPicker(false);
    setCustomDate('');
    setCustomTime('09:00');
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
                  const dateTime = `${e.target.value}T${customTime}`;
                  onChange(dateTime);
                }
              }}
            />
          </div>
          <div>
            <Label>Time</Label>
            <Input
              type="time"
              value={customTime}
              onChange={(e) => {
                setCustomTime(e.target.value);
                // Auto-update when time changes
                if (customDate) {
                  const dateTime = `${customDate}T${e.target.value}`;
                  onChange(dateTime);
                }
              }}
            />
          </div>
        </div>
      )}
    </div>
  );
}
