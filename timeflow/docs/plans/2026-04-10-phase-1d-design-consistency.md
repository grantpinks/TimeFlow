# Phase 1D: Design Consistency Pass — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Make the Inbox page feel like part of TimeFlow — same header style, same color system, same component patterns — while keeping the editorial email aesthetic for email content (subjects, sender names, body text).

**Architecture:**
- The inbox page (`apps/web/src/app/inbox/page.tsx`) is a single large file with three main sections: the page header/filters, `EmailListItem` component, and `ReadingPane` component.
- We target the **chrome** (header, action bar, filter pills, buttons) — NOT the email content itself (subjects in `Crimson Pro`, timestamps in `JetBrains Mono` stay as-is in email list items and reading pane body).
- No new components needed. We update inline styles to Tailwind classes and restructure the ReadingPane action bar.

**Tech Stack:** Next.js 14 App Router, Tailwind CSS, Lucide React icons, existing `@/components/ui` components, TypeScript

**Brand tokens:**
- Primary teal: `#0BAF9A` → Tailwind: `text-[#0BAF9A]`, `bg-[#0BAF9A]`, `border-[#0BAF9A]`
- Text: `#1a1a1a` → `text-slate-900`
- Muted text: `#666` → `text-slate-500`
- Borders: `#e0e0e0` → `border-slate-200`
- Background: `#FFFEF7` (creamy) → `bg-white`
- Surface: `bg-white` card backgrounds stay white

---

## Task 1: Redesign the Inbox page header chrome (18.38)

**Files:**
- Modify: `apps/web/src/app/inbox/page.tsx` (lines ~821–963)

**What to change:** The outer wrapper and page header section. The email list and reading pane are NOT touched in this task.

**Step 1: Replace the page background and outer wrapper**

Find:
```tsx
<div className="h-screen flex flex-col bg-[#FFFEF7] overflow-hidden">
```
Replace with:
```tsx
<div className="h-screen flex flex-col bg-white overflow-hidden">
```

**Step 2: Replace the page header block**

Find the entire `{/* Header */}` block (approx lines 825–963) and replace it:

**Current header starts with:**
```tsx
{/* Header */}
<div className="flex-none border-b-2 border-[#0BAF9A] bg-gradient-to-r from-white to-[#0BAF9A]/5">
  <div className="px-6 py-6">
    <div className="flex items-end justify-between mb-4">
      <div className="flex items-center gap-4">
        <motion.div ...>
          <Image src="/branding/flow-default.png" ... />
        </motion.div>
        <div>
          <h1 className="text-4xl font-bold text-[#1a1a1a] mb-1" style={{ fontFamily: "'Crimson Pro', serif" }}>
            Inbox
          </h1>
          <p className="text-xs text-[#666] tracking-wider uppercase" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
            {displayEmails.length} threads
          </p>
        </div>
      </div>
```

**Replace the entire header `<div>` (from `{/* Header */}` down to and including the closing `</div>` that wraps the filter section, around line 963) with:**

```tsx
{/* Header */}
<div className="flex-none border-b border-slate-200 bg-white">
  <div className="px-6 pt-6 pb-0">
    {/* Title row */}
    <div className="flex items-center justify-between mb-4">
      <div>
        <div className="flex items-baseline gap-3">
          <h1 className="text-3xl font-bold text-slate-900">Inbox</h1>
          <span className="text-sm text-slate-500 font-medium">
            {displayEmails.length} threads
          </span>
        </div>
      </div>

      <div className="flex items-center gap-2">
        {/* Refresh button */}
        <button
          onClick={() => fetchInbox(true)}
          disabled={refreshingInbox}
          title="Refresh inbox"
          className="p-2 rounded-lg text-slate-500 hover:text-slate-700 hover:bg-slate-100 transition-colors disabled:opacity-50"
        >
          <RefreshCw size={16} className={refreshingInbox ? 'animate-spin' : ''} />
        </button>

        {/* Account pill(s) */}
        {emailAccounts.map((account) => (
          <div key={account.id} className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 rounded-full text-xs font-medium text-slate-600">
            {account.provider === 'google' ? (
              <svg width="12" height="12" viewBox="0 0 48 48" role="img" aria-label="Google">
                <path fill="#EA4335" d="M24 9.5c3.54 0 6.06 1.53 7.44 2.8l5.48-5.48C33.64 3.78 29.2 2 24 2 14.92 2 7.2 7.02 3.62 14.3l6.6 5.12C11.78 13.62 17.44 9.5 24 9.5z" />
                <path fill="#4285F4" d="M46.14 24.5c0-1.64-.15-3.21-.43-4.73H24v8.95h12.4c-.54 2.9-2.18 5.36-4.64 7.01l7.08 5.5c4.14-3.82 6.3-9.45 6.3-16.73z" />
                <path fill="#FBBC05" d="M10.22 28.42a14.43 14.43 0 0 1 0-8.84l-6.6-5.12a22.1 22.1 0 0 0 0 19.08l6.6-5.12z" />
                <path fill="#34A853" d="M24 46c5.2 0 9.58-1.72 12.77-4.67l-7.08-5.5c-1.96 1.32-4.48 2.1-5.7 2.1-6.56 0-12.22-4.12-13.78-9.78l-6.6 5.12C7.2 40.98 14.92 46 24 46z" />
              </svg>
            ) : (
              <Mail size={12} />
            )}
            {account.email}
          </div>
        ))}

        {/* Search */}
        <div className="relative">
          <input
            type="text"
            placeholder="Search inbox..."
            value={searchQuery}
            onChange={(e) => handleSearchChange(e.target.value)}
            className="w-64 px-3 py-2 pl-9 text-sm border border-slate-200 bg-white text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#0BAF9A]/30 focus:border-[#0BAF9A] transition-all rounded-lg"
          />
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
          {searchLoading && (
            <div className="absolute right-3 top-1/2 -translate-y-1/2">
              <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-[#0BAF9A]" />
            </div>
          )}
          {searchMode === 'server' && !searchLoading && searchQuery && (
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400">Gmail</span>
          )}
          {searchQuery && !searchLoading && searchMode === 'client' && (
            <button
              onClick={() => { setSearchQuery(''); setSearchMode('client'); setServerSearchResults([]); }}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700"
            >
              ✕
            </button>
          )}
        </div>
      </div>
    </div>

    {/* Stale cache nudge */}
    {inboxCacheStale && (
      <div className="mb-3 flex items-center gap-2 text-xs text-amber-600 bg-amber-50 border border-amber-200 px-3 py-2 rounded-lg">
        <RefreshCw size={12} />
        <span>Showing cached results.</span>
        <button onClick={() => fetchInbox(true)} className="underline font-medium">Refresh now</button>
      </div>
    )}

    {/* Filters row */}
    <div className="flex flex-wrap items-center gap-2 pb-3">
      <button
        type="button"
        onClick={() => setShowViewEditor((prev) => !prev)}
        className={`px-3 py-1.5 text-xs font-semibold rounded-lg border transition-colors ${
          showViewEditor
            ? 'border-[#0BAF9A] text-[#0BAF9A] bg-[#0BAF9A]/10'
            : 'border-slate-200 text-slate-500 hover:bg-slate-50'
        }`}
      >
        Customize
      </button>

      {views.map((view) => {
        const isActive = selectedViewId === view.id && !selectedCategoryId;
        return (
          <button
            key={view.id}
            onClick={() => { setSelectedViewId(view.id); setSelectedCategoryId(null); }}
            className={`px-3 py-1.5 text-sm font-medium transition-all rounded-lg border ${
              isActive
                ? 'bg-[#0BAF9A] text-white border-[#0BAF9A]'
                : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
            }`}
          >
            {view.name}
          </button>
        );
      })}

      <button
        type="button"
        onClick={() => setNeedsResponseOnly((prev) => !prev)}
        className={`px-3 py-1.5 text-sm font-medium transition-all rounded-lg border ${
          needsResponseOnly
            ? 'bg-orange-500 text-white border-orange-500'
            : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
        }`}
      >
        Needs Response
      </button>

      <div className="h-5 w-px bg-slate-200 mx-1" />

      <CategoryPills
        categories={categories}
        selectedCategoryId={selectedCategoryId}
        onSelectCategory={(categoryId) => {
          setSelectedViewId('all');
          setSelectedCategoryId(categoryId);
        }}
        forceExpanded={showViewEditor}
      />
    </div>

    {showViewEditor && (
      <InboxViewEditor
        views={views}
        categories={categories}
        selectedViewId={selectedViewId}
        onSelectView={setSelectedViewId}
        onChange={handleViewsChange}
        onDeleteView={handleDeleteView}
      />
    )}

    {/* Queue filter row */}
    <div className="flex flex-wrap items-center gap-2 pb-3 border-t border-slate-100 pt-3">
      <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">Queues</span>
      {(['all', 'needs_reply', 'read_later'] as const).map((queue) => {
        const isActive = queueFilter === queue;
        const label = queue === 'all' ? 'All' : queue === 'needs_reply' ? 'Needs Reply' : 'Read Later';
        return (
          <button
            key={queue}
            onClick={() => setQueueFilter(queue)}
            className={`px-3 py-1.5 text-sm font-medium rounded-lg border transition-colors ${
              isActive
                ? 'bg-[#0BAF9A] text-white border-[#0BAF9A]'
                : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
            }`}
          >
            {label}
          </button>
        );
      })}

      {/* Aging nudge badges */}
      {(agingNudges.needsReply > 0 || agingNudges.unreadImportant > 0) && (
        <div className="ml-auto flex items-center gap-2">
          {agingNudges.needsReply > 0 && (
            <span className="flex items-center gap-1 px-2.5 py-1 text-xs font-medium bg-orange-50 text-orange-600 border border-orange-200 rounded-full">
              <Clock size={11} />
              Needs Reply &gt; {NUDGE_AGE_DAYS} days
              <span className="ml-1 bg-orange-500 text-white rounded-full w-4 h-4 flex items-center justify-center text-[10px]">
                {agingNudges.needsReply}
              </span>
            </span>
          )}
          {agingNudges.unreadImportant > 0 && (
            <span className="flex items-center gap-1 px-2.5 py-1 text-xs font-medium bg-blue-50 text-blue-600 border border-blue-200 rounded-full">
              <Mail size={11} />
              Unread Important
              <span className="ml-1 bg-blue-500 text-white rounded-full w-4 h-4 flex items-center justify-center text-[10px]">
                {agingNudges.unreadImportant}
              </span>
            </span>
          )}
        </div>
      )}
    </div>
  </div>
</div>
```

> **Note:** You'll need to find and keep any logic that was in the old header (like the `agingNudges` calculation and the account display). The account display block is somewhere above this section in the file — check for the `isAccountPill` variable or similar. The refresh logic is in `fetchInbox(true)`.

**Step 3: Remove the Google Fonts import from the page chrome**

Find and remove:
```tsx
{/* Web Fonts */}
<style jsx global>{`
  @import url('https://fonts.googleapis.com/css2?family=Crimson+Pro:wght@400;600;700&family=JetBrains+Mono:wght@400;500&family=Manrope:wght@400;500;600;700&display=swap');
`}</style>
```

> **Important:** The email body fonts are rendered in an iframe (`EmailBody` component uses an iframe with srcdoc), so removing the global import won't affect email body rendering. The only things that will look different are the chrome elements that had inline fontFamily styles, which we're replacing with Tailwind anyway.

**Step 4: TypeScript check**

```bash
cd "/Users/grantpinkerton/Desktop/Time Flow/TimeFlow/timeflow/apps/web" && npx tsc --noEmit 2>&1 | grep "inbox/page" | head -10
```
Expected: no output. Fix any errors.

**Step 5: Commit**

```bash
cd "/Users/grantpinkerton/Desktop/Time Flow/TimeFlow/timeflow" && git add apps/web/src/app/inbox/page.tsx && git commit -m "feat(inbox): redesign page header to match app design system (18.38)"
```

---

## Task 2: Compact ReadingPane action bar (18.39)

**Files:**
- Modify: `apps/web/src/app/inbox/page.tsx` — the `ReadingPane` component's action bar (approx lines 1688–1793)

**What to change:** Replace 8+ full-size text buttons with a tighter layout:
- **Primary buttons** (always visible, full label): "Create Task" (teal outline), "Draft Reply with AI" (purple gradient)  
- **Icon buttons with tooltips** (visible, no text): Archive, Mark Read/Unread, Needs Reply, Read Later
- **"⋯ More" dropdown**: Schedule, Label Sync, Why this label?

**Step 1: Add `useRef` and `useState` for the More dropdown**

At the top of the `ReadingPane` function component, add:
```tsx
const [moreOpen, setMoreOpen] = useState(false);
const moreRef = useRef<HTMLDivElement>(null);

// Close dropdown on outside click
useEffect(() => {
  function handleClick(e: MouseEvent) {
    if (moreRef.current && !moreRef.current.contains(e.target as Node)) {
      setMoreOpen(false);
    }
  }
  if (moreOpen) document.addEventListener('mousedown', handleClick);
  return () => document.removeEventListener('mousedown', handleClick);
}, [moreOpen]);
```

**Step 2: Replace the entire action bar `<div className="flex items-center gap-2 flex-wrap">` block**

Find the block starting at:
```tsx
<div className="flex items-center gap-2 flex-wrap">
  <button
    onClick={() => onCreateTask(email)}
    disabled={aiDraftLoading}
    className="px-4 py-2 text-sm font-medium bg-white border-2 border-[#0BAF9A] text-[#0BAF9A] ...
```

Replace the entire `flex-wrap` div (all buttons up to and including the category label pills at the end) with:

```tsx
<div className="flex items-center gap-2">
  {/* PRIMARY: Create Task */}
  <button
    onClick={() => onCreateTask(email)}
    disabled={aiDraftLoading}
    className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium bg-white border-2 border-[#0BAF9A] text-[#0BAF9A] hover:bg-[#0BAF9A]/10 transition-colors rounded-lg disabled:opacity-60"
  >
    <Clock size={14} />
    Create Task
  </button>

  {/* PRIMARY: Draft Reply with AI */}
  <button
    onClick={() => onOpenDraft(latestMessage)}
    disabled={aiDraftLoading}
    className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium bg-gradient-to-r from-purple-600 to-indigo-600 text-white hover:from-purple-700 hover:to-indigo-700 transition-all rounded-lg shadow-sm disabled:opacity-60"
  >
    <Sparkles size={14} />
    {aiDraftLoading ? 'Generating…' : 'Draft with AI'}
  </button>

  {/* DIVIDER */}
  <div className="h-6 w-px bg-slate-200 mx-1" />

  {/* ICON: Archive */}
  <button
    onClick={() => onArchive(email.id)}
    title="Archive"
    className="p-2 rounded-lg text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition-colors"
  >
    <Archive size={16} />
  </button>

  {/* ICON: Mark Read / Unread */}
  <button
    onClick={() => onToggleRead(email.id, email.isRead ?? false)}
    title={email.isRead ? 'Mark unread' : 'Mark read'}
    className="p-2 rounded-lg text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition-colors"
  >
    {email.isRead ? <Mail size={16} /> : <MailOpen size={16} />}
  </button>

  {/* ICON: Needs Reply toggle */}
  <button
    onClick={() => onUpdateActionState(threadId, isNeedsReply ? null : 'needs_reply')}
    title={isNeedsReply ? 'Remove Needs Reply' : 'Mark Needs Reply'}
    className={`p-2 rounded-lg transition-colors ${
      isNeedsReply
        ? 'text-orange-500 bg-orange-50 hover:bg-orange-100'
        : 'text-slate-500 hover:text-slate-800 hover:bg-slate-100'
    }`}
  >
    <MessageSquare size={16} />
  </button>

  {/* ICON: Read Later toggle */}
  <button
    onClick={() => onUpdateActionState(threadId, isReadLater ? null : 'read_later')}
    title={isReadLater ? 'Remove Read Later' : 'Mark Read Later'}
    className={`p-2 rounded-lg transition-colors ${
      isReadLater
        ? 'text-blue-500 bg-blue-50 hover:bg-blue-100'
        : 'text-slate-500 hover:text-slate-800 hover:bg-slate-100'
    }`}
  >
    <Bookmark size={16} />
  </button>

  {/* ⋯ More dropdown */}
  <div className="relative" ref={moreRef}>
    <button
      onClick={() => setMoreOpen((v) => !v)}
      title="More actions"
      className="p-2 rounded-lg text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition-colors"
    >
      <span className="text-base leading-none font-bold">⋯</span>
    </button>

    {moreOpen && (
      <div className="absolute right-0 top-full mt-1 w-44 bg-white border border-slate-200 rounded-xl shadow-lg z-20 py-1">
        <button
          onClick={() => { onCreateTask(email, { schedule: true }); setMoreOpen(false); }}
          disabled={aiDraftLoading}
          className="flex items-center gap-2 w-full px-3 py-2 text-sm text-slate-700 hover:bg-slate-50 disabled:opacity-60"
        >
          <Calendar size={14} />
          Schedule
        </button>
        <button
          onClick={() => { onDraftLabelSync(email); setMoreOpen(false); }}
          disabled={aiDraftLoading}
          className="flex items-center gap-2 w-full px-3 py-2 text-sm text-slate-700 hover:bg-slate-50 disabled:opacity-60"
        >
          <Tag size={14} />
          Label Sync
        </button>
        <button
          onClick={() => { onToggleExplanation(); setMoreOpen(false); }}
          className="flex items-center gap-2 w-full px-3 py-2 text-sm text-slate-700 hover:bg-slate-50"
        >
          <HelpCircle size={14} />
          Why this label?
        </button>
      </div>
    )}
  </div>

  {/* Gmail external link */}
  <div className="ml-auto" />
  <a
    href={`https://mail.google.com/mail/u/0/#inbox/${email.threadId || email.id}`}
    target="_blank"
    rel="noopener noreferrer"
    title="Open in Gmail"
    className="p-2 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
  >
    <ExternalLink size={16} />
  </a>
</div>

{/* Category / action state badges */}
{(categoryLabel || needsResponse || actionState) && (
  <div className="flex items-center gap-2 mt-2 flex-wrap">
    {categoryLabel && (
      <span
        className="px-2.5 py-1 text-xs font-medium rounded-full border"
        style={{
          backgroundColor: `${categoryColor}15`,
          color: categoryColor,
          borderColor: `${categoryColor}40`,
        }}
      >
        {categoryLabel}
      </span>
    )}
    {needsResponse && (
      <span className="px-2.5 py-1 text-xs font-medium rounded-full bg-orange-50 text-orange-600 border border-orange-200">
        Needs Response
      </span>
    )}
    {actionState === 'needs_reply' && (
      <span className="px-2.5 py-1 text-xs font-medium rounded-full bg-orange-50 text-orange-600 border border-orange-200">
        Needs Reply
      </span>
    )}
    {actionState === 'read_later' && (
      <span className="px-2.5 py-1 text-xs font-medium rounded-full bg-blue-50 text-blue-600 border border-blue-200">
        Read Later
      </span>
    )}
    {categoryLabel && (
      <button
        onClick={onStartCorrect}
        className="text-xs text-[#0BAF9A] hover:underline"
      >
        Correct
      </button>
    )}
  </div>
)}
```

> **Note:** Also remove the now-redundant standalone Gmail `<a>` tag that was in the old subject line header (the `flex-none px-3 py-1.5 text-sm bg-blue-600 text-white` link). It's now replaced by the icon link above.

**Step 3: Add `useRef` import if not already present**

Check line 3: `import { useState, useEffect, useMemo, useRef } from 'react';` — `useRef` should already be there.

**Step 4: TypeScript check**

```bash
cd "/Users/grantpinkerton/Desktop/Time Flow/TimeFlow/timeflow/apps/web" && npx tsc --noEmit 2>&1 | grep "inbox/page" | head -10
```
Expected: no output.

**Step 5: Commit**

```bash
cd "/Users/grantpinkerton/Desktop/Time Flow/TimeFlow/timeflow" && git add apps/web/src/app/inbox/page.tsx && git commit -m "feat(inbox): compact reading pane action bar — 2 primary + 4 icon + overflow dropdown (18.39)"
```

---

## Task 3: Color and metadata strip cleanup (18.40, 18.41, 18.42)

**Files:**
- Modify: `apps/web/src/app/inbox/page.tsx` — remaining off-brand inline styles in the reading pane metadata and list sections

**What to change:** The email metadata section (From/To/Date in reading pane) and any remaining `style={{ fontFamily: ... }}` on chrome elements. Keep fonts on the email subject line in the list (content), but remove from buttons, labels, timestamps in the header chrome.

**Step 1: Fix reading pane email metadata (lines ~1864–1890)**

Find the metadata block:
```tsx
<div className="text-lg font-bold text-[#1a1a1a] mb-1" style={{ fontFamily: "'Manrope', sans-serif" }}>
  {latestMessage.from}
</div>
<div className="text-sm text-[#666]" style={{ fontFamily: "'Manrope', sans-serif" }}>
  To: {latestMessage.to} ...
</div>
...
<div className="text-sm text-[#999]" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
  {new Date(latestMessage.receivedAt)...}
</div>
```

Replace with (remove inline fontFamily, fix colors to Tailwind):
```tsx
<div className="text-base font-semibold text-slate-900 mb-0.5">
  {latestMessage.from}
</div>
<div className="text-sm text-slate-500">
  To: {latestMessage.to}
  {latestMessage.cc && ` • Cc: ${latestMessage.cc}`}
</div>
...
<div className="text-sm text-slate-400">
  {new Date(latestMessage.receivedAt).toLocaleString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric',
    hour: 'numeric', minute: '2-digit',
  })}
</div>
```

**Step 2: Fix the reading pane subject title**

Find:
```tsx
<h2 className="text-2xl font-bold text-[#1a1a1a] pr-4 flex-1" style={{ fontFamily: "'Crimson Pro', serif" }}>
```
Replace with:
```tsx
<h2 className="text-xl font-semibold text-slate-900 pr-4 flex-1">
```

**Step 3: Fix remaining `border-[#e0e0e0]` → `border-slate-200`**

In the reading pane content area:
```tsx
<div className="mb-6 pb-6 border-b border-[#e0e0e0]">
```
→
```tsx
<div className="mb-6 pb-6 border-b border-slate-200">
```

**Step 4: TypeScript check**

```bash
cd "/Users/grantpinkerton/Desktop/Time Flow/TimeFlow/timeflow/apps/web" && npx tsc --noEmit 2>&1 | grep "inbox/page" | head -10
```

**Step 5: Commit**

```bash
cd "/Users/grantpinkerton/Desktop/Time Flow/TimeFlow/timeflow" && git add apps/web/src/app/inbox/page.tsx && git commit -m "fix(inbox): standardize colors and typography on reading pane chrome (18.40-18.42)"
```

---

## Task 4: Mobile responsive inbox fixes (18.44)

**Files:**
- Modify: `apps/web/src/app/inbox/page.tsx`

**What to change:** The inbox header collapses poorly on small screens. The search box is `w-64` fixed width. The two-column list/reading pane split needs a mobile fallback.

**Step 1: Make header title row stack on mobile**

In the new header from Task 1, the title/actions row:
```tsx
<div className="flex items-center justify-between mb-4">
```
Change to:
```tsx
<div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
```

And make the search responsive:
```tsx
className="w-full sm:w-64 px-3 py-2 pl-9 text-sm ..."
```

**Step 2: Find the list/reading pane split**

Look for the two-column layout, something like:
```tsx
<div className="flex-1 flex overflow-hidden">
  <div className="w-[380px] ..."> {/* email list */}
  <div className="flex-1 ...">   {/* reading pane */}
```

If the reading pane is visible alongside the list at all widths, make it responsive:
```tsx
<div className="flex-1 flex overflow-hidden">
  {/* Email list — hidden on mobile when email is selected */}
  <div className={`${selectedThreadId ? 'hidden sm:block' : 'block'} w-full sm:w-[380px] border-r border-slate-200 overflow-y-auto flex-shrink-0`}>
    ...
  </div>
  {/* Reading pane — full screen on mobile */}
  {selectedThreadId && (
    <div className="flex-1 flex flex-col overflow-hidden">
      ...
    </div>
  )}
```

> **Note:** Read the actual layout first with grep before modifying. The structure may already handle this. Only add the mobile hide/show if the current code doesn't.

**Step 3: Add a "← Back" button for mobile when reading pane is open**

Inside the ReadingPane component, at the top of the action bar on mobile:
```tsx
{/* Mobile back button */}
<button
  onClick={() => setSelectedThreadId(null)}
  className="sm:hidden flex items-center gap-1 text-sm text-[#0BAF9A] font-medium mb-3"
>
  ← Back to inbox
</button>
```

> **Note:** `setSelectedThreadId` is in the parent page component, not ReadingPane. Pass it as a prop `onBack?: () => void` and call it here. Add `onBack` to `ReadingPaneProps` interface.

**Step 4: TypeScript check**

```bash
cd "/Users/grantpinkerton/Desktop/Time Flow/TimeFlow/timeflow/apps/web" && npx tsc --noEmit 2>&1 | grep "inbox/page" | head -10
```

**Step 5: Commit**

```bash
cd "/Users/grantpinkerton/Desktop/Time Flow/TimeFlow/timeflow" && git add apps/web/src/app/inbox/page.tsx && git commit -m "fix(inbox): mobile responsive layout — stacking header, back button, pane switching (18.44)"
```

---

## Task 5: Push and verify production

**Step 1: Run full TypeScript check**

```bash
cd "/Users/grantpinkerton/Desktop/Time Flow/TimeFlow/timeflow/apps/web" && npx tsc --noEmit 2>&1 | grep -v "test\|\.test\|spec" | head -20
```
Expected: no new errors.

**Step 2: Push**

```bash
cd "/Users/grantpinkerton/Desktop/Time Flow/TimeFlow/timeflow" && git push origin main
```

**Step 3: Smoke test checklist**

After Vercel deploys:
1. Open Inbox page — header should say "Inbox" in `text-3xl font-bold` with thread count beside it, white background, no gradient
2. Filter pills should look like the Today page's identity pills (rounded-lg, slate border)
3. Click an email — reading pane action bar should show 2 labeled buttons + 4 icon buttons + ⋯ overflow
4. Click ⋯ — dropdown should show Schedule, Label Sync, Why this label?
5. Icon button tooltips show on hover
6. On mobile (< 640px): inbox list shows full-width, tapping email shows reading pane, back button visible
7. No Google Fonts banner in DevTools Network tab from the inbox page chrome

---

## Summary: Roadmap items completed

| ID | Task | Completed in |
|----|------|-------------|
| 18.38 | Redesign Inbox/Email page: fix colors, use consistent components | Tasks 1 + 3 |
| 18.39 | Compact email action buttons to icon-only (archive, read) + 2 primary | Task 2 |
| 18.40 | Standardize page headers | Task 1 |
| 18.41 | Panel/card shadow/border system | Task 3 |
| 18.42 | Color audit (teal, slate, orange, blue — consistent) | Task 3 |
| 18.44 | Mobile responsive audit for inbox | Task 4 |
