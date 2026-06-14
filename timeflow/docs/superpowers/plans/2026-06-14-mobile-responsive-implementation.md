# Mobile Responsive Design Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make TimeFlow mobile-friendly with touch-optimized UI while preserving 100% of desktop functionality

**Architecture:** Progressive enhancement using Tailwind responsive breakpoints (`md:` prefix). Mobile-first CSS where creating new, desktop-preserving for existing components. Phase-based rollout with review gates and ruthless code reviews after each phase.

**Tech Stack:** Next.js 14, Tailwind CSS, React hooks, Typescript, react-big-calendar, dnd-kit

**Design Reference:** `docs/plans/2026-06-14-mobile-responsive-design.md`

---

## Phase 1: Mobile Foundations (2-3 hours)

### Task 1.1: Create Viewport Detection Hooks

**Files:**
- Create: `apps/web/src/hooks/useMediaQuery.ts`
- Create: `apps/web/src/hooks/useViewport.ts`

- [ ] **Step 1: Create useMediaQuery hook**

Create `apps/web/src/hooks/useMediaQuery.ts`:

```typescript
'use client';

import { useEffect, useState } from 'react';

/**
 * Hook to detect media query matches
 * @param query - CSS media query string (e.g., '(min-width: 768px)')
 * @returns boolean indicating if query matches
 */
export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(false);

  useEffect(() => {
    const media = window.matchMedia(query);

    if (media.matches !== matches) {
      setMatches(media.matches);
    }

    const listener = (event: MediaQueryListEvent) => {
      setMatches(event.matches);
    };

    // Modern browsers
    if (media.addEventListener) {
      media.addEventListener('change', listener);
      return () => media.removeEventListener('change', listener);
    }

    // Fallback for older browsers
    media.addListener(listener);
    return () => media.removeListener(listener);
  }, [matches, query]);

  return matches;
}
```

- [ ] **Step 2: Create useViewport hook**

Create `apps/web/src/hooks/useViewport.ts`:

```typescript
'use client';

import { useMediaQuery } from './useMediaQuery';

export type Breakpoint = 'mobile' | 'tablet' | 'desktop';

/**
 * Hook to detect current viewport breakpoint
 * Mobile: < 768px
 * Tablet: 768px - 1023px
 * Desktop: >= 1024px
 */
export function useViewport() {
  const isMobile = useMediaQuery('(max-width: 767px)');
  const isTablet = useMediaQuery('(min-width: 768px) and (max-width: 1023px)');
  const isDesktop = useMediaQuery('(min-width: 1024px)');

  const breakpoint: Breakpoint = isMobile ? 'mobile' : isTablet ? 'tablet' : 'desktop';

  return {
    isMobile,
    isTablet,
    isDesktop,
    breakpoint,
  };
}
```

- [ ] **Step 3: Verify no TypeScript errors**

Run: `cd apps/web && pnpm tsc --noEmit`
Expected: No errors

- [ ] **Step 4: Commit viewport hooks**

```bash
git add apps/web/src/hooks/useMediaQuery.ts apps/web/src/hooks/useViewport.ts
git commit -m "feat(mobile): add viewport detection hooks for responsive breakpoints"
```

---

### Task 1.2: Configure Tailwind for Mobile

**Files:**
- Modify: `apps/web/tailwind.config.js`

- [ ] **Step 1: Read current Tailwind config**

Run: `cat apps/web/tailwind.config.js`

- [ ] **Step 2: Add mobile breakpoints and tokens**

In `apps/web/tailwind.config.js`, update the `theme` section:

```javascript
module.exports = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    screens: {
      'xs': '475px',
      'sm': '640px',
      'md': '768px',
      'lg': '1024px',
      'xl': '1280px',
      '2xl': '1536px',
    },
    extend: {
      colors: {
        // ... existing colors unchanged
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
      fontSize: {
        // Mobile-optimized font sizes
        'mobile-xs': ['0.75rem', { lineHeight: '1.25rem' }],
        'mobile-sm': ['0.875rem', { lineHeight: '1.5rem' }],
        'mobile-base': ['1rem', { lineHeight: '1.75rem' }],
        'mobile-lg': ['1.125rem', { lineHeight: '1.875rem' }],
        'mobile-xl': ['1.25rem', { lineHeight: '2rem' }],
        'mobile-2xl': ['1.5rem', { lineHeight: '2.25rem' }],
      },
      spacing: {
        // ... existing spacing
        // Mobile-friendly touch targets
        'touch': '44px',
        'touch-lg': '56px',
      },
      // ... rest of existing config
      borderRadius: {
        'panel': '12px',
        'control': '10px',
      },
      boxShadow: {
        'panel': '0 1px 2px 0 rgb(0 0 0 / 0.05), 0 1px 3px 1px rgb(0 0 0 / 0.05)',
        'hover': '0 2px 4px 0 rgb(0 0 0 / 0.06), 0 2px 6px 2px rgb(0 0 0 / 0.06)',
        'modal': '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 10px 15px -3px rgb(0 0 0 / 0.1)',
      },
      animation: {
        'bounce-slow': 'bounce 3s ease-in-out infinite',
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
        'fast': '150ms',
        'normal': '200ms',
      },
    },
  },
  plugins: [],
};
```

- [ ] **Step 3: Verify no build errors**

Run: `cd apps/web && pnpm build`
Expected: Build succeeds

- [ ] **Step 4: Commit Tailwind config**

```bash
git add apps/web/tailwind.config.js
git commit -m "feat(mobile): add mobile breakpoints and touch target tokens to Tailwind"
```

---

### Task 1.3: Create Mobile Typography System

**Files:**
- Create: `apps/web/src/styles/mobile.css`
- Modify: `apps/web/src/app/globals.css`

- [ ] **Step 1: Create mobile.css**

Create `apps/web/src/styles/mobile.css`:

```css
/**
 * Mobile-specific styles
 * Applied at breakpoints < 768px
 */

@media (max-width: 767px) {
  /* Base mobile typography - larger, more readable */
  body {
    font-size: 16px; /* Prevent iOS zoom on inputs */
    line-height: 1.6;
  }

  /* Page titles larger and clearer on mobile */
  .page-title {
    font-size: 1.75rem; /* 28px */
    line-height: 2rem;
  }

  .page-subtitle {
    font-size: 1rem;
    line-height: 1.5rem;
  }

  /* Better readability for body text */
  p, .text-base {
    font-size: 1rem;
    line-height: 1.75rem;
  }

  /* Smaller elements still readable */
  .text-sm {
    font-size: 0.875rem;
    line-height: 1.5rem;
  }

  .text-xs {
    font-size: 0.8125rem; /* Slightly larger than default 0.75rem */
    line-height: 1.25rem;
  }

  /* Headings optimized for mobile */
  h1 {
    font-size: 2rem;
    line-height: 2.25rem;
  }

  h2 {
    font-size: 1.5rem;
    line-height: 2rem;
  }

  h3 {
    font-size: 1.25rem;
    line-height: 1.75rem;
  }

  /* Mobile-optimized spacing */
  .app-main {
    padding: 1rem 0.75rem; /* 16px top/bottom, 12px left/right */
  }

  .app-header {
    padding: 0.75rem 1rem; /* 12px top/bottom, 16px left/right */
  }

  .app-footer {
    padding: 1rem;
  }

  /* Reduce gap in page layouts */
  .page-shell {
    gap: 1rem; /* 16px instead of 24px */
  }

  /* Cards and panels full width on mobile */
  .surface-card {
    border-radius: 12px; /* Slightly smaller radius */
  }

  /* Better scrolling on mobile */
  .overflow-x-auto {
    -webkit-overflow-scrolling: touch;
    scrollbar-width: thin;
  }

  /* Performance optimizations */
  * {
    -webkit-tap-highlight-color: rgba(0, 0, 0, 0);
    -webkit-touch-callout: none;
  }

  /* GPU acceleration for smooth animations */
  .animate-slide-in,
  .animate-fade-in,
  .transition-transform {
    will-change: transform;
    transform: translateZ(0);
  }

  /* Optimize images for mobile */
  img {
    image-rendering: -webkit-optimize-contrast;
  }
}

/* Reduce motion for better battery life */
@media (max-width: 767px) and (prefers-reduced-motion: reduce) {
  *,
  *::before,
  *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
  }
}
```

- [ ] **Step 2: Import mobile.css in globals.css**

In `apps/web/src/app/globals.css`, add after design tokens import:

```css
@tailwind base;
@tailwind components;
@tailwind utilities;

/* Import design tokens */
@import '../styles/design-tokens.css';
/* Import mobile styles */
@import '../styles/mobile.css';

/* ... rest of existing styles unchanged ... */
```

- [ ] **Step 3: Verify build succeeds**

Run: `cd apps/web && pnpm build`
Expected: Build succeeds

- [ ] **Step 4: Test mobile styles at 375px**

1. Run: `cd apps/web && pnpm dev`
2. Open http://localhost:3000
3. Open Chrome DevTools → Device Mode
4. Set to iPhone SE (375px width)
5. Verify text is 16px base (check computed styles)

- [ ] **Step 5: Commit mobile typography**

```bash
git add apps/web/src/styles/mobile.css apps/web/src/app/globals.css
git commit -m "feat(mobile): add mobile-optimized typography system with 16px base"
```

---

### Task 1.4: Optimize Button Component for Mobile

**Files:**
- Modify: `apps/web/src/components/ui/Button.tsx`

- [ ] **Step 1: Read current Button component**

Run: `cat apps/web/src/components/ui/Button.tsx`

- [ ] **Step 2: Update size styles for mobile touch targets**

In `apps/web/src/components/ui/Button.tsx`, replace the `sizeStyles` constant:

```typescript
const sizeStyles: Record<ButtonSize, string> = {
  // Mobile-first sizing with larger touch targets
  sm: 'px-3 py-2.5 text-sm min-h-[44px] md:min-h-[40px] md:py-2',
  md: 'px-4 py-3 text-base min-h-[48px] md:min-h-[44px] md:text-sm md:py-3',
  lg: 'px-6 py-3.5 text-lg min-h-[56px] md:min-h-[48px] md:py-4',
};
```

- [ ] **Step 3: Add mobile feedback with active state**

In `apps/web/src/components/ui/Button.tsx`, update the `baseStyles` constant:

```typescript
const baseStyles =
  'inline-flex items-center justify-center gap-2 font-medium rounded-xl transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed active:scale-95';
```

- [ ] **Step 4: Verify TypeScript compiles**

Run: `cd apps/web && pnpm tsc --noEmit`
Expected: No errors

- [ ] **Step 5: Test button at mobile size**

1. Open http://localhost:3000 in Chrome DevTools device mode at 375px
2. Find any button on page
3. Measure height (should be 48px minimum for md size)
4. Verify text is 16px (base size on mobile)

- [ ] **Step 6: Test button at desktop size**

1. Switch Chrome DevTools to desktop (1280px+)
2. Find same button
3. Verify height is 44px (md size)
4. Verify text is 14px (sm text on desktop)

- [ ] **Step 7: Commit button optimization**

```bash
git add apps/web/src/components/ui/Button.tsx
git commit -m "feat(mobile): optimize button touch targets (44-56px) while preserving desktop sizes"
```

---

### Task 1.5: Phase 1 Review Gate

**Review Checklist:**

- [ ] **Desktop Regression Check**

1. Open http://localhost:3000 at 1280px viewport
2. Verify buttons same size as before (44px for md)
3. Verify typography unchanged
4. Check console for errors (should be clean)

- [ ] **Mobile Verification**

1. Test at 375px (iPhone SE)
2. Verify buttons minimum 44px height
3. Verify text readable (16px base)
4. Test button active state (should scale down slightly on tap)

- [ ] **Code Quality - Run ruthless-reviewer**

Run the ruthless-reviewer agent to check for issues. Fix ALL critical/high priority issues before proceeding.

- [ ] **Phase 1 Deployment**

```bash
git push origin main
# Monitor Vercel deployment
# Check production at time-flow.app on desktop and mobile
# Wait 30 minutes, monitor for errors
```

---

## Phase 2: High-Impact Pages - Today & Tasks (4-5 hours)

### Task 2.1: Mobile-Responsive Layout & Navigation

**Files:**
- Modify: `apps/web/src/components/Layout.tsx`

- [ ] **Step 1: Read current Layout component**

Run: `head -100 apps/web/src/components/Layout.tsx`

- [ ] **Step 2: Update mobile sidebar to full-width when open**

In `apps/web/src/components/Layout.tsx`, find the `<aside>` element (around line 215) and update its className:

```typescript
<aside
  className={`fixed inset-y-0 left-0 z-40 flex flex-col border-r border-slate-200 bg-white/90 backdrop-blur transition-all duration-200 ease-out md:relative md:z-auto md:translate-x-0 ${
    isMobileSidebarOpen ? 'w-full sm:w-80' : 'w-60'
  } ${sidebarWidth} ${
    isMobileSidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
  }`}
>
```

- [ ] **Step 3: Add ARIA attributes to mobile hamburger button**

In `apps/web/src/components/Layout.tsx`, find the mobile hamburger button (around line 446) and ensure it has proper ARIA:

```typescript
<button
  type="button"
  onClick={() => setIsMobileSidebarOpen(true)}
  className="inline-flex items-center justify-center rounded-lg border border-slate-200 bg-white min-h-[44px] min-w-[44px] text-slate-600 hover:text-primary-600 hover:border-primary-200 active:bg-slate-50 transition-colors"
  aria-label="Open navigation menu"
  aria-expanded={isMobileSidebarOpen}
>
  <MenuIcon className="h-6 w-6" />
</button>
```

- [ ] **Step 4: Increase mobile nav tab touch targets**

In `apps/web/src/components/Layout.tsx`, find the mobile horizontal nav (around line 466) and update the Link className:

```typescript
<Link
  key={item.href}
  href={item.href}
  title={item.label}
  aria-label={item.label}
  className={`flex items-center gap-2.5 rounded-xl px-4 py-3 min-h-[48px] text-base font-medium transition-colors whitespace-nowrap active:scale-95 ${
    isActive
      ? 'bg-primary-50 text-primary-700 shadow-sm'
      : 'text-slate-600 hover:text-primary-600 hover:bg-slate-100'
  }`}
>
  <Icon className="h-5 w-5 flex-shrink-0" />
  <span className="text-base">{item.label}</span>
</Link>
```

- [ ] **Step 5: Test mobile navigation**

1. Open http://localhost:3000 at 375px
2. Click hamburger menu
3. Verify sidebar opens full-width
4. Verify backdrop overlay visible
5. Click outside sidebar to close
6. Test horizontal nav tabs scroll correctly

- [ ] **Step 6: Test desktop unchanged**

1. Open http://localhost:3000 at 1280px
2. Verify sidebar same as before
3. Verify desktop nav bar unchanged
4. No hamburger menu visible

- [ ] **Step 7: Commit layout improvements**

```bash
git add apps/web/src/components/Layout.tsx
git commit -m "feat(mobile): improve navigation with full-width drawer and larger touch targets"
```

---

### Task 2.2: Mobile-Optimized Input Components

**Files:**
- Modify: `apps/web/src/components/ui/Input.tsx`
- Modify: `apps/web/src/components/ui/Textarea.tsx`
- Modify: `apps/web/src/components/ui/Select.tsx`

- [ ] **Step 1: Update Input component for mobile**

In `apps/web/src/components/ui/Input.tsx`, update the `baseStyles`:

```typescript
const baseStyles =
  'w-full rounded-lg border border-slate-300 px-3 py-2.5 text-base md:text-sm min-h-[48px] md:min-h-[44px] bg-white text-slate-900 placeholder-slate-400 transition-all focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent disabled:bg-slate-100 disabled:cursor-not-allowed';
```

- [ ] **Step 2: Update Textarea component for mobile**

In `apps/web/src/components/ui/Textarea.tsx`, update the `baseStyles`:

```typescript
const baseStyles =
  'w-full rounded-lg border border-slate-300 px-3 py-2.5 text-base md:text-sm min-h-[96px] bg-white text-slate-900 placeholder-slate-400 transition-all focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent disabled:bg-slate-100 disabled:cursor-not-allowed resize-y';
```

- [ ] **Step 3: Update Select component for mobile**

In `apps/web/src/components/ui/Select.tsx`, update the `baseStyles`:

```typescript
const baseStyles =
  'w-full rounded-lg border border-slate-300 px-3 py-2.5 pr-10 text-base md:text-sm min-h-[48px] md:min-h-[44px] bg-white text-slate-900 transition-all focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent disabled:bg-slate-100 disabled:cursor-not-allowed appearance-none';
```

- [ ] **Step 4: Test inputs on mobile**

1. Open any page with form inputs at 375px
2. Focus an input field
3. Verify iOS Safari doesn't zoom (16px font prevents this)
4. Verify input height is 48px

- [ ] **Step 5: Test inputs on desktop**

1. Open same page at 1280px
2. Verify input height is 44px
3. Verify text is 14px (sm on desktop)

- [ ] **Step 6: Commit input optimizations**

```bash
git add apps/web/src/components/ui/Input.tsx apps/web/src/components/ui/Textarea.tsx apps/web/src/components/ui/Select.tsx
git commit -m "feat(mobile): optimize form inputs for 48px touch targets and prevent iOS zoom"
```

---

### Task 2.3: Responsive Tasks Page

**Files:**
- Modify: `apps/web/src/app/tasks/page.tsx`
- Modify: `apps/web/src/components/ui/TaskCard.tsx`

- [ ] **Step 1: Make task tabs horizontally scrollable on mobile**

In `apps/web/src/app/tasks/page.tsx`, find the tab navigation section and update:

```typescript
{/* Tab Navigation - Mobile Scrollable */}
<div className="flex gap-2 border-b border-slate-200 -mx-4 px-4 md:mx-0 md:px-0 overflow-x-auto scrollbar-thin pb-px">
  {(['unscheduled', 'scheduled', 'completed'] as TabType[]).map((tab) => {
    const count = filteredAndSortedTasks.filter((t) => {
      if (tab === 'unscheduled') return t.status === 'unscheduled';
      if (tab === 'scheduled') return t.status === 'scheduled';
      if (tab === 'completed') return t.status === 'completed';
      return false;
    }).length;

    return (
      <button
        key={tab}
        onClick={() => setActiveTab(tab)}
        className={`flex-shrink-0 px-4 md:px-6 py-3 md:py-4 min-h-[48px] text-base md:text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
          activeTab === tab
            ? 'border-primary-600 text-primary-700 bg-primary-50/50'
            : 'border-transparent text-slate-600 hover:text-primary-600 hover:border-slate-300'
        }`}
      >
        <span className="capitalize">{tab}</span>
        {count > 0 && (
          <span className={`ml-2 inline-flex items-center justify-center rounded-full px-2 py-0.5 text-xs font-medium ${
            activeTab === tab
              ? 'bg-primary-100 text-primary-700'
              : 'bg-slate-100 text-slate-600'
          }`}>
            {count}
          </span>
        )}
      </button>
    );
  })}
</div>
```

- [ ] **Step 2: Update TaskCard for mobile layout**

In `apps/web/src/components/ui/TaskCard.tsx`, update the main div className to add mobile-specific padding:

```typescript
<div className={`group relative bg-white rounded-xl border-2 transition-all cursor-pointer p-3 md:p-4 ${borderColor} ${hoverStyles}`}>
```

Update the title to be larger on mobile:

```typescript
<h3 className="font-semibold text-slate-900 mb-2 pr-8 text-base md:text-sm">
  {task.title}
</h3>
```

Update description to be more readable on mobile:

```typescript
{task.description && (
  <p className="text-sm md:text-xs text-slate-600 mb-3 line-clamp-2 md:line-clamp-3">
    {task.description}
  </p>
)}
```

Update meta info to stack on very small screens:

```typescript
<div className="flex flex-col xs:flex-row xs:items-center gap-2 xs:gap-3 text-xs md:text-xs text-slate-500">
  {/* ... existing meta info ... */}
</div>
```

- [ ] **Step 3: Test tasks page on mobile**

1. Open http://localhost:3000/tasks at 375px
2. Verify tabs scroll horizontally
3. Verify task cards full-width
4. Verify text readable

- [ ] **Step 4: Test tasks page on desktop**

1. Open http://localhost:3000/tasks at 1280px
2. Verify layout unchanged from current
3. Verify card sizes same as before

- [ ] **Step 5: Commit tasks page improvements**

```bash
git add apps/web/src/app/tasks/page.tsx apps/web/src/components/ui/TaskCard.tsx
git commit -m "feat(mobile): make tasks page responsive with scrollable tabs and full-width cards"
```

---

### Task 2.4: Responsive SearchBar and FilterPanel

**Files:**
- Modify: `apps/web/src/components/ui/SearchBar.tsx`
- Modify: `apps/web/src/components/ui/FilterPanel.tsx`

- [ ] **Step 1: Optimize SearchBar for mobile**

In `apps/web/src/components/ui/SearchBar.tsx`, update the input to have larger touch target:

```typescript
<input
  type="text"
  placeholder={placeholder}
  value={value}
  onChange={(e) => onChange(e.target.value)}
  className="w-full pl-10 pr-4 py-2.5 md:py-2 min-h-[48px] md:min-h-[44px] text-base md:text-sm rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
/>
```

- [ ] **Step 2: Make FilterPanel full-screen on mobile**

In `apps/web/src/components/ui/FilterPanel.tsx`, update the panel container to be full-screen on mobile:

```typescript
<div className={`fixed inset-0 md:inset-auto md:absolute md:right-0 md:top-12 z-50 ${
  isOpen ? 'block' : 'hidden'
}`}>
  {/* Mobile backdrop */}
  <div
    className="md:hidden fixed inset-0 bg-slate-900/50 backdrop-blur-sm"
    onClick={onClose}
  />

  {/* Filter panel */}
  <div className="fixed inset-x-0 bottom-0 md:relative md:inset-auto bg-white rounded-t-2xl md:rounded-xl shadow-2xl md:shadow-lg w-full md:w-80 max-h-[85vh] md:max-h-[600px] flex flex-col">
    {/* Header */}
    <div className="flex items-center justify-between px-4 md:px-6 py-4 border-b border-slate-200">
      <h3 className="text-lg md:text-base font-semibold text-slate-900">Filters</h3>
      <button
        onClick={onClose}
        className="inline-flex items-center justify-center rounded-lg min-h-[44px] min-w-[44px] md:min-h-[36px] md:min-w-[36px] text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
        aria-label="Close filters"
      >
        <svg className="w-6 h-6 md:w-5 md:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
    </div>

    {/* Content */}
    <div className="flex-1 overflow-y-auto px-4 md:px-6 py-4">
      {children}
    </div>

    {/* Footer */}
    <div className="flex gap-2 px-4 md:px-6 py-4 border-t border-slate-200">
      <button
        onClick={onClear}
        className="flex-1 px-4 py-2.5 md:py-2 min-h-[48px] md:min-h-[44px] text-base md:text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors"
      >
        Clear All
      </button>
      <button
        onClick={onClose}
        className="flex-1 px-4 py-2.5 md:py-2 min-h-[48px] md:min-h-[44px] text-base md:text-sm font-medium text-white bg-primary-600 rounded-lg hover:bg-primary-700 transition-colors"
      >
        Apply
      </button>
    </div>
  </div>
</div>
```

- [ ] **Step 3: Test SearchBar on mobile**

1. Open tasks page at 375px
2. Tap search bar
3. Verify no zoom (16px font)
4. Verify height is 48px

- [ ] **Step 4: Test FilterPanel on mobile**

1. Open tasks page at 375px
2. Click filters button
3. Verify panel slides up full-screen
4. Verify backdrop visible
5. Tap outside to close

- [ ] **Step 5: Test on desktop unchanged**

1. Open tasks page at 1280px
2. Verify search bar same size as before
3. Verify filter panel appears as popover (not full-screen)

- [ ] **Step 6: Commit search and filter improvements**

```bash
git add apps/web/src/components/ui/SearchBar.tsx apps/web/src/components/ui/FilterPanel.tsx
git commit -m "feat(mobile): optimize search bar and make filter panel full-screen on mobile"
```

---

### Task 2.5: Phase 2 Review Gate

**Review Checklist:**

- [ ] **Desktop Regression Check**

1. Open http://localhost:3000 at 1280px
2. Test all pages: Today, Tasks
3. Verify sidebar unchanged
4. Verify navigation unchanged
5. Verify task cards same size
6. Verify search and filters in same position
7. Check console for errors

- [ ] **Mobile Verification**

1. Test at 375px and 768px
2. Verify mobile nav drawer opens/closes
3. Verify horizontal nav tabs scroll
4. Verify task cards full-width and readable
5. Verify filter panel full-screen
6. All buttons minimum 44px

- [ ] **Accessibility Check**

1. Verify mobile nav has aria-expanded
2. Verify all icon buttons have aria-label
3. Test keyboard navigation (tab through elements)
4. Test focus indicators visible

- [ ] **Code Quality - Run ruthless-reviewer**

Fix ALL critical/high issues before proceeding.

- [ ] **Phase 2 Deployment**

```bash
git push origin main
# Monitor Vercel deployment
# Check production on desktop and mobile
# Wait 30 minutes
```

---

## Phase 3: Calendar with Mobile Drag-Drop (4-6 hours)

### Task 3.1: Mobile Calendar CSS

**Files:**
- Modify: `apps/web/src/styles/mobile.css`

- [ ] **Step 1: Add mobile calendar optimizations to mobile.css**

Append to `apps/web/src/styles/mobile.css`:

```css
@media (max-width: 767px) {
  /* ... existing mobile styles ... */

  /* Mobile calendar optimizations */
  .rbc-calendar {
    padding: 0.75rem;
    border-radius: 12px;
    font-size: 14px;
  }

  /* Larger touch targets for calendar headers */
  .rbc-header {
    padding: 0.75rem 0.5rem;
    font-size: 0.8125rem;
  }

  /* Larger time slots for easier interaction */
  .rbc-time-slot {
    min-height: 50px;
  }

  /* Events more prominent on mobile */
  .rbc-event {
    font-size: 0.8125rem;
    padding: 0.375rem 0.5rem;
    border-radius: 8px;
  }

  /* Toolbar larger on mobile */
  .rbc-toolbar {
    flex-direction: column;
    gap: 0.75rem;
    margin-bottom: 1rem;
  }

  .rbc-toolbar-label {
    font-size: 1.125rem;
    font-weight: 600;
  }

  .rbc-toolbar button {
    min-height: 44px;
    padding: 0.625rem 1rem;
    font-size: 0.875rem;
  }

  /* Stack calendar controls on mobile */
  .rbc-toolbar > * {
    width: 100%;
    justify-content: center;
  }

  .rbc-toolbar .rbc-btn-group {
    width: auto;
  }

  /* Hide seconds and show simpler time format */
  .rbc-time-header-gutter {
    min-width: 60px;
  }

  /* Simpler event rendering on mobile */
  .rbc-event-content {
    font-size: 0.8125rem;
    line-height: 1.3;
  }

  /* All-day events section larger */
  .rbc-allday-cell {
    min-height: 60px;
  }

  /* Horizontal scroll for week view on mobile */
  .rbc-time-header {
    overflow-x: auto;
    -webkit-overflow-scrolling: touch;
  }

  .rbc-time-content {
    overflow-x: auto;
    -webkit-overflow-scrolling: touch;
  }
}
```

- [ ] **Step 2: Verify build succeeds**

Run: `cd apps/web && pnpm build`
Expected: Build succeeds

- [ ] **Step 3: Commit mobile calendar CSS**

```bash
git add apps/web/src/styles/mobile.css
git commit -m "feat(mobile): add calendar-specific mobile CSS with larger touch targets"
```

---

### Task 3.2: Calendar View Mobile Logic

**Files:**
- Modify: `apps/web/src/components/CalendarView.tsx`

- [ ] **Step 1: Import useViewport hook**

At the top of `apps/web/src/components/CalendarView.tsx`, add import:

```typescript
import { useViewport } from '@/hooks/useViewport';
```

- [ ] **Step 2: Add viewport detection and default view logic**

Inside the CalendarView component, after the existing state declarations, add:

```typescript
const { isMobile } = useViewport();

// Default to day view on mobile, week on desktop
const [currentView, setCurrentView] = useState<View>(
  isMobile ? Views.DAY : Views.WEEK
);

// Update view when viewport changes
useEffect(() => {
  if (isMobile && (currentView === Views.WEEK || currentView === Views.MONTH)) {
    setCurrentView(Views.DAY);
  }
}, [isMobile, currentView]);
```

- [ ] **Step 3: Add drag activation constraints for mobile**

Find the `useSensors` hook (should be around the drag-drop setup) and update:

```typescript
const sensors = useSensors(
  useSensor(PointerSensor, {
    activationConstraint: {
      distance: 10, // Require 10px drag before activating (allows scrolling)
    },
  }),
  useSensor(KeyboardSensor)
);
```

- [ ] **Step 4: Make drag preview smaller on mobile**

Find the DragOverlay component and update its content:

```typescript
<DragOverlay>
  {activeTask ? (
    <div className={`px-2 py-1 md:px-3 md:py-2 rounded-lg shadow-xl text-xs md:text-sm font-medium ${
      activeTask.scheduledTask?.overflowedDeadline
        ? 'bg-red-500 text-white'
        : 'bg-primary-600 text-white'
    }`}>
      {activeTask.title}
    </div>
  ) : null}
</DragOverlay>
```

- [ ] **Step 5: Test calendar on mobile**

1. Open http://localhost:3000/calendar at 375px
2. Verify defaults to day view
3. Try scrolling time slots (should work smoothly)
4. Try dragging event after holding 10px (should trigger drag)

- [ ] **Step 6: Test calendar on desktop unchanged**

1. Open http://localhost:3000/calendar at 1280px
2. Verify defaults to week view (current behavior)
3. Verify drag-drop works immediately (no 10px delay noticeable)

- [ ] **Step 7: Commit calendar view mobile logic**

```bash
git add apps/web/src/components/CalendarView.tsx
git commit -m "feat(mobile): default calendar to day view on mobile with drag activation constraints"
```

---

### Task 3.3: Calendar Page Controls

**Files:**
- Modify: `apps/web/src/app/calendar/page.tsx`

- [ ] **Step 1: Make calendar controls stack on mobile**

In `apps/web/src/app/calendar/page.tsx`, find the controls section and update:

```typescript
<div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 md:gap-4 mb-4">
  {/* View toggle - Full width on mobile */}
  <div className="flex gap-2 overflow-x-auto scrollbar-thin pb-1 md:pb-0">
    <button
      onClick={() => handleViewChange(Views.DAY)}
      className={`flex-shrink-0 px-4 py-2.5 md:py-2 min-h-[48px] md:min-h-[40px] text-base md:text-sm font-medium rounded-lg transition-colors ${
        view === Views.DAY
          ? 'bg-primary-600 text-white'
          : 'bg-white text-slate-700 border border-slate-300 hover:bg-slate-50'
      }`}
    >
      Day
    </button>
    <button
      onClick={() => handleViewChange(Views.WEEK)}
      className={`flex-shrink-0 px-4 py-2.5 md:py-2 min-h-[48px] md:min-h-[40px] text-base md:text-sm font-medium rounded-lg transition-colors ${
        view === Views.WEEK
          ? 'bg-primary-600 text-white'
          : 'bg-white text-slate-700 border border-slate-300 hover:bg-slate-50'
      }`}
    >
      Week
    </button>
    <button
      onClick={() => handleViewChange(Views.MONTH)}
      className={`flex-shrink-0 px-4 py-2.5 md:py-2 min-h-[48px] md:min-h-[40px] text-base md:text-sm font-medium rounded-lg transition-colors ${
        view === Views.MONTH
          ? 'bg-primary-600 text-white'
          : 'bg-white text-slate-700 border border-slate-300 hover:bg-slate-50'
      }`}
    >
      Month
    </button>
  </div>

  {/* Date navigation - Full width on mobile */}
  <div className="flex items-center gap-2 justify-between md:justify-start">
    <button
      onClick={() => navigate('PREV')}
      className="inline-flex items-center justify-center rounded-lg border border-slate-300 bg-white min-h-[48px] min-w-[48px] md:min-h-[40px] md:min-w-[40px] text-slate-700 hover:bg-slate-50 transition-colors"
      aria-label="Previous"
    >
      {/* ... existing icon ... */}
    </button>

    <button
      onClick={() => navigate('TODAY')}
      className="px-4 py-2.5 md:py-2 min-h-[48px] md:min-h-[40px] text-base md:text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors"
    >
      Today
    </button>

    <button
      onClick={() => navigate('NEXT')}
      className="inline-flex items-center justify-center rounded-lg border border-slate-300 bg-white min-h-[48px] min-w-[48px] md:min-h-[40px] md:min-w-[40px] text-slate-700 hover:bg-slate-50 transition-colors"
      aria-label="Next"
    >
      {/* ... existing icon ... */}
    </button>
  </div>
</div>
```

- [ ] **Step 2: Test calendar controls on mobile**

1. Open http://localhost:3000/calendar at 375px
2. Verify controls stack vertically
3. Verify all buttons 48px height
4. Test view toggle buttons work
5. Test navigation buttons work

- [ ] **Step 3: Test calendar controls on desktop**

1. Open http://localhost:3000/calendar at 1280px
2. Verify controls in single row (horizontal layout)
3. Verify buttons 40px height (current size)

- [ ] **Step 4: Commit calendar controls**

```bash
git add apps/web/src/app/calendar/page.tsx
git commit -m "feat(mobile): stack calendar controls vertically on mobile with larger buttons"
```

---

### Task 3.4: Phase 3 Review Gate

**Review Checklist:**

- [ ] **Desktop Regression Check**

1. Open http://localhost:3000/calendar at 1280px
2. Verify defaults to week view
3. Verify drag-drop works exactly as before
4. Verify event rendering unchanged
5. Verify time slots same height
6. Check console for errors

- [ ] **Mobile Verification**

1. Test at 375px and 768px
2. Verify defaults to day view
3. Test scrolling (should not trigger drag)
4. Test dragging event after 10px movement (should work)
5. Verify calendar toolbar stacks vertically
6. Verify all buttons 44px minimum
7. Verify time slots 50px height

- [ ] **Drag-Drop Testing on Mobile**

1. Open calendar at 375px
2. Scroll up and down (should not trigger drag)
3. Press and hold event, drag 10px (should activate drag mode)
4. Drag to new time slot
5. Release to drop
6. Verify event updates to new time

- [ ] **Safari Testing (if available)**

1. Test on real iPhone or iPad
2. Verify drag-drop works
3. If issues, note in testing results

- [ ] **Accessibility Check**

1. Verify calendar events have aria-label
2. Test keyboard navigation (arrow keys should work)
3. Verify focus indicators visible

- [ ] **Code Quality - Run ruthless-reviewer**

Fix ALL critical/high issues before proceeding.

- [ ] **Phase 3 Deployment**

```bash
git push origin main
# Monitor Vercel deployment
# Check production on desktop and mobile
# Watch for Safari-specific issues
# Wait 30 minutes
```

---

## Phase 4: Comprehensive Component Coverage & Polish (6-8 hours)

### Task 4.1: Responsive Modal System

**Files:**
- Modify: `apps/web/src/app/globals.css`

- [ ] **Step 1: Add modal-responsive class to globals.css**

Append to `apps/web/src/app/globals.css` (after existing modal styles):

```css
/* Responsive modal system */
.modal-responsive {
  @apply fixed inset-0 md:inset-auto;
  @apply md:top-1/2 md:left-1/2 md:-translate-x-1/2 md:-translate-y-1/2;
  @apply w-full md:w-auto md:max-w-2xl;
  @apply h-full md:h-auto md:max-h-[85vh];
  @apply rounded-none md:rounded-2xl;
  @apply flex flex-col;
  @apply bg-white shadow-2xl;
}

.modal-header-responsive {
  @apply flex items-center justify-between gap-4;
  @apply px-4 md:px-6 py-4;
  @apply border-b border-slate-200;
  @apply flex-shrink-0;
}

.modal-content-responsive {
  @apply flex-1 overflow-y-auto;
  @apply px-4 md:px-6 py-4;
}

.modal-footer-responsive {
  @apply flex-shrink-0;
  @apply px-4 md:px-6 py-4;
  @apply border-t border-slate-200;
  @apply bg-slate-50;
}

.modal-close-button {
  @apply inline-flex items-center justify-center rounded-lg;
  @apply min-h-[44px] min-w-[44px];
  @apply text-slate-400 hover:text-slate-600 hover:bg-slate-100;
  @apply transition-colors;
}
```

- [ ] **Step 2: Commit modal responsive styles**

```bash
git add apps/web/src/app/globals.css
git commit -m "feat(mobile): add responsive modal utility classes for full-screen mobile modals"
```

---

### Task 4.2: Update All Modal Components

**Files:**
- Modify: `apps/web/src/components/habits/SchedulingProgressModal.tsx`
- Modify: `apps/web/src/components/calendar/MeetingActionItemsModal.tsx`
- Modify: `apps/web/src/components/KeyboardShortcutsModal.tsx`
- (Plus 5 more modal components)

- [ ] **Step 1: Update SchedulingProgressModal**

In `apps/web/src/components/habits/SchedulingProgressModal.tsx`, find the modal container div and update its className to use the new responsive classes:

```typescript
<div className="modal-responsive">
  <div className="modal-header-responsive">
    <h2 className="text-xl md:text-2xl font-bold text-slate-900">Scheduling Habits</h2>
    <button
      onClick={onClose}
      className="modal-close-button"
      aria-label="Close modal"
    >
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
      </svg>
    </button>
  </div>

  <div className="modal-content-responsive">
    {/* ... existing content ... */}
  </div>

  {/* Footer if present */}
  <div className="modal-footer-responsive">
    {/* ... existing footer content ... */}
  </div>
</div>
```

- [ ] **Step 2: Apply same pattern to remaining modals**

Update these modal components with the same pattern:
- MeetingActionItemsModal
- KeyboardShortcutsModal
- CategoryTrainingModal
- EndOfDaySummaryModal
- IdentityCelebrationModal
- PostHabitRelatedTasksModal
- EndOfDayIdentityReportModal

For each modal:
1. Replace modal container div className with `modal-responsive`
2. Replace header div className with `modal-header-responsive`
3. Replace content div className with `modal-content-responsive`
4. Replace footer div className with `modal-footer-responsive` (if footer exists)
5. Replace close button className with `modal-close-button`

- [ ] **Step 3: Test modal on mobile**

1. Open a page with a modal at 375px
2. Trigger modal to open
3. Verify modal is full-screen
4. Verify close button 44px minimum
5. Verify content scrolls if needed

- [ ] **Step 4: Test modal on desktop**

1. Open same page at 1280px
2. Trigger modal
3. Verify modal centered and max-width 2xl
4. Verify rounded corners
5. Verify not full-screen

- [ ] **Step 5: Commit modal updates**

```bash
git add apps/web/src/components/habits/SchedulingProgressModal.tsx apps/web/src/components/calendar/MeetingActionItemsModal.tsx apps/web/src/components/KeyboardShortcutsModal.tsx
# Add remaining modal files...
git commit -m "feat(mobile): update all modals to responsive full-screen on mobile"
```

---

### Task 4.3: Performance Optimizations

**Files:**
- Modify: `apps/web/next.config.js`
- Modify: `apps/web/src/app/layout.tsx`

- [ ] **Step 1: Update Next.js config for mobile optimization**

In `apps/web/next.config.js`, add image optimization config:

```javascript
/** @type {import('next').NextConfig} */
const nextConfig = {
  // ... existing config ...
  images: {
    formats: ['image/avif', 'image/webp'],
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048, 3840],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
  },
  // Optimize for mobile
  compiler: {
    removeConsole: process.env.NODE_ENV === 'production' ? {
      exclude: ['error', 'warn'],
    } : false,
  },
};

module.exports = nextConfig;
```

- [ ] **Step 2: Optimize font loading in layout**

In `apps/web/src/app/layout.tsx`, update the Inter font import:

```typescript
const inter = Inter({
  subsets: ['latin'],
  display: 'swap', // Prevent invisible text flash
  preload: true,
});
```

- [ ] **Step 3: Verify build succeeds**

Run: `cd apps/web && pnpm build`
Expected: Build succeeds

- [ ] **Step 4: Check bundle size**

Run: `cd apps/web && pnpm build | grep "First Load JS"`
Expected: < 220KB gzipped for main pages

- [ ] **Step 5: Commit performance optimizations**

```bash
git add apps/web/next.config.js apps/web/src/app/layout.tsx
git commit -m "feat(mobile): add image optimization and font loading improvements"
```

---

### Task 4.4: Accessibility Audit & Fixes

**Files:**
- Various components (determined by audit results)

- [ ] **Step 1: Install axe DevTools**

1. Open Chrome browser
2. Install "axe DevTools" extension from Chrome Web Store
3. Restart browser

- [ ] **Step 2: Run axe audit on all pages**

For each page (Today, Tasks, Calendar, Habits, Meetings, Inbox, Assistant, Settings):
1. Open page at 375px in Chrome
2. Open DevTools → axe DevTools tab
3. Click "Scan ALL of my page"
4. Review violations
5. Document critical/serious violations

- [ ] **Step 3: Fix common violations**

Common fixes needed:
- Add `aria-label` to icon-only buttons
- Ensure color contrast 4.5:1 minimum
- Add focus indicators to interactive elements
- Ensure form labels properly associated
- Add skip links for screen readers

Example fix for icon button without aria-label:

```typescript
<button
  onClick={handleAction}
  aria-label="Delete task"  // Add this
  className="..."
>
  <TrashIcon className="w-5 h-5" />
</button>
```

- [ ] **Step 4: Re-run audit and verify 0 violations**

Repeat Step 2 for all pages.
Expected: 0 critical or serious violations

- [ ] **Step 5: Manual screen reader test**

1. Enable VoiceOver (Mac: Cmd+F5) or NVDA (Windows)
2. Navigate through Today and Tasks pages
3. Verify all interactive elements announced
4. Verify logical navigation order
5. Disable screen reader

- [ ] **Step 6: Commit accessibility fixes**

```bash
git add .
git commit -m "feat(mobile): fix accessibility violations for WCAG 2.1 AA compliance"
```

---

### Task 4.5: Final Testing & Phase 4 Review Gate

**Review Checklist:**

- [ ] **Desktop Regression (Full Suite)**

1. Open app at 1280px viewport
2. Test ALL pages: Today, Tasks, Calendar, Habits, Meetings, Inbox, Assistant, Settings
3. Verify all modals centered and correct size
4. Verify all buttons unchanged
5. Verify all layouts identical to production
6. Verify drag-drop works on Calendar
7. Check console for errors (should be clean)

- [ ] **Mobile Verification (Full Suite)**

1. Test all pages at 375px (iPhone SE)
2. Test all pages at 390px (iPhone 14)
3. Test all pages at 768px (iPad)
4. Verify all touch targets minimum 44px
5. Verify all text readable (16px+ base)
6. Verify no horizontal scroll (except intentional)
7. Verify all modals full-screen
8. Verify all forms usable

- [ ] **Accessibility (WCAG 2.1 AA)**

1. Run axe DevTools on all pages
2. Verify 0 critical/serious violations
3. Verify color contrast 4.5:1 minimum
4. Verify all interactive elements keyboard accessible
5. Verify focus indicators visible
6. Verify screen reader compatibility

- [ ] **Performance (Core Web Vitals)**

1. Run Lighthouse on mobile preset:

```bash
lighthouse https://time-flow.app --preset=mobile --view
```

Expected scores:
- Performance: > 90
- Accessibility: 100
- Best Practices: > 95
- SEO: 100

Verify Core Web Vitals:
- LCP < 2.5s
- FID < 100ms
- CLS < 0.1

- [ ] **Bundle Size Check**

```bash
cd apps/web && pnpm build
# Check output for bundle sizes
# Verify main JS bundle < 220KB gzipped
```

- [ ] **Code Quality - Run ruthless-reviewer (Final)**

Fix ALL issues (critical, high, medium priority).

- [ ] **Phase 4 Final Deployment**

```bash
git push origin main
# Monitor Vercel deployment
# Check production thoroughly
# Monitor for 1 hour
# Check Vercel Analytics for real user metrics
```

---

## Post-Implementation

### Success Criteria Verification

- [ ] All desktop functionality unchanged ✅
- [ ] Mobile pages usable (Today, Tasks, Calendar) ✅
- [ ] Touch targets minimum 44px ✅
- [ ] Text readable (16px base) ✅
- [ ] No critical accessibility violations ✅
- [ ] Lighthouse accessibility score = 100 ✅

### Documentation Updates

- [ ] Update README.md with mobile features section
- [ ] Document responsive patterns for future developers
- [ ] Update CLAUDE.md if mobile-specific guidelines needed

---

## Rollback Procedures

### If Critical Issue Found

```bash
# Identify which phase caused the issue
git log --oneline

# Revert specific commit
git revert <commit-hash>
git push origin main

# Vercel auto-deploys rollback in ~2 minutes
```

### Partial Rollback

```bash
# Keep Phases 1-2, rollback Phase 3
git revert <phase-3-commit>
git push origin main
```

---

## Implementation Complete

All phases implemented with review gates. Desktop experience preserved. Mobile experience optimized. Ready for production use.
