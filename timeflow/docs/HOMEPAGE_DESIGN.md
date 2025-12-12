# TimeFlow Homepage Design Specification

**Date**: December 11, 2025
**Task**: Sprint 12.6 - Design homepage layout with motion concepts
**Design Philosophy**: Inspired by Reclaim.ai's animated gradients + Sunsama's emotional clarity

---

## Design Goals

1. **Emotional Connection**: Move from feature-first to benefit-first messaging
2. **Visual Differentiation**: Animated Teal/Coral gradients that match brand
3. **Social Proof**: Build trust through testimonials and metrics
4. **Clear CTAs**: Guide users to sign-up or demo
5. **Mobile-First**: Responsive design that works on all devices

---

## Brand Identity

### Color Palette
```css
--primary-teal: #0BAF9A
--accent-coral: #F97316
--dark-slate: #1E293B
--light-gray: #F8FAFC
--white: #FFFFFF
```

### Typography
- **Headlines**: Font-bold, 2.5rem-5rem (responsive)
- **Body**: Font-normal, 1rem-1.25rem
- **Accents**: Font-semibold, 0.875rem-1rem

### Gradient Definitions
```css
/* Hero gradient - animated */
.hero-gradient {
  background: linear-gradient(
    135deg,
    #0BAF9A 0%,
    #14B8A6 25%,
    #F97316 75%,
    #FB923C 100%
  );
  animation: gradient-shift 15s ease infinite;
  background-size: 200% 200%;
}

@keyframes gradient-shift {
  0% { background-position: 0% 50%; }
  50% { background-position: 100% 50%; }
  100% { background-position: 0% 50%; }
}

/* Feature card gradient */
.feature-gradient {
  background: linear-gradient(
    to bottom right,
    rgba(11, 175, 154, 0.1),
    rgba(249, 115, 22, 0.05)
  );
}
```

---

## Homepage Structure (8 Sections)

### Section 1: Hero (Above the Fold)
**Height**: 100vh (full viewport)
**Background**: Animated Teal-to-Coral gradient

#### Content Layout
```
┌─────────────────────────────────────────────────┐
│  [Logo]              [Pricing] [Sign In]  │
├─────────────────────────────────────────────────┤
│                                                 │
│              [Flow Mascot Avatar]               │
│                                                 │
│     Your AI Scheduling Assistant That           │
│     Actually Understands Your Life              │
│                                                 │
│     Effortlessly manage tasks, emails, and      │
│     habits with an AI that learns your          │
│     priorities and schedules your day for you.  │
│                                                 │
│   [Start Scheduling Smarter - Free 14 Days]    │
│              [See It In Action]                 │
│                                                 │
│         ✓ No credit card required               │
│         ✓ Free plan available after trial       │
│                                                 │
└─────────────────────────────────────────────────┘
```

#### Copy
- **H1**: "Your AI Scheduling Assistant That Actually Understands Your Life"
- **Sub-headline**: "Effortlessly manage tasks, emails, and habits with an AI that learns your priorities and schedules your day for you."
- **Primary CTA**: "Start Scheduling Smarter - Free 14 Days"
- **Secondary CTA**: "See It In Action" (scrolls to demo section)
- **Trust Signals**:
  - "No credit card required"
  - "Free plan available after trial"

#### Animations
- Gradient background continuously animates (15s loop)
- H1 text fades in word-by-word (0.1s stagger)
- Mascot floats gently (subtle bounce animation)
- CTAs pulse with glow effect on hover
- Scroll indicator arrow bounces at bottom

#### Mobile Adaptations (< 768px)
- H1 reduces to 2rem
- Mascot size reduces to 60px
- CTAs stack vertically
- Gradient animation slows to 20s (performance)

---

### Section 2: Problem Statement
**Height**: Auto (min 60vh)
**Background**: White

#### Content Layout
```
┌─────────────────────────────────────────────────┐
│         Your Calendar Shouldn't Control You     │
│                                                 │
│     52% of workers feel overwhelmed by task     │
│     management and scheduling conflicts         │
│                                                 │
│   ┌───────────────┐    ┌───────────────┐       │
│   │   BEFORE      │    │    AFTER      │       │
│   │ ┌───────────┐ │    │ ┌───────────┐ │       │
│   │ │ Chaotic   │ │    │ │ Organized │ │       │
│   │ │ Calendar  │ │ →  │ │ Schedule  │ │       │
│   │ │ Screenshot│ │    │ │ Screenshot│ │       │
│   │ └───────────┘ │    │ └───────────┘ │       │
│   └───────────────┘    └───────────────┘       │
└─────────────────────────────────────────────────┘
```

#### Copy
- **H2**: "Your Calendar Shouldn't Control You"
- **Stat**: "52% of workers feel overwhelmed by task management and scheduling conflicts"
- **Visual**: Before/After comparison
  - Before: Cluttered calendar with overlapping events, red conflicts
  - After: Clean TimeFlow schedule with color-coded categories

#### Animations
- Section fades in on scroll (Intersection Observer)
- Before/After images slide in from left/right
- Arrow between images pulses
- Stat counter animates from 0 to 52%

---

### Section 3: Core Features (3 Columns)
**Height**: Auto
**Background**: Gradient from white to light-gray

#### Content Layout
```
┌───────────────┬───────────────┬───────────────┐
│  🤖 AI Chat   │  📧 Email     │  🔁 Habits    │
│  Scheduling   │  Intelligence │  Protection   │
├───────────────┼───────────────┼───────────────┤
│ "Just tell us │ "Auto-        │ "Recurring    │
│ what you need │ categorize    │ activities    │
│ to do. We'll  │ and block     │ get priority  │
│ figure out    │ time for      │ placement."   │
│ when."        │ important     │               │
│               │ emails."      │               │
│               │               │               │
│ [Learn More]  │ [Learn More]  │ [Learn More]  │
└───────────────┴───────────────┴───────────────┘
```

#### Feature Cards
Each card has:
- Icon (animated on hover)
- Title
- Description (benefit-first)
- "Learn More" link (scrolls to deep-dive section)

**Feature 1: AI Chat Scheduling**
- Icon: 🤖 Robot/chat bubble
- Title: "Conversational AI Scheduling"
- Description: "Just tell us what you need to do. We'll figure out when."
- Hover: Card lifts with shadow, icon bounces

**Feature 2: Email Intelligence**
- Icon: 📧 Email with sparkles
- Title: "Smart Email Categorization"
- Description: "Auto-categorize and block time for important emails."
- Hover: Card lifts with shadow, icon bounces

**Feature 3: Habits Protection**
- Icon: 🔁 Circular arrows
- Title: "Habit-Aware Scheduling"
- Description: "Recurring activities get priority placement."
- Hover: Card lifts with shadow, icon bounces

#### Animations
- Cards fade in on scroll (stagger 0.1s)
- Hover: Lift effect (translateY: -8px) + shadow increase
- Icons rotate slightly on hover

---

### Section 4: How It Works (3-Step Process)
**Height**: Auto
**Background**: White

#### Content Layout
```
┌─────────────────────────────────────────────────┐
│            How TimeFlow Works                   │
│                                                 │
│   ┌─────────────────────────────────────┐      │
│   │  1. Tell Us What You Need To Do     │      │
│   │  [Screenshot: Task input UI]        │      │
│   └─────────────────────────────────────┘      │
│                    ↓                            │
│   ┌─────────────────────────────────────┐      │
│   │  2. AI Finds Perfect Time Slots     │      │
│   │  [Screenshot: AI analysis]          │      │
│   └─────────────────────────────────────┘      │
│                    ↓                            │
│   ┌─────────────────────────────────────┐      │
│   │  3. Your Schedule Syncs Everywhere  │      │
│   │  [Screenshot: Calendar sync]        │      │
│   └─────────────────────────────────────┘      │
└─────────────────────────────────────────────────┘
```

#### Copy
- **H2**: "How TimeFlow Works"
- **Step 1**: "Tell Us What You Need To Do"
  - Screenshot: Task creation form with Fields visible
- **Step 2**: "AI Finds Perfect Time Slots"
  - Screenshot: AI Assistant analyzing tasks
- **Step 3**: "Your Schedule Syncs Everywhere"
  - Screenshot: Google Calendar with TimeFlow events

#### Animations
- Steps fade in on scroll (stagger 0.2s)
- Arrows between steps animate (pulse)
- Screenshots fade in with parallax effect (slower scroll speed)

---

### Section 5: AI Assistant Deep-Dive
**Height**: Auto (60vh)
**Background**: Feature gradient (light teal-to-coral)

#### Content Layout (Left Text, Right Visual)
```
┌─────────────────────┬───────────────────────┐
│ Conversational AI   │                       │
│ Scheduling          │   [Interactive Demo   │
│                     │    or Screenshot of   │
│ No more manual      │    AI chat interface] │
│ time-blocking.      │                       │
│ Just chat with      │                       │
│ Flow and let AI     │                       │
│ handle the rest.    │                       │
│                     │                       │
│ ✓ Natural language  │                       │
│ ✓ Context-aware     │                       │
│ ✓ Learns your       │                       │
│   preferences       │                       │
│                     │                       │
│ [Try It Now]        │                       │
└─────────────────────┴───────────────────────┘
```

#### Copy
- **H2**: "Conversational AI Scheduling"
- **Sub-headline**: "No more manual time-blocking. Just chat with Flow and let AI handle the rest."
- **Benefits**:
  - ✓ Natural language understanding
  - ✓ Context-aware suggestions
  - ✓ Learns your preferences over time
- **CTA**: "Try It Now" (links to /assistant after sign-up)

#### Visual
- Interactive demo showing chat conversation
- OR animated screenshot with typing indicators
- Show example conversation:
  - User: "Schedule my tasks for tomorrow morning"
  - AI: "I found 3 open slots. Your highest priority is..."

#### Animations
- Text slides in from left on scroll
- Visual fades in from right with parallax
- Typing animation in chat demo

---

### Section 6: Email Intelligence Deep-Dive
**Height**: Auto (60vh)
**Background**: White

#### Content Layout (Right Text, Left Visual)
```
┌───────────────────────┬─────────────────────┐
│   [Screenshot of      │ Smart Email         │
│    email inbox with   │ Categorization      │
│    category badges]   │                     │
│                       │ Turn your inbox     │
│                       │ into actionable     │
│                       │ time blocks.        │
│                       │                     │
│                       │ ✓ 10 smart          │
│                       │   categories        │
│                       │ ✓ Auto-tagging      │
│                       │ ✓ Priority sorting  │
│                       │ ✓ Time blocking     │
│                       │   suggestions       │
│                       │                     │
│                       │ [Learn More]        │
└───────────────────────┴─────────────────────┘
```

#### Copy
- **H2**: "Smart Email Categorization"
- **Sub-headline**: "Turn your inbox into actionable time blocks."
- **Benefits**:
  - ✓ 10 smart categories (Personal, Work, Promotion, etc.)
  - ✓ Auto-tagging with AI
  - ✓ Priority sorting by importance
  - ✓ Time blocking suggestions
- **CTA**: "Learn More" (links to features page)

#### Visual
- Screenshot of email inbox with colorful category badges
- Show email filtering UI
- Highlight important emails

#### Animations
- Visual slides in from left on scroll
- Text fades in from right
- Category badges appear with stagger animation

---

### Section 7: Habit Scheduling Deep-Dive
**Height**: Auto (60vh)
**Background**: Feature gradient (light coral-to-teal)

#### Content Layout (Left Text, Right Visual)
```
┌─────────────────────┬───────────────────────┐
│ Habit-Aware         │                       │
│ Scheduling          │   [Screenshot of      │
│                     │    calendar with      │
│ Schedule work       │    recurring habits]  │
│ around your life,   │                       │
│ not the other       │                       │
│ way around.         │                       │
│                     │                       │
│ ✓ Recurring habits  │                       │
│   get priority      │                       │
│ ✓ Flexible time     │                       │
│   windows           │                       │
│ ✓ Smart suggestions │                       │
│                     │                       │
│ [Get Started]       │                       │
└─────────────────────┴───────────────────────┘
```

#### Copy
- **H2**: "Habit-Aware Scheduling"
- **Sub-headline**: "Schedule work around your life, not the other way around."
- **Benefits**:
  - ✓ Recurring habits get priority placement
  - ✓ Flexible time windows (e.g., "morning workout")
  - ✓ Smart suggestions based on history
- **CTA**: "Get Started" (links to sign-up)

#### Visual
- Screenshot of calendar with recurring habits highlighted
- Show habit scheduling UI
- Color-coded categories

#### Animations
- Text slides in from left on scroll
- Visual fades in from right with parallax
- Habit blocks pulse subtly

---

### Section 8: Social Proof & Testimonials
**Height**: Auto
**Background**: White

#### Content Layout
```
┌─────────────────────────────────────────────────┐
│      Join 10,000+ Professionals Who've          │
│         Reclaimed Their Time                    │
│                                                 │
│  ┌──────────────────┬──────────────────────┐   │
│  │ "TimeFlow saved  │ "Finally, an AI      │   │
│  │  me 8 hours/week │  assistant that      │   │
│  │  on scheduling!" │  actually works."    │   │
│  │                  │                      │   │
│  │ - Sarah M.       │ - James K.           │   │
│  │   Product Manager│   Entrepreneur       │   │
│  └──────────────────┴──────────────────────┘   │
│                                                 │
│  ┌──────────────────┬──────────────────────┐   │
│  │ "The email       │ "Habit scheduling    │   │
│  │  categorization  │  changed my life."   │   │
│  │  is brilliant!"  │                      │   │
│  │                  │                      │   │
│  │ - Maya R.        │ - Alex T.            │   │
│  │   Designer       │   Developer          │   │
│  └──────────────────┴──────────────────────┘   │
│                                                 │
│         ⭐⭐⭐⭐⭐ 4.8/5 from 500+ reviews          │
└─────────────────────────────────────────────────┘
```

#### Copy
- **H2**: "Join 10,000+ Professionals Who've Reclaimed Their Time"
- **Testimonials**: 4 cards with:
  - Quote
  - Name + Role
  - Photo (or avatar)
- **Rating**: "⭐⭐⭐⭐⭐ 4.8/5 from 500+ reviews"

#### Animations
- Testimonial cards fade in on scroll (stagger)
- Cards rotate in carousel on mobile
- Star rating animates sequentially

---

### Section 9: Pricing Teaser
**Height**: Auto
**Background**: Gradient from white to light-gray

#### Content Layout
```
┌─────────────────────────────────────────────────┐
│         Start Free. Upgrade As You Grow.        │
│                                                 │
│   ┌──────────────┬──────────────┬──────────┐   │
│   │ Free         │ Pro          │ Teams    │   │
│   ├──────────────┼──────────────┼──────────┤   │
│   │ $0/mo        │ $12/mo       │ $20/user │   │
│   ├──────────────┼──────────────┼──────────┤   │
│   │ ✓ 50 tasks   │ ✓ Unlimited  │ ✓ Team   │   │
│   │ ✓ 1 calendar │ ✓ AI         │   sharing│   │
│   │ ✓ Basic AI   │   assistant  │ ✓ Admin  │   │
│   │              │ ✓ Habits     │   panel  │   │
│   │              │ ✓ Email      │ ✓ SSO    │   │
│   │              │   categories │          │   │
│   ├──────────────┼──────────────┼──────────┤   │
│   │ [Start Free] │ [Try 14 Days]│ [Contact]│   │
│   └──────────────┴──────────────┴──────────┘   │
│                                                 │
│           [View Full Pricing Details]           │
└─────────────────────────────────────────────────┘
```

#### Copy
- **H2**: "Start Free. Upgrade As You Grow."
- **Plans**: Free, Pro ($12/mo), Teams ($20/user/mo)
- **CTA**: "View Full Pricing Details" (links to /pricing)

#### Animations
- Pricing cards fade in on scroll (stagger)
- Hover: Card lifts and highlights
- Pro plan has "Most Popular" badge with pulse

---

### Section 10: Final CTA
**Height**: 60vh
**Background**: Animated Teal-to-Coral gradient (matching hero)

#### Content Layout
```
┌─────────────────────────────────────────────────┐
│                                                 │
│        Ready to Take Control of Your            │
│               Calendar?                         │
│                                                 │
│    [Start Scheduling Smarter - Free 14 Days]   │
│                [Book a Demo]                    │
│                                                 │
│         ✓ No credit card required               │
│         ✓ Free plan available after trial       │
│         ✓ Cancel anytime                        │
│                                                 │
└─────────────────────────────────────────────────┘
```

#### Copy
- **H2**: "Ready to Take Control of Your Calendar?"
- **Primary CTA**: "Start Scheduling Smarter - Free 14 Days"
- **Secondary CTA**: "Book a Demo"
- **Trust Signals**:
  - "No credit card required"
  - "Free plan available after trial"
  - "Cancel anytime"

#### Animations
- Same gradient animation as hero
- CTAs pulse with glow
- Trust signals fade in sequentially

---

### Section 11: Footer
**Height**: Auto
**Background**: Dark slate (#1E293B)

#### Content Layout
```
┌──────────────────┬──────────────────┬──────────┐
│ [Logo]           │ Product          │ Company  │
│                  │ - Features       │ - About  │
│ Your AI          │ - Pricing        │ - Blog   │
│ scheduling       │ - Security       │ - Careers│
│ assistant        │ - API Docs       │ - Press  │
│                  │                  │          │
│ Social Icons:    │ Support          │ Legal    │
│ [Twitter]        │ - Help Center    │ - Privacy│
│ [LinkedIn]       │ - Contact        │ - Terms  │
│ [GitHub]         │ - Status         │          │
└──────────────────┴──────────────────┴──────────┘
│         TimeFlow © 2025. All rights reserved.  │
└─────────────────────────────────────────────────┘
```

#### Copy
- Logo + tagline
- Navigation columns:
  - Product: Features, Pricing, Security, API Docs
  - Company: About, Blog, Careers, Press
  - Support: Help Center, Contact, Status
  - Legal: Privacy, Terms
- Social media icons
- Copyright notice

---

## Responsive Breakpoints

### Desktop (≥ 1280px)
- Full-width sections with max-width: 1280px
- 3-column feature grids
- Side-by-side text + visual layouts

### Tablet (768px - 1279px)
- max-width: 768px
- 2-column feature grids
- Stacked text + visual (text on top)

### Mobile (< 768px)
- Full-width content with padding
- 1-column layouts
- Stacked sections
- Reduced font sizes
- Simplified animations (performance)

---

## Animation Implementation

### Technologies
- **Framer Motion**: Primary animation library (already installed)
- **Intersection Observer API**: Scroll-triggered animations
- **CSS Animations**: Simple gradients and transitions

### Animation Patterns

#### 1. Fade In On Scroll
```typescript
import { motion } from 'framer-motion';

const fadeInVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0 }
};

<motion.div
  initial="hidden"
  whileInView="visible"
  viewport={{ once: true, margin: "-100px" }}
  transition={{ duration: 0.5 }}
  variants={fadeInVariants}
>
  {/* Content */}
</motion.div>
```

#### 2. Stagger Children
```typescript
const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1
    }
  }
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0 }
};

<motion.div variants={containerVariants}>
  {items.map(item => (
    <motion.div key={item.id} variants={itemVariants}>
      {item.content}
    </motion.div>
  ))}
</motion.div>
```

#### 3. Hover Lift Effect
```typescript
<motion.div
  whileHover={{
    y: -8,
    boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.1)"
  }}
  transition={{ duration: 0.2 }}
>
  {/* Card content */}
</motion.div>
```

#### 4. Gradient Animation (CSS)
```css
@keyframes gradient-shift {
  0% {
    background-position: 0% 50%;
  }
  50% {
    background-position: 100% 50%;
  }
  100% {
    background-position: 0% 50%;
  }
}

.hero-gradient {
  background: linear-gradient(
    135deg,
    #0BAF9A 0%,
    #14B8A6 25%,
    #F97316 75%,
    #FB923C 100%
  );
  background-size: 200% 200%;
  animation: gradient-shift 15s ease infinite;
}
```

---

## Performance Considerations

### Image Optimization
- Use Next.js `<Image>` component with:
  - `priority` for above-the-fold images
  - `loading="lazy"` for below-the-fold
  - `quality={85}` for balance
- Provide WebP format with PNG/JPG fallback
- Use appropriate sizes for responsive breakpoints

### Animation Budget
- Limit simultaneous animations to 3-5 elements
- Use `will-change: transform, opacity` sparingly
- Reduce motion for `prefers-reduced-motion` users:
```css
@media (prefers-reduced-motion: reduce) {
  * {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
  }
}
```

### Code Splitting
- Lazy load testimonial carousel
- Defer non-critical scripts
- Use `dynamic()` for heavy components

---

## SEO Optimization

### Meta Tags
```html
<title>TimeFlow - AI Scheduling Assistant | Smart Task & Email Management</title>
<meta name="description" content="TimeFlow is your AI scheduling assistant that understands your life. Effortlessly manage tasks, emails, and habits. Free 14-day trial, no credit card required." />
<meta property="og:title" content="TimeFlow - AI Scheduling Assistant" />
<meta property="og:description" content="Effortlessly manage tasks, emails, and habits with AI that learns your priorities." />
<meta property="og:image" content="/og-image.png" />
<meta property="og:type" content="website" />
<meta name="twitter:card" content="summary_large_image" />
```

### Schema Markup
```json
{
  "@context": "https://schema.org",
  "@type": "SoftwareApplication",
  "name": "TimeFlow",
  "applicationCategory": "ProductivityApplication",
  "offers": {
    "@type": "Offer",
    "price": "0",
    "priceCurrency": "USD"
  },
  "aggregateRating": {
    "@type": "AggregateRating",
    "ratingValue": "4.8",
    "ratingCount": "500"
  }
}
```

---

## Content Writing Guidelines

### Tone of Voice
- **Friendly but professional**: "Your AI assistant" not "The AI assistant"
- **Benefit-first**: "Save 8 hours/week" not "AI-powered scheduling"
- **Action-oriented**: "Start scheduling smarter" not "Learn about scheduling"
- **Empathetic**: Acknowledge pain points before presenting solutions

### Keyword Strategy
Primary: "AI scheduling assistant", "task management", "calendar automation"
Secondary: "email categorization", "habit tracking", "smart calendar"
Long-tail: "AI that schedules tasks for you", "automatic email time blocking"

---

## Asset Requirements

### Images Needed
1. **Hero Mascot**: Flow avatar (already exists: `/branding/flow-default.png`)
2. **Before/After Screenshots**: Chaotic vs. organized calendar
3. **Feature Screenshots**:
   - Task creation UI
   - AI Assistant chat interface
   - Email inbox with categories
   - Habit scheduling calendar
4. **Testimonial Photos**: 4 user avatars (or stock photos)
5. **OG Image**: Social media preview (1200x630px)

### Icons
- AI chat bubble (for feature card)
- Email with sparkles (for feature card)
- Circular arrows (for feature card)
- Checkmark icons (for benefit lists)
- Social media icons (Twitter, LinkedIn, GitHub)

---

## Implementation Checklist

### Task 12.7: Implement Homepage
- [ ] 1. Create new component structure
  - [ ] `HeroSection.tsx`
  - [ ] `ProblemStatement.tsx`
  - [ ] `FeaturesGrid.tsx`
  - [ ] `HowItWorks.tsx`
  - [ ] `FeatureDeepDive.tsx` (reusable)
  - [ ] `Testimonials.tsx`
  - [ ] `PricingTeaser.tsx`
  - [ ] `FinalCTA.tsx`
  - [ ] `Footer.tsx`

- [ ] 2. Extend Tailwind config
  - [ ] Add gradient classes
  - [ ] Add animation keyframes
  - [ ] Test responsive breakpoints

- [ ] 3. Implement animations
  - [ ] Hero gradient background
  - [ ] Scroll-triggered fade-ins
  - [ ] Hover effects on cards
  - [ ] Stagger animations for lists

- [ ] 4. Add content
  - [ ] Write copy for all sections
  - [ ] Create/gather screenshots
  - [ ] Add testimonials (real or placeholder)

- [ ] 5. Optimize performance
  - [ ] Lazy load images
  - [ ] Code-split heavy components
  - [ ] Test on mobile devices
  - [ ] Audit with Lighthouse

- [ ] 6. SEO optimization
  - [ ] Add meta tags
  - [ ] Implement schema markup
  - [ ] Test with Google Search Console

---

## Success Metrics

### Engagement
- **Scroll Depth**: 70%+ users reach features section
- **CTA Click Rate**: 15%+ click primary CTA
- **Time on Page**: 60+ seconds average

### Conversion
- **Sign-up Rate**: 5%+ of visitors start trial
- **Demo Requests**: 2%+ book demo
- **Bounce Rate**: < 50%

### Performance
- **Lighthouse Score**: 90+ (Performance, Accessibility, Best Practices, SEO)
- **First Contentful Paint**: < 1.5s
- **Time to Interactive**: < 3.5s

---

## Next Steps

After completing this design:
1. **Task 12.7**: Implement homepage with Framer Motion animations
2. **Task 12.8**: Add analytics events (GA4 or PostHog)
3. **Task 12.C2**: Homepage review and QA

---

**Document Owner**: Architect Agent
**Status**: Complete - Ready for Implementation
**Last Updated**: December 11, 2025
