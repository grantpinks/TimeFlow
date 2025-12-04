# TimeFlow Mobile App

React Native mobile app for TimeFlow productivity platform, built with Expo.

## Features

### Current (MVP)
- **Today's Agenda** - View tasks scheduled for today, tomorrow, and this week
- **Task Management** - Create, complete, and delete tasks with pull-to-refresh
- **Google OAuth** - Sign in with your Google account
- **Offline Storage** - Secure token storage with expo-secure-store
- **Filters** - View tasks by status (all, unscheduled, scheduled, completed)

### Coming Soon
- AI Scheduling Assistant chat interface
- Calendar view with Google Calendar sync
- Push notifications for upcoming tasks
- Settings page for preferences

---

## Setup

### Prerequisites

- Node.js 20+
- pnpm (recommended) or npm
- Expo CLI: `npm install -g expo-cli`
- iOS Simulator (macOS) or Android Emulator
- Physical device with Expo Go app (optional)

### Installation

```bash
# From the root of the monorepo
pnpm install

# Or from the mobile directory
cd apps/mobile
pnpm install
```

### Environment Variables

No environment variables needed for mobile - the app connects to the backend via API proxy.

Make sure the backend is running on `http://localhost:3001` before starting the mobile app.

---

## Development

### Start Expo Dev Server

```bash
# From root
pnpm dev:mobile

# Or from mobile directory
cd apps/mobile
pnpm start
```

This will start the Expo dev server and show a QR code. You can:
- Press `i` to open iOS Simulator
- Press `a` to open Android Emulator
- Scan QR code with Expo Go app on your phone

### Platform-Specific Commands

```bash
# iOS only
pnpm ios

# Android only
pnpm android

# Web (limited support)
pnpm web
```

### Development Workflow

1. **Backend First** - Always start the backend server before mobile:
   ```bash
   cd apps/backend
   pnpm dev
   ```

2. **Start Mobile** - Then start the mobile dev server:
   ```bash
   cd apps/mobile
   pnpm start
   ```

3. **Hot Reload** - Changes to `.tsx` files trigger instant reload
4. **Pull to Refresh** - Pull down on task lists to fetch latest data

---

## Project Structure

```
apps/mobile/
├── src/
│   ├── screens/          # Main app screens
│   │   ├── LoginScreen.tsx
│   │   ├── TodayScreen.tsx
│   │   └── TaskListScreen.tsx
│   ├── components/       # Reusable UI components
│   │   ├── CreateTaskModal.tsx
│   │   └── TaskPriorityPicker.tsx
│   ├── hooks/            # Custom React hooks
│   │   └── useTasks.ts
│   ├── lib/              # Utilities and API client
│   │   ├── api.ts        # Backend API calls
│   │   └── storage.ts    # Secure storage
│   └── navigation/       # React Navigation setup
│       └── AppNavigator.tsx
├── App.tsx               # Entry point
├── app.json              # Expo configuration
└── package.json
```

---

## Screens

### 1. Today Screen (`/today`)

Shows tasks scheduled for today, tomorrow, and this week, grouped by date.

**Features**:
- Time-based task display
- Priority color indicators (red=high, yellow=medium, green=low)
- Task duration display
- Overdue badge for tasks past deadline
- Pull-to-refresh
- Empty state message

### 2. Task List Screen (`/tasks`)

Complete task management with filtering and actions.

**Features**:
- Filter tabs: All, Unscheduled, Scheduled, Completed
- Create new task button (floating action button)
- Mark tasks complete with checkbox
- Delete tasks with confirmation
- Task metadata: duration, due date, scheduled time
- Priority badges
- Pull-to-refresh

### 3. Login Screen (`/login`)

Google OAuth authentication flow.

**Features**:
- "Sign in with Google" button
- Handles OAuth redirect
- Stores auth token securely
- Error handling

---

## API Integration

The mobile app connects to the TimeFlow backend at `http://localhost:3001/api`.

### API Client (`src/lib/api.ts`)

All API calls go through the centralized API client with automatic token handling:

```typescript
import * as api from '../lib/api';

// Fetch tasks
const tasks = await api.getTasks();

// Create task
const newTask = await api.createTask({
  title: 'Finish presentation',
  durationMinutes: 60,
  priority: 1,
  dueDate: '2025-12-10T17:00:00Z'
});

// Complete task
await api.completeTask(taskId);

// Delete task
await api.deleteTask(taskId);
```

### Available Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/user/me` | Get current user profile |
| GET | `/api/tasks` | List all tasks |
| POST | `/api/tasks` | Create new task |
| PATCH | `/api/tasks/:id` | Update task |
| DELETE | `/api/tasks/:id` | Delete task |
| POST | `/api/tasks/:id/complete` | Mark complete |
| GET | `/api/calendar/events` | Get calendar events |
| POST | `/api/schedule` | Run smart scheduling |

---

## Authentication

### Google OAuth Flow

1. User taps "Sign in with Google"
2. App opens system browser with Google OAuth URL
3. User authenticates with Google
4. Google redirects to callback URL with auth code
5. App exchanges code for token via backend
6. Token stored securely with `expo-secure-store`
7. Token automatically included in all API requests

### Token Storage

```typescript
import * as SecureStore from 'expo-secure-store';

// Store token
await SecureStore.setItemAsync('timeflow_token', token);

// Retrieve token
const token = await SecureStore.getItemAsync('timeflow_token');

// Clear token (logout)
await SecureStore.deleteItemAsync('timeflow_token');
```

---

## Styling

### Design System

The mobile app uses inline styles with React Native StyleSheet for consistency:

**Colors**:
```typescript
const colors = {
  primary: '#3b82f6',
  success: '#22c55e',
  warning: '#f59e0b',
  error: '#ef4444',
  gray: {
    50: '#f8fafc',
    500: '#64748b',
    800: '#1e293b',
  }
};
```

**Spacing**:
- Base unit: 4px
- Common values: 8px, 12px, 16px, 24px

**Typography**:
- Titles: 18-20px, bold
- Body: 14-16px, regular
- Captions: 12-13px, medium

---

## Testing

### Manual Testing Checklist

**Authentication**:
- [ ] Sign in with Google
- [ ] Token persists on app restart
- [ ] Logout clears token

**Today View**:
- [ ] Shows today's scheduled tasks
- [ ] Shows tomorrow's tasks
- [ ] Shows upcoming tasks (this week)
- [ ] Pull-to-refresh updates data
- [ ] Empty state when no tasks

**Task List**:
- [ ] Create task with title and priority
- [ ] Filter by status (all, unscheduled, scheduled, completed)
- [ ] Mark task as complete
- [ ] Delete task with confirmation
- [ ] Pull-to-refresh updates data

**Error Handling**:
- [ ] Network errors show user-friendly message
- [ ] Invalid task data shows validation error
- [ ] Failed API calls don't crash app

---

## Common Issues

### Issue: "Unable to connect to backend"

**Solution**: Ensure backend is running on port 3001:
```bash
cd apps/backend
pnpm dev
```

If using a physical device, update the API base URL in `src/lib/api.ts` to your computer's local IP address:
```typescript
const API_BASE = 'http://192.168.1.100:3001/api'; // Replace with your IP
```

---

### Issue: "Google sign-in not working"

**Solution**: Check that:
1. Google OAuth credentials are configured in backend `.env`
2. Redirect URI matches Expo's redirect scheme
3. Google Cloud Console has correct OAuth consent screen

---

### Issue: "Tasks not updating after creation"

**Solution**: Call `refresh()` after creating/updating tasks:
```typescript
await api.createTask(data);
await refresh(); // Re-fetch tasks
```

---

## Performance Tips

1. **Use FlatList** - Always use `FlatList` or `SectionList` for long lists, never `.map()`
2. **Optimize Images** - Use compressed images and `react-native-fast-image` for remote images
3. **Avoid Re-renders** - Use `React.memo()` for expensive components
4. **Lazy Load** - Load data on-demand, not all at once

---

## Building for Production

### iOS

```bash
# Build for TestFlight
eas build --platform ios

# Submit to App Store
eas submit --platform ios
```

### Android

```bash
# Build AAB for Play Store
eas build --platform android

# Submit to Play Store
eas submit --platform android
```

**Note**: Requires Expo Application Services (EAS) account. See [Expo docs](https://docs.expo.dev/build/introduction/) for setup.

---

## Contributing

When adding new screens or features:

1. **Create Screen** - Add to `src/screens/`
2. **Add to Navigator** - Register in `AppNavigator.tsx`
3. **Create Hook** - Add data fetching logic to `src/hooks/`
4. **Update API** - Add new endpoints to `src/lib/api.ts`
5. **Document** - Update this README

---

## Resources

- [Expo Documentation](https://docs.expo.dev/)
- [React Native Docs](https://reactnative.dev/docs/getting-started)
- [React Navigation](https://reactnavigation.org/docs/getting-started)
- [TimeFlow Backend API](../backend/README.md)

---

**Last Updated**: 2025-12-04
