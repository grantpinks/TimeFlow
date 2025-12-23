# TimeFlow Sprint Roadmap (Sprints 1-21)

**Project**: TimeFlow
**Duration**: 32 weeks (2 weeks per sprint)
**Goal**: Production-ready consumer app with advanced scheduling features.  
**Issue Tracking**: See `KNOWN_ISSUES.md` for active bugs, UX gaps, and their mapped sprints/tasks.

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
- [ ] Today page Inbox can show a read-only Gmail inbox view for connected Google accounts.
- [ ] Gmail inbox highlights important emails and de-emphasizes obvious junk/promotions.

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
| 7.5 | Implement Gmail email service + controller and `/api/email/inbox` endpoint (Gmail-only, read-only) | Codex | 6-8h | P0 |
| 7.6 | Add shared `EmailMessage` types in shared package + web API helper `getInboxEmails` | Codex | 3-4h | P1 |
| 7.7 | Update `/today` Inbox column to display recent Gmail messages with loading/empty/error states | Codex | 4-6h | P1 |
| 7.8 | Add basic Gmail connection status + reconnect CTA in Settings page | Codex | 3-4h | P1 |
| 7.9 | Implement Gmail inbox prioritization layer (importance scoring, promotional/junk detection) | Codex | 4-6h | P1 |
| 7.10 | Enhance `/today` email inbox with Focused vs All views using importance scores | Codex | 4-6h | P1 |
| 7.11 | Draft internal `EmailProvider` interface to support future non-Gmail providers | Codex | 3-4h | P2 |
| 7.C3 | Collaborate on heuristics and copy so the “Focused” Gmail inbox feels trustworthy, not lossy | Claude | 3-4h | P2 |
| 7.C4 | Define UX flow for Gmail Inbox within the daily planning ritual | Claude | 3-4h | P2 |

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

### Sprint 9: Branding, Visual Identity & AI Mascot
**Duration**: Week 17-18  
**Focus**: Brand identity system, logo, AI assistant mascot, and visual assets.

#### Goals
- [ ] TimeFlow has a clear brand identity (logo, colors, typography story).
- [ ] AI Assistant has a distinctive mascot/character that appears across web + mobile.
- [ ] Core UI surfaces (web + mobile) are updated to reflect the brand.
- [ ] Asset package is ready for marketing site and app stores.

#### Tasks

| ID | Task | Agent | Hours | Priority |
|----|------|-------|-------|----------|
| 9.1 | Define brand narrative and attributes (tone, personality, positioning) | Architect | 3-4h | P0 |
| 9.2 | Design TimeFlow logo system (primary, monochrome, icon-only) | Codex | 4-6h | P0 |
| 9.3 | Design AI Assistant mascot (character concept, states, small/large variants) | Codex | 6-8h | P0 |
| 9.4 | Integrate logo + mascot into web app layout (header, sidebar, Assistant UI) | Codex | 4-6h | P1 |
| 9.5 | Integrate logo + mascot into mobile app (splash, login, tab icons) | Codex | 4-6h | P1 |
| 9.6 | Create basic brand guidelines doc (colors, type, usage rules, do/don't) | Gemini | 4-6h | P1 |
| 9.C1 | Ensure mascot feels aligned with Assistant behavior and prompts | Claude | 3-4h | P1 |

---

### Sprint 9.5: AI Assistant Experience Overhaul
**Duration**: Week 18-19  
**Focus**: Elevate the in-app AI Assistant into a polished core experience with richer responses, clean formatting, expressive mascot behavior, and saved chats for daily planning.

#### Goals
- [ ] Assistant responses feel structured, readable, and appropriately detailed for daily planning and task workflows.
- [ ] Chat UI looks modern, on-brand, and clearly distinguishes user vs. assistant messages.
- [ ] Flow mascot reacts to assistant state (default, thinking, celebrating) using brand-approved assets.
- [ ] Users can save, name, and revisit important chats (e.g., daily planning sessions) with preserved context.

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

#### Acceptance Criteria
- Assistant responses for at least three core flows (e.g., daily planning, task breakdown, recap) follow the new formatting guidelines (headings, bullets, clear sections) and avoid unnecessary code.
- Chat UI visually matches the updated brand guidelines (colors, typography, spacing) and passes basic accessibility checks (contrast ratios, font sizes).
- The Flow mascot visibly changes between default, thinking, and celebration states in response to assistant activity on both the main Assistant page and any floating assistant UI.
- Users can save a chat, see it in a list, reopen it, and continue the conversation without losing prior context, in a way that feels reliable for daily planning.

---

### Sprint 10: Tasks Page UI/UX Modernization
**Duration**: Week 19-20
**Focus**: Redesign Tasks page for a sleek, modern, and premium feel, matching the AI Assistant page's aesthetic.

#### Goals
- [ ] Tasks page UI/UX redesigned for a modern, premium feel.
- [ ] Reusable styled `Card` and `Button` components created.
- [ ] Animations added to the Tasks page using Framer Motion.

#### Tasks

| ID | Task | Agent | Hours | Priority |
|----|------|-------|-------|----------|
| 10.1 | Create `ui` component library directory | Codex | 1-2h | P0 |
| 10.2 | Implement `Card` component with sub-components (Header, Title, Content, Footer) | Codex | 3-4h | P0 |
| 10.3 | Create styled form elements: `Button.tsx`, `Input.tsx`, `Select.tsx`, `Textarea.tsx` | Codex | 4-6h | P0 |
| 10.4 | Refactor main Tasks page layout to use new `Card` and styled form components | Codex | 4-6h | P0 |
| 10.5 | Create `TaskCard` component with hover effects and consistent styling | Codex | 3-4h | P0 |
| 10.6 | Refactor `TaskList` component to render `TaskCard`s | Codex | 2-3h | P0 |
| 10.7 | Implement page load animations for task columns using Framer Motion | Codex | 3-4h | P1 |
| 10.8 | Implement task card animations (staggered appearance, hover effects) | Codex | 3-4h | P1 |
| 10.9 | (Optional) Implement drag-and-drop for tasks between columns using `@dnd-kit` | Codex | 6-8h | P2 |
| 10.10 | Refine Habits section to use `Card` and styled form components | Codex | 4-6h | P1 |
| 10.11 | Ensure responsive design for all new components and layouts | Codex | 3-4h | P1 |
| 10.G1 | Update `SPRINT_10_PLAN.md` with detailed tasks and progress | Gemini | 1-2h | P0 |
| 10.B1 | Fix Task edit form so category changes persist correctly to backend (see `KNOWN_ISSUES.md` – Task Page) | Codex | 3-4h | P0 |
| 10.B2 | Add clear visual separator/badge for selected task category on Task page cards/rows (see `KNOWN_ISSUES.md` – Task Page) | Codex | 2-3h | P1 |

---

### Sprint 11: Today & Calendar Experience Overhaul
**Duration**: Week 21-22  
**Focus**: Transform the Today and Calendar pages into vibrant, interactive, on-brand experiences with rich color, intuitive interactions, and subtle motion that feel premium without being distracting.

#### Goals
- [ ] Today page presents a clear, focused daily plan with modern, on-brand visuals and improved hierarchy.
- [ ] Calendar page uses rich, accessible color-coding aligned with Google Calendar and TimeFlow’s brand system.
- [ ] Users can click any event or scheduled task on the Calendar to see details and take quick actions (edit, move, complete).
- [ ] Drag-and-drop of tasks and events on the Calendar updates both TimeFlow’s backend and Google Calendar reliably.
- [ ] Core interactions on Today and Calendar feel smooth, polished, and performant with subtle animations that respect accessibility settings.

#### Tasks

**Experience audit & design**

| ID | Task | Agent | Hours | Priority |
|----|------|-------|-------|----------|
| 11.1 | Audit current `/today` and `/calendar` UX vs competitors (e.g., Google Calendar, Motion, Sunsama); capture gaps and opportunities | Claude | 3-4h | P1 |
| 11.2 | Define updated Today & Calendar UX flows (wireframes for desktop + mobile, key interactions, empty/loading states) using `docs/BRAND_GUIDELINES.md` | Claude | 4-6h | P1 |

**Calendar visual design & interactions**
| 11.3 | Implement rich color-coding for calendar events: category colors, Google Calendar colors, and brand-aligned background/outline styles | Codex | 4-6h | P0 |
| 11.4 | Add event detail popover/drawer on click (title, time, location, description, links to task/habit) with edit and delete actions | Codex | 4-6h | P0 |
| 11.5 | Extend drag-and-drop to support moving existing events and scheduled tasks on the calendar, updating local DB and syncing changes back to Google Calendar | Codex | 6-8h | P0 |
| 11.6 | Add visual feedback for drag-and-drop (ghost previews, snap-to-slot guides, conflict warnings) consistent with Sprint 8 interaction patterns | Codex | 4-6h | P1 |
| 11.7 | Ensure calendar colors and interactions meet accessibility requirements (contrast ratios, focus states, keyboard reordering where feasible) | Codex | 3-4h | P1 |

**Today page layout & clarity**
| 11.8 | Redesign `/today` layout into clear sections (e.g., “Focus for Today”, “Time-blocked schedule”, “Tasks & Habits”, “Inbox”) with updated spacing and typography | Codex | 6-8h | P0 |
| 11.9 | Integrate category colors and habit markers into Today’s task and time-block views so daily plans visually match the Calendar | Codex | 4-6h | P1 |
| 11.10 | Improve Today page interactions for drag-and-drop of tasks into the calendar timeline and ensure changes persist to backend and Google Calendar (see `KNOWN_ISSUES.md` – Today Page: DnD tasks not sticking) | Codex | 6-8h | P0 |
| 11.11 | Clarify Habit Suggestion buttons on Today page (label with habit names, show timing context, and ensure clicking them triggers the scheduling workflow end-to-end) | Codex | 4-6h | P1 |

**Motion & polish**
| 11.12 | Add subtle Framer Motion animations for entering/leaving days, expanding event detail popovers, and Today page sections (respect `prefers-reduced-motion`) | Codex | 4-6h | P1 |
| 11.13 | Define motion guidelines for calendar and Today interactions (durations, easing, max motion) and add to UX documentation | Gemini | 3-4h | P2 |

**Validation**
| 11.C1 | Run usability tests on revamped Today & Calendar flows focused on: discovering events, dragging tasks, and understanding schedule changes | Claude | 4-6h | P1 |
| 11.G1 | Document Today & Calendar behavior (click targets, drag rules, sync semantics with Google Calendar, known limitations) | Gemini | 4-6h | P1 |

---

### Sprint 12: Command Palette, Light/Dark Mode & Visual System
**Duration**: Week 23-24  
**Focus**: Power-user navigation, full theming, visual cohesion, and a high-conversion homepage that showcases TimeFlow’s value.

#### Goals
- [ ] Command palette enables fast navigation and key actions via keyboard.
- [ ] Seamless light/dark mode built on design tokens and `next-themes`.
- [ ] Visual system (colors, typography, spacing) is consistent across app.
- [ ] Marketing/product homepage feels alive, clearly communicates value, and uses animations to preview key features (calendar scheduling, planning, AI Assistant), inspired by `https://www.usemotion.com`.

#### Tasks

| ID | Task | Agent | Hours | Priority |
|----|------|-------|-------|----------|
| 12.1 | Add command palette library (e.g., `cmdk`) and base component | Codex | 4-6h | P1 |
| 12.2 | Wire high-value commands (create task, go to `/today`, open Assistant) | Codex | 3-4h | P1 |
| 12.3 | Implement light/dark mode with `next-themes` using existing tokens | Codex | 4-6h | P0 |
| 12.4 | Apply consistent typography/spacing across core pages | Codex | 4-6h | P1 |
| 12.5 | Audit competitor homepages (e.g. Reclaim.ai, Motion) and define homepage narrative, hero concept, and key value props | Claude | 3-4h | 
| 12.6 | Design homepage layout (hero, feature sections, social proof) and motion concepts using `docs/BRAND_GUIDELINES.md` and audit findings | Codex | 4-6h | P1 |
| 12.7 | Implement new homepage in web app (responsive layout, Framer Motion-based hero/feature animations that preview scheduling, planning, and AI Assistant flows) | Codex | 6-8h | P0 |
| 12.8 | Add analytics events for homepage hero interactions and primary CTAs (e.g., “Get Started”, “See it in action”) | Codex | 3-4h | P1 |
| 12.C1 | Validate keyboard accessibility and discoverability for command palette | Claude | 3-4h | P1 |
| 12.C2 | Review homepage copy, storytelling, and motion so it clearly differentiates TimeFlow while taking inspiration from Reclaim.ai, Motion-style previews | Claude | 3-4h | P1 |
| 12.G1 | Document theme usage and command palette shortcuts | Gemini | 3-4h | P2 |

---

### Sprint 13: AI System Overhaul – Model, Prompts & Scheduling Workflows
**Duration**: Week 25-26  
**Focus**: End-to-end overhaul of the AI Assistant’s model, prompts, and scheduling workflows so responses are reliable, well-formatted, and capable of safely updating calendars and tasks.

#### Goals
- [ ] AI Assistant responses are consistently well-formatted (headings, bullets, clear sections) and avoid leaking technical JSON/IDs to users.
- [ ] Assistant can move from “recommendation mode” to actually applying schedules: previewing changes, getting confirmation, and writing to calendar + tasks.
- [ ] Model and prompts respect fixed events (e.g., classes), avoid hallucinated conflicts, and answer availability questions progressively (e.g., “When am I free this week?”) with useful detail.
- [ ] Model abstraction supports multiple models; default production model is llama3.2, with gpt-oss available for evaluation and future consideration.
- [ ] Offline evaluation suite (using `KNOWN_ISSUES.md` and `AI Response Adjustments` transcripts) compares gpt-oss (`9398339cb0d`) vs `llama3.2` on reasoning quality, schedule correctness, and safety.
- [ ] AI Assistant chat UI feels visually consistent with the high-quality starting/hero state and the rest of the branded app.

#### Tasks

**Discovery & Evaluation**

| ID | Task | Agent | Hours | Priority |
|----|------|-------|-------|----------|
| 13.1 | DONE - Audit current assistant prompts, tools, and responses using `KNOWN_ISSUES.md` and `AI Response Adjustments` samples; produce a focused issue list (formatting, hallucinations, workflow gaps) | Claude | 3-4h | P0 |
| 13.2 | Define evaluation criteria and test set for key flows (daily planning, "When am I free this week?", apply schedule, habit scheduling) | Claude | 3-4h | P0 |
| 13.2b | DONE - Add automated AI regression tests: backend prompt harness hitting `/api/assistant/chat` with curated prompts, plus unit tests for `parseResponse`/structured-output and mascot state detection; runbook: `docs/SPRINT_13_AI_REGRESSION_RUNBOOK.md` | Codex | 3-4h | P0 |

**Model & Infrastructure**

| 13.3 | DONE - Implement abstraction layer in backend (e.g., `assistantModelProvider`) to support swapping between the current `llama3.2` model, gpt-oss (`9398339cb0d`), and future models | Codex | 4-6h | P0 |
| 13.4 | DONE - Run side-by-side experiments comparing `llama3.2` vs gpt-oss (`9398339cb0d`) (and any other candidates) on the evaluation set; capture cost, latency, and quality metrics | Codex | 4-6h | P0 |
| 13.5 | DONE - Decide and configure the default production model as llama3.2 (document fallback strategy; keep gpt-oss available for future evaluation) | Claude | 3-4h | P1 |

**Prompt & Behavior Layer**

| 13.6 | DONE - Redesign core system prompt to clearly separate “conversation mode” vs “action/scheduling mode”, including when to emit structured schedules vs natural language| Claude | 4-6h | P0 |
| 13.7 | DONE - Introduce explicit instructions for respecting fixed events (classes, appointments) and avoiding hallucinated conflicts or impossible moves| Claude | 3-4h | P0 |
| 13.8 | DONE - Implement robust server-side post-processing that strips all technical markers/IDs before sending responses to the client, except where explicitly required | Codex | 4-6h | P0 |
| 13.9 | DONE - Add guardrails/templates for availability questions (“When am I free this week?”) so responses prioritize near-term days, explain rationale, and stay within actual free blocks | Claude | 3-4h | P1 |

**Scheduling Workflows & “Apply Schedule”**

| 13.10 | DONE - Extend assistant backend to support an explicit “apply schedule” action that writes recommended blocks into the scheduling engine with proper task status updates | Codex | 6-8h | P0 |
| 13.11 | DONE - Wire AI-generated schedules into a visual preview component (e.g., `SchedulePreviewCard`) that shows where tasks would land before confirmation, and ensure idempotent re-runs | Codex | 4-6h  Assistant responses to clearly signal when a schedule is ready (“I’ve prepared a schedule. Review it below and click Apply to add it to your calendar.”) | Claude | 3-4h | P1 |
| 13.13 | DONE - Add backend safeguards so the apply action cannot move fixed events and must respect wake/sleep and per-day constraints | Codex | 4-6h | P0 |

**Scheduling Constraints & Per-Day Settings**

| 13.26 | DONE - Add `dailyScheduleConstraints` (per-day wake/sleep) field to User model and migrate existing wake/sleep defaults to all days (see `KNOWN_ISSUES.md` – Wake/Bedtime Per-Day Constraints) | Codex | 4-6h | P0 |
| 13.27 | DONE - Build per-day wake/bedtime settings UI and update scheduling algorithm and Assistant logic to respect day-specific constraints (including weekends) | Codex | 6-8h | P0 |

**Evaluation, QA & Telemetry**

| 13.14 | DONE - AmImplement offline evaluation harness that replays `AI Response Adjustments` conversations against the new model/prompt stack and scores them | Codex | 6-8h | P1 |
| 13.15 | DONE - Add logging/metrics for assistant failures (parsing errors, invalid schedules, user cancels after preview) to track regression risk | Codex | 3-4h | P1 |
| 13.16 | Run ruthless-reviewer style QA on key AI flows (daily plan, rescheduling, availability queries, apply schedule) and file any remaining critical issues | Reviewer | 4-6h | P1 |

**Conversation UX & Memory**

| 13.17 | DONE - Improve AI Assistant page scroll behavior so users can review a longer conversation history comfortably | Codex | 3-4h | P1 |
| 13.18 | DONE - Enhance conversation memory handling so relevant prior context is preserved across multiple turns without truncating recent messages too aggressively | Codex | 4-6h | P1 |
| 13.19 | DONE - Refine Flow mascot animation/state logic on Assistant page so it remains prominent (centered, animated) while “thinking” and transitions cleanly back to chat icon on response | Claude | 3-4h | P1 |

**Chat UI Layout & Visual Continuity**

| 13.20 | Audit current Assistant starting/hero state vs in-conversation chat UI (using `docs/BRAND_GUIDELINES.md` and `docs/COMPETITOR_AUDIT.md`) and define target conversation layout | Claude | 3-4h | P1 |
| 13.21 | Redesign chat layout (header, background, message list, side panels) so transitioning from hero → active chat preserves the same premium look, color palette, and typography | Claude | 6-8h | P0 |
| 13.22 | Implement responsive styles so the updated chat UI looks great on desktop and mobile, and matches other core surfaces (Today, Tasks, Calendar) | Claude | 4-6h | P1 |

**Assistant Motion & Visual Polish**

| 13.23 | Implement Framer Motion-based animations for assistant message bubbles (staggered entrance, subtle fade/slide) aligned with motion guidelines from Sprints 8 and 11 | Codex | 4-6h | P1 |
| 13.24 | Add polished typing indicator and “assistant is thinking” animation that smoothly coordinates with Flow mascot states (no jarring jumps) | Codex | 3-4h | P1 |
| 13.25 | Ensure all Assistant page animations respect `prefers-reduced-motion` and remain performant on low-powered devices | Codex | 3-4h | P1 |

#### Acceptance Criteria
- Assistant no longer leaks raw JSON structures or internal IDs in user-facing responses across the tested scenarios.
- For at least three core workflows (daily plan, reschedule a task, “When am I free this week?”), responses are well-structured, respect constraints, and avoid recommending changes to fixed events.
- Users can see a visual preview of AI-generated schedules, confirm them, and observe tasks/events updated correctly in both backend and calendar.
- Offline eval suite and telemetry confirm that the new model/prompt stack performs better than the previous configuration on both quality and error rate.

---

### Sprint 14: Calendar Dashboard Overhaul (Color-Coded, Actionable)
**Duration**: Week 27-28  
**Focus**: Redesign `/calendar` into a high-utility planning surface (based on the provided UI reference): upcoming events, unscheduled tasks, and a color-coded calendar—without breaking existing behavior.

#### Goals
- [ ] Calendar page becomes a dashboard: **Upcoming Events**, **Unscheduled Tasks**, and the main **Calendar** view in one cohesive layout.
- [ ] Strong color coding: tasks use category colors; external events are visually distinct and readable.
- [ ] Users can manage TimeFlow items from Calendar (scheduled tasks actions, reschedule, unschedule/delete) and inspect events (details popover).
- [ ] Reserve space for future: “Quick plan/schedule meeting” panel (placeholder only; no new booking logic in this sprint).
- [ ] No regressions: existing calendar functionality continues to work (DnD reschedule, Smart Schedule, task actions).

#### Tasks

| ID | Task | Agent | Hours | Priority |
|----|------|-------|-------|----------|
| 14.1 | Refactor `/calendar` layout into a dashboard shell (left rail + main calendar) while preserving `CalendarView` behavior. | Codex | 6-8h | P0 |
| 14.2 | Add **Upcoming Events** panel (from existing `externalEvents`): color-coded cards + quick “view details” affordance. | Codex | 4-6h | P0 |
| 14.3 | Add **Unscheduled Tasks** panel (tasks where `status=unscheduled`) with quick actions and drag-to-schedule into the calendar grid. | Codex | 6-8h | P0 |
| 14.4 | Improve calendar visuals: category-color tasks; better external event styling; keep legend; ensure contrast/consistency across themes. | Codex | 4-6h | P0 |
| 14.5 | Add “Plan Meetings (Coming Soon)” placeholder panel matching the dashboard layout (ties into future meeting scheduling sprint). | Codex | 2-3h | P2 |
| 14.6 | QA checklist + regression verification: reschedule, unschedule/delete, Smart Schedule, and event popovers still work. | Codex | 3-4h | P0 |
| 14.G1 | Document the Calendar Dashboard design, component map, and “no regressions” QA checklist. | Gemini | 3-4h | P1 |

---

### Sprint 15: Smart Meeting Scheduling & Scheduling Links
**Duration**: Week 29-30  
**Focus**: Launch external meeting scheduling via personal links and provide a polished, reliable multi-calendar scheduling experience.

#### Goals
- [ ] Users can create and share personal scheduling links.
- [ ] External users can book meetings based on the user's real availability across Google and Apple calendars.
- [ ] Booking respects **meeting constraints**: work hours, max booking horizon, buffers, and a per-day meeting cap.
- [ ] Scheduling + availability support **Fixed vs Flexible time**: meetings are non-reschedulable and block time; deep work blocks can move and may not block meeting availability.
- [ ] **In-context scheduling** exists inside TimeFlow surfaces (email/task views) so users can start scheduling without leaving their workflow.
- [ ] **Inbox Foundations**: Gmail inbox experience is trustworthy (filters + accuracy improvements) to set up Sprint 16 Gmail label sync success.

#### Tasks

| ID | Task | Agent | Hours | Priority |
|----|------|-------|-------|----------|
| 15.1 | Implement Apple Calendar integration (OAuth + sync) | Codex | 8-12h | P0 |
| 15.2 | Create `Meeting` and `SchedulingLink` models and services (CRUD for scheduling links, link tokens, and meeting metadata) | Codex | 4-6h | P0 |
| 15.3 | Create public `/book/[urlSlug]` page for booking meetings (time zone aware, responsive) | Codex | 6-8h | P0 |
| 15.4 | Build `GET /api/availability/[urlSlug]` endpoint to aggregate availability from Google + Apple calendars and existing tasks/habits | Codex | 5-7h | P0 |
| 15.5 | Integrate with Google & Apple Calendar APIs to create and update events when bookings are confirmed or rescheduled | Codex | 5-7h | P0 |
| 15.6 | Implement "Scheduling Links" management UI in Settings (create, edit, pause/resume, delete, copy/share link) | Codex | 4-6h | P1 |
| 15.7 | Add meeting booking constraints to Scheduling Links: **work hours**, **max future date range**, **buffer times**, **max meetings/day** (model + API + UI). | Codex | 6-8h | P0 |
| 15.8 | Update availability computation to enforce constraints (clamp date range; apply buffers around busy blocks; enforce daily cap; timezone safe). | Codex | 6-8h | P0 |
| 15.9 | Enforce constraints at booking time (server-side) to prevent race conditions/double booking; return user-friendly errors. | Codex | 4-6h | P0 |
| 15.C1 | Review and refine cross-integration edge cases (double-booking, overlapping events, cancellations, time zone changes) | Claude | 4-6h | P1 |
| 15.C2 | Define precise semantics for constraints + Fixed/Flexible time interaction (DST, multi-day, partial blocks). | Claude | 3-4h | P1 |
| 15.G1 | Document Smart Meeting Scheduling and multi-calendar behavior, including how availability is computed and how users manage their links | Gemini | 4-6h | P2 |
| 15.G2 | **Inbox Foundations guide** (filters, inbox page UX, categorization accuracy + overrides) | Gemini | 3-4h | P1 |

---

### Sprint 16: Gmail Label Sync (Thread-Level)
**Duration**: Week 31-32  
**Focus**: Mirror TimeFlow’s inbox organization directly inside Gmail by creating real Gmail labels and applying them at the **thread level**, with background sync and safe fallbacks.

#### Goals
- [ ] TimeFlow can **create/ensure Gmail labels** for each enabled email category (namespaced, e.g., `TimeFlow/Work`).
- [ ] TimeFlow can **apply category labels to Gmail threads** deterministically and idempotently.
- [ ] A consumer user can enable/disable Gmail label sync and run a manual “Sync now”.
- [ ] New incoming mail is labeled quickly via **Gmail watch + Pub/Sub** (or, if unavailable, via **sync-on-inbox-fetch** fallback).
- [ ] Category color settings map to Gmail’s supported label color palette (best-effort mapping + user override).
- [ ] Email labeling earns user trust via **user control + transparency** (rules + easy correction + “why” explanations).

#### Tasks

**Backend: Gmail Label Sync Core**

| ID | Task | Agent | Hours | Priority |
|----|------|-------|-------|----------|
| 16.1 | Extend DB schema to persist per-user Gmail label mappings and sync state (labelId, labelName, color mapping, lastHistoryId, watch expiration). | Codex | 4-6h | P0 |
| 16.2 | Implement Gmail Label Sync service: list/create/patch labels; apply labels to threads via Gmail API; idempotent operations. | Codex | 8-12h | P0 |
| 16.3 | Add API endpoints: enable/disable sync, status, run sync now, and per-category Gmail label settings updates. | Codex | 6-8h | P0 |
| 16.4 | Implement fallback “sync on inbox fetch” path behind a flag, with strict rate limiting and small batch size. | Codex | 4-6h | P1 |

**Background Sync: Gmail Watch + Pub/Sub**

| ID | Task | Agent | Hours | Priority |
|----|------|-------|-------|----------|
| 16.5 | Implement Gmail watch setup + Pub/Sub push handler endpoint; validate push authenticity; dedupe by historyId. | Codex | 8-12h | P0 |
| 16.6 | Implement watch renewal job and operational safeguards (retry, dead-letter strategy, alerting hooks). | Codex | 4-6h | P1 |
| 16.C1 | Define sync semantics (thread-level add/remove rules, conflicts with user-applied labels, backfill policy). | Claude | 3-4h | P1 |

**Frontend: Settings UX**

| ID | Task | Agent | Hours | Priority |
|----|------|-------|-------|----------|
| 16.7 | Add “Gmail Label Sync” settings under Email Categories: master toggle, status, “Sync now”, per-category name/color mapping controls. | Codex | 6-8h | P1 |
| 16.G1 | Document setup + limitations (Gmail color palette limits, sensitive scope verification, Pub/Sub requirements), plus troubleshooting playbook. | Gemini | 4-6h | P1 |

**User Control & Transparency (Differentiator vs Fyxer AI)**

| ID | Task | Agent | Hours | Priority |
|----|------|-------|-------|----------|
| 16.8 | Add **user-defined rules** for categorization (e.g., “all emails from domain X → Work”) and apply rules before heuristics; ensure rules influence Gmail label sync. | Codex | 6-8h | P1 |
| 16.9 | Add “Why this label?” transparency UI (show rule match / Gmail label match / keyword match) to reduce black-box feel. | Codex | 4-6h | P1 |
| 16.10 | Add optional **action-oriented labels** in TimeFlow (`NeedsReply`, `ToRead`, `NeedsAction`) and map them to Gmail labels (namespaced) if enabled. | Codex | 6-8h | P2 |
| 16.C2 | Define rule precedence and explanation taxonomy (what gets shown to user; how to avoid leaking sensitive data). | Claude | 3-4h | P1 |

#### Acceptance Criteria
- Enabled user sees new `TimeFlow/*` labels in Gmail and threads are labeled correctly.
- Background sync labels new mail within minutes when watch is enabled; fallback path labels on next inbox fetch when watch disabled.
- Label operations are safe under rate limits and are idempotent (retries do not produce duplicates or thrash colors).
- Clear docs exist for OAuth scopes, verification requirements, Pub/Sub setup, and operational monitoring.

---

### Sprint 17: App Overhaul & Public Mobile Launch
**Duration**: Week 33-34  
**Focus**: Make TimeFlow feel like a polished, app-store-ready product across web and mobile, with a premium, cohesive UI and smooth interactions.

#### Goals
- [ ] Mobile app (Expo) feels fast, stable, and visually consistent with the updated web experience.
- [ ] Core pages (Today, Tasks, Calendar, Assistant) are fully responsive and feel great on phone-sized screens.
- [ ] App surfaces share a cohesive visual language (color, typography, spacing, iconography) and subtle, performant motion.
- [ ] Mobile apps are ready for public distribution on iOS and Android (store metadata, icons, splash screens, basic analytics).

#### Tasks

**Mobile UX & Navigation**

| ID | Task | Agent | Hours | Priority |
|----|------|-------|-------|----------|
| 17.1 | Align `/today`, Tasks, Calendar, and Assistant mobile screens with updated Phase 2 designs (layout, sections, typography, color) | Codex | 6-8h | P0 |
| 17.2 | Audit and refine mobile navigation patterns (tabs, stacks, modals) to ensure smooth transitions between core screens | Codex | 4-6h | P1 |
| 17.3 | Implement deep links/shortcuts for key flows (e.g., open Today, open specific task or meeting link) | Codex | 4-6h | P1 |

**Visual System & Components on Mobile**

| 17.4 | Port web `Card`, `Button`, and form components into reusable mobile equivalents (or shared design system components) | Codex | 6-8h | P1 |
| 17.5 | Align mobile color tokens and typography scale with `docs/BRAND_GUIDELINES.md` (headings, body, accent colors) | Codex | 3-4h | P1 |
| 17.6 | Ensure iconography (including Flow mascot usage on mobile) is crisp and consistent across device densities | Codex | 3-4h | P1 |

**Animations & Premium Feel**

| 17.7 | Implement smooth screen transitions and micro-interactions using an Expo-friendly animation library (e.g., Reanimated/Moti) with `prefers-reduced-motion` support | Codex | 6-8h | P1 |
| 17.8 | Add delightful yet subtle feedback for key actions (task complete, schedule applied, habit checked off) consistent with Sprint 8 motion guidelines | Codex | 4-6h | P1 |

**App Store Readiness**

| 17.9 | Implement app icons, splash screens, and launch screens for iOS and Android following brand guidelines | Codex | 4-6h | P1 |
| 17.10 | Prepare App Store / Play Store metadata: descriptions, screenshots, preview videos, and privacy policy links | Gemini | 4-6h | P1 |
| 17.11 | Integrate basic mobile analytics (screen views, key actions, crashes) aligned with web analytics events | Codex | 4-6h | P1 |

**Stability & Performance**

| 17.12 | Profile mobile app performance (startup time, navigation latency, memory usage) and address top issues | Codex | 4-6h | P1 |
| 17.13 | Implement offline-friendly behaviors for core flows (task creation/editing, viewing Today and Calendar snapshots) | Codex | 4-6h | P1 |

#### Acceptance Criteria
- Mobile apps pass internal QA on a representative set of devices (iOS + Android) with good performance and no critical crashes.
- Core flows (sign-in, Today planning, scheduling, task management, Assistant) are smooth and visually consistent with the web app.
- App store listings are complete and ready for submission.

---

### Sprint 18: Subscriptions, Payments & Scale
**Duration**: Week 35-36  
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
| 18.1 | Define subscription tiers (Free/Trial, Standard, Unlimited) with pricing, limits, and feature entitlements | Architect | 4-6h | P0 |
| 18.2 | Design upgrade/downgrade flows and in-app messaging for plan changes (including trial to paid, grace periods) | Claude | 4-6h | P1 |

**Payments & Subscription Infrastructure**

| 18.3 | Integrate Stripe (or chosen provider) for subscription creation, billing, and secure payment methods | Codex | 8-12h | P0 |
| 18.4 | Implement webhook handlers to sync subscription status (active, trialing, past_due, canceled) into the backend user/account models | Codex | 4-6h | P0 |
| 18.5 | Build a subscription management UI in Settings (view plan, change plan, update payment method, cancel) | Codex | 6-8h | P1 |

**Feature Gating & Value-Add Features**

| 18.6 | Implement an entitlement system (e.g., `canUseUnlimitedAI`, `hasRecurringTasks`, `hasAdvancedAnalytics`, `hasStreaks`) and enforce it across web + mobile | Codex | 6-8h | P1 |
| 18.7 | Add recurring tasks and templates support in backend + UI, scoped to appropriate subscription tiers | Codex | 8-12h | P0 |
| 18.8 | Implement basic analytics events (page views, key actions, Assistant usage) and a simple internal analytics dashboard | Codex | 4-6h | P1 |
| 18.9 | Complete `UserStreak` model and streak calculation service; build streak display UI (navbar counter, details page, milestone animations) | Codex | 6-8h | P1 |
| 18.10 | Implement streak reminder notifications ("Don't lose your 15-day streak!"), tied to subscription entitlements | Codex | 3-4h | P2 |
| 18.C1 | Extend AI Assistant prompts to incorporate subscription context (e.g., suggesting upgrades when hitting limits, celebrating streaks/goals) | Claude | 4-6h | P1 |
| 18.G1 | Document subscription tiers, billing flows, and data/analytics behavior for internal and external stakeholders | Gemini | 4-6h | P2 |

**Scaling & Reliability for Public Launch**

| 18.11 | Review and update API rate limits, circuit breakers, and backpressure strategies for expected public traffic | Codex | 4-6h | P1 |
| 18.12 | Implement monitoring and alerting for key services (scheduler latency, error rates, payment failures, queue backlogs) | Codex | 4-6h | P1 |
| 18.13 | Define and document SLOs/SLAs for uptime and response times; establish on-call and incident response runbooks | Reviewer | 4-6h | P1 |

#### Streaks & Gamification Feature (Reference for Sprint 18)

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

### Sprint 19: Pre-Launch Hardening & Scalability
**Duration**: Week 37-38
**Focus**: Address critical security vulnerabilities, scalability bottlenecks, and future-proof the architecture for a safe and successful public launch.

#### Goals
- [ ] Eliminate all critical security vulnerabilities.
- [ ] Implement foundational scalability patterns for the backend and database.
- [ ] Solidify the architecture to safely support upcoming premium features.
- [ ] Ensure the application is robust, resilient, and ready for its first wave of public users.

#### Tasks
This sprint focuses on hardening the existing application. For a detailed breakdown of tasks, priorities, and implementation plans, see the full sprint plan:
- **[View Full Plan: Sprint 19 Pre-Launch Plan](./docs/SPRINT_19_PRELAUNCH_PLAN.md)**

#### Decision Gate
- [ ] Have all P0 security tasks been implemented and reviewed?
- [ ] Is the backend application containerized and ready for scalable deployment?
- [ ] Is the production database connection strategy confirmed to be stable?

---

## Phase 3 Preview (Post-Sprint 19)

These sprints capture high-value follow-ups inspired by `docs/COMPETITOR_ANALYSIS_FYXER_AI.md` while keeping Sprints 14–16 focused on shipping reliable foundations (calendar overhaul, meeting scheduling, inbox trust, Gmail label sync).

### Sprint 20: Email Workflow & Automation
**Duration**: Week 39-40  
**Focus**: Go deeper into “in workflow” email management while preserving user trust via control + transparency.

#### Goals
- [ ] Advanced, user-friendly rule system (multi-condition rules, priority ordering, rule testing/simulation).
- [ ] Optional automation surfaces (action queues like `NeedsReply`, `ToRead`, `NeedsAction`) with safe defaults.
- [ ] UX that explains “why” and supports undo/recovery (no black box).

#### Tasks

| ID | Task | Agent | Hours | Priority |
|----|------|-------|-------|----------|
| 20.1 | Expand rules engine: multi-condition rules (domain/sender/subject keywords), precedence/priority, and a “test rule” simulator UI. | Codex | 8-12h | P0 |
| 20.2 | Add action-oriented states/labels in TimeFlow (queues + filters) and optionally map them to Gmail labels (namespaced). | Codex | 6-8h | P1 |
| 20.3 | Add “why + history + undo” UX: show explanation, show last changes, allow undo for the last action. | Codex | 6-8h | P1 |
| 20.4 | Investigate Gmail-native UX surface: Chrome extension or Gmail add-on; write a decision memo with a minimal POC plan. | Claude | 4-6h | P2 |
| 20.5 | (Future) AI-drafted replies exploration: safety constraints, evaluation, and opt-in UX; document an incremental rollout plan. | Claude | 4-6h | P2 |

---

### Sprint 21: Group Scheduling & Multi-Attendee Availability
**Duration**: Week 41-42  
**Focus**: Multi-attendee scheduling that respects constraints, time zones, and conflict safety.

#### Goals
- [ ] Support scheduling with multiple attendees (availability intersection).
- [ ] Reuse Sprint 15 constraints (work hours, buffers, daily caps) across attendees where applicable.
- [ ] Maintain high reliability under race conditions and partial failures.

#### Tasks

| ID | Task | Agent | Hours | Priority |
|----|------|-------|-------|----------|
| 21.1 | Add multi-attendee availability computation (intersection of free/busy windows; timezone-safe). | Codex | 8-12h | P0 |
| 21.2 | Add booking flows for multiple attendees (invites, confirmations, reschedules, cancellations). | Codex | 8-12h | P0 |
| 21.C1 | Define UX and rules for attendee constraints (whose work hours apply; buffers; caps; organizer vs participant). | Claude | 4-6h | P1 |
| 21.G1 | Document group scheduling behavior, privacy boundaries, and failure modes. | Gemini | 4-6h | P1 |

