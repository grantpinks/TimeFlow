/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        // TimeFlow brand colors
        primary: {
          50: '#eff6ff',
          100: '#dbeafe',
          200: '#bfdbfe',
          300: '#93c5fd',
          400: '#60a5fa',
          500: '#3b82f6',
          600: '#2563eb',
          700: '#1d4ed8',
          800: '#1e40af',
          900: '#1e3a8a',
        },
        accent: {
          50: '#fdf4ff',
          100: '#fae8ff',
          200: '#f5d0fe',
          300: '#f0abfc',
          400: '#e879f9',
          500: '#d946ef',
          600: '#c026d3',
          700: '#a21caf',
          800: '#86198f',
          900: '#701a75',
        },
      },
      // Design Token System
      spacing: {
        // Standard rhythm: 4/8/12/16/24/32/48
        // Already covered by Tailwind defaults, but explicitly documented here
        // Inside containers: 16-24 (p-4, p-6)
        // Between sections: 24-32 (gap-6, gap-8)
        // Between dense rows: 8-12 (gap-2, gap-3)
      },
      borderRadius: {
        // Panel/Card surfaces
        'panel': '12px',
        // Inputs and buttons
        'control': '10px',
        // Pills and chips (already 'full' in Tailwind)
      },
      boxShadow: {
        // Elevation Level 1: Panels and containers (subtle lift)
        'panel': '0 1px 2px 0 rgb(0 0 0 / 0.05), 0 1px 3px 1px rgb(0 0 0 / 0.05)',
        // Elevation Level 2: Hover/active states (slightly stronger)
        'hover': '0 2px 4px 0 rgb(0 0 0 / 0.06), 0 2px 6px 2px rgb(0 0 0 / 0.06)',
        // Elevation Level 3: Modals and popovers (strongest)
        'modal': '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 10px 15px -3px rgb(0 0 0 / 0.1)',
      },
      animation: {
        'bounce-slow': 'bounce 3s ease-in-out infinite',
        // Subtle, quick transitions for state changes
        'fade-in': 'fadeIn 150ms ease-out',
        'slide-in': 'slideIn 200ms ease-out',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideIn: {
          '0%': { transform: 'translateY(-4px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
      },
      transitionDuration: {
        // Standard durations for motion
        'fast': '150ms',
        'normal': '200ms',
      },
    },
  },
  plugins: [],
};

