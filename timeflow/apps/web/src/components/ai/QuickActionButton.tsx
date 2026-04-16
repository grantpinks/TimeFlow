/**
 * Quick Action Button Component
 *
 * Pill-shaped buttons for common AI assistant actions
 */

'use client';

interface QuickActionButtonProps {
  icon: string;
  label: string;
  onClick: () => void;
  disabled?: boolean;
}

export function QuickActionButton({
  icon,
  label,
  onClick,
  disabled = false,
}: QuickActionButtonProps) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`
        group
        flex items-center gap-2
        px-4 py-2.5
        bg-white dark:bg-slate-800
        border border-slate-200 dark:border-slate-700
        rounded-full
        text-sm font-medium
        text-slate-700 dark:text-slate-300
        transition-all duration-200
        hover:bg-gradient-to-r hover:from-primary-500 hover:to-primary-600
        hover:text-white hover:border-transparent
        hover:shadow-lg hover:scale-105
        disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100
        focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2
      `}
    >
      <span className="text-base">{icon}</span>
      <span>{label}</span>
    </button>
  );
}
