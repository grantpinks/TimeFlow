'use client';

import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';

interface Shortcut {
  keys: string[];
  description: string;
}

interface KeyboardShortcutsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function KeyboardShortcutsModal({ isOpen, onClose }: KeyboardShortcutsModalProps) {
  const prefersReducedMotion = useReducedMotion();

  const shortcuts: Shortcut[] = [
    { keys: ['Ctrl', 'K'], description: 'Quick add task' },
    { keys: ['Ctrl', '/'], description: 'Show keyboard shortcuts' },
    { keys: ['Esc'], description: 'Close modals/dialogs' },
    { keys: ['?'], description: 'Show keyboard shortcuts' },
  ];

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4"
          initial={{ opacity: prefersReducedMotion ? 1 : 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: prefersReducedMotion ? 1 : 0 }}
          onClick={onClose}
        >
          <motion.div
            className="w-full max-w-md bg-white rounded-xl shadow-2xl border border-slate-200"
            initial={prefersReducedMotion ? false : { scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={prefersReducedMotion ? { opacity: 1 } : { scale: 0.95, opacity: 0 }}
            transition={{ duration: prefersReducedMotion ? 0 : 0.2, ease: 'easeOut' }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
              <div>
                <h2 className="text-xl font-bold text-slate-900">Keyboard Shortcuts</h2>
                <p className="text-sm text-slate-600 mt-1">Quick navigation and actions</p>
              </div>
              <button
                onClick={onClose}
                className="text-slate-400 hover:text-slate-600 transition-colors"
                aria-label="Close shortcuts modal"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            </div>

            {/* Shortcuts List */}
            <div className="px-6 py-4 max-h-[60vh] overflow-y-auto">
              <div className="space-y-3">
                {shortcuts.map((shortcut, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between py-2 px-3 rounded-lg hover:bg-slate-50 transition-colors"
                  >
                    <span className="text-sm text-slate-700">{shortcut.description}</span>
                    <div className="flex items-center gap-1">
                      {shortcut.keys.map((key, keyIndex) => (
                        <span key={keyIndex}>
                          <kbd className="px-2 py-1 text-xs font-semibold text-slate-700 bg-slate-100 border border-slate-300 rounded shadow-sm">
                            {key}
                          </kbd>
                          {keyIndex < shortcut.keys.length - 1 && (
                            <span className="mx-1 text-slate-400">+</span>
                          )}
                        </span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Footer */}
            <div className="px-6 py-4 bg-slate-50 rounded-b-xl border-t border-slate-200">
              <p className="text-xs text-slate-500 text-center">
                Use <kbd className="px-1.5 py-0.5 text-xs font-semibold text-slate-700 bg-white border border-slate-300 rounded">Ctrl</kbd> on Windows/Linux or{' '}
                <kbd className="px-1.5 py-0.5 text-xs font-semibold text-slate-700 bg-white border border-slate-300 rounded">⌘</kbd> on Mac
              </p>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
