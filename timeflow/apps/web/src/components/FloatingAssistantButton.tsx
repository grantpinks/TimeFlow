'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { FlowMascot } from '@/components/FlowMascot';

export function FloatingAssistantButton() {
  const pathname = usePathname();

  if (pathname === '/assistant') {
    return null;
  }

  return (
    <Link
      href="/assistant"
      className="fixed bottom-4 sm:bottom-6 right-4 sm:right-6 z-40 inline-flex items-center gap-2 sm:gap-3 rounded-full bg-primary-600 px-4 sm:px-5 py-3 sm:py-3.5 min-h-[56px] text-white shadow-lg transition hover:bg-primary-700 active:bg-primary-800 active:scale-95 focus:outline-none focus:ring-2 focus:ring-primary-400 focus:ring-offset-2"
      aria-label="Open Flow assistant"
    >
      <span className="flex h-9 w-9 sm:h-10 sm:w-10 items-center justify-center rounded-full bg-white/20 ring-1 ring-white/35 flex-shrink-0 overflow-hidden">
        <FlowMascot size="sm" expression="happy" className="scale-[1.08]" />
      </span>
      <div className="text-left hidden sm:block">
        <p className="text-xs uppercase tracking-wide text-white/80">Need a hand?</p>
        <p className="text-sm font-semibold leading-tight">Ask Flow</p>
      </div>
    </Link>
  );
}
