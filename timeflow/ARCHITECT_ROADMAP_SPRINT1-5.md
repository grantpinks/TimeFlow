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

## Sprint 3: Web Frontend Core
**Duration**: Week 5-6
**Focus**: Task list and calendar views in browser

### Goals
- [ ] Users can manage tasks in browser
- [ ] Users can view calendar with scheduled tasks
- [ ] "Smart Schedule" button works end-to-end

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
| 3.G1 | Add loading states and error messages | Gemini | 3-4h | P1 |
| 3.G2 | Document web app usage in README | Gemini | 2-3h | P1 |

### Decision Gate
- [ ] Can complete full flow: sign in → create task → schedule → see in calendar?
- [ ] Is UI usable and intuitive?

---

## Sprint 4: Mobile App & Polish
**Duration**: Week 7-8
**Focus**: Mobile app screens, UI refinement

### Goals
- [ ] Mobile app shows today's agenda
- [ ] Mobile app shows all tasks with filters
- [ ] UI polished across web and mobile

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
| 4.G1 | Document mobile app setup in README | Gemini | 2-3h | P1 |
| 4.G2 | Create user onboarding guide | Gemini | 3-4h | P2 |

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

- Apple Calendar integration
- Recurring tasks
- Task templates
- Notifications and reminders
- Improved mobile UI
- Analytics dashboard

---

**Last Updated**: 2025-12-02

