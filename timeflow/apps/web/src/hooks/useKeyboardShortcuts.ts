import { useEffect } from 'react';

export interface KeyboardShortcut {
  key: string;
  ctrlKey?: boolean;
  metaKey?: boolean;
  shiftKey?: boolean;
  description: string;
  handler: () => void;
}

interface UseKeyboardShortcutsOptions {
  shortcuts: KeyboardShortcut[];
  enabled?: boolean;
}

/**
 * Custom hook to handle keyboard shortcuts
 * Automatically prevents default behavior and handles Ctrl/Cmd differences
 */
export function useKeyboardShortcuts({ shortcuts, enabled = true }: UseKeyboardShortcutsOptions) {
  useEffect(() => {
    if (!enabled) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      // Don't trigger shortcuts when typing in input fields
      const target = event.target as HTMLElement;
      if (
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.contentEditable === 'true'
      ) {
        // Allow Escape key even in input fields
        if (event.key !== 'Escape') {
          return;
        }
      }

      for (const shortcut of shortcuts) {
        const isModifierMatch =
          (!shortcut.ctrlKey && !shortcut.metaKey) ||
          (shortcut.ctrlKey && event.ctrlKey) ||
          (shortcut.metaKey && (event.metaKey || event.ctrlKey));

        const isShiftMatch = !shortcut.shiftKey || event.shiftKey;

        const isKeyMatch = event.key.toLowerCase() === shortcut.key.toLowerCase();

        if (isModifierMatch && isShiftMatch && isKeyMatch) {
          event.preventDefault();
          shortcut.handler();
          break;
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [shortcuts, enabled]);
}
