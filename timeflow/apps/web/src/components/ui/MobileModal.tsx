'use client';

import React, { useEffect, useRef, createContext, useContext } from 'react';
import { useViewport } from '@/hooks/useViewport';

export interface MobileModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
}

// Context for managing z-index stacking when multiple modals are open
const ModalStackContext = createContext({ zIndex: 50 });

/**
 * Modal that's full-screen on mobile, centered dialog on desktop
 *
 * Features:
 * - Focus trap for accessibility
 * - Body scroll lock on mobile
 * - Escape key to close
 * - Click outside to close
 * - Modal stacking support
 */
export function MobileModal({ isOpen, onClose, title, children, footer }: MobileModalProps) {
  const { isMobile } = useViewport();
  const modalRef = useRef<HTMLDivElement>(null);
  const { zIndex } = useContext(ModalStackContext);
  const nextZIndex = zIndex + 10;

  // Focus trap and keyboard handling
  useEffect(() => {
    if (!isOpen) return;

    // Save currently focused element
    const previouslyFocused = document.activeElement as HTMLElement;

    // Focus modal on open
    const timer = setTimeout(() => {
      modalRef.current?.focus();
    }, 100);

    // Handle Escape key
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    // Handle Tab key for focus trap
    const handleTab = (e: KeyboardEvent) => {
      if (e.key !== 'Tab') return;

      const focusableElements = modalRef.current?.querySelectorAll(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      );
      if (!focusableElements?.length) return;

      const firstElement = focusableElements[0] as HTMLElement;
      const lastElement = focusableElements[focusableElements.length - 1] as HTMLElement;

      if (e.shiftKey && document.activeElement === firstElement) {
        e.preventDefault();
        lastElement.focus();
      } else if (!e.shiftKey && document.activeElement === lastElement) {
        e.preventDefault();
        firstElement.focus();
      }
    };

    document.addEventListener('keydown', handleEscape);
    document.addEventListener('keydown', handleTab);

    return () => {
      clearTimeout(timer);
      document.removeEventListener('keydown', handleEscape);
      document.removeEventListener('keydown', handleTab);
      previouslyFocused?.focus();
    };
  }, [isOpen, onClose]);

  // Body scroll lock (mobile only to avoid desktop issues)
  useEffect(() => {
    if (!isOpen || !isMobile) return;

    // Save current scroll position
    const scrollY = window.scrollY;
    const body = document.body;

    // Lock body scroll
    body.style.position = 'fixed';
    body.style.top = `-${scrollY}px`;
    body.style.width = '100%';

    return () => {
      // Restore body scroll
      body.style.position = '';
      body.style.top = '';
      body.style.width = '';
      window.scrollTo(0, scrollY);
    };
  }, [isOpen, isMobile]);

  if (!isOpen) return null;

  return (
    <ModalStackContext.Provider value={{ zIndex: nextZIndex }}>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm animate-fade-in"
        style={{ zIndex }}
        onClick={(e) => {
          // Only close if clicking the backdrop itself, not bubbled events
          if (e.target === e.currentTarget) {
            onClose();
          }
        }}
        aria-hidden="true"
      />

      {/* Modal */}
      <div
        className="fixed inset-0 flex items-end md:items-center justify-center p-0 md:p-4"
        style={{ zIndex: zIndex + 1 }}
      >
        <div
          ref={modalRef}
          tabIndex={-1}
          role="dialog"
          aria-modal="true"
          aria-labelledby="modal-title"
          className={`bg-white rounded-t-2xl md:rounded-2xl shadow-2xl w-full max-h-[90vh] md:max-h-[85vh] flex flex-col animate-slide-in ${
            isMobile ? 'h-[90vh]' : 'md:max-w-2xl'
          }`}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between gap-4 px-4 md:px-6 py-4 border-b border-slate-200 flex-shrink-0">
            <h2 id="modal-title" className="text-xl md:text-2xl font-bold text-slate-900">
              {title}
            </h2>
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
    </ModalStackContext.Provider>
  );
}
