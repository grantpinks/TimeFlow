'use client';

import type { Identity, IdentityEvolutionState } from '@timeflow/shared';
import type { EvolutionSurfaceMode } from '@/hooks/useEvolutionSurface';
import { IdentityProgressionSidebar } from '@/components/habits/IdentityProgressionSidebar';
import { MobileModal } from '@/components/ui';

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
  return (
    <MobileModal isOpen={open} onClose={onClose} title="Progress Details">
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
    </MobileModal>
  );
}
