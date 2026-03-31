/**
 * ColorPicker Component
 *
 * Allows users to select from preset colors or enter a custom hex color.
 */

'use client';

import { useState } from 'react';

// Gmail-compatible color palette (matches GmailColorPicker)
const PRESET_COLORS = [
  '#cfe2f3', // light blue
  '#d9ead3', // light green
  '#fff2cc', // light yellow
  '#fce5cd', // light orange
  '#f4cccc', // light red
  '#d9d2e9', // light purple
  '#d0e0e3', // light teal
  '#ead1dc', // light pink
  '#c9daf8', // medium blue
  '#b6d7a8', // medium green
  '#ffe599', // medium yellow
  '#f9cb9c', // medium orange
  '#ea9999', // medium red
  '#b4a7d6', // medium purple
  '#a2c4c9', // medium teal
  '#d5a6bd', // medium pink
  '#9fc5e8', // dark blue
  '#93c47d', // dark green
  '#ffd966', // dark yellow
  '#f6b26b', // dark orange
  '#e06666', // dark red
  '#8e7cc3', // dark purple
  '#76a5af', // dark teal
  '#c27ba0', // dark pink
  '#a4c2f4', // bright blue
];

interface ColorPickerProps {
  value: string;
  onChange: (color: string) => void;
}

export default function ColorPicker({ value, onChange }: ColorPickerProps) {
  const [showCustom, setShowCustom] = useState(false);

  return (
    <div className="space-y-2">
      <div className="grid grid-cols-5 sm:grid-cols-6 gap-2 sm:gap-2.5">
        {PRESET_COLORS.map((color) => (
          <button
            key={color}
            type="button"
            onClick={() => onChange(color)}
            className={`w-12 h-12 sm:w-11 sm:h-11 min-h-[48px] min-w-[48px] sm:min-h-[44px] sm:min-w-[44px] rounded-lg border-2 transition-all active:scale-95 ${
              value === color
                ? 'border-slate-900 ring-2 ring-slate-300'
                : 'border-slate-200 hover:border-slate-400 active:border-slate-500'
            }`}
            style={{ backgroundColor: color }}
            title={color}
            aria-label={`Select color ${color}`}
          />
        ))}
      </div>

      <button
        type="button"
        onClick={() => setShowCustom(!showCustom)}
        className="text-sm text-primary-600 hover:text-primary-700 active:text-primary-800 min-h-[44px] inline-flex items-center"
      >
        {showCustom ? 'Hide' : 'Show'} custom color
      </button>

      {showCustom && (
        <div className="flex items-center gap-2">
          <input
            type="color"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            className="w-16 h-12 min-h-[48px] rounded-lg border border-slate-300"
          />
          <input
            type="text"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder="#000000"
            className="flex-1 px-4 py-3 min-h-[44px] text-base border border-slate-300 rounded-lg"
          />
        </div>
      )}
    </div>
  );
}
