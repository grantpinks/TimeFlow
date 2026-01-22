# Sprint 19: Pre-Launch QA Report

**Date**: January 20, 2026
**Sprint Goal**: Verify all website pages and core functionality before public beta launch
**QA Status**: Ready for Testing

---

## QA Overview

This document provides a comprehensive testing checklist for Sprint 19 website launch. All items must pass before declaring the website "fully live for beta."

---

## Test Environment

**Frontend**: https://timeflow.vercel.app (after deployment)
**Backend**: https://timeflow-wosj.onrender.com
**Database**: Supabase PostgreSQL (Session pooler, port 5432)

**Test Devices**:
- Desktop: Chrome, Firefox, Safari (macOS/Windows)
- Mobile: iPhone (Safari), Android (Chrome)
- Tablet: iPad (Safari)

---

## Section 1: Public Pages Testing

### 1.1 Homepage (/)

**URL**: https://timeflow.vercel.app

- [ ] **Hero Section**
  - [ ] Animated gradient background displays
  - [ ] Flow mascot avatar loads
  - [ ] H1 headline readable
  - [ ] Sub-headline text clear
  - [ ] "Get Started Free" CTA button functional
  - [ ] "See It In Action" CTA scrolls to demo section
  - [ ] Trust signals visible ("No credit card", "Free plan")

- [ ] **Problem Statement Section**
  - [ ] Section fades in on scroll
  - [ ] Before/After comparison visible
  - [ ] Stat counter animates (52%)

- [ ] **Features Grid**
  - [ ] 3 feature cards display correctly
  - [ ] Icons render (AI Chat, Email, Habits)
  - [ ] Hover effects work (card lift, shadow)
  - [ ] "Learn More" links functional

- [ ] **How It Works Section**
  - [ ] 3-step process visible
  - [ ] Screenshots/visuals render
  - [ ] Arrows animate between steps

- [ ] **AI Assistant Deep-Dive**
  - [ ] Section has gradient background
  - [ ] Chat demo mockup visible
  - [ ] Benefits list renders
  - [ ] "Try It Now" CTA functional

- [ ] **Email Intelligence Deep-Dive**
  - [ ] Email preview cards render
  - [ ] Category badges colored correctly
  - [ ] Hover effects on email cards

- [ ] **Habit Scheduling Deep-Dive**
  - [ ] HabitPlannerPreview component renders
  - [ ] Calendar visualization visible

- [ ] **Testimonials Section**
  - [ ] 4 testimonial cards display
  - [ ] Star rating visible
  - [ ] Cards fade in on scroll

- [ ] **Pricing Teaser**
  - [ ] Free, Pro, Teams tiers visible
  - [ ] Pricing cards have correct features
  - [ ] CTAs functional

- [ ] **Final CTA Section**
  - [ ] Gradient background matches hero
  - [ ] CTAs pulse/glow on hover

- [ ] **Footer**
  - [ ] 4 columns display (Product, Company, Support, Legal)
  - [ ] All links navigate correctly
  - [ ] Social icons visible (if added)
  - [ ] Copyright notice present

- [ ] **Mobile Responsive**
  - [ ] All sections stack vertically
  - [ ] Images scale correctly
  - [ ] Text readable (no overflow)
  - [ ] CTAs accessible (not too small)

### 1.2 About Us Page (/about)

**URL**: https://timeflow.vercel.app/about

- [ ] **Hero Section**
  - [ ] H1 headline visible: "We&apos;re Building the AI Assistant You Actually Want to Use"
  - [ ] Sub-headline readable
  - [ ] Layout centered

- [ ] **Mission Statement**
  - [ ] Background color (gray-50) applied
  - [ ] Mission text clear and readable

- [ ] **Values Section**
  - [ ] 3 value cards display (Privacy First, AI That Works, Transparent Pricing)
  - [ ] Grid layout (3 columns on desktop)
  - [ ] Icons/titles visible

- [ ] **Team Section**
  - [ ] Placeholder text displays
  - [ ] Background color applied

- [ ] **CTA Section**
  - [ ] "Join the Beta" CTA functional
  - [ ] Links to /pricing

- [ ] **Header Navigation**
  - [ ] Logo links to /
  - [ ] Links work (Home, Pricing, Features)

- [ ] **Footer**
  - [ ] Footer displays
  - [ ] Copyright notice present

- [ ] **Mobile Responsive**
  - [ ] Single column layout
  - [ ] Text readable
  - [ ] CTA accessible

### 1.3 Contact Page (/contact)

**URL**: https://timeflow.vercel.app/contact

- [ ] **Hero Section**
  - [ ] H1: "Get in Touch"
  - [ ] Sub-headline visible

- [ ] **Support Section**
  - [ ] Card has background color (gray-50)
  - [ ] "Visit Help Center" button links to /help
  - [ ] "Email Support" button is mailto link (support@timeflow.app)
  - [ ] mailto link opens email client

- [ ] **General Inquiries Section**
  - [ ] Card has background color
  - [ ] hello@timeflow.app mailto link functional

- [ ] **FAQ Preview**
  - [ ] 3 FAQ cards render
  - [ ] Questions and answers readable
  - [ ] "View all FAQs" links to /help

- [ ] **Header Navigation**
  - [ ] Logo links to /
  - [ ] Nav links functional

- [ ] **Mobile Responsive**
  - [ ] 2-column grid becomes single column
  - [ ] All content readable

### 1.4 Features Page (/features)

**URL**: https://timeflow.vercel.app/features

- [ ] **Hero Section**
  - [ ] H1: "All Features"
  - [ ] Sub-headline readable

- [ ] **AI Scheduling Section**
  - [ ] 4 feature cards display (2x2 grid)
  - [ ] Card backgrounds (gray-50)
  - [ ] Feature names and descriptions readable

- [ ] **Task Management Section**
  - [ ] 4 feature cards display
  - [ ] Content clear

- [ ] **Email Intelligence Section**
  - [ ] 4 feature cards display

- [ ] **Habit Scheduling Section**
  - [ ] 4 feature cards display

- [ ] **Calendar & Views Section**
  - [ ] 4 feature cards display

- [ ] **CTA Section**
  - [ ] Gradient background (teal-to-orange)
  - [ ] "Start Free Beta" CTA functional

- [ ] **Mobile Responsive**
  - [ ] 2-column grid becomes single column
  - [ ] All sections readable

### 1.5 Help Center Page (/help)

**URL**: https://timeflow.vercel.app/help

- [ ] **Hero Section**
  - [ ] H1: "Help Center"
  - [ ] Sub-headline visible

- [ ] **Getting Started Section**
  - [ ] 3 FAQ items render
  - [ ] Questions bold, answers readable
  - [ ] Card backgrounds (gray-50)

- [ ] **Using the AI Assistant Section**
  - [ ] 3 FAQ items render

- [ ] **Tasks & Scheduling Section**
  - [ ] 3 FAQ items render

- [ ] **Email Intelligence Section**
  - [ ] 2 FAQ items render

- [ ] **Habits & Routines Section**
  - [ ] 2 FAQ items render

- [ ] **Troubleshooting Section**
  - [ ] 3 FAQ items render

- [ ] **Contact Support CTA**
  - [ ] Teal background section
  - [ ] "Contact Support" button links to /contact

- [ ] **Mobile Responsive**
  - [ ] FAQ cards stack vertically
  - [ ] All content readable

### 1.6 Privacy Policy Page (/privacy)

**URL**: https://timeflow.vercel.app/privacy

- [ ] **Header**
  - [ ] H1: "Privacy Policy"
  - [ ] Last Updated date: January 20, 2026

- [ ] **Section 1: Introduction**
  - [ ] Content readable

- [ ] **Section 2: Information We Collect**
  - [ ] All subsections render (2.1-2.4)
  - [ ] Bullet lists formatted correctly

- [ ] **Section 3: How We Use Your Information**
  - [ ] Bullet list readable

- [ ] **Section 4: Data Security**
  - [ ] Security measures listed

- [ ] **Section 5: Data Sharing**
  - [ ] Content clear

- [ ] **Section 6: Your Rights**
  - [ ] Rights listed
  - [ ] privacy@timeflow.app mailto link functional

- [ ] **Section 7: Third-Party Services**
  - [ ] Google and OpenAI privacy policy links work (external)

- [ ] **Section 8: Data Retention**
  - [ ] Retention periods listed

- [ ] **Section 9: Children&apos;s Privacy**
  - [ ] Content readable

- [ ] **Section 10: Changes to Policy**
  - [ ] Content readable

- [ ] **Section 11: Contact**
  - [ ] privacy@timeflow.app mailto link functional

- [ ] **Footer**
  - [ ] Link to /terms functional

- [ ] **Mobile Responsive**
  - [ ] Long content scrollable
  - [ ] Text doesn&apos;t overflow

### 1.7 Terms of Service Page (/terms)

**URL**: https://timeflow.vercel.app/terms

- [ ] **Header**
  - [ ] H1: "Terms of Service"
  - [ ] Last Updated: January 20, 2026

- [ ] **Section 1: Acceptance of Terms**
  - [ ] Content readable

- [ ] **Section 2: Service Description**
  - [ ] Content readable

- [ ] **Section 3: Beta Terms**
  - [ ] Beta notice clear
  - [ ] Bullet list formatted

- [ ] **Section 4: User Accounts**
  - [ ] All subsections render (4.1-4.3)

- [ ] **Section 5: Acceptable Use**
  - [ ] Prohibited activities listed

- [ ] **Section 6: Data and Privacy**
  - [ ] Link to /privacy functional

- [ ] **Section 7: Intellectual Property**
  - [ ] Subsections render (7.1-7.2)

- [ ] **Section 8: Third-Party Integrations**
  - [ ] Content readable

- [ ] **Section 9: Disclaimers**
  - [ ] ALL CAPS disclaimer visible
  - [ ] Bullet list formatted

- [ ] **Section 10: Limitation of Liability**
  - [ ] Content readable

- [ ] **Section 11: Indemnification**
  - [ ] Content readable

- [ ] **Section 12: Changes to Terms**
  - [ ] Content readable

- [ ] **Section 13: Governing Law**
  - [ ] Content readable

- [ ] **Section 14: Contact**
  - [ ] legal@timeflow.app mailto link functional

- [ ] **Footer**
  - [ ] Link to /privacy functional

- [ ] **Mobile Responsive**
  - [ ] Content scrollable
  - [ ] No text overflow

### 1.8 Pricing Page (/pricing)

**URL**: https://timeflow.vercel.app/pricing

- [ ] **Header**
  - [ ] Logo links to /
  - [ ] "Home" and "Join Beta" CTAs functional

- [ ] **Hero Section**
  - [ ] H1: "Pricing"
  - [ ] Beta notice: "Beta is free. Paid subscriptions coming in Sprint 19"

- [ ] **Beta Card**
  - [ ] "$0 during beta" displayed
  - [ ] Features list (3 items)
  - [ ] "Join Beta Free" CTA functional

- [ ] **Subscriptions Card**
  - [ ] Gradient background
  - [ ] "What you can expect" box visible
  - [ ] "Contact us" CTA links to /contact

- [ ] **Mobile Responsive**
  - [ ] 2-column grid becomes single column
  - [ ] Cards stack vertically

---

## Section 2: User Flow Testing

### 2.1 Sign-Up Flow (OAuth)

**Test**: New user signs up via Google OAuth

**Steps**:
1. [ ] Navigate to homepage
2. [ ] Click "Get Started Free" CTA
3. [ ] Verify redirect to Google sign-in page
4. [ ] Enter Google credentials
5. [ ] Grant calendar permissions
6. [ ] Verify redirect back to frontend (/today page)
7. [ ] Verify user is authenticated (check for user data)
8. [ ] Check browser console for errors (should be none)

**Expected Result**:
- Smooth redirect flow with no errors
- User lands on /today page
- User data displays correctly (name, email, avatar)

**Failure Scenarios**:
- [ ] Test with invalid Google account
- [ ] Test with permissions denied
- [ ] Verify error page displays helpful message

### 2.2 Task Creation Flow

**Test**: User creates a new task

**Prerequisites**: User is signed in

**Steps**:
1. [ ] Navigate to /tasks page
2. [ ] Click "Create Task" button
3. [ ] Fill in task form:
   - Title: "Test Task for Sprint 19"
   - Description: "QA testing task creation"
   - Duration: 30 minutes
   - Priority: P1 (High)
   - Due Date: Tomorrow
4. [ ] Click "Save" or "Create Task"
5. [ ] Verify task appears in task list
6. [ ] Verify task status is "unscheduled"

**Expected Result**:
- Task created successfully
- Task appears in list with correct data
- No errors in console

### 2.3 Task Scheduling Flow (AI Assistant)

**Test**: User schedules tasks using AI assistant

**Prerequisites**: User has at least 1 unscheduled task

**Steps**:
1. [ ] Navigate to /assistant page
2. [ ] Type message: "Schedule my tasks for tomorrow"
3. [ ] Click send or press Enter
4. [ ] Wait for AI response (5-10 seconds)
5. [ ] Verify AI responds with schedule recommendations
6. [ ] If "Apply Schedule" action appears, click it
7. [ ] Navigate to /calendar page
8. [ ] Verify scheduled tasks appear on calendar
9. [ ] Verify tasks have correct time slots

**Expected Result**:
- AI responds with natural language
- Schedule recommendations make sense (no overlaps, within wake/sleep times)
- Tasks successfully scheduled to calendar

**Failure Scenarios**:
- [ ] Test with no tasks (AI should say "no tasks to schedule")
- [ ] Test with conflicting calendar events (AI should avoid conflicts)
- [ ] Test with invalid date ("schedule tasks for yesterday" - should error)

### 2.4 Google Calendar Sync Flow

**Test**: Scheduled tasks appear in Google Calendar

**Prerequisites**: User has scheduled at least 1 task

**Steps**:
1. [ ] Schedule a task in TimeFlow (from Test 2.3)
2. [ ] Open Google Calendar in new tab (https://calendar.google.com)
3. [ ] Navigate to the date of the scheduled task
4. [ ] Verify event appears with:
   - Task title (prefixed with `[TimeFlow]` if configured)
   - Correct start/end time
   - Duration matches task duration
5. [ ] Return to TimeFlow
6. [ ] Reschedule the task (drag to new time or use AI)
7. [ ] Refresh Google Calendar
8. [ ] Verify event moved to new time

**Expected Result**:
- Events sync immediately (or within 30 seconds)
- Event details match task data
- Updates propagate correctly

**Failure Scenarios**:
- [ ] Delete event in Google Calendar, verify task shows "unscheduled" in TimeFlow
- [ ] Create manual event in Google Calendar, verify TimeFlow avoids conflict

### 2.5 Sign-Out and Sign-In Flow

**Test**: User can sign out and sign back in

**Steps**:
1. [ ] Navigate to /settings page
2. [ ] Click "Sign Out" button
3. [ ] Verify redirect to homepage
4. [ ] Verify user is signed out (no user data visible)
5. [ ] Click "Sign In" link in header
6. [ ] Complete OAuth flow again
7. [ ] Verify user lands on /today page
8. [ ] Verify previously created tasks are still visible

**Expected Result**:
- Clean sign-out (no cached data)
- Seamless sign-in
- User data persists across sessions

---

## Section 3: Performance Testing

### 3.1 Lighthouse Audit

**Test**: Run Lighthouse on all pages

**Steps**:
1. [ ] Open Chrome DevTools → Lighthouse tab
2. [ ] Select "Desktop" mode
3. [ ] Check all categories (Performance, Accessibility, Best Practices, SEO)
4. [ ] Run audit on each page

**Target Scores** (Desktop):
- **Performance**: > 80
- **Accessibility**: > 90
- **Best Practices**: > 90
- **SEO**: > 90

**Pages to Test**:
- [ ] Homepage (/)
- [ ] About (/about)
- [ ] Contact (/contact)
- [ ] Features (/features)
- [ ] Help (/help)
- [ ] Privacy (/privacy)
- [ ] Terms (/terms)
- [ ] Pricing (/pricing)

**Record Results**:

| Page | Perf | A11y | BP | SEO |
|------|------|------|----|----|
| /    |      |      |    |    |
| /about |    |      |    |    |
| /contact | |      |    |    |
| /features | |     |    |    |
| /help |    |      |    |    |
| /privacy | |      |    |    |
| /terms |   |      |    |    |
| /pricing | |      |    |    |

### 3.2 Page Load Times

**Test**: Measure First Contentful Paint (FCP) and Time to Interactive (TTI)

**Target Metrics**:
- **FCP**: < 1.8s
- **TTI**: < 3.5s
- **Total Page Load**: < 5s

**Tools**:
- Chrome DevTools → Performance tab
- Lighthouse (includes Core Web Vitals)

**Pages to Test**:
- [ ] Homepage (heaviest page with animations)
- [ ] /calendar (complex UI with drag-and-drop)
- [ ] /assistant (chat interface with real-time updates)

### 3.3 Mobile Performance

**Test**: Lighthouse on mobile

**Steps**:
1. [ ] Open Chrome DevTools → Lighthouse
2. [ ] Select "Mobile" mode
3. [ ] Run audit

**Target Scores** (Mobile):
- **Performance**: > 70 (lower due to mobile constraints)
- **Accessibility**: > 90
- **Best Practices**: > 90
- **SEO**: > 90

---

## Section 4: Cross-Browser Testing

### 4.1 Desktop Browsers

**Browsers to Test**:
- [ ] Chrome (latest)
- [ ] Firefox (latest)
- [ ] Safari (macOS)
- [ ] Edge (latest)

**Test on Each Browser**:
- [ ] Homepage loads correctly
- [ ] OAuth flow works
- [ ] Task creation works
- [ ] Calendar view renders
- [ ] No console errors

### 4.2 Mobile Browsers

**Browsers to Test**:
- [ ] Safari (iOS)
- [ ] Chrome (Android)

**Test on Each Browser**:
- [ ] Homepage responsive
- [ ] Navigation menu works
- [ ] Forms usable (not too small)
- [ ] OAuth flow works

---

## Section 5: Security Testing

### 5.1 Authentication Security

- [ ] **Test Expired Tokens**:
  - Wait for token to expire (or manually expire in database)
  - Attempt to access protected route (/tasks, /calendar)
  - Verify redirect to sign-in

- [ ] **Test Invalid Tokens**:
  - Manually modify token in localStorage
  - Attempt to access protected route
  - Verify redirect to sign-in with error message

- [ ] **Test CSRF Protection**:
  - (If implemented) Verify CSRF tokens on forms
  - Attempt cross-origin request
  - Verify request blocked

### 5.2 Data Privacy

- [ ] **Verify Google Tokens Encrypted**:
  - Check database for `googleRefreshToken` field
  - Verify value is encrypted (not plaintext)

- [ ] **Verify No Sensitive Data in Console**:
  - Check browser console logs
  - Verify no tokens, passwords, or PII logged

- [ ] **Verify Secure Cookies** (if using cookies for auth):
  - Check cookie attributes (HttpOnly, Secure, SameSite)

### 5.3 API Security

- [ ] **Test Rate Limiting** (if implemented):
  - Make 100+ requests to /api/tasks in quick succession
  - Verify rate limit kicks in (429 status)

- [ ] **Test Input Validation**:
  - Send malformed task data (invalid duration, missing title)
  - Verify 400 error with clear message

---

## Section 6: Production Deployment Validation

### 6.1 Backend Health Check

```bash
curl https://timeflow-wosj.onrender.com/health
# Expected: {"status":"ok"}
```

- [ ] Returns 200 status
- [ ] Response time < 500ms

### 6.2 Frontend Health Check

```bash
curl -I https://timeflow.vercel.app
# Expected: 200 OK
```

- [ ] Returns 200 status
- [ ] Response headers include proper caching

### 6.3 Database Connection

- [ ] Backend successfully connects to Supabase
- [ ] Migrations applied
- [ ] Queries execute successfully
- [ ] No connection timeouts

---

## Section 7: Known Issues & Limitations

### Non-Blocking Issues (Can Launch With)

- [ ] **Warnings in build output**: React Hook dependency warnings (not errors)
- [ ] **Mobile menu**: Header mobile menu button exists but may need implementation
- [ ] **Social icons**: Footer social icons placeholders (not yet linked)
- [ ] **Team section**: About page team section is placeholder text
- [ ] **Analytics**: No analytics tracking yet (planned for Sprint 20)

### Blocking Issues (Must Fix Before Launch)

- [ ] **OAuth redirect failures**: Would prevent sign-up
- [ ] **Database connection failures**: Would break app functionality
- [ ] **CORS errors**: Would prevent API requests
- [ ] **Build failures**: Would prevent deployment

---

## QA Sign-Off

### Pre-Launch Checklist

- [ ] All public pages load without errors
- [ ] OAuth sign-up flow works end-to-end
- [ ] Task creation and scheduling functional
- [ ] Google Calendar sync works
- [ ] Mobile responsive on all pages
- [ ] Lighthouse scores meet targets (>80 Performance, >90 A11y/BP/SEO)
- [ ] No blocking security vulnerabilities
- [ ] No critical console errors
- [ ] Backend health endpoint returns 200
- [ ] Frontend deployed to Vercel successfully

### QA Status

**Overall Status**: ⏳ Pending Testing

**Tested By**: ___________________________

**Date**: ___________________________

**Sign-Off**: ___________________________

---

## Issues Found During QA

**Issue Tracking**: Use GitHub Issues or internal tracker

| # | Severity | Page/Feature | Description | Status |
|---|----------|--------------|-------------|--------|
| 1 | | | | |
| 2 | | | | |
| 3 | | | | |

**Severity Levels**:
- **P0 (Blocker)**: Prevents launch, must fix immediately
- **P1 (Critical)**: Major functionality broken, fix before launch
- **P2 (High)**: Important feature impaired, fix within 48h
- **P3 (Medium)**: Minor issue, can fix post-launch
- **P4 (Low)**: Cosmetic or enhancement, backlog

---

**Last Updated**: January 20, 2026
**Version**: 1.0
**Next Review**: After production deployment
