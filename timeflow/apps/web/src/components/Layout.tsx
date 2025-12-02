'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useUser } from '@/hooks/useUser';
import { getGoogleAuthUrl } from '@/lib/api';

interface LayoutProps {
  children: React.ReactNode;
}

export function Layout({ children }: LayoutProps) {
  const pathname = usePathname();
  const { user, isAuthenticated, logout } = useUser();

  const navItems = [
    { href: '/tasks', label: 'Tasks' },
    { href: '/calendar', label: 'Calendar' },
    { href: '/settings', label: 'Settings' },
  ];

  return (
    <div className="min-h-screen flex flex-col">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <Link href="/" className="text-2xl font-bold text-primary-600">
            TimeFlow
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
                <div className="flex items-center gap-4">
                  <span className="text-slate-500 text-sm">{user?.email}</span>
                  <button
                    onClick={logout}
                    className="text-slate-500 hover:text-slate-700 text-sm"
                  >
                    Sign out
                  </button>
                </div>
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
      <main className="flex-1 px-6 py-8">
        <div className="max-w-7xl mx-auto">{children}</div>
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-slate-200 px-6 py-4">
        <div className="max-w-7xl mx-auto text-center text-slate-500 text-sm">
          TimeFlow &copy; {new Date().getFullYear()}
        </div>
      </footer>
    </div>
  );
}

