# Tasks Page UX Upgrade - Implementation Plan

**Created:** 2026-04-15
**Status:** Planning
**Sprint:** TBD
**Estimated Effort:** 18-24 hours

---

## 🎯 Vision

Transform the Tasks page into an AI-powered productivity command center featuring:
- **Analytics header** with Flow mascot providing intelligent insights
- **Embedded AI assistant** for conversational task management
- **Future tech aesthetic** with fluid shapes, 3D depth, and neon accents
- **Seamless workflow** integration for scheduling, planning, and optimization

---

## 📐 Design Specification

### Layout Structure (Option B - Always Visible Analytics)

```
┌────────────────────────────────────────────────────────────────┐
│  TASKS                                    [AI Assistant] [⚙][?] │
├────────────────────────────────────────────────────────────────┤
│  ┏━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┓ │
│  ┃ 🌊 FLOW ANALYTICS PANEL                                  ┃ │
│  ┃─────────────────────────────────────────────────────────┃ │
│  ┃ [Flow Mascot]  💪 "Great progress today, [Name]!"       ┃ │
│  ┃  You've completed 8 of 12 tasks (67%)                   ┃ │
│  ┃                                                          ┃ │
│  ┃  🎯 3 overdue  |  ⏰ 6.5hrs  |  📊 12 active  |  🔥 7   ┃ │
│  ┃  ⚡ Productivity: 85%  |  🏆 Weekly: 45 completed       ┃ │
│  ┃                                                          ┃ │
│  ┃  [💬 Ask Flow AI about your tasks...]                   ┃ │
│  ┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛ │
│                                                                │
│  ┌──────────────────────────────────────────────────────────┐ │
│  │ [ Unscheduled ] [ Scheduled ] [ Completed ]              │ │
│  │ ──────────────                                            │ │
│  │                                                           │ │
│  │  [Task List Component - Existing]                        │ │
│  │  ...                                                      │ │
│  └──────────────────────────────────────────────────────────┘ │
└────────────────────────────────────────────────────────────────┘

┌─── AI ASSISTANT PANEL (slides in from right) ────────────┐
│  🌊 Flow AI Assistant                              [✕]   │
│  ─────────────────────────────────────────────────────── │
│                                                           │
│  💬 How can I help you today?                            │
│                                                           │
│  Quick Actions:                                          │
│  • Schedule my unscheduled tasks                         │
│  • What's due today?                                     │
│  • Optimize my week                                      │
│  • Show productivity trends                              │
│                                                           │
│  ┌──────────────────────────────────────────┐           │
│  │ You: [Type your message...]               │           │
│  │                                     [Send]│           │
│  └──────────────────────────────────────────┘           │
│                                                           │
│  [Chat messages appear here...]                          │
│                                                           │
└───────────────────────────────────────────────────────────┘
```

---

## 🎨 Visual Design Specifications

### Analytics Panel - "Future Tech" Aesthetic

**Container:**
- Gradient background: `linear-gradient(135deg, rgba(11,175,154,0.05) 0%, rgba(59,130,246,0.05) 100%)`
- Glassmorphism: `backdrop-filter: blur(20px)`, `background: rgba(255,255,255,0.9)`
- Border: 2px solid with neon glow
  ```css
  border: 2px solid transparent;
  background-image: linear-gradient(white, white),
                    linear-gradient(135deg, #0BAF9A, #3B82F6);
  background-origin: border-box;
  background-clip: padding-box, border-box;
  box-shadow: 0 0 20px rgba(11,175,154,0.3);
  ```
- Border radius: `--radius-2xl` (24px) for fluid shapes
- 3D depth: Multi-layer shadows
  ```css
  box-shadow:
    0 4px 6px -1px rgba(0, 0, 0, 0.1),
    0 10px 15px -3px rgba(0, 0, 0, 0.05),
    0 0 30px rgba(11, 175, 154, 0.15);
  ```

**Metrics Cards:**
- Fluid rounded containers (`border-radius: 20px`)
- Hover effect: Lift + neon glow intensifies
  ```css
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  hover: {
    transform: translateY(-4px);
    box-shadow: 0 8px 20px rgba(11,175,154,0.4);
  }
  ```
- Icons with gradient fills (teal → blue)

**Flow Mascot Integration:**
- Size: `lg` (64px) positioned left side
- Expression changes based on context:
  - `celebrating` - High completion rate (>80%)
  - `encouraging` - Tasks overdue
  - `thinking` - Low completion rate
  - `happy` - Default/good progress
  - `guiding-up` - When suggesting actions
- Subtle animations (CSS):
  ```css
  @keyframes gentle-bounce {
    0%, 100% { transform: translateY(0); }
    50% { transform: translateY(-8px); }
  }
  animation: gentle-bounce 3s ease-in-out infinite;
  ```
- Glow effect on hover:
  ```css
  filter: drop-shadow(0 0 12px rgba(11,175,154,0.6));
  ```

### AI Assistant Panel

**Slide-in Animation:**
```css
@keyframes slide-in-right {
  from {
    transform: translateX(100%);
    opacity: 0;
  }
  to {
    transform: translateX(0);
    opacity: 1;
  }
}
```

**Panel Styling:**
- Width: `420px`
- Height: `100vh` (fixed, full height)
- Position: `fixed right-0`
- Same glassmorphism + neon border as analytics
- Neon accent line on left edge:
  ```css
  border-left: 3px solid;
  border-image: linear-gradient(to bottom, #0BAF9A, #3B82F6) 1;
  box-shadow: -2px 0 20px rgba(11,175,154,0.3);
  ```

**Quick Action Buttons:**
- Fluid pill shape (`border-radius: 9999px`)
- Gradient on hover:
  ```css
  background: linear-gradient(135deg, #0BAF9A, #14B8A6);
  color: white;
  box-shadow: 0 4px 12px rgba(11,175,154,0.4);
  ```

---

## 📊 Analytics Metrics - Priority Order

### 1. Goal Tracking (Highest Priority)
**Metrics:**
- `overdueCount: number` - Tasks past due date
- `dueTodayCount: number` - Tasks due today
- `dueThisWeekCount: number` - Tasks due in next 7 days
- `upcomingDeadlines: Task[]` - Next 3 upcoming tasks sorted by due date

**Display:**
```
🎯 3 overdue  |  📅 5 due today  |  📆 12 due this week
```

**API Endpoint:** `GET /api/tasks/goal-tracking`
```typescript
interface GoalTrackingResponse {
  overdueCount: number;
  dueTodayCount: number;
  dueThisWeekCount: number;
  upcomingDeadlines: Array<{
    id: string;
    title: string;
    dueDate: string;
    priority: 1 | 2 | 3;
  }>;
}
```

### 2. Completion Metrics
**Metrics:**
- `completedToday: number`
- `completedThisWeek: number`
- `totalActiveTasks: number`
- `completionRate: number` (percentage)

**Display:**
```
📊 12 active  |  ✅ 8 completed today (67%)  |  🏆 45 this week
```

**API Endpoint:** `GET /api/tasks/completion-metrics?range=today|week|month`

### 3. Time Insights
**Metrics:**
- `totalScheduledHours: number` - Sum of scheduled task durations
- `averageTaskDuration: number` - Mean duration across all tasks
- `timeByCategory: Record<string, number>` - Hours per category

**Display:**
```
⏰ 6.5 hours scheduled  |  ⌛ Avg: 45min/task
```

**API Endpoint:** `GET /api/tasks/time-insights`

### 4. Productivity Trends
**Metrics:**
- `bestTimeOfDay: string` - Hour when most tasks completed
- `mostProductiveDays: string[]` - Days with highest completion
- `weeklyTrend: 'up' | 'down' | 'stable'`
- `completionByDayOfWeek: Record<string, number>`

**Display:**
```
⚡ Peak productivity: 9-11am  |  📈 Trending up this week
```

**API Endpoint:** `GET /api/tasks/productivity-trends?days=7|30`

### 5. Category Breakdown
**Metrics:**
- `categoryDistribution: Array<{ categoryName: string; taskCount: number; hoursSpent: number }>`
- `topCategories: string[]` (top 3 by task count)

**Display (chart or list):**
```
Work: 45%  |  Personal: 30%  |  Learning: 25%
```

**API Endpoint:** `GET /api/tasks/category-breakdown`

### 6. Streak Tracking
**Metrics:**
- `currentStreak: number` - Consecutive days with completed tasks
- `longestStreak: number`
- `lastCompletionDate: string`

**Display:**
```
🔥 7 day streak  |  🏅 Best: 21 days
```

**API Endpoint:** `GET /api/tasks/streak`
```typescript
interface StreakResponse {
  currentStreak: number;
  longestStreak: number;
  lastCompletionDate: string;
  streakActive: boolean; // false if no completion today yet
}
```

---

## 🏗️ Component Architecture

### New Components

#### 1. `FlowAnalyticsPanel.tsx`
**Purpose:** Main analytics container with all metrics
**Location:** `apps/web/src/components/analytics/FlowAnalyticsPanel.tsx`

```typescript
interface FlowAnalyticsPanelProps {
  userId: string;
  onAskAI: () => void; // Opens AI assistant panel
}

export function FlowAnalyticsPanel({ userId, onAskAI }: FlowAnalyticsPanelProps) {
  const { data: goalTracking } = useGoalTracking();
  const { data: completion } = useCompletionMetrics();
  const { data: timeInsights } = useTimeInsights();
  const { data: productivity } = useProductivityTrends();
  const { data: categories } = useCategoryBreakdown();
  const { data: streak } = useStreak();

  const mascotExpression = useMemo(() => {
    if (completion?.completionRate > 80) return 'celebrating';
    if (goalTracking?.overdueCount > 0) return 'encouraging';
    if (completion?.completionRate < 40) return 'thinking';
    return 'happy';
  }, [completion, goalTracking]);

  return (
    <div className="analytics-panel">
      <div className="flex items-start gap-4">
        <FlowMascot
          size="lg"
          expression={mascotExpression}
          className="animate-gentle-bounce"
        />
        <div className="flex-1">
          <AnalyticsMessage
            completionRate={completion?.completionRate}
            overdueCount={goalTracking?.overdueCount}
          />
          <MetricsGrid>
            <MetricCard icon="🎯" label="Overdue" value={goalTracking?.overdueCount} />
            <MetricCard icon="⏰" label="Scheduled" value={timeInsights?.totalScheduledHours + 'hrs'} />
            <MetricCard icon="📊" label="Active" value={completion?.totalActiveTasks} />
            <MetricCard icon="🔥" label="Streak" value={streak?.currentStreak + ' days'} />
          </MetricsGrid>
          <ProductivityIndicator
            weeklyTrend={productivity?.weeklyTrend}
            completedThisWeek={completion?.completedThisWeek}
          />
          <button onClick={onAskAI} className="ask-ai-button">
            💬 Ask Flow AI about your tasks...
          </button>
        </div>
      </div>
    </div>
  );
}
```

#### 2. `FlowAIAssistantPanel.tsx`
**Purpose:** Embedded chat interface for AI assistance
**Location:** `apps/web/src/components/ai/FlowAIAssistantPanel.tsx`

```typescript
interface FlowAIAssistantPanelProps {
  isOpen: boolean;
  onClose: () => void;
  tasks: Task[]; // Current tasks for context
}

export function FlowAIAssistantPanel({ isOpen, onClose, tasks }: FlowAIAssistantPanelProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [isThinking, setIsThinking] = useState(false);

  const quickActions = [
    {
      label: 'Schedule my unscheduled tasks',
      prompt: 'Please help me schedule all my unscheduled tasks optimally.',
      icon: '📅'
    },
    {
      label: "What's due today?",
      prompt: 'What tasks are due today and what should I prioritize?',
      icon: '🎯'
    },
    {
      label: 'Optimize my week',
      prompt: 'Can you help me reorganize my week for better productivity?',
      icon: '⚡'
    },
    {
      label: 'Show productivity trends',
      prompt: 'Show me my productivity trends and insights.',
      icon: '📊'
    }
  ];

  const handleSend = async (message: string) => {
    // Send to AI assistant API with task context
    setIsThinking(true);
    const response = await api.chatWithAssistant({
      message,
      context: { tasks, userId }
    });
    setMessages(prev => [...prev, { role: 'user', content: message }, response]);
    setIsThinking(false);
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ x: '100%', opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          exit={{ x: '100%', opacity: 0 }}
          transition={{ type: 'spring', damping: 25 }}
          className="ai-assistant-panel"
        >
          <div className="panel-header">
            <FlowMascot size="sm" expression="happy" />
            <h2>Flow AI Assistant</h2>
            <button onClick={onClose}>✕</button>
          </div>

          <div className="quick-actions">
            {quickActions.map(action => (
              <button
                key={action.label}
                onClick={() => handleSend(action.prompt)}
                className="quick-action-btn"
              >
                <span>{action.icon}</span>
                {action.label}
              </button>
            ))}
          </div>

          <div className="chat-messages">
            {messages.map((msg, i) => (
              <ChatMessage key={i} message={msg} />
            ))}
            {isThinking && (
              <div className="thinking-indicator">
                <FlowMascot size="sm" expression="thinking" className="animate-pulse" />
                <span>Flow is thinking...</span>
              </div>
            )}
          </div>

          <div className="chat-input">
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleSend(input)}
              placeholder="Ask Flow anything..."
            />
            <button onClick={() => handleSend(input)}>Send</button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
```

#### 3. `AnimatedFlowMascot.tsx`
**Purpose:** Enhanced mascot with micro-animations
**Location:** `apps/web/src/components/AnimatedFlowMascot.tsx`

```typescript
interface AnimatedFlowMascotProps extends FlowMascotProps {
  animate?: boolean;
  animation?: 'bounce' | 'pulse' | 'float' | 'glow';
}

export function AnimatedFlowMascot({
  animate = true,
  animation = 'bounce',
  ...props
}: AnimatedFlowMascotProps) {
  const animationClasses = {
    bounce: 'animate-gentle-bounce',
    pulse: 'animate-pulse',
    float: 'animate-float',
    glow: 'animate-glow'
  };

  return (
    <div className={animate ? animationClasses[animation] : ''}>
      <FlowMascot {...props} />
    </div>
  );
}
```

### Custom Hooks

#### `useGoalTracking()`
```typescript
export function useGoalTracking() {
  return useQuery({
    queryKey: ['goal-tracking'],
    queryFn: () => api.getGoalTracking(),
    refetchInterval: 60000 // Refresh every minute
  });
}
```

#### `useCompletionMetrics(range: 'today' | 'week' | 'month')`
```typescript
export function useCompletionMetrics(range: 'today' | 'week' | 'month' = 'today') {
  return useQuery({
    queryKey: ['completion-metrics', range],
    queryFn: () => api.getCompletionMetrics(range),
    refetchInterval: 30000
  });
}
```

#### `useStreak()`
```typescript
export function useStreak() {
  return useQuery({
    queryKey: ['streak'],
    queryFn: () => api.getStreak(),
    refetchInterval: 300000 // 5 minutes
  });
}
```

---

## 🎬 Animation Specifications

### CSS Animations (Subtle Micro-animations)

```css
/* Gentle Bounce - Flow Mascot */
@keyframes gentle-bounce {
  0%, 100% {
    transform: translateY(0);
  }
  50% {
    transform: translateY(-8px);
  }
}

.animate-gentle-bounce {
  animation: gentle-bounce 3s ease-in-out infinite;
}

/* Float - For metric cards on hover */
@keyframes float {
  0%, 100% {
    transform: translateY(0) scale(1);
  }
  50% {
    transform: translateY(-4px) scale(1.02);
  }
}

.animate-float:hover {
  animation: float 2s ease-in-out infinite;
}

/* Glow Pulse - Neon effect */
@keyframes glow-pulse {
  0%, 100% {
    box-shadow: 0 0 20px rgba(11,175,154,0.3);
  }
  50% {
    box-shadow: 0 0 30px rgba(11,175,154,0.6);
  }
}

.animate-glow {
  animation: glow-pulse 2s ease-in-out infinite;
}

/* Slide in from right - AI Panel */
@keyframes slide-in-right {
  from {
    transform: translateX(100%);
    opacity: 0;
  }
  to {
    transform: translateX(0);
    opacity: 1;
  }
}

/* Smooth expression change */
.flow-mascot {
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

.flow-mascot:hover {
  transform: scale(1.05);
  filter: drop-shadow(0 0 12px rgba(11,175,154,0.6));
}
```

### Framer Motion Variants

```typescript
const panelVariants = {
  hidden: { x: '100%', opacity: 0 },
  visible: {
    x: 0,
    opacity: 1,
    transition: {
      type: 'spring',
      damping: 25,
      stiffness: 200
    }
  },
  exit: {
    x: '100%',
    opacity: 0,
    transition: {
      duration: 0.3
    }
  }
};

const metricCardVariants = {
  initial: { scale: 0.9, opacity: 0 },
  animate: {
    scale: 1,
    opacity: 1,
    transition: {
      type: 'spring',
      bounce: 0.4
    }
  },
  hover: {
    y: -4,
    scale: 1.02,
    boxShadow: '0 8px 20px rgba(11,175,154,0.4)',
    transition: {
      type: 'spring',
      stiffness: 400
    }
  }
};
```

---

## 🔌 Backend API Requirements

### New Endpoints

#### 1. Goal Tracking
```typescript
// GET /api/tasks/goal-tracking
router.get('/api/tasks/goal-tracking', authenticate, async (req, res) => {
  const userId = req.user.id;
  const now = new Date();

  const tasks = await prisma.task.findMany({
    where: {
      userId,
      status: { in: ['unscheduled', 'scheduled'] }
    }
  });

  const overdue = tasks.filter(t => t.dueDate && new Date(t.dueDate) < now);
  const dueToday = tasks.filter(t => {
    if (!t.dueDate) return false;
    const due = new Date(t.dueDate);
    return due.toDateString() === now.toDateString();
  });

  const dueThisWeek = tasks.filter(t => {
    if (!t.dueDate) return false;
    const due = new Date(t.dueDate);
    const weekFromNow = new Date(now);
    weekFromNow.setDate(weekFromNow.getDate() + 7);
    return due >= now && due <= weekFromNow;
  });

  const upcomingDeadlines = tasks
    .filter(t => t.dueDate && new Date(t.dueDate) >= now)
    .sort((a, b) => new Date(a.dueDate!).getTime() - new Date(b.dueDate!).getTime())
    .slice(0, 3)
    .map(t => ({
      id: t.id,
      title: t.title,
      dueDate: t.dueDate,
      priority: t.priority
    }));

  res.json({
    overdueCount: overdue.length,
    dueTodayCount: dueToday.length,
    dueThisWeekCount: dueThisWeek.length,
    upcomingDeadlines
  });
});
```

#### 2. Completion Metrics
```typescript
// GET /api/tasks/completion-metrics?range=today|week|month
router.get('/api/tasks/completion-metrics', authenticate, async (req, res) => {
  const userId = req.user.id;
  const range = req.query.range || 'today';

  const now = new Date();
  let startDate: Date;

  switch (range) {
    case 'today':
      startDate = new Date(now);
      startDate.setHours(0, 0, 0, 0);
      break;
    case 'week':
      startDate = new Date(now);
      startDate.setDate(startDate.getDate() - 7);
      break;
    case 'month':
      startDate = new Date(now);
      startDate.setMonth(startDate.getMonth() - 1);
      break;
  }

  const completed = await prisma.task.count({
    where: {
      userId,
      status: 'completed',
      updatedAt: { gte: startDate }
    }
  });

  const total = await prisma.task.count({
    where: {
      userId,
      status: { in: ['unscheduled', 'scheduled', 'completed'] },
      createdAt: { gte: startDate }
    }
  });

  const active = await prisma.task.count({
    where: {
      userId,
      status: { in: ['unscheduled', 'scheduled'] }
    }
  });

  const completionRate = total > 0 ? Math.round((completed / total) * 100) : 0;

  res.json({
    completedToday: range === 'today' ? completed : 0,
    completedThisWeek: range === 'week' ? completed : 0,
    totalActiveTasks: active,
    completionRate
  });
});
```

#### 3. Time Insights
```typescript
// GET /api/tasks/time-insights
router.get('/api/tasks/time-insights', authenticate, async (req, res) => {
  const userId = req.user.id;

  const tasks = await prisma.task.findMany({
    where: {
      userId,
      status: 'scheduled',
      scheduledTask: { isNot: null }
    },
    include: {
      category: true
    }
  });

  const totalMinutes = tasks.reduce((sum, t) => sum + t.durationMinutes, 0);
  const totalHours = totalMinutes / 60;
  const avgDuration = tasks.length > 0 ? totalMinutes / tasks.length : 0;

  const timeByCategory = tasks.reduce((acc, task) => {
    const categoryName = task.category?.name || 'Uncategorized';
    acc[categoryName] = (acc[categoryName] || 0) + (task.durationMinutes / 60);
    return acc;
  }, {} as Record<string, number>);

  res.json({
    totalScheduledHours: Math.round(totalHours * 10) / 10,
    averageTaskDuration: Math.round(avgDuration),
    timeByCategory
  });
});
```

#### 4. Productivity Trends
```typescript
// GET /api/tasks/productivity-trends?days=7
router.get('/api/tasks/productivity-trends', authenticate, async (req, res) => {
  const userId = req.user.id;
  const days = parseInt(req.query.days as string) || 7;

  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);

  const completedTasks = await prisma.task.findMany({
    where: {
      userId,
      status: 'completed',
      updatedAt: { gte: startDate }
    },
    include: {
      scheduledTask: true
    }
  });

  // Calculate completion by hour
  const hourCounts = completedTasks.reduce((acc, task) => {
    const hour = new Date(task.updatedAt).getHours();
    acc[hour] = (acc[hour] || 0) + 1;
    return acc;
  }, {} as Record<number, number>);

  const bestHour = Object.entries(hourCounts).sort((a, b) => b[1] - a[1])[0];
  const bestTimeOfDay = bestHour
    ? `${bestHour[0]}-${parseInt(bestHour[0]) + 1}`
    : 'N/A';

  // Calculate completion by day of week
  const dayOfWeekCounts = completedTasks.reduce((acc, task) => {
    const dayName = new Date(task.updatedAt).toLocaleDateString('en-US', { weekday: 'long' });
    acc[dayName] = (acc[dayName] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const mostProductiveDays = Object.entries(dayOfWeekCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([day]) => day);

  // Calculate weekly trend (simple: compare first half vs second half)
  const midpoint = Math.floor(completedTasks.length / 2);
  const firstHalf = completedTasks.slice(0, midpoint).length;
  const secondHalf = completedTasks.slice(midpoint).length;

  let weeklyTrend: 'up' | 'down' | 'stable';
  if (secondHalf > firstHalf * 1.1) weeklyTrend = 'up';
  else if (secondHalf < firstHalf * 0.9) weeklyTrend = 'down';
  else weeklyTrend = 'stable';

  res.json({
    bestTimeOfDay,
    mostProductiveDays,
    weeklyTrend,
    completionByDayOfWeek: dayOfWeekCounts
  });
});
```

#### 5. Streak Tracking
```typescript
// GET /api/tasks/streak
router.get('/api/tasks/streak', authenticate, async (req, res) => {
  const userId = req.user.id;

  const completedTasks = await prisma.task.findMany({
    where: {
      userId,
      status: 'completed'
    },
    orderBy: {
      updatedAt: 'desc'
    }
  });

  if (completedTasks.length === 0) {
    return res.json({
      currentStreak: 0,
      longestStreak: 0,
      lastCompletionDate: null,
      streakActive: false
    });
  }

  // Calculate current streak
  let currentStreak = 0;
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  let checkDate = new Date(today);
  const completionDates = new Set(
    completedTasks.map(t => {
      const d = new Date(t.updatedAt);
      d.setHours(0, 0, 0, 0);
      return d.getTime();
    })
  );

  // Check if streak is still active (completion today or yesterday)
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  const streakActive = completionDates.has(today.getTime()) ||
                       completionDates.has(yesterday.getTime());

  if (streakActive) {
    while (completionDates.has(checkDate.getTime())) {
      currentStreak++;
      checkDate.setDate(checkDate.getDate() - 1);
    }
  }

  // Calculate longest streak (simplified - could be optimized)
  let longestStreak = currentStreak;
  // ... (additional logic to scan all completions for longest streak)

  res.json({
    currentStreak,
    longestStreak,
    lastCompletionDate: completedTasks[0].updatedAt,
    streakActive
  });
});
```

#### 6. Category Breakdown
```typescript
// GET /api/tasks/category-breakdown
router.get('/api/tasks/category-breakdown', authenticate, async (req, res) => {
  const userId = req.user.id;

  const tasks = await prisma.task.findMany({
    where: {
      userId,
      status: { in: ['unscheduled', 'scheduled'] }
    },
    include: {
      category: true
    }
  });

  const categoryStats = tasks.reduce((acc, task) => {
    const categoryName = task.category?.name || 'Uncategorized';
    if (!acc[categoryName]) {
      acc[categoryName] = { taskCount: 0, hoursSpent: 0 };
    }
    acc[categoryName].taskCount++;
    acc[categoryName].hoursSpent += task.durationMinutes / 60;
    return acc;
  }, {} as Record<string, { taskCount: number; hoursSpent: number }>);

  const categoryDistribution = Object.entries(categoryStats).map(([name, stats]) => ({
    categoryName: name,
    ...stats
  }));

  const topCategories = categoryDistribution
    .sort((a, b) => b.taskCount - a.taskCount)
    .slice(0, 3)
    .map(c => c.categoryName);

  res.json({
    categoryDistribution,
    topCategories
  });
});
```

---

## 📝 Implementation Checklist

### Phase 1: Foundation & Analytics (8-10 hours)

- [ ] **Backend Setup**
  - [ ] Create analytics endpoints in `apps/backend/src/controllers/analyticsController.ts`
  - [ ] Add routes in `apps/backend/src/routes/analyticsRoutes.ts`
  - [ ] Write unit tests for analytics calculations
  - [ ] Add analytics response types to `@timeflow/shared`

- [ ] **Frontend Data Layer**
  - [ ] Create `apps/web/src/hooks/useGoalTracking.ts`
  - [ ] Create `apps/web/src/hooks/useCompletionMetrics.ts`
  - [ ] Create `apps/web/src/hooks/useTimeInsights.ts`
  - [ ] Create `apps/web/src/hooks/useProductivityTrends.ts`
  - [ ] Create `apps/web/src/hooks/useCategoryBreakdown.ts`
  - [ ] Create `apps/web/src/hooks/useStreak.ts`
  - [ ] Add API client functions to `apps/web/src/lib/api.ts`

- [ ] **Analytics Panel Component**
  - [ ] Create `apps/web/src/components/analytics/FlowAnalyticsPanel.tsx`
  - [ ] Create `apps/web/src/components/analytics/MetricCard.tsx`
  - [ ] Create `apps/web/src/components/analytics/MetricsGrid.tsx`
  - [ ] Create `apps/web/src/components/analytics/AnalyticsMessage.tsx`
  - [ ] Create `apps/web/src/components/analytics/ProductivityIndicator.tsx`
  - [ ] Add CSS for glassmorphism + neon effects in `globals.css`

- [ ] **Integration**
  - [ ] Update `apps/web/src/app/tasks/page.tsx` to include analytics panel
  - [ ] Add state management for AI panel toggle
  - [ ] Test analytics data fetching and display

### Phase 2: AI Assistant & Animations (10-14 hours)

- [ ] **AI Assistant Panel**
  - [ ] Create `apps/web/src/components/ai/FlowAIAssistantPanel.tsx`
  - [ ] Create `apps/web/src/components/ai/ChatMessage.tsx`
  - [ ] Create `apps/web/src/components/ai/QuickActionButton.tsx`
  - [ ] Add slide-in animation with Framer Motion
  - [ ] Integrate with existing AI assistant backend
  - [ ] Add context passing (tasks, analytics) to AI prompts

- [ ] **Backend AI Integration**
  - [ ] Update `apps/backend/src/services/assistantService.ts` to accept task context
  - [ ] Add quick action handlers (schedule tasks, show due today, etc.)
  - [ ] Enhance prompts to include analytics insights
  - [ ] Add streaming support for real-time responses (optional)

- [ ] **Mascot Animations**
  - [ ] Create `apps/web/src/components/AnimatedFlowMascot.tsx`
  - [ ] Add CSS keyframe animations (`gentle-bounce`, `glow`, `float`)
  - [ ] Implement expression logic based on analytics state
  - [ ] Add hover effects and transitions
  - [ ] Test performance on animations

- [ ] **Polish & UX**
  - [ ] Add loading states for all analytics
  - [ ] Add error boundaries and fallbacks
  - [ ] Implement responsive design (mobile/tablet)
  - [ ] Add keyboard shortcuts (Cmd+K to open AI, Esc to close)
  - [ ] Add transitions between mascot expressions
  - [ ] Optimize re-renders with React.memo

### Phase 3: Testing & Refinement (2-4 hours)

- [ ] **Testing**
  - [ ] Write tests for analytics calculations
  - [ ] Test AI assistant workflows (schedule tasks, etc.)
  - [ ] Test animations across browsers
  - [ ] Test mobile responsiveness
  - [ ] Load testing for analytics endpoints

- [ ] **Documentation**
  - [ ] Update user guide with new features
  - [ ] Document analytics metrics formulas
  - [ ] Add AI assistant usage examples
  - [ ] Update README with new components

- [ ] **Performance**
  - [ ] Add query caching for analytics
  - [ ] Optimize animation performance
  - [ ] Lazy load AI panel
  - [ ] Monitor bundle size

---

## 🎯 Success Criteria

### User Experience
- ✅ Analytics panel loads in <500ms
- ✅ Mascot expression accurately reflects user state
- ✅ AI assistant responds in <2 seconds
- ✅ Animations feel smooth (60fps)
- ✅ Mobile experience is fully functional

### Functionality
- ✅ All 6 analytics metrics display correctly
- ✅ AI assistant can execute common workflows:
  - Schedule unscheduled tasks
  - Show tasks due today
  - Provide productivity insights
  - Reorganize tasks
- ✅ Quick actions work reliably
- ✅ Panel opens/closes smoothly

### Design
- ✅ Future tech aesthetic is cohesive
- ✅ Neon accents are subtle, not overwhelming
- ✅ Glassmorphism creates depth
- ✅ Fluid shapes feel modern
- ✅ Colors match TimeFlow brand (teal, blue, coral)

---

## 🚀 Deployment Plan

### Development
1. Create feature branch: `feature/tasks-page-ux-upgrade`
2. Implement Phase 1 (analytics)
3. Test locally with real user data
4. Implement Phase 2 (AI + animations)
5. Test end-to-end workflows

### Staging
1. Deploy to staging environment
2. Run performance benchmarks
3. User acceptance testing
4. Iterate on feedback

### Production
1. Deploy backend analytics endpoints
2. Deploy frontend updates
3. Monitor analytics performance
4. Gather user feedback
5. Iterate based on usage patterns

---

## 📊 Timeline Estimate

| Phase | Tasks | Hours |
|-------|-------|-------|
| **Phase 1** | Backend APIs + Analytics Panel | 8-10 |
| **Phase 2** | AI Assistant + Animations | 10-14 |
| **Phase 3** | Testing + Polish | 2-4 |
| **Total** | | **20-28 hours** |

**Sprint Duration:** 1-2 weeks (depending on team size and other priorities)

---

## 🔄 Future Enhancements (Post-MVP)

- **Advanced animations:** Lottie files for complex mascot states
- **Customization:** User can choose which metrics to display
- **Historical trends:** Charts showing productivity over time
- **Voice input:** Talk to Flow AI
- **Notifications:** Proactive suggestions ("You have 3 tasks due in 1 hour")
- **Gamification:** Achievements, badges for streaks
- **Social:** Share productivity stats
- **Dark mode:** Adapt neon effects for dark theme

---

**Next Steps:**
1. Review and approve this plan
2. Create GitHub issues for each component
3. Assign to sprint
4. Begin Phase 1 implementation
