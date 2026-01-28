/**
 * Insight Service
 * 
 * Generates proactive AI insights and nudges for users based on their
 * tasks, schedule, and patterns. These insights appear across Today,
 * Calendar, and Inbox pages to help users stay productive.
 */

import prisma from '../lib/prisma';
import { getEvents } from './googleCalendarService';
import { differenceInHours, startOfDay, endOfDay, addDays, parseISO, format } from 'date-fns';

export interface Insight {
  id: string;
  type: 'nudge' | 'suggestion' | 'warning' | 'celebration';
  title: string;
  message: string;
  actionLabel?: string;
  actionUrl?: string;
  priority: 'low' | 'medium' | 'high';
  surfaceKey: 'today' | 'calendar' | 'inbox';
  dismissible: boolean;
  createdAt: string;
}

/**
 * Generate insights for the Today page
 * Focuses on daily planning, unscheduled tasks, and immediate priorities
 */
export async function getTodayInsights(userId: string): Promise<Insight[]> {
  const insights: Insight[] = [];
  const now = new Date();
  const todayStart = startOfDay(now);
  const todayEnd = endOfDay(now);

  // Fetch user data
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) return insights;

  // Get unscheduled high-priority tasks
  const unscheduledTasks = await prisma.task.findMany({
    where: {
      userId,
      status: { not: 'completed' },
      scheduledStart: null,
      priority: { gte: 3 },
    },
    orderBy: [{ dueDate: 'asc' }, { priority: 'desc' }],
    take: 5,
  });

  if (unscheduledTasks.length >= 3) {
    insights.push({
      id: `today-unscheduled-${Date.now()}`,
      type: 'nudge',
      title: `📋 ${unscheduledTasks.length} High-Priority Tasks Unscheduled`,
      message: `You have ${unscheduledTasks.length} important tasks that need time blocks. Would you like Flow to help schedule them?`,
      actionLabel: 'Plan My Day',
      actionUrl: '/assistant',
      priority: 'high',
      surfaceKey: 'today',
      dismissible: true,
      createdAt: now.toISOString(),
    });
  }

  // Check for overdue tasks
  const overdueTasks = await prisma.task.findMany({
    where: {
      userId,
      status: { not: 'completed' },
      dueDate: { lt: todayStart },
    },
    take: 10,
  });

  if (overdueTasks.length > 0) {
    insights.push({
      id: `today-overdue-${Date.now()}`,
      type: 'warning',
      title: `⚠️ ${overdueTasks.length} Overdue Task${overdueTasks.length > 1 ? 's' : ''}`,
      message: `You have ${overdueTasks.length} task${overdueTasks.length > 1 ? 's' : ''} past their due date. Review and reschedule them?`,
      actionLabel: 'Review Tasks',
      actionUrl: '/tasks',
      priority: 'high',
      surfaceKey: 'today',
      dismissible: false,
      createdAt: now.toISOString(),
    });
  }

  // Check for today's completed tasks (celebration)
  const completedToday = await prisma.task.count({
    where: {
      userId,
      status: 'completed',
      completedAt: { gte: todayStart, lte: todayEnd },
    },
  });

  if (completedToday >= 5) {
    insights.push({
      id: `today-celebration-${Date.now()}`,
      type: 'celebration',
      title: `🎉 ${completedToday} Tasks Completed Today!`,
      message: `You're on fire! You've completed ${completedToday} tasks today. Keep up the great work!`,
      priority: 'low',
      surfaceKey: 'today',
      dismissible: true,
      createdAt: now.toISOString(),
    });
  }

  // Check for tasks due soon (within 48 hours)
  const dueSoon = await prisma.task.findMany({
    where: {
      userId,
      status: { not: 'completed' },
      scheduledStart: null,
      dueDate: {
        gte: now,
        lt: addDays(now, 2),
      },
    },
    orderBy: { dueDate: 'asc' },
  });

  if (dueSoon.length > 0) {
    const taskTitles = dueSoon.slice(0, 2).map(t => t.title).join(', ');
    insights.push({
      id: `today-due-soon-${Date.now()}`,
      type: 'suggestion',
      title: `⏰ ${dueSoon.length} Task${dueSoon.length > 1 ? 's' : ''} Due in 48 Hours`,
      message: `${taskTitles}${dueSoon.length > 2 ? ` and ${dueSoon.length - 2} more` : ''} need${dueSoon.length === 1 ? 's' : ''} to be scheduled soon.`,
      actionLabel: 'Schedule Now',
      actionUrl: '/assistant',
      priority: 'medium',
      surfaceKey: 'today',
      dismissible: true,
      createdAt: now.toISOString(),
    });
  }

  return insights;
}

/**
 * Generate insights for the Calendar page
 * Focuses on schedule optimization, gaps, and conflicts
 */
export async function getCalendarInsights(userId: string, viewDate: Date): Promise<Insight[]> {
  const insights: Insight[] = [];
  const dayStart = startOfDay(viewDate);
  const dayEnd = endOfDay(viewDate);

  // Fetch user data
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) return insights;

  // Get events for the day
  const events = await getEvents(userId, dayStart.toISOString(), dayEnd.toISOString());

  // Find large gaps (>= 2 hours) between events
  const sortedEvents = events
    .filter(e => e.start && e.end)
    .map(e => ({
      start: parseISO(e.start!),
      end: parseISO(e.end!),
    }))
    .sort((a, b) => a.start.getTime() - b.start.getTime());

  for (let i = 0; i < sortedEvents.length - 1; i++) {
    const gapStart = sortedEvents[i].end;
    const gapEnd = sortedEvents[i + 1].start;
    const gapHours = differenceInHours(gapEnd, gapStart);

    if (gapHours >= 2) {
      insights.push({
        id: `calendar-gap-${Date.now()}-${i}`,
        type: 'suggestion',
        title: `⏳ ${gapHours}-Hour Gap Detected`,
        message: `You have ${gapHours} hours free between ${format(gapStart, 'h:mm a')} and ${format(gapEnd, 'h:mm a')}. Would you like to schedule tasks in this time?`,
        actionLabel: 'Fill Gap',
        actionUrl: '/assistant',
        priority: 'low',
        surfaceKey: 'calendar',
        dismissible: true,
        createdAt: new Date().toISOString(),
      });
    }
  }

  // Check for back-to-back meetings (potential burnout risk)
  let consecutiveMeetings = 0;
  for (let i = 0; i < sortedEvents.length - 1; i++) {
    const gapMinutes = (sortedEvents[i + 1].start.getTime() - sortedEvents[i].end.getTime()) / 1000 / 60;
    if (gapMinutes < 15) {
      consecutiveMeetings++;
    } else {
      consecutiveMeetings = 0;
    }

    if (consecutiveMeetings >= 3) {
      insights.push({
        id: `calendar-burnout-${Date.now()}`,
        type: 'warning',
        title: `🔥 Back-to-Back Meetings Detected`,
        message: `You have ${consecutiveMeetings + 1} meetings in a row with no breaks. Consider adding buffer time to avoid burnout.`,
        priority: 'medium',
        surfaceKey: 'calendar',
        dismissible: true,
        createdAt: new Date().toISOString(),
      });
      break;
    }
  }

  return insights;
}

/**
 * Generate insights for the Inbox page
 * Focuses on email triage, follow-ups, and action items
 */
export async function getInboxInsights(userId: string): Promise<Insight[]> {
  const insights: Insight[] = [];
  const now = new Date();

  // Get untriaged emails (older than 24 hours)
  const untriagedCount = await prisma.email.count({
    where: {
      userId,
      category: null,
      receivedAt: { lt: addDays(now, -1) },
    },
  });

  if (untriagedCount > 10) {
    insights.push({
      id: `inbox-untriaged-${Date.now()}`,
      type: 'nudge',
      title: `📬 ${untriagedCount} Emails Need Triage`,
      message: `You have ${untriagedCount} emails from yesterday that haven't been categorized yet. Let Flow help you triage them.`,
      actionLabel: 'Start Triage',
      actionUrl: '/inbox?triage=true',
      priority: 'medium',
      surfaceKey: 'inbox',
      dismissible: true,
      createdAt: now.toISOString(),
    });
  }

  // Check for follow-up labels that are overdue
  const overdueFollowUps = await prisma.email.count({
    where: {
      userId,
      labels: { has: 'follow-up' },
      // Ideally we'd have a follow-up date field, but for now we'll use receivedAt
      receivedAt: { lt: addDays(now, -7) },
    },
  });

  if (overdueFollowUps > 0) {
    insights.push({
      id: `inbox-follow-up-${Date.now()}`,
      type: 'warning',
      title: `🔔 ${overdueFollowUps} Follow-Up${overdueFollowUps > 1 ? 's' : ''} Overdue`,
      message: `You have ${overdueFollowUps} email${overdueFollowUps > 1 ? 's' : ''} labeled for follow-up from over a week ago.`,
      actionLabel: 'Review Follow-Ups',
      actionUrl: '/inbox?filter=follow-up',
      priority: 'high',
      surfaceKey: 'inbox',
      dismissible: true,
      createdAt: now.toISOString(),
    });
  }

  // Check for high inbox volume
  const inboxCount = await prisma.email.count({
    where: {
      userId,
      labels: { has: 'INBOX' },
    },
  });

  if (inboxCount > 100) {
    insights.push({
      id: `inbox-volume-${Date.now()}`,
      type: 'suggestion',
      title: `📊 ${inboxCount} Emails in Inbox`,
      message: `Your inbox is getting full. Flow can help you quickly triage and archive emails to reach Inbox Zero.`,
      actionLabel: 'Quick Triage',
      actionUrl: '/inbox?triage=true',
      priority: 'low',
      surfaceKey: 'inbox',
      dismissible: true,
      createdAt: now.toISOString(),
    });
  }

  return insights;
}
