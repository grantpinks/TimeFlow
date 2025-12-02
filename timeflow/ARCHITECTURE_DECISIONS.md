# Architecture Decision Records

This document captures significant architectural decisions for TimeFlow.

---

## ADR-001: pnpm Workspaces for Monorepo

**Date**: 2025-12-02
**Status**: Accepted

### Context

TimeFlow requires shared code between backend, web, and mobile apps. We need a monorepo structure to manage multiple packages with shared dependencies.

### Options Considered

1. **npm workspaces** - Native, but slower, no strict peer deps
2. **yarn workspaces** - Mature, but plug'n'play complexity
3. **pnpm workspaces** - Fast, strict, efficient disk usage

### Decision

Use **pnpm workspaces** for the monorepo structure.

### Rationale

- Fastest install times due to content-addressable storage
- Strict dependency resolution prevents phantom dependencies
- Excellent TypeScript path alias support
- Active community and good Next.js/Expo compatibility

### Consequences

- Developers must install pnpm (`npm install -g pnpm`)
- Lock file is `pnpm-lock.yaml`, not `package-lock.json`
- Some older tutorials may need adaptation

---

## ADR-002: Fastify over Express

**Date**: 2025-12-02
**Status**: Accepted

### Context

The backend needs an HTTP framework for the REST API. The Project_spec.md suggested either Express or Fastify.

### Options Considered

1. **Express** - Most popular, huge ecosystem, familiar
2. **Fastify** - Faster, modern, better TypeScript support

### Decision

Use **Fastify** for the backend HTTP framework.

### Rationale

- 2-3x faster than Express in benchmarks
- Built-in schema validation support
- Better TypeScript types out of the box
- Plugin architecture is cleaner
- Still has a large ecosystem

### Consequences

- Middleware patterns differ from Express
- Some Express-only packages need alternatives
- Team may need to learn Fastify patterns

---

## ADR-003: Prisma + PostgreSQL for Database

**Date**: 2025-12-02
**Status**: Accepted

### Context

The app needs persistent storage for users, tasks, and scheduled task mappings.

### Options Considered

1. **Raw SQL** - Full control, but error-prone
2. **TypeORM** - Mature, but complex configuration
3. **Prisma** - Modern, type-safe, great DX

### Decision

Use **Prisma ORM with PostgreSQL**.

### Rationale

- Generated TypeScript types from schema
- Migrations are straightforward
- Prisma Studio for debugging
- Works well with Neon/Supabase for hosted PostgreSQL
- Project_spec.md explicitly recommends this stack

### Consequences

- Schema changes require migration workflow
- Some advanced SQL features need raw queries
- Prisma Client adds to bundle size

---

## ADR-004: Next.js App Router for Web

**Date**: 2025-12-02
**Status**: Accepted

### Context

The web frontend needs a React framework with routing, SSR capabilities, and good developer experience.

### Options Considered

1. **Create React App** - Deprecated, no SSR
2. **Vite + React Router** - Fast, but manual setup
3. **Next.js Pages Router** - Stable, file-based routing
4. **Next.js App Router** - Modern, React Server Components

### Decision

Use **Next.js 14 with App Router**.

### Rationale

- File-based routing reduces boilerplate
- Server Components for future optimization
- Built-in API routes (though we use separate backend)
- Easy deployment to Vercel/other platforms
- Project_spec.md recommends Next.js

### Consequences

- Learning curve for App Router patterns
- Some libraries not yet compatible with Server Components
- Client components need 'use client' directive

---

## ADR-005: Tailwind CSS for Styling

**Date**: 2025-12-02
**Status**: Accepted

### Context

The web app needs a styling approach that enables rapid UI development.

### Options Considered

1. **CSS Modules** - Scoped, but verbose
2. **styled-components** - CSS-in-JS, but runtime cost
3. **Tailwind CSS** - Utility-first, fast iteration

### Decision

Use **Tailwind CSS** for web styling.

### Rationale

- Rapid prototyping with utility classes
- No context switching between files
- Built-in design system constraints
- Small production bundle with purging
- Project_spec.md suggests Tailwind

### Consequences

- HTML can become verbose with many classes
- Team needs to learn Tailwind conventions
- Custom components may need extraction

---

## ADR-006: Pure Scheduling Engine Package

**Date**: 2025-12-02
**Status**: Accepted

### Context

The scheduling algorithm is core business logic that should be testable, portable, and maintainable.

### Options Considered

1. **Inline in backend service** - Simple, but tightly coupled
2. **Shared utility function** - Reusable, but no clear boundary
3. **Separate package** - Clear boundary, fully testable

### Decision

Create `packages/scheduling` as a **pure TypeScript library** with no external dependencies on databases or APIs.

### Rationale

- Pure functions are easy to unit test
- Can be used in backend, web (for preview), or other contexts
- Clear separation of concerns
- Algorithm changes don't require backend changes
- Project_spec.md explicitly requires this structure

### Consequences

- Data must be transformed to/from package types
- Package versioning adds complexity
- Need to ensure type alignment with Prisma models

---

## ADR-007: Luxon for Date/Time Handling

**Date**: 2025-12-02
**Status**: Accepted

### Context

The scheduling engine needs robust timezone-aware date/time operations.

### Options Considered

1. **Native Date** - Limited timezone support
2. **Moment.js** - Legacy, large bundle
3. **date-fns** - Modular, but timezone support via separate package
4. **Luxon** - Modern, built-in timezone support

### Decision

Use **Luxon** for all date/time operations in the scheduling engine.

### Rationale

- First-class timezone support with IANA identifiers
- Immutable DateTime objects
- Clear API for intervals and durations
- Maintained by Moment.js team as successor
- Reasonable bundle size

### Consequences

- Learning curve for Luxon API
- Must convert between Luxon and JS Date at boundaries
- react-big-calendar also uses Luxon (consistency)

---

## ADR-008: Google OAuth2 for Authentication

**Date**: 2025-12-02
**Status**: Accepted

### Context

Users need to authenticate and authorize calendar access.

### Options Considered

1. **Email/password** - Requires separate calendar OAuth anyway
2. **Multiple OAuth providers** - Complex for MVP
3. **Google OAuth only** - Simplest, covers calendar needs

### Decision

Use **Google OAuth2 as the sole authentication method** for MVP.

### Rationale

- Single sign-on covers both auth and calendar authorization
- Reduces signup friction
- Google Calendar is the MVP target
- Can add other providers in future phases

### Consequences

- Users without Google accounts cannot use the app
- Apple users may prefer Apple Calendar (Phase 2)
- Need to handle token refresh carefully

---

## ADR-009: Expo for Mobile Development

**Date**: 2025-12-02
**Status**: Accepted

### Context

The mobile app needs to support both iOS and Android with code sharing.

### Options Considered

1. **Native (Swift + Kotlin)** - Best performance, but two codebases
2. **Flutter** - Cross-platform, but different language (Dart)
3. **React Native (bare)** - JS, but complex native setup
4. **Expo** - React Native with managed workflow

### Decision

Use **Expo** for mobile development.

### Rationale

- Shares React knowledge with web team
- Managed workflow simplifies builds
- expo-auth-session for OAuth
- expo-secure-store for token storage
- Easy to eject if needed later
- Project_spec.md recommends Expo

### Consequences

- Some native modules not available in Expo
- Expo Go has limitations for testing
- EAS Build needed for production apps

---

## ADR-010: REST API over GraphQL

**Date**: 2025-12-02
**Status**: Accepted

### Context

The backend needs to expose data to web and mobile clients.

### Options Considered

1. **GraphQL** - Flexible queries, but complexity overhead
2. **REST** - Simple, well-understood patterns
3. **tRPC** - Type-safe, but requires specific client setup

### Decision

Use **REST API** for the backend.

### Rationale

- Simple and well-understood
- Easy to test and debug
- Good fit for CRUD operations
- Can add GraphQL later if query flexibility needed
- Project_spec.md explicitly specifies REST

### Consequences

- May need multiple requests for complex views
- No built-in schema introspection
- Potential over-fetching

---

## Future Considerations

These decisions may need revisiting as TimeFlow evolves:

1. **Apple Calendar Integration** - Will require EventKit on iOS, may need native module
2. **Real-time Updates** - May need WebSockets or Server-Sent Events
3. **Offline Support** - May need local database and sync logic
4. **Performance Optimization** - May need React Server Components or edge functions

---

**Last Updated**: 2025-12-02

