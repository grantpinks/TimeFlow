/**
 * Animated Flow Mascot Component
 *
 * Enhanced version of FlowMascot with micro-animations for the analytics panel
 */

'use client';

import { useReducedMotion } from 'framer-motion';
import { FlowMascot } from './FlowMascot';

interface AnimatedFlowMascotProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  expression?: 'happy' | 'encouraging' | 'celebrating' | 'thinking' | 'guiding-up' | 'guiding-left' | 'guiding-right' | 'pointing-down';
  animation?: 'bounce' | 'pulse' | 'float' | 'glow' | 'none';
  className?: string;
}

export function AnimatedFlowMascot({
  size = 'md',
  expression = 'happy',
  animation = 'bounce',
  className = ''
}: AnimatedFlowMascotProps) {
  const prefersReducedMotion = useReducedMotion() ?? false;
  const animationClasses = {
    bounce: 'animate-gentle-bounce',
    pulse: 'animate-pulse',
    float: 'animate-float',
    glow: 'animate-glow',
    none: ''
  };

  const animationClass =
    prefersReducedMotion || animation === 'none' ? '' : animationClasses[animation];
  const combinedClassName = `${animationClass} ${className}`.trim();

  return (
    <div className="relative inline-block">
      <FlowMascot
        size={size}
        expression={expression}
        className={combinedClassName}
      />
    </div>
  );
}
