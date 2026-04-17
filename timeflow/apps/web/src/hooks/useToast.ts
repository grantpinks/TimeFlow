/**
 * Toast Notification Hook
 *
 * Provides a simple toast notification system with auto-dismiss.
 */

import { useState, useCallback, useRef, useEffect } from 'react';

export type ToastType = 'success' | 'error' | 'info';

export interface Toast {
  id: string;
  type: ToastType;
  message: string;
  durationMs?: number;
  action?: { label: string; onClick: () => void };
}

let toastId = 0;

export type ShowToastOptions = {
  durationMs?: number;
  action?: { label: string; onClick: () => void };
};

export function useToast() {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const timersRef = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());

  useEffect(() => {
    return () => {
      timersRef.current.forEach((t) => clearTimeout(t));
      timersRef.current.clear();
    };
  }, []);

  const removeToast = useCallback((id: string) => {
    const t = timersRef.current.get(id);
    if (t) {
      clearTimeout(t);
      timersRef.current.delete(id);
    }
    setToasts((prev) => prev.filter((x) => x.id !== id));
  }, []);

  const showToast = useCallback(
    (message: string, type: ToastType = 'info', options?: ShowToastOptions) => {
      const id = `toast-${toastId++}`;
      const durationMs = options?.durationMs ?? 3000;
      const newToast: Toast = { id, message, type, durationMs, action: options?.action };

      setToasts((prev) => [...prev, newToast]);

      const timer = setTimeout(() => {
        removeToast(id);
      }, durationMs);
      timersRef.current.set(id, timer);
    },
    [removeToast]
  );

  return {
    toasts,
    showToast,
    removeToast,
  };
}
