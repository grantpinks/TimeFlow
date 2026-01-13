# Sprint Plan: Core Productivity Integrations

**Sprint Goal:** To significantly expand TimeFlow's ecosystem by integrating two critical platforms: **Microsoft 365** and **Notion**. This will enable us to capture a massive new user base and allow users to sync tasks from their primary workspace and calendar, solidifying TimeFlow as their central scheduling hub.

---

### **Integration Strategy (Calendar → Tasks/Projects → Comms)**

**Why this order:**
- **Calendar-first** improves scheduling correctness for every user and unlocks major user bases (Microsoft + Apple/iCloud).
- **Tasks/Projects** captures “already-power-users” and reduces switching costs by syncing their source-of-truth.
- **Comms** turns messages into scheduled work (high retention), but benefits most once tasks + calendar are already solid.

**Principles (applies to every integration):**
- **User value first**: each integration must either (a) improve availability accuracy, (b) reduce capture friction, or (c) reduce context switching.
- **Unified Account model**: every provider connects through `Account` records (provider + tokens + provider metadata).
- **Two-way sync is optional**: default to **one-way import** unless there’s a clear user need and safe idempotency story.
- **“Disconnect” must be safe**: user can revoke access, stop background sync, and optionally keep previously imported entities.
- **Auditability**: for any “writes” (create/update), show *what* will happen before we do it, and log provider request IDs for debugging.

### **Part 1: Microsoft 365 Integration (Priority 1)**

**Objective:** Achieve feature parity with the existing Google integration by adding support for Microsoft accounts (Outlook.com, Microsoft 365) for both calendar synchronization and email-to-task creation.

#### **1.1. Foundational Architectural Change: Unified Account Model**

To support multiple integrations scalably, we must refactor our `User` model. Instead of adding more provider-specific columns, we will create a unified `Account` model.

**New Prisma Schema (`schema.prisma`):**

```prisma
model User {
  id      String   @id @default(cuid())
  email   String   @unique
  // ... other user fields ...
  accounts Account[] // A user can have multiple connected accounts
}

model Account {
  id                   String    @id @default(cuid())
  userId               String
  user                 User      @relation(fields: [userId], references: [id], onDelete: Cascade)
  provider             String    // e.g., "google", "microsoft", "notion"
  providerAccountId    String    // The user's ID on the provider's platform
  accessToken          String?   @db.Text
  refreshToken         String?   @db.Text
  accessTokenExpiresAt DateTime?

  // For Notion-specific data
  notionDatabaseId     String?
  notionFieldMappings  Json?     // e.g., { "title": "Task Name", "dueDate": "Deadline" }

  @@unique([provider, providerAccountId])
}
```

**Task:**
- [ ] Modify `prisma/schema.prisma` to introduce the `Account` model and update the `User` model.
- [ ] Remove `googleId`, `googleRefreshToken`, etc., from the `User` model.
- [ ] Generate and run a Prisma migration to apply these database changes.
- [ ] Create a migration script to move existing Google user data into the new `Account` table.

#### **1.2. Backend Implementation**

**User Workflow:**
1.  User navigates to the "Settings > Integrations" page in the TimeFlow web app.
2.  They click "Connect Microsoft Account."
3.  They are redirected to the Microsoft identity platform to authenticate and grant consent.
4.  Upon success, they are redirected back to TimeFlow, and a new `Account` entry with `provider: 'microsoft'` is created for them.
5.  TimeFlow's backend now uses the stored tokens to fetch calendar events and emails.

**Tasks:**
- [ ] **Authentication:**
    - [ ] Create `authMicrosoftRoutes.ts` to handle the OAuth 2.0 callback from Microsoft.
    - [ ] On successful authentication, create or update the user's `Account` record with the received tokens.
- [ ] **Service Layer:**
    - [ ] Create a new service `services/microsoftGraphService.ts`.
    - [ ] Implement a function `getMicrosoftCalendarEvents(accountId)` that uses the Microsoft Graph API (`/me/calendar/events`) to fetch calendar events.
    - [ ] Implement `createMicrosoftCalendarEvent(accountId, eventData)`.
    - [ ] Refactor `services/scheduleService.ts` to fetch events from *all* connected calendar accounts (Google and Microsoft) to get a complete picture of user availability.
- [ ] **Email-to-Task:**
    - [ ] Create a new route and controller to list a user's flagged emails from Outlook via the `/me/mailFolders/inbox/messages?$filter=flag/status eq 'flagged'` Graph API endpoint.
    - [ ] The existing `POST /api/tasks` endpoint will be used to create tasks from these emails.

#### **1.3. Frontend Implementation**

**Tasks:**
- [ ] **Settings Page:**
    - [ ] Redesign the "Google Connection" section to be a generic "Integrations" or "Connected Accounts" section.
    - [ ] Add a "Connect Microsoft Account" button that links to the new backend auth route.
    - [ ] Display a list of all connected accounts (e.g., "Google: user@gmail.com", "Microsoft: user@outlook.com") with options to disconnect.
- [ ] **Email-to-Task UI:**
    - [ ] Create a new page or tab (e.g., "Inbox") dedicated to actionable items from integrations.
    - [ ] On this page, display a list of flagged emails fetched from the new backend endpoint.
    - [ ] Each email item should have a "Create Task" button. Clicking it should open a pre-populated task creation modal with the email subject as the title and the body as the description.

---

### **Part 2: Notion Integration (Priority 2)**

**Objective:** Allow users to connect a Notion database and sync its items as tasks into TimeFlow, mapping database properties to task fields.

#### **2.1. Backend Implementation**

**User Workflow:**
1.  User navigates to "Settings > Integrations" and clicks "Connect Notion."
2.  A modal prompts them to enter their Notion Integration Token and select a database to sync.
3.  They then map their database properties (e.g., "Page Name", "Deadline") to TimeFlow's task fields (`title`, `dueDate`).
4.  The backend saves this configuration and performs an initial sync.
5.  A background job periodically re-syncs the database to pull in new tasks.

**Tasks:**
- [ ] **Authentication & Configuration:**
    - [ ] Create routes to handle connecting a Notion account. This will involve storing the user's integration token in the `Account` table (`provider: 'notion'`).
    - [ ] Create an endpoint that allows the user to select a database and save the field mappings to the `Account` record (`notionDatabaseId`, `notionFieldMappings`).
- [ ] **Service Layer:**
    - [ ] Create `services/notionService.ts`.
    - [ ] Implement `getDatabases(apiKey)` to list databases the user has shared with the integration.
    - [ ] Implement the core sync logic in a `syncNotionDatabase(accountId)` function. This function must:
        -   Fetch items from the configured Notion database.
        -   For each item, check if a TimeFlow task with the corresponding `notionPageId` already exists.
        -   If not, create a new `Task` in TimeFlow, using the saved field mappings.
- [ ] **Background Syncing:**
    - [ ] Implement a background polling mechanism. A simple `setInterval` in the main backend process is sufficient for an MVP, which will call `syncNotionDatabase` for all connected Notion accounts every 5 minutes.
- [ ] **Schema Changes:**
    - [ ] Add `notionPageId: String?` to the `Task` model in `schema.prisma` to prevent duplicate syncing.
    - [ ] Run the Prisma migration.

#### **2.2. Frontend Implementation**

**Tasks:**
- [ ] **Settings Page:**
    - [ ] Add a "Connect Notion" option in the "Integrations" section.
- [ ] **Notion Configuration Modal (Multi-step):**
    1.  **Step 1: Connect.** Input field for the Notion Integration Token with a "Test & Continue" button.
    2.  **Step 2: Select Database.** A dropdown list of databases shared with the integration, populated by the `getDatabases` endpoint.
    3.  **Step 3: Map Fields.** A UI for mapping TimeFlow fields to Notion properties. For each TimeFlow field (`title`, `dueDate`, `priority`), display a dropdown of the properties available in the selected Notion database.
    4.  **Step 4: Confirm.** A summary of the configuration with a "Save & Sync" button.
- [ ] **Sync Status:**
    - [ ] On the settings page, display the sync status for the Notion integration (e.g., "Last synced: 3 minutes ago").

---

### **Future Potential Integrations (For Later Sprints)**

The following integrations have been researched and are recommended for consideration in future planning cycles after the Microsoft 365 and Notion work is complete.

*   **Trello:** Sync cards from a board/list into TimeFlow. Valuable for visual project management.
*   **Zapier Platform:** Make TimeFlow an available app on Zapier, unlocking thousands of potential connections for users.
*   **GitHub:** Sync assigned issues and PRs as tasks for developers.
*   **Asana:** Sync tasks from Asana projects, targeting business and marketing teams.
*   **Jira:** Sync issues via JQL, targeting software development teams.

---

### **Part 3: Calendar Integrations (Calendar-first expansion)**

#### **3.1. Apple Calendar / iCloud Calendar**

**Why it matters:** huge consumer audience; many users live in Apple Calendar even if tasks are elsewhere. This also de-risks “Apple Calendar (v2)” from `Project_spec.md`.

**Recommended MVP approach (pragmatic):**
- **Mobile-first read access via EventKit (iOS)** for personal calendars (best UX, fewer auth hurdles on-device).
- **Backend calendar aggregation via CalDAV** for iCloud + other CalDAV providers (Nextcloud, Fastmail, etc.) as a second step.

**Value delivered:**
- Availability accuracy improves immediately for iOS-heavy users.
- Enables scheduling across “real life calendars” (family, personal, work) instead of just Google.

**Flow (MVP):**
1. Settings → Integrations → **Connect Apple Calendar**
2. iOS: system permission prompt (read calendar). (Optional later: write access.)
3. User selects which calendars to include in “Availability”.
4. TimeFlow schedules tasks while respecting Apple calendar events.

#### **3.2. CalDAV (Generic Calendar Provider)**

**Why it matters:** single integration unlocks multiple calendar ecosystems (iCloud via app password, Fastmail, Nextcloud, etc.).

**Value delivered:**
- “Bring-your-own-calendar” without building bespoke provider APIs repeatedly.

**Flow (MVP):**
1. Settings → Integrations → **Connect CalDAV**
2. User enters server URL + username + app password
3. Backend tests credentials, lists calendars, user chooses included calendars
4. Fetch events for scheduling context (read-only MVP)

#### **3.3. ICS Subscribe / Import (Lowest friction calendar option)**

**Why it matters:** no OAuth, instant “good enough” for many users; useful for work calendars that can’t grant API access.

**Value delivered:**
- Quick “availability overlay” for users who can only share an ICS feed.

**Flow (MVP):**
1. Settings → Integrations → **Add Calendar via ICS URL**
2. Poll ICS feed (e.g., every 15–60 minutes) and merge into availability

#### **3.4. Conferencing Links (Zoom / Google Meet / Microsoft Teams)**

**Why it matters:** makes TimeFlow-created meetings/blocks more “real” and increases shareability of scheduling links.

**Value delivered:**
- Auto-attach join links when creating meetings from TimeFlow.
- Optional: create Zoom/Teams meeting when a booking is accepted.

**Flow (MVP):**
1. Settings → Integrations → **Connect Zoom** / **Connect Teams**
2. When a TimeFlow meeting booking is created → generate conferencing link → store on booking → include in confirmation email/ICS.

---

### **Part 4: Task & Project Integrations (after calendar expansion)**

#### **4.1. Todoist (Top consumer task provider)**

**Why it matters:** massive task-first user base; aligns with “task capture → smart schedule”.

**Value delivered:**
- Import tasks (and optionally keep in sync) so TimeFlow becomes the scheduling layer.
- Map Todoist due dates, priority, labels → TimeFlow task fields + categories.

**Flow (MVP):**
1. Settings → Integrations → **Connect Todoist**
2. Select projects to sync
3. One-way import of open tasks → TimeFlow tasks with `externalSource` metadata (todoist task id)
4. Optional later: write back “scheduled time” comment or label in Todoist

#### **4.2. Microsoft To Do / Planner (Teams-heavy orgs)**

**Why it matters:** complements Microsoft calendar adoption; strong “work” wedge.

**Value delivered:** pull assigned tasks into TimeFlow and schedule against Outlook calendar.

#### **4.3. Linear / Jira (Developer workflows)**

**Why it matters:** high-intent power users; good retention if TimeFlow schedules deep work blocks.

**Value delivered:**
- Sync assigned issues into TimeFlow, auto-suggest focus blocks by priority/estimate.

#### **4.4. Asana / ClickUp / Monday (Business PM)**

**Why it matters:** large B2B audience; strong upgrade path after core calendar is solid.

**Value delivered:** schedule tasks from a chosen workspace/project into TimeFlow.

---

### **Part 5: Communications Integrations (after tasks/projects)**

#### **5.1. Slack**

**Why it matters:** highest “capture from where work happens” channel for modern teams.

**Value delivered:**
- Convert messages into tasks (“Save to TimeFlow”).
- Daily/weekly summary: “Here’s what we scheduled for tomorrow” (opt-in).

**Flow (MVP):**
1. Settings → Integrations → **Connect Slack**
2. Install to workspace; choose allowed channels (or DM only)
3. Slack message action → “Create TimeFlow Task” → opens modal in Slack → task appears in Inbox/Tasks

#### **5.2. Microsoft Teams**

**Why it matters:** pairs with M365; similar capture loop to Slack.

**Value delivered:** convert chat messages into tasks; optionally sync meeting follow-ups.

---

### **(Optional later) CRM Integrations (deprioritized)**

**When to do this:** only once scheduling + task ingestion are strong enough to justify B2B sales motion.

- **HubSpot / Salesforce**: create follow-up tasks from deals, meetings, and emails; schedule “pipeline work blocks”.
