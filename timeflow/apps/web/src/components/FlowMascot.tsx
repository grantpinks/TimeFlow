/**
 * Flow Mascot Component
 *
 * Displays the official TimeFlow mascot character using branded assets.
 * Flow is a friendly water droplet with an hourglass that represents time flowing.
 */

'use client';

import Image from 'next/image';
import { useReducedMotion } from 'framer-motion';
import { useFlowCustomization } from '@/components/identity/FlowCustomizationProvider';
import { resolveAccessoryAsset } from '@/lib/characterAssets';
import { normalizeMascotPackSlug, normalizePaletteSlug } from '@/lib/flowCustomization';

interface FlowMascotProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  expression?: 'happy' | 'encouraging' | 'celebrating' | 'thinking' | 'guiding-up' | 'guiding-left' | 'guiding-right' | 'pointing-down';
  className?: string;
  /** Optional palette override; otherwise reads identity Flow customization from context. */
  palette?: string;
  /** Optional accessory override; otherwise reads identity Flow customization from context. */
  accessory?: string;
}

export function FlowMascot({
  size = 'md',
  expression = 'happy',
  className = '',
  palette: paletteProp,
  accessory: accessoryProp,
}: FlowMascotProps) {
  const { customization } = useFlowCustomization();
  const reduceMotion = useReducedMotion() ?? false;
  const palette = normalizePaletteSlug(paletteProp ?? customization.selectedPalette);
  const pack = normalizeMascotPackSlug(customization.selectedAnimationPack);
  const accessoryAsset = resolveAccessoryAsset(accessoryProp ?? customization.selectedAccessory);
  const accessoryBehindBase = accessoryAsset?.layer === 'aura' || accessoryAsset?.layer === 'background';
  const accessoryLayerClass =
    accessoryAsset?.layer === 'hat'
      ? 'left-1/2 top-[-0.35rem] z-20 h-1/2 w-3/4 -translate-x-1/2'
      : accessoryAsset?.layer === 'eyes'
        ? 'left-1/2 top-[30%] z-20 h-[18%] w-[42%] -translate-x-1/2'
        : accessoryBehindBase
          ? 'inset-[-18%] z-0 opacity-80'
          : 'z-20 rounded-full border border-teal-200/70 bg-white/80 shadow-sm';

  const sizeMap = {
    sm: 32,
    md: 48,
    lg: 64,
    xl: 96,
  };

  const dimension = sizeMap[size];

  // Map expression to branded mascot file
  const expressionMap = {
    happy: '/branding/Flow Mascot Default.png',
    celebrating: '/branding/Flow Mascot Celebrating.png',
    thinking: '/branding/Flow Mascot Thinking.png',
    encouraging: '/branding/Flow Guiding Up.png',
    'guiding-up': '/branding/Flow Guiding Up.png',
    'guiding-left': '/branding/Flow Guiding to left.png',
    'guiding-right': '/branding/Flow Guiding to right.png',
    'pointing-down': '/branding/Flow Pointing Down.png',
  };

  const imageSrc = expressionMap[expression];

  const wrapClass = `flow-mascot-palette-wrap relative inline-block flow-mascot-palette-${palette} flow-mascot-pack-${pack}`;
  const accessoryLayer = accessoryAsset ? (
    <span
      data-testid="flow-mascot-accessory"
      data-layer={accessoryAsset.layer}
      data-layer-position={accessoryBehindBase ? 'behind' : 'front'}
      aria-label={accessoryAsset.alt}
      title={accessoryAsset.alt}
      className={`pointer-events-none absolute flex items-center justify-center ${accessoryLayerClass} ${
        accessoryAsset.layer === 'aura' && !reduceMotion ? 'motion-safe:animate-pulse' : ''
      }`}
    >
      <img
        src={accessoryAsset.src}
        alt=""
        aria-hidden="true"
        className="h-full w-full object-contain"
      />
    </span>
  ) : null;

  return (
    <span className={wrapClass}>
      {accessoryBehindBase ? accessoryLayer : null}
      <Image
        src={imageSrc}
        alt={`Flow mascot ${expression}`}
        width={dimension}
        height={dimension}
        className={`flow-mascot-img relative z-10 object-contain ${className}`}
        priority
      />
      {!accessoryBehindBase ? accessoryLayer : null}
    </span>
  );
}
