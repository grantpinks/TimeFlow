'use client';

import React from 'react';
import { useViewport } from '@/hooks/useViewport';

export interface MobileModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
}

/**
 * Modal that's full-screen on mobile, centered dialog on desktop
 */
export function MobileModal({ isOpen, onClose, title, children, footer }: MobileModalProps) {
  const { isMobile } = useViewport();

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 animate-fade-in"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Modal */}
      <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center p-0 md:p-4">
        <div
          className={`bg-white rounded-t-2xl md:rounded-2xl shadow-2xl w-full max-h-[90vh] md:max-h-[85vh] flex flex-col animate-slide-in ${
            isMobile ? 'h-[90vh]' : 'md:max-w-2xl'
          }`}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between gap-4 px-4 md:px-6 py-4 border-b border-slate-200 flex-shrink-0">
            <h2 className="text-xl md:text-2xl font-bold text-slate-900">{title}</h2>
            <button
              onClick={onClose}
              className="inline-flex items-center justify-center rounded-lg min-h-[44px] min-w-[44px] text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
              aria-label="Close modal"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto px-4 md:px-6 py-4">
            {children}
          </div>

          {/* Footer */}
          {footer && (
            <div className="flex-shrink-0 px-4 md:px-6 py-4 border-t border-slate-200 bg-slate-50">
              {footer}
            </div>
          )}
        </div>
      </div>
    </>
  );
}
