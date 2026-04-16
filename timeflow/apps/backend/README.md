# TimeFlow Backend

Fastify + Prisma + PostgreSQL backend for the TimeFlow productivity app.

## Quick Start

### Prerequisites

- Node.js 20+
- pnpm
- PostgreSQL database (local or cloud)
- Google Cloud Console project with OAuth2 credentials

### Setup

1. **Install dependencies** (from repo root):

   ```bash
   pnpm install
   ```

2. **Configure environment**:

   ```bash
   cd apps/backend
   cp .env.example .env
   # Edit .env with your database URL and Google OAuth credentials
   ```

3. **Run database migrations**:

   ```bash
   pnpm prisma migrate dev
   ```

4. **Start development server**:

   ```bash
   pnpm dev
   ```

   The backend runs at `http://localhost:3001`.

## API Endpoints

### Authentication

| Method | Endpoint                    | Description                    |
| ------ | --------------------------- | ------------------------------ |
| GET    | `/api/auth/google/start`    | Redirects to Google OAuth      |
| GET    | `/api/auth/google/callback` | Handles OAuth callback         |

### User

| Method | Endpoint               | Description           |
| ------ | ---------------------- | --------------------- |
| GET    | `/api/user/me`         | Get current user      |
| PATCH  | `/api/user/preferences`| Update user prefs     |

### Tasks

| Method | Endpoint                   | Description         |
| ------ | -------------------------- | ------------------- |
| GET    | `/api/tasks`               | List tasks          |
| POST   | `/api/tasks`               | Create task         |
| PATCH  | `/api/tasks/:id`           | Update task         |
| DELETE | `/api/tasks/:id`           | Delete task         |
| POST   | `/api/tasks/:id/complete`  | Mark task complete  |

### Calendar

| Method | Endpoint              | Description               |
| ------ | --------------------- | ------------------------- |
| GET    | `/api/calendar/events`| Get events in date range  |
| GET    | `/api/calendar/list`  | List user's calendars     |

### Scheduling

| Method | Endpoint               | Description            |
| ------ | ---------------------- | ---------------------- |
| POST   | `/api/schedule`        | Run smart scheduling   |
| PATCH  | `/api/schedule/:taskId`| Manually reschedule    |

## Project Structure

```
apps/backend/
├── prisma/
│   └── schema.prisma      # Database schema
├── src/
│   ├── config/            # Environment, Prisma, Google API config
│   ├── controllers/       # Route handlers
│   ├── middlewares/       # Auth middleware
│   ├── routes/            # Route registration
│   ├── services/          # Business logic
│   ├── types/             # TypeScript types
│   ├── index.ts           # Entry point
│   └── server.ts          # Fastify server factory
├── .env.example
├── package.json
└── tsconfig.json
```

## AI assistant (Flow) — models

- **Local development:** See repo root [`LOCAL_LLM_SETUP.md`](../../LOCAL_LLM_SETUP.md) (Ollama / Llama 3.2).
- **Official QA / must-pass:** Set `OPENAI_API_KEY`, `OPENAI_MODEL=gpt-4o`, and `LLM_PROVIDER=openai` in `.env` (see same guide — “Official QA and staging”).

Credits for `POST /api/assistant/chat` are deducted **once per request** after the assistant finishes processing (internal LLM retries inside that request do not double-charge).

## Google OAuth Setup

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select existing
3. Enable the Google Calendar API
4. Create OAuth 2.0 credentials (Web application)
5. Add authorized redirect URI: `http://localhost:3001/api/auth/google/callback`
6. Copy Client ID and Client Secret to `.env`

## Scripts

| Script          | Description                          |
| --------------- | ------------------------------------ |
| `pnpm dev`      | Start development server with tsx    |
| `pnpm build`    | Compile TypeScript                   |
| `pnpm start`    | Run compiled code                    |
| `pnpm lint`     | Run ESLint                           |
| `pnpm test`     | Run tests                            |
| `pnpm prisma`   | Prisma CLI commands                  |
| `pnpm rename-timeflow-events` | Rename existing Google events to match current TimeFlow prefix (supports `--dry-run`) |
