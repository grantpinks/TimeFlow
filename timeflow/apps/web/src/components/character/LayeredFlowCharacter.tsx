'use client';

import { FlowMascot } from '@/components/FlowMascot';

interface LayeredFlowCharacterProps {
  accessory?: string;
  palette?: string;
  className?: string;
}

export function LayeredFlowCharacter({
  accessory = 'none',
  palette,
  className = '',
}: LayeredFlowCharacterProps) {
  return (
    <div
      data-testid="layered-flow-character"
      className={`relative inline-flex min-h-[5rem] min-w-[5rem] items-center justify-center ${className}`}
    >
      <FlowMascot size="lg" expression="happy" palette={palette} accessory={accessory} />
    </div>
  );
}
