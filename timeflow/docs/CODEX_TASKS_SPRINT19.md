# Sprint 19 Website Launch - Codex Tasks

**Date**: January 20, 2026
**Context:** We need public-facing marketing and legal pages for beta launch.
**Plan:** See `docs/plans/2026-01-20-sprint-19-website-launch.md` for full specs.
**Status:** Backend deployment blockers resolved. Frontend pages ready to implement.

---

## Your Tasks (7 Pages to Build)

All code is already written in the plan. Your job is to:
1. Copy the code from the plan
2. Create the file
3. Test locally with `pnpm dev:web`
4. Commit with the provided message

---

## Task 19.W1: About Us Page ⭐

**Files to create:**
- `timeflow/apps/web/src/app/about/page.tsx`

**Implementation:**
See plan lines 73-228. Copy the full About Us page code which includes:
- Hero section with mission statement
- Values section (Privacy First, AI That Works, Transparent Pricing)
- Team section (placeholder)
- CTA section with beta signup link
- SEO metadata

**Testing:**
```bash
pnpm dev:web
# Navigate to http://localhost:3000/about
# Verify: responsive layout, images render, links work
```

**Commit:**
```bash
git add timeflow/apps/web/src/app/about/
git commit -m "feat(website): add About Us page for public launch

- Mission statement and values section
- Team placeholder section
- CTA to beta signup
- SEO metadata

Sprint 19 Website Launch - Task 19.W1"
```

---

## Task 19.W2: Contact Page ⭐

**Files to create:**
- `timeflow/apps/web/src/app/contact/page.tsx`

**Implementation:**
See plan lines 236-338. Copy the full Contact page code which includes:
- Header with navigation
- Support section (Help Center link, Email Support button)
- General Inquiries section (hello@timeflow.app)
- FAQ preview section (3 common questions)
- SEO metadata

**Testing:**
```bash
# Navigate to http://localhost:3000/contact
# Verify: mailto links work, responsive layout
```

**Commit:**
```bash
git add timeflow/apps/web/src/app/contact/
git commit -m "feat(website): add Contact page with support and general inquiry options

Sprint 19 Website Launch - Task 19.W2"
```

---

## Task 19.W3: Features Page ⭐

**Files to create:**
- `timeflow/apps/web/src/app/features/page.tsx`

**Implementation:**
See plan lines 346-512. Copy the full Features page code which includes:
- AI Scheduling features (4 items)
- Task Management features (4 items)
- Email Intelligence features (4 items)
- Habit Scheduling features (4 items)
- Calendar & Views features (4 items)
- CTA section with beta signup
- SEO metadata

**Testing:**
```bash
# Navigate to http://localhost:3000/features
# Verify: all feature sections render, responsive grid layout
```

**Commit:**
```bash
git add timeflow/apps/web/src/app/features/
git commit -m "feat(website): add comprehensive Features page

- AI Scheduling features section
- Task Management features
- Email Intelligence features
- Habit Scheduling features
- Calendar & Views features

Sprint 19 Website Launch - Task 19.W3"
```

---

## Task 19.W4: Help Center Page ⭐

**Files to create:**
- `timeflow/apps/web/src/app/help/page.tsx`

**Implementation:**
See plan lines 520-720. Copy the full Help page code which includes:
- Getting Started FAQs (3 items)
- Using the AI Assistant FAQs (3 items)
- Tasks & Scheduling FAQs (3 items)
- Email Intelligence FAQs (2 items)
- Habits & Routines FAQs (2 items)
- Troubleshooting FAQs (3 items)
- Contact Support CTA
- SEO metadata

**Testing:**
```bash
# Navigate to http://localhost:3000/help
# Verify: FAQ sections render, scrollable layout
```

**Commit:**
```bash
git add timeflow/apps/web/src/app/help/
git commit -m "feat(website): add Help Center with comprehensive FAQs

- Getting Started section
- AI Assistant usage guide
- Tasks & Scheduling help
- Email Intelligence FAQs
- Habits & Routines guide
- Troubleshooting section

Sprint 19 Website Launch - Task 19.W4"
```

---

## Task 19.W5: Privacy Policy Page ⚖️ CRITICAL

**Files to create:**
- `timeflow/apps/web/src/app/privacy/page.tsx`

**Implementation:**
See plan lines 732-960. Copy the full Privacy Policy code which includes:
- Introduction
- Information We Collect (Account, Calendar, Email, Usage)
- How We Use Your Information
- Data Security (encryption, HTTPS, access control)
- Data Sharing (we don't sell data)
- Your Rights (access, delete, correct, revoke, export)
- Third-Party Services (Google, OpenAI)
- Data Retention (30 days after deletion)
- Children's Privacy
- Changes to Policy
- Contact information
- SEO metadata

**Testing:**
```bash
# Navigate to http://localhost:3000/privacy
# Verify: full policy displays, links work
```

**Commit:**
```bash
git add timeflow/apps/web/src/app/privacy/
git commit -m "feat(website): add comprehensive Privacy Policy

Sprint 19 Website Launch - Task 19.W5"
```

---

## Task 19.W6: Terms of Service Page ⚖️ CRITICAL

**Files to create:**
- `timeflow/apps/web/src/app/terms/page.tsx`

**Implementation:**
See plan lines 968-1193. Copy the full Terms of Service code which includes:
- Acceptance of Terms
- Service Description
- Beta Terms (free during beta)
- User Accounts (eligibility, termination)
- Acceptable Use (prohibited activities)
- Data and Privacy (links to Privacy Policy)
- Intellectual Property (TimeFlow property, your content)
- Third-Party Integrations (Google)
- Disclaimers (AS IS, no warranties)
- Limitation of Liability
- Indemnification
- Changes to Terms
- Governing Law (TBD)
- Contact information
- SEO metadata

**Testing:**
```bash
# Navigate to http://localhost:3000/terms
# Verify: full terms display, links work
```

**Commit:**
```bash
git add timeflow/apps/web/src/app/terms/
git commit -m "feat(website): add comprehensive Terms of Service

Sprint 19 Website Launch - Task 19.W6"
```

---

## Task 19.W7: Update Homepage Footer 🔗

**Files to modify:**
- `timeflow/apps/web/src/components/homepage/HomepageFooter.tsx`

**Implementation:**
See plan lines 1201-1244. Update the existing footer component to include a 4-column grid with:

**Column 1: Product**
- Features
- Pricing
- Sign Up

**Column 2: Company**
- About Us
- Contact

**Column 3: Support**
- Help Center
- Email Support (mailto link)

**Column 4: Legal**
- Privacy Policy
- Terms of Service

**Code snippet to add:**
```typescript
<footer className="bg-slate-900 text-white py-12">
  <div className="max-w-7xl mx-auto px-6">
    <div className="grid md:grid-cols-4 gap-8">
      {/* Product */}
      <div>
        <h3 className="font-semibold mb-4">Product</h3>
        <ul className="space-y-2 text-gray-400">
          <li><Link href="/features" className="hover:text-white">Features</Link></li>
          <li><Link href="/pricing" className="hover:text-white">Pricing</Link></li>
          <li><a href={getGoogleAuthUrl()} className="hover:text-white">Sign Up</a></li>
        </ul>
      </div>

      {/* Company */}
      <div>
        <h3 className="font-semibold mb-4">Company</h3>
        <ul className="space-y-2 text-gray-400">
          <li><Link href="/about" className="hover:text-white">About Us</Link></li>
          <li><Link href="/contact" className="hover:text-white">Contact</Link></li>
        </ul>
      </div>

      {/* Support */}
      <div>
        <h3 className="font-semibold mb-4">Support</h3>
        <ul className="space-y-2 text-gray-400">
          <li><Link href="/help" className="hover:text-white">Help Center</Link></li>
          <li><a href="mailto:support@timeflow.app" className="hover:text-white">Email Support</a></li>
        </ul>
      </div>

      {/* Legal */}
      <div>
        <h3 className="font-semibold mb-4">Legal</h3>
        <ul className="space-y-2 text-gray-400">
          <li><Link href="/privacy" className="hover:text-white">Privacy Policy</Link></li>
          <li><Link href="/terms" className="hover:text-white">Terms of Service</Link></li>
        </ul>
      </div>
    </div>

    <div className="border-t border-gray-700 mt-8 pt-8 text-center text-gray-400 text-sm">
      © 2025 TimeFlow. All rights reserved.
    </div>
  </div>
</footer>
```

**Testing:**
```bash
# Navigate to homepage (http://localhost:3000)
# Scroll to footer
# Click each footer link - verify all navigate correctly
```

**Commit:**
```bash
git add timeflow/apps/web/src/components/homepage/HomepageFooter.tsx
git commit -m "feat(website): update footer with all marketing and legal page links

Sprint 19 Website Launch - Task 19.W7"
```

---

## Order of Execution (Recommended)

Execute in this order for best workflow:

**Phase 1: Legal Pages (Required for Launch)**
1. Task 19.W5 (Privacy Policy) ⚖️
2. Task 19.W6 (Terms of Service) ⚖️

**Phase 2: Company Pages**
3. Task 19.W1 (About Us)
4. Task 19.W2 (Contact)

**Phase 3: Product Pages**
5. Task 19.W3 (Features)
6. Task 19.W4 (Help Center)

**Phase 4: Navigation**
7. Task 19.W7 (Update Footer) - Ties everything together

---

## Notes & Tips

### Common Issues

1. **Image not found**: Make sure `/branding/main_logo.png` exists in `timeflow/apps/web/public/`

2. **Import errors**: Verify these imports work:
   ```typescript
   import Link from 'next/link';
   import Image from 'next/image';
   import { getGoogleAuthUrl } from '@/lib/api';
   import { track } from '@/lib/analytics';
   ```

3. **Build errors**: Run `pnpm --filter web type-check` to catch TypeScript errors before committing

### Testing Checklist

For each page, verify:
- [ ] Page loads without errors
- [ ] All internal links navigate correctly
- [ ] All external links (mailto:, etc.) work
- [ ] Responsive layout on mobile (Chrome DevTools → Toggle device toolbar)
- [ ] Images render correctly
- [ ] Typography is readable
- [ ] CTA buttons have hover states

### Mobile Testing

Use Chrome DevTools device toolbar to test:
- iPhone SE (375px)
- iPhone 14 Pro (393px)
- iPad (768px)
- Desktop (1280px)

---

## When Complete

After finishing all 7 tasks, notify the main session with:

```
✅ Sprint 19 Website Pages Complete

Completed:
- Task 19.W1: About Us page
- Task 19.W2: Contact page
- Task 19.W3: Features page
- Task 19.W4: Help Center
- Task 19.W5: Privacy Policy
- Task 19.W6: Terms of Service
- Task 19.W7: Homepage footer updated

All pages tested locally and committed.

Next: Deploy to production (Tasks 19.D2 and 19.Q1)
```

---

## Reference

**Full Implementation Plan**: `timeflow/docs/plans/2026-01-20-sprint-19-website-launch.md`

**Backend Status**: ✅ Deployment blockers resolved (Task 19.D1 complete)

**Remaining Critical Path** (handled by Claude via subagents):
- Task 19.D2: Deploy frontend to Vercel
- Task 19.Q1: Pre-launch QA testing
