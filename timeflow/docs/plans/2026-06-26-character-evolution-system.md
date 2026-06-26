# Character Evolution System - Design Document

**Date:** 2026-06-26
**Status:** Design Complete, Ready for Implementation
**Owner:** Engineering Team
**Stakeholders:** Product, Design, Engineering

---

## Executive Summary

Transform TimeFlow's existing XP/evolution foundation into a compelling, video game-inspired progression system centered around the Identity Studio. Users will see their Flow character grow, unlock customizations, and feel genuine joy from completing tasks and habits.

**Goal:** Make users "truly enjoy checking tasks off and feeling progress through their character and within themselves."

**Current State:**
- ✅ XP formula implemented (10 base + streak bonuses, 80 XP daily cap)
- ✅ 5-stage progression system (Seed → Builder → Disciplined → Embodied → Future Self)
- ✅ Level system (L² × 50 XP per level)
- ✅ Mastery trials & unlock catalog
- ❌ **BUT:** Buried in UI, minimal feedback, no visual progression, no customization

**Future State:**
- Instant XP toast notifications on task completion
- Animated Flow character that evolves through stages
- Full RPG-style character sheet in Identity Studio
- Extensive customization system (palettes, hats, eyes, backgrounds, auras)
- Celebratory animations and reward moments
- Unlock gallery with progression tracking

---

## Table of Contents

1. [User Flows](#user-flows)
2. [Component Architecture](#component-architecture)
3. [Data Models](#data-models)
4. [UI/UX Design](#uiux-design)
5. [Animations & Rewards](#animations--rewards)
6. [Asset Requirements](#asset-requirements)
7. [Technical Implementation](#technical-implementation)
8. [Testing Strategy](#testing-strategy)
9. [Rollout Plan](#rollout-plan)
10. [Success Metrics](#success-metrics)

---

## User Flows

### Flow 1: Task Completion → XP Notification

```
User completes task/habit
  ↓
Backend grants XP via grantIdentityXp()
  ↓
Response: { xpGranted, leveledUp, newStage, trialStarted, newUnlocks }
  ↓
Frontend shows XP toast:
  - Basic: "+10 XP | Athlete | Level 3 → 45%"
  - Level-up: "⭐ LEVEL UP! | Level 3 → 4 | +2 unlocks | [View Rewards]"
  - Stage: "🎉 BUILDER STAGE! | Mastery Trial: 4/7 days | [View Evolution]"
  ↓
Toast auto-dismisses (4-7s) or user clicks through
  ↓
If clicked: Opens Evolution Showcase modal
```

**Key Design Decisions:**
- Non-blocking toasts (don't interrupt flow for multiple completions)
- Stack up to 3 toasts, then batch into single "+30 XP total" toast
- Level-up toasts stay 7s (vs 4s for standard XP)
- Stage breakthroughs auto-open Evolution Showcase after 2s

---

### Flow 2: Visiting Identity Studio

```
User navigates to /habits (Identity Studio)
  ↓
Page loads with Evolution Summary Panel at top:
  ┌────────────────────────────────────────┐
  │ [Character Avatar] │ Athlete            │
  │ (120x120 animated) │ Builder · Level 12 │
  │                    │ ▓▓▓▓▓▓▓░░░ 67%     │
  │                    │ 420 / 800 XP       │
  │                    │ 🎯 Trial: 8/10     │
  │                    │ [Full Evolution →] │
  └────────────────────────────────────────┘
  ↓
User clicks "Full Evolution →"
  ↓
Opens Evolution Showcase modal (full-screen)
```

---

### Flow 3: Evolution Showcase Modal

```
Modal opens with:
  - Large character display (300x300, center)
  - Stat panel (level, XP bar, stage, trial status)
  - Unlock grid (palettes, hats, eyes, backgrounds, auras)
  - XP history sparkline (last 7 days)
  ↓
User explores unlocks:
  - Click palette → Live preview on character
  - Click locked item → Tooltip: "🔒 Unlock at Level 15"
  - Click "Equip" → Character updates instantly
  ↓
User saves customization
  ↓
Backend validates unlocks + persists to CharacterCustomization table
  ↓
Character updates across all app surfaces
```

---

## Component Architecture

### Core Components

```typescript
// Character Rendering
FlowCharacter.tsx          // Main character renderer with layering
  - Props: stage, palette, accessories, size, animated, animationState
  - Handles: PNG layering, CSS filters, animations

CharacterRenderer.tsx      // Low-level rendering engine
  - Manages: z-index layering, image loading, fallbacks

// UI Components
EvolutionSummaryPanel.tsx  // Compact widget (Identity Studio top)
  - Shows: Character avatar, level, XP bar, trial status
  - Action: Click → opens EvolutionShowcase

EvolutionShowcase.tsx      // Full-screen RPG character sheet
  - Sections: Character display, stats, unlocks, history
  - Features: Live customization preview, equip controls

XpToast.tsx               // Toast notification system
  - Variants: Basic XP, Level-up, Stage evolution
  - Behavior: Auto-dismiss, stacking, click-through

LevelUpModal.tsx          // Level-up celebration overlay
  - Trigger: leveledUp === true
  - Animation: Confetti, glow effects, unlock reveals

StageEvolutionModal.tsx   // Stage breakthrough ceremony
  - Trigger: newStage !== null
  - Animation: Character transformation, trial preview

UnlockGrid.tsx            // Customization interface
  - Layout: Grid by type (palettes, hats, eyes, etc.)
  - Features: Lock states, equip buttons, tooltips

// Utilities
CharacterCanvas.tsx       // Advanced WebGL renderer (future)
ParticleExplosion.tsx     // Celebration particle effects
useCharacterAssets.ts     // Image preloading hook
```

### Component Hierarchy

```
EvolutionShowcase (Modal)
├── FlowCharacter (Large, center)
├── StatPanel
│   ├── LevelDisplay
│   ├── XPProgressBar
│   ├── StageIndicator
│   └── TrialCard
├── UnlockGrid
│   ├── PaletteRow
│   ├── HatRow
│   ├── EyesRow
│   ├── BackgroundRow
│   └── AuraRow
└── XPHistoryChart
```

---

## Data Models

### Database Schema Changes

**New Table: `CharacterCustomization`**

```prisma
model CharacterCustomization {
  id         String   @id @default(cuid())
  userId     String
  identityId String   @unique

  // Active selections (references to unlockKey)
  activePalette     String?  // "palette_ocean"
  activeHat         String?  // "hat_wizard"
  activeEyes        String?  // "eyes_sparkle"
  activeBackground  String?  // "bg_stars"
  activeAura        String?  // "aura_flames"

  lastModified DateTime @default(now()) @updatedAt

  user     User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  identity Identity @relation(fields: [identityId], references: [id], onDelete: Cascade)

  @@index([userId])
}
```

**Extend `IdentityUnlock` (Already Exists)**

```typescript
// New unlockType values:
type UnlockType =
  | 'palette'      // Color theme
  | 'hat'          // Head accessory
  | 'eyes'         // Eye variation
  | 'background'   // Scene behind character
  | 'aura'         // Glow effect
  | 'form'         // Stage evolution (auto-granted)
  | 'feature';     // App feature unlock

// unlockKey examples:
"palette_ocean"
"hat_wizard"
"eyes_sparkle"
"bg_stars"
"aura_flames"
"form_builder"
```

---

### Unlock Catalog Expansion

**Location:** `apps/backend/src/config/identityUnlockCatalog.ts`

```typescript
export const CHARACTER_UNLOCKS = [
  // Stage Forms (automatic, visual only)
  { unlockKey: 'form_seed', unlockType: 'form', grantedByStage: 'Seed', displayName: 'Seed Form', description: 'Your journey begins' },
  { unlockKey: 'form_builder', unlockType: 'form', grantedByStage: 'Builder', displayName: 'Builder Form', description: 'Growth and discipline' },
  { unlockKey: 'form_disciplined', unlockType: 'form', grantedByStage: 'Disciplined', displayName: 'Disciplined Form', description: 'Mastery emerging' },
  { unlockKey: 'form_embodied', unlockType: 'form', grantedByStage: 'Embodied', displayName: 'Embodied Form', description: 'Living the identity' },
  { unlockKey: 'form_future_self', unlockType: 'form', grantedByStage: 'FutureSelf', displayName: 'Future Self Form', description: 'Transcendence achieved' },

  // Palettes (Level Rewards)
  { unlockKey: 'palette_default', unlockType: 'palette', grantedByLevel: 1, displayName: 'Classic Teal', colors: { primary: '#14B8A6', secondary: '#0D9488' } },
  { unlockKey: 'palette_ocean', unlockType: 'palette', grantedByLevel: 3, displayName: 'Ocean Depths', colors: { primary: '#0EA5E9', secondary: '#0284C7' } },
  { unlockKey: 'palette_forest', unlockType: 'palette', grantedByLevel: 7, displayName: 'Forest Canopy', colors: { primary: '#10B981', secondary: '#059669' } },
  { unlockKey: 'palette_cosmic', unlockType: 'palette', grantedByLevel: 12, displayName: 'Cosmic Purple', colors: { primary: '#8B5CF6', secondary: '#7C3AED' } },
  { unlockKey: 'palette_sunrise', unlockType: 'palette', grantedByLevel: 18, displayName: 'Golden Sunrise', colors: { primary: '#F59E0B', secondary: '#D97706' } },
  { unlockKey: 'palette_shadow', unlockType: 'palette', grantedByTrial: 'Builder', displayName: 'Shadow Realm', colors: { primary: '#6366F1', secondary: '#4F46E5' } },

  // Hats
  { unlockKey: 'hat_wizard', unlockType: 'hat', grantedByLevel: 4, displayName: 'Wizard Hat', assetPath: '/characters/accessories/hats/wizard.png' },
  { unlockKey: 'hat_crown', unlockType: 'hat', grantedByLevel: 10, displayName: 'Champion Crown', assetPath: '/characters/accessories/hats/crown.png' },
  { unlockKey: 'hat_halo', unlockType: 'hat', grantedByLevel: 15, displayName: 'Halo', assetPath: '/characters/accessories/hats/halo.png' },
  { unlockKey: 'hat_chef', unlockType: 'hat', grantedByLevel: 8, displayName: 'Chef Hat', assetPath: '/characters/accessories/hats/chef.png' },
  { unlockKey: 'hat_astronaut', unlockType: 'hat', grantedByLevel: 20, displayName: 'Astronaut Helmet', assetPath: '/characters/accessories/hats/astronaut.png' },

  // Eyes
  { unlockKey: 'eyes_sparkle', unlockType: 'eyes', grantedByLevel: 6, displayName: 'Sparkle Eyes', assetPath: '/characters/accessories/eyes/sparkle.png' },
  { unlockKey: 'eyes_laser', unlockType: 'eyes', grantedByLevel: 13, displayName: 'Laser Focus', assetPath: '/characters/accessories/eyes/laser.png' },
  { unlockKey: 'eyes_stars', unlockType: 'eyes', grantedByLevel: 16, displayName: 'Star Eyes', assetPath: '/characters/accessories/eyes/stars.png' },
  { unlockKey: 'eyes_tired', unlockType: 'eyes', grantedByLevel: 2, displayName: 'Need Coffee', assetPath: '/characters/accessories/eyes/tired.png' },
  { unlockKey: 'eyes_determined', unlockType: 'eyes', grantedByLevel: 9, displayName: 'Determined', assetPath: '/characters/accessories/eyes/determined.png' },

  // Backgrounds
  { unlockKey: 'bg_stars', unlockType: 'background', grantedByLevel: 8, displayName: 'Starfield', assetPath: '/characters/accessories/backgrounds/stars.png' },
  { unlockKey: 'bg_galaxy', unlockType: 'background', grantedByLevel: 14, displayName: 'Galaxy Nebula', assetPath: '/characters/accessories/backgrounds/galaxy.png' },
  { unlockKey: 'bg_aurora', unlockType: 'background', grantedByLevel: 17, displayName: 'Aurora Borealis', assetPath: '/characters/accessories/backgrounds/aurora.png' },
  { unlockKey: 'bg_mountains', unlockType: 'background', grantedByLevel: 11, displayName: 'Mountain Peak', assetPath: '/characters/accessories/backgrounds/mountains.png' },
  { unlockKey: 'bg_city', unlockType: 'background', grantedByLevel: 19, displayName: 'City Skyline', assetPath: '/characters/accessories/backgrounds/city.png' },

  // Auras
  { unlockKey: 'aura_flames', unlockType: 'aura', grantedByLevel: 10, displayName: 'Flame Aura', assetPath: '/characters/accessories/auras/flames.png' },
  { unlockKey: 'aura_lightning', unlockType: 'aura', grantedByLevel: 15, displayName: 'Lightning', assetPath: '/characters/accessories/auras/lightning.png' },
  { unlockKey: 'aura_rainbow', unlockType: 'aura', grantedByTrial: 'Disciplined', displayName: 'Rainbow Glow', assetPath: '/characters/accessories/auras/rainbow.png' },
  { unlockKey: 'aura_zen', unlockType: 'aura', grantedByLevel: 12, displayName: 'Zen Glow', assetPath: '/characters/accessories/auras/zen.png' },
  { unlockKey: 'aura_cosmic', unlockType: 'aura', grantedByLevel: 20, displayName: 'Cosmic Energy', assetPath: '/characters/accessories/auras/cosmic.png' },
];
```

---

### API Endpoints

```typescript
// GET /api/identity/:identityId/character
// Returns full character state
Response: {
  stage: 'Builder',
  level: 12,
  activePalette: 'palette_ocean',
  activeHat: 'hat_wizard',
  activeEyes: 'eyes_sparkle',
  activeBackground: 'bg_stars',
  activeAura: 'aura_flames',
  unlocks: ['palette_default', 'palette_ocean', 'hat_wizard', ...],
  availableUnlocks: [
    { unlockKey: 'palette_forest', displayName: 'Forest Canopy', unlockLevel: 7, isUnlocked: true },
    { unlockKey: 'hat_crown', displayName: 'Champion Crown', unlockLevel: 10, isUnlocked: false },
    ...
  ]
}

// PATCH /api/identity/:identityId/character
// Update active customizations
Request: {
  activePalette?: string,
  activeHat?: string | null,  // null = unequip
  activeEyes?: string | null,
  activeBackground?: string | null,
  activeAura?: string | null
}
Response: { success: true, updatedCharacter: {...} }

// Validation: Ensures all unlockKeys are actually unlocked before applying
```

---

## UI/UX Design

### Evolution Summary Panel

**Location:** Top of Identity Studio (`/habits`) page
**Size:** Full-width, ~140px height
**Layout:** Horizontal flex (mobile stacks vertical)

```
┌─────────────────────────────────────────────────────────┐
│                                                         │
│  ┌──────────┐  Athlete                                 │
│  │          │  Builder · Level 12                      │
│  │ [Avatar] │  ▓▓▓▓▓▓▓▓░░░░░░ 67% to Level 13         │
│  │ 120x120  │  420 / 800 XP                            │
│  │          │                                           │
│  │ Animated │  🎯 Mastery Trial: 8 of 10 days (80%)   │
│  │  Idle    │                                           │
│  └──────────┘  [Full Evolution →]                      │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

**Interactions:**
- Hover character → Scale 105%, gentle rotation
- Click anywhere on panel → Opens Evolution Showcase
- XP bar tooltip: "420 XP earned, 380 XP to Level 13"
- Trial section only visible if trial is Active

---

### Evolution Showcase Modal

**Display:** Full-screen overlay (or dedicated `/evolution` route)
**Layout:** 3-column grid (desktop), single column (mobile)

```
╔════════════════════════════════════════════════════════════╗
║  [X Close]              FLOW EVOLUTION                     ║
╠════════════════════════════════════════════════════════════╣
║                                                            ║
║  ┌──────────────┐  ┌──────────────────────────────────┐  ║
║  │              │  │  ATHLETE                          │  ║
║  │              │  │  Builder Stage · Level 12         │  ║
║  │  CHARACTER   │  │                                   │  ║
║  │   300x300    │  │  ▓▓▓▓▓▓▓▓░░░░░░ 67% to Lvl 13    │  ║
║  │              │  │  420 / 800 XP                     │  ║
║  │  Animated    │  │                                   │  ║
║  │   Idle       │  │  Daily Progress: 45 / 80 XP      │  ║
║  │              │  │                                   │  ║
║  │  Live        │  │  🎯 MASTERY TRIAL                │  ║
║  │  Preview     │  │  Builder Stage Challenge          │  ║
║  └──────────────┘  │  8 of 10 days (2 days left)      │  ║
║                    │  ▓▓▓▓▓▓▓▓░░ 80%                   │  ║
║  [Customize ▼]     └──────────────────────────────────┘  ║
║                                                            ║
║  ┌────────────────────────────────────────────────────┐  ║
║  │  UNLOCKS & CUSTOMIZATION                           │  ║
║  ├────────────────────────────────────────────────────┤  ║
║  │  Palettes:                                         │  ║
║  │  [Ocean✓] [Forest] [Cosmic] [🔒Shadow]            │  ║
║  │                                                     │  ║
║  │  Hats:                                             │  ║
║  │  [Wizard✓] [🔒Crown] [🔒Halo] [Chef] [🔒Astro]   │  ║
║  │                                                     │  ║
║  │  Eyes:                                             │  ║
║  │  [Sparkle✓] [🔒Laser] [🔒Stars] [Tired] [Determ]  │  ║
║  │                                                     │  ║
║  │  Backgrounds:                                      │  ║
║  │  [Stars✓] [🔒Galaxy] [🔒Aurora] [Mountains] [🔒]  │  ║
║  │                                                     │  ║
║  │  Auras:                                            │  ║
║  │  [Flames✓] [🔒Lightning] [🔒Rainbow] [Zen] [🔒]   │  ║
║  └────────────────────────────────────────────────────┘  ║
║                                                            ║
║  ┌────────────────────────────────────────────────────┐  ║
║  │  XP HISTORY (Last 7 days)                          │  ║
║  │  ▂▄▆█▆▅▃  (Sparkline chart)                       │  ║
║  │  M  T  W  Th F  Sa Su                              │  ║
║  └────────────────────────────────────────────────────┘  ║
║                                                            ║
╚════════════════════════════════════════════════════════════╝
```

**Unlock Grid Interactions:**
- Click unlocked item → Equips immediately, character updates
- Click locked item → Tooltip: "🔒 Unlock at Level 15" or "🔒 Complete Builder Trial"
- Hover item → Preview on character (semi-transparent if locked)
- Equipped items show checkmark badge
- "NEW" badge on recently unlocked items (< 24h)

---

### XP Toast Notifications

**Position:** Top-right corner, stack vertically
**Duration:** 4s (basic), 7s (level-up), manual dismiss (stage)

**Variant 1: Basic XP Gain**
```
┌─────────────────────────────────┐
│ 🌊 +10 XP  │  Athlete           │
│ Level 3 → 45% to Level 4        │
└─────────────────────────────────┘
```

**Variant 2: Level Up**
```
┌─────────────────────────────────┐
│ ⭐ LEVEL UP!  │  Athlete         │
│ Level 3 → 4  │  +2 unlocks      │
│ [View Rewards]                   │
└─────────────────────────────────┘
```

**Variant 3: Stage Evolution**
```
┌─────────────────────────────────┐
│ 🎉 BUILDER STAGE!  │  Athlete   │
│ Mastery Trial: 4 of 7 days      │
│ [View Evolution]                 │
└─────────────────────────────────┘
```

**Stacking Behavior:**
- 1st completion → Show toast
- 2nd completion within 5s → Stack below
- 3rd completion → Stack below
- 4th+ completion → Update top toast: "+40 XP total (4 habits)"

---

## Animations & Rewards

### Character Animation States

**1. Idle (Default Loop)**
```typescript
{
  y: [0, -4, 0],           // Gentle float
  rotate: [0, 1, 0, -1, 0], // Subtle sway
  transition: {
    duration: 3,
    repeat: Infinity,
    ease: "easeInOut"
  }
}
```
- Stage-specific variations:
  - Seed: Curious head tilt
  - Builder: Tool/hammer idle animation
  - Future Self: Confident stance with cosmic particle drift

**2. Celebrating (XP Gain)**
```typescript
{
  scale: [1, 1.2, 1],
  y: [0, -20, 0],
  rotate: [0, 10, -10, 0],
  transition: { duration: 1.2, ease: "anticipate" }
}
+ Particle burst (10 sparkles)
+ Accessories react (hat bounces, eyes widen)
```

**3. Level Up**
```typescript
{
  scale: [1, 1.3, 1.1, 1],
  rotate: [0, 360],
  filter: ['brightness(1)', 'brightness(1.5)', 'brightness(1)'],
  transition: { duration: 2, ease: [0.43, 0.13, 0.23, 0.96] }
}
+ Confetti explosion (30 particles)
+ Screen flash (subtle)
+ Sound: Ascending chime
```

**4. Stage Evolution (Form Change)**
```typescript
{
  scale: [1, 1.5, 0.8, 1.2, 1],
  opacity: [1, 0.5, 1],
  rotate: [0, 180, 360],
  transition: { duration: 3, ease: "easeInOut" }
}
+ Morph transition between stage images
+ Stage-themed particles (Builder = construction sparks, Embodied = zen glow)
+ Modal auto-opens to showcase new form
+ Sound: Epic transformation sound
```

**5. Trial Complete**
```typescript
{
  y: [0, -30, -25],
  scale: [1, 1.1],
  transition: { duration: 2.5 }
}
+ Trophy/medal appears above character
+ Gold particle rain
+ Victory pose animation
```

---

### Unlock Reveal Sequence

**When user levels up with new unlocks:**

```
1. Evolution modal auto-opens (if not already open)
2. New unlocks pulse with glow effect
3. Sequential reveal (staggered by 0.5s each):
   - Item 1: Fade in + sparkle + sound
   - Item 2: Fade in + sparkle + sound
   - Item 3: Fade in + sparkle + sound
4. "NEW" badge overlays each unlocked item
5. Auto-equip prompt (first unlock of type only):
   "You unlocked Ocean Palette! [Try it now] [Later]"
```

---

### Stage Breakthrough Ceremony

**Sequence:**

```
1. Task completion → Backend detects stage transition
2. XP toast: "🎉 BUILDER STAGE!" (auto-dismiss 2s)
3. Full-screen overlay fades in
4. Character transformation animation (3s):
   - Glow effect
   - Morph from Seed → Builder
   - Stage-themed particle effects
5. Modal reveals:
   ┌────────────────────────────────────┐
   │  ✨ YOU'VE REACHED BUILDER STAGE  │
   │                                    │
   │  [New character form showcase]     │
   │                                    │
   │  You're building momentum!         │
   │                                    │
   │  🎯 MASTERY TRIAL BEGINS           │
   │  Complete habits on 4 of the next  │
   │  7 days to prove your discipline.  │
   │                                    │
   │  NEW UNLOCKS:                      │
   │  • Shadow Realm Palette            │
   │  • Builder Badge                   │
   │                                    │
   │  [Continue]                        │
   └────────────────────────────────────┘
6. User clicks Continue → Modal closes
```

---

## Asset Requirements

### Rendering Strategy

**Approach:** Layered PNG sprites (MVP), migrate to WebGL for advanced effects (V2)

**Why PNG sprites:**
- ✅ Simple implementation, works everywhere
- ✅ No WebGL complexity or compatibility issues
- ✅ Acceptable file size (~200KB total for all assets)
- ❌ Less dynamic than WebGL
- ❌ Palette swaps require CSS filters (not perfect color control)

---

### Asset Specifications

**Stage Forms (5 files)**

```
/public/characters/stages/
  seed.png         (256x256, transparent BG)
  builder.png      (256x256)
  disciplined.png  (256x256)
  embodied.png     (256x256)
  future-self.png  (256x256)
```

**Design Guidelines:**
- Maintain Flow mascot brand personality (friendly, approachable)
- Progressive complexity: Seed (simple) → Future Self (detailed)
- Centered composition, room for accessories
- Transparent background, optimized PNG

**Stage Character Descriptions:**

1. **Seed** (Level 1-4)
   - Small, bright-eyed, curious expression
   - Simple features, rounded shapes
   - Sprout/seedling motif
   - Color: Light green/teal tones

2. **Builder** (Level 5-9)
   - Slightly larger, more active pose
   - Tool or construction elements (hammer, blueprint)
   - Growing confidence in posture
   - Color: Earthy tones, wood/metal accents

3. **Disciplined** (Level 10-14)
   - Balanced, centered stance
   - Refined features, calm expression
   - Flowing lines suggesting mastery
   - Color: Cool blues, zen aesthetics

4. **Embodied** (Level 15-19)
   - Powerful presence, confident posture
   - Glowing elements (eyes, hands)
   - Dynamic pose suggesting action
   - Color: Vibrant, energetic palette

5. **Future Self** (Level 20+)
   - Transcendent, ethereal appearance
   - Cosmic elements (stars, nebula patterns)
   - Highest detail level
   - Color: Iridescent, multi-hued glow

---

**Accessories (~25 items)**

```
/public/characters/accessories/
  hats/
    wizard.png       (256x256, positioned for head overlay)
    crown.png
    halo.png
    chef.png
    astronaut.png

  eyes/
    sparkle.png      (256x256, replaces eye layer)
    laser.png
    stars.png
    tired.png
    determined.png

  backgrounds/
    stars.png        (512x512, behind character)
    galaxy.png
    aurora.png
    mountains.png
    city.png

  auras/
    flames.png       (512x512, glow overlay)
    lightning.png
    rainbow.png
    zen.png
    cosmic.png
```

**File Naming Convention:**
```
{type}_{name}.png

Examples:
- stage_seed.png
- hat_wizard.png
- eyes_sparkle.png
- bg_stars.png
- aura_flames.png
```

---

### Palette System (No Assets Needed)

Palettes apply via CSS filters to base character:

```typescript
export const PALETTE_MAP = {
  palette_default: {
    primary: '#14B8A6',
    secondary: '#0D9488',
    filter: 'none',
    aura: 'rgba(20, 184, 166, 0.3)'
  },
  palette_ocean: {
    primary: '#0EA5E9',
    secondary: '#0284C7',
    filter: 'hue-rotate(180deg) saturate(1.2)',
    aura: 'rgba(14, 165, 233, 0.3)'
  },
  palette_forest: {
    primary: '#10B981',
    secondary: '#059669',
    filter: 'hue-rotate(60deg) saturate(1.3)',
    aura: 'rgba(16, 185, 129, 0.3)'
  },
  palette_cosmic: {
    primary: '#8B5CF6',
    secondary: '#7C3AED',
    filter: 'hue-rotate(270deg) saturate(1.5)',
    aura: 'rgba(139, 92, 246, 0.3)'
  },
  palette_shadow: {
    primary: '#6366F1',
    secondary: '#4F46E5',
    filter: 'grayscale(0.5) contrast(1.2) brightness(0.8)',
    aura: 'rgba(99, 102, 241, 0.3)'
  },
  palette_sunrise: {
    primary: '#F59E0B',
    secondary: '#D97706',
    filter: 'hue-rotate(30deg) saturate(1.4) brightness(1.1)',
    aura: 'rgba(245, 158, 11, 0.3)'
  }
};
```

---

### Asset Production Checklist

**For Designer/Artist:**

- [ ] Design 5 base stage forms (seed → future-self)
- [ ] Create 5 hat accessories
- [ ] Create 5 eye variations
- [ ] Create 5 background scenes
- [ ] Create 5 aura effects
- [ ] Export all as optimized transparent PNGs
- [ ] Test layering alignment in design tool
- [ ] Provide sprite sheet (optional, for V2)
- [ ] Document design system (colors, style guide)

**Image Optimization:**
- TinyPNG or similar compression
- Target: <20KB per accessory, <40KB per stage form
- Test on retina displays (2x, 3x DPI)

---

## Technical Implementation

### Phase 1: Foundation (Week 1-2)

**Backend Tasks:**

```typescript
// 1. Database Migration
// apps/backend/prisma/migrations/XXX_character_customization.sql

CREATE TABLE "CharacterCustomization" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "userId" TEXT NOT NULL,
  "identityId" TEXT NOT NULL UNIQUE,
  "activePalette" TEXT,
  "activeHat" TEXT,
  "activeEyes" TEXT,
  "activeBackground" TEXT,
  "activeAura" TEXT,
  "lastModified" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "CharacterCustomization_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE,
  CONSTRAINT "CharacterCustomization_identityId_fkey"
    FOREIGN KEY ("identityId") REFERENCES "Identity"("id") ON DELETE CASCADE
);

CREATE INDEX "CharacterCustomization_userId_idx" ON "CharacterCustomization"("userId");

// 2. Expand unlock catalog
// apps/backend/src/config/identityUnlockCatalog.ts
// Add ~25 new character unlocks (see Data Models section)

// 3. Character customization service
// apps/backend/src/services/characterCustomizationService.ts

export async function getCharacterState(userId: string, identityId: string) {
  const [identity, customization, unlocks] = await Promise.all([
    prisma.identity.findFirst({
      where: { id: identityId, userId },
      select: { level: true, stage: true, xp: true }
    }),
    prisma.characterCustomization.findUnique({ where: { identityId } }),
    prisma.identityUnlock.findMany({
      where: { identityId, userId },
      select: { unlockKey: true, unlockType: true }
    })
  ]);

  return {
    stage: identity?.stage ?? 'Seed',
    level: identity?.level ?? 1,
    xp: identity?.xp ?? 0,
    activePalette: customization?.activePalette ?? 'palette_default',
    activeHat: customization?.activeHat,
    activeEyes: customization?.activeEyes,
    activeBackground: customization?.activeBackground,
    activeAura: customization?.activeAura,
    unlocks: unlocks.map(u => u.unlockKey),
    availableUnlocks: buildUnlockCatalog(identity?.level ?? 1, unlocks)
  };
}

export async function updateCustomization(
  userId: string,
  identityId: string,
  updates: Partial<CharacterCustomization>
) {
  // Validate all unlocks before applying
  const unlocks = await prisma.identityUnlock.findMany({
    where: { identityId, userId },
    select: { unlockKey: true }
  });
  const unlockedKeys = new Set(unlocks.map(u => u.unlockKey));

  for (const [key, value] of Object.entries(updates)) {
    if (value && !unlockedKeys.has(value)) {
      throw new Error(`Cannot equip locked item: ${value}`);
    }
  }

  return prisma.characterCustomization.upsert({
    where: { identityId },
    create: {
      id: cuid(),
      userId,
      identityId,
      ...updates
    },
    update: updates
  });
}

// 4. API Routes
// apps/backend/src/routes/characterRoutes.ts

import { FastifyPluginAsync } from 'fastify';
import { auth } from '../middlewares/auth.js';
import { getCharacterState, updateCustomization } from '../services/characterCustomizationService.js';

export const characterRoutes: FastifyPluginAsync = async (server) => {
  server.get(
    '/identity/:identityId/character',
    { preHandler: [auth] },
    async (req, reply) => {
      const { identityId } = req.params as { identityId: string };
      const userId = req.user.id;
      const state = await getCharacterState(userId, identityId);
      return state;
    }
  );

  server.patch(
    '/identity/:identityId/character',
    { preHandler: [auth] },
    async (req, reply) => {
      const { identityId } = req.params as { identityId: string };
      const userId = req.user.id;
      const updates = req.body as Partial<CharacterCustomization>;
      const result = await updateCustomization(userId, identityId, updates);
      return { success: true, updatedCharacter: result };
    }
  );
};

// 5. Register routes
// apps/backend/src/server.ts
import { characterRoutes } from './routes/characterRoutes.js';
server.register(characterRoutes, { prefix: '/api' });
```

**Tests:**
- [ ] Unit tests for `characterCustomizationService`
- [ ] Integration tests for API endpoints
- [ ] Test validation (cannot equip locked items)
- [ ] Test concurrent updates

---

### Phase 2: Core Components (Week 3-4)

**Frontend Components:**

```tsx
// apps/web/src/components/character/FlowCharacter.tsx

interface FlowCharacterProps {
  stage: 'Seed' | 'Builder' | 'Disciplined' | 'Embodied' | 'FutureSelf';
  palette?: string;
  hat?: string | null;
  eyes?: string | null;
  background?: string | null;
  aura?: string | null;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  animated?: boolean;
  animationState?: 'idle' | 'celebrating' | 'levelup' | 'evolution';
  onClick?: () => void;
}

export function FlowCharacter({
  stage,
  palette = 'palette_default',
  hat,
  eyes,
  background,
  aura,
  size = 'md',
  animated = true,
  animationState = 'idle',
  onClick
}: FlowCharacterProps) {
  const reduceMotion = useReducedMotion();
  const paletteData = PALETTE_MAP[palette];
  const [imageError, setImageError] = useState(false);

  const sizeClass = {
    sm: 'w-16 h-16',
    md: 'w-32 h-32',
    lg: 'w-48 h-48',
    xl: 'w-64 h-64'
  }[size];

  const layers = useMemo(() => {
    const result: CharacterLayer[] = [];

    // Layer 1: Background (z-index: 0)
    if (background) {
      result.push({
        type: 'background',
        src: `/characters/accessories/backgrounds/${background}.png`,
        zIndex: 0
      });
    }

    // Layer 2: Aura (z-index: 5)
    if (aura) {
      result.push({
        type: 'aura',
        src: `/characters/accessories/auras/${aura}.png`,
        style: {
          mixBlendMode: 'screen',
          opacity: 0.7,
          animation: 'pulse-glow 2s ease-in-out infinite'
        },
        zIndex: 5
      });
    }

    // Layer 3: Base character (z-index: 10)
    result.push({
      type: 'base',
      src: `/characters/stages/${stage.toLowerCase()}.png`,
      style: { filter: paletteData.filter },
      zIndex: 10
    });

    // Layer 4: Eyes (z-index: 15)
    if (eyes) {
      result.push({
        type: 'eyes',
        src: `/characters/accessories/eyes/${eyes}.png`,
        zIndex: 15
      });
    }

    // Layer 5: Hat (z-index: 20)
    if (hat) {
      result.push({
        type: 'hat',
        src: `/characters/accessories/hats/${hat}.png`,
        zIndex: 20
      });
    }

    return result.sort((a, b) => a.zIndex - b.zIndex);
  }, [stage, palette, hat, eyes, background, aura, paletteData]);

  if (imageError) {
    return (
      <div className={`${sizeClass} flex flex-col items-center justify-center bg-slate-100 rounded-lg`}>
        <span className="text-4xl">🌱</span>
        <p className="text-xs text-slate-500 mt-2">Loading...</p>
      </div>
    );
  }

  return (
    <motion.div
      className={`relative ${sizeClass} cursor-pointer`}
      onClick={onClick}
      animate={animated && !reduceMotion ? CHARACTER_ANIMATIONS[animationState] : {}}
      whileHover={{ scale: 1.05 }}
      data-testid="flow-character"
    >
      {layers.map((layer, i) => (
        <img
          key={`${layer.type}-${i}`}
          src={layer.src}
          alt=""
          className="absolute inset-0 w-full h-full object-contain"
          style={{
            ...layer.style,
            zIndex: layer.zIndex
          }}
          onError={() => setImageError(true)}
        />
      ))}

      {animationState === 'levelup' && <ParticleExplosion color={paletteData.primary} />}
    </motion.div>
  );
}

// apps/web/src/components/character/XpToast.tsx

interface XpToastProps {
  identityName: string;
  xpGranted: number;
  currentLevel: number;
  progressPercent: number;
  leveledUp?: boolean;
  newUnlockCount?: number;
  newStage?: string | null;
  onViewRewards?: () => void;
  onDismiss: () => void;
}

export function XpToast({
  identityName,
  xpGranted,
  currentLevel,
  progressPercent,
  leveledUp,
  newUnlockCount = 0,
  newStage,
  onViewRewards,
  onDismiss
}: XpToastProps) {
  const [dismissing, setDismissing] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      handleDismiss();
    }, leveledUp || newStage ? 7000 : 4000);

    return () => clearTimeout(timer);
  }, [leveledUp, newStage]);

  const handleDismiss = () => {
    setDismissing(true);
    setTimeout(onDismiss, 300);
  };

  if (newStage) {
    return (
      <motion.div
        initial={{ opacity: 0, x: 100, scale: 0.9 }}
        animate={{ opacity: dismissing ? 0 : 1, x: dismissing ? 100 : 0, scale: 1 }}
        className="bg-gradient-to-r from-violet-500 to-purple-600 text-white rounded-lg shadow-lg p-4 min-w-[300px]"
      >
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1">
            <p className="font-bold text-lg">🎉 {newStage.toUpperCase()} STAGE!</p>
            <p className="text-sm opacity-90">{identityName}</p>
            <p className="text-xs opacity-80 mt-1">Mastery Trial begins</p>
          </div>
          <button onClick={handleDismiss} className="text-white/70 hover:text-white">✕</button>
        </div>
        {onViewRewards && (
          <button
            onClick={onViewRewards}
            className="mt-3 w-full bg-white/20 hover:bg-white/30 rounded px-3 py-1.5 text-sm font-semibold"
          >
            View Evolution
          </button>
        )}
      </motion.div>
    );
  }

  if (leveledUp) {
    return (
      <motion.div
        initial={{ opacity: 0, x: 100, scale: 0.9 }}
        animate={{ opacity: dismissing ? 0 : 1, x: dismissing ? 100 : 0, scale: 1 }}
        className="bg-gradient-to-r from-amber-400 to-orange-500 text-white rounded-lg shadow-lg p-4 min-w-[300px]"
      >
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1">
            <p className="font-bold text-lg">⭐ LEVEL UP!</p>
            <p className="text-sm opacity-90">{identityName}</p>
            <p className="text-sm mt-1">Level {currentLevel - 1} → {currentLevel}</p>
            {newUnlockCount > 0 && (
              <p className="text-xs opacity-80 mt-1">+{newUnlockCount} new unlocks</p>
            )}
          </div>
          <button onClick={handleDismiss} className="text-white/70 hover:text-white">✕</button>
        </div>
        {onViewRewards && (
          <button
            onClick={onViewRewards}
            className="mt-3 w-full bg-white/20 hover:bg-white/30 rounded px-3 py-1.5 text-sm font-semibold"
          >
            View Rewards
          </button>
        )}
      </motion.div>
    );
  }

  // Basic XP toast
  return (
    <motion.div
      initial={{ opacity: 0, x: 100, scale: 0.9 }}
      animate={{ opacity: dismissing ? 0 : 1, x: dismissing ? 100 : 0, scale: 1 }}
      className="bg-white border border-teal-200 rounded-lg shadow-lg p-3 min-w-[280px]"
    >
      <div className="flex items-center justify-between gap-3">
        <div className="flex-1">
          <p className="font-semibold text-teal-700">🌊 +{xpGranted} XP</p>
          <p className="text-sm text-slate-600">{identityName}</p>
          <p className="text-xs text-slate-500">Level {currentLevel} → {progressPercent}%</p>
        </div>
        <button onClick={handleDismiss} className="text-slate-400 hover:text-slate-600">✕</button>
      </div>
    </motion.div>
  );
}

// apps/web/src/components/character/EvolutionSummaryPanel.tsx

interface EvolutionSummaryPanelProps {
  identityId: string;
  identityName: string;
  onViewFull: () => void;
}

export function EvolutionSummaryPanel({
  identityId,
  identityName,
  onViewFull
}: EvolutionSummaryPanelProps) {
  const { evolution, loading } = useEvolutionState(identityId);
  const { character } = useCharacterState(identityId);

  if (loading) return <EvolutionSummaryPanelSkeleton />;
  if (!evolution || !character) return null;

  const progressPercent = Math.round((evolution.xp - getXpForLevel(evolution.level)) / (getXpForLevel(evolution.level + 1) - getXpForLevel(evolution.level)) * 100);

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      className="mb-6 rounded-2xl border border-slate-200 bg-gradient-to-br from-teal-50 via-white to-slate-50 p-4 shadow-sm"
    >
      <div className="flex items-center gap-4">
        <FlowCharacter
          stage={evolution.stage}
          palette={character.activePalette}
          hat={character.activeHat}
          eyes={character.activeEyes}
          background={character.activeBackground}
          aura={character.activeAura}
          size="lg"
          animated
          onClick={onViewFull}
        />

        <div className="flex-1 min-w-0">
          <p className="text-xs font-semibold uppercase tracking-wide text-teal-700">
            {identityName}
          </p>
          <p className="text-sm font-bold text-slate-900 mt-0.5">
            {evolution.stage} · Level {evolution.level}
          </p>

          <div className="mt-2">
            <div className="flex items-baseline justify-between text-xs mb-1">
              <span className="text-slate-600">{progressPercent}% to Level {evolution.level + 1}</span>
              <span className="text-slate-500 tabular-nums">{evolution.xpToNextLevel} XP</span>
            </div>
            <div className="h-2 w-full rounded-full bg-slate-200">
              <motion.div
                className="h-full rounded-full bg-gradient-to-r from-teal-500 to-teal-600"
                initial={{ width: 0 }}
                animate={{ width: `${progressPercent}%` }}
                transition={{ duration: 0.6, ease: 'easeOut' }}
              />
            </div>
          </div>

          {evolution.trialState === 'Active' && (
            <p className="text-xs text-slate-600 mt-2">
              🎯 Trial: {evolution.trialActiveDays} of {evolution.trialTargetDays} days
            </p>
          )}

          <button
            onClick={onViewFull}
            className="mt-3 text-sm font-semibold text-teal-700 hover:text-teal-800"
          >
            Full Evolution →
          </button>
        </div>
      </div>
    </motion.div>
  );
}
```

**Tests:**
- [ ] FlowCharacter renders all stages correctly
- [ ] FlowCharacter applies palette filters
- [ ] FlowCharacter layers accessories in correct z-order
- [ ] XpToast shows correct variants
- [ ] XpToast auto-dismisses after timeout
- [ ] EvolutionSummaryPanel displays stats accurately

---

### Phase 3: Full Experience (Week 5-6)

```tsx
// apps/web/src/components/character/EvolutionShowcase.tsx
// Full implementation of RPG character sheet modal
// (Implementation details omitted for brevity - see UI/UX Design section)

// Integration with task completion:
// apps/web/src/hooks/useTasks.ts

const completeTask = async (taskId: string) => {
  const result = await api.completeTask(taskId);

  if (result.xpResult) {
    showXpToast({
      identityName: result.identityName,
      xpGranted: result.xpResult.xpGranted,
      currentLevel: result.identity.level,
      progressPercent: calculateProgressPercent(result.identity),
      leveledUp: result.xpResult.leveledUp,
      newUnlockCount: result.xpResult.newUnlocks.length,
      newStage: result.xpResult.newStage,
      onViewRewards: () => openEvolutionShowcase(result.identity.id)
    });
  }

  refreshTasks();
};
```

**Tests:**
- [ ] EvolutionShowcase modal opens/closes correctly
- [ ] Customization updates character in real-time
- [ ] Locked items show proper tooltips
- [ ] Task completion triggers XP toast
- [ ] Level-up opens Evolution modal
- [ ] Stage evolution plays full animation sequence

---

### Phase 4: Polish & Assets (Week 7-8)

- [ ] Commission or design final character art
- [ ] Implement all 5 stage forms
- [ ] Create all 25 accessory assets
- [ ] Add particle effects
- [ ] Optimize image loading (lazy load, CDN)
- [ ] Add sound effects (optional)
- [ ] Performance testing on mobile
- [ ] Visual regression tests

---

## Testing Strategy

### Unit Tests

```typescript
// Character rendering
FlowCharacter.test.tsx
  ✓ renders correct stage form
  ✓ applies palette filter
  ✓ layers accessories in z-order
  ✓ animates on level up
  ✓ handles missing accessories

// Backend services
characterCustomization.test.ts
  ✓ prevents equipping locked items
  ✓ allows equipping unlocked items
  ✓ handles concurrent updates
  ✓ validates unlock keys

// XP flow
identityEvolution.test.ts
  ✓ grants XP correctly
  ✓ respects daily cap
  ✓ triggers level-up at threshold
  ✓ starts mastery trial at stage gates
```

### Integration Tests

```typescript
// End-to-end XP flow
xpFlow.e2e.test.ts
  ✓ task completion → XP grant → toast → modal
  ✓ level-up unlocks new items
  ✓ stage evolution starts trial
  ✓ customization persists across sessions
```

### Visual Regression Tests

```typescript
// Snapshot testing for character renders
visual.test.tsx
  ✓ all 5 stage forms match snapshots
  ✓ accessory combinations render correctly
  ✓ palette filters apply as expected
```

### Performance Tests

```typescript
// Rendering performance
performance.test.ts
  ✓ character renders in <100ms
  ✓ image loading completes in <2s
  ✓ animations maintain 60fps
  ✓ memory usage stays under 50MB
```

---

## Rollout Plan

### Phased Rollout (10 Weeks)

**Week 1-2: Foundation**
- Database migration
- Backend services & API
- Basic unlock catalog
- Unit tests

**Week 3-4: Core Components**
- FlowCharacter component
- XpToast notifications
- EvolutionSummaryPanel
- Component tests

**Week 5-6: Full Experience**
- EvolutionShowcase modal
- Customization UI
- Integration with tasks/habits
- Integration tests

**Week 7-8: Polish & Assets**
- Final character art
- Animations & particles
- Sound effects (optional)
- Performance optimization

**Week 9: Beta Launch**
- Deploy to 10% of users
- Monitor metrics
- Gather feedback
- Fix critical bugs

**Week 10: Full Rollout**
- Deploy to 100%
- Marketing push
- Documentation
- Monitor metrics

---

### Feature Flags

```typescript
FEATURE_FLAGS = {
  CHARACTER_EVOLUTION_ENABLED: {
    defaultValue: false,
    rollout: { beta: 0.1, full: 1.0 }
  },
  ADVANCED_ANIMATIONS: {
    defaultValue: false,
    rollout: { beta: 0.5, full: 1.0 }
  }
}
```

---

### Rollback Plan

**If metrics decline or critical bugs:**

1. **Immediate (< 1 hour):** Flip feature flag to 0%
2. **Investigation (< 4 hours):** Review logs, reproduce bugs
3. **Decision (< 24 hours):** Fix + re-enable OR full rollback
4. **Communication:** In-app notice, email beta users

---

## Success Metrics

### Primary Metrics (30 days post-launch)

**Engagement:**
- Target: +30% increase in DAU
- Measure: Daily active users completing tasks

**Completion Rate:**
- Target: +25% increase in task/habit completions
- Measure: Avg completions per user per day

**Retention:**
- Target: +15% improvement in D7 retention
- Measure: % of users returning after 7 days

### Secondary Metrics

**Identity Studio Visits:**
- Target: +50% increase in weekly visits
- Measure: Sessions including /habits page

**Customization Engagement:**
- Target: 60% of users equip ≥1 unlock
- Measure: % with non-default customization

**XP Toast CTR:**
- Target: 20% click "View Rewards"
- Measure: Toast clicks / impressions

### Health Metrics

**Performance:**
- Target: <100ms character render time
- Alert if: >200ms on mobile

**Error Rate:**
- Target: <0.1% rendering errors
- Alert if: >1% error rate

**Asset Load Time:**
- Target: <2s for all assets
- Optimize: CDN caching, compression

---

### Success Criteria

**Launch is successful if:**

✅ Task completion rate ↑ ≥20%
✅ D7 retention ↑ ≥10%
✅ ≥50% customize character
✅ ≥4.0/5.0 user satisfaction
✅ <1% error rate
✅ Identity Studio visits ↑ ≥40%

**Failure signals (rollback):**

❌ Task completion rate ↓
❌ Negative feedback >30%
❌ Performance regression
❌ Critical bugs >5% users

---

## Post-Launch Enhancements

### V2 Features (3-6 months)

- Seasonal event themes (Halloween, holidays)
- Achievement badges system
- Character emotes (wave, dance)
- Social sharing (character cards)
- Leaderboards (opt-in)

### V3 Features (6-12 months)

- WebGL 3D character (full rotation)
- Pet/companion system
- Animated backgrounds
- Character voice lines
- Mobile AR mode

---

## Documentation Requirements

**User-Facing:**
- Help article: "How Flow Evolution works"
- FAQ: Common XP questions
- Video tutorial: Character customization (2 min)
- Tooltip tour on first visit

**Developer:**
- ADR: Rendering strategy decision
- Character asset guidelines
- API documentation
- XP support ticket runbook

---

## Next Steps

1. **Approve design** ✅
2. **Create implementation tickets** (Phase 1-6 breakdown)
3. **Assign asset creation** (designer/artist)
4. **Set up project board** (GitHub/Linear)
5. **Schedule kick-off meeting**
6. **Begin Phase 1: Foundation**

---

**End of Document**
