/**
 * Flow Mascot Component
 *
 * Displays the official TimeFlow mascot character using branded assets.
 * Flow is a friendly water droplet with an hourglass that represents time flowing.
 */

'use client';

import Image from 'next/image';

interface FlowMascotProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  expression?: 'happy' | 'encouraging' | 'celebrating' | 'thinking' | 'guiding-up' | 'guiding-left' | 'guiding-right' | 'pointing-down';
  className?: string;
}

export function FlowMascot({
  size = 'md',
  expression = 'happy',
  className = ''
}: FlowMascotProps) {
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

  return (
    <Image
      src={imageSrc}
      alt={`Flow mascot ${expression}`}
      width={dimension}
      height={dimension}
      className={`object-contain ${className}`}
      priority
    />
  );
}
