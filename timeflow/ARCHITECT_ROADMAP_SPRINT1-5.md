# TimeFlow Sprint Roadmap (Sprints 1-5)

**Project**: TimeFlow
**Duration**: 10 weeks (2 weeks per sprint)
**Goal**: Production-ready MVP with Google Calendar integration

---

## Sprint 1: Foundation & Core Backend
**Duration**: Week 1-2
**Focus**: Monorepo setup, backend scaffold, basic API

### Goals
- [ ] Fully functional development environment
- [ ] Database schema migrated and working
- [ ] Core task CRUD endpoints operational
- [ ] Google OAuth flow working

### Tasks

| ID | Task | Agent | Hours | Priority |
|----|------|-------|-------|----------|
| 1.1 | Verify monorepo setup, install deps | Codex | 2-3h | P0 |
| 1.2 | Run Prisma migrations, seed test data | Codex | 2-3h | P0 |
| 1.3 | Test task CRUD endpoints manually | Codex | 3-4h | P0 |
| 1.4 | Configure Google Cloud Console, get OAuth credentials | Codex | 2-3h | P0 |
| 1.5 | Test full OAuth flow end-to-end | Codex | 3-4h | P0 |
| 1.G1 | Document local setup in README | Gemini | 2-3h | P1 |
| 1.G2 | Document Google OAuth setup steps | Gemini | 2-3h | P1 |

### Decision Gate
- [ ] Can create tasks via API?
- [ ] Can authenticate with Google?
- [ ] Can read Google Calendar events?

---

## Sprint 2: Scheduling Engine & Calendar Integration
**Duration**: Week 3-4
**Focus**: Core scheduling algorithm, Google Calendar sync

### Goals
- [ ] Scheduling engine fully tested
- [ ] Tasks can be scheduled into Google Calendar
- [ ] Calendar events visible in API response

### Tasks

| ID | Task | Agent | Hours | Priority |
|----|------|-------|-------|----------|
| 2.1 | Run scheduling tests, fix any failures | Codex | 3-4h | P0 |
| 2.2 | Wire scheduling package into scheduleService | Codex | 4-6h | P0 |
| 2.3 | Test scheduling with real Google Calendar | Codex | 4-6h | P0 |
| 2.4 | Add edge case tests (overlapping events, full days) | Codex | 4-6h | P1 |
| 2.5 | Implement manual reschedule endpoint | Codex | 3-4h | P1 |
| 2.G1 | Document scheduling algorithm in README | Gemini | 3-4h | P1 |
| 2.G2 | Create troubleshooting guide for calendar issues | Gemini | 2-3h | P2 |

### Decision Gate
- [ ] Does scheduling respect wake/sleep times?
- [ ] Does scheduling avoid event conflicts?
- [ ] Do scheduled tasks appear in Google Calendar?

---

## Sprint 3: Web Frontend Core + AI Assistant
**Duration**: Week 5-6
**Focus**: Task list, calendar views, and AI scheduling assistant

### Goals
- [ ] Users can manage tasks in browser
- [ ] Users can view calendar with scheduled tasks
- [ ] "Smart Schedule" button works end-to-end
- [ ] AI Assistant chatbot provides scheduling recommendations
- [ ] Basic Today page (`/today`) shows today's tasks and events

### Tasks

| ID | Task | Agent | Hours | Priority |
|----|------|-------|-------|----------|
| 3.1 | Install web deps, verify dev server starts | Codex | 1-2h | P0 |
| 3.2 | Connect auth flow (Google sign-in) | Codex | 4-6h | P0 |
| 3.3 | Implement task creation form | Codex | 3-4h | P0 |
| 3.4 | Implement task list with filters | Codex | 4-6h | P0 |
| 3.5 | Integrate react-big-calendar with events | Codex | 6-8h | P0 |
| 3.6 | Wire "Smart Schedule" button to backend | Codex | 3-4h | P0 |
| 3.7 | Implement settings page | Codex | 3-4h | P1 |
| 3.8 | **Build AI Assistant page with chat UI** | Codex | 6-8h | P0 |
| 3.9 | **Create chat message components (bubbles, typing indicator)** | Codex | 3-4h | P0 |
| 3.10 | **Add floating AI assistant icon/button** | Codex | 2-3h | P1 |
| 3.11 | **Backend: POST /api/assistant/chat endpoint** | Codex | 4-6h | P0 |
| 3.12 | **Backend: Analyze tasks + calendar + generate recommendations** | Codex | 6-8h | P0 |
| 3.13 | Implement basic `/today` dashboard (Today view v1, no drag-and-drop) | Codex | 4-6h | P1 |
| 3.C1 | **Integrate AI Assistant frontend + backend end-to-end** | Claude | 4-6h | P0 |
| 3.C2 | **Implement intelligent prompt engineering for schedule analysis** | Claude | 6-8h | P0 |
| 3.C3 | **Build "Apply Schedule" flow with conflict resolution** | Claude | 4-6h | P0 |
| 3.C4 | **Add conversation context & memory for multi-turn chat** | Claude | 3-4h | P1 |
| 3.C5 | **Final QA: test all AI Assistant user flows** | Claude | 3-4h | P0 |
| 3.C6 | Draft UX spec for Phase 2 premium interactions (DnD, transitions, micro-interactions) | Claude | 3-4h | P2 |
| 3.G1 | Add loading states and error messages | Gemini | 3-4h | P1 |
| 3.G2 | Document web app usage in README | Gemini | 2-3h | P1 |
| 3.G3 | **Document AI Assistant feature and prompts** | Gemini | 2-3h | P1 |

### AI Assistant Feature Spec

**Purpose**: Conversational interface to help users plan their day before committing to a schedule.

**User Flow**:
1. User navigates to `/assistant` (second main page after Tasks)
2. Sees modern chat UI with TimeFlow AI avatar/icon
3. Can ask questions like:
   - "What does my Tuesday look like?"
   - "Can I fit a 2-hour study session tomorrow?"
   - "Schedule my high priority tasks for this week"
   - "Move my workout to the afternoon"
4. Assistant analyzes:
   - User's unscheduled tasks (priorities, durations, due dates)
   - User's Google Calendar events for the requested day(s)
   - User's wake/sleep preferences
5. Assistant responds with:
   - Visual time slot recommendations
   - Conflict warnings
   - "Apply this schedule" button to commit suggestions

**UI Components**:
- Chat message list (user bubbles right, AI bubbles left)
- AI avatar icon (modern, friendly)
- Typing indicator animation
- Quick action chips ("Show today", "Schedule all", "What's free?")
- Inline schedule preview cards
- Floating assistant button on other pages

### Decision Gate
- [ ] Can complete full flow: sign in → create task → schedule → see in calendar?
- [ ] Is UI usable and intuitive?
- [ ] Can user chat with AI and receive scheduling recommendations?
- [ ] Can user apply AI suggestions to their calendar?

---

## Sprint 4: Mobile App & Polish
**Duration**: Week 7-8
**Focus**: Mobile app screens, UI refinement, theming foundation

### Goals
- [ ] Mobile app shows today's agenda
- [ ] Mobile app shows all tasks with filters
- [ ] UI polished across web and mobile
- [ ] Web layout and theming prepared for Phase 2 polish (design tokens, light/dark ready)

### Tasks

| ID | Task | Agent | Hours | Priority |
|----|------|-------|-------|----------|
| 4.1 | Install mobile deps, verify Expo starts | Codex | 1-2h | P0 |
| 4.2 | Implement mobile Google auth with expo-auth-session | Codex | 6-8h | P0 |
| 4.3 | Connect Today screen to backend API | Codex | 3-4h | P0 |
| 4.4 | Connect Task List screen to backend API | Codex | 3-4h | P0 |
| 4.5 | Add pull-to-refresh and loading states | Codex | 2-3h | P1 |
| 4.6 | Add task creation form to mobile | Codex | 4-6h | P1 |
| 4.7 | Polish web calendar styling | Codex | 3-4h | P2 |
| 4.8 | Introduce shared design tokens and theme system (CSS variables) | Codex | 4-6h | P1 |
| 4.G1 | Document mobile app setup in README | Gemini | 2-3h | P1 |
| 4.G2 | Create user onboarding guide | Gemini | 3-4h | P2 |
| 4.G3 | Document design system and theming guidelines | Gemini | 3-4h | P2 |

### Decision Gate
- [ ] Does mobile app work on iOS and Android?
- [ ] Is the experience smooth and responsive?

---

## Sprint 5: Testing, Security & Launch Prep
**Duration**: Week 9-10
**Focus**: Production readiness, security hardening, testing

### Goals
- [ ] All critical paths tested
- [ ] Security vulnerabilities addressed
- [ ] Ready for beta users

### Tasks

| ID | Task | Agent | Hours | Priority |
|----|------|-------|-------|----------|
| 5.1 | Replace dev token with proper JWT | Codex | 6-8h | P0 |
| 5.2 | Encrypt Google refresh tokens at rest | Codex | 4-6h | P0 |
| 5.3 | Add request validation schemas | Codex | 4-6h | P0 |
| 5.4 | Add rate limiting to API | Codex | 3-4h | P1 |
| 5.5 | Write backend integration tests | Codex | 6-8h | P1 |
| 5.6 | Write web E2E tests (Playwright) | Codex | 6-8h | P1 |
| 5.7 | Set up CI/CD with GitHub Actions | Codex | 4-6h | P1 |
| 5.8 | Deploy to staging environment | Codex | 4-6h | P1 |
| 5.C1 | **Final integration: verify all features work together** | Claude | 4-6h | P0 |
| 5.C2 | **Fix any cross-feature bugs or edge cases** | Claude | 4-6h | P0 |
| 5.C3 | **Optimize AI Assistant response quality** | Claude | 3-4h | P1 |
| 5.C4 | **Pre-launch checklist review and sign-off** | Claude | 2-3h | P0 |
| 5.G1 | Create deployment documentation | Gemini | 3-4h | P1 |
| 5.G2 | Create user FAQ and help docs | Gemini | 4-6h | P2 |
| 5.R1 | Security audit (ruthless-reviewer) | Reviewer | 6-8h | P0 |

### Decision Gate
- [ ] Do all tests pass?
- [ ] Is security audit passed?
- [ ] Is staging environment stable?

---

## Success Metrics

| Metric | Target | Sprint |
|--------|--------|--------|
| Task CRUD working | ✅ | Sprint 1 |
| Google OAuth working | ✅ | Sprint 1 |
| Scheduling algorithm tested | ✅ | Sprint 2 |
| Tasks appear in Google Calendar | ✅ | Sprint 2 |
| Web app functional | ✅ | Sprint 3 |
| **AI Assistant chat working** | ✅ | Sprint 3 |
| **AI can recommend time slots** | ✅ | Sprint 3 |
| Mobile app functional | ✅ | Sprint 4 |
| Security audit passed | ✅ | Sprint 5 |
| Ready for beta | ✅ | Sprint 5 |

---

## Risk Register

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|------------|
| Google API quota limits | Medium | High | Request quota increase early |
| OAuth complexity on mobile | High | Medium | Fallback to webview if needed |
| Timezone edge cases | Medium | High | Extensive testing with different zones |
| Calendar conflicts | Medium | Medium | Clear error messages, manual override |

---

## Phase 2 Preview (Sprints 6-10)

- **Task categories with color coding** (Professional, Schoolwork, Personal, Misc – visible in task lists, calendar, and AI Assistant)
- Habit scheduling engine (Reclaim-style habits that auto-schedule with flexible windows, Habit model + Habit Manager UI, integrated into scheduler)
- Daily planning ritual view v2 (Sunsama-style `/today` flow with 3-column layout: Inbox, Today timeline, Context/AI)
- Command palette for power users (Cmd/Ctrl+K navigation + quick actions for create task, navigate, run Assistant)
- Animated page transitions and modal/side-panel animations using Framer Motion
- Satisfying task-complete micro-interactions (checkbox animation, subtle celebratory visuals)
- Drag-and-drop with ghost elements and smart guides for calendar/task interactions
- Visual polish pass: gradients, glow accents, cohesive typography/spacing and component library
- Seamless light/dark mode built on the shared design token system and `next-themes`
- Apple Calendar integration
- Recurring tasks
- Task templates
- Notifications and reminders
- Improved mobile UI
- Analytics dashboard
- **AI Assistant enhancements**: voice input, proactive suggestions, learning from user patterns
- **Mobile AI Assistant**: bring chatbot to Expo app

---

## Phase 2 Detailed Plan (Sprints 6-10) – Draft

> Note: Phase 2 scope is intentionally flexible. Exact sprint boundaries can be adjusted based on MVP feedback.

### Sprint 6: Today Ritual v2, Task Categories & Habit Foundations
**Duration**: Week 11-12  
**Focus**: `/today` 3-column layout, task categories with color coding, simple habits model.

#### Goals
- [ ] `/today` page uses 3-column layout (Inbox, Today timeline, Context/AI).
- [ ] Tasks have color-coded categories (Professional, Schoolwork, Personal, Misc).
- [ ] Users can define basic habits with simple constraints.
- [ ] Scheduler can consider habits conceptually (no full auto-placement yet).

#### Task Categories Feature

**Default Categories** (user-customizable colors):
| Category | Default Color | Use Case |
|----------|---------------|----------|
| Professional | Blue (#3B82F6) | Work meetings, deadlines, projects |
| Schoolwork | Purple (#8B5CF6) | Homework, exams, study sessions |
| Personal | Green (#10B981) | Errands, health, hobbies |
| Misc | Gray (#6B7280) | Uncategorized tasks |

**Customization**:
- Users can change the color of any category via Settings or inline color picker.
- Users can rename default categories to fit their workflow.
- Users can create additional custom categories with any name/color.
- Color palette: predefined swatches + optional hex input for advanced users.

#### Tasks

| ID | Task | Agent | Hours | Priority |
|----|------|-------|-------|----------|
| 6.1 | Implement `/today` 3-column layout with responsive design | Codex | 6-8h | P0 |
| 6.2 | Add basic daily planning ritual flow (banner + stepper) | Codex | 4-6h | P0 |
| 6.3 | Add `Category` model to `schema.prisma` (id, name, color, userId) | Codex | 2-3h | P0 |
| 6.4 | Add `categoryId` field to Task model, seed default categories | Codex | 2-3h | P0 |
| 6.5 | Create Category service/controller/routes (CRUD + defaults) | Codex | 3-4h | P0 |
| 6.6 | Update TaskList UI to show category color badges/pills | Codex | 3-4h | P0 |
| 6.7 | Add category selector to task creation/edit forms | Codex | 2-3h | P0 |
| 6.8 | Build category customization UI (rename, change color, create new) | Codex | 4-6h | P0 |
| 6.9 | Add color picker component (preset swatches + hex input) | Codex | 2-3h | P1 |
| 6.10 | Update CalendarView to color-code events by category | Codex | 3-4h | P1 |
| 6.11 | Add Habit model to `schema.prisma` and run migration | Codex | 3-4h | P1 |
| 6.12 | Create Habit service/controller/routes (CRUD API) | Codex | 4-6h | P1 |
| 6.13 | Build `HabitManager` UI on `/habits` page (list + create/edit) | Codex | 4-6h | P1 |
| 6.C1 | Define how habits should influence scheduler in Phase 2+ (rules, edge cases) | Claude | 3-4h | P1 |
| 6.C2 | Integrate category colors into AI Assistant responses ("your Professional tasks...") | Claude | 2-3h | P2 |
| 6.G1 | Document `/today` ritual, categories (incl. customization), and habits | Gemini | 3-4h | P1 |

---

### Sprint 7: Habit Scheduling Engine & Recurring/Advanced Logic
**Duration**: Week 13-14  
**Focus**: Integrate habits into scheduling engine, introduce recurring logic.

#### Goals
- [ ] Habits can be automatically proposed as time blocks for a given week.
- [ ] Scheduler respects habit frequency and time-of-day preferences.
- [ ] Users can see and accept/reject proposed habit placements.

#### Tasks

| ID | Task | Agent | Hours | Priority |
|----|------|-------|-------|----------|
| 7.1 | Extend scheduling types to include Habit and recurring metadata | Codex | 3-4h | P0 |
| 7.2 | Update `scheduleTasks` to generate suggested habit blocks (no auto-commit) | Codex | 6-8h | P0 |
| 7.3 | Add API endpoint to fetch habit schedule suggestions | Codex | 4-6h | P0 |
| 7.4 | Add UI on `/today` and `/assistant` to review/accept habit suggestions | Codex | 4-6h | P1 |
| 7.C1 | Tune scheduling heuristics for habits (overlap rules, flexibility, user prefs) | Claude | 6-8h | P0 |
| 7.C2 | Collaborate with Assistant prompts to explain habit suggestions clearly | Claude | 3-4h | P1 |
| 7.G1 | Update docs with examples of habit setups and outcomes | Gemini | 3-4h | P2 |

---

### Sprint 8: Premium Interactions – Transitions, DnD & Micro-Interactions
**Duration**: Week 15-16  
**Focus**: Framer Motion integration, drag-and-drop polish, task-complete interactions.

#### Goals
- [ ] Core pages use smooth, consistent page and modal transitions.
- [ ] Drag-and-drop for tasks → calendar uses ghost previews and smart guides.
- [ ] Completing a task feels satisfying via micro-interactions.

#### Tasks

| ID | Task | Agent | Hours | Priority |
|----|------|-------|-------|----------|
| 8.1 | Integrate Framer Motion into shared layout for page transitions | Codex | 4-6h | P0 |
| 8.2 | Add AnimatePresence-based modal/side-panel animations | Codex | 4-6h | P0 |
| 8.3 | Implement DnD for tasks onto calendar using `dnd-kit` | Codex | 6-8h | P0 |
| 8.4 | Add ghost previews + snap-to-slot guides during DnD | Codex | 4-6h | P1 |
| 8.5 | Implement task-complete micro-interaction (checkbox + subtle celebration) | Codex | 4-6h | P1 |
| 8.C1 | Ensure interactions remain performant and accessible (prefers-reduced-motion, etc.) | Claude | 3-4h | P1 |
| 8.G1 | Update UX guidelines with interaction patterns and motion rules | Gemini | 3-4h | P2 |

---

### Sprint 9: Command Palette, Light/Dark Mode & Visual System
**Duration**: Week 17-18  
**Focus**: Power-user navigation, full theming, visual cohesion.

#### Goals
- [ ] Command palette enables fast navigation and key actions via keyboard.
- [ ] Seamless light/dark mode built on design tokens and `next-themes`.
- [ ] Visual system (colors, typography, spacing) is consistent across app.

#### Tasks

| ID | Task | Agent | Hours | Priority |
|----|------|-------|-------|----------|
| 9.1 | Add command palette library (e.g., `cmdk`) and base component | Codex | 4-6h | P1 |
| 9.2 | Wire high-value commands (create task, go to `/today`, open Assistant) | Codex | 3-4h | P1 |
| 9.3 | Implement light/dark mode with `next-themes` using existing tokens | Codex | 4-6h | P0 |
| 9.4 | Apply consistent typography/spacing across core pages | Codex | 4-6h | P1 |
| 9.C1 | Validate keyboard accessibility and discoverability for command palette | Claude | 3-4h | P1 |
| 9.G1 | Document theme usage and command palette shortcuts | Gemini | 3-4h | P2 |

---

### Sprint 10: Integrations, Analytics & AI Enhancements
**Duration**: Week 19-20  
**Focus**: Apple Calendar, analytics, notifications, smarter Assistant.

#### Goals
- [ ] Apple Calendar integration available for users who opt in.
- [ ] Basic analytics for user behavior and feature usage.
- [ ] Notification system for key events (upcoming tasks, missed habits).
- [ ] AI Assistant provides proactive suggestions based on patterns.

#### Tasks

| ID | Task | Agent | Hours | Priority |
|----|------|-------|-------|----------|
| 10.1 | Implement Apple Calendar integration (OAuth + sync) | Codex | 8-12h | P0 |
| 10.2 | Add recurring tasks and templates support in backend + UI | Codex | 8-12h | P0 |
| 10.3 | Implement basic analytics events (page views, key actions, assistant usage) | Codex | 4-6h | P1 |
| 10.4 | Add notifications/reminders pipeline (cron/queue or external service) | Codex | 6-8h | P1 |
| 10.C1 | Enhance AI Assistant prompts for proactive suggestions and habit coaching | Claude | 6-8h | P1 |
| 10.C2 | Review cross-integration edge cases (Google + Apple calendars, recurring items) | Claude | 4-6h | P1 |
| 10.G1 | Document multi-calendar behavior, analytics, and notification settings | Gemini | 4-6h | P2 |

---

**Last Updated**: 2025-12-03

