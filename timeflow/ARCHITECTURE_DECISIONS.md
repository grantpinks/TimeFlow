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

## ADR-011: Database Schema for Conversation History

**Date**: 2025-12-11
**Status**: Accepted

### Context

The AI Assistant feature requires a way to store and retrieve conversation history. This allows users to view past interactions and for the assistant to have context in multi-turn conversations.

### Decision

Add two new models to the Prisma schema: `Conversation` and `ConversationMessage`.

-   **`Conversation`**: Represents a single conversation thread. It has a relation to the `User` and can have an optional title.
-   **`ConversationMessage`**: Represents a single message within a conversation. It includes the `role` ("user" or "assistant"), the `content` of the message, and a `metadata` field for additional information.

### Rationale

-   **Separation of Concerns**: A `Conversation` groups related messages, making it easy to retrieve an entire chat history.
-   **Scalability**: This one-to-many relationship is efficient for querying and allows for long conversations without duplicating user data.
-   **Flexibility**: The `metadata` field on `ConversationMessage` allows for storing structured data related to a message, such as UI state or tool-call information, without polluting the main content.
-   **Cascading Deletes**: The schema is set up to delete all messages in a conversation when the parent conversation is deleted, ensuring data integrity.

### Consequences

-   The database size will grow more quickly as conversation data is stored.
-   API endpoints and services are required to manage conversations and messages (create, read, update, delete).
-   Care must be taken to handle potentially large `content` fields in messages.

---

**Last Updated**: 2025-12-11

---

## ADR-012: Pricing Model & Tier Structure

**Date**: 2026-01-03
**Status**: Accepted

### Context

As TimeFlow transitions beyond its beta phase and solidifies its commercial strategy, a formal pricing model is required to monetize the advanced features, manage API costs, and provide clear value propositions to different user segments. The current "pricing" page is a placeholder for beta access.

### Decision

Implement a three-tiered pricing model: **Starter (Free), Pro ($5/month), and Flow State ($11.99/month)**. This model incorporates a credit-based system ("Flow Credits") for API usage, with defined overuse charges for paid tiers, and offers a discount for annual subscriptions.

For comprehensive details on features per tier, Flow Credit costs, monthly allotments, and overuse charges, refer to the `docs/PRICING_MODEL.md` document.

### Rationale

-   **Monetization:** Establishes clear revenue streams to support ongoing development and infrastructure costs.
-   **Scalability & Cost Management:** The credit-based system and overuse charges allow for flexible API usage while mitigating runaway costs associated with resource-intensive features (e.g., AI).
-   **User Acquisition & Retention:** A robust free tier attracts new users, while distinct paid tiers provide compelling reasons to upgrade, catering to different user needs and budgets.
-   **Value Alignment:** Features are carefully distributed to ensure each tier offers a clear value proposition, encouraging users to find the plan that best fits their productivity requirements.
-   **Market Competitiveness:** The pricing structure is designed to be competitive within the productivity software market, offering advanced AI features at compelling price points.

### Consequences

-   Requires significant development effort for implementing the pricing page, subscription management, and billing system integration.
-   Mandates the development of robust API usage tracking and credit deduction mechanisms.
-   Impacts UI/UX, as the application will need to clearly communicate current credit usage, tier benefits, and upgrade paths.
-   Requires legal review for terms of service related to billing, overuse, and subscriptions.
-   The `timeflow/apps/web/src/app/pricing/page.tsx` will need to be entirely re-designed and implemented based on the `docs/PRICING_MODEL.md` specifications.

