'use client';

import Link from 'next/link';
import { useUser } from '@/hooks/useUser';
import { getGoogleAuthUrl } from '@/lib/api';

export default function HomePage() {
  const { user, loading, isAuthenticated } = useUser();

  return (
    <div className="min-h-screen flex flex-col">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <h1 className="text-2xl font-bold text-primary-600">TimeFlow</h1>
          <nav className="flex items-center gap-6">
            {isAuthenticated ? (
              <>
                <Link
                  href="/tasks"
                  className="text-slate-600 hover:text-primary-600 font-medium"
                >
                  Tasks
                </Link>
                <Link
                  href="/calendar"
                  className="text-slate-600 hover:text-primary-600 font-medium"
                >
                  Calendar
                </Link>
                <Link
                  href="/settings"
                  className="text-slate-600 hover:text-primary-600 font-medium"
                >
                  Settings
                </Link>
                <span className="text-slate-500">{user?.email}</span>
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
      <main className="flex-1 flex items-center justify-center px-6 py-12">
        <div className="text-center max-w-2xl">
          <h2 className="text-4xl font-bold text-slate-800 mb-4">
            Smart Task Scheduling
          </h2>
          <p className="text-xl text-slate-600 mb-8">
            TimeFlow automatically schedules your tasks into your Google Calendar,
            respecting your availability, priorities, and deadlines.
          </p>

          {loading ? (
            <div className="text-slate-500">Loading...</div>
          ) : isAuthenticated ? (
            <div className="flex gap-4 justify-center">
              <Link
                href="/tasks"
                className="bg-primary-600 text-white px-6 py-3 rounded-lg hover:bg-primary-700 font-medium text-lg"
              >
                View Tasks
              </Link>
              <Link
                href="/calendar"
                className="bg-white text-primary-600 border-2 border-primary-600 px-6 py-3 rounded-lg hover:bg-primary-50 font-medium text-lg"
              >
                Open Calendar
              </Link>
            </div>
          ) : (
            <a
              href={getGoogleAuthUrl()}
              className="inline-flex items-center gap-2 bg-white border border-slate-300 px-6 py-3 rounded-lg hover:bg-slate-50 font-medium text-lg text-slate-700"
            >
              <svg className="w-6 h-6" viewBox="0 0 24 24">
                <path
                  fill="#4285F4"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="#34A853"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                />
                <path
                  fill="#EA4335"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                />
              </svg>
              Sign in with Google
            </a>
          )}

          {/* Feature highlights */}
          <div className="mt-16 grid grid-cols-1 md:grid-cols-3 gap-8 text-left">
            <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
              <div className="w-12 h-12 bg-primary-100 rounded-lg flex items-center justify-center mb-4">
                <svg
                  className="w-6 h-6 text-primary-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
                  />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-slate-800 mb-2">
                Quick Task Capture
              </h3>
              <p className="text-slate-600">
                Add tasks with title, duration, priority, and due date in seconds.
              </p>
            </div>

            <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
              <div className="w-12 h-12 bg-accent-100 rounded-lg flex items-center justify-center mb-4">
                <svg
                  className="w-6 h-6 text-accent-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M13 10V3L4 14h7v7l9-11h-7z"
                  />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-slate-800 mb-2">
                Smart Scheduling
              </h3>
              <p className="text-slate-600">
                One click schedules all your tasks around your existing calendar.
              </p>
            </div>

            <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
              <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center mb-4">
                <svg
                  className="w-6 h-6 text-green-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                  />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-slate-800 mb-2">
                Calendar Sync
              </h3>
              <p className="text-slate-600">
                Tasks appear in your Google Calendar, always in sync.
              </p>
            </div>
          </div>
        </div>
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

