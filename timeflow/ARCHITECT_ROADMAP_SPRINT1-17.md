# TimeFlow Sprint Roadmap (Sprints 1-21)

**Project**: TimeFlow
**Duration**: 32 weeks (2 weeks per sprint)
**Goal**: Production-ready consumer app with advanced scheduling features.  
**Issue Tracking**: See `KNOWN_ISSUES.md` for active bugs, UX gaps, and their mapped sprints/tasks.

---

## Sprint 1: Foundation & Core Backend ✅ COMPLETE
**Duration**: Week 1-2
**Status**: ✅ All tasks complete
**Focus**: Monorepo setup, backend scaffold, basic API

### Goals
- [x] ✅ Fully functional development environment
- [x] ✅ Database schema migrated and working
- [x] ✅ Core task CRUD endpoints operational
- [x] ✅ Google OAuth flow working

### Tasks

| ID | Task | Agent | Hours | Priority | Status |
|----|------|-------|-------|----------|--------|
| 1.1 | DONE - Verify monorepo setup, install deps | Codex | 2-3h | P0 | ✅ |
| 1.2 | DONE - Run Prisma migrations, seed test data | Codex | 2-3h | P0 | ✅ |
| 1.3 | DONE - Test task CRUD endpoints manually | Codex | 3-4h | P0 | ✅ |
| 1.4 | DONE - Configure Google Cloud Console, get OAuth credentials | Codex | 2-3h | P0 | ✅ |
| 1.5 | DONE - Test full OAuth flow end-to-end | Codex | 3-4h | P0 | ✅ |
| 1.G1 | DONE - Document local setup in README | Gemini | 2-3h | P1 | ✅ |
| 1.G2 | DONE - Document Google OAuth setup steps | Gemini | 2-3h | P1 | ✅ |

### Decision Gate
- [x] ✅ Can create tasks via API?
- [x] ✅ Can authenticate with Google?
- [x] ✅ Can read Google Calendar events?

---

## Sprint 2: Scheduling Engine & Calendar Integration ✅ COMPLETE
**Duration**: Week 3-4
**Status**: ✅ All tasks complete
**Focus**: Core scheduling algorithm, Google Calendar sync

### Goals
- [x] ✅ Scheduling engine fully tested
- [x] ✅ Tasks can be scheduled into Google Calendar
- [x] ✅ Calendar events visible in API response

### Tasks

| ID | Task | Agent | Hours | Priority | Status |
|----|------|-------|-------|----------|--------|
| 2.1 | DONE - Run scheduling tests, fix any failures | Codex | 3-4h | P0 | ✅ |
| 2.2 | DONE - Wire scheduling package into scheduleService | Codex | 4-6h | P0 | ✅ |
| 2.3 | DONE - Test scheduling with real Google Calendar | Codex | 4-6h | P0 | ✅ |
| 2.4 | DONE - Add edge case tests (overlapping events, full days) | Codex | 4-6h | P1 | ✅ |
| 2.5 | DONE - Implement manual reschedule endpoint | Codex | 3-4h | P1 | ✅ |
| 2.G1 | DONE - Document scheduling algorithm in README | Gemini | 3-4h | P1 | ✅ |
| 2.G2 | DONE - Create troubleshooting guide for calendar issues | Gemini | 2-3h | P2 | ✅ |

### Decision Gate
- [x] ✅ Does scheduling respect wake/sleep times?
- [x] ✅ Does scheduling avoid event conflicts?
- [x] ✅ Do scheduled tasks appear in Google Calendar?

---

## Sprint 3: Web Frontend Core + AI Assistant ✅ COMPLETE
**Duration**: Week 5-6
**Status**: ✅ All tasks complete
**Focus**: Task list, calendar views, and AI scheduling assistant

### Goals
- [x] ✅ Users can manage tasks in browser
- [x] ✅ Users can view calendar with scheduled tasks
- [x] ✅ "Smart Schedule" button works end-to-end
- [x] ✅ AI Assistant chatbot provides scheduling recommendations
- [x] ✅ Basic Today page (`/today`) shows today's tasks and events

### Tasks

| ID | Task | Agent | Hours | Priority | Status |
|----|------|-------|-------|----------|--------|
| 3.1 | DONE - Install web deps, verify dev server starts | Codex | 1-2h | P0 | ✅ |
| 3.2 | DONE - Connect auth flow (Google sign-in) | Codex | 4-6h | P0 | ✅ |
| 3.3 | DONE - Implement task creation form | Codex | 3-4h | P0 | ✅ |
| 3.4 | DONE - Implement task list with filters | Codex | 4-6h | P0 | ✅ |
| 3.5 | DONE - Integrate react-big-calendar with events | Codex | 6-8h | P0 | ✅ |
| 3.6 | DONE - Wire "Smart Schedule" button to backend | Codex | 3-4h | P0 | ✅ |
| 3.7 | DONE - Implement settings page | Codex | 3-4h | P1 | ✅ |
| 3.8 | DONE - **Build AI Assistant page with chat UI** | Codex | 6-8h | P0 | ✅ |
| 3.9 | DONE - **Create chat message components (bubbles, typing indicator)** | Codex | 3-4h | P0 | ✅ |
| 3.10 | DONE - **Add floating AI assistant icon/button** | Codex | 2-3h | P1 | ✅ |
| 3.11 | DONE - **Backend: POST /api/assistant/chat endpoint** | Codex | 4-6h | P0 | ✅ |
| 3.12 | DONE - **Backend: Analyze tasks + calendar + generate recommendations**| Codex | 6-8h | P0 | ✅ |
| 3.13 | DONE - Implement basic `/today` dashboard (Today view v1, no drag-and-drop) | Codex | 4-6h | P1 | ✅ |
| 3.C1 | DONE - **Integrate AI Assistant frontend + backend end-to-end** | Claude | 4-6h | P0 | ✅ |
| 3.C2 | DONE - **Implement intelligent prompt engineering for schedule analysis** | Claude | 6-8h | P0 | ✅ |
| 3.C3 | DONE - **Build "Apply Schedule" flow with conflict resolution** | Claude | 4-6h | P0 | ✅ |
| 3.C4 | DONE - **Add conversation context & memory for multi-turn chat** | Claude | 3-4h | P1 | ✅ |
| 3.C5 | DONE - **Final QA: test all AI Assistant user flows** | Claude | 3-4h | P0 | ✅ |
| 3.C6 | DONE - Draft UX spec for Phase 2 premium interactions (DnD, transitions, micro-interactions) | Claude | 3-4h | P2 | ✅ |
| 3.G1 | DONE - Add loading states and error messages | Gemini | 3-4h | P1 | ✅ |
| 3.G2 | DONE - Document web app usage in README | Gemini | 2-3h | P1 | ✅ |
| 3.G3 | DONE - **Document AI Assistant feature and prompts** | Gemini | 2-3h | P1 | ✅ |

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
- [x] ✅ Can complete full flow: sign in → create task → schedule → see in calendar?
- [x] ✅ Is UI usable and intuitive?
- [x] ✅ Can user chat with AI and receive scheduling recommendations?
- [x] ✅ Can user apply AI suggestions to their calendar?

---

## Sprint 4: Mobile App & Polish ✅ COMPLETE
**Duration**: Week 7-8
**Status**: ✅ All tasks complete
**Focus**: Mobile app screens, UI refinement, theming foundation

### Goals
- [x] ✅ Mobile app shows today's agenda
- [x] ✅ Mobile app shows all tasks with filters
- [x] ✅ UI polished across web and mobile
- [x] ✅ Web layout and theming prepared for Phase 2 polish (design tokens, light/dark ready)

### Tasks

| ID | Task | Agent | Hours | Priority | Status |
|----|------|-------|-------|----------|--------|
| 4.1 | DONE - Install mobile deps, verify Expo starts | Codex | 1-2h | P0 | ✅ |
| 4.2 | DONE - Implement mobile Google auth with expo-auth-session | Codex | 6-8h | P0 | ✅ |
| 4.3 | DONE - Connect Today screen to backend API | Codex | 3-4h | P0 | ✅ |
| 4.4 | DONE - Connect Task List screen to backend API | Codex | 3-4h | P0 | ✅ |
| 4.5 | DONE - Add pull-to-refresh and loading states | Codex | 2-3h | P1 | ✅ |
| 4.6 | DONE - Add task creation form to mobile | Codex | 4-6h | P1 | ✅ |
| 4.7 | DONE - Polish web calendar styling | Codex | 3-4h | P2 | ✅ |
| 4.8 | DONE - Introduce shared design tokens and theme system (CSS variables) | Codex | 4-6h | P1 | ✅ |
| 4.G1 | DONE - Document mobile app setup in README | Gemini | 2-3h | P1 | ✅ |
| 4.G2 | DONE - Create user onboarding guide | Gemini | 3-4h | P2 | ✅ |
| 4.G3 | DONE - Document design system and theming guidelines | Gemini | 3-4h | P2 | ✅ |

### Decision Gate
- [x] ✅ Does mobile app work on iOS and Android?
- [x] ✅ Is the experience smooth and responsive?

---

## Sprint 5: Testing, Security & Launch Prep ✅ COMPLETE
**Duration**: Week 9-10
**Status**: ✅ All tasks complete
**Focus**: Production readiness, security hardening, testing

### Goals
- [x] ✅ All critical paths tested
- [x] ✅ Security vulnerabilities addressed
- [x] ✅ Ready for beta users

### Tasks

| ID | Task | Agent | Hours | Priority | Status |
|----|------|-------|-------|----------|--------|
| 5.1 | DONE - Replace dev token with proper JWT | Codex | 6-8h | P0 | ✅ |
| 5.2 | DONE - Encrypt Google refresh tokens at rest | Codex | 4-6h | P0 | ✅ |
| 5.3 | DONE - Add request validation schemas | Codex | 4-6h | P0 | ✅ |
| 5.4 | DONE - Add rate limiting to API | Codex | 3-4h | P1 | ✅ |
| 5.5 | DONE - Write backend integration tests | Codex | 6-8h | P1 | ✅ |
| 5.6 | DONE - Write web E2E tests (Playwright) | Codex | 6-8h | P1 | ✅ |
| 5.7 | DONE - Set up CI/CD with GitHub Actions | Codex | 4-6h | P1 | ✅ |
| 5.8 | DONE - Deploy to staging environment | Codex | 4-6h | P1 | ✅ |
| 5.C1 | DONE - **Final integration: verify all features work together** | Claude | 4-6h | P0 | ✅ |
| 5.C2 | DONE - **Fix any cross-feature bugs or edge cases** | Claude | 4-6h | P0 | ✅ |
| 5.C3 | DONE - **Optimize AI Assistant response quality** | Claude | 3-4h | P1 | ✅ |
| 5.C4 | DONE - **Pre-launch checklist review and sign-off** | Claude | 2-3h | P0 | ✅ |
| 5.G1 | DONE - Create deployment documentation | Gemini | 3-4h | P1 | ✅ |
| 5.G2 | DONE - Create user FAQ and help docs | Gemini | 4-6h | P2 | ✅ |
| 5.R1 | DONE - Security audit (ruthless-reviewer) | Reviewer | 6-8h | P0 | ✅ |

### Decision Gate
- [x] ✅ Do all tests pass?
- [x] ✅ Is security audit passed?
- [x] ✅ Is staging environment stable?

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

## Phase 2 Preview (Sprints 6-17)

- **Task categories with color coding** (Professional, Schoolwork, Personal, Misc – visible in task lists, calendar, and AI Assistant)
- **Branding & visual identity** (logo system, color story, AI assistant mascot, iconography, marketing-ready assets)
- **Streaks & gamification system** (daily streaks, task completion streaks, milestones, badges to drive engagement)
- Habit scheduling engine (Reclaim-style habits that auto-schedule with flexible windows, Habit model + Habit Manager UI, integrated into scheduler)
- Daily planning ritual view v2 (Sunsama-style `/today` flow with 3-column layout: Inbox, Today timeline, Context/AI)
- Gmail inbox on Today page (Gmail-only to start, with smart prioritization of important vs junk/promotions)
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

## Phase 2 Detailed Plan (Sprints 6-17) – Draft

> Note: Phase 2 scope is intentionally flexible. Exact sprint boundaries can be adjusted based on MVP feedback.

### Sprint 6: Today Ritual v2, Task Categories & Habit Foundations ✅ COMPLETE
**Duration**: Week 11-12
**Status**: ✅ All tasks complete
**Focus**: `/today` 3-column layout, task categories with color coding, simple habits model.

#### Goals
- [x] ✅ `/today` page uses 3-column layout (Inbox, Today timeline, Context/AI).
- [x] ✅ Tasks have color-coded categories (Professional, Schoolwork, Personal, Misc).
- [x] ✅ Users can define basic habits with simple constraints.
- [x] ✅ Scheduler can consider habits conceptually (no full auto-placement yet).

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

| ID | Task | Agent | Hours | Priority | Status |
|----|------|-------|-------|----------|--------|
| 6.1 | DONE - Implement `/today` 3-column layout with responsive design | Codex | 6-8h | P0 | ✅ |
| 6.2 | DONE - Add basic daily planning ritual flow (banner + stepper) | Codex | 4-6h | P0 | ✅ |
| 6.3 | DONE - Add `Category` model to `schema.prisma` (id, name, color, userId) | Codex | 2-3h | P0 | ✅ |
| 6.4 | DONE - Add `categoryId` field to Task model, seed default categories | Codex | 2-3h | P0 | ✅ |
| 6.5 | DONE - Create Category service/controller/routes (CRUD + defaults) | Codex | 3-4h | P0 | ✅ |
| 6.6 | DONE - Update TaskList UI to show category color badges/pills | Codex | 3-4h | P0 | ✅ |
| 6.7 | DONE - Add category selector to task creation/edit forms | Codex | 2-3h | P0 | ✅ |
| 6.8 | DONE - Build category customization UI (rename, change color, create new) | Codex | 4-6h | P0 | ✅ |
| 6.9 | DONE - Add color picker component (preset swatches + hex input) | Codex | 2-3h | P1 | ✅ |
| 6.10 | DONE - Update CalendarView to color-code events by category | Codex | 3-4h | P1 | ✅ |
| 6.11 | DONE - Add Habit model to `schema.prisma` and run migration | Codex | 3-4h | P1 | ✅ |
| 6.12 | DONE - Create Habit service/controller/routes (CRUD API) | Codex | 4-6h | P1 | ✅ |
| 6.13 | DONE - Build `HabitManager` UI on `/habits` page (list + create/edit) | Codex | 4-6h | P1 | ✅ |
| 6.C1 | DONE - Define how habits should influence scheduler in Phase 2+ (rules, edge cases) | Claude | 3-4h | P1 | ✅ |
| 6.C2 | DONE - Integrate category colors into AI Assistant responses ("your Professional tasks...") | Claude | 2-3h | P2 | ✅ |
| 6.G1 | DONE - Document `/today` ritual, categories (incl. customization), and habits | Gemini | 3-4h | P1 | ✅ |

---

### Sprint 7: Habit Scheduling Engine & Recurring/Advanced Logic ✅ COMPLETE
**Duration**: Week 13-14
**Status**: ✅ All tasks complete
**Focus**: Integrate habits into scheduling engine, introduce recurring logic.

#### Goals
- [x] ✅ Habits can be automatically proposed as time blocks for a given week.
- [x] ✅ Scheduler respects habit frequency and time-of-day preferences.
- [x] ✅ Users can see and accept/reject proposed habit placements.
- [x] ✅ Today page Inbox can show a read-only Gmail inbox view for connected Google accounts.
- [x] ✅ Gmail inbox highlights important emails and de-emphasizes obvious junk/promotions.

#### Tasks

| ID | Task | Agent | Hours | Priority | Status |
|----|------|-------|-------|----------|--------|
| 7.1 | DONE - Extend scheduling types to include Habit and recurring metadata | Codex | 3-4h | P0 | ✅ |
| 7.2 | DONE - Update `scheduleTasks` to generate suggested habit blocks (no auto-commit) | Codex | 6-8h | P0 | ✅ |
| 7.3 | DONE - Add API endpoint to fetch habit schedule suggestions | Codex | 4-6h | P0 | ✅ |
| 7.4 | DONE - Add UI on `/today` and `/assistant` to review/accept habit suggestions | Codex | 4-6h | P1 | ✅ |
| 7.C1 | DONE - Tune scheduling heuristics for habits (overlap rules, flexibility, user prefs) | Claude | 6-8h | P0 | ✅ |
| 7.C2 | DONE - Collaborate with Assistant prompts to explain habit suggestions clearly | Claude | 3-4h | P1 | ✅ |
| 7.G1 | DONE - Update docs with examples of habit setups and outcomes | Gemini | 3-4h | P2 | ✅ |
| 7.5 | DONE - Implement Gmail email service + controller and `/api/email/inbox` endpoint (Gmail-only, read-only) | Codex | 6-8h | P0 | ✅ |
| 7.6 | DONE - Add shared `EmailMessage` types in shared package + web API helper `getInboxEmails` | Codex | 3-4h | P1 | ✅ |
| 7.7 | DONE - Update `/today` Inbox column to display recent Gmail messages with loading/empty/error states | Codex | 4-6h | P1 | ✅ |
| 7.8 | DONE - Add basic Gmail connection status + reconnect CTA in Settings page | Codex | 3-4h | P1 | ✅ |
| 7.9 | DONE - Implement Gmail inbox prioritization layer (importance scoring, promotional/junk detection) | Codex | 4-6h | P1 | ✅ |
| 7.10 | DONE - Enhance `/today` email inbox with Focused vs All views using importance scores | Codex | 4-6h | P1 | ✅ |
| 7.11 | DONE - Draft internal `EmailProvider` interface to support future non-Gmail providers | Codex | 3-4h | P2 | ✅ |
| 7.C3 | DONE - Collaborate on heuristics and copy so the “Focused” Gmail inbox feels trustworthy, not lossy | Claude | 3-4h | P2 | ✅ |
| 7.C4 | DONE - Define UX flow for Gmail Inbox within the daily planning ritual | Claude | 3-4h | P2 | ✅ |

---

### Sprint 8: Premium Interactions – Transitions, DnD & Micro-Interactions ✅ COMPLETE
**Duration**: Week 15-16
**Status**: ✅ All tasks complete
**Focus**: Framer Motion integration, drag-and-drop polish, task-complete interactions.

#### Goals
- [x] ✅ Core pages use smooth, consistent page and modal transitions.
- [x] ✅ Drag-and-drop for tasks → calendar uses ghost previews and smart guides.
- [x] ✅ Completing a task feels satisfying via micro-interactions.

#### Tasks

| ID | Task | Agent | Hours | Priority | Status |
|----|------|-------|-------|----------|--------|
| 8.1 | DONE - Integrate Framer Motion into shared layout for page transitions | Codex | 4-6h | P0 | ✅ |
| 8.2 | DONE - Add AnimatePresence-based modal/side-panel animations | Codex | 4-6h | P0 | ✅ |
| 8.3 | DONE - Implement DnD for tasks onto calendar using `dnd-kit` | Codex | 6-8h | P0 | ✅ |
| 8.4 | DONE - Add ghost previews + snap-to-slot guides during DnD | Codex | 4-6h | P1 | ✅ |
| 8.5 | DONE - Implement task-complete micro-interaction (checkbox + subtle celebration) | Codex | 4-6h | P1 | ✅ |
| 8.C1 | DONE - Ensure interactions remain performant and accessible (prefers-reduced-motion, etc.) | Claude | 3-4h | P1 | ✅ |
| 8.G1 | DONE - Update UX guidelines with interaction patterns and motion rules | Gemini | 3-4h | P2 | ✅ |

---

### Sprint 9: Branding, Visual Identity & AI Mascot ✅ COMPLETE
**Duration**: Week 17-18
**Status**: ✅ All tasks complete
**Focus**: Brand identity system, logo, AI assistant mascot, and visual assets.

#### Goals
- [x] ✅ TimeFlow has a clear brand identity (logo, colors, typography story).
- [x] ✅ AI Assistant has a distinctive mascot/character that appears across web + mobile.
- [x] ✅ Core UI surfaces (web + mobile) are updated to reflect the brand.
- [x] ✅ Asset package is ready for marketing site and app stores.

#### Tasks

| ID | Task | Agent | Hours | Priority | Status |
|----|------|-------|-------|----------|--------|
| 9.1 | DONE - Define brand narrative and attributes (tone, personality, positioning) | Architect | 3-4h | P0 | ✅ |
| 9.2 | DONE - Design TimeFlow logo system (primary, monochrome, icon-only) | Codex | 4-6h | P0 | ✅ |
| 9.3 | DONE - Design AI Assistant mascot (character concept, states, small/large variants) | Codex | 6-8h | P0 | ✅ |
| 9.4 | DONE - Integrate logo + mascot into web app layout (header, sidebar, Assistant UI) | Codex | 4-6h | P1 | ✅ |
| 9.5 | DONE - Integrate logo + mascot into mobile app (splash, login, tab icons) | Codex | 4-6h | P1 | ✅ |
| 9.6 | DONE - Create basic brand guidelines doc (colors, type, usage rules, do/don't) | Gemini | 4-6h | P1 | ✅ |
| 9.C1 | DONE - Ensure mascot feels aligned with Assistant behavior and prompts | Claude | 3-4h | P1 | ✅ |

---

### Sprint 9.5: AI Assistant Experience Overhaul ✅ COMPLETE
**Duration**: Week 18-19
**Status**: ✅ All tasks complete
**Focus**: Elevate the in-app AI Assistant into a polished core experience with richer responses, clean formatting, expressive mascot behavior, and saved chats for daily planning.

#### Goals
- [x] ✅ Assistant responses feel structured, readable, and appropriately detailed for daily planning and task workflows.
- [x] ✅ Chat UI looks modern, on-brand, and clearly distinguishes user vs. assistant messages.
- [x] ✅ Flow mascot reacts to assistant state (default, thinking, celebrating) using brand-approved assets.
- [x] ✅ Users can save, name, and revisit important chats (e.g., daily planning sessions) with preserved context.

#### User Stories & Outcomes

**Assistant response quality & structure**
- As a user, I get responses that are detailed enough to be useful, avoid random code unless I ask for it, and use clear headings, lists, and emphasis so I can skim quickly.
- As a user, I see consistent formatting patterns (e.g., separate sections for plan vs. actions vs. notes) across all assistant replies.

**Chat UI & layout**
- As a user, I see a modern chat layout with readable typography, comfortable spacing, and on-brand colors that align with the `docs/BRAND_GUIDELINES.md`.
- As a user, the assistant avatar/icon (Flow mascot) is clearly visible, properly centered, and sized appropriately next to messages and in the assistant header.

**Mascot behavior & states**
- As a user, the Flow mascot icon changes state (default, thinking, celebrating) based on assistant activity, using the existing assets in `assets/branding` (e.g., `Flow Mascot Default.png`, `Flow Mascot Thinking.png`, `Flow Mascot Celebrating.png`).
- As a user, when the assistant is “thinking” or processing a request, I see a clear visual indicator (e.g., the thinking mascot state plus a typing indicator) so I know the app is working.
- As a user, when a task or planning flow completes successfully, I see a brief celebratory mascot state that reinforces a sense of progress.

**Saved chats & session management**
- As a user, my important chats (such as a daily planning conversation) can be saved and named, so I can return to them later in the day or week.
- As a user, I can view a list of recent/saved chats and reopen one to continue where I left off.
- As a user, when I reopen a saved planning chat, the assistant has enough prior context (restored history and metadata) to pick up the thread without me re-explaining everything.

#### Technical Tasks

**Assistant behavior & formatting**
- Define content and formatting guidelines for assistant responses (recommended verbosity ranges, when to use headings vs. bullets vs. inline notes, when to avoid code blocks unless explicitly requested).
- Implement or refine a markdown/formatting layer in the client to render assistant responses cleanly (headings, lists, emphasis, inline code) while preventing raw code fences from appearing unless the user asks for code.
- Add tests or examples for key flows (daily planning, schedule review, habit coaching) to validate that responses follow the guidelines.

**Chat UI & layout improvements**
- Update the chat container layout, message bubble styles, spacing, and typography to align with the visual system defined in `docs/BRAND_GUIDELINES.md` (colors, font stack, radii, shadows).
- Adjust assistant avatar/icon sizing and alignment within message rows and the chat header so the Flow mascot is clearly legible and visually balanced.
- Ensure chat UI adapts across breakpoints (desktop, tablet, narrow browser) without breaking layout or readability.

**Mascot state system**
- Define an assistant state machine (idle/default, typing/thinking, success/celebrating, error) and map each state to a branded mascot asset from `assets/branding`.
- Implement front-end logic to switch mascot state based on the assistant request lifecycle (request started, streaming/typing, completed successfully, error), with smooth but subtle transitions.
- Wire mascot state changes into both the dedicated Assistant page and any floating assistant entry points so behavior is consistent across surfaces.

**Saved chats feature**
- Design or refine the data model for conversations and messages (IDs, titles, timestamps, user vs. assistant roles, pinned/favorite flag, related day/date) in the chosen storage layer.
- Add backend endpoints or local persistence to create, list, update (rename/pin), and load saved chats; ensure they are scoped to the authenticated user.
- Implement UI affordances to:
  - Save the current chat and optionally name it (e.g., “Monday Planning – May 12”).
  - View a list of recent/saved chats (e.g., in a sidebar, panel, or Assistant entry screen).
  - Reopen a saved chat into the main assistant view and continue from the existing history.
- Ensure that when a saved chat is reopened, the assistant receives enough prior messages and relevant metadata so responses feel context-aware.

#### Sprint 13 Must-Pass QA Follow-ups (2025-12-26)
- [x] ✅ Fix empty schedule previews for "schedule today" when time exists (review fixed-event handling + due-date normalization).
- [x] ✅ Prevent invalid task IDs / hallucinated tasks in schedule previews (filter to known taskId/habitId; add conflicts for dropped blocks).
- [x] ✅ Implement assistant history persistence (store and return messages).
- [x] ✅ Align model config for QA runs (gpt-4o requested vs gpt-4o-mini configured).
- [x] ✅ Re-run must-pass flow and record results in `docs/SPRINT_13_MUST_PASS_RUN.md`.
- Reference: `docs/SPRINT_13_MUST_PASS_FIX_RECOMMENDATIONS.md`

#### Acceptance Criteria
- Assistant responses for at least three core flows (e.g., daily planning, task breakdown, recap) follow the new formatting guidelines (headings, bullets, clear sections) and avoid unnecessary code.
- Chat UI visually matches the updated brand guidelines (colors, typography, spacing) and passes basic accessibility checks (contrast ratios, font sizes).
- The Flow mascot visibly changes between default, thinking, and celebration states in response to assistant activity on both the main Assistant page and any floating assistant UI.
- Users can save a chat, see it in a list, reopen it, and continue the conversation without losing prior context, in a way that feels reliable for daily planning.

---

### Sprint 10: Tasks Page UI/UX Modernization ✅ COMPLETE
**Duration**: Week 19-20
**Status**: ✅ All tasks complete
**Focus**: Redesign Tasks page for a sleek, modern, and premium feel, matching the AI Assistant page's aesthetic.

#### Goals
- [x] ✅ Tasks page UI/UX redesigned for a modern, premium feel.
- [x] ✅ Reusable styled `Card` and `Button` components created.
- [x] ✅ Animations added to the Tasks page using Framer Motion.

#### Tasks

| ID | Task | Agent | Hours | Priority | Status |
|----|------|-------|-------|----------|--------|
| 10.1 | DONE - Create `ui` component library directory | Codex | 1-2h | P0 | ✅ |
| 10.2 | DONE - Implement `Card` component with sub-components (Header, Title, Content, Footer) | Codex | 3-4h | P0 | ✅ |
| 10.3 | DONE - Create styled form elements: `Button.tsx`, `Input.tsx`, `Select.tsx`, `Textarea.tsx` | Codex | 4-6h | P0 | ✅ |
| 10.4 | DONE - Refactor main Tasks page layout to use new `Card` and styled form components | Codex | 4-6h | P0 | ✅ |
| 10.5 | DONE - Create `TaskCard` component with hover effects and consistent styling | Codex | 3-4h | P0 | ✅ |
| 10.6 | DONE - Refactor `TaskList` component to render `TaskCard`s | Codex | 2-3h | P0 | ✅ |
| 10.7 | DONE - Implement page load animations for task columns using Framer Motion | Codex | 3-4h | P1 | ✅ |
| 10.8 | DONE - Implement task card animations (staggered appearance, hover effects) | Codex | 3-4h | P1 | ✅ |
| 10.9 | DONE - (Optional) Implement drag-and-drop for tasks between columns using `@dnd-kit` | Codex | 6-8h | P2 | ✅ |
| 10.10 | DONE - Refine Habits section to use `Card` and styled form components | Codex | 4-6h | P1 | ✅ |
| 10.11 | DONE - Ensure responsive design for all new components and layouts | Codex | 3-4h | P1 | ✅ |
| 10.G1 | DONE - Update `SPRINT_10_PLAN.md` with detailed tasks and progress | Gemini | 1-2h | P0 | ✅ |
| 10.B1 | DONE - Fix Task edit form so category changes persist correctly to backend (see `KNOWN_ISSUES.md` – Task Page) | Codex | 3-4h | P0 | ✅ |
| 10.B2 | DONE - Add clear visual separator/badge for selected task category on Task page cards/rows (see `KNOWN_ISSUES.md` – Task Page) | Codex | 2-3h | P1 | ✅ |

---

### Sprint 11: Today & Calendar Experience Overhaul ✅ COMPLETE
**Duration**: Week 21-22
**Status**: ✅ All tasks complete
**Focus**: Transform the Today and Calendar pages into vibrant, interactive, on-brand experiences with rich color, intuitive interactions, and subtle motion that feel premium without being distracting.

#### Goals
- [x] ✅ Today page presents a clear, focused daily plan with modern, on-brand visuals and improved hierarchy.
- [x] ✅ Calendar page uses rich, accessible color-coding aligned with Google Calendar and TimeFlow’s brand system.
- [x] ✅ Users can click any event or scheduled task on the Calendar to see details and take quick actions (edit, move, complete).
- [x] ✅ Drag-and-drop of tasks and events on the Calendar updates both TimeFlow’s backend and Google Calendar reliably.
- [x] ✅ Core interactions on Today and Calendar feel smooth, polished, and performant with subtle animations that respect accessibility settings.

#### Tasks

**Experience audit & design**

| ID | Task | Agent | Hours | Priority | Status |
|----|------|-------|-------|----------|--------|
| 11.1 | DONE - Audit current `/today` and `/calendar` UX vs competitors (e.g., Google Calendar, Motion, Sunsama); capture gaps and opportunities | Claude | 3-4h | P1 | ✅ |
| 11.2 | DONE - Define updated Today & Calendar UX flows (wireframes for desktop + mobile, key interactions, empty/loading states) using `docs/BRAND_GUIDELINES.md` | Claude | 4-6h | P1 | ✅ |

**Calendar visual design & interactions**
| 11.3 | DONE - Implement rich color-coding for calendar events: category colors, Google Calendar colors, and brand-aligned background/outline styles | Codex | 4-6h | P0 | ✅ |
| 11.4 | DONE - Add event detail popover/drawer on click (title, time, location, description, links to task/habit) with edit and delete actions | Codex | 4-6h | P0 | ✅ |
| 11.5 | DONE - Extend drag-and-drop to support moving existing events and scheduled tasks on the calendar, updating local DB and syncing changes back to Google Calendar | Codex | 6-8h | P0 | ✅ |
| 11.6 | DONE - Add visual feedback for drag-and-drop (ghost previews, snap-to-slot guides, conflict warnings) consistent with Sprint 8 interaction patterns | Codex | 4-6h | P1 | ✅ |
| 11.7 | DONE - Ensure calendar colors and interactions meet accessibility requirements (contrast ratios, focus states, keyboard reordering where feasible) | Codex | 3-4h | P1 | ✅ |

**Today page layout & clarity**
| 11.8 | DONE - Redesign `/today` layout into clear sections (e.g., “Focus for Today”, “Time-blocked schedule”, “Tasks & Habits”, “Inbox”) with updated spacing and typography | Codex | 6-8h | P0 | ✅ |
| 11.9 | DONE - Integrate category colors and habit markers into Today’s task and time-block views so daily plans visually match the Calendar | Codex | 4-6h | P1 | ✅ |
| 11.10 | DONE - Improve Today page interactions for drag-and-drop of tasks into the calendar timeline and ensure changes persist to backend and Google Calendar (see `KNOWN_ISSUES.md` – Today Page: DnD tasks not sticking) | Codex | 6-8h | P0 | ✅ |
| 11.11 | DONE - Clarify Habit Suggestion buttons on Today page (label with habit names, show timing context, and ensure clicking them triggers the scheduling workflow end-to-end) | Codex | 4-6h | P1 | ✅ |

**Motion & polish**
| 11.12 | DONE - Add subtle Framer Motion animations for entering/leaving days, expanding event detail popovers, and Today page sections (respect `prefers-reduced-motion`) | Codex | 4-6h | P1 | ✅ |
| 11.13 | DONE - Define motion guidelines for calendar and Today interactions (durations, easing, max motion) and add to UX documentation | Gemini | 3-4h | P2 | ✅ |

**Validation**
| 11.C1 | DONE - Run usability tests on revamped Today & Calendar flows focused on: discovering events, dragging tasks, and understanding schedule changes | Claude | 4-6h | P1 | ✅ |
| 11.G1 | DONE - Document Today & Calendar behavior (click targets, drag rules, sync semantics with Google Calendar, known limitations) | Gemini | 4-6h | P1 | ✅ |

---

### Sprint 12: Command Palette, Light/Dark Mode & Visual System ✅ COMPLETE
**Duration**: Week 23-24
**Status**: ✅ All tasks complete
**Focus**: Power-user navigation, full theming, visual cohesion, and a high-conversion homepage that showcases TimeFlow’s value.

#### Goals
- [x] ✅ Command palette enables fast navigation and key actions via keyboard.
- [x] ✅ Seamless light/dark mode built on design tokens and `next-themes`.
- [x] ✅ Visual system (colors, typography, spacing) is consistent across app.
- [x] ✅ Marketing/product homepage feels alive, clearly communicates value, and uses animations to preview key features (calendar scheduling, planning, AI Assistant), inspired by `https://www.usemotion.com`.

#### Tasks

| ID | Task | Agent | Hours | Priority | Status |
|----|------|-------|-------|----------|--------|
| 12.1 | DONE - Add command palette library (e.g., `cmdk`) and base component | Codex | 4-6h | P1 | ✅ |
| 12.2 | DONE - Wire high-value commands (create task, go to `/today`, open Assistant) | Codex | 3-4h | P1 | ✅ |
| 12.3 | DONE - Implement light/dark mode with `next-themes` using existing tokens | Codex | 4-6h | P0 | ✅ |
| 12.4 | DONE - Apply consistent typography/spacing across core pages | Codex | 4-6h | P1 | ✅ |
| 12.5 | DONE - Audit competitor homepages (e.g. Reclaim.ai, Motion) and define homepage narrative, hero concept, and key value props | Claude | 3-4h | | ✅ |
| 12.6 | DONE - Design homepage layout (hero, feature sections, social proof) and motion concepts using `docs/BRAND_GUIDELINES.md` and audit findings | Codex | 4-6h | P1 | ✅ |
| 12.7 | DONE - Implement new homepage in web app (responsive layout, Framer Motion-based hero/feature animations that preview scheduling, planning, and AI Assistant flows) | Codex | 6-8h | P0 | ✅ |
| 12.8 | DONE - Add analytics events for homepage hero interactions and primary CTAs (e.g., “Get Started”, “See it in action”) | Codex | 3-4h | P1 | ✅ |
| 12.C1 | DONE - Validate keyboard accessibility and discoverability for command palette | Claude | 3-4h | P1 | ✅ |
| 12.C2 | DONE - Review homepage copy, storytelling, and motion so it clearly differentiates TimeFlow while taking inspiration from Reclaim.ai, Motion-style previews | Claude | 3-4h | P1 | ✅ |
| 12.G1 | DONE - Document theme usage and command palette shortcuts | Gemini | 3-4h | P2 | ✅ |

---

### Sprint 13: AI System Overhaul – Model, Prompts & Scheduling Workflows ✅ COMPLETE
**Duration**: Week 25-26
**Status**: ✅ All tasks complete
**Focus**: End-to-end overhaul of the AI Assistant’s model, prompts, and scheduling workflows so responses are reliable, well-formatted, and capable of safely updating calendars and tasks.

#### Goals
- [x] ✅ AI Assistant responses are consistently well-formatted (headings, bullets, clear sections) and avoid leaking technical JSON/IDs to users.
- [x] ✅ Assistant can move from “recommendation mode” to actually applying schedules: previewing changes, getting confirmation, and writing to calendar + tasks.
- [x] ✅ Model and prompts respect fixed events (e.g., classes), avoid hallucinated conflicts, and answer availability questions progressively (e.g., “When am I free this week?”) with useful detail.
- [x] ✅ Model abstraction supports multiple models; default production model is llama3.2, with gpt-oss available for evaluation and future consideration.
- [x] ✅ Offline evaluation suite (using `KNOWN_ISSUES.md` and `AI Response Adjustments` transcripts) compares gpt-oss (`9398339cb0d`) vs `llama3.2` on reasoning quality, schedule correctness, and safety.
- [x] ✅ AI Assistant chat UI feels visually consistent with the high-quality starting/hero state and the rest of the branded app.

#### Tasks

**Discovery & Evaluation**

| ID | Task | Agent | Hours | Priority | Status |
|----|------|-------|-------|----------|--------|
| 13.1 | DONE - Audit current assistant prompts, tools, and responses using `KNOWN_ISSUES.md` and `AI Response Adjustments` samples; produce a focused issue list (formatting, hallucinations, workflow gaps) | Claude | 3-4h | P0 | ✅ |
| 13.2 | DONE - Define evaluation criteria and test set for key flows (daily planning, "When am I free this week?", apply schedule, habit scheduling) | Claude | 3-4h | P0 | ✅ |
| 13.2b | DONE - Add automated AI regression tests: backend prompt harness hitting `/api/assistant/chat` with curated prompts, plus unit tests for `parseResponse`/structured-output and mascot state detection; runbook: `docs/SPRINT_13_AI_REGRESSION_RUNBOOK.md` | Codex | 3-4h | P0 | ✅ |

**Model & Infrastructure**

| 13.3 | DONE - Implement abstraction layer in backend (e.g., `assistantModelProvider`) to support swapping between the current `llama3.2` model, gpt-oss (`9398339cb0d`), and future models | Codex | 4-6h | P0 | ✅ |
| 13.4 | DONE - Run side-by-side experiments comparing `llama3.2` vs gpt-oss (`9398339cb0d`) (and any other candidates) on the evaluation set; capture cost, latency, and quality metrics | Codex | 4-6h | P0 | ✅ |
| 13.5 | DONE - Decide and configure the default production model as llama3.2 (document fallback strategy; keep gpt-oss available for future evaluation) | Claude | 3-4h | P1 | ✅ |

**Prompt & Behavior Layer**

| 13.6 | DONE - Redesign core system prompt to clearly separate “conversation mode” vs “action/scheduling mode”, including when to emit structured schedules vs natural language| Claude | 4-6h | P0 | ✅ |
| 13.7 | DONE - Introduce explicit instructions for respecting fixed events (classes, appointments) and avoiding hallucinated conflicts or impossible moves| Claude | 3-4h | P0 | ✅ |
| 13.8 | DONE - Implement robust server-side post-processing that strips all technical markers/IDs before sending responses to the client, except where explicitly required | Codex | 4-6h | P0 | ✅ |
| 13.9 | DONE - Add guardrails/templates for availability questions (“When am I free this week?”) so responses prioritize near-term days, explain rationale, and stay within actual free blocks | Claude | 3-4h | P1 | ✅ |

**Scheduling Workflows & “Apply Schedule”**

| 13.10 | DONE - Extend assistant backend to support an explicit “apply schedule” action that writes recommended blocks into the scheduling engine with proper task status updates | Codex | 6-8h | P0 | ✅ |
| 13.11 | DONE - Wire AI-generated schedules into a visual preview component (e.g., `SchedulePreviewCard`) that shows where tasks would land before confirmation, and ensure idempotent re-runs | Codex | 4-6h  Assistant responses to clearly signal when a schedule is ready (“I’ve prepared a schedule. Review it below and click Apply to add it to your calendar.”) | Claude | 3-4h | P1 | ✅ |
| 13.13 | DONE - Add backend safeguards so the apply action cannot move fixed events and must respect wake/sleep and per-day constraints | Codex | 4-6h | P0 | ✅ |

**Scheduling Constraints & Per-Day Settings**

| 13.26 | DONE - Add `dailyScheduleConstraints` (per-day wake/sleep) field to User model and migrate existing wake/sleep defaults to all days (see `KNOWN_ISSUES.md` – Wake/Bedtime Per-Day Constraints) | Codex | 4-6h | P0 | ✅ |
| 13.27 | DONE - Build per-day wake/bedtime settings UI and update scheduling algorithm and Assistant logic to respect day-specific constraints (including weekends) | Codex | 6-8h | P0 | ✅ |

**Evaluation, QA & Telemetry**

| 13.14 | DONE - AmImplement offline evaluation harness that replays `AI Response Adjustments` conversations against the new model/prompt stack and scores them | Codex | 6-8h | P1 | ✅ |
| 13.15 | DONE - Add logging/metrics for assistant failures (parsing errors, invalid schedules, user cancels after preview) to track regression risk | Codex | 3-4h | P1 | ✅ |
| 13.16 | DONE - Run ruthless-reviewer style QA on key AI flows (daily plan, rescheduling, availability queries, apply schedule) and file any remaining critical issues | Reviewer | 4-6h | P1 | ✅ |

**Conversation UX & Memory**

| 13.17 | DONE - Improve AI Assistant page scroll behavior so users can review a longer conversation history comfortably | Codex | 3-4h | P1 | ✅ |
| 13.18 | DONE - Enhance conversation memory handling so relevant prior context is preserved across multiple turns without truncating recent messages too aggressively | Codex | 4-6h | P1 | ✅ |
| 13.19 | DONE - Refine Flow mascot animation/state logic on Assistant page so it remains prominent (centered, animated) while “thinking” and transitions cleanly back to chat icon on response | Claude | 3-4h | P1 | ✅ |

**Chat UI Layout & Visual Continuity**

| 13.20 | DONE - Audit current Assistant starting/hero state vs in-conversation chat UI (using `docs/BRAND_GUIDELINES.md` and `docs/COMPETITOR_AUDIT.md`) and define target conversation layout | Claude | 3-4h | P1 | ✅ |
| 13.21 | DONE - Redesign chat layout (header, background, message list, side panels) so transitioning from hero → active chat preserves the same premium look, color palette, and typography | Claude | 6-8h | P0 | ✅ |
| 13.22 | DONE - Implement responsive styles so the updated chat UI looks great on desktop and mobile, and matches other core surfaces (Today, Tasks, Calendar) | Codex | 4-6h | P1 | ✅ |

**Assistant Motion & Visual Polish**

| 13.23 | DONE - Implement Framer Motion-based animations for assistant message bubbles (staggered entrance, subtle fade/slide) aligned with motion guidelines from Sprints 8 and 11 | Codex | 4-6h | P1 | ✅ |
| 13.24 | DONE - Add polished typing indicator and “assistant is thinking” animation that smoothly coordinates with Flow mascot states (no jarring jumps) | Codex | 3-4h | P1 | ✅ |
| 13.25 | DONE - Ensure all Assistant page animations respect `prefers-reduced-motion` and remain performant on low-powered devices | Codex | 3-4h | P1 | ✅ |

#### Acceptance Criteria
- [x] ✅ Assistant no longer leaks raw JSON structures or internal IDs in user-facing responses across the tested scenarios.
- [x] ✅ For at least three core workflows (daily plan, reschedule a task, “When am I free this week?”), responses are well-structured, respect constraints, and avoid recommending changes to fixed events.
- [x] ✅ Users can see a visual preview of AI-generated schedules, confirm them, and observe tasks/events updated correctly in both backend and calendar.
- [x] ✅ Offline eval suite and telemetry confirm that the new model/prompt stack performs better than the previous configuration on both quality and error rate.

---

### Sprint 14: Calendar Dashboard Overhaul (Color-Coded, Actionable) ✅ COMPLETE
**Duration**: Week 27-28
**Status**: ✅ All tasks complete (2025-12-26)
**Focus**: Redesign `/calendar` into a high-utility planning surface (based on the provided UI reference): upcoming events, unscheduled tasks, and a color-coded calendar—without breaking existing behavior.

**Design Reference**: See `docs/SPRINT_14_CALENDAR_DASHBOARD_PLAN.md` and `docs/SPRINT_14_AI_EVENT_CATEGORIZATION.md` (includes architecture, all 4 implementation phases, and performance optimizations).

#### Goals
- [x] ✅ Calendar page becomes a dashboard: **Upcoming Events**, **Unscheduled Tasks**, and the main **Calendar** view in one cohesive layout.
- [x] ✅ Strong color coding: tasks use category colors; external events use AI-assigned category colors with visual distinction.
- [x] ✅ Users can manage TimeFlow items from Calendar (scheduled tasks actions, reschedule, unschedule/delete) and inspect events (details popover with category override).
- [x] ✅ Reserve space for future: "Quick plan/schedule meeting" panel (placeholder only; no new booking logic in this sprint).
- [x] ✅ No regressions: existing calendar functionality continues to work (DnD reschedule, Smart Schedule, task actions).
- [x] ✅ **BONUS**: Full AI event categorization system with background sync, caching, analytics, and manual override capability.

#### Tasks

**Dashboard Layout & Visual Refinement** (Completed 2025-12-26)

| ID | Task | Agent | Hours | Priority | Status |
|----|------|-------|-------|----------|--------|
| 14.1 | DONE - Refactor `/calendar` layout into a dashboard shell (left rail + main calendar) while preserving `CalendarView` behavior. | Codex | 6-8h | P0 | ✅ |
| 14.2 | DONE - Add **Upcoming Events** panel (from existing `externalEvents`): color-coded cards + quick "view details" affordance. | Codex | 4-6h | P0 | ✅ |
| 14.3 | DONE - Add **Unscheduled Tasks** panel (tasks where `status=unscheduled`) with quick actions and drag-to-schedule into the calendar grid. | Codex | 6-8h | P0 | ✅ |
| 14.4 | DONE - Improve calendar visuals: category-color tasks; better external event styling; keep legend; ensure contrast/consistency across themes. | Codex | 4-6h | P0 | ✅ |
| 14.5 | DONE - Add "Plan Meetings (Coming Soon)" placeholder panel matching the dashboard layout (ties into future meeting scheduling sprint). | Codex | 2-3h | P2 | ✅ |
| 14.6 | DONE - QA checklist + regression verification: reschedule, unschedule/delete, Smart Schedule, and event popovers still work. | Codex | 3-4h | P0 | ✅ |

**AI Event Categorization** (Core Feature - ✅ COMPLETE 2025-12-26)

| ID | Task | Agent | Hours | Priority | Status |
|----|------|-------|-------|----------|--------|
| 14.7 | DONE - Create `EventCategorization` Prisma model and run migration to support AI categorization of external events. | Codex | 2-3h | P0 | ✅ |
| 14.8 | DONE - Implement `eventCategorizationService.ts`: CRUD operations for event categorizations (get, create, update, bulk operations). | Codex | 4-5h | P0 | ✅ |
| 14.9 | DONE - Create AI categorization logic using OpenAI API (GPT-4o-mini): analyze event title, description, attendees, timing to suggest category. | Claude | 4-6h | P0 | ✅ |
| 14.10 | DONE - Add API endpoints for event categorization: categorize all, get categorization, update category (manual override). | Codex | 3-4h | P0 | ✅ |
| 14.11 | DONE - Frontend: Fetch event categorizations and pass to CalendarView; update event color logic to use category colors for external events. | Codex | 3-4h | P0 | ✅ |
| 14.12 | DONE - Add category selection UI to EventDetailPopover for manual override of AI categorization. | Codex | 2-3h | P0 | ✅ |
| 14.13 | DONE - Implement initial bulk categorization flow: "Categorize Events" button with loading state and success messaging. | Codex | 2-3h | P1 | ✅ |
| 14.14 | DONE - Background sync: Auto-categorize new external events as they're fetched from Google Calendar. | Codex | 2-3h | P1 | ✅ |

**Additional Phase 4 Optimizations** (✅ COMPLETE 2025-12-26)

| ID | Task | Agent | Hours | Priority | Status |
|----|------|-------|-------|----------|--------|
| 14.15 | DONE - Implement smart caching (5-min sessionStorage) to reduce API calls by ~80%. | Claude | 1-2h | P2 | ✅ |
| 14.16 | DONE - Add stale categorization cleanup: automatically remove categorizations for deleted events. | Claude | 1-2h | P2 | ✅ |
| 14.17 | DONE - Implement analytics tracking: total, manual vs AI, confidence levels, category breakdown. | Claude | 1h | P2 | ✅ |

**Critical Bug Fixes** (✅ COMPLETE 2025-12-26)

| ID | Task | Agent | Hours | Priority | Status |
|----|------|-------|-------|----------|--------|
| 14.18 | DONE - Fix JWT token expiry handling (FAST_JWT_EXPIRED error causing 500 instead of 401). | Claude | 1h | P0 | ✅ |
| 14.19 | DONE - Create missing EventCategorization database table migration. | Claude | 1h | P0 | ✅ |
| 14.20 | DONE - Add comprehensive error logging and diagnostics throughout categorization flow. | Claude | 1h | P1 | ✅ |

**Documentation**

| ID | Task | Agent | Hours | Priority | Status |
|----|------|-------|-------|----------|--------|
| 14.G1 | DONE - Document the Calendar Dashboard design, component map, and "no regressions" QA checklist. | Gemini | 3-4h | P1 | ✅ |
| 14.G2 | DONE - Document AI Event Categorization architecture (all 4 phases), categorization logic, user override workflow, and performance optimizations. | Gemini | 2-3h | P1 | ✅ |

---

### Sprint 15: Smart Meeting Scheduling & Scheduling Links
**Duration**: Week 29-30
**Status**: ✅ 100% Complete
**Focus**: Launch external meeting scheduling via personal links and provide a polished, reliable multi-calendar scheduling experience.

#### Goals
- [x] ✅ Users can create and share personal scheduling links.
- [x] ✅ External users can **book + reschedule + cancel** meetings based on the user's real availability across connected calendars.
- [x] ✅ Booking respects **meeting constraints**: work hours, max booking horizon, buffers, and a per-day meeting cap.
- [x] ✅ Scheduling + availability support **Fixed vs Flexible time**: meetings are non-reschedulable and block time; deep work blocks can move and may not block meeting availability.
- [x] ✅ Booked meetings can include **Google Meet** conferencing (MVP). **Zoom integration is deferred** (documented as future enhancement).
- [x] ✅ **Inbox Foundations**: Gmail inbox experience is trustworthy (filters + accuracy improvements) to set up Sprint 16 Gmail label sync success.

#### Tasks

| ID | Task | Agent | Hours | Priority | Status |
|----|------|-------|-------|----------|--------|
| 15.1 | DONE - Implement Apple Calendar integration (OAuth + sync) | Codex | 8-12h | P0 | ✅ |
| 15.2 | DONE - Create `Meeting` and `SchedulingLink` models and services (CRUD for scheduling links, link tokens, and meeting metadata) | Codex | 4-6h | P0 | ✅ |
| 15.3 | DONE - Create public `/book/[urlSlug]` page for booking meetings (time zone aware, responsive) | Codex | 6-8h | P0 | ✅ |
| 15.4 | DONE - Build `GET /api/availability/[urlSlug]` endpoint to aggregate availability from Google + Apple calendars and existing tasks/habits | Codex | 5-7h | P0 | ✅ |
| 15.5 | DONE - Integrate with Google & Apple Calendar APIs to create and update events when bookings are confirmed or rescheduled | Codex | 5-7h | P0 | ✅ |
| 15.5b | DONE - Add public cancel flow + server-side cancellation handling (event delete/cancel semantics + user-friendly errors) | Codex | 4-6h | P0 | ✅ |
| 15.5c | DONE - Add **Google Meet** option for bookings (create conference data on event; ensure timezone-safe behavior) | Codex | 3-5h | P1 | ✅ |
| 15.6 | DONE - Implement "Scheduling Links" management UI in Settings (create, edit, pause/resume, delete, copy/share link) | Codex | 4-6h | P1 | ✅ |
| 15.6b | DONE - Add "Meeting Manager" UI in Settings: list bookings with filters (**scheduled / rescheduled / cancelled**) and cancellation action | Codex | 4-6h | P1 | ✅ |
| 15.7 | DONE - Add meeting booking constraints to Scheduling Links: **work hours**, **max future date range**, **buffer times**, **max meetings/day** (model + API + UI). | Codex | 6-8h | P0 | ✅ |
| 15.8 | DONE - Update availability computation to enforce constraints (clamp date range; apply buffers around busy blocks; enforce daily cap; timezone safe). | Codex | 6-8h | P0 | ✅ |
| 15.9 | DONE - Enforce constraints at booking time (server-side) to prevent race conditions/double booking; return user-friendly errors. | Codex | 4-6h | P0 | ✅ |
| 15.C1 | DONE - Review and refine cross-integration edge cases (double-booking, overlapping events, cancellations, time zone changes) | Claude | 4-6h | P1 | ✅ |
| 15.C2 | DONE - Define precise semantics for constraints + Fixed/Flexible time interaction (DST, multi-day, partial blocks). | Claude | 3-4h | P1 | ✅ |
| 15.G1 | DONE - Document Smart Meeting Scheduling and multi-calendar behavior, including how availability is computed and how users manage their links | Gemini | 4-6h | P2 | ✅ |
| 15.G2 | DONE - **Inbox Foundations**: filters, category correction UI, override system, "Why This Label?" transparency (implementation + documentation) | Gemini | 3-4h | P1 | ✅ |

---

### Sprint 15.5: Sidebar Navigation Redesign (Authenticated, Collapsible)
**Status**: DONE ✅
**Duration**: 2-4 days (immediately after Sprint 15)  
**Focus**: Replace the cluttered top navigation with a Notion-like **authenticated-only** sidebar that scales as TimeFlow adds more pages and sub-pages.

#### Goals
- [x] Signed-in users see a **left sidebar** with the TimeFlow logo and primary destinations.
- [x] Sidebar is **collapsible** (expanded + icon-only) and persists state across reloads.
- [x] One-click destinations: **Today**, **Tasks**, **Flow AI**, **Calendar**, **Inbox**.
- [x] Settings is accessible via a **gear icon** (not a top-level nav label).
- [x] Mobile uses a **drawer** sidebar opened by a hamburger button.
- [x] No navigation overflow on common laptop widths.

#### Tasks

| ID | Task | Agent | Hours | Priority | Status |
|----|------|-------|-------|----------|--------|
| 15.5.1 | Update web app shell to support authenticated sidebar layout (keep unauthenticated layout unchanged) | Codex | 2-3h | P0 | ✅ |
| 15.5.2 | Implement sidebar UI (logo → `/today`, nav items, active states, gear → `/settings`) | Codex | 2-3h | P0 | ✅ |
| 15.5.3 | Add collapse toggle + localStorage persistence + tooltips in collapsed mode | Codex | 1-2h | P0 | ✅ |
| 15.5.4 | Add mobile drawer behavior (hamburger, overlay, Esc-to-close, close-on-navigate) | Codex | 2-3h | P0 | ✅ |
| 15.5.5 | Add `/inbox` placeholder route so Inbox destination does not 404 | Codex | 0.5-1h | P0 | ✅ |
| 15.5.G1 | Write agent handoff + QA checklist doc for sidebar redesign | Gemini | 1-2h | P1 | ✅ |

#### Acceptance Criteria
- Signed out: no sidebar; existing header remains.
- Signed in (desktop): sidebar shows logo and destinations; collapse persists after refresh; gear navigates to Settings.
- Signed in (mobile): hamburger opens drawer; overlay/Esc closes; navigating closes drawer.
- `/inbox` is reachable and does not 404.

**Plan doc**: See **[`docs/plans/2026-01-01-sidebar-navigation-redesign.md`](./docs/plans/2026-01-01-sidebar-navigation-redesign.md)**.

---

### Sprint 15.5: AI Assistant Workflow Hardening (Planning + Meetings)
**Status**: DONE ✅
**Duration**: 1-2 days (parallel to sidebar sprint)  
**Focus**: Make the AI assistant more conversational and robust for planning and meetings workflows.

#### Goals
- [x] Add planning sub-mode with minimal clarifying questions and draft plans.
- [x] Add meetings sub-mode for scheduling links, invite drafting, and safe email send confirmations.
- [x] Extend regression harness with expectations (question/CTA/no scheduling language).

#### Tasks

| ID | Task | Agent | Hours | Priority | Status |
|----|------|-------|-------|----------|--------|
| 15.5.AI1 | Add planning workflow (intent detection, clarifying questions, response sanitization) | Codex | 3-4h | P0 | ✅ |
| 15.5.AI2 | Add meetings workflow mode + prompt + meeting state | Codex | 4-6h | P0 | ✅ |
| 15.5.AI3 | Upgrade AI regression harness with expectation checks and planning/meeting prompts | Codex | 2-3h | P1 | ✅ |

**Plan docs**: See **[`docs/plans/2026-01-02-ai-planning-workflow.md`](./docs/plans/2026-01-02-ai-planning-workflow.md)**, **[`docs/plans/2026-01-02-ai-planning-workflow-implementation-plan.md`](./docs/plans/2026-01-02-ai-planning-workflow-implementation-plan.md)**, and **[`docs/plans/2026-01-02-ai-meetings-workflow-design.md`](./docs/plans/2026-01-02-ai-meetings-workflow-design.md)**.

---

### Sprint 16: Inbox MVP (Email Triage) + Gmail Label Sync (Thread-Level)
**Status**: 🟡 In Progress
**Duration**: Week 31-32  
**Focus**: Build a **real, daily-usable Inbox** inside TimeFlow (thread triage: list + detail + read/unread + archive + search) and then optionally mirror that organization inside Gmail via real Gmail labels applied at the **thread level**, shipped in a **trust-first Phase A** (manual/fallback) and an optional **Phase B** (watch + Pub/Sub).

#### Supporting Docs (source of truth)
- Inbox triage scope: **[`docs/plans/2026-01-01-sprint-16-inbox-mvp-email-triage.md`](./docs/plans/2026-01-01-sprint-16-inbox-mvp-email-triage.md)**
- Gmail label sync design: **[`docs/plans/2026-01-01-sprint-16-phase-a-gmail-label-sync.md`](./docs/plans/2026-01-01-sprint-16-phase-a-gmail-label-sync.md)**
- Gmail label sync implementation: **[`docs/plans/2026-01-01-sprint-16-phase-a-implementation.md`](./docs/plans/2026-01-01-sprint-16-phase-a-implementation.md)**
- AI Email Draft design (Phase B+): **[`docs/plans/2026-01-02-ai-email-draft-workflow-design.md`](./docs/plans/2026-01-02-ai-email-draft-workflow-design.md)**
- AI Email Draft implementation plan (Phase B+): **[`docs/plans/2026-01-02-ai-email-draft-workflow-implementation-plan.md`](./docs/plans/2026-01-02-ai-email-draft-workflow-implementation-plan.md)**
- AI Email Draft remaining work (Phase B+): **[`docs/AI_EMAIL_DRAFT_REMAINING_WORK.md`](./docs/AI_EMAIL_DRAFT_REMAINING_WORK.md)** ← **Backend complete, frontend pending**

#### Current Focus (Top 3) — prioritize user-visible value
- [x] **(1) Inbox UI: AI Email Draft Panel** — implement Generate → Edit → Full Preview + actions (ties to `16.B6e`). ✅ **DONE**
- [x] **(2) Gmail Draft creation** — add `gmail.users.drafts.create` + deterministic preview payload (ties to `16.B6d`). ✅ **DONE**
- [x] **(3) Minimal backend endpoints** — `POST /email/draft/ai`, `POST /email/draft/preview`, `POST /email/drafts` (ties to `16.B6c`). ✅ **DONE**

#### Goals
- [ ] `/inbox` is a true triage surface: fast thread list, thread detail, read/unread, archive, and search.
- [ ] User trust loop is complete: correction persists and “Why this label?” is transparent (override/rule/heuristic).
- [ ] **Differentiator**: users can convert an email into a task and optionally **schedule it immediately**.
- [ ] TimeFlow can **create/ensure Gmail labels** for each enabled email category (namespaced, e.g., `TimeFlow/Work`).
- [ ] TimeFlow can **apply category labels to Gmail threads** deterministically and idempotently.
- [ ] A consumer user can enable/disable Gmail label sync and run a manual “Sync now”.
- [ ] **Phase A**: labeling works via manual “Sync now” and/or bounded **sync-on-inbox-fetch** (no Pub/Sub dependency).
- [ ] **Phase B** (optional): new incoming mail is labeled within minutes via **Gmail watch + Pub/Sub**.
- [ ] Category color settings map to Gmail’s supported label color palette (best-effort mapping + user override).
- [ ] Email labeling earns user trust via **user control + transparency** (rules + easy correction + “why” explanations).

#### Tasks

**Phase 0: Inbox MVP (Email Triage) — DONE ✅ (no new work added here)**

| ID | Task | Agent | Hours | Priority | Status |
|----|------|-------|-------|----------|--------|
| 16.0 | Upgrade `/inbox` to a true triage Inbox: thread list + thread detail (at least latest message), plus “Open in Gmail”. | Codex | 8-12h | P0 | ✅ |
| 16.0b | Add triage actions to `/inbox`: mark read/unread and archive with optimistic UI + friendly rate-limit errors. | Codex | 4-6h | P0 | ✅ |
| 16.0c | Add server-backed search (use Gmail search endpoint when query present), keep fast client-side search as fallback. | Codex | 3-5h | P1 | ✅ |
| 16.0d | Replace placeholder “Why this label?” with real explanation sources (override vs rule vs heuristic signals). | Codex | 3-5h | P0 | ✅ |
| 16.0e | Add inbox header account pill + refresh; expose connected email accounts endpoint for multi-account readiness. | Codex | 2-3h | P1 | ✅ |

**Phase A (ship value + trust without Pub/Sub)**

| ID | Task | Agent | Hours | Priority | Status |
|----|------|-------|-------|----------|--------|
| 16.A0 | **Email → Task → Schedule**: add “Create task” + “Create & schedule” from Inbox threads; store a backlink to the email/thread in the task. | Codex | 6-10h | **P0** | ✅ (pending QA) |
| 16.1 | Extend DB schema to persist per-user Gmail label mappings and sync state (labelId, labelName, color mapping, lastHistoryId, watch expiration). | Codex | 4-6h | P0 | ✅ |
| 16.2 | Implement Gmail Label Sync service: list/create/patch labels; apply labels to threads via Gmail API; idempotent operations. | Codex | 8-12h | P0 | ✅ (pending QA) |
| 16.3 | Add API endpoints: enable/disable sync, status, run sync now, and per-category Gmail label settings updates. | Codex | 6-8h | P0 | ✅ (pending QA) |
| 16.4 | Implement fallback “sync on inbox fetch” path behind a flag, with strict rate limiting and small batch size. | Codex | 4-6h | P0 | ✅ (pending QA) |
| 16.7 | Add “Gmail Label Sync” settings under Email Categories: master toggle, status, “Sync now”, per-category name/color mapping controls. | Codex | 6-8h | P0 | ✅ (pending QA) |
| 16.8 | Add **user-defined rules** for categorization (e.g., “all emails from domain X → Work”) and apply rules before heuristics; ensure rules influence Gmail label sync. | Codex | 6-8h | P0 | ✅ (pending QA) |
| 16.9 | Add “Why this label?” transparency UI (show rule match / Gmail label match / keyword match) to reduce black-box feel. | Codex | 4-6h | P0 | ✅ (pending QA) |
| 16.C1 | Define sync semantics (thread-level add/remove rules, conflicts with user-applied labels, bounded backfill policy). | Claude | 3-4h | P1 | ✅ |
| 16.G1 | Document setup + limitations (Gmail color palette limits, sensitive scope verification), plus troubleshooting playbook. | Gemini | 4-6h | P1 | ✅ |

**Phase A Issues / Open Items**
- Manual QA blocked: needs valid auth token/session + Gmail account connected to verify endpoints and label application.

**Phase B (optional): Background Sync — Gmail Watch + Pub/Sub**

| ID | Task | Agent | Hours | Priority |
|----|------|-------|-------|----------|
| 16.5 | Implement Gmail watch setup + Pub/Sub push handler endpoint; validate push authenticity; dedupe by historyId. | Codex | 8-12h | P1 | ✅ |
| 16.6 | Implement watch renewal job and operational safeguards (retry, dead-letter strategy, alerting hooks). | Codex | 4-6h | P1 | ✅ |
| 16.10 | Add optional **action-oriented labels** in TimeFlow (`NeedsReply`, `ToRead`, `NeedsAction`) and map them to Gmail labels (namespaced) if enabled. | Codex | 6-8h | P2 |

**Phase B+ (carryover): AI Assistant Hardening**

| ID | Task | Agent | Hours | Priority | Status |
|----|------|-------|-------|----------|--------|
| 16.B1 | Fix AI regression harness failures for planning/meetings flows; make prompts pass expectation checks. | Codex | 2-4h | P1 | ✅ |
| 16.B2 | Add CI gate for AI regression content-quality checks (question/CTA/no scheduling language). | Codex | 2-3h | P2 | ✅ |
| 16.B3 | Add production-safe AI debug toggle + logging for prompt failures (off by default). | Codex | 2-3h | P2 | ✅ |
| 16.B4 | Add Inbox prompts for email→task, label sync, and “Why this label?” flows with always-draft + confirm. | Codex | 3-5h | P1 | ✅ |
| 16.B5 | Extend AI regression harness with Inbox scenarios and expectations (draft required, confirmation CTA, no auto-apply language). | Codex | 2-4h | P1 | ✅ |
| 16.BH1 | Harden email categorization rules for Newsletter, Travel, Work/Professional, Personal, Updates (domains + keywords + heuristics) with tests. | Codex | 4-6h | P1 | ✅ |
| 16.BH2 | Add confidence scoring and AI fallback for low-confidence email categorization (accept AI only above threshold). | Codex | 4-6h | P1 | ✅ |
| 16.BH3 | Add Needs Response signal (rules + AI fallback) and expose as a filter toggle in Inbox UI. | Codex | 4-6h | P1 | ✅ |
| 16.BH4 | Add email categorization eval set and regression tests (privacy-safe). | Codex | 3-5h | P1 | ✅ |

**Phase B+ (carryover): AI Email Draft Workflow (Inbox)**

| ID | Task | Agent | Hours | Priority | Status |
|----|------|-------|-------|----------|--------|
| 16.B6a | Add shared types for AI email draft + preview payloads (request/response) in `@timeflow/shared`. | Codex | 1-2h | P1 | ✅ |
| 16.B6b | Add DB model(s): `WritingVoiceProfile` (B/C defaults, A opt-in config) + minimal AI usage counter for quotas. | Codex | 3-5h | P1 | ✅ |
| 16.B6c | Add backend endpoints: `POST /email/draft/ai`, `POST /email/draft/preview`, `POST /email/drafts`, and safe send (confirmed checkbox required). | Codex | 4-6h | **P1** | ✅ |
| 16.B6d | Add Gmail draft creation (`gmail.users.drafts.create`) and ensure preview payload determinism (no regen after preview). | Codex | 3-5h | P1 | ✅ |
| 16.B6e | Add Inbox UI: Draft Panel with Generate → Edit → Full Preview + actions (Send, Create Gmail Draft, Open in Gmail to refine) + Reply-all toggle. | Codex | 6-10h | **P1** | ✅ |
| 16.B6f | Add “Writing & Voice” settings (B sliders/toggles + C paste samples + A opt-in w/ warning; revoke controls). | Codex | 4-8h | P1 | ✅ |
| 16.B6g | Add tests + guardrails: quotas enforced, no raw email/draft logging, send requires checkbox, and e2e route coverage. | Codex | 4-6h | P1 | ⬜ |
| 16.B6h | Add assistant email-draft mode + prompt formatting + tests; wire draft generation to assistant service. | Codex | 2-4h | P1 | ✅ |

**Phase B+ (carryover): Inbox Queues + AI Thread Assist (moved from Sprint 17)**

| ID | Task | Agent | Hours | Priority | Status |
|----|------|-------|-------|----------|--------|
| 16.B7 | Add action-state inbox queues (`NeedsReply`, `ReadLater`, optional `NeedsAction`) with thread-level state, filters, and fast toggles. | Codex | 6-10h | P2 | ⬜ |
| 16.B8 | Add aging nudges UI (e.g., “Needs Reply > X days”, “Unread important > X days”) as in-app indicators (no notifications yet). | Codex | 3-6h | P2 | ⬜ |
| 16.B9 | Add AI thread assist: “Summarize” + “Extract tasks” + “Create tasks” (strict quotas + max tokens + friendly limit UX). | Codex | 8-12h | P2 | ⬜ |

**Reference doc**: See **[`docs/plans/2026-01-01-sprint-17-inbox-actions-ai.md`](./docs/plans/2026-01-01-sprint-17-inbox-actions-ai.md)**.

#### Acceptance Criteria
- `/inbox` is a real triage surface (list + detail + read/unread + archive + search) and is performant/reliable for daily use.
- Users can convert an email into a task and (optionally) schedule it from the Inbox without losing context.
- **Trust gate**: Label writes into Gmail are only enabled when the user has a correction loop and “Why this label?” transparency.
- Enabled user sees new `TimeFlow/*` labels in Gmail and threads are labeled correctly (manual “Sync now” and/or sync-on-inbox-fetch in Phase A).
- Phase B (if shipped): background sync labels new mail within minutes when watch is enabled.
- Label operations are safe under rate limits and are idempotent (retries do not produce duplicates or thrash colors).
- Clear docs exist for OAuth scopes, verification requirements, and operational monitoring (and Pub/Sub setup if Phase B ships).
- AI regression harness passes content-quality checks for planning/meetings prompts when Phase B+ tasks ship.
- Inbox AI prompts always draft + confirm; regression harness validates no auto-apply language.

**Plan doc**: See **[`docs/plans/2026-01-01-sprint-16-inbox-mvp-email-triage.md`](./docs/plans/2026-01-01-sprint-16-inbox-mvp-email-triage.md)**.

---

### Sprint 17: Analytics & Insights — Habit Consistency (Streaks + Adherence)
**Duration**: Week 33-34  
**Focus**: Turn scheduled habits into **trackable, completable instances** and ship an Insights dashboard on `/habits` that drives retention via streaks and actionable recommendations.

#### Goals
- [ ] Users can **mark habit blocks complete** (calendar-first) and see streaks/adherence update reliably.
- [ ] Habits page becomes an **Insights hub**: consistency charts + best windows + 1–3 explainable recommendations.
- [ ] Habits feels like a **Coach**: a “Next Action” card drives daily behavior (not just charts).
- [ ] Insights are **actionable**: every insight includes a 1-click “Do this now” action (**A/B/D**: schedule rescue block, adjust habit window, snooze/skip with reason).
- [ ] Retention loop: users get an optional, privacy-safe **streak-at-risk reminder** (opt-in) with a clear call-to-action.
- [ ] Trust: insights have clear “why/how calculated” explanations and are robust to edge cases (timezone/DST/missed days).
- [ ] Establish privacy-safe analytics instrumentation (no sensitive content logging).

#### Tasks

| ID | Task | Agent | Hours | Priority|
|----|------|-------|-------|----------|
| 17.1 | Extend habit scheduling data model to support completion tracking (habit instances + complete/uncomplete/skip). | Codex | 6-10h | **P0** |
| 17.2 | Calendar popover: mark habit instance complete/undo; show streak context (“keeps your streak alive”). | Codex | 6-10h | **P0** |
| 17.3 | Habits page: add Insights dashboard (14/28d adherence chart, minutes/week, streaks, best window). | Codex | 8-12h | **P0** |
| 17.4 | Recommendations MVP (rules-based): 1–3 cards tied to metrics (best window, streak at risk, duration too long). | Claude/Codex | 4-8h | P1 |
| 17.5 | Instrumentation + privacy guardrails: define events and ensure no sensitive content is logged. | Codex | 3-6h | P1 |
| 17.6 | Coach + Next Actions: add a top “Coach Card” + “Next Actions” stack with **A/B/D** actions (rescue block, adjust window, snooze/skip with **preset reason codes**). | Codex | 4-8h | **P0** |
| 17.7 | Streak-at-risk detection + UX: define “at risk” rules and surface a clear banner/CTA when a streak will break soon. | Codex | 3-6h | **P0** |
| 17.8 | Minimal reminders (opt-in): streak-at-risk reminder notification (email or in-app) with unsubscribe/disable controls. | Codex | 4-8h | P1 |
| 17.9 | Insight trust + edge cases: add “why/how calculated” explanations + tests for timezone/DST/missed-day handling. | Codex | 4-8h | P1 |

**Plan doc**: See **[`docs/plans/2025-12-31-analytics-insights-habits.md`](./docs/plans/2025-12-31-analytics-insights-habits.md)** for full scope, metrics, and acceptance criteria.
**Action-loop add-on plan**: See **[`docs/plans/2026-01-02-sprint-17-habits-retention-loop.md`](./docs/plans/2026-01-02-sprint-17-habits-retention-loop.md)**.

---

### Sprint 18: Public Beta Launch (Web + Mobile) — SaaS Readiness
**Duration**: Week 35-36  
**Focus**: Ship a **public beta** that runs like a typical SaaS: production hosting (Vercel + Render + Supabase), Google-only auth, beta gating, AI cost controls, onboarding, docs, and mobile distribution readiness.

#### Goals
- [ ] Backend successfully deploys to **Render**, connects to **Supabase**, and passes a production smoke test.
- [ ] Web app is publicly deployed on **Vercel** and correctly routes `/api/*` to the deployed backend (no `localhost` rewrites).
- [ ] Google-only sign-in works end-to-end for web + mobile.
- [ ] **Beta gating** via email allowlist (plus “Heavy beta” allowlist for higher AI limits).
- [ ] AI Assistant is enabled in production with strict **cost controls** (per-user quotas + global cap).
- [ ] Mobile app (Expo) is stable and ready for beta distribution (TestFlight + internal Android track, or store-ready).
- [ ] Onboarding + docs are “SaaS-grade”: setup, help/FAQ, deployment runbook, and rollback steps.
- [ ] Web UI polish for launch: marketing pages are real (not 404), CTAs work, and core management pages (Categories, Meetings) match the product’s design system.

#### Tasks

**Production Deploy & SaaS Readiness (Web + Backend)**

| ID | Task | Agent | Hours | Priority |
|----|------|-------|-------|----------|
| 18.1 | Unblock Render backend deployment: fix Supabase connection string (session pooler 5432 + correct username), ensure logs + port binding work, `/health` passes. | Codex | 8-12h | **P0** |
| 18.2 | Fix web production API routing: update Next.js rewrite/proxy so `/api/*` targets `NEXT_PUBLIC_API_URL` in production (no localhost). | Codex | 2-4h | **P0** |
| 18.3 | Production OAuth hardening: ensure Google OAuth redirect URIs and `APP_BASE_URL` are correct for Vercel + Render. | Codex | 3-6h | **P0** |
| 18.4 | Beta gating: add email allowlist for access + “Heavy beta” allowlist override for elevated entitlements. | Codex | 3-6h | **P0** |
| 18.5 | AI cost controls foundation: per-user monthly quotas + global cap; graceful “limit reached” UX; future-ready plan/entitlement plumbing for Sprint 19. | Codex | 6-10h | **P0** |
| 18.6 | Beta operations pack: smoke test checklist + rollback steps + support/feedback workflow (docs + lightweight tooling). | Codex | 3-6h | P1 |

**Web Launch Polish (Marketing + Core Management Pages)**

| ID | Task | Agent | Hours | Priority |
|----|------|-------|-------|----------|
| 18.15 | Build real public marketing routes: `/features`, `/pricing`, `/about`, `/contact`, `/help`, `/status`, `/security`, `/privacy`, `/terms` (branded content + clear CTAs). | Codex | 8-14h | **P0** |
| 18.16 | Fix homepage/nav correctness: remove/replace dead links (e.g., Blog/Careers/Press for now), ensure mobile menu works or is removed, and all footer links resolve. | Codex | 4-6h | **P0** |
| 18.17 | Pricing page “beta-safe” posture: **Beta is free / pricing coming soon** (subscriptions ship Sprint 19), build real `/pricing`, and ensure all CTAs work (Join Beta + Contact). | Claude/Codex | 4-6h | **P0** |
| 18.18 | Categories UX polish: upgrade task categories page (`/categories`) to match brand (layout, empty states, guidance, analytics) and ensure training UI feels premium. | Codex | 4-8h | P1 |
| 18.19 | Email Categories UX polish: upgrade Settings → Email Categories to be branded, explanatory, and user-friendly (especially Gmail sync status + backfill) without “internal tool” vibes. | Codex | 6-10h | P1 |
| 18.20 | Meetings page UX rebuild: make `/meetings` match app shell, add clear actions (view scheduling links, manage bookings, download ICS, join link), and instrument analytics. | Codex | 6-10h | **P0** |

**Mobile UX, Visual System & Distribution**

| 18.7 | Align `/today`, Tasks, Calendar, and Assistant mobile screens with updated Phase 2 designs (layout, sections, typography, color). | Codex | 6-8h | P0 |
| 18.8 | Audit and refine mobile navigation patterns (tabs, stacks, modals) to ensure smooth transitions between core screens. | Codex | 4-6h | P1 |
| 18.9 | Implement deep links/shortcuts for key flows (e.g., open Today, open specific task). | Codex | 4-6h | P1 |
| 18.10 | App icons, splash screens, and launch screens for iOS and Android following brand guidelines. | Codex | 4-6h | P1 |
| 18.11 | Prepare App Store / Play Store metadata: descriptions, screenshots, preview videos, privacy policy links. | Gemini | 4-6h | P1 |
| 18.12 | Integrate basic analytics + crash reporting aligned with web events (privacy-safe). | Codex | 4-6h | P1 |

**Stability & Performance**

| 18.13 | Profile mobile app performance (startup time, navigation latency, memory usage) and address top issues. | Codex | 4-6h | P1 |
| 18.14 | Implement offline-friendly behaviors for core flows (task creation/editing, viewing Today and Calendar snapshots). | Codex | 4-6h | P1 |

#### Acceptance Criteria
- Backend is deployed on Render and stable; `/health` returns OK; web can call production APIs successfully.
- Web is deployed on Vercel; Google OAuth works; core flows function end-to-end in production.
- Beta gating is enforced (allowlist), including Heavy beta override for invited users.
- AI Assistant runs in production with enforced quotas + clear limit UX (ready for Sprint 19 subscription wiring).
- Mobile passes internal QA and is ready for beta distribution; store assets are complete (or submission-ready).
- Marketing site is launch-ready: required public pages exist, are branded, have working CTAs, and there are **no dead links** from the homepage/footer.
- Categories and Meetings pages feel cohesive with the design system (not “elementary”), with clear empty states and basic analytics instrumentation.

**Plan doc**: See **[`docs/plans/2026-01-01-sprint-18-public-beta-launch.md`](./docs/plans/2026-01-01-sprint-18-public-beta-launch.md)** for the full checklist and gates.

---

### Sprint 19: Subscriptions, Payments & Scale
**Duration**: Week 37-38  
**Focus**: Introduce subscription-based pricing and payments, wire value-adding features into tiers, and prepare the platform for public scale.

#### Goals
- [ ] Pricing plans (e.g., Free/Trial, Standard ~$2–5/mo, Unlimited ~$10/mo) are defined and implemented.
- [ ] Users can start, manage, and cancel subscriptions via a secure payment provider (e.g., Stripe).
- [ ] Key premium features (recurring tasks, templates, streaks, analytics) are gated and stable.
- [ ] Core systems (API, scheduling, queues) are monitored and scaled for public traffic.

#### Tasks

**Pricing & Plan Design**

| ID | Task | Agent | Hours | Priority |
|----|------|-------|-------|----------|
| 19.1 | Define subscription tiers (Free/Trial, Standard, Unlimited) with pricing, limits, and feature entitlements | Architect | 4-6h | P0 |
| 19.2 | Design upgrade/downgrade flows and in-app messaging for plan changes (including trial to paid, grace periods) | Claude | 4-6h | P1 |

**Payments & Subscription Infrastructure**

| 19.3 | Integrate Stripe (or chosen provider) for subscription creation, billing, and secure payment methods | Codex | 8-12h | P0 |
| 19.4 | Implement webhook handlers to sync subscription status (active, trialing, past_due, canceled) into the backend user/account models | Codex | 4-6h | P0 |
| 19.5 | Build a subscription management UI in Settings (view plan, change plan, update payment method, cancel) | Codex | 6-8h | P1 |

**Feature Gating & Value-Add Features**

| 19.6 | Implement an entitlement system (e.g., `canUseUnlimitedAI`, `hasRecurringTasks`, `hasAdvancedAnalytics`, `hasStreaks`) and enforce it across web + mobile | Codex | 6-8h | P1 |
| 19.7 | Add recurring tasks and templates support in backend + UI, scoped to appropriate subscription tiers | Codex | 8-12h | P0 |
| 19.8 | Implement basic analytics events (page views, key actions, Assistant usage) and a simple internal analytics dashboard | Codex | 4-6h | P1 |
| 19.9 | Complete `UserStreak` model and streak calculation service; build streak display UI (navbar counter, details page, milestone animations) | Codex | 6-8h | P1 |
| 19.10 | Implement streak reminder notifications ("Don't lose your 15-day streak!"), tied to subscription entitlements | Codex | 3-4h | P2 |
| 19.C1 | Extend AI Assistant prompts to incorporate subscription context (e.g., suggesting upgrades when hitting limits, celebrating streaks/goals) | Claude | 4-6h | P1 |
| 19.G1 | Document subscription tiers, billing flows, and data/analytics behavior for internal and external stakeholders | Gemini | 4-6h | P2 |

**Scaling & Reliability for Public Launch**

| 19.11 | Review and update API rate limits, circuit breakers, and backpressure strategies for expected public traffic | Codex | 4-6h | P1 |
| 19.12 | Implement monitoring and alerting for key services (scheduler latency, error rates, payment failures, queue backlogs) | Codex | 4-6h | P1 |
| 19.13 | Define and document SLOs/SLAs for uptime and response times; establish on-call and incident response runbooks | Reviewer | 4-6h | P1 |

#### Streaks & Gamification Feature (Reference for Sprint 19)

**Streak Types**:
| Streak | Description | Incentive |
|--------|-------------|-----------|
| Daily Active | Login/use app each day | Keep momentum, "X days in a row" |
| Task Completion | Complete at least 1 task per day | Builds productivity habit |
| Planning Ritual | Complete daily planning each morning | Encourages intentionality |
| Habit Consistency | Complete scheduled habits | Reinforces habit formation |

**Milestones & Badges**:
- 🔥 **7-day streak** – "On Fire" badge
- ⚡ **30-day streak** – "Unstoppable" badge
- 🏆 **100-day streak** – "Centurion" badge
- 🌟 **Personal best** – Celebrate when user beats their longest streak

**UI Elements**:
- Streak counter on dashboard/navbar (🔥 12)
- Streak details in Settings or Profile
- Celebratory animation when milestone reached
- "Don't break your streak!" reminder notification (optional)

---

**Last Updated**: 2025-12-11

---

### Sprint 20: Pre-Launch Hardening & Scalability
**Duration**: Week 39-40
**Focus**: Address critical security vulnerabilities, scalability bottlenecks, production deployment, and implement the **audit-ready security/compliance foundations** needed to earn user trust (SOC 2 / ISO 27001 readiness, PCI scope minimization).

#### Goals
- [ ] **Resolve production deployment issues and deploy backend successfully**
- [ ] Eliminate all critical security vulnerabilities
- [ ] Implement foundational scalability patterns for the backend and database
- [ ] Solidify the architecture to safely support upcoming premium features
- [ ] Ensure the application is robust, resilient, and ready for its first wave of public users
- [ ] Target **SOC 2 Type I** readiness: documented controls + initial evidence capture; minimize PCI scope by architecture.

#### Critical Tasks

| ID | Task | Agent | Hours | Priority | Status |
|----|------|-------|-------|----------|--------|
| 20.0 | **Resolve Render deployment blocking issue** | Claude/Codex | 8-12h | **P0** | 🔴 BLOCKED |
| 20.1 | Production deployment testing & verification | Codex | 2-4h | P0 | Pending |
| 20.2 | Frontend deployment to Vercel | Codex | 2-3h | P0 | Pending |

**Deployment Blocker Details**: See **[Sprint 20 Production Deployment Task](./docs/SPRINT_20_PRODUCTION_DEPLOYMENT.md)** for complete troubleshooting history, hypotheses, and recommended next steps.

#### Additional Tasks
This sprint focuses on hardening the existing application. For a detailed breakdown of security, scalability tasks, priorities, and implementation plans, see the full sprint plan:
- **[View Full Plan: Sprint 20 Pre-Launch Plan](./docs/SPRINT_20_PRELAUNCH_PLAN.md)**

**Compliance/Audit Readiness Plan (Sprint 20)**:
- **[`docs/plans/2026-01-02-sprint-20-compliance-audit-readiness.md`](./docs/plans/2026-01-02-sprint-20-compliance-audit-readiness.md)** (SOC 2 / ISO 27001 readiness + PCI scope minimization)

#### Decision Gate
- [ ] **Is the backend successfully deployed and accessible in production?**
- [ ] **Is the frontend deployed and can communicate with the backend?**
- [ ] Have all P0 security tasks been implemented and reviewed?
- [ ] Is the backend application containerized and ready for scalable deployment?
- [ ] Is the production database connection strategy confirmed to be stable?

---

## Phase 3 Preview (Post-Sprint 20)

These sprints capture high-value follow-ups inspired by `docs/COMPETITOR_ANALYSIS_FYXER_AI.md` while keeping Sprints 14–16 focused on shipping reliable foundations (calendar overhaul, meeting scheduling, inbox trust, Gmail label sync).

### Sprint 21: Email Workflow & Automation
**Duration**: Week 41-42  
**Focus**: Go deeper into “in workflow” email management while preserving user trust via control + transparency.

#### Goals
- [ ] Advanced, user-friendly rule system (multi-condition rules, priority ordering, rule testing/simulation).
- [ ] Optional automation surfaces (action queues like `NeedsReply`, `ToRead`, `NeedsAction`) with safe defaults.
- [ ] UX that explains “why” and supports undo/recovery (no black box).

#### Tasks

| ID | Task | Agent | Hours | Priority |
|----|------|-------|-------|----------|
| 21.1 | Expand rules engine: multi-condition rules (domain/sender/subject keywords), precedence/priority, and a “test rule” simulator UI. | Codex | 8-12h | P0 |
| 21.2 | Add action-oriented states/labels in TimeFlow (queues + filters) and optionally map them to Gmail labels (namespaced). | Codex | 6-8h | P1 |
| 21.3 | Add “why + history + undo” UX: show explanation, show last changes, allow undo for the last action. | Codex | 6-8h | P1 |
| 21.4 | Investigate Gmail-native UX surface: Chrome extension or Gmail add-on; write a decision memo with a minimal POC plan. | Claude | 4-6h | P2 |
| 21.5 | (Future) AI-drafted replies exploration: safety constraints, evaluation, and opt-in UX; document an incremental rollout plan. | Claude | 4-6h | P2 |

---

### Sprint 22: Group Scheduling & Multi-Attendee Availability
**Duration**: Week 43-44  
**Focus**: Multi-attendee scheduling that respects constraints, time zones, and conflict safety.

#### Goals
- [ ] Support scheduling with multiple attendees (availability intersection).
- [ ] Reuse Sprint 15 constraints (work hours, buffers, daily caps) across attendees where applicable.
- [ ] Maintain high reliability under race conditions and partial failures.

#### Tasks

| ID | Task | Agent | Hours | Priority |
|----|------|-------|-------|----------|
| 22.1 | Add multi-attendee availability computation (intersection of free/busy windows; timezone-safe). | Codex | 8-12h | P0 |
| 22.2 | Add booking flows for multiple attendees (invites, confirmations, reschedules, cancellations). | Codex | 8-12h | P0 |
| 22.C1 | Define UX and rules for attendee constraints (whose work hours apply; buffers; caps; organizer vs participant). | Claude | 4-6h | P1 |
| 22.G1 | Document group scheduling behavior, privacy boundaries, and failure modes. | Gemini | 4-6h | P1 |
