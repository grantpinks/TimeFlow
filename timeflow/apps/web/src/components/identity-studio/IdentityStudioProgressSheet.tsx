'use client';

import type { Identity, IdentityEvolutionState } from '@timeflow/shared';
import type { EvolutionSurfaceMode } from '@/hooks/useEvolutionSurface';
import { IdentityProgressionSidebar } from '@/components/habits/IdentityProgressionSidebar';

export interface IdentityStudioProgressSheetProps {
  open: boolean;
  onClose: () => void;
  surfaceMode: EvolutionSurfaceMode;
  evolutionStates: IdentityEvolutionState[];
  identities: Identity[];
  timeZone: string;
  focusedIdentityId: string | null;
  onRefresh?: () => void;
  onRetry?: () => void;
}

export function IdentityStudioProgressSheet({
  open,
  onClose,
  surfaceMode,
  evolutionStates,
  identities,
  timeZone,
  focusedIdentityId,
  onRefresh,
  onRetry,
}: IdentityStudioProgressSheetProps) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 lg:hidden" role="dialog" aria-modal="true">
      <button
        type="button"
        className="absolute inset-0 bg-black/40"
        aria-label="Close progress"
        onClick={onClose}
      />
      <div className="absolute inset-x-0 bottom-0 max-h-[85vh] overflow-y-auto rounded-t-2xl bg-white p-4 shadow-xl">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-slate-900">Progress</h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-2 text-slate-500 hover:bg-slate-100"
          >
            ✕
          </button>
        </div>
        <IdentityProgressionSidebar
          surfaceMode={surfaceMode}
          evolutionStates={evolutionStates}
          identities={identities}
          timeZone={timeZone}
          focusedIdentityId={focusedIdentityId}
          onRefresh={onRefresh}
          onRetry={onRetry}
          variant="embedded"
        />
      </div>
    </div>
  );
}
