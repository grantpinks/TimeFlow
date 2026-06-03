'use client';

import { useEffect, useState } from 'react';

const STORAGE_KEY = 'tf_studio_coachmark_seen';

export function IdentityStudioCoachmark() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    try {
      if (localStorage.getItem(STORAGE_KEY) === '1') return;
      setVisible(true);
    } catch {
      /* private mode */
    }
  }, []);

  if (!visible) return null;

  const dismiss = () => {
    try {
      localStorage.setItem(STORAGE_KEY, '1');
    } catch {
      /* ignore */
    }
    setVisible(false);
  };

  return (
    <div
      className="rounded-xl border border-primary-200 bg-primary-50/90 px-3 py-2.5 text-sm text-primary-900"
      data-testid="identity-studio-coachmark"
      role="note"
    >
      <p className="font-medium">Identity Studio</p>
      <p className="mt-0.5 text-xs text-primary-800/90">
        Pick an identity in the rail to focus its habits. Other sections stay visible with a
        short preview — expand any section with +N more.
      </p>
      <button
        type="button"
        onClick={dismiss}
        className="mt-2 text-xs font-semibold text-primary-700 hover:underline"
      >
        Got it
      </button>
    </div>
  );
}
