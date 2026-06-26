'use client';

import { CommandPaletteProvider } from '@/components/CommandPalette';
import { PostHogProvider } from '@/components/PostHogProvider';
import { InboxPrefetch } from '@/components/InboxPrefetch';
import { XpFeedbackProvider } from '@/components/identity/XpFeedbackProvider';
import { ThemeProvider } from 'next-themes';

export function AppProviders({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
      <PostHogProvider>
        <CommandPaletteProvider>
          <InboxPrefetch />
          {children}
          <XpFeedbackProvider />
        </CommandPaletteProvider>
      </PostHogProvider>
    </ThemeProvider>
  );
}
