# CODEX AGENT DIRECTIVES

---

**Agent**: Codex
**Project**: TimeFlow
**Role**: Backend Implementation & Infrastructure
**Last Updated**: 2025-12-02

---

## Primary Responsibility

Implement backend features, algorithms, infrastructure, and core application logic.

---

## Capabilities

- Write production-quality TypeScript code
- Implement business logic and services
- Build API endpoints and controllers
- Create database schemas and migrations
- Write unit and integration tests
- Fix bugs and performance issues
- Set up development tooling and CI/CD

---

## Constraints

- **MUST** write tests for all new features
- **MUST** update documentation when implementation changes
- **MUST** log all errors appropriately
- **MUST** follow existing code patterns and conventions
- **MUST** use TypeScript strict mode
- **NEVER** commit secrets or credentials
- **NEVER** skip error handling

---

## Key Files & Directories

```
apps/backend/
├── src/
│   ├── config/          # Environment, Prisma, Google API config
│   ├── controllers/     # Route handlers
│   ├── middlewares/     # Auth middleware
│   ├── routes/          # Route registration
│   ├── services/        # Business logic
│   ├── types/           # TypeScript types
│   ├── index.ts         # Entry point
│   └── server.ts        # Fastify server factory
├── prisma/
│   └── schema.prisma    # Database schema
└── package.json

packages/scheduling/
├── src/
│   ├── index.ts
│   ├── scheduleTasks.ts # Core scheduling algorithm
│   └── types.ts
└── __tests__/

packages/shared/
├── src/
│   ├── types/           # Shared DTOs
│   └── utils/           # Shared utilities
└── package.json
```

---

## Tech Stack Reference

| Layer | Technology |
|-------|------------|
| Runtime | Node.js 20+ |
| Language | TypeScript (strict) |
| Framework | Fastify |
| Database | PostgreSQL |
| ORM | Prisma |
| Auth | Google OAuth2 + JWT |
| Calendar API | googleapis |
| Testing | Vitest / Jest |

---

## API Endpoints to Implement/Maintain

### Auth
- `POST /api/auth/google/start` - Redirect to Google OAuth
- `GET /api/auth/google/callback` - Handle OAuth callback

### User
- `GET /api/user/me` - Get current user profile
- `PATCH /api/user/preferences` - Update preferences

### Tasks
- `GET /api/tasks` - List tasks (optional status filter)
- `POST /api/tasks` - Create task
- `PATCH /api/tasks/:id` - Update task
- `DELETE /api/tasks/:id` - Delete task
- `POST /api/tasks/:id/complete` - Mark complete

### Calendar
- `GET /api/calendar/events` - Fetch Google Calendar events
- `GET /api/calendar/list` - List user's calendars

### Scheduling
- `POST /api/schedule` - Run smart scheduling
- `PATCH /api/schedule/:taskId` - Manual reschedule

### AI Assistant (Sprint 3+)
- `POST /api/assistant/chat` - AI conversation endpoint
- `GET /api/assistant/suggestions` - Get schedule recommendations

---

## Code Style Guidelines

### File Naming
- `camelCase` for files: `tasksService.ts`, `authController.ts`
- One module per file
- Group by feature in directories

### Function Style
```typescript
/**
 * Brief description of what the function does.
 */
export async function createTask(input: CreateTaskInput): Promise<Task> {
  // Implementation
}
```

### Error Handling
```typescript
try {
  const result = await someOperation();
  return result;
} catch (error) {
  request.log.error(error, 'Context about what failed');
  return reply.status(500).send({ error: 'User-friendly message' });
}
```

### Service Pattern
- Controllers handle HTTP request/response
- Services contain business logic
- Services are stateless and testable

---

## Testing Requirements

1. **Unit tests** for all service functions
2. **Integration tests** for API endpoints
3. **Edge case coverage** for scheduling algorithm
4. Minimum **80% coverage** for core business logic

Run tests:
```bash
cd packages/scheduling && pnpm test
cd apps/backend && pnpm test
```

---

## Current Sprint Tasks

See `ARCHITECT_ROADMAP_SPRINT1-5.md` for task assignments marked with `Codex`.

---

## Handoff Notes

When completing a task:
1. Ensure all tests pass
2. Update relevant documentation
3. Note any TODOs left for future work
4. List files modified in commit message

---

**Remember**: Quality over speed. Write code that future developers (and AI agents) can understand and maintain.

