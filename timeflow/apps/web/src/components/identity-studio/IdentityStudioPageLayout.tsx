'use client';

import type { ReactNode } from 'react';

export interface IdentityStudioPageLayoutProps {
  rail: ReactNode;
  actionStrip?: ReactNode;
  children: ReactNode;
  sidebar?: ReactNode;
}

export function IdentityStudioPageLayout({
  rail,
  actionStrip,
  children,
  sidebar,
}: IdentityStudioPageLayoutProps) {
  return (
    <div className="space-y-4" data-testid="identity-studio-page-layout">
      {actionStrip}
      <div className="lg:grid lg:grid-cols-[minmax(140px,180px)_minmax(0,1fr)] lg:gap-6 lg:items-start">
        <div className="lg:sticky lg:top-4">{rail}</div>
        <div
          className={
            sidebar
              ? 'lg:grid lg:grid-cols-[minmax(0,1fr)_min(260px,28vw)] lg:gap-6 lg:items-start min-w-0'
              : 'min-w-0'
          }
        >
          <div className="min-w-0 space-y-3">{children}</div>
          {sidebar ? <div className="hidden lg:block min-w-0">{sidebar}</div> : null}
        </div>
      </div>
    </div>
  );
}
