# Tests To Be Executed

This document outlines tests that are pending or require further attention to ensure full system functionality and stability.

## Pending Tests

### Test Case: Wake and Sleep Times Respect in Scheduling

**Description**: Verify that the scheduling algorithm correctly respects the user-defined wake and sleep times when creating a schedule. Tasks should not be scheduled outside of these boundaries.

**Steps**:
1. Configure user wake and sleep times (e.g., 8:00 AM to 10:00 PM).
2. Create several tasks with varying durations and deadlines.
3. Run the scheduling algorithm.
4. Review the generated schedule to ensure no tasks are placed before the wake time or after the sleep time.
5. Test edge cases, such as very long tasks that might span across sleep times if not handled correctly.

**Expected Outcome**: All scheduled tasks adhere strictly to the defined wake and sleep time boundaries.

### Test Case: AI Habit Scheduling to Calendar Workflow

**Description**: Verify the end-to-end workflow of the AI Assistant's ability to schedule habits directly into the user's calendar. This includes checking the AI's understanding of habit requests, successful integration with the calendar service, and accurate reflection of the scheduled habit in the calendar.

**Symptoms**: Currently reported as "still not functional."

**Cause**: (To be determined during testing - potential areas: AI interpretation, integration with `habitService`, `scheduleService`, `googleCalendarService`, API communication errors, incorrect data parsing/serialization).

**Steps**:
1. Ensure the AI Assistant feature is enabled and configured.
2. Provide a clear prompt to the AI Assistant requesting to schedule a specific habit (e.g., "Schedule 'meditation' for 30 minutes every morning").
3. Monitor the AI's response and any system logs for errors or indications of scheduling attempts.
4. Check the user's integrated calendar (e.g., Google Calendar) to see if the habit has been added as an event.
5. Verify the details of the calendar event (duration, time, recurrence, title).
6. Test various habit scheduling scenarios (daily, weekly, specific days, different durations).
7. If not functional, identify the specific point of failure in the workflow (AI understanding, backend service call, calendar API interaction).

**Expected Outcome**: The AI Assistant successfully processes habit scheduling requests and accurately creates corresponding events in the user's calendar without manual intervention.

---
Last Updated: 2025-12-05
