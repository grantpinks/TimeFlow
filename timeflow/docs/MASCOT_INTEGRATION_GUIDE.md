# Flow Mascot Integration Guide

**Version**: 1.0
**Last Updated**: 2025-12-09 (Sprint 9)
**For**: Web & Mobile Developers

---

## Overview

Flow is TimeFlow's AI mascot—a rounded droplet character with an hourglass void that embodies our brand personality: calm, intelligent, and supportive. This guide explains how to integrate Flow into your UI components.

---

## Mascot Personality

### Core Traits
- **Intelligent & Reassuring**: Flow understands your schedule and guides you calmly
- **Quietly Confident**: Never shouty, pushy, or gimmicky
- **Supportive**: Offers options and recommendations, doesn't demand
- **Professional Warmth**: Approachable but composed

### Tone & Voice
Flow speaks in first person ("I") as a co-pilot:
- ✅ "I recommend scheduling this at 2:00 PM to avoid your meeting"
- ✅ "Looking at your calendar, I see a few open slots"
- ❌ "Hey! Let's crush these tasks! 💪🔥"
- ❌ "You should definitely do this NOW!"

---

## Asset Files

### Web Assets
Located in: `apps/web/public/branding/`

| File | Size | Usage |
|------|------|-------|
| `flow-default.png` | 723KB | Default/idle state, general conversation |
| `flow-thinking.png` | 766KB | Analyzing, processing, showing reasoning |
| `flow-celebrating.png` | 876KB | Success, schedule created, task completed |
| `flow-guiding.png` | 857KB | Recommendations, next steps, guidance |

### Mobile Assets
Located in: `apps/mobile/assets/branding/`

| File | Size | Usage |
|------|------|-------|
| `flow-default.png` | 723KB | Default/idle state |
| `flow-celebrating.png` | 876KB | Success states |
| `flow-thinking.png` | 766KB | Processing states |

### Asset Specifications
- **Format**: PNG with transparency
- **Color**: Primary Teal `#0BAF9A` body, Paper `#F8FAFC` hourglass void
- **Style**: Flat 2D vector with minimal gradients
- **Export Sizes**:
  - Small (24-32px): Eyes-only hint
  - Medium (48-64px): Full visibility for chat avatars
  - Large (128-256px): Hero usage with subtle inner glow allowed

---

## Mascot States

### State Detection (Backend)

The Assistant service automatically detects mascot states based on response content:

```typescript
// From assistantService.ts:83-103
function detectMascotState(response: string, schedulePreview?: SchedulePreview): string {
  // Celebrating: Successful schedule creation
  if (schedulePreview && schedulePreview.blocks.length > 0 && schedulePreview.confidence === 'high') {
    return 'celebrating';
  }

  // Thinking: Analyzing or showing reasoning
  if (response.includes('let me analyze') || response.includes('looking at')) {
    return 'thinking';
  }

  // Guiding: Providing recommendations
  if (response.includes('recommend') || response.includes('suggest')) {
    return 'guiding';
  }

  // Default: General conversation
  return 'default';
}
```

### State Metadata

Every assistant response includes `mascotState` in metadata:

```typescript
{
  message: {
    id: "msg_123",
    role: "assistant",
    content: "I recommend scheduling your tasks...",
    timestamp: "2025-12-09T10:00:00Z",
    metadata: {
      mascotState: "guiding",  // ← Use this to display correct mascot
      schedulePreview: { ... }
    }
  }
}
```

### State Descriptions

| State | When to Use | Visual Cue | Duration |
|-------|-------------|------------|----------|
| **default** | General conversation, simple answers | Neutral eyes, upright | Static |
| **thinking** | Analyzing data, processing requests | Head tilt 10-15°, bubbles in hourglass | 120-200ms transition |
| **celebrating** | Successful schedule, task completion | Upward pop, amber sparkles | 250ms sparkle fade |
| **guiding** | Recommendations, next steps | Slight lean forward, eyes upward | Static or subtle bounce |

---

## Integration Examples

### Web: Chat Avatar (Next.js)

```typescript
// apps/web/src/app/assistant/page.tsx

import Image from 'next/image';
import { useState } from 'react';

function ChatMessage({ message }) {
  const mascotState = message.metadata?.mascotState || 'default';
  const mascotSrc = `/branding/flow-${mascotState}.png`;

  return (
    <div className="flex gap-3">
      <Image
        src={mascotSrc}
        alt="Flow assistant"
        width={48}
        height={48}
        className="rounded-full"
      />
      <div className="flex-1">
        <p className="text-sm text-slate-600">Flow</p>
        <p className="text-slate-800">{message.content}</p>
      </div>
    </div>
  );
}
```

### Web: Animated State Transitions (Framer Motion)

```typescript
import { motion, AnimatePresence } from 'framer-motion';

function FlowAvatar({ mascotState }) {
  const mascotSrc = `/branding/flow-${mascotState}.png`;

  return (
    <AnimatePresence mode="wait">
      <motion.img
        key={mascotState}
        src={mascotSrc}
        alt="Flow"
        className="w-12 h-12"
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        transition={{ duration: 0.15, ease: 'easeOut' }}
      />
    </AnimatePresence>
  );
}
```

### Mobile: Chat Screen (React Native / Expo)

```typescript
// apps/mobile/src/screens/AssistantScreen.tsx

import { Image } from 'react-native';

function ChatBubble({ message }) {
  const mascotState = message.metadata?.mascotState || 'default';
  const mascotSource = require(`../../assets/branding/flow-${mascotState}.png`);

  return (
    <View style={styles.messageContainer}>
      <Image
        source={mascotSource}
        style={{ width: 40, height: 40, borderRadius: 20 }}
      />
      <View style={styles.bubble}>
        <Text style={styles.senderName}>Flow</Text>
        <Text>{message.content}</Text>
      </View>
    </View>
  );
}
```

---

## Animation Guidelines

### Motion Principles
1. **Respect `prefers-reduced-motion`**: Always check user preference
2. **Keep it subtle**: 120-200ms easeOut transitions
3. **Limit particles**: Max 3-5 sparkles for celebrating state
4. **Fade quickly**: Sparkles should fade within 250ms

### Recommended Transitions

**State Changes**:
```typescript
const prefersReducedMotion = useReducedMotion();

const transition = prefersReducedMotion
  ? { duration: 0 }
  : { duration: 0.15, ease: 'easeOut' };
```

**Celebrating State (Optional Sparkles)**:
```typescript
// Only add sparkles if user allows motion
if (!prefersReducedMotion && mascotState === 'celebrating') {
  showConfetti({
    particleCount: 5,
    colors: ['#0BAF9A', '#F59E0B'],
    duration: 250,
  });
}
```

---

## Usage Rules

### DO ✅
- Use mascot as chat avatar in assistant UI
- Swap states based on `metadata.mascotState`
- Keep animations under 250ms
- Respect reduced-motion preferences
- Size appropriately: 24-64px for UI, 128-256px for hero

### DON'T ❌
- Don't add bevels, glows, or drop shadows to mascot
- Don't change mascot colors outside brand palette
- Don't use mascot for error states (keep calm tone)
- Don't animate excessively or ignore accessibility
- Don't use mascot smaller than 24px (eyes become illegible)

---

## Accessibility

### Alt Text Guidelines
```typescript
// Good alt text examples
alt="Flow assistant, default state"
alt="Flow thinking about your schedule"
alt="Flow celebrating your completed schedule"
alt="Flow guiding you to next steps"
```

### Screen Reader Announcements
When mascot state changes with important context:

```typescript
const announceState = (state: string) => {
  const messages = {
    thinking: "Flow is analyzing your schedule",
    celebrating: "Schedule created successfully",
    guiding: "Flow has recommendations for you",
  };

  // Use ARIA live region
  return messages[state] || "";
};
```

---

## Size Recommendations

| Context | Size | Asset | Notes |
|---------|------|-------|-------|
| Small icon | 24-32px | flow-default.png | Eyes only, hourglass hinted |
| Chat avatar | 48-64px | Any state | Full hourglass visible, crisp |
| Header/nav | 32-40px | flow-default.png | Icon representation |
| Hero/splash | 128-256px | Any state | Allow subtle gradient/glow |
| Empty states | 96-128px | flow-guiding.png | Guidance context |

---

## Testing Checklist

### Visual Testing
- [ ] Mascot displays correctly at 24px, 48px, and 128px
- [ ] All 4 states render without artifacts
- [ ] Transitions are smooth (if motion enabled)
- [ ] No performance issues with state swaps

### Accessibility Testing
- [ ] Alt text is descriptive for each state
- [ ] Screen reader announces state changes appropriately
- [ ] Animations respect `prefers-reduced-motion`
- [ ] Mascot doesn't interfere with keyboard navigation

### Cross-Platform Testing
- [ ] Web: Assets load from `/branding/` path
- [ ] Mobile: Assets load from local bundle
- [ ] Retina/high-DPI displays show sharp images
- [ ] Dark mode (if applicable) doesn't distort mascot

---

## Common Patterns

### Pattern 1: Chat Message List
```typescript
{messages.map((msg) => (
  <ChatMessage
    key={msg.id}
    message={msg}
    mascotState={msg.metadata?.mascotState || 'default'}
  />
))}
```

### Pattern 2: Loading State
```typescript
// Show thinking state while waiting for response
const [isLoading, setIsLoading] = useState(false);

<FlowAvatar mascotState={isLoading ? 'thinking' : lastMascotState} />
```

### Pattern 3: Success Feedback
```typescript
// Briefly show celebrating, then return to default
const [showSuccess, setShowSuccess] = useState(false);

useEffect(() => {
  if (scheduleCreated) {
    setShowSuccess(true);
    setTimeout(() => setShowSuccess(false), 2000);
  }
}, [scheduleCreated]);

<FlowAvatar mascotState={showSuccess ? 'celebrating' : 'default'} />
```

---

## Troubleshooting

### Issue: Mascot image not loading
**Solution**: Check file path and public directory structure
```typescript
// Web: Ensure files are in apps/web/public/branding/
// Mobile: Ensure files are in apps/mobile/assets/branding/
```

### Issue: State not updating
**Solution**: Verify metadata is being passed correctly
```typescript
console.log('Mascot state:', message.metadata?.mascotState);
// Should log: 'default' | 'thinking' | 'celebrating' | 'guiding'
```

### Issue: Animations too fast/slow
**Solution**: Adjust transition duration based on reduced-motion
```typescript
const duration = prefersReducedMotion ? 0 : 0.15;
```

---

## Future Enhancements (Post-Sprint 9)

Potential mascot improvements for future sprints:

1. **Lottie Animations**: Replace PNGs with animated Lottie files for smoother transitions
2. **Custom States**: Add "confused" state for errors, "excited" for milestones
3. **Interactive Mascot**: Click/tap mascot to trigger helpful tips
4. **Micro-Expressions**: Subtle eye movements during idle state
5. **Voice Sync**: If adding voice output, sync mascot mouth/eyes

---

## Support & Questions

For questions about mascot integration:
- Review brand guidelines: `docs/BRAND_GUIDELINES.md`
- Check implementation: `apps/backend/src/services/assistantService.ts:83-103`
- Reference designs: `assets/branding/`

---

**Last Updated**: Sprint 9 (2025-12-09)
**Maintained By**: Claude Agent (Brand & UX)
