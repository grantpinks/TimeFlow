/**
 * Flow Mascot Component
 *
 * Displays the official TimeFlow mascot character using branded assets.
 * Flow is a friendly water droplet with an hourglass that represents time flowing.
 */

'use client';

import Image from 'next/image';
import { useFlowCustomization } from '@/components/identity/FlowCustomizationProvider';
import { normalizeMascotPackSlug, normalizePaletteSlug } from '@/lib/flowCustomization';

interface FlowMascotProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  expression?: 'happy' | 'encouraging' | 'celebrating' | 'thinking' | 'guiding-up' | 'guiding-left' | 'guiding-right' | 'pointing-down';
  className?: string;
  /** Optional palette override; otherwise reads identity Flow customization from context. */
  palette?: string;
}

export function FlowMascot({
  size = 'md',
  expression = 'happy',
  className = '',
  palette: paletteProp,
}: FlowMascotProps) {
  const { customization } = useFlowCustomization();
  const palette = normalizePaletteSlug(paletteProp ?? customization.selectedPalette);
  const pack = normalizeMascotPackSlug(customization.selectedAnimationPack);

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

  const wrapClass = `flow-mascot-palette-wrap inline-block flow-mascot-palette-${palette} flow-mascot-pack-${pack}`;

  return (
    <span className={wrapClass}>
      <Image
        src={imageSrc}
        alt={`Flow mascot ${expression}`}
        width={dimension}
        height={dimension}
        className={`flow-mascot-img object-contain ${className}`}
        priority
      />
    </span>
  );
}
