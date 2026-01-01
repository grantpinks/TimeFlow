'use client';

import type { DragEvent } from 'react';
import { useEffect, useMemo, useState } from 'react';
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

type NavItem = {
  id: string;
  href: string;
  label: string;
  icon: ({ className }: { className?: string }) => JSX.Element;
  children?: Array<{ href: string; label: string }>;
};

const navItems: NavItem[] = [
  { id: 'today', href: '/today', label: 'Today', icon: HomeIcon },
  { id: 'tasks', href: '/tasks', label: 'Tasks', icon: CheckIcon, children: [{ href: '/categories', label: 'Categories' }] },
  { id: 'habits', href: '/habits', label: 'Habits', icon: HabitIcon },
  { id: 'assistant', href: '/assistant', label: 'Flow AI', icon: SparkIcon },
  { id: 'calendar', href: '/calendar', label: 'Calendar', icon: CalendarIcon },
  { id: 'meetings', href: '/meetings', label: 'Meetings', icon: PhoneIcon },
  { id: 'inbox', href: '/inbox', label: 'Inbox', icon: InboxIcon, children: [{ href: '/settings/email-categories', label: 'Email Categories' }] },
];

const navItemIds = navItems.map((item) => item.id);
const navItemLookup = navItems.reduce<Record<string, NavItem>>((acc, item) => {
  acc[item.id] = item;
  return acc;
}, {});

function normalizeNavOrder(order?: string[]) {
  const requested = Array.isArray(order) ? order.filter((id) => navItemIds.includes(id)) : [];
  const missing = navItemIds.filter((id) => !requested.includes(id));
  return [...requested, ...missing];
}

const sidebarStorageKey = 'timeflow.sidebar.collapsed';

export function Layout({ children }: LayoutProps) {
  const pathname = usePathname();
  const { user, isAuthenticated, logout, updatePreferences } = useUser();
  const { openPalette } = useCommandPalette();
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const [isTasksExpanded, setIsTasksExpanded] = useState(false);
  const [isInboxExpanded, setIsInboxExpanded] = useState(false);
  const [navOrder, setNavOrder] = useState<string[]>(() => normalizeNavOrder());
  const [draggingNavId, setDraggingNavId] = useState<string | null>(null);
  const [dragOverNavId, setDragOverNavId] = useState<string | null>(null);

  useEffect(() => {
    if (!isAuthenticated) return;
    const stored = window.localStorage.getItem(sidebarStorageKey);
    if (stored === '1') {
      setIsSidebarCollapsed(true);
    }
  }, [isAuthenticated]);

  useEffect(() => {
    if (!isAuthenticated) return;
    setNavOrder(normalizeNavOrder(user?.sidebarNavOrder));
  }, [isAuthenticated, user?.sidebarNavOrder]);

  useEffect(() => {
    if (pathname.startsWith('/tasks') || pathname.startsWith('/categories')) {
      setIsTasksExpanded(true);
    }
    if (pathname.startsWith('/inbox') || pathname.startsWith('/settings/email-categories')) {
      setIsInboxExpanded(true);
    }
  }, [pathname]);

  useEffect(() => {
    if (!isMobileSidebarOpen) return;
    function handleKeydown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setIsMobileSidebarOpen(false);
      }
    }
    window.addEventListener('keydown', handleKeydown);
    return () => window.removeEventListener('keydown', handleKeydown);
  }, [isMobileSidebarOpen]);

  useEffect(() => {
    if (isMobileSidebarOpen) {
      setIsMobileSidebarOpen(false);
    }
  }, [pathname, isMobileSidebarOpen]);

  const isSidebarExpanded = !isSidebarCollapsed || isMobileSidebarOpen;
  const sidebarWidth = isSidebarExpanded ? 'w-60' : 'w-[72px]';
  const orderedNavItems = useMemo(
    () => normalizeNavOrder(navOrder).map((id) => navItemLookup[id]).filter(Boolean),
    [navOrder]
  );

  function handleDragStart(id: string, event: DragEvent) {
    event.dataTransfer.effectAllowed = 'move';
    event.dataTransfer.setData('text/plain', id);
    setDraggingNavId(id);
  }

  function handleDragOver(id: string, event: DragEvent) {
    if (!draggingNavId || draggingNavId === id) return;
    event.preventDefault();
    setDragOverNavId(id);
  }

  function moveNavItem(order: string[], fromId: string, toId: string) {
    const next = order.filter((id) => id !== fromId);
    const targetIndex = next.indexOf(toId);
    if (targetIndex === -1) return order;
    next.splice(targetIndex, 0, fromId);
    return next;
  }

  function handleDrop(id: string) {
    if (!draggingNavId || draggingNavId === id) return;
    const nextOrder = moveNavItem(normalizeNavOrder(navOrder), draggingNavId, id);
    setNavOrder(nextOrder);
    setDragOverNavId(null);
    setDraggingNavId(null);
    updatePreferences({ sidebarNavOrder: nextOrder }).catch(() => {});
  }

  function handleDragEnd() {
    setDragOverNavId(null);
    setDraggingNavId(null);
  }

  function toggleSidebar() {
    setIsSidebarCollapsed((prev) => {
      const next = !prev;
      window.localStorage.setItem(sidebarStorageKey, next ? '1' : '0');
      return next;
    });
  }

  function isNavExpanded(id: string) {
    if (id === 'tasks') return isTasksExpanded;
    if (id === 'inbox') return isInboxExpanded;
    return false;
  }

  function toggleNavExpanded(id: string) {
    if (id === 'tasks') {
      setIsTasksExpanded((prev) => !prev);
      return;
    }
    if (id === 'inbox') {
      setIsInboxExpanded((prev) => !prev);
    }
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex flex-col app-shell">
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
              <a
                href={getGoogleAuthUrl()}
                className="bg-primary-600 text-white px-4 py-2 rounded-lg hover:bg-primary-700 font-medium"
              >
                Sign in with Google
              </a>
            </nav>
          </div>
        </header>

        <main className="app-main">
          <div className="app-container">{children}</div>
        </main>

        <footer className="app-footer">
          <div className="app-container text-center text-muted text-sm">
            TimeFlow &copy; {new Date().getFullYear()}
          </div>
        </footer>
      </div>
    );
  }

  return (
    <div className="min-h-screen app-shell flex">
      <div
        className={`fixed inset-0 bg-slate-900/40 transition-opacity md:hidden ${
          isMobileSidebarOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
        onClick={() => setIsMobileSidebarOpen(false)}
        aria-hidden="true"
      />

      <aside
        className={`fixed inset-y-0 left-0 z-40 flex flex-col border-r border-slate-200 bg-white/90 backdrop-blur transition-all duration-200 ease-out md:relative md:z-auto md:translate-x-0 ${sidebarWidth} ${
          isMobileSidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
        }`}
      >
        <div className="flex items-center justify-between gap-2 px-4 py-4">
          <Link href="/today" className="flex items-center gap-3 group">
            <div className="rounded-md bg-primary-50 border border-primary-100 p-1.5 group-hover:border-primary-200 transition-colors">
              <Image src="/branding/main_logo.png" alt="TimeFlow logo" width={32} height={32} priority />
            </div>
            {isSidebarExpanded ? (
              <span className="text-lg font-semibold text-primary-700 tracking-tight group-hover:text-primary-600 transition-colors">
                TimeFlow
              </span>
            ) : null}
          </Link>
          <button
            type="button"
            onClick={toggleSidebar}
            className="hidden md:inline-flex items-center justify-center rounded-md border border-slate-200 bg-white p-2 text-slate-600 hover:text-primary-600 hover:border-primary-200 transition-colors"
            aria-label={isSidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            <ChevronIcon className={`h-4 w-4 transition-transform ${isSidebarCollapsed ? 'rotate-180' : ''}`} />
          </button>
        </div>

        <nav className="flex-1 px-3 py-3 space-y-1">
          {orderedNavItems.map((item) => {
            const isActive =
              pathname === item.href ||
              pathname.startsWith(`${item.href}/`) ||
              item.children?.some((child) => pathname === child.href || pathname.startsWith(`${child.href}/`));
            const Icon = item.icon;
            const hasChildren = Boolean(item.children?.length);
            const isExpanded = isNavExpanded(item.id);
            const isDropTarget = dragOverNavId === item.id && draggingNavId !== item.id;

            if (hasChildren) {
              return (
                <div key={item.href} className="space-y-1">
                  <div className="flex items-center gap-2">
                    <Link
                      href={item.href}
                      title={!isSidebarExpanded ? item.label : undefined}
                      aria-label={!isSidebarExpanded ? item.label : undefined}
                      className={`flex flex-1 items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors cursor-grab active:cursor-grabbing ${
                        isActive
                          ? 'bg-primary-50 text-primary-700'
                          : 'text-slate-600 hover:text-primary-600 hover:bg-slate-100'
                      } ${isDropTarget ? 'ring-1 ring-primary-200' : ''}`}
                      onClick={() => setIsMobileSidebarOpen(false)}
                      draggable
                      onDragStart={(event) => handleDragStart(item.id, event)}
                      onDragOver={(event) => handleDragOver(item.id, event)}
                      onDrop={() => handleDrop(item.id)}
                      onDragEnd={handleDragEnd}
                    >
                      <Icon className="h-5 w-5" />
                      {isSidebarExpanded ? <span>{item.label}</span> : null}
                    </Link>
                    {isSidebarExpanded ? (
                      <button
                        type="button"
                        onClick={() => toggleNavExpanded(item.id)}
                        className="inline-flex items-center justify-center rounded-md p-1.5 text-slate-400 hover:text-primary-600 transition-colors"
                        aria-label={isExpanded ? `Collapse ${item.label} subpages` : `Expand ${item.label} subpages`}
                      >
                        <ChevronIcon className={`h-4 w-4 transition-transform ${isExpanded ? 'rotate-90' : ''}`} />
                      </button>
                    ) : null}
                  </div>
                  {isSidebarExpanded && isExpanded ? (
                    <div className="ml-8 space-y-1">
                      {item.children?.map((child) => {
                        const isChildActive =
                          pathname === child.href || pathname.startsWith(`${child.href}/`);
                        return (
                          <Link
                            key={child.href}
                            href={child.href}
                            className={`flex items-center rounded-md px-3 py-2 text-sm font-medium transition-colors ${
                              isChildActive
                                ? 'bg-primary-50 text-primary-700'
                                : 'text-slate-500 hover:text-primary-600 hover:bg-slate-100'
                            }`}
                            onClick={() => setIsMobileSidebarOpen(false)}
                          >
                            {child.label}
                          </Link>
                        );
                      })}
                    </div>
                  ) : null}
                </div>
              );
            }

            return (
              <Link
                key={item.href}
                href={item.href}
                title={!isSidebarExpanded ? item.label : undefined}
                aria-label={!isSidebarExpanded ? item.label : undefined}
                className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors cursor-grab active:cursor-grabbing ${
                  isActive
                    ? 'bg-primary-50 text-primary-700'
                    : 'text-slate-600 hover:text-primary-600 hover:bg-slate-100'
                } ${isDropTarget ? 'ring-1 ring-primary-200' : ''}`}
                onClick={() => setIsMobileSidebarOpen(false)}
                draggable
                onDragStart={(event) => handleDragStart(item.id, event)}
                onDragOver={(event) => handleDragOver(item.id, event)}
                onDrop={() => handleDrop(item.id)}
                onDragEnd={handleDragEnd}
              >
                <Icon className="h-5 w-5" />
                {isSidebarExpanded ? <span>{item.label}</span> : null}
              </Link>
            );
          })}
        </nav>

        <div className="border-t border-slate-200 px-3 py-3 space-y-3">
          <div className="flex items-center justify-between">
            <Link
              href="/settings"
              title="Settings"
              aria-label="Settings"
              className={`inline-flex items-center justify-center rounded-md border border-slate-200 p-2 text-slate-600 hover:text-primary-600 hover:border-primary-200 transition-colors ${
                pathname.startsWith('/settings') ? 'bg-primary-50 text-primary-700 border-primary-200' : 'bg-white'
              }`}
              onClick={() => setIsMobileSidebarOpen(false)}
            >
              <GearIcon className="h-4 w-4" />
            </Link>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={openPalette}
                className="inline-flex items-center justify-center rounded-md border border-slate-200 bg-white p-2 text-slate-600 hover:text-primary-600 hover:border-primary-200 transition-colors"
                aria-label="Open command palette"
              >
                <CommandIcon className="h-4 w-4" />
              </button>
              <ThemeToggle />
            </div>
          </div>

          <div className={`rounded-lg border border-slate-200 bg-white px-3 py-2 ${isSidebarExpanded ? '' : 'hidden'}`}>
            <p className="text-xs text-slate-500">Signed in as</p>
            <p className="text-sm font-medium text-slate-900 truncate">{user?.email}</p>
          </div>

          {isSidebarExpanded ? (
            <button
              onClick={logout}
              className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-600 hover:text-primary-600 hover:border-primary-200 transition-colors"
            >
              Sign out
            </button>
          ) : (
            <button
              onClick={logout}
              className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-slate-600 hover:text-primary-600 hover:border-primary-200 transition-colors"
              aria-label="Sign out"
              title="Sign out"
            >
              <LogoutIcon className="h-4 w-4 mx-auto" />
            </button>
          )}
        </div>
      </aside>

      <div className="flex min-h-screen flex-1 flex-col">
        <div className="hidden md:flex items-center justify-center border-b border-slate-200 bg-white/80 px-6 py-3 backdrop-blur">
          <nav className="flex items-center gap-2">
            {orderedNavItems.map((item) => {
              const isActive =
                pathname === item.href ||
                pathname.startsWith(`${item.href}/`) ||
                item.children?.some((child) => pathname === child.href || pathname.startsWith(`${child.href}/`));
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-medium transition-colors ${
                    isActive
                      ? 'bg-primary-50 text-primary-700'
                      : 'text-slate-600 hover:text-primary-600 hover:bg-slate-100'
                  }`}
                >
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </nav>
        </div>
        <header className="app-header md:hidden">
          <div className="flex items-center justify-between gap-4">
            <button
              type="button"
              onClick={() => setIsMobileSidebarOpen(true)}
              className="inline-flex items-center justify-center rounded-md border border-slate-200 bg-white p-2 text-slate-600 hover:text-primary-600 hover:border-primary-200 transition-colors"
              aria-label="Open navigation menu"
              aria-expanded={isMobileSidebarOpen}
            >
              <MenuIcon className="h-5 w-5" />
            </button>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={openPalette}
                className="inline-flex items-center justify-center rounded-md border border-slate-200 bg-white p-2 text-slate-600 hover:text-primary-600 hover:border-primary-200 transition-colors"
                aria-label="Open command palette"
              >
                <CommandIcon className="h-4 w-4" />
              </button>
              <ThemeToggle />
            </div>
          </div>
          <nav className="mt-3 -mx-1 flex items-center gap-2 overflow-x-auto px-1 pb-1">
            {orderedNavItems.map((item) => {
              const isActive =
                pathname === item.href ||
                pathname.startsWith(`${item.href}/`) ||
                item.children?.some((child) => pathname === child.href || pathname.startsWith(`${child.href}/`));
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  title={item.label}
                  aria-label={item.label}
                  className={`flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-medium transition-colors whitespace-nowrap ${
                    isActive
                      ? 'bg-primary-50 text-primary-700'
                      : 'text-slate-600 hover:text-primary-600 hover:bg-slate-100'
                  }`}
                >
                  <Icon className="h-4 w-4" />
                </Link>
              );
            })}
          </nav>
        </header>

        <main className="app-main">
          <div className="app-container">{children}</div>
        </main>

        <footer className="app-footer">
          <div className="app-container text-center text-muted text-sm">
            TimeFlow &copy; {new Date().getFullYear()}
          </div>
        </footer>
      </div>
    </div>
  );
}

function HomeIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className={className} fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M3 10.5 12 3l9 7.5v9a1.5 1.5 0 0 1-1.5 1.5H4.5A1.5 1.5 0 0 1 3 19.5v-9Z" />
      <path d="M9 21v-6h6v6" />
    </svg>
  );
}

function CheckIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className={className} fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M7 12l3 3 7-7" />
      <path d="M5 4.5h14A1.5 1.5 0 0 1 20.5 6v12A1.5 1.5 0 0 1 19 19.5H5A1.5 1.5 0 0 1 3.5 18V6A1.5 1.5 0 0 1 5 4.5Z" />
    </svg>
  );
}

function SparkIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className={className} fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M12 3l1.8 4.6L18 9l-4.2 1.4L12 15l-1.8-4.6L6 9l4.2-1.4L12 3Z" />
      <path d="M5 16l.9 2.2L8 19l-2.1.8L5 22l-.9-2.2L2 19l2.1-.8L5 16Z" />
    </svg>
  );
}

function CalendarIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className={className} fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M4 6.5h16A1.5 1.5 0 0 1 21.5 8v11A1.5 1.5 0 0 1 20 20.5H4A1.5 1.5 0 0 1 2.5 19V8A1.5 1.5 0 0 1 4 6.5Z" />
      <path d="M7 3.5v3M17 3.5v3M2.5 10.5h19" />
    </svg>
  );
}

function InboxIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className={className} fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M4 5.5h16A1.5 1.5 0 0 1 21.5 7v10A1.5 1.5 0 0 1 20 18.5H4A1.5 1.5 0 0 1 2.5 17V7A1.5 1.5 0 0 1 4 5.5Z" />
      <path d="M2.5 13h4.5l2 3h6l2-3h4.5" />
    </svg>
  );
}

function HabitIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className={className} fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M7 4.5h10A2.5 2.5 0 0 1 19.5 7v10A2.5 2.5 0 0 1 17 19.5H7A2.5 2.5 0 0 1 4.5 17V7A2.5 2.5 0 0 1 7 4.5Z" />
      <path d="M8.5 12h7M8.5 8.5h7M8.5 15.5h4" />
    </svg>
  );
}

function PhoneIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className={className} fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M7 4.5h4L12 8l-2.2 1.7a10 10 0 0 0 4.5 4.5L16 12l3.5 1v4A2.5 2.5 0 0 1 17 19.5c-6.6 0-12-5.4-12-12A2.5 2.5 0 0 1 7.5 5h-.5Z" />
      <path d="M15 6h4M17 4v4" />
    </svg>
  );
}

function GearIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className={className} fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M12 8.5a3.5 3.5 0 1 1 0 7 3.5 3.5 0 0 1 0-7Z" />
      <path d="M19.5 12a7.4 7.4 0 0 0-.1-1.2l2-1.5-2-3.4-2.4.7a7.9 7.9 0 0 0-2-1.2l-.3-2.5H10l-.3 2.5a7.9 7.9 0 0 0-2 1.2l-2.4-.7-2 3.4 2 1.5A7.4 7.4 0 0 0 4.5 12c0 .4 0 .8.1 1.2l-2 1.5 2 3.4 2.4-.7c.6.5 1.3.9 2 1.2l.3 2.5h4.4l.3-2.5c.7-.3 1.4-.7 2-1.2l2.4.7 2-3.4-2-1.5c.1-.4.1-.8.1-1.2Z" />
    </svg>
  );
}

function ChevronIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className={className} fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="m15 6-6 6 6 6" />
    </svg>
  );
}

function MenuIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className={className} fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M4 6.5h16M4 12h16M4 17.5h16" />
    </svg>
  );
}

function CommandIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className={className} fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M9 9V7.5A2.5 2.5 0 1 0 6.5 10H9" />
      <path d="M15 9h2.5A2.5 2.5 0 1 0 15 6.5V9" />
      <path d="M9 15H6.5A2.5 2.5 0 1 0 9 17.5V15" />
      <path d="M15 15v2.5A2.5 2.5 0 1 0 17.5 15H15" />
      <path d="M9 9h6v6H9z" />
    </svg>
  );
}

function LogoutIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className={className} fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M15 7.5v-2A1.5 1.5 0 0 0 13.5 4h-7A1.5 1.5 0 0 0 5 5.5v13A1.5 1.5 0 0 0 6.5 20h7A1.5 1.5 0 0 0 15 18.5v-2" />
      <path d="M10 12h9m0 0-2.5-2.5M19 12l-2.5 2.5" />
    </svg>
  );
}
