# Mobile Responsiveness Guide

## Overview

TimeFlow is fully responsive and optimized for mobile devices with screen sizes from 320px to 2048px.

## Breakpoints

- **Mobile**: < 768px
- **Tablet**: 768px - 1023px
- **Desktop**: >= 1024px

## Mobile-Specific Features

### Touch Targets
- Minimum touch target size: 44x44px (Apple/Android guidelines)
- Primary actions: 48x48px
- Large primary actions: 56x56px

### Typography
- Base font size: 16px (prevents iOS zoom on input focus)
- Mobile-optimized line heights for better readability
- Larger heading sizes on mobile for hierarchy

### Navigation
- Full-screen sidebar drawer on mobile
- Horizontal scrollable nav tabs
- Bottom sheet modals for better thumb reach

### Components

#### Buttons
```tsx
// Mobile-first sizing
<Button size="md" /> // 48px min-height on mobile, 44px on desktop
```

#### Inputs
```tsx
// Prevents iOS zoom
<Input /> // 16px font size minimum
```

#### Modals
```tsx
// Full-screen on mobile, centered on desktop
<MobileModal isOpen={true} title="Example" onClose={handleClose}>
  Content
</MobileModal>
```

#### Tables
```tsx
// Card layout on mobile, table on desktop
<ResponsiveTable
  data={items}
  columns={columns}
  keyExtractor={(row) => row.id}
/>
```

### Gestures

#### Swipe
```tsx
const swipeHandlers = useSwipeGesture({
  onSwipeLeft: () => console.log('Swiped left'),
  onSwipeRight: () => console.log('Swiped right'),
});
```

#### Pull-to-Refresh
```tsx
const pullHandlers = usePullToRefresh(async () => {
  await refetchData();
});
```

## Testing Checklist

### Manual Testing
- [ ] iPhone SE (375px width)
- [ ] iPhone 12/13/14 (390px width)
- [ ] iPhone 14 Pro Max (430px width)
- [ ] iPad (768px width)
- [ ] Android phones (360px - 414px width)

### Automated Testing
```bash
# TODO: Visual regression and a11y testing to be added in future sprint
# For now, use manual testing checklist above and browser DevTools
```

## Performance

### Mobile Optimizations
- Lazy loading for below-the-fold content
- Optimized images with AVIF/WebP formats
- Reduced animations with `prefers-reduced-motion`
- GPU-accelerated transforms
- Touch-optimized scrolling (`-webkit-overflow-scrolling: touch`)

### Lighthouse Targets
- Performance: > 90
- Accessibility: 100
- Best Practices: > 95
- SEO: 100

## Common Patterns

### Full-width cards on mobile
```tsx
<div className="w-full md:max-w-md">
  <Card />
</div>
```

### Stack on mobile, row on desktop
```tsx
<div className="flex flex-col md:flex-row gap-4">
  <div>Item 1</div>
  <div>Item 2</div>
</div>
```

### Hide on mobile
```tsx
<div className="hidden md:block">
  Desktop only content
</div>
```

### Show only on mobile
```tsx
<div className="block md:hidden">
  Mobile only content
</div>
```

## Resources

- [Apple Human Interface Guidelines](https://developer.apple.com/design/human-interface-guidelines/)
- [Material Design Touch Targets](https://material.io/design/usability/accessibility.html)
- [WebAIM Mobile Accessibility](https://webaim.org/articles/mobile/)
