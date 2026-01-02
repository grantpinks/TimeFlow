'use client';

import React from 'react';
import { motion } from 'framer-motion';

export interface GmailColor {
  backgroundColor: string;
  textColor: string;
}

const GMAIL_BACKGROUND_COLORS = [
  '#e7e7e7',
  '#b6cff5',
  '#98d7e4',
  '#e3d7ff',
  '#fbd3e0',
  '#f2b2a8',
  '#c2c2c2',
  '#4986e7',
  '#2da2bb',
  '#b99aff',
  '#f691b2',
  '#fb4c2f',
  '#ffc8af',
  '#ffdeb5',
  '#fbe983',
  '#fdedc1',
  '#b3efd3',
  '#a2dcc1',
  '#ff7537',
  '#ffad46',
  '#ebdbde',
  '#cca6ac',
  '#42d692',
  '#16a765',
];

function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result
    ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16),
      }
    : null;
}

function getReadableTextColor(backgroundColor: string): string {
  const rgb = hexToRgb(backgroundColor);
  if (!rgb) return '#000000';
  const luminance = (0.299 * rgb.r + 0.587 * rgb.g + 0.114 * rgb.b) / 255;
  return luminance > 0.6 ? '#000000' : '#ffffff';
}

const GMAIL_COLORS: GmailColor[] = GMAIL_BACKGROUND_COLORS.map((backgroundColor) => ({
  backgroundColor,
  textColor: getReadableTextColor(backgroundColor),
}));

interface GmailColorPickerProps {
  selectedColor: string | null;
  onColorSelect: (color: GmailColor) => void;
  autoMappedColor?: GmailColor;
}

export default function GmailColorPicker({
  selectedColor,
  onColorSelect,
  autoMappedColor,
}: GmailColorPickerProps) {
  return (
    <div className="space-y-4">
      {autoMappedColor && (
        <div className="bg-slate-50 rounded-lg p-4 border border-slate-200">
          <div className="text-sm font-medium text-slate-600 mb-2">
            Auto-mapped Gmail color:
          </div>
          <div className="flex items-center gap-3">
            <div
              className="w-12 h-12 rounded-md border-2 border-slate-200"
              style={{ backgroundColor: autoMappedColor.backgroundColor }}
            />
            <div className="text-xs text-slate-500">
              {autoMappedColor.backgroundColor}
            </div>
          </div>
        </div>
      )}

      <div>
        <div className="text-sm font-medium text-slate-600 mb-3">
          {autoMappedColor ? 'Override with a different color:' : 'Select Gmail label color:'}
        </div>

        <div className="grid grid-cols-5 gap-3">
          {GMAIL_COLORS.map((color, index) => {
            const isSelected = selectedColor === color.backgroundColor;
            const isAutoMapped = autoMappedColor?.backgroundColor === color.backgroundColor;

            return (
              <motion.button
                key={index}
                type="button"
                onClick={() => onColorSelect(color)}
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.95 }}
                className={`
                  w-full aspect-square rounded-md relative
                  transition-all duration-200
                  ${isSelected ? 'ring-4 ring-emerald-500 ring-offset-2' : 'ring-2 ring-slate-200'}
                  ${isAutoMapped && !isSelected ? 'ring-2 ring-emerald-400/60 ring-offset-1' : ''}
                `}
                style={{ backgroundColor: color.backgroundColor }}
                aria-label={`Select color ${color.backgroundColor}`}
              >
                {isSelected && (
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    className="absolute inset-0 flex items-center justify-center"
                  >
                    <svg
                      className="w-6 h-6"
                      fill="none"
                      stroke={color.textColor}
                      strokeWidth={3}
                      viewBox="0 0 24 24"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                  </motion.div>
                )}
                {isAutoMapped && !isSelected && (
                  <div className="absolute -top-1 -right-1 w-3 h-3 bg-emerald-500 rounded-full border-2 border-white" />
                )}
              </motion.button>
            );
          })}
        </div>
      </div>

      {selectedColor && (
        <div className="text-xs text-slate-500 text-center">
          Selected: {selectedColor}
        </div>
      )}
    </div>
  );
}
