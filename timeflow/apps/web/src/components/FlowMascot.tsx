/**
 * Flow Mascot Component
 *
 * A friendly AI character that represents the TimeFlow habits coach.
 * Designed with a wave/flow aesthetic to embody both water flow and productive flow state.
 */

'use client';

interface FlowMascotProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  expression?: 'happy' | 'encouraging' | 'celebrating' | 'thinking';
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

  // Different eye expressions based on mood
  const eyes = {
    happy: (
      <>
        <circle cx="18" cy="20" r="2.5" fill="#1e293b" />
        <circle cx="30" cy="20" r="2.5" fill="#1e293b" />
        <circle cx="18.5" cy="19.5" r="1" fill="white" opacity="0.8" />
        <circle cx="30.5" cy="19.5" r="1" fill="white" opacity="0.8" />
      </>
    ),
    encouraging: (
      <>
        <circle cx="18" cy="19" r="2.5" fill="#1e293b" />
        <circle cx="30" cy="19" r="2.5" fill="#1e293b" />
        <path d="M 16 18 Q 18 16 20 18" stroke="#1e293b" strokeWidth="1.5" fill="none" strokeLinecap="round" />
        <path d="M 28 18 Q 30 16 32 18" stroke="#1e293b" strokeWidth="1.5" fill="none" strokeLinecap="round" />
      </>
    ),
    celebrating: (
      <>
        <path d="M 16 21 Q 18 18 20 21" stroke="#1e293b" strokeWidth="2" fill="none" strokeLinecap="round" />
        <path d="M 28 21 Q 30 18 32 21" stroke="#1e293b" strokeWidth="2" fill="none" strokeLinecap="round" />
      </>
    ),
    thinking: (
      <>
        <circle cx="18" cy="20" r="2" fill="#1e293b" />
        <circle cx="30" cy="20" r="2" fill="#1e293b" />
        <path d="M 18 20 L 17 22" stroke="#1e293b" strokeWidth="1.5" strokeLinecap="round" />
      </>
    ),
  };

  // Different mouth expressions
  const mouth = {
    happy: <path d="M 18 28 Q 24 32 30 28" stroke="#1e293b" strokeWidth="2" fill="none" strokeLinecap="round" />,
    encouraging: <path d="M 20 28 Q 24 30 28 28" stroke="#1e293b" strokeWidth="2" fill="none" strokeLinecap="round" />,
    celebrating: <path d="M 18 26 Q 24 34 30 26" stroke="#1e293b" strokeWidth="2.5" fill="none" strokeLinecap="round" />,
    thinking: <ellipse cx="24" cy="28" rx="2" ry="1.5" fill="#1e293b" />,
  };

  return (
    <svg
      width={dimension}
      height={dimension}
      viewBox="0 0 48 48"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      {/* Outer glow/aura */}
      <circle cx="24" cy="24" r="23" fill="url(#flowGlow)" opacity="0.3" />

      {/* Main body - wave shape */}
      <path
        d="M 24 4 C 14 4 8 10 8 18 C 8 24 10 28 12 32 C 14 36 16 40 24 44 C 32 40 34 36 36 32 C 38 28 40 24 40 18 C 40 10 34 4 24 4 Z"
        fill="url(#flowGradient)"
        stroke="url(#flowStroke)"
        strokeWidth="1.5"
      />

      {/* Wave pattern overlay */}
      <path
        d="M 12 22 Q 18 20 24 22 T 36 22"
        stroke="white"
        strokeWidth="1.5"
        fill="none"
        opacity="0.3"
        strokeLinecap="round"
      />
      <path
        d="M 14 26 Q 20 24 26 26 T 34 26"
        stroke="white"
        strokeWidth="1"
        fill="none"
        opacity="0.2"
        strokeLinecap="round"
      />

      {/* Face */}
      <g>
        {eyes[expression]}
        {mouth[expression]}
      </g>

      {/* Highlight/shine */}
      <ellipse
        cx="20"
        cy="12"
        rx="6"
        ry="4"
        fill="white"
        opacity="0.4"
      />

      {/* Sparkle effect for celebrating */}
      {expression === 'celebrating' && (
        <>
          <circle cx="38" cy="10" r="1.5" fill="#fbbf24" />
          <path d="M 38 6 L 38 14 M 34 10 L 42 10" stroke="#fbbf24" strokeWidth="1" />
          <circle cx="10" cy="14" r="1" fill="#fbbf24" />
          <path d="M 10 12 L 10 16 M 8 14 L 12 14" stroke="#fbbf24" strokeWidth="0.8" />
        </>
      )}

      {/* Gradients */}
      <defs>
        <linearGradient id="flowGradient" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#3b82f6" />
          <stop offset="100%" stopColor="#1d4ed8" />
        </linearGradient>
        <linearGradient id="flowStroke" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#60a5fa" />
          <stop offset="100%" stopColor="#2563eb" />
        </linearGradient>
        <radialGradient id="flowGlow">
          <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.8" />
          <stop offset="100%" stopColor="#3b82f6" stopOpacity="0" />
        </radialGradient>
      </defs>
    </svg>
  );
}
