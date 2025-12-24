# TimeFlow Monorepo

TimeFlow is a cross-device productivity app that lets users quickly capture tasks and automatically
schedule them into their calendar based on due dates, duration, priority, and personal preferences.

This repository is structured as a TypeScript monorepo managed with **pnpm workspaces**, with apps
for the backend API, web client, and mobile client, plus shared packages for types and the
scheduling engine.

## Structure

- `apps/backend` – Fastify + Prisma API server (Google Calendar integration, tasks, scheduling)
- `apps/web` – Next.js web client (task list, calendar view, settings)
- `apps/mobile` – Expo / React Native mobile client (task list and today agenda)
- `packages/shared` – Shared TypeScript types and utilities
- `packages/scheduling` – Pure scheduling engine used by the backend

## Prerequisites

- Node.js 20+
- pnpm (`npm install -g pnpm`)
- PostgreSQL database

For Windows developer setup (Cursor, Node, Python, Git, etc.) you can use the existing
`setup-windows.ps1` script in the parent directory of this project.

## Getting Started

From the `timeflow` directory:

```bash
pnpm install

# Run backend API
pnpm dev:backend

# Run web app
pnpm dev:web

# Run mobile app (Expo)
pnpm dev:mobile
```

For detailed instructions on managing the development stack (starting, restarting, shutting down), see `docs/STACK_MANAGEMENT.md`.

## AI Regression Harness

The AI regression prompt harness lives under `apps/backend/scripts`. For full setup and usage,
see `docs/SPRINT_13_AI_REGRESSION_RUNBOOK.md`.

## Sprint 7 additions

- Habit scheduling suggestions (`GET /api/habits/suggestions`) surfaced on the Today page for active habits (read-only, non-committed).
- Gmail inbox preview (`GET /api/email/inbox`) with Focused/All toggle on the Today page. Requires Google account connection with Gmail read-only scope; use Settings → Google Connection to reconnect if needed.

## Environment Variables

The backend uses a `.env` file under `apps/backend`. See `apps/backend/.env.example` for the
complete list and descriptions of required variables (database URL, Google OAuth credentials,
session secret, etc.).

## AI Development Workflow

This repo integrates the AI architecture template from `AI_ARCHITECTURE_COMPLETE_TEMPLATE.md`.
See `CLAUDE.md`, `TASKS.md`, and the sprint/ADR docs in this directory for how to collaborate with
AI coding agents on TimeFlow.


