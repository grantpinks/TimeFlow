'use client';

import { CommandPaletteProvider } from '@/components/CommandPalette';
import { ThemeProvider } from '@/components/theme-provider';
import { TransitionProvider } from './transition-provider';

type AppProvidersProps = {
  children: React.ReactNode;
};

export function AppProviders({ children }: AppProvidersProps) {
  return (
    <ThemeProvider>
      <CommandPaletteProvider>
        <TransitionProvider>{children}</TransitionProvider>
      </CommandPaletteProvider>
    </ThemeProvider>
  );
}
