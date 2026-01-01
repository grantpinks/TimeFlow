'use client';

import React from 'react';
import { motion } from 'framer-motion';

export interface GmailColor {
  backgroundColor: string;
  textColor: string;
}

const GMAIL_COLORS: GmailColor[] = [
  { backgroundColor: '#cfe2f3', textColor: '#0b5394' },
  { backgroundColor: '#d9ead3', textColor: '#38761d' },
  { backgroundColor: '#fff2cc', textColor: '#7f6000' },
  { backgroundColor: '#fce5cd', textColor: '#b45f06' },
  { backgroundColor: '#f4cccc', textColor: '#990000' },
  { backgroundColor: '#d9d2e9', textColor: '#674ea7' },
  { backgroundColor: '#d0e0e3', textColor: '#0c343d' },
  { backgroundColor: '#ead1dc', textColor: '#783f04' },
  { backgroundColor: '#c9daf8', textColor: '#1155cc' },
  { backgroundColor: '#b6d7a8', textColor: '#274e13' },
  { backgroundColor: '#ffe599', textColor: '#bf9000' },
  { backgroundColor: '#f9cb9c', textColor: '#b45f06' },
  { backgroundColor: '#ea9999', textColor: '#990000' },
  { backgroundColor: '#b4a7d6', textColor: '#351c75' },
  { backgroundColor: '#a2c4c9', textColor: '#0c343d' },
  { backgroundColor: '#d5a6bd', textColor: '#783f04' },
  { backgroundColor: '#9fc5e8', textColor: '#0b5394' },
  { backgroundColor: '#93c47d', textColor: '#38761d' },
  { backgroundColor: '#ffd966', textColor: '#7f6000' },
  { backgroundColor: '#f6b26b', textColor: '#b45f06' },
  { backgroundColor: '#e06666', textColor: '#990000' },
  { backgroundColor: '#8e7cc3', textColor: '#351c75' },
  { backgroundColor: '#76a5af', textColor: '#0c343d' },
  { backgroundColor: '#c27ba0', textColor: '#783f04' },
  { backgroundColor: '#a4c2f4', textColor: '#0b5394' },
];

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
