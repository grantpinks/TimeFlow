# 🔍 Flow AI Calendar Context - Debug Guide

## Problem
Flow AI is responding but **not seeing your calendar events**. The AI says you have "no events" when you actually have many events scheduled.

## Why This Happens
The AI needs to fetch your Google Calendar events to understand your schedule. If this fails, the AI operates without calendar context (blind to your actual schedule).

---

## ✅ Quick Fix Steps

### Step 1: Check Google Calendar Connection

**In your browser (logged into TimeFlow):**
```
https://timeflow-wosj.onrender.com/api/diagnostics/calendar
```

This will show:
```json
{
  "userId": "...",
  "email": "your@email.com",
  "hasAccessToken": true/false,
  "hasRefreshToken": true/false,
  "tokenExpired": true/false,
  "calendarConnectionStatus": "connected" | "not_connected" | "error",
  "eventsFetched": 0,
  "error": "..."
}
```

### Step 2: Interpret the Results

**Case A: `hasAccessToken: false`**
```json
{
  "hasAccessToken": false,
  "calendarConnectionStatus": "not_connected",
  "error": "No Google access token found"
}
```

**Solution:** You need to **connect Google Calendar** in TimeFlow:
1. Go to Settings → Integrations
2. Click "Connect Google Calendar"
3. Grant calendar permissions
4. Try Flow AI again

---

**Case B: `tokenExpired: true`**
```json
{
  "hasAccessToken": true,
  "tokenExpired": true,
  "calendarConnectionStatus": "error",
  "error": "invalid_grant"
}
```

**Solution:** Your Google token expired. **Reconnect:**
1. Go to Settings → Integrations
2. Click "Disconnect Google Calendar"
3. Click "Connect Google Calendar" again
4. Try Flow AI again

---

**Case C: `calendarConnectionStatus: "error"`**
```json
{
  "calendarConnectionStatus": "error",
  "error": "Cannot decrypt refresh token"
}
```

**Solution:** The encryption key changed between environments:
1. **Backend env var issue:** The `ENCRYPTION_KEY` on Render is different from when you first connected Google
2. **Fix:** Reconnect Google Calendar (steps above)
3. If that doesn't work, contact support to reset your Google connection

---

**Case D: `eventsFetched: 0` but `calendarConnectionStatus: "connected"`**
```json
{
  "calendarConnectionStatus": "connected",
  "eventsFetched": 0,
  "sampleEvents": []
}
```

**Solution:** Calendar is connected but you might:
- Have no events in the next 24 hours (check `sampleEvents`)
- Be using a different calendar (check `defaultCalendarId`)
- Have events only on other calendars

Try creating a test event for tomorrow and checking again.

---

**Case E: `eventsFetched: 5` ✅**
```json
{
  "calendarConnectionStatus": "connected",
  "eventsFetched": 5,
  "sampleEvents": [
    {
      "summary": "Team Meeting",
      "start": "2026-02-04T14:00:00Z",
      "end": "2026-02-04T15:00:00Z"
    }
  ]
}
```

**Status:** ✅ Calendar is working! If Flow AI still doesn't see events, check the backend logs on Render.

---

## 🔍 Step 3: Check Backend Logs

Go to Render Dashboard → Your Service → Logs

**Look for these messages when you ask Flow AI something:**

### ✅ Working (Calendar Context Loaded):
```
[AssistantService] Fetched 12 calendar events for context
[AssistantService][Debug] LLM request: {
  mode: 'scheduling',
  contextChars: 2450
}
```

### ❌ Broken (Calendar Fetch Failed):
```
[AssistantService] CRITICAL: Failed to fetch calendar events: Error: User not authenticated with Google
[AssistantService] User will not see their calendar in AI context
[AssistantService] Has Google token: false
```

---

## 📋 Checklist

- [ ] Run `/api/diagnostics/calendar` endpoint
- [ ] Verify `hasAccessToken: true`
- [ ] Verify `tokenExpired: false`
- [ ] Verify `calendarConnectionStatus: "connected"`
- [ ] Verify `eventsFetched > 0`
- [ ] Check Render logs for calendar errors
- [ ] If still broken: Reconnect Google Calendar
- [ ] Test Flow AI again

---

## 🚨 Common Issues

### Issue 1: "User not authenticated with Google"
**Cause:** No Google Calendar connected
**Fix:** Connect Google Calendar in Settings

### Issue 2: "Cannot decrypt refresh token"
**Cause:** `ENCRYPTION_KEY` changed between local and Render
**Fix:** 
1. Ensure `ENCRYPTION_KEY` env var is set on Render
2. Reconnect Google Calendar (forces new encrypted token)

### Issue 3: "invalid_grant" error
**Cause:** Google token was revoked or expired
**Fix:** Reconnect Google Calendar

### Issue 4: Events show in `/diagnostics/calendar` but AI doesn't see them
**Cause:** Backend logging issue or prompt truncation
**Fix:** Check Render logs for `[AssistantService] Fetched X calendar events`

---

## 🔧 Environment Variables to Check

Go to Render Dashboard → Environment:

**Required for Google Calendar:**
| Variable | Example | Required? |
|----------|---------|-----------|
| `GOOGLE_CLIENT_ID` | `123...apps.googleusercontent.com` | ✅ YES |
| `GOOGLE_CLIENT_SECRET` | `GOCSPX-...` | ✅ YES |
| `GOOGLE_REDIRECT_URI` | `https://timeflow-wosj.onrender.com/api/auth/google/callback` | ✅ YES |
| `ENCRYPTION_KEY` | (auto-generated) | ✅ YES |

**Note:** If `ENCRYPTION_KEY` is missing, add it:
1. Go to Render Dashboard → Environment
2. Click "Add Environment Variable"
3. Key: `ENCRYPTION_KEY`
4. Value: Click "Generate" to auto-create a secure key
5. Save and redeploy

---

## 💡 Quick Test

After fixing, test with this Flow AI prompt:
```
"What do I have scheduled today?"
```

**Expected Response (Working):**
```
You have 3 events today:
• 9:00 AM - Team Standup
• 2:00 PM - Client Call
• 4:00 PM - Code Review

Would you like to schedule any tasks around these?
```

**Bad Response (Still Broken):**
```
You currently have no events scheduled for today.
```

---

## 📞 Still Having Issues?

1. Run `/api/diagnostics/env` to check all environment variables
2. Copy the full error from Render logs
3. Check if Google Calendar is accessible at https://calendar.google.com
4. Verify you're logged into the correct Google account

The diagnostics endpoints will help pinpoint exactly what's failing! 🎯
