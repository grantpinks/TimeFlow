# Features in Progress

This document provides an overview of features that are currently planned or in development. The details here are subject to change as development progresses.

---

## Sprint 15 Features

### 1. Gmail Label Sync (Thread-Level)

**Status**: Planned (Documentation)

**Overview**:
TimeFlow already categorizes your inbox on the TimeFlow dashboard. This feature extends that organization into Gmail itself by creating real Gmail labels (e.g., `TimeFlow/Work`) and applying them at the **thread level**.

**How It Will Work**:

1. **Create Labels**: When enabled, TimeFlow creates/ensures a set of `TimeFlow/*` labels using the Gmail API.
2. **Color Mapping**: Category colors are mapped into Gmail’s supported label color palette (best-effort) with user overrides in Settings.
3. **Thread-Level Apply**: TimeFlow applies the category label to the entire conversation thread (not just a single message) for consistency.
4. **Background Sync**: New mail is labeled via Gmail `watch` + Pub/Sub push notifications; if watch is unavailable, a bounded “sync-on-inbox-fetch” fallback is used.

**Docs**:
- Sprint plan: `docs/SPRINT_16_PLAN.md`
- Implementation guide: `docs/SPRINT_16_GMAIL_LABEL_SYNC_IMPLEMENTATION_GUIDE.md`

---

## Sprint 7 Features

### 1. Habit Scheduling

**Status**: In Progress (Documentation)

**Overview**:
This feature will integrate habits directly into the smart scheduling system, automatically blocking out time for your routines so you don't have to think about them. The goal is to make habit formation effortless by treating habits as first-class citizens in your daily schedule.

**How It Will Work**:
When enabled, the scheduling engine will treat active habits much like it treats tasks. Based on a habit's frequency and user preferences, the system will automatically generate "habit instances" to be scheduled.

1.  **Habit Generation**: For a given day, the system will identify all active habits that should occur (e.g., daily habits, or weekly habits that fall on that day).
2.  **Time Preference**: Each habit can have a preferred time of day:
    - **Morning**: (e.g., 8:00 AM - 12:00 PM)
    - **Afternoon**: (e.g., 12:00 PM - 5:00 PM)
    - **Evening**: (e.g., 5:00 PM - 9:00 PM)
    - **Any**: No preference.
3.  **Scheduling Priority**: Habits will be given a high priority by the scheduling algorithm to ensure they are placed on the schedule first, before most tasks.
4.  **Finding a Slot**: The scheduler will attempt to find a free slot that fits the habit's duration within its preferred time window (e.g., a 30-minute "Meditation" habit will be placed in a free 30-minute slot during the "Morning" window).
5.  **No Preference**: If a habit has no time preference, the scheduler will place it in any available slot, just like a regular task.
6.  **Calendar View**: Once scheduled, habits will appear in your "Today" view timeline and on your connected calendar, just like scheduled tasks.

This automated process ensures that your desired routines are always accounted for, helping you build consistency without the mental overhead of manually planning them each day.

---
Last Updated: 2025-12-05

### 2. Habit Tracking and Streaks

**Status**: In Progress (Documentation)

**Overview**:
To provide motivation and a sense of accomplishment, this feature will introducemechanisms for tracking habit completion and visualizing progress over time. This turns habit formation into a measurable and rewarding game.

**How It Will Work**:

1.  **Completion Tracking**:
    -   In the "Today" view timeline, each scheduled habit block will include a "Mark as Done" button.
    -   Users can easily check off habits as they complete them throughout the day.
    -   Completed habits will be visually distinguished (e.g., faded out or with a checkmark).

2.  **Streak Counting**:
    -   The system will automatically track the number of consecutive days a habit has been marked as complete.
    -   This "streak" count (e.g., "🔥 5 days") will be displayed next to each habit in the "Habits" management page.
    -   Streaks provide a powerful psychological incentive to maintain consistency. If a day is missed, the streak resets.

3.  **Habit History & Analytics**:
    -   A new "Progress" tab will be added to the "Habits" page.
    -   This view will feature a calendar-style grid for each habit, showing which days it was completed, missed, or not scheduled.
    -   Simple analytics, such as completion percentage and current vs. longest streak, will be displayed to provide deeper insights into performance.

This tracking system is designed to be simple, visual, and motivating, helping users stay engaged with their personal growth goals.

### 3. Category Reordering

**Status**: In Progress (Documentation)

**Overview**:
This enhancement will give users full control over the display order of their categories, allowing them to prioritize their workflow and keep the most important categories at the top.

**How It Will Work**:

1.  **Drag-and-Drop Interface**:
    -   On the `/categories` page, users will be able to click and drag their custom categories to reorder them.
    -   A visual indicator (like a drag handle icon) will appear on each category card to signify this capability.
    -   The four default categories ("Professional", "Schoolwork", "Personal", "Misc") will remain fixed at the bottom of the list.

2.  **Persistent Ordering**:
    -   The chosen order will be saved automatically to the user's profile.
    -   This custom order will be reflected in all category dropdowns and selectors throughout the application, such as in the task creation and editing forms.

This small but significant usability improvement will allow users to tailor the application more closely to their personal organizational style.

### 4. Today Page Enhancements

**Status**: In Progress (Documentation)

**Overview**:
The "Today" page will be upgraded from a static view into a fully interactive planning canvas, making the daily planning ritual faster and more intuitive.

**How It Will Work**:

1.  **Drag-and-Drop Scheduling**:
    -   Users will be able to drag tasks directly from the "Inbox" column (left) and drop them into a specific time slot in the "Hourly Timeline" (center).
    -   This action will immediately schedule the task for that time, providing a fast, visual way to build a daily plan.

2.  **Quick Task Creation**:
    -   A new input field will be added to the "Inbox" column, allowing for rapid task creation without leaving the "Today" page.
    -   Users can simply type a task name, press Enter, and the task will appear in their inbox, ready to be scheduled.

3.  **Full AI Assistant Chat**:
    -   The current "Ask AI Assistant" button will be expanded into a full conversational chat interface within the right-hand column.
    -   Users can have an ongoing dialogue with the assistant to get suggestions, brainstorm ideas, or ask for help in structuring their day.
    -   The chat will maintain context, allowing for follow-up questions and more dynamic interaction than the current one-off prompts.

These enhancements will transform the Today page into the central hub for daily planning and management.

---
Last Updated: 2025-12-05

### 5. Mobile App Sync for Categories and Habits

**Status**: In Progress (Documentation)

**Overview**:
To create a seamless cross-platform experience, all categories and habits created on the web application will be synchronized with the Expo mobile app.

**How It Will Work**:

1.  **Automatic Data Sync**:
    -   When a user logs into the mobile app, it will automatically fetch the latest categories and habits from the backend.
    -   This ensures that the organizational structure defined on the web is always available on the go.

2.  **Read-Only Display**:
    -   Initially, the mobile app will provide read-only access to this data.
    -   Tasks displayed in the mobile app's task list will show their assigned category, including the correct color.
    -   A new screen will be added to the mobile app to list all habits, showing their name, frequency, and duration.

3.  **Future Enhancements**:
    -   Future sprints will add management capabilities to the mobile app, allowing users to create, edit, and delete categories and habits directly from their mobile device.

This foundational sync feature is the first step toward achieving full feature parity between the web and mobile applications.

---
Last Updated: 2025-12-05
