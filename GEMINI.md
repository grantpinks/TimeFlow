# GEMINI AGENT DIRECTIVES

---

**Project Name**: TimeFlow
**Version**: 1.0
**Last Updated**: 2026-01-04

---

## Project Overview

TimeFlow is a cross-device productivity app that lets users quickly capture tasks and automatically schedule them into their Google Calendar based on due dates, duration, priority, and personal preferences.

This project is a TypeScript monorepo managed with pnpm workspaces. It consists of a backend API, a web client, and a mobile client, along with shared packages for types and the scheduling engine.

### Key Technologies

*   **Monorepo:** pnpm workspaces
*   **Backend:** Fastify, Prisma, PostgreSQL, TypeScript
*   **Frontend (Web):** Next.js, Tailwind CSS, TypeScript
*   **Frontend (Mobile):** React Native, Expo, TypeScript
*   **Shared Packages:** Pure TypeScript for scheduling logic and shared types.

### Architecture

*   The backend exposes a REST API for the web and mobile clients.
*   Authentication is handled via Google OAuth2, which also provides access to the user's Google Calendar.
*   The core scheduling logic is encapsulated in a separate, pure TypeScript package.
*   An AI-powered scheduling assistant helps users plan their tasks.

## Building and Running

### Prerequisites

*   Node.js 20+
*   pnpm (`npm install -g pnpm`)
*   PostgreSQL database

### Getting Started

From the `timeflow` directory:

```bash
# Install dependencies
pnpm install

# Run backend API (http://localhost:3001)
pnpm dev:backend

# Run web app (http://localhost:3000)
pnpm dev:web

# Run mobile app (Expo)
pnpm dev:mobile
```

### Database

The backend uses Prisma for database access.

```bash
# Navigate to the backend directory
cd timeflow/apps/backend

# Apply database migrations
pnpm prisma migrate dev

# Open Prisma Studio to view and edit data
pnpm prisma studio
```

### Testing

```bash
# Run all tests
pnpm test

# Run tests for a specific package (e.g., scheduling)
pnpm -C packages/scheduling test
```

## Development Conventions

This project follows the AI-Powered Development Architecture Template.

*   **Agent Roles:** The project has clearly defined roles for AI agents (Architect, Codex, Gemini, etc.). Refer to `timeflow/CLAUDE.md` for details.
*   **Documentation:** All agents are responsible for keeping the documentation up-to-date. A task is not considered complete until the documentation is updated.
*   **Architecture Decision Records (ADRs):** Significant architectural decisions are documented in `timeflow/ARCHITECTURE_DECISIONS.md`.
*   **Task Tracking:** The implementation status of the project is tracked in `timeflow/TASKS.md`.
*   **Coding Style:** The project uses ESLint and Prettier for code formatting and linting.

## Key Files

*   `timeflow/CLAUDE.md`: Strategic directives for AI agents, including project overview, tech stack, and data models.
*   `timeflow/TASKS.md`: Implementation checklist and project status.
*   `timeflow/ARCHITECTURE_DECISIONS.md`: Log of significant architectural decisions.
*   `timeflow/package.json`: Root package.json with scripts for running the entire project.
*   `timeflow/pnpm-workspace.yaml`: Defines the pnpm workspaces.
*   `timeflow/apps/backend`: The Fastify backend application.
*   `timeflow/apps/web`: The Next.js web application.
*   `timeflow/apps/mobile`: The React Native (Expo) mobile application.
*   `timeflow/packages/scheduling`: The pure TypeScript scheduling engine.
*   `timeflow/packages/shared`: Shared types and utilities.
