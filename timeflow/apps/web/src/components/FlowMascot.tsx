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
import {
  resolveAccessoryAsset,
  resolveFlowCosmeticAssets,
  type CharacterLayerAsset,
} from '@/lib/characterAssets';
import { normalizeMascotPackSlug, normalizePaletteSlug } from '@/lib/flowCustomization';

interface FlowMascotProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  expression?: 'happy' | 'encouraging' | 'celebrating' | 'thinking' | 'guiding-up' | 'guiding-left' | 'guiding-right' | 'pointing-down';
  className?: string;
  /** Optional palette override; otherwise reads identity Flow customization from context. */
  palette?: string;
  /** Optional accessory override; otherwise reads identity Flow customization from context. */
  accessory?: string;
  hat?: string;
  eyes?: string;
  aura?: string;
  background?: string;
  /** Suppress cosmetic layers in tiny UI chrome and loading indicators. */
  showAccessory?: boolean;
}

export function FlowMascot({
  size = 'md',
  expression = 'happy',
  className = '',
  palette: paletteProp,
  accessory: accessoryProp,
  hat,
  eyes,
  aura,
  background,
  showAccessory = true,
}: FlowMascotProps) {
  const { customization } = useFlowCustomization();
  const reduceMotion = useReducedMotion() ?? false;
  const palette = normalizePaletteSlug(paletteProp ?? customization.selectedPalette);
  const pack = normalizeMascotPackSlug(customization.selectedAnimationPack);
  const assets = showAccessory
    ? accessoryProp
      ? [resolveAccessoryAsset(accessoryProp)].filter(
          (asset): asset is CharacterLayerAsset => asset !== null
        )
      : resolveFlowCosmeticAssets({
          selectedHat: hat ?? customization.selectedHat,
          selectedEyes: eyes ?? customization.selectedEyes,
          selectedAura: aura ?? customization.selectedAura,
          selectedBackground: background ?? customization.selectedBackground,
        })
    : [];

  const layerClassFor = (asset: CharacterLayerAsset): string =>
    asset.layer === 'hat'
      ? 'left-1/2 top-[-0.35rem] z-20 h-1/2 w-3/4 -translate-x-1/2'
      : asset.layer === 'eyes'
        ? 'left-1/2 top-[30%] z-20 h-[18%] w-[42%] -translate-x-1/2'
        : asset.layer === 'aura' || asset.layer === 'background'
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
  const accessoryLayer = (asset: CharacterLayerAsset) => (
    <span
      key={`${asset.layer}-${asset.slug}`}
      data-testid="flow-mascot-accessory"
      data-layer={asset.layer}
      data-layer-position={asset.layer === 'aura' || asset.layer === 'background' ? 'behind' : 'front'}
      aria-label={asset.alt}
      title={asset.alt}
      className={`pointer-events-none absolute flex items-center justify-center ${layerClassFor(asset)} ${
        asset.layer === 'aura' && !reduceMotion ? 'motion-safe:animate-pulse' : ''
      }`}
    >
      <img
        src={asset.src}
        alt=""
        aria-hidden="true"
        className="h-full w-full object-contain"
      />
    </span>
  );
  const behindAssets = assets.filter((asset) => asset.layer === 'aura' || asset.layer === 'background');
  const frontAssets = assets.filter((asset) => asset.layer !== 'aura' && asset.layer !== 'background');

  return (
    <span className={wrapClass}>
      {behindAssets.map(accessoryLayer)}
      <Image
        src={imageSrc}
        alt={`Flow mascot ${expression}`}
        width={dimension}
        height={dimension}
        className={`flow-mascot-img relative z-10 object-contain ${className}`}
        priority
      />
      {frontAssets.map(accessoryLayer)}
    </span>
  );
}
