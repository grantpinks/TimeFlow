'use client';

import { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { IdentityDayProgress } from '@timeflow/shared';

interface Props {
  identity: IdentityDayProgress | null;
  onDismiss: () => void;
}

export function IdentityCelebrationModal({ identity, onDismiss }: Props) {
  useEffect(() => {
    if (!identity) return;
    const timer = setTimeout(onDismiss, 3000);
    return () => clearTimeout(timer);
  }, [identity, onDismiss]);

  return (
    <AnimatePresence>
      {identity && (
        <motion.div
          key="celebration-backdrop"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ backgroundColor: 'rgba(0,0,0,0.4)' }}
          onClick={onDismiss}
        >
          <motion.div
            key="celebration-card"
            initial={{ scale: 0.8, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.9, opacity: 0, y: -10 }}
            transition={{ type: 'spring', stiffness: 400, damping: 25 }}
            className="bg-white rounded-2xl shadow-2xl p-8 max-w-sm w-full text-center"
            onClick={(e) => e.stopPropagation()}
          >
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.1, type: 'spring', stiffness: 500, damping: 20 }}
              className="w-20 h-20 rounded-full flex items-center justify-center text-4xl mx-auto mb-4 shadow-lg"
              style={{ backgroundColor: identity.color + '20', border: `3px solid ${identity.color}` }}
            >
              {identity.icon}
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.15 }}
            >
              <p className="text-sm font-semibold uppercase tracking-wider mb-1" style={{ color: identity.color }}>
                Identity Progress
              </p>
              <h2 className="text-2xl font-bold text-slate-900 mb-2">{identity.name}</h2>
              <p className="text-slate-500 text-sm mb-4">
                {identity.completedCount === 1
                  ? "You've completed your first item today!"
                  : `${identity.completedCount} items completed today · ${identity.totalMinutes} min`}
              </p>
            </motion.div>

            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.25 }}
              className="flex justify-center gap-2 mb-5"
            >
              {Array.from({ length: Math.min(identity.completedCount, 7) }).map((_, i) => (
                <motion.div
                  key={i}
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ delay: 0.3 + i * 0.05, type: 'spring' }}
                  className="w-3 h-3 rounded-full"
                  style={{ backgroundColor: identity.color }}
                />
              ))}
            </motion.div>

            <button
              onClick={onDismiss}
              className="text-xs text-slate-400 hover:text-slate-600 transition-colors"
            >
              tap to dismiss
            </button>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
