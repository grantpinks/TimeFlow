'use client';

import { useReducedMotion } from 'framer-motion';
import { FlowMascot } from '@/components/FlowMascot';
import { resolveAccessoryAsset } from '@/lib/characterAssets';

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
  const reduceMotion = useReducedMotion() ?? false;
  const accessoryAsset = resolveAccessoryAsset(accessory);
  const isAura = accessoryAsset?.layer === 'aura';

  return (
    <div
      data-testid="layered-flow-character"
      className={`relative inline-flex min-h-[5rem] min-w-[5rem] items-center justify-center ${className}`}
    >
      <FlowMascot size="lg" expression="happy" palette={palette} />
      {accessoryAsset ? (
        <span
          data-testid="flow-character-accessory"
          data-layer={accessoryAsset.layer}
          aria-label={accessoryAsset.alt}
          title={accessoryAsset.alt}
          className={`pointer-events-none absolute flex items-center justify-center rounded-full border border-teal-200/70 bg-white/80 text-teal-700 shadow-sm ${
            accessoryAsset.layer === 'hat' ? 'left-1/2 top-0 h-6 w-6 -translate-x-1/2 text-base' : ''
          } ${
            isAura ? 'inset-0 text-4xl text-teal-300/70' : ''
          } ${isAura && !reduceMotion ? 'motion-safe:animate-pulse' : ''}`}
        >
          <img
            src={accessoryAsset.src}
            alt=""
            aria-hidden="true"
            className="h-full w-full object-contain"
          />
        </span>
      ) : null}
    </div>
  );
}
