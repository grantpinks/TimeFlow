'use client';

import { CommandPaletteProvider } from '@/components/CommandPalette';
import { PostHogProvider } from '@/components/PostHogProvider';
import { ThemeProvider } from 'next-themes';

export function AppProviders({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
      <PostHogProvider>
        <CommandPaletteProvider>
          {children}
        </CommandPaletteProvider>
      </PostHogProvider>
    </ThemeProvider>
  );
}
