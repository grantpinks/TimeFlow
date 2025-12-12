# Sprint 12 Implementation Plan
**Polish & Marketing – Command Palette, Theme System, Homepage & Email Categorization**

---

## Overview

This sprint focuses on:
1. **Competitor Analysis & Homepage Design** (12.5-12.8)
2. **Email Categorization System** (12.9-12.11) - NEW
3. **Quality Assurance & Review** (12.C1-12.C3)

**Total Estimated Hours**: 35-50 hours
**Priority Tasks**: 12.5, 12.7, 12.9, 12.10, 12.C2

---

## Task 12.5: Competitor Homepage Audit
**Agent**: Claude
**Duration**: 3-4 hours
**Priority**: P0

### Objective
Audit competitor homepages (Reclaim.ai, Motion, Akiflow, Sunsama) to define TimeFlow's homepage narrative, hero concept, and key value propositions.

### Implementation Steps

1. **Audit Competitor Homepages** (1.5h)
   - Visit and screenshot key sections from:
     - https://www.usemotion.com
     - https://reclaim.ai
     - https://akiflow.com
     - https://sunsama.com
   - Document:
     - Hero messaging and value prop
     - Feature preview animations
     - Social proof placement
     - CTA strategy (primary/secondary)
     - Visual hierarchy and layout patterns

2. **Analyze Differentiation Opportunities** (1h)
   - Identify gaps in competitor messaging
   - Note what makes TimeFlow unique:
     - AI-first daily planning
     - Smart habit scheduling
     - Gmail integration for inbox-zero workflow
     - Student/professional focus
   - Document competitive positioning

3. **Define TimeFlow Homepage Narrative** (1h)
   - **Hero Concept**: "Plan your perfect day in seconds" or "Your AI scheduling assistant"
   - **Key Value Props**:
     - Automatic task scheduling from unstructured notes
     - AI-powered daily planning
     - Gmail + Calendar unification
     - Habit building on autopilot
   - **Target Audience**: Busy professionals, students, productivity enthusiasts

4. **Create Homepage Structure** (0.5h)
   - Hero section with animated preview
   - Feature sections (3-4 key features)
   - Social proof (testimonials/stats - placeholder for now)
   - CTA sections (primary: "Get Started", secondary: "See Demo")

### Deliverables
- `docs/SPRINT_12_COMPETITOR_AUDIT.md` - Competitor analysis
- `docs/SPRINT_12_HOMEPAGE_NARRATIVE.md` - Messaging framework

---

## Task 12.6: Design Homepage Layout
**Agent**: Codex
**Duration**: 4-6 hours
**Priority**: P1

### Objective
Design homepage layout (hero, feature sections, social proof) and motion concepts using Brand Guidelines.

### Implementation Steps

1. **Hero Section Design** (2h)
   - Gradient background matching brand colors (Primary Teal #0BAF9A, Accent Coral #F97316)
   - Animated task scheduling preview (Framer Motion)
   - Primary CTA button
   - Subheading with key benefits

2. **Feature Section Layouts** (2h)
   - **Feature 1**: Smart Scheduling
     - Screenshot/video of drag-and-drop scheduling
     - "Drop tasks, get a perfect schedule"
   - **Feature 2**: AI Daily Planning
     - Assistant chat interface preview
     - "Ask AI to plan your day"
   - **Feature 3**: Inbox Zero
     - Gmail integration preview
     - "Turn emails into scheduled tasks"

3. **Motion Concepts** (1-2h)
   - Hero animation: Tasks flowing into calendar
   - Feature reveals on scroll
   - Interactive demos (hover states)

### Deliverables
- Design wireframes/mockups
- Motion concept descriptions
- Framer Motion animation pseudocode

---

## Task 12.7: Implement New Homepage
**Agent**: Codex
**Duration**: 6-8 hours
**Priority**: P0

### Objective
Implement new homepage with responsive layout and Framer Motion animations.

### Implementation Steps

1. **Setup Homepage Structure** (1h)
   ```typescript
   // apps/web/src/app/page.tsx - New homepage
   - Hero section
   - Features section
   - Social proof section
   - CTA section
   - Footer
   ```

2. **Hero Section Implementation** (2-3h)
   - Animated gradient background
   - Hero title with fade-in animation
   - Animated preview of scheduling flow
   - Primary CTA button with hover effects
   - Responsive layout (mobile, tablet, desktop)

3. **Feature Sections** (2-3h)
   - 3 feature cards with:
     - Icon/illustration
     - Title and description
     - Animated preview (Framer Motion)
   - Scroll-triggered animations
   - Responsive grid layout

4. **Social Proof & CTA** (1h)
   - Placeholder testimonials
   - Final CTA section
   - Footer with links

5. **Animations** (1-2h)
   ```typescript
   // Example animations:
   - Fade in on scroll
   - Task card sliding into calendar
   - AI chat typing animation
   - Email → Task transformation
   ```

### Technical Requirements
- Framer Motion for animations
- Responsive design (mobile-first)
- Fast page load (optimize images)
- Accessibility (ARIA labels, keyboard nav)

### Deliverables
- `apps/web/src/app/page.tsx` - New homepage
- Animation components in `components/homepage/`

---

## Task 12.8: Add Homepage Analytics
**Agent**: Codex
**Duration**: 3-4 hours
**Priority**: P1

### Objective
Add analytics events for homepage interactions.

### Implementation Steps

1. **Setup Analytics Library** (1h)
   - Install analytics package (e.g., Vercel Analytics, PostHog)
   - Configure in Next.js app

2. **Add Event Tracking** (2-3h)
   - Track events:
     - `homepage_viewed`
     - `hero_cta_clicked`
     - `feature_section_viewed` (with feature name)
     - `demo_requested`
     - `signup_initiated`

3. **Test Analytics** (0.5h)
   - Verify events are firing correctly
   - Check analytics dashboard

### Deliverables
- Analytics configured
- Event tracking implemented

---

## Task 12.9: Email Categorization System (NEW)
**Agent**: Codex
**Duration**: 6-8 hours
**Priority**: P0

### Objective
Implement AI-powered email categorization to automatically tag emails as Personal, Work, Promotion, Shopping, Social, Finance, Travel, etc.

### Implementation Steps

1. **Define Email Categories** (0.5h)
   ```typescript
   // packages/shared/src/types/email.ts
   export type EmailCategory =
     | 'personal'
     | 'work'
     | 'promotion'
     | 'shopping'
     | 'social'
     | 'finance'
     | 'travel'
     | 'newsletter'
     | 'updates'
     | 'other';

   export interface EmailCategoryConfig {
     id: EmailCategory;
     name: string;
     color: string;
     icon?: string;
     keywords: string[]; // For rule-based classification
   }
   ```

2. **Backend: Email Categorization Service** (3-4h)
   ```typescript
   // apps/backend/src/services/emailCategorizationService.ts

   // 1. Rule-based categorization
   function categorizeByRules(email: EmailMessage): EmailCategory {
     // Check Gmail labels first
     if (email.labels?.includes('CATEGORY_PROMOTIONS')) return 'promotion';
     if (email.labels?.includes('CATEGORY_SOCIAL')) return 'social';
     if (email.labels?.includes('CATEGORY_UPDATES')) return 'updates';

     // Check sender domain patterns
     const from = email.from.toLowerCase();
     if (from.includes('noreply@') || from.includes('no-reply@')) {
       // Check subject for keywords
       const subject = email.subject.toLowerCase();
       if (subject.includes('order') || subject.includes('shipment')) return 'shopping';
       if (subject.includes('payment') || subject.includes('invoice')) return 'finance';
       return 'updates';
     }

     // Check subject keywords
     const subject = email.subject.toLowerCase();
     const snippet = (email.snippet || '').toLowerCase();

     // Shopping keywords
     if (/order|shipment|delivery|tracking|cart|purchase/.test(subject + snippet)) {
       return 'shopping';
     }

     // Finance keywords
     if (/payment|invoice|receipt|bank|credit card|transaction/.test(subject + snippet)) {
       return 'finance';
     }

     // Travel keywords
     if (/flight|hotel|booking|reservation|itinerary|boarding/.test(subject + snippet)) {
       return 'travel';
     }

     // Newsletter keywords
     if (/newsletter|digest|weekly|monthly|unsubscribe/.test(subject + snippet)) {
       return 'newsletter';
     }

     // Work keywords (company domains, meeting, schedule)
     if (/meeting|calendar|deadline|project|team|@company\.com/.test(from + subject)) {
       return 'work';
     }

     return 'personal';
   }

   // 2. Optional: ML-based categorization (future enhancement)
   async function categorizeByML(email: EmailMessage): Promise<EmailCategory> {
     // Use OpenAI/Claude API for classification
     // Input: email subject + snippet
     // Output: category
     // For now, fallback to rule-based
     return categorizeByRules(email);
   }

   export async function categorizeEmail(email: EmailMessage): Promise<EmailCategory> {
     try {
       // Try ML-based first, fallback to rules
       return await categorizeByML(email);
     } catch (err) {
       return categorizeByRules(email);
     }
   }
   ```

3. **Update Email Service** (1h)
   ```typescript
   // apps/backend/src/services/gmailService.ts
   import { categorizeEmail } from './emailCategorizationService.js';

   function mapMessage(message: gmail_v1.Schema$Message): EmailMessage | null {
     // ... existing code ...

     const emailMessage = {
       id: message.id,
       threadId: message.threadId,
       from,
       subject,
       snippet: message.snippet,
       receivedAt,
       importance,
       labels,
       isRead: !isUnread,
       isPromotional: labels.includes('CATEGORY_PROMOTIONS'),
     };

     // Add category
     const category = categorizeEmail(emailMessage);

     return {
       ...emailMessage,
       category,
     };
   }
   ```

4. **Update Shared Types** (0.5h)
   ```typescript
   // packages/shared/src/types/email.ts
   export interface EmailMessage {
     id: string;
     threadId?: string;
     from: string;
     subject: string;
     snippet?: string;
     receivedAt: string;
     importance: EmailImportance;
     labels?: string[];
     isRead?: boolean;
     isPromotional?: boolean;
     category?: EmailCategory; // NEW
   }
   ```

5. **Add Category Configuration** (1-2h)
   ```typescript
   // packages/shared/src/constants/emailCategories.ts
   export const EMAIL_CATEGORIES: Record<EmailCategory, EmailCategoryConfig> = {
     personal: {
       id: 'personal',
       name: 'Personal',
       color: '#3B82F6', // Blue
       keywords: ['family', 'friend', 'personal'],
     },
     work: {
       id: 'work',
       name: 'Work',
       color: '#8B5CF6', // Purple
       keywords: ['meeting', 'deadline', 'project', 'team'],
     },
     promotion: {
       id: 'promotion',
       name: 'Promotion',
       color: '#F59E0B', // Amber
       keywords: ['sale', 'discount', 'offer', 'deal'],
     },
     shopping: {
       id: 'shopping',
       name: 'Shopping',
       color: '#10B981', // Green
       keywords: ['order', 'shipment', 'delivery', 'purchase'],
     },
     social: {
       id: 'social',
       name: 'Social',
       color: '#EC4899', // Pink
       keywords: ['facebook', 'twitter', 'instagram', 'linkedin'],
     },
     finance: {
       id: 'finance',
       name: 'Finance',
       color: '#14B8A6', // Teal
       keywords: ['payment', 'invoice', 'bank', 'credit card'],
     },
     travel: {
       id: 'travel',
       name: 'Travel',
       color: '#6366F1', // Indigo
       keywords: ['flight', 'hotel', 'booking', 'reservation'],
     },
     newsletter: {
       id: 'newsletter',
       name: 'Newsletter',
       color: '#64748B', // Slate
       keywords: ['newsletter', 'digest', 'weekly', 'unsubscribe'],
     },
     updates: {
       id: 'updates',
       name: 'Updates',
       color: '#94A3B8', // Slate-400
       keywords: ['notification', 'alert', 'update'],
     },
     other: {
       id: 'other',
       name: 'Other',
       color: '#9CA3AF', // Gray
       keywords: [],
     },
   };
   ```

### Deliverables
- Email categorization service
- Updated email types with category field
- Category configuration constants

---

## Task 12.10: Email Category UI
**Agent**: Codex
**Duration**: 3-4 hours
**Priority**: P0

### Objective
Add email category badges and filtering UI to Today page inbox section.

### Implementation Steps

1. **Add Category Badges to Email Cards** (1-2h)
   ```typescript
   // apps/web/src/app/today/page.tsx
   import { EMAIL_CATEGORIES } from '@timeflow/shared';

   // In email card rendering:
   {email.category && (
     <span
       className="text-[10px] px-2 py-0.5 rounded-full font-medium"
       style={{
         backgroundColor: `${EMAIL_CATEGORIES[email.category].color}20`,
         color: EMAIL_CATEGORIES[email.category].color,
       }}
     >
       {EMAIL_CATEGORIES[email.category].name}
     </span>
   )}
   ```

2. **Add Category Filter Buttons** (1-2h)
   ```typescript
   // Add filter state
   const [selectedCategories, setSelectedCategories] = useState<EmailCategory[]>([]);

   // Filter emails by category
   const filteredEmails = useMemo(() => {
     if (selectedCategories.length === 0) return displayedEmails;
     return displayedEmails.filter(email =>
       email.category && selectedCategories.includes(email.category)
     );
   }, [displayedEmails, selectedCategories]);

   // Category filter UI
   <div className="flex items-center gap-2 overflow-x-auto pb-2">
     {Object.values(EMAIL_CATEGORIES).map(category => (
       <button
         key={category.id}
         onClick={() => {
           if (selectedCategories.includes(category.id)) {
             setSelectedCategories(prev => prev.filter(c => c !== category.id));
           } else {
             setSelectedCategories(prev => [...prev, category.id]);
           }
         }}
         className={`
           px-3 py-1.5 rounded-full text-xs font-medium transition-all
           ${selectedCategories.includes(category.id)
             ? 'text-white'
             : 'hover:bg-slate-100'
           }
         `}
         style={{
           backgroundColor: selectedCategories.includes(category.id)
             ? category.color
             : 'transparent',
           border: `1px solid ${category.color}40`,
         }}
       >
         {category.name}
       </button>
     ))}
   </div>
   ```

3. **Add Category Distribution Stats** (0.5-1h)
   ```typescript
   // Show count per category
   const categoryCounts = useMemo(() => {
     const counts: Record<EmailCategory, number> = {};
     emails.forEach(email => {
       if (email.category) {
         counts[email.category] = (counts[email.category] || 0) + 1;
       }
     });
     return counts;
   }, [emails]);
   ```

### Deliverables
- Category badges on email cards
- Category filter UI
- Category distribution display

---

## Task 12.11: Email Category Settings
**Agent**: Codex
**Duration**: 4-6 hours
**Priority**: P1

### Objective
Create email category management settings page for customizing categories, colors, and rules.

### Implementation Steps

1. **Create Settings Page** (2-3h)
   ```typescript
   // apps/web/src/app/settings/email-categories/page.tsx
   - List of all categories
   - Edit category name, color, keywords
   - Toggle auto-categorization
   - Manual categorization override
   ```

2. **Add User Category Preferences** (1-2h)
   ```typescript
   // Database schema update
   - Add emailCategoryPreferences to User model
   - Store custom category rules
   - Store disabled categories
   ```

3. **Implement Category Rules Editor** (1-2h)
   - UI for adding/removing keywords
   - Preview categorization on sample emails
   - Reset to defaults button

### Deliverables
- Email category settings page
- User preferences storage
- Category rules editor

---

## Task 12.C1: Command Palette Accessibility
**Agent**: Claude
**Duration**: 3-4 hours
**Priority**: P1

### Objective
Validate keyboard accessibility and discoverability for command palette.

### Testing Steps

1. **Keyboard Navigation** (1h)
   - Test all keyboard shortcuts
   - Verify focus management
   - Check screen reader compatibility

2. **Discoverability** (1h)
   - Add help command
   - Show keyboard shortcuts in UI
   - Add first-time user tutorial

3. **Edge Cases** (1-2h)
   - Test with different browsers
   - Test with accessibility tools
   - Document any issues

### Deliverables
- Accessibility audit report
- Fixes for critical issues

---

## Task 12.C2: Homepage Review
**Agent**: Claude
**Duration**: 3-4 hours
**Priority**: P1

### Objective
Review homepage copy, storytelling, and motion for differentiation.

### Review Checklist

1. **Copy Review** (1-2h)
   - Hero messaging is clear and compelling
   - Value props are specific and differentiated
   - CTAs are action-oriented
   - Tone matches brand voice

2. **Storytelling** (1h)
   - User journey is clear
   - Benefits > Features
   - Emotional resonance
   - Unique positioning vs competitors

3. **Motion Review** (1h)
   - Animations enhance understanding
   - Not distracting or overwhelming
   - Performant on all devices
   - Accessibility considerations

### Deliverables
- Homepage review document
- Recommended improvements

---

## Task 12.C3: Email Categorization Review
**Agent**: Claude
**Duration**: 3-4 hours
**Priority**: P1

### Objective
Review email categorization accuracy and tune classification rules.

### Review Process

1. **Sample Email Testing** (2h)
   - Test on 50-100 real emails
   - Measure accuracy by category
   - Identify misclassifications

2. **Rule Tuning** (1-2h)
   - Refine keyword lists
   - Add domain-based rules
   - Improve edge case handling

3. **Documentation** (0.5h)
   - Document classification logic
   - Add examples per category
   - Note known limitations

### Deliverables
- Categorization accuracy report
- Tuned classification rules
- Edge case documentation

---

## Success Metrics

### Homepage
- [ ] Page load time < 2s
- [ ] Mobile-responsive (320px - 1920px)
- [ ] All animations smooth (60fps)
- [ ] Accessibility score > 95

### Email Categorization
- [ ] Categorization accuracy > 85%
- [ ] All categories have distinct colors
- [ ] Filter UI works smoothly
- [ ] Performance impact < 100ms per email

---

## Implementation Order

### Phase 1: Research & Design (Days 1-2)
1. Task 12.5 - Competitor audit
2. Task 12.6 - Homepage design

### Phase 2: Core Implementation (Days 3-5)
1. Task 12.9 - Email categorization backend
2. Task 12.10 - Email category UI
3. Task 12.7 - Homepage implementation

### Phase 3: Polish & QA (Days 6-7)
1. Task 12.8 - Analytics
2. Task 12.11 - Category settings
3. Task 12.C1 - Accessibility review
4. Task 12.C2 - Homepage review
5. Task 12.C3 - Categorization review

---

## Dependencies

- Brand Guidelines (`docs/BRAND_GUIDELINES.md`)
- Current homepage design
- Gmail API access with categorization labels
- Framer Motion library
- Analytics platform (Vercel/PostHog)

---

## Risks & Mitigation

### Risk 1: Email categorization accuracy
- **Mitigation**: Start with rule-based, add ML later
- **Fallback**: Manual category override in settings

### Risk 2: Homepage animations performance
- **Mitigation**: Use CSS transforms, optimize images
- **Fallback**: Reduce motion for accessibility

### Risk 3: Competitor positioning
- **Mitigation**: Focus on unique differentiators (habits, AI, Gmail)
- **Fallback**: Emphasize execution quality over novelty

---

## Next Steps After Sprint 12

1. **Sprint 13**: AI System Overhaul
2. **Ongoing**: Monitor homepage conversion metrics
3. **Ongoing**: Collect user feedback on email categorization
4. **Future**: ML-based email categorization improvements
