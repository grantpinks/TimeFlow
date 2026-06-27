'use client';

import { FlowMascot } from '@/components/FlowMascot';

interface LayeredFlowCharacterProps {
  hat?: string;
  eyes?: string;
  aura?: string;
  background?: string;
  accessory?: string;
  palette?: string;
  className?: string;
}

export function LayeredFlowCharacter({
  hat = 'none',
  eyes = 'none',
  aura = 'none',
  background = 'none',
  accessory = 'none',
  palette,
  className = '',
}: LayeredFlowCharacterProps) {
  return (
    <div
      data-testid="layered-flow-character"
      className={`relative inline-flex min-h-[5rem] min-w-[5rem] items-center justify-center ${className}`}
    >
      <FlowMascot
        size="lg"
        expression="happy"
        palette={palette}
        accessory={accessory !== 'none' ? accessory : undefined}
        {...(accessory === 'none'
          ? {
              hat,
              eyes,
              aura,
              background,
            }
          : {})}
      />
    </div>
  );
}
