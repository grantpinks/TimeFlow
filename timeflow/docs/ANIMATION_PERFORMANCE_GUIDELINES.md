# Animation & Performance Guidelines

This document outlines the animation timing, performance budget, and accessibility guidelines for the TimeFlow Assistant UI.

---

## Animation Timing Values

All animations in the Assistant UI follow a consistent timing system for a cohesive feel.

### Core Timing Values

| Duration | Use Case | Easing | Example |
|----------|----------|--------|---------|
| **0ms** | Reduced motion users | N/A | Instant state changes |
| **150-200ms** | Quick transitions | `ease-out` | Message fade-in, button hover |
| **200-300ms** | Standard transitions | `ease-out` / `easeInOut` | State changes, modal open/close |
| **1.8-2s** | Gentle animations | `easeInOut` | Mascot floating/bouncing |
| **2.5-3s** | Ambient effects | `easeInOut` | Glow pulsing, slow movements |
| **Infinity** | Continuous loops | `easeInOut` | Loading dots, thinking state |

### Animation Delays

Staggered animations use incremental delays for a flowing effect:

- **Quick actions:** `index * 0.05s` (50ms between items)
- **Message elements:** `0.1-0.2s` between sub-elements
- **Glow rings:** `0.2s`, `0.4s` stagger for layered depth

---

## Component-Specific Animations

### Hero State (Empty Chat)

**Flow Mascot Float:**
```typescript
animate={{ y: [0, -10, 0] }}
transition={{
  duration: 2,
  repeat: Infinity,
  ease: 'easeInOut',
}}
```

**Liquid Glow Pulse (3 layers):**
- **Outer ring:** 3s cycle, scale 1.0 → 1.08 → 1.0, opacity 0.8 → 1.0 → 0.8
- **Middle ring:** 2.5s cycle, scale 1.0 → 1.12 → 1.0, delay +0.2s
- **Inner ring:** 2s cycle, scale 1.0 → 1.15 → 1.0, delay +0.4s

**Quick Actions Entrance:**
```typescript
initial={{ opacity: 0, y: 20 }}
animate={{ opacity: 1, y: 0 }}
transition={{ delay: index * 0.05, duration: 0.2 }}
```

---

### Thinking State (Loading)

**Mascot Bounce:**
```typescript
animate={{ y: [0, -8, 0], opacity: 1 }}
transition={{
  y: {
    duration: 1.8,
    repeat: Infinity,
    ease: 'easeInOut',
  },
  opacity: {
    duration: 0.3,
  },
}
```

**Loading Dots:**
```typescript
// 3 dots with staggered animation delays
animationDelay: '0ms', '150ms', '300ms'
// Uses Tailwind's animate-bounce (built-in)
```

---

### Conversation State (Active Chat)

**Message Entrance:**
```typescript
initial={{ opacity: 0, y: 10 }}
animate={{ opacity: 1, y: 0 }}
transition={{ duration: 0.2 }}
```

**Mascot Avatar Entrance:**
```typescript
initial={{ opacity: 0, scale: 0.8 }}
animate={{ opacity: 1, scale: 1 }}
transition={{ duration: 0.2 }}
```

**Mascot Hover:**
```typescript
hover:scale-105
transition-transform
// Smooth 150ms transform transition
```

---

## Performance Budget

To ensure 60fps animations on mid-range devices, we enforce the following budgets:

### Frame Budget

| Metric | Target | Maximum | Notes |
|--------|--------|---------|-------|
| Frame rate | 60fps | 50fps minimum | On desktop & modern mobile |
| Frame time | 16.67ms | 20ms | Per frame budget |
| Long tasks | None | <50ms | Main thread blocking |
| Animation jank | <1% | <5% | Dropped frames percentage |

### Resource Budget

| Resource | Target | Maximum | Impact |
|----------|--------|---------|--------|
| JavaScript bundle | <300KB | 500KB gzipped | Initial page load |
| Animation CPU | <20% | 30% | During heavy animations |
| Memory usage | <50MB | 100MB | For assistant page |
| GPU layers | 5-8 | 12 | Composited layers |

---

## GPU Acceleration

All animations use GPU-accelerated properties for optimal performance:

### ✅ GPU-Accelerated Properties (Use These)

- `transform` (translate, scale, rotate)
- `opacity`
- `filter` (blur, with caveats - see below)

### ❌ CPU-Heavy Properties (Avoid in Animations)

- `width`, `height`
- `top`, `left`, `right`, `bottom`
- `margin`, `padding`
- `background-position`
- `color` (prefer opacity changes)

---

## Blur Filter Performance

**Liquid glow uses heavy blur filters:**
- Outer ring: `blur(40px)`
- Middle ring: `blur(30px)`
- Inner ring: `blur(20px)`

### Performance Considerations:

**✅ Optimizations Applied:**
- Blurs are on `position: absolute` elements (separate layers)
- Elements use `will-change: transform` implicitly via Framer Motion
- Glow sits behind mascot (painted once, then transformed)
- Reduced motion users get static blurs (no pulsing)

**⚠️ Potential Issues on Low-End Devices:**
- Heavy blur + animation can cause frame drops on <4GB RAM devices
- Mobile Safari sometimes struggles with multiple blurred layers
- Older Android devices may show stuttering

**🔧 Future Optimization if Needed:**
- Consider pre-rendered static blur images for low-powered devices
- Use `will-change: filter` sparingly (only during animation)
- Add device detection to disable blur on very low-end hardware
- Implement progressive enhancement: start with minimal blur, add more if device can handle it

---

## CSS Properties & Techniques

### Framer Motion Best Practices

**Use `motion.*` variants for reusable animations:**
```typescript
const fadeInUp = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -20 },
};

<motion.div variants={fadeInUp} />
```

**Use `AnimatePresence` for exit animations:**
```typescript
<AnimatePresence mode="wait">
  {condition && <motion.div exit={{ opacity: 0 }} />}
</AnimatePresence>
```

**Check `useReducedMotion()` for accessibility:**
```typescript
const reduceMotion = useReducedMotion();

<motion.div
  animate={reduceMotion ? { opacity: 1 } : { y: [0, -10, 0] }}
  transition={reduceMotion ? { duration: 0 } : { duration: 2, repeat: Infinity }}
/>
```

---

### Tailwind Motion Classes

**Standard transitions:**
```css
transition-all duration-200  /* Quick UI transitions */
transition-colors           /* Button color changes */
transition-transform        /* Hover scale effects */
```

**Motion-reduce support:**
```css
animate-bounce motion-reduce:animate-none  /* Disable for accessibility */
```

---

## Reduced Motion (Accessibility)

**All animations MUST respect `prefers-reduced-motion`.**

### Implementation:

Every Framer Motion component checks `useReducedMotion()`:

```typescript
const reduceMotion = useReducedMotion();

// Conditional animations
animate={reduceMotion ? { opacity: 1 } : { y: [0, -10, 0] }}
transition={reduceMotion ? { duration: 0 } : { duration: 2, repeat: Infinity }}

// Conditional hover effects
whileHover={reduceMotion ? undefined : { scale: 1.02 }}

// Conditional initial animations
initial={reduceMotion ? false : { opacity: 0, y: 20 }}
```

### What Happens with Reduced Motion:

| Animation | Normal | Reduced Motion |
|-----------|--------|----------------|
| Mascot float | Smooth bounce | Static position |
| Glow pulse | 3-layer animation | Static glow, lower opacity |
| Message entrance | Fade + slide | Instant appear |
| Quick actions | Staggered fade-in | Instant appear |
| Hover effects | Scale 1.02 | No scale change |
| Loading dots | Bouncing animation | Static or disabled |

**Note:** Tailwind's `motion-reduce:` utilities automatically disable CSS animations.

---

## Performance Profiling

### How to Profile Animations

**Chrome DevTools:**

1. **FPS Meter:**
   - DevTools → ⋮ → More tools → Rendering
   - Enable "FPS meter"
   - Interact with UI - should stay above 50fps

2. **Performance Panel:**
   - DevTools → Performance tab
   - Click record (red dot)
   - Interact with animations (scroll, hover, state changes)
   - Stop recording
   - Analyze:
     - Look for long tasks (yellow/red bars >50ms)
     - Check frame rate consistency
     - Inspect "Main" thread for bottlenecks
     - Check GPU usage in "GPU" track

3. **Layer Visualization:**
   - DevTools → ⋮ → More tools → Layers
   - See which elements are composited (separate GPU layers)
   - Too many layers = memory overhead
   - Too few layers = unnecessary repaints

4. **Paint Flashing:**
   - DevTools → Rendering → Paint flashing
   - Green flashes show repaints
   - Minimize repaints during animations

---

### Performance Metrics to Watch

**Core Web Vitals:**
- **LCP (Largest Contentful Paint):** <2.5s - Flow mascot image
- **FID (First Input Delay):** <100ms - Quick action click response
- **CLS (Cumulative Layout Shift):** <0.1 - No layout shifts during animation

**Custom Metrics:**
- Time to first interaction (buttons clickable)
- Animation frame consistency (60fps during scroll)
- Memory usage over 5-minute session

---

## Optimization Checklist

Before deploying new animations:

- [ ] Check `useReducedMotion()` is implemented
- [ ] Verify 60fps on desktop Chrome/Firefox
- [ ] Test on mid-range Android device (or DevTools throttling)
- [ ] Test on iPhone (Safari sometimes has different performance)
- [ ] Profile with Chrome DevTools Performance panel
- [ ] Confirm no long tasks >50ms during animation
- [ ] Verify memory doesn't grow excessively (check for leaks)
- [ ] Test with blur filters disabled (fallback gracefully)
- [ ] Ensure animations don't block user interaction
- [ ] Check animations work in reduced motion mode

---

## Known Performance Considerations

### Current Heavy Operations:

1. **Liquid Glow Effect:**
   - 3 layers × blur(20-40px) × continuous animation
   - **Impact:** ~10-15% CPU on high-end desktop, ~20-30% on mobile
   - **Mitigation:** Reduced motion disables animation, keeps static blur

2. **Framer Motion Bundle:**
   - Adds ~45KB gzipped to bundle
   - **Impact:** Acceptable for enhanced UX
   - **Mitigation:** Code-split if needed in future

3. **Next.js Image Component:**
   - Lazy loads mascot images
   - **Impact:** Hero mascot uses `priority` for instant load
   - **Benefit:** Optimized WebP format, responsive sizing

---

## Future Optimizations

If performance becomes an issue on low-end devices:

### Level 1: Easy Wins
- [ ] Reduce blur intensity (40px → 25px) on mobile
- [ ] Disable glow pulsing on <4GB RAM devices
- [ ] Use `will-change: transform` more sparingly
- [ ] Lazy-load Framer Motion for non-critical animations

### Level 2: Medium Effort
- [ ] Pre-render static glow as SVG or PNG for low-end devices
- [ ] Implement device detection to disable heavy effects
- [ ] Use CSS animations instead of Framer Motion for simple cases
- [ ] Add setting to disable animations

### Level 3: Major Refactor
- [ ] Use canvas-based rendering for glow effect
- [ ] Implement virtual scrolling for long conversations
- [ ] Switch to lighter animation library for simple transitions
- [ ] Add WebGL fallback for ultra-smooth effects

---

## Testing Matrix

Test animations on these configurations:

### Desktop
- [ ] Chrome (latest) - Windows 10/11
- [ ] Firefox (latest) - Windows 10/11
- [ ] Safari (latest) - macOS
- [ ] Edge (latest) - Windows 10/11

### Mobile
- [ ] Chrome - Android (mid-range device, e.g., Pixel 5)
- [ ] Safari - iOS (iPhone 12+)
- [ ] Samsung Internet - Android

### Performance Conditions
- [ ] **Fast 3G throttling** (DevTools Network tab)
- [ ] **4x CPU slowdown** (DevTools Performance tab)
- [ ] **Reduced motion enabled** (Browser/OS settings)
- [ ] **Battery saver mode** (Mobile devices)

---

## Debugging Animation Issues

### Common Issues & Fixes

**Issue: Animations are janky/stuttering**
- **Check:** FPS meter - are frames dropping?
- **Fix:** Reduce blur intensity, disable during interaction
- **Fix:** Use `will-change` sparingly (only during animation)
- **Fix:** Ensure transforms are GPU-accelerated

**Issue: Reduced motion not working**
- **Check:** `useReducedMotion()` hook present?
- **Fix:** Wrap all animations in conditional logic
- **Fix:** Add `motion-reduce:` Tailwind classes to CSS animations

**Issue: Glow effect not visible**
- **Check:** Parent container has enough space (80% overflow for glow)
- **Fix:** Add proper padding/margin around mascot
- **Fix:** Verify `z-index` layering

**Issue: Memory leak after many messages**
- **Check:** Chrome DevTools → Memory → Take heap snapshot
- **Fix:** Ensure animations cleanup on unmount
- **Fix:** Limit rendered messages (virtualize if >100)

---

## Animation Design Principles

Follow these principles when adding new animations:

### 1. **Purposeful Motion**
Every animation should have a reason:
- ✅ Guide attention (entrance animations)
- ✅ Provide feedback (button clicks)
- ✅ Show state (loading, thinking)
- ✅ Create delight (mascot float)
- ❌ Animate just because it looks cool

### 2. **Respect User Preferences**
- Always check `prefers-reduced-motion`
- Provide instant alternatives for all animations
- Don't force users to wait for animations to complete

### 3. **Performance Over Aesthetics**
- If an animation causes jank, simplify or remove it
- 60fps smooth animation > fancy 30fps animation
- Test on low-end devices, not just your MacBook Pro

### 4. **Consistency**
- Use timing values from this document
- Match easing curves across similar animations
- Maintain brand feel (gentle, flowing, not aggressive)

---

## Brand Animation Language

TimeFlow's animations embody "flow without friction":

**Characteristics:**
- **Gentle:** No harsh snaps or aggressive movements
- **Fluid:** Smooth easing (easeInOut, ease-out)
- **Ambient:** Background elements pulse slowly, never distract
- **Responsive:** Instant feedback on interaction
- **Natural:** Movements feel physics-based (floating, bouncing)

**Avoid:**
- Aggressive spring animations (too bouncy)
- Linear easing (feels robotic)
- Fast, jarring transitions
- Animations that block interaction

---

## Code Comments for Maintainers

When adding new animations, include comments:

```typescript
/*
 * Hero mascot float animation
 * Duration: 2s for gentle, natural feel
 * Repeat: Infinity for ambient background motion
 * Reduced motion: Disabled - mascot remains static
 * Performance: GPU-accelerated via transform
 */
animate={{ y: [0, -10, 0] }}
transition={{
  duration: 2,
  repeat: Infinity,
  ease: 'easeInOut',
}}
```

---

## Performance Budget Enforcement

### Current Bundle Size (as of 2025-12-24)

```
Assistant page bundle: ~320KB gzipped
  - Next.js core: ~180KB
  - Framer Motion: ~45KB
  - React Markdown: ~25KB
  - App code: ~70KB
```

**Target:** <500KB total
**Current:** 320KB ✅ Well within budget

### Monitoring

Use these commands to check bundle size:

```bash
cd apps/web
npm run build
# Check .next/static/chunks/pages/assistant-*.js size
```

**Alert if:**
- Assistant page bundle > 400KB gzipped
- Any single chunk > 200KB gzipped
- Total JavaScript > 1MB

---

## Accessibility WCAG 2.1 Compliance

All animations meet WCAG 2.1 Level AA:

### Success Criteria Met:

**2.2.2 Pause, Stop, Hide (Level A):**
- ✅ Animations can be paused via `prefers-reduced-motion`
- ✅ No auto-playing content that lasts >5 seconds (except ambient glow, which is decorative)

**2.3.1 Three Flashes or Below Threshold (Level A):**
- ✅ No flashing content
- ✅ Glow pulsing is slow (2-3s cycles), well below threshold

**2.3.3 Animation from Interactions (Level AAA - bonus):**
- ✅ Motion triggered by interaction can be disabled via reduced motion

---

**Last Updated:** 2025-12-24
**Next Review:** After any animation-heavy feature additions
