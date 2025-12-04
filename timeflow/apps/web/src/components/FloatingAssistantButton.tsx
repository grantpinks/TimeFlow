'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

export function FloatingAssistantButton() {
  const pathname = usePathname();

  // Hide on the assistant page itself
  if (pathname === '/assistant') {
    return null;
  }

  return (
    <Link
      href="/assistant"
      className="fixed bottom-6 right-6 z-40 inline-flex items-center gap-3 rounded-full bg-primary-600 px-4 py-3 text-white shadow-lg transition hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-400 focus:ring-offset-2"
      aria-label="Open AI assistant"
    >
      <span className="flex h-9 w-9 items-center justify-center rounded-full bg-white/15">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          className="h-5 w-5"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M7 8h10M7 12h6m8 0c0 4.418-4.03 8-9 8-.86 0-1.693-.09-2.488-.263a1 1 0 00-.565.033L6 21l.61-2.113a1 1 0 00-.252-.973C4.853 16.663 4 14.45 4 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
          />
        </svg>
      </span>
      <div className="text-left">
        <p className="text-xs uppercase tracking-wide text-white/80">Need a hand?</p>
        <p className="text-sm font-semibold leading-tight">Ask the Assistant</p>
      </div>
    </Link>
  );
}
