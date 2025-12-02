1. Product Overview

Concept:
TimeFlow is a cross-device productivity app that lets users quickly jot down tasks and then automatically schedules those tasks into their Google Calendar (and later Apple Calendar), respecting:

Task due dates

Task duration & priority

User’s wake/sleep times

Existing calendar events

Key flows:

Task List → Smart Schedule → Calendar Sync

Works on web/desktop and mobile (iOS/Android).

MVP Targets:

Google Calendar integration (OAuth2, read/write)

Simple scheduling algorithm (no overlaps, respect availability)

Task list view + calendar view

Wake/sleep & default duration preferences

Apple Calendar support can be scoped for v2.

2. Functional Requirements
2.1 Task Capture

Users can create tasks with:

title (required)

description (optional)

durationMinutes (default: 30, editable)

priority (1–3 or Low/Medium/High)

Target timing: Today, Tomorrow, In 2 Days, Custom date

Tasks start as unscheduled until the user runs “Smart Schedule”.

Users can:

Edit tasks

Delete tasks

Mark tasks as completed

2.2 Smart Scheduling

User sets:

wakeTime (e.g., 08:00)

sleepTime (e.g., 23:00)

timeZone

When user clicks “Smart Schedule”:

Backend fetches:

User’s unscheduled tasks

User’s existing events from their selected Google calendar over a configurable range (e.g., next 7–14 days).

Runs scheduling algorithm:

Sort tasks by due date ASC, priority DESC

For each task, finds the earliest free time block between wakeTime and sleepTime that fits durationMinutes and doesn’t overlap events.

If no slot is found before due date:

For MVP: schedule it on the earliest possible slot after due date and set a flag overflowedDeadline: true for that task.

Creates/updates events in Google Calendar for these tasks.

Persists mappings in DB.

2.3 Calendar Sync

Google Calendar (MVP):

OAuth2 sign-in.

User chooses a “Target calendar” (default: primary).

App can:

Read events in a date range.

Create/update events representing tasks.

Sync behavior:

If a task is rescheduled in TimeFlow (e.g., user drags it on the calendar UI), update the corresponding Google event.

If a task is marked as completed, keep the event but mark it as done in app (we won’t auto-delete events in MVP).

Apple Calendar (v2):

Leave stubs / extension points for later EventKit integration on iOS/macOS.

2.4 Views / Screens

Task List View:

Sections: Unscheduled, Scheduled, Completed (or filters).

Each task shows title, due date, duration, priority.

Quick actions: edit, delete, mark complete.

Calendar View (Web):

Week or 3–day view.

Shows:

Existing Google events

Scheduled task-events (visually distinct)

“Smart Schedule” button triggers scheduling endpoint.

Mobile View (Expo):

“Today” agenda list:

Tasks scheduled for today, plus upcoming tasks.

Basic week/day calendar if feasible, or at least a list grouped by date.

Settings View:

Wake time, sleep time

Time zone

Default task duration

Preferred calendar (for Google)

3. Non-Functional Requirements

Language: TypeScript for backend & frontend.

Reliability: Avoid double-booking. Ensure scheduling is idempotent when re-run for the same tasks (or document behavior).

Security:

Store Google refresh tokens securely (encrypted at rest).

Use environment variables for secrets.

Developer Experience:

Clean folder structure with clear boundaries.

ESLint + Prettier setup.

Basic unit tests for scheduling engine.

4. Tech Stack & Architecture
4.1 Proposed Stack

Monorepo (e.g., pnpm or yarn workspaces):

apps/backend – Node.js + TypeScript + Fastify or Express

apps/web – React (Next.js preferred)

apps/mobile – React Native via Expo

packages/shared – shared types, utils

packages/scheduling – pure scheduling engine

Backend:

Node.js + TypeScript

Fastify or Express

Prisma + PostgreSQL

Google APIs Node client

Frontend Web:

Next.js + React + TypeScript

UI library: Tailwind or simple CSS modules

Calendar component: e.g., react-big-calendar or similar

Mobile:

Expo + React Native

Uses backend API for tasks/scheduling

Google auth via webview / expo-auth-session (Cursor doesn’t need to fully implement, but scaffold)

Auth:

Simple session / JWT (one provider is fine).

Google OAuth2 for calendar access.

Hosting (assumptions):

Backend + web: can be deployed to any Node-friendly host (Render/Railway/VPS).

DB: e.g., Supabase, Neon, or other Postgres.

5. Data Models

Use Prisma or an equivalent ORM. Suggested schema:

model User {
  id                 String   @id @default(cuid())
  email              String   @unique
  createdAt          DateTime @default(now())
  updatedAt          DateTime @updatedAt

  // Google integration
  googleId           String?  @unique
  googleRefreshToken String?
  googleAccessToken  String?  // can be short-lived, refreshed as needed
  googleAccessTokenExpiry DateTime?

  // Preferences
  timeZone           String   @default("America/Chicago")
  wakeTime           String   @default("08:00") // "HH:mm"
  sleepTime          String   @default("23:00") // "HH:mm"
  defaultTaskDurationMinutes Int @default(30)
  defaultCalendarId  String? // Google calendar id

  tasks              Task[]
  scheduledTasks     ScheduledTask[]
}

model Task {
  id                String   @id @default(cuid())
  userId            String
  user              User     @relation(fields: [userId], references: [id])

  title             String
  description       String?
  durationMinutes   Int      @default(30)
  priority          Int      @default(2) // 1 = high, 2 = medium, 3 = low
  status            String   @default("unscheduled") // unscheduled | scheduled | completed

  dueDate           DateTime?
  createdAt         DateTime @default(now())
  updatedAt         DateTime @updatedAt

  scheduledTask     ScheduledTask?
}

model ScheduledTask {
  id                String   @id @default(cuid())
  taskId            String   @unique
  task              Task     @relation(fields: [taskId], references: [id])

  provider          String   // "google" | "apple"
  calendarId        String   // e.g., Google calendar ID
  eventId           String   // provider event ID

  startDateTime     DateTime
  endDateTime       DateTime

  overflowedDeadline Boolean @default(false)
  lastSyncedAt      DateTime @default(now())
}


Cursor: you can adjust details but preserve the intent and relationships.

6. API Design

Create a REST API (later could be GraphQL, but REST is fine for MVP).

6.1 Auth & User

POST /api/auth/google/start

Redirect URL for Google OAuth2.

GET /api/auth/google/callback

Handles OAuth callback, stores tokens, and creates user session/JWT.

GET /api/user/me

Returns profile + preferences.

PATCH /api/user/preferences

Update:

wakeTime, sleepTime, timeZone, defaultTaskDurationMinutes, defaultCalendarId.

6.2 Tasks

GET /api/tasks

Query params:

status (optional: unscheduled/scheduled/completed)

Returns list of tasks.

POST /api/tasks

Body:

{
  "title": "Study FIN 330",
  "description": "Review CAPM notes",
  "durationMinutes": 45,
  "priority": 1,
  "dueDate": "2025-12-03T00:00:00Z"
}


PATCH /api/tasks/:id

Update task fields (title, description, priority, duration, due date, status).

DELETE /api/tasks/:id

POST /api/tasks/:id/complete

Set status to completed.

6.3 Calendar & Scheduling

GET /api/calendar/events

Query params:

from (ISO)

to (ISO)

Uses user’s default calendar and Google tokens.

Returns normalized event list.

POST /api/schedule

Body (MVP):

{
  "taskIds": ["task1", "task2", "task3"],
  "dateRangeStart": "2025-12-01T00:00:00Z",
  "dateRangeEnd": "2025-12-14T23:59:59Z"
}


Steps:

Fetch tasks by IDs.

Fetch events from calendar in given range.

Fetch user preferences.

Call scheduling engine to compute (taskId, start, end) suggestions.

Create/update Google events for each scheduled task.

Persist ScheduledTask mappings.

Return final schedule with flags (e.g. overflowedDeadline).

PATCH /api/schedule/:taskId

Allow manual reschedule:

{
  "startDateTime": "2025-12-02T15:00:00Z",
  "endDateTime": "2025-12-02T15:30:00Z"
}


Updates Google event and ScheduledTask.

7. Scheduling Engine Spec

Put this logic into packages/scheduling as a pure TypeScript library with no external side effects.

7.1 Types

Define types like:

export type Priority = 1 | 2 | 3;

export interface TaskInput {
  id: string;
  durationMinutes: number;
  priority: Priority;
  dueDate?: string; // ISO date string (date-only or datetime)
}

export interface CalendarEvent {
  id?: string;
  start: string; // ISO datetime
  end: string;   // ISO datetime
}

export interface UserPreferences {
  timeZone: string; // e.g. "America/Chicago"
  wakeTime: string; // "HH:mm"
  sleepTime: string; // "HH:mm"
}

export interface ScheduledBlock {
  taskId: string;
  start: string; // ISO datetime
  end: string;   // ISO datetime
  overflowedDeadline?: boolean;
}

7.2 Behavior

Input:

list of TaskInput

list of CalendarEvent (existing events)

UserPreferences

dateRangeStart, dateRangeEnd

Output:

list of ScheduledBlock

Algorithm (MVP):

Normalize all times into the user’s timezone.

Create a structure of busy intervals from existing events.

For each day in [dateRangeStart, dateRangeEnd], determine:

Working window: from wakeTime to sleepTime.

Free windows = working window minus busy intervals.

Sort tasks:

ascending by dueDate (missing dueDates go last)

then by priority (1 high → 3 low).

For each task:

Determine preferred scheduling window:

Ideally on/before dueDate (if provided) within the given dateRange.

Find the earliest day and time with a free interval long enough for durationMinutes.

If all days before dueDate are full:

Place the task in the earliest available slot after dueDate within dateRange and mark overflowedDeadline = true.

Ensure:

No overlapping ScheduledBlocks.

Tasks fall inside wakeTime/sleepTime.

7.3 Testing

Provide Jest tests for:

Simple single-day scheduling with one task.

Two tasks, one high priority, one low, same due date.

Task that doesn’t fit before due date and becomes overflowedDeadline: true.

Edge case where events fill most of the day.

8. Repository Structure

Set up a monorepo such as:

timeflow/
  package.json
  pnpm-workspace.yaml (or yarn workspaces)
  tsconfig.base.json

  apps/
    backend/
      src/
        index.ts
        server.ts
        routes/
        controllers/
        services/
        middlewares/
        config/
      prisma/
        schema.prisma
      package.json
      tsconfig.json

    web/
      src/
        pages/ or app/
        components/
        hooks/
        lib/
      package.json
      tsconfig.json

    mobile/
      App.tsx
      src/
        screens/
        components/
        hooks/
      package.json
      tsconfig.json

  packages/
    shared/
      src/
        types/
        utils/
      package.json
      tsconfig.json

    scheduling/
      src/
        index.ts
        scheduleTasks.ts
      __tests__/
      package.json
      tsconfig.json


Cursor: please:

Initialize workspace configs.

Set up basic build scripts for each app/package.

Configure TypeScript path aliases so packages/* can be imported easily.

9. Dev Environment & Config

Set up .env.example for backend with:

DATABASE_URL=

GOOGLE_CLIENT_ID=

GOOGLE_CLIENT_SECRET=

GOOGLE_REDIRECT_URI=

SESSION_SECRET= or JWT secret

APP_BASE_URL=

Add appropriate README.md at root and inside apps/backend and apps/web that explains:

How to install deps

How to run migrations

How to start backend, web, and mobile

10. Task Checklist for Cursor Agent

Please generate a TASKS.md file at repo root with a checklist such as:

 Initialize monorepo with workspaces.

 Scaffold backend app with Express/Fastify, Prisma, and DB connection.

 Add Prisma models for User, Task, ScheduledTask and run initial migration.

 Implement basic REST routes for tasks (/api/tasks).

 Add Google OAuth2 boilerplate (auth routes, token storage).

 Implement /api/calendar/events to fetch Google Calendar events.

 Implement /api/schedule to call scheduling engine and create events.

 Create packages/scheduling with scheduleTasks(...) and unit tests.

 Scaffold basic Next.js web app with:

Task list page

Calendar page (placeholder component)

 Scaffold basic Expo mobile app with:

Task list screen

Today’s agenda screen

 Set up ESLint + Prettier across workspace.

 Document all environment variables and setup commands.

Each checklist item should reference the relevant file(s) for Claude to expand later.

11. Output Format & Style (For Cursor)

Use TypeScript everywhere.

Prefer small, well-named functions and modules.

Add clear comments in key files (e.g., scheduling engine, calendar service) to explain intent for Claude Code.

For any partial implementations (e.g., auth flows that require secrets), include TODO: comments explaining what remains so that Claude Code can safely continue.

🎯 Extra: Prompt Template for Claude Code (You Can Use Later)

(You don’t need to give this to Cursor; this is for you to keep handy.)

You are Claude Code, acting as a senior full-stack engineer.

We are working inside a monorepo called `timeflow`, which has been architected and scaffolded according to `PROJECT_SPEC.md` and `TASKS.md`.

Goal:
Implement and refine the TimeFlow productivity app: a task list that smart-schedules tasks into Google Calendar.

Context:
- Please start by reading:
  - PROJECT_SPEC.md
  - TASKS.md
  - apps/backend/README.md
  - packages/scheduling/src/*
- Follow the design and data models described there.

Priorities:
1. Finish and thoroughly test `scheduleTasks(...)` in `packages/scheduling`.
2. Wire `/api/schedule` in `apps/backend` to:
   - Fetch tasks
   - Fetch calendar events
   - Call scheduling engine
   - Create/update Google Calendar events
3. Build the web task list + calendar pages in `apps/web`:
   - Use `/api/tasks` and `/api/schedule`.
4. Then improve developer ergonomics and add tests.

Style:
- TypeScript, strict typing.
- Clean separation of concerns (controllers/services).
- Helpful comments for any non-obvious logic.

Always explain what files you changed and why at the end of each step.