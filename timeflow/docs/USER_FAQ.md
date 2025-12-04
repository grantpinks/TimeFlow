# TimeFlow User FAQ

**Version**: 1.0
**Last Updated**: 2025-12-04

---

## Getting Started

### How do I sign up?

TimeFlow uses Google OAuth. Click "Sign in with Google" and authorize the app to access your Google Calendar.

### Do I need a Google account?

Yes, TimeFlow requires a Google account for authentication and Google Calendar integration.

---

## Tasks

### How do I create a task?

1. Go to the Tasks page
2. Click "New Task"
3. Fill in title, duration, priority, and due date
4. Click "Create"

### What do the priority levels mean?

- **High (1)**: Most important, scheduled first
- **Medium (2)**: Normal priority
- **Low (3)**: Least urgent

### Can I edit a task after creating it?

Yes, click on any task to edit its details.

### What happens when I delete a task?

The task is permanently deleted. If it was scheduled, the event is also removed from your Google Calendar.

---

## Scheduling

### How does Smart Schedule work?

Smart Schedule:
1. Looks at your unscheduled tasks
2. Checks your Google Calendar for free time
3. Respects your wake/sleep times
4. Schedules tasks by due date and priority
5. Creates events in your Google Calendar

### Can I manually reschedule a task?

Yes! In the Calendar view, drag and drop events to new time slots. You can also click a task and choose "Reschedule".

### What if a task misses its deadline?

Tasks that can't fit before their due date are marked with a warning (overflowedDeadline). You can still schedule them, but you'll see they're overdue.

### Why wasn't my task scheduled?

Possible reasons:
- No free time slots available
- Task duration too long for available blocks
- All free time is after the due date

---

## AI Assistant

### How do I use the AI Assistant?

1. Go to the Assistant page
2. Ask questions like:
   - "What does my Tuesday look like?"
   - "Schedule my high priority tasks"
   - "Can I fit a 2-hour study session tomorrow?"
3. Review the AI's recommendations
4. Click "Apply Schedule" to commit changes

### Why is the AI slow to respond?

The AI runs on a local LLM server. Response time depends on:
- Your hardware (CPU/GPU)
- Model size
- Number of tasks/events being analyzed

Typical response time: 5-30 seconds.

### What if the AI suggests a bad schedule?

The AI provides suggestions, not commands. Review before applying. You can always:
- Ask for alternatives
- Manually adjust in Calendar view
- Ignore the suggestion

---

## Google Calendar

### Which calendar does TimeFlow use?

By default, your primary Google Calendar. You can change this in Settings.

### Will TimeFlow see my private events?

Yes, TimeFlow needs to see all events to avoid scheduling conflicts. Events are only used for conflict detection and never modified.

### Can I use TimeFlow with multiple calendars?

Currently, TimeFlow writes to one calendar at a time (configurable in Settings).

---

## Settings

### How do I change my working hours?

1. Go to Settings
2. Update "Wake Time" and "Sleep Time"
3. Save changes

Smart Schedule will only schedule tasks within these hours.

### How do I change my timezone?

Update timezone in Settings. This affects how times are displayed and when tasks are scheduled.

---

## Mobile App

### Is the mobile app available?

Yes! TimeFlow has an Expo mobile app for iOS and Android.

- View today's agenda
- Create/complete/delete tasks
- Pull to refresh

### Why can't I schedule tasks on mobile?

Mobile currently supports task management only. Use the web app for scheduling and AI Assistant features.

---

## Troubleshooting

### I'm signed out unexpectedly

Sessions expire after 15 minutes of inactivity. Sign in again to continue.

### Tasks aren't appearing in Google Calendar

1. Check you're connected to the internet
2. Verify Google Calendar permissions
3. Try running Smart Schedule again
4. Check Settings for correct calendar selection

### Calendar view shows wrong times

Check your timezone setting in Settings. Make sure it matches your local timezone.

### Delete button doesn't work

Make sure:
- You're online (deletion syncs with Google Calendar)
- The task isn't already deleted
- You have permission to modify the calendar

---

## Privacy & Security

### What data does TimeFlow collect?

- Email address (from Google)
- Tasks you create
- Your schedule preferences
- Google Calendar events (read-only for conflict detection)

### Is my data secure?

Yes:
- Passwords never stored
- Google tokens encrypted at rest
- HTTPS for all connections
- No data sharing with third parties

### Can I export my data?

Currently, data lives in Google Calendar (which you can export). Task data export coming in a future update.

### Can I delete my account?

Contact support to delete your account and all associated data.

---

## Support

### I found a bug!

Report bugs at: https://github.com/your-org/timeflow/issues

### I have a feature request

Submit feature requests at: https://github.com/your-org/timeflow/issues

### How do I get help?

1. Check this FAQ
2. Read the documentation (README files)
3. Open a GitHub Issue
4. Contact support: support@timeflow.example.com

---

**Last Updated**: 2025-12-04
