# Inbox Custom Views Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add customizable inbox views on `/inbox` so users can define label sets per view (All locked, Professional/Personal editable, custom views allowed), with backend persistence and local fallback.

**Architecture:** Store the view list as JSON on the `User` model (`inboxViews`). Expose `/inbox/views` endpoints to fetch/update/delete. Frontend loads local cache first, then server; it uses a dynamic view list for filtering and an inline editor panel to update views.

**Tech Stack:** Next.js/React, Tailwind, Vitest, Fastify, Prisma, Zod, localStorage.

---

### Task 1: Add inbox view storage to Prisma schema

**Files:**
- Modify: `timeflow/apps/backend/prisma/schema.prisma`
- Modify: `timeflow/apps/backend/src/__tests__/schema.test.ts`

**Step 1: Write the failing test**

```ts
// timeflow/apps/backend/src/__tests__/schema.test.ts
expect(schema).toContain('inboxViews');
```

**Step 2: Run test to verify it fails**

Run: `pnpm -C timeflow/apps/backend test -- schema.test.ts`
Expected: FAIL with assertion that `inboxViews` is missing

**Step 3: Write minimal implementation**

```prisma
// timeflow/apps/backend/prisma/schema.prisma
model User {
  // ...existing fields
  inboxViews Json?
}
```

Run: `pnpm -C timeflow/apps/backend prisma:migrate -- --name add_inbox_views`
Expected: Migration generated and applied

**Step 4: Run test to verify it passes**

Run: `pnpm -C timeflow/apps/backend test -- schema.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add timeflow/apps/backend/prisma/schema.prisma timeflow/apps/backend/prisma/migrations timeflow/apps/backend/src/__tests__/schema.test.ts
git commit -m "feat(backend): add inbox views storage"
```

---

### Task 2: Backend inbox views API

**Files:**
- Create: `timeflow/apps/backend/src/controllers/inboxViewsController.ts`
- Modify: `timeflow/apps/backend/src/routes/emailRoutes.ts`
- Create: `timeflow/apps/backend/src/__tests__/inboxViews.e2e.test.ts`
- Modify: `timeflow/packages/shared/src/types/email.ts`
- Modify: `timeflow/packages/shared/src/types/index.ts` (only if needed for new exports)

**Step 1: Write the failing tests**

```ts
// timeflow/apps/backend/src/__tests__/inboxViews.e2e.test.ts
it('returns default views when user has none', async () => {
  prismaMock.user.findUnique.mockResolvedValue({ ...fakeUser, inboxViews: null });
  const res = await server.inject({ method: 'GET', url: '/api/inbox/views', headers: { authorization: authHeader() } });
  expect(res.statusCode).toBe(200);
  const body = JSON.parse(res.body);
  expect(body.views.map((v: any) => v.id)).toEqual(['all', 'professional', 'personal']);
});

it('updates views and persists on PUT', async () => {
  prismaMock.user.update.mockResolvedValue({ ...fakeUser, inboxViews: [{ id: 'personal', name: 'Personal', labelIds: ['personal', 'updates'], isBuiltin: true }] });
  const res = await server.inject({ method: 'PUT', url: '/api/inbox/views', headers: { authorization: authHeader() }, payload: { views: [{ id: 'personal', name: 'Personal', labelIds: ['personal', 'updates'], isBuiltin: true }] } });
  expect(res.statusCode).toBe(200);
  const body = JSON.parse(res.body);
  expect(body.views[0].labelIds).toContain('updates');
});
```

**Step 2: Run tests to verify they fail**

Run: `pnpm -C timeflow/apps/backend test -- inboxViews.e2e.test.ts`
Expected: FAIL (route/controller missing)

**Step 3: Write minimal implementation**

```ts
// timeflow/apps/backend/src/controllers/inboxViewsController.ts
export async function getInboxViews(...) { /* read user.inboxViews or defaults */ }
export async function updateInboxViews(...) { /* validate, normalize, store */ }
export async function deleteInboxView(...) { /* remove custom view only */ }
```

Add routes:

```ts
// timeflow/apps/backend/src/routes/emailRoutes.ts
server.get('/inbox/views', { preHandler: requireAuth }, getInboxViews);
server.put('/inbox/views', { preHandler: requireAuth }, updateInboxViews);
server.delete('/inbox/views/:id', { preHandler: requireAuth }, deleteInboxView);
```

Use a shared default view list from `@timeflow/shared` (see Task 3). Enforce:
- `all` is always present and non-editable (ignore changes to its labels)
- `professional` and `personal` are editable
- delete only for custom views

**Step 4: Run tests to verify they pass**

Run: `pnpm -C timeflow/apps/backend test -- inboxViews.e2e.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add timeflow/apps/backend/src/controllers/inboxViewsController.ts timeflow/apps/backend/src/routes/emailRoutes.ts timeflow/apps/backend/src/__tests__/inboxViews.e2e.test.ts timeflow/packages/shared/src/types/email.ts

git commit -m "feat(backend): add inbox view endpoints"
```

---

### Task 3: Shared inbox view type + filter logic update

**Files:**
- Modify: `timeflow/packages/shared/src/types/email.ts`
- Modify: `timeflow/apps/web/src/lib/inboxFilters.ts`
- Modify: `timeflow/apps/web/src/lib/__tests__/inboxFilters.test.ts`

**Step 1: Write the failing test**

```ts
// timeflow/apps/web/src/lib/__tests__/inboxFilters.test.ts
import type { InboxView } from '@timeflow/shared';

const views: InboxView[] = [
  { id: 'all', name: 'All', labelIds: [], isBuiltin: true },
  { id: 'personal', name: 'Personal', labelIds: ['personal', 'updates'], isBuiltin: true },
];

it('filters by selected view labelIds', () => {
  const result = filterInboxEmails(emails as any, {
    selectedViewId: 'personal',
    views,
    selectedCategoryId: null,
  });
  expect(result.map((email) => email.id)).toEqual(['2', '3']);
});
```

**Step 2: Run test to verify it fails**

Run: `pnpm -C timeflow/apps/web test -- inboxFilters.test.ts`
Expected: FAIL (type/export/signature mismatch)

**Step 3: Write minimal implementation**

```ts
// timeflow/packages/shared/src/types/email.ts
export interface InboxView {
  id: string;
  name: string;
  labelIds: string[];
  isBuiltin?: boolean;
}

export const DEFAULT_INBOX_VIEWS: InboxView[] = [
  { id: 'all', name: 'All', labelIds: [], isBuiltin: true },
  { id: 'professional', name: 'Professional', labelIds: ['work'], isBuiltin: true },
  { id: 'personal', name: 'Personal', labelIds: ['personal'], isBuiltin: true },
];
```

```ts
// timeflow/apps/web/src/lib/inboxFilters.ts
export function filterInboxEmails(
  emails: EmailMessage[],
  options: { selectedViewId: string; views: InboxView[]; selectedCategoryId: string | null }
) {
  const selectedView = options.views.find((view) => view.id === options.selectedViewId);
  const allowed = selectedView?.labelIds ?? [];
  // treat empty labelIds as no filtering ("all")
  let filtered = allowed.length ? emails.filter((email) => email.category && allowed.includes(email.category)) : emails;
  if (options.selectedCategoryId) {
    filtered = filtered.filter((email) => email.category === options.selectedCategoryId);
  }
  return filtered;
}
```

**Step 4: Run test to verify it passes**

Run: `pnpm -C timeflow/apps/web test -- inboxFilters.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add timeflow/packages/shared/src/types/email.ts timeflow/apps/web/src/lib/inboxFilters.ts timeflow/apps/web/src/lib/__tests__/inboxFilters.test.ts

git commit -m "feat(web): support dynamic inbox views in filtering"
```

---

### Task 4: Local storage helper for inbox views

**Files:**
- Create: `timeflow/apps/web/src/lib/inboxViewsStorage.ts`
- Create: `timeflow/apps/web/src/lib/__tests__/inboxViewsStorage.test.ts`

**Step 1: Write the failing test**

```ts
// timeflow/apps/web/src/lib/__tests__/inboxViewsStorage.test.ts
import { DEFAULT_INBOX_VIEWS } from '@timeflow/shared';
import { loadInboxViews, saveInboxViews } from '../inboxViewsStorage';

it('falls back to defaults when storage is empty', () => {
  localStorage.clear();
  expect(loadInboxViews()).toEqual(DEFAULT_INBOX_VIEWS);
});

it('persists and reloads views', () => {
  const custom = [{ ...DEFAULT_INBOX_VIEWS[0], id: 'custom', name: 'Custom', labelIds: ['social'] }];
  saveInboxViews(custom);
  expect(loadInboxViews()).toEqual(custom);
});
```

**Step 2: Run test to verify it fails**

Run: `pnpm -C timeflow/apps/web test -- inboxViewsStorage.test.ts`
Expected: FAIL (module missing)

**Step 3: Write minimal implementation**

```ts
// timeflow/apps/web/src/lib/inboxViewsStorage.ts
const STORAGE_KEY = 'timeflow_inbox_views_v1';

export function loadInboxViews() {
  if (typeof window === 'undefined') return DEFAULT_INBOX_VIEWS;
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return DEFAULT_INBOX_VIEWS;
  try {
    return JSON.parse(raw);
  } catch {
    return DEFAULT_INBOX_VIEWS;
  }
}

export function saveInboxViews(views: InboxView[]) {
  if (typeof window === 'undefined') return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(views));
}
```

**Step 4: Run test to verify it passes**

Run: `pnpm -C timeflow/apps/web test -- inboxViewsStorage.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add timeflow/apps/web/src/lib/inboxViewsStorage.ts timeflow/apps/web/src/lib/__tests__/inboxViewsStorage.test.ts

git commit -m "feat(web): add inbox view local cache helpers"
```

---

### Task 5: CategoryPills forced expansion

**Files:**
- Modify: `timeflow/apps/web/src/components/inbox/CategoryPills.tsx`
- Create: `timeflow/apps/web/src/components/inbox/__tests__/CategoryPills.test.tsx`

**Step 1: Write the failing test**

```tsx
// timeflow/apps/web/src/components/inbox/__tests__/CategoryPills.test.tsx
render(<CategoryPills categories={categories} selectedCategoryId={null} onSelectCategory={() => {}} forceExpanded />);
expect(screen.getByRole('button', { name: /label key/i })).toHaveAttribute('aria-expanded', 'true');
```

**Step 2: Run test to verify it fails**

Run: `pnpm -C timeflow/apps/web test -- CategoryPills.test.tsx`
Expected: FAIL (prop missing)

**Step 3: Write minimal implementation**

```tsx
// timeflow/apps/web/src/components/inbox/CategoryPills.tsx
type Props = { ...; forceExpanded?: boolean };
useEffect(() => { if (forceExpanded) setIsExpanded(true); }, [forceExpanded]);
```

**Step 4: Run test to verify it passes**

Run: `pnpm -C timeflow/apps/web test -- CategoryPills.test.tsx`
Expected: PASS

**Step 5: Commit**

```bash
git add timeflow/apps/web/src/components/inbox/CategoryPills.tsx timeflow/apps/web/src/components/inbox/__tests__/CategoryPills.test.tsx

git commit -m "feat(web): force-expand label pills when editing views"
```

---

### Task 6: Inbox views UI + API integration

**Files:**
- Modify: `timeflow/apps/web/src/lib/api.ts`
- Modify: `timeflow/apps/web/src/app/inbox/page.tsx`
- Create: `timeflow/apps/web/src/components/inbox/InboxViewEditor.tsx`

**Step 1: Write the failing test**

```tsx
// timeflow/apps/web/src/components/inbox/__tests__/InboxViewEditor.test.tsx
render(<InboxViewEditor views={DEFAULT_INBOX_VIEWS} onChange={onChange} />);
expect(screen.getByText('All')).toBeDisabled();
```

**Step 2: Run test to verify it fails**

Run: `pnpm -C timeflow/apps/web test -- InboxViewEditor.test.tsx`
Expected: FAIL (component missing)

**Step 3: Write minimal implementation**

```ts
// timeflow/apps/web/src/lib/api.ts
export async function getInboxViews(): Promise<{ views: InboxView[] }> {
  return request<{ views: InboxView[] }>('/inbox/views');
}
export async function updateInboxViews(views: InboxView[]): Promise<{ views: InboxView[] }> {
  return request<{ views: InboxView[] }>('/inbox/views', { method: 'PUT', body: JSON.stringify({ views }) });
}
export async function deleteInboxView(id: string): Promise<void> {
  return request<void>(`/inbox/views/${id}`, { method: 'DELETE' });
}
```

```tsx
// timeflow/apps/web/src/components/inbox/InboxViewEditor.tsx
// Inline editor listing views with editable names and label chip multi-select.
// Disable editing for id === 'all'. Provide "Add view" button.
```

```tsx
// timeflow/apps/web/src/app/inbox/page.tsx
// Add state: views, selectedViewId, showEditor
// Load local cache first, then server via getInboxViews
// Use filterInboxEmails with selectedViewId + views
// Show Customize tab, inline editor, and pass forceExpanded to CategoryPills when editor open
```

**Step 4: Run test to verify it passes**

Run: `pnpm -C timeflow/apps/web test -- InboxViewEditor.test.tsx`
Expected: PASS

**Step 5: Commit**

```bash
git add timeflow/apps/web/src/lib/api.ts timeflow/apps/web/src/app/inbox/page.tsx timeflow/apps/web/src/components/inbox/InboxViewEditor.tsx timeflow/apps/web/src/components/inbox/__tests__/InboxViewEditor.test.tsx

git commit -m "feat(web): add inbox view editor and persistence"
```

---

### Task 7: Manual QA checklist

**Files:**
- Modify: `timeflow/docs/DEV_QUICK_START.md` (optional, if you keep QA checklists there)

**Step 1: Run the app and verify UI**

Run: `pnpm -C timeflow/apps/web dev`
Expected:
- “Customize” tab appears to the left of filters
- Editor opens inline and forces label pills expanded
- “All” view is locked
- Personal view can select multiple labels

**Step 2: Verify persistence**

- Refresh the page: view configuration persists (local cache)
- Sign out/in or clear cache: server views load correctly

**Step 3: Commit (optional)**

```bash
git add timeflow/docs/DEV_QUICK_START.md
git commit -m "docs: add inbox view QA checklist"
```

---

**Notes:**
- Use `DEFAULT_INBOX_VIEWS` for initial state to keep consistent defaults across backend and frontend.
- Use OR semantics when filtering by view labels.
- Ensure `selectedCategoryId` overrides view selection when a label pill is clicked.
- Respect design: “All” non-editable; “Professional” and “Personal” editable.
