# AGENT STRATEGIC DIRECTIVES

---

**Project Name**: TimeFlow
**Version**: 1.0
**Last Updated**: 2025-12-02

---

## Critical Alerts

**IMPORTANT**: Before starting any implementation work, review these documents:

1. **Project Spec** - `Project_spec.md` - Detailed requirements and data models
2. **Architecture Decisions** - `ARCHITECTURE_DECISIONS.md` - Technical choices
3. **Tasks Checklist** - `TASKS.md` - Implementation status
4. **Sprint Reviews** - `sprint_review/` - Lessons learned

---

## MVP Target (Phase 1)

### Core Features

TimeFlow is a cross-device productivity app that lets users quickly jot down tasks and then automatically schedules those tasks into their Google Calendar.

We'll build:

- **Task Capture** - Create, edit, delete, and complete tasks
  - Title, description, duration, priority (1-3)
  - Target timing: Today, Tomorrow, In 2 Days, Custom date
  - Tasks start as unscheduled until "Smart Schedule" is run

- **Smart Scheduling** - Automatic task placement into calendar
  - Respects wake/sleep times and existing events
  - Sorts by due date ASC, priority DESC
  - Marks `overflowedDeadline` if scheduled after due date

- **AI Scheduling Assistant** - Conversational chatbot for schedule planning
  - Modern chat UI with AI avatar icon
  - Analyzes tasks, priorities, and calendar events
  - Recommends optimal time slots based on constraints
  - Users can ask questions like "What does my Tuesday look like?"
  - Provides "Apply Schedule" action to commit suggestions
  - Quick action chips for common queries

- **Calendar Sync** - Google Calendar integration
  - OAuth2 sign-in with read/write access
  - Create/update events for scheduled tasks
  - User chooses target calendar (default: primary)

- **Views/Screens**
  - Task List: Unscheduled, Scheduled, Completed sections
  - **AI Assistant: Chat interface for schedule recommendations (2nd main page)**
  - Calendar View: Week/day view with task events + existing events
  - Settings: Wake/sleep times, timezone, default duration

### Future Phases

- Apple Calendar integration (EventKit) - Phase 2
- Recurring tasks - Phase 2
- Team/shared calendars - Phase 3
- AI-powered duration estimation - Phase 3

### Non-Goals for MVP

- Multi-user/team features
- Apple Calendar support
- Recurring task patterns
- Natural language task input
- Time tracking/pomodoro

---

## Current Working Flow

```bash
# Development
pnpm install              # Install all dependencies
pnpm dev:backend          # Start backend on :3001
pnpm dev:web              # Start web on :3000
pnpm dev:mobile           # Start Expo dev server

# Database
cd apps/backend
pnpm prisma migrate dev   # Run migrations
pnpm prisma studio        # Open Prisma Studio

# Testing
pnpm test                 # Run all tests
cd packages/scheduling && pnpm test  # Run scheduling tests
```

**Key user actions**:
1. User signs in with Google OAuth
2. User creates tasks with title, duration, priority, due date
3. User opens AI Assistant and asks "Schedule my tasks for tomorrow"
4. AI analyzes tasks + calendar and recommends time slots
5. User reviews suggestions and clicks "Apply Schedule"
6. Tasks appear in Google Calendar, synced and visible in app

---

## Tech Stack

### Backend
- **Language**: TypeScript (Node.js 20+)
- **Framework**: Fastify
- **Database**: PostgreSQL + Prisma ORM
- **Auth**: Google OAuth2 + JWT/session
- **Calendar API**: googleapis

### Frontend Web
- **Framework**: Next.js 14 (App Router)
- **Styling**: Tailwind CSS
- **Calendar UI**: react-big-calendar + luxon
- **State**: React hooks + fetch

### Mobile
- **Framework**: Expo (React Native)
- **Navigation**: React Navigation
- **Storage**: expo-secure-store

### Shared Packages
- `@timeflow/shared` - DTOs, types, utilities
- `@timeflow/scheduling` - Pure scheduling algorithm

### Infrastructure
- **Package Manager**: pnpm workspaces
- **Testing**: Vitest (packages), Jest (backend)
- **Linting**: ESLint + Prettier

---

## Data Models

### User
```json
{
  "id": "cuid",
  "email": "string (unique)",
  "googleId": "string (unique, optional)",
  "googleRefreshToken": "string (encrypted)",
  "googleAccessToken": "string",
  "googleAccessTokenExpiry": "datetime",
  "timeZone": "string (default: America/Chicago)",
  "wakeTime": "string (HH:mm, default: 08:00)",
  "sleepTime": "string (HH:mm, default: 23:00)",
  "defaultTaskDurationMinutes": "number (default: 30)",
  "defaultCalendarId": "string (optional)"
}
```

### Task
```json
{
  "id": "cuid",
  "userId": "string (FK)",
  "title": "string (required)",
  "description": "string (optional)",
  "durationMinutes": "number (default: 30)",
  "priority": "1 | 2 | 3 (default: 2)",
  "status": "unscheduled | scheduled | completed",
  "dueDate": "datetime (optional)",
  "scheduledTask": "ScheduledTask (optional)"
}
```

### ScheduledTask
```json
{
  "id": "cuid",
  "taskId": "string (unique FK)",
  "provider": "google | apple",
  "calendarId": "string",
  "eventId": "string (from Google)",
  "startDateTime": "datetime",
  "endDateTime": "datetime",
  "overflowedDeadline": "boolean",
  "lastSyncedAt": "datetime"
}
```

---

## Agent Roles

### 1. Architect Agent (`architect`)

**Primary Responsibility**: Create sprint plans, roadmaps, and architectural decisions.

**Capabilities**:
- Design system architecture
- Create sprint task breakdowns
- Identify decision gates and dependencies
- Document ADRs (Architecture Decision Records)

**Constraints**:
- MUST follow ADR workflow for significant decisions
- MUST create both CODEX and GEMINI task files
- MUST include hour estimates (ranges, not single numbers)

---

### 2. Codex Agent (`codex`)

**Primary Responsibility**: Implement backend features, algorithms, and infrastructure.

**Capabilities**:
- Write production-quality TypeScript code
- Implement business logic and services
- Build API endpoints and controllers
- Write unit and integration tests
- Fix bugs and performance issues

**Constraints**:
- MUST write tests for all new features
- MUST update documentation when implementation changes
- MUST log all errors appropriately

**Key Files**:
- `apps/backend/src/**/*.ts`
- `packages/scheduling/src/**/*.ts`
- `packages/shared/src/**/*.ts`

---

### 3. Gemini Agent (`gemini`)

**Primary Responsibility**: Create and maintain all project documentation.

**Capabilities**:
- Write README, user guides, API docs
- Create architecture explanations
- Update troubleshooting guides
- Maintain data mapping docs

**Constraints**:
- MUST use clear, plain language
- MUST include "Why this matters" context
- MUST verify all code examples work
- MUST update "Last Updated" timestamps

**Key Files**:
- `README.md`
- `apps/*/README.md`
- `docs/**/*.md`

---

### 4. Ruthless Reviewer Agent (`ruthless-reviewer`)

**Primary Responsibility**: Brutal code review to catch production failures.

**When to Use**:
- After implementing core business logic
- Before committing scheduling algorithm changes
- After making changes to data models
- Before presenting to stakeholders

**What It Checks**:
- Edge cases and error conditions
- Security vulnerabilities (token handling, SQL injection)
- Performance bottlenecks (N+1 queries, memory leaks)
- Data loss or corruption risks
- Over-engineering

---

### 5. Session Closer Agent (`session-closer`)

**Primary Responsibility**: Create clean session handoffs.

**When to Use**:
- User says "let's wrap up"
- After completing major feature
- Before context switching
- When multiple files modified without commit

**What It Does**:
- Summarizes accomplishments
- Lists modified files
- Creates commit messages
- Documents next steps

---

## Documentation Mandate

🚨 **A task is not complete until docs are updated** 🚨

### Rules

1. **README.md is Source of Truth**
   - CLI commands change → Update README
   - API endpoints change → Update README

2. **Planning Docs Reflect Reality**
   - Implementation deviates → Update PLAN.md
   - Sprint scope changes → Update roadmap

3. **Data Contracts Are Binding**
   - Prisma schema changes → Update shared types
   - API response changes → Update DTOs

4. **Every Agent Updates Docs**
   - No exceptions

---

## Development Checklist

For every feature:

- [ ] 1. Define Scope - What and why?
- [ ] 2. Implement Logic - Write code
- [ ] 3. Write Tests - Unit + integration
- [ ] 4. Update User Docs - README if needed
- [ ] 5. Update Plan Docs - PLAN if scope changed
- [ ] 6. Update Schemas - If data changed
- [ ] 7. Update Agent Roles - If responsibilities changed
- [ ] 8. Run Full Tests - No regressions
- [ ] 9. Final Review - Read all changes
- [ ] 10. Update ADRs - If architectural change

---

## ADR Workflow

For significant architectural decisions:

### 1. Proposal (Codex/Gemini)
Document:
- **Context** - What problem?
- **Options** - What alternatives?
- **Choice** - What we picked?
- **Rationale** - Why?
- **Consequences** - Tradeoffs?

### 2. Review (Architect)
Check against:
- Long-term goals
- Existing decisions
- Future sprints
- Technical debt

### 3. Document
Add to `ARCHITECTURE_DECISIONS.md`

---

## Best Practices

### For All Agents

1. **Idempotency** - Same input → Same output
2. **Graceful Failure** - Never crash; log and continue
3. **Logging** - Log all significant actions
4. **No Silent Changes** - Everything logged
5. **Privacy First** - Never log tokens or passwords

### For Code

1. **TDD** - Write tests first when possible
2. **Single Responsibility** - One thing per function
3. **Error Handling** - Specific error types
4. **Type Hints** - Full TypeScript types
5. **Comments** - Explain "why", not "what"

### For Documentation

1. **Plain Language** - No unnecessary jargon
2. **Examples** - Every feature has one
3. **Troubleshooting** - Common errors documented
4. **Diagrams** - ASCII art or tables for complex flows
5. **Business Context** - Why it matters to users

---

## TimeFlow-Specific Guidelines

### Scheduling Algorithm

The scheduling engine in `packages/scheduling` is the core of TimeFlow:

- **Pure function** - No side effects, no database calls
- **Timezone-aware** - All times normalized to user's timezone
- **Deterministic** - Same inputs always produce same outputs
- **Well-tested** - Cover all edge cases from Project_spec.md

### Google Calendar Integration

- **Token refresh** - Always handle expired tokens gracefully
- **Rate limiting** - Respect Google API quotas
- **Conflict resolution** - Don't create overlapping events
- **Event naming** - Prefix with `[TimeFlow]` for identification

### Authentication

- **MVP simplicity** - User ID as token for development
- **TODO marked** - All auth shortcuts clearly marked for production hardening
- **Secure storage** - Refresh tokens encrypted at rest

---

**Last Updated**: 2025-12-02

