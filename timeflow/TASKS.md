# TimeFlow Implementation Checklist

This checklist tracks the implementation status of TimeFlow according to `Project_spec.md`.

---

## Phase 1: Foundation

### 1. Monorepo Setup
- [x] Initialize pnpm workspaces
- [x] Create `tsconfig.base.json` with strict settings
- [x] Set up ESLint + Prettier configs
- [x] Create `.gitignore`
- [x] Update root `README.md`

**Files**: `package.json`, `pnpm-workspace.yaml`, `tsconfig.base.json`, `eslint.config.mjs`, `.prettierrc`

### 2. Backend Scaffold
- [x] Create Fastify server with plugin registration
- [x] Set up Prisma with PostgreSQL
- [x] Add User, Task, ScheduledTask models
- [x] Create `.env.example` with all required vars
- [x] Write `apps/backend/README.md`

**Files**: `apps/backend/src/server.ts`, `apps/backend/prisma/schema.prisma`, `apps/backend/.env.example`

### 3. Backend Routes
- [x] `POST /api/auth/google/start` - OAuth redirect
- [x] `GET /api/auth/google/callback` - OAuth callback
- [x] `GET /api/user/me` - Get current user
- [x] `PATCH /api/user/preferences` - Update preferences
- [x] `GET /api/tasks` - List tasks
- [x] `POST /api/tasks` - Create task
- [x] `PATCH /api/tasks/:id` - Update task
- [x] `DELETE /api/tasks/:id` - Delete task
- [x] `POST /api/tasks/:id/complete` - Mark complete
- [x] `GET /api/calendar/events` - Fetch Google events
- [x] `GET /api/calendar/list` - List calendars
- [x] `POST /api/schedule` - Run smart scheduling
- [x] `PATCH /api/schedule/:taskId` - Manual reschedule
- [x] **`POST /api/assistant/chat` - AI assistant conversation**
- [x] **`GET /api/assistant/suggestions` - Get schedule recommendations**

**Files**: `apps/backend/src/routes/*.ts`, `apps/backend/src/controllers/*.ts`, `apps/backend/src/services/*.ts`

### 3b. AI Assistant Backend
- [x] Create `assistantRoutes.ts` with chat endpoint
- [x] Create `assistantController.ts` for request handling
- [x] Create `assistantService.ts` with scheduling analysis logic
- [x] Implement context builder (tasks + calendar + preferences)
- [x] Implement recommendation generator
- [x] Add conversation history support (optional: persist to DB)

**Files**: `apps/backend/src/routes/assistantRoutes.ts`, `apps/backend/src/services/assistantService.ts`

---

## Phase 2: Scheduling Engine

### 4. Scheduling Package
- [x] Define types: `TaskInput`, `CalendarEvent`, `UserPreferences`, `ScheduledBlock`
- [x] Implement `scheduleTasks(...)` function
- [x] Normalize times to user timezone (luxon)
- [x] Build daily working windows from wake/sleep
- [x] Subtract busy intervals from free slots
- [x] Sort tasks by due date, then priority
- [x] Find earliest fitting slot for each task
- [x] Mark `overflowedDeadline` when needed

**Files**: `packages/scheduling/src/types.ts`, `packages/scheduling/src/scheduleTasks.ts`

### 5. Scheduling Tests
- [x] Test: Single task on single day
- [x] Test: Two tasks, different priorities, same due date
- [x] Test: Task overflows deadline
- [x] Test: Events fill most of the day
- [x] Test: Tasks without due dates
- [x] Test: Wake/sleep boundaries respected

**Files**: `packages/scheduling/__tests__/scheduleTasks.test.ts`

---

## Phase 3: Shared Package

### 6. Shared Types
- [x] User DTOs
- [x] Task DTOs
- [x] Calendar event DTOs
- [x] Schedule request/response DTOs
- [x] Date utility functions

**Files**: `packages/shared/src/types/*.ts`, `packages/shared/src/utils/*.ts`

---

## Phase 4: Web Frontend

### 7. Web App Setup
- [x] Initialize Next.js with TypeScript
- [x] Configure Tailwind CSS
- [x] Set up API proxy to backend
- [x] Create Layout component with navigation

**Files**: `apps/web/package.json`, `apps/web/tailwind.config.js`, `apps/web/next.config.js`

### 8. Web Pages
- [x] Home page with auth CTA
- [x] Tasks page with list and "Smart Schedule" button
- [x] Calendar page with react-big-calendar
- [x] Settings page with preferences form
- [x] Auth callback handler
- [x] Auth error page
- [x] **AI Assistant page with chat interface**

**Files**: `apps/web/src/app/*/page.tsx`

### 9. Web Components
- [x] TaskList with create/complete/delete
- [x] CalendarView with task events styling
- [x] API client wrapper
- [x] **ChatMessage component (user/AI bubbles)**
- [x] **ChatInput component with send button**
- [x] **TypingIndicator animation**
- [x] **SchedulePreviewCard for AI suggestions**
- [x] **FloatingAssistantButton (icon)**
- [x] **QuickActionChips ("Show today", "Schedule all")**

**Files**: `apps/web/src/components/*.tsx`, `apps/web/src/lib/api.ts`, `apps/web/src/hooks/*.ts`

### 9b. AI Assistant Feature
- [x] Create `/assistant` page with modern chat UI
- [x] Design AI avatar/icon for assistant
- [x] Implement chat message history state
- [x] Add typing indicator while AI responds
- [x] Create quick action chips for common queries
- [x] Display inline schedule preview cards
- [x] Add "Apply Schedule" button to commit suggestions
- [ ] Add floating assistant icon on Tasks/Calendar pages (optional enhancement)

**Files**: `apps/web/src/app/assistant/page.tsx`, `apps/web/src/components/chat/*.tsx`

---

## Phase 5: Mobile App

### 10. Mobile App Setup
- [x] Initialize Expo project
- [x] Set up React Navigation
- [x] Create API client with SecureStore

**Files**: `apps/mobile/package.json`, `apps/mobile/app.json`, `apps/mobile/App.tsx`

### 11. Mobile Screens
- [x] Today's Agenda screen (grouped by date)
- [x] Task List screen with filters
- [x] Task actions (complete, delete)

**Files**: `apps/mobile/src/screens/*.tsx`, `apps/mobile/src/hooks/*.ts`

---

## Phase 6: Documentation & Polish

### 12. AI Architecture Docs
- [x] Create `CLAUDE.md` for TimeFlow
- [x] Create `TASKS.md` checklist
- [x] Create `ARCHITECTURE_DECISIONS.md`
- [x] Create sprint roadmap files

**Files**: `CLAUDE.md`, `TASKS.md`, `ARCHITECTURE_DECISIONS.md`

### 13. Outstanding TODOs

These items are marked as TODO in the codebase and need attention before production:

- [ ] **Auth**: Replace user ID token with proper JWT signing
- [ ] **Auth**: Implement token expiry and refresh in frontend
- [ ] **Backend**: Add request validation schemas (Fastify)
- [ ] **Backend**: Add rate limiting
- [ ] **Backend**: Encrypt Google refresh tokens at rest
- [ ] **Env**: Fix Supabase `DATABASE_URL` (Prisma migrate dev fails: "Tenant or user not found")
- [x] **Scheduling**: Wire `@timeflow/scheduling` import in `scheduleService.ts`
- [ ] **Web**: Implement task edit modal
- [ ] **Web**: Add drag-and-drop reschedule in calendar
- [ ] **Mobile**: Implement Google OAuth flow with expo-auth-session
- [ ] **Mobile**: Add task creation form
- [ ] **Testing**: Add backend integration tests
- [ ] **Testing**: Add web E2E tests (Playwright)
- [ ] **CI/CD**: Set up GitHub Actions

---

## Quick Reference

| Area | Status | Key Files |
|------|--------|-----------|
| Monorepo | ✅ Done | `package.json`, `pnpm-workspace.yaml` |
| Backend API | ✅ Done | `apps/backend/src/**` |
| Prisma Schema | ✅ Done | `apps/backend/prisma/schema.prisma` |
| Scheduling Engine | ✅ Done | `packages/scheduling/src/**` |
| Shared Types | ✅ Done | `packages/shared/src/**` |
| Web App | ✅ Done | `apps/web/src/**` |
| Mobile App | ✅ Done | `apps/mobile/src/**` |
| AI Docs | ✅ Done | `CLAUDE.md`, `TASKS.md` |
| **AI Assistant** | ✅ Done | `apps/web/src/app/assistant/**`, `apps/backend/src/services/assistantService.ts` |

---

**Last Updated**: 2025-12-03

