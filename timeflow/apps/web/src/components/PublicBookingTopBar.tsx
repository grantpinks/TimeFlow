import Link from 'next/link';
import Image from 'next/image';

/**
 * Sticky bar for public `/book/*` flows so visitors can always return to the marketing home or open the app.
 */
export function PublicBookingTopBar() {
  return (
    <header className="sticky top-0 z-50 border-b border-slate-200 bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/85">
      <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between gap-3">
        <Link href="/" className="flex items-center gap-2 min-h-[44px] text-slate-800 hover:text-primary-700 transition-colors">
          <Image src="/branding/main_logo.png" alt="TimeFlow" width={28} height={28} className="w-7 h-7" />
          <span className="font-semibold text-slate-900">TimeFlow</span>
        </Link>
        <div className="flex items-center gap-2 sm:gap-3">
          <Link
            href="/today"
            className="text-sm font-medium text-primary-700 hover:text-primary-800 min-h-[44px] inline-flex items-center px-2"
          >
            Open app
          </Link>
          <Link
            href="/"
            className="text-sm font-medium text-slate-600 hover:text-slate-900 min-h-[44px] inline-flex items-center px-2"
          >
            Home
          </Link>
        </div>
      </div>
    </header>
  );
}
