'use client';

import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { useCommandPalette } from './CommandPalette';
import { ThemeToggle } from './ThemeToggle';
import { useUser } from '../hooks/useUser';
import { getGoogleAuthUrl } from '../lib/api';

interface LayoutProps {
  children: React.ReactNode;
}

export function Layout({ children }: LayoutProps) {
  const pathname = usePathname();
  const { user, isAuthenticated, logout } = useUser();
  const { openPalette } = useCommandPalette();

  const navItems = [
    { href: '/today', label: 'Today' },
    { href: '/tasks', label: 'Tasks' },
    { href: '/assistant', label: 'AI Assistant' },
    { href: '/calendar', label: 'Calendar' },
    { href: '/settings', label: 'Settings' },
  ];

  return (
    <div className="min-h-screen flex flex-col app-shell">
      {/* Header */}
      <header className="app-header">
        <div className="app-container flex items-center justify-between gap-4">
          <Link href="/" className="flex items-center gap-3 group">
            <div className="rounded-md bg-primary-50 border border-primary-100 p-1.5 group-hover:border-primary-200 transition-colors">
              <Image src="/branding/main_logo.png" alt="TimeFlow logo" width={36} height={36} priority />
            </div>
            <span className="text-2xl font-bold text-primary-700 tracking-tight group-hover:text-primary-600 transition-colors">
              TimeFlow
            </span>
          </Link>
          <nav className="flex items-center gap-6">
            {isAuthenticated ? (
              <>
                {navItems.map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`font-medium ${
                      pathname === item.href
                        ? 'text-primary-600'
                        : 'text-slate-600 hover:text-primary-600'
                    }`}
                  >
                    {item.label}
                  </Link>
                ))}
                <button
                  type="button"
                  onClick={openPalette}
                  className="icon-button"
                  aria-label="Open command palette"
                >
                  Ctrl+K
                </button>
                <ThemeToggle />
                <span className="text-muted text-sm hidden lg:inline">{user?.email}</span>
                <button
                  onClick={logout}
                  className="text-muted hover:text-strong text-sm"
                >
                  Sign out
                </button>
              </>
            ) : (
              <a
                href={getGoogleAuthUrl()}
                className="bg-primary-600 text-white px-4 py-2 rounded-lg hover:bg-primary-700 font-medium"
              >
                Sign in with Google
              </a>
            )}
          </nav>
        </div>
      </header>

      {/* Main content */}
      <main className="app-main">
        <div className="app-container">{children}</div>
      </main>

      {/* Footer */}
      <footer className="app-footer">
        <div className="app-container text-center text-muted text-sm">
          TimeFlow &copy; {new Date().getFullYear()}
        </div>
      </footer>
    </div>
  );
}
